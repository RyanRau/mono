"""The editor window: pick a recipe, adjust it, watch the preview, export.

Tk is not thread-safe, so renders run on a worker thread and hand finished PIL
images back through a queue the main loop polls. Only the newest request is
rendered; intermediate slider positions are dropped.
"""

from __future__ import annotations

import queue
import threading
import tkinter as tk
from dataclasses import replace
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from PIL import Image, ImageTk

from . import decode, export, pipeline
from .recipes import EFFECT_OPTIONS, STYLES, Recipe
from .styles import EFFECTS

PREVIEW_EDGE = 1280
DEBOUNCE_MS = 60
POLL_MS = 30
DRO_CHOICES = ["off", "1", "2", "3", "4", "5", "auto"]
COMPARED = [
    "style",
    "saturation",
    "contrast",
    "sharpness",
    "white_balance",
    "amber_blue",
    "green_magenta",
    "exposure",
    "dro",
    "effect",
    "effect_option",
]


def ev_label(thirds: int) -> str:
    if thirds == 0:
        return "0"
    a = abs(thirds)
    return f"{'+' if thirds > 0 else '-'}{a // 3}.{('0', '3', '7')[a % 3]}"


class App:
    def __init__(
        self,
        root: tk.Tk,
        raw_path: str,
        recipes: list[Recipe],
        params: pipeline.Params,
        quality: int,
    ):
        self.root = root
        self.raw_path = raw_path
        self.recipes = recipes
        self.params = params
        self.quality = quality
        self.preview = decode.load(raw_path, max_edge=PREVIEW_EDGE)
        self.full: decode.RawImage | None = None
        self.base = recipes[0]

        self.results: queue.Queue = queue.Queue()
        self.busy = False
        self.pending = False
        self.exporting = False
        self.debounce: str | None = None
        self.release_job: str | None = None
        self.showing_before = False
        self.before_img: Image.Image | None = None
        self.rendered: Image.Image | None = None
        self.loading = False

        root.title(f"recipe-dev — {Path(raw_path).name}")
        root.geometry("1400x900")
        root.minsize(900, 600)
        self._build()
        self._select(0)
        root.after(POLL_MS, self._poll)

    # ---- layout

    def _build(self) -> None:
        panes = ttk.PanedWindow(self.root, orient=tk.HORIZONTAL)
        panes.pack(fill=tk.BOTH, expand=True)

        left = ttk.Frame(panes, padding=4)
        self.tree = ttk.Treeview(left, show="tree", selectmode="browse")
        scroll = ttk.Scrollbar(left, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll.set)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scroll.pack(side=tk.RIGHT, fill=tk.Y)
        for i, r in enumerate(self.recipes):
            gid = f"g:{r.group}"
            if not self.tree.exists(gid):
                self.tree.insert("", tk.END, iid=gid, text=r.group)
            label = r.name + ("  ✦" if r.effect != "off" else "")
            self.tree.insert(gid, tk.END, iid=f"r:{i}", text=label)
        self.tree.bind("<<TreeviewSelect>>", self._on_tree)
        panes.add(left, weight=1)

        right = ttk.Frame(panes, padding=4)
        # Bottom-up, so the preview only gets the space the controls leave.
        self.status = tk.StringVar()
        ttk.Label(right, textvariable=self.status, anchor=tk.W).pack(
            side=tk.BOTTOM, fill=tk.X
        )
        controls = ttk.Frame(right, padding=(0, 6))
        controls.pack(side=tk.BOTTOM, fill=tk.X)
        self._build_controls(controls)
        # A fixed-size holder: the image's own size must not resize the window.
        self.holder = tk.Frame(right, background="#1e1e1e")
        self.holder.pack(fill=tk.BOTH, expand=True)
        self.view = tk.Label(self.holder, background="#1e1e1e")
        self.view.place(relx=0.5, rely=0.5, anchor=tk.CENTER)
        self.holder.bind("<Configure>", lambda e: self._show())
        panes.add(right, weight=4)

        self.root.bind("<KeyPress-b>", self._before_down)
        self.root.bind("<KeyRelease-b>", self._before_up)

    def _build_controls(self, f: ttk.Frame) -> None:
        self.v = {
            "style": tk.StringVar(),
            "saturation": tk.IntVar(),
            "contrast": tk.IntVar(),
            "sharpness": tk.IntVar(),
            "wb_mode": tk.StringVar(),
            "kelvin": tk.IntVar(value=5500),
            "amber_blue": tk.IntVar(),
            "green_magenta": tk.IntVar(),
            "exposure": tk.IntVar(),
            "dro": tk.StringVar(),
            "effect": tk.StringVar(),
            "effect_option": tk.StringVar(),
        }
        self.ev_text = tk.StringVar(value="0")

        def combo(row, col, label, var, values, width=12):
            ttk.Label(f, text=label).grid(row=row, column=col, sticky=tk.E, padx=4)
            c = ttk.Combobox(f, textvariable=var, values=values, width=width)
            c.state(["readonly"])
            c.grid(row=row, column=col + 1, sticky=tk.W, pady=2)
            return c

        def scale(row, col, label, var, lo, hi, res=1):
            ttk.Label(f, text=label).grid(row=row, column=col, sticky=tk.E, padx=4)
            s = tk.Scale(
                f,
                variable=var,
                from_=lo,
                to=hi,
                resolution=res,
                orient=tk.HORIZONTAL,
                length=170,
                showvalue=True,
                takefocus=0,
            )
            s.grid(row=row, column=col + 1, sticky=tk.W)
            return s

        combo(0, 0, "Style", self.v["style"], STYLES)
        scale(0, 2, "Contrast", self.v["contrast"], -3, 3)
        scale(0, 4, "Saturation", self.v["saturation"], -3, 3)
        scale(0, 6, "Sharpness", self.v["sharpness"], -3, 3)

        combo(1, 0, "White bal.", self.v["wb_mode"], ["auto", "kelvin"])
        self.kelvin_scale = scale(1, 2, "Kelvin", self.v["kelvin"], 2500, 9900, 100)
        scale(1, 4, "Amber–Blue", self.v["amber_blue"], -7, 7)
        scale(1, 6, "Green–Mag.", self.v["green_magenta"], -7, 7)

        combo(2, 0, "DRO", self.v["dro"], DRO_CHOICES, width=6)
        scale(2, 2, "Exposure ⅓", self.v["exposure"], -15, 15)
        ttk.Label(f, textvariable=self.ev_text, width=6).grid(row=2, column=4)
        self.effect_box = combo(
            2, 5, "Effect", self.v["effect"], ["off", *EFFECTS], width=14
        )
        self.option_box = ttk.Combobox(
            f, textvariable=self.v["effect_option"], width=10, state="readonly"
        )
        self.option_box.grid(row=2, column=7, sticky=tk.W)

        buttons = ttk.Frame(f)
        buttons.grid(row=3, column=0, columnspan=8, sticky=tk.W, pady=(6, 0))
        before = ttk.Button(buttons, text="Hold for before (B)")
        before.bind("<ButtonPress-1>", self._before_down)
        before.bind("<ButtonRelease-1>", self._before_up)
        before.pack(side=tk.LEFT, padx=(0, 6))
        ttk.Button(buttons, text="Reset to recipe", command=self._reset).pack(
            side=tk.LEFT, padx=(0, 6)
        )
        self.export_btn = ttk.Button(buttons, text="Export JPEG…", command=self._export)
        self.export_btn.pack(side=tk.LEFT)

        for var in self.v.values():
            var.trace_add("write", lambda *_: self._changed())

    # ---- recipe <-> controls

    def _select(self, index: int) -> None:
        iid = f"r:{index}"
        self.tree.item(self.tree.parent(iid), open=True)
        self.tree.selection_set(iid)
        self.tree.focus(iid)
        self.tree.see(iid)
        self.tree.focus_set()

    def _on_tree(self, _event=None) -> None:
        sel = self.tree.selection()
        if not sel:
            return
        iid = sel[0]
        if iid.startswith("g:"):
            self.tree.item(iid, open=True)
            return
        self.base = self.recipes[int(iid[2:])]
        self._load(self.base)

    def _load(self, r: Recipe) -> None:
        self.loading = True
        try:
            v = self.v
            v["style"].set(r.style)
            for k in ("saturation", "contrast", "sharpness", "amber_blue"):
                v[k].set(getattr(r, k))
            v["green_magenta"].set(r.green_magenta)
            v["exposure"].set(r.exposure)
            if r.white_balance == "auto":
                v["wb_mode"].set("auto")
            else:
                v["wb_mode"].set("kelvin")
                v["kelvin"].set(int(r.white_balance))
            v["dro"].set(str(r.dro))
            v["effect"].set(r.effect)
            v["effect_option"].set(r.effect_option or "")
        finally:
            self.loading = False
        self._changed()

    def current(self) -> Recipe:
        v = self.v
        effect = v["effect"].get()
        options = EFFECT_OPTIONS.get(effect)
        option = v["effect_option"].get()
        dro = v["dro"].get()
        return replace(
            self.base,
            style=v["style"].get(),
            saturation=v["saturation"].get(),
            contrast=v["contrast"].get(),
            sharpness=v["sharpness"].get(),
            white_balance="auto" if v["wb_mode"].get() == "auto" else v["kelvin"].get(),
            amber_blue=v["amber_blue"].get(),
            green_magenta=v["green_magenta"].get(),
            exposure=v["exposure"].get(),
            dro=int(dro) if dro.isdigit() else dro,
            effect=effect,
            effect_option=(option if option in options else options[0])
            if options
            else None,
        )

    def _edited(self, r: Recipe) -> bool:
        return any(getattr(r, k) != getattr(self.base, k) for k in COMPARED)

    def _changed(self) -> None:
        if self.loading:
            return
        effect = self.v["effect"].get()
        options = EFFECT_OPTIONS.get(effect) or []
        self.option_box.configure(values=options)
        self.option_box.state(["!disabled"] if options else ["disabled"])
        is_kelvin = self.v["wb_mode"].get() == "kelvin"
        self.kelvin_scale.configure(state=tk.NORMAL if is_kelvin else tk.DISABLED)
        self.ev_text.set(ev_label(self.v["exposure"].get()) + " EV")
        self._update_status()
        if self.debounce:
            self.root.after_cancel(self.debounce)
        self.debounce = self.root.after(DEBOUNCE_MS, self._kick)

    def _update_status(self, extra: str = "") -> None:
        r = self.current()
        parts = [r.name + ("  — edited" if self._edited(r) else "")]
        if r.effect != "off" and r.effect not in EFFECTS:
            parts.append(
                f"Picture Effect {r.effect} is not emulated; showing the style"
            )
        elif r.effect != "off":
            parts.append(
                f"Picture Effect {r.effect}: JPEG-only on camera, approximated here "
                "(Creative Style and its sliders are ignored, as on the camera)"
            )
        if extra:
            parts.append(extra)
        self.status.set("   ·   ".join(parts))

    def _reset(self) -> None:
        self._load(self.base)

    # ---- rendering

    def _kick(self) -> None:
        self.debounce = None
        if self.busy:
            self.pending = True
            return
        self.busy = True
        recipe = self.current()

        def work():
            try:
                img = Image.fromarray(
                    pipeline.render(self.preview, recipe, self.params)
                )
                self.results.put(("preview", img))
            except Exception as e:  # noqa: BLE001 — report, or the UI waits forever
                self.results.put(("error", f"render failed: {e}"))

        threading.Thread(target=work, daemon=True).start()

    def _poll(self) -> None:
        try:
            while True:
                kind, value = self.results.get_nowait()
                if kind == "preview":
                    self.busy = False
                    self.rendered = value
                    self._show()
                    if self.pending:
                        self.pending = False
                        self._kick()
                elif kind == "error":
                    self.busy = False
                    self._update_status(value)
                elif kind == "progress":
                    self._update_status(value)
                elif kind == "exported":
                    self.exporting = False
                    self.export_btn.state(["!disabled"])
                    self._update_status(f"exported {value}")
                elif kind == "export-error":
                    self.exporting = False
                    self.export_btn.state(["!disabled"])
                    self._update_status("")
                    messagebox.showerror("Export failed", value)
        except queue.Empty:
            pass
        self.root.after(POLL_MS, self._poll)

    def _show(self) -> None:
        img = self.rendered
        if self.showing_before:
            if self.before_img is None:
                px = pipeline.render(self.preview, pipeline.NEUTRAL, self.params)
                self.before_img = Image.fromarray(px)
            img = self.before_img
        if img is None:
            return
        w, h = max(1, self.holder.winfo_width()), max(1, self.holder.winfo_height())
        k = min(w / img.width, h / img.height)
        if abs(k - 1) > 0.01:
            img = img.resize(
                (max(1, int(img.width * k)), max(1, int(img.height * k))),
                Image.Resampling.LANCZOS,
            )
        self.photo = ImageTk.PhotoImage(img)
        self.view.configure(image=self.photo)

    def _before_down(self, _event=None) -> None:
        if self.release_job:  # key autorepeat sends release+press pairs
            self.root.after_cancel(self.release_job)
            self.release_job = None
        if not self.showing_before:
            self.showing_before = True
            self._show()

    def _before_up(self, _event=None) -> None:
        def release():
            self.release_job = None
            self.showing_before = False
            self._show()

        self.release_job = self.root.after(80, release)

    # ---- export

    def _export(self) -> None:
        if self.exporting:
            return
        recipe = self.current()
        default = export.default_path(self.raw_path, recipe)
        path = filedialog.asksaveasfilename(
            parent=self.root,
            initialdir=str(default.parent),
            initialfile=default.name,
            defaultextension=".jpg",
            filetypes=[("JPEG", "*.jpg *.jpeg")],
        )
        if not path:
            return
        self.exporting = True
        self.export_btn.state(["disabled"])

        def progress(f: float) -> None:
            self.results.put(("progress", f"exporting… {f:.0%}"))

        def work():
            try:
                if self.full is None:
                    self.results.put(("progress", "decoding full-size RAW…"))
                    self.full = decode.load(self.raw_path)
                out = export.export(
                    self.raw_path,
                    recipe,
                    Path(path),
                    self.params,
                    quality=self.quality,
                    full=self.full,
                    progress=progress,
                )
                self.results.put(("exported", str(out)))
            except Exception as e:  # noqa: BLE001 — shown in a dialog
                self.results.put(("export-error", str(e)))

        threading.Thread(target=work, daemon=True).start()


def run(raw_path: str, recipes: list[Recipe], params: pipeline.Params, quality=92):
    print(f"decoding {raw_path}…")
    root = tk.Tk()
    App(root, raw_path, recipes, params, quality)
    root.mainloop()

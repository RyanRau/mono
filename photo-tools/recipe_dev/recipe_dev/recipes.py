"""Recipe model, the Recipes.java porter, and the custom-recipe YAML reader.

A recipe is a set of Sony camera settings, exactly as Recipe Lab stores them
(https://github.com/voxivoid/recipe-lab-sony-pmca). Values are validated the
same way Recipe Lab validates a card file: out of range is rejected, never
clamped.
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from importlib import resources
from pathlib import Path

# Index = the value Recipe Lab stores; None = an enum it never identified.
STYLE_NAMES = [
    None,
    "standard",
    "vivid",
    "neutral",
    "portrait",
    "landscape",
    "mono",
    "clear",
    "deep",
    "light",
    "sunset",
    "night",
    "red-leaves",
    None,
    "sepia",
]
STYLES = [s for s in STYLE_NAMES if s]

PE_KEYS = [
    "off",
    "toy-camera",
    "pop-color",
    "posterization",
    "retro-photo",
    "soft-high-key",
    "part-color",
    "rough-mono",
    "soft-focus",
    "hdr-art",
    "richtone-mono",
    "miniature",
    "illust",
    "watercolor",
]
EFFECT_OPTIONS = {
    "soft-high-key": ["blue", "pink", "green"],
    "toy-camera": ["normal", "cool", "warm", "green", "magenta"],
    "part-color": ["red", "green", "blue", "yellow"],
    "posterization": ["posterization-color", "posterization-bw"],
}

NAME_RE = re.compile(r"^[A-Za-z0-9 \-.'()&+]{1,24}$")
DRO_VALUES = ["off", 1, 2, 3, 4, 5, "auto"]  # index = Recipe Lab's stored value


class RecipeError(ValueError):
    pass


@dataclass
class Recipe:
    name: str
    group: str = "Custom"
    style: str = "standard"
    saturation: int = 0
    contrast: int = 0
    sharpness: int = 0
    white_balance: str | int = "auto"  # "auto", or Kelvin
    amber_blue: int = 0  # amber positive
    green_magenta: int = 0  # green positive
    exposure: int = 0  # thirds of a stop
    dro: str | int = "auto"  # "off", "auto", or 1..5
    effect: str = "off"
    effect_option: str | None = None
    notes: list[str] = field(default_factory=list)

    @property
    def exposure_ev(self) -> float:
        return self.exposure / 3

    def validate(self) -> Recipe:
        problems = []
        if not self.name:
            problems.append("empty name")
        if self.style not in STYLES:
            problems.append(f"style {self.style!r} is not one of {', '.join(STYLES)}")
        for key in ("saturation", "contrast", "sharpness"):
            if not -3 <= getattr(self, key) <= 3:
                problems.append(f"{key} {getattr(self, key)} is outside -3..+3")
        for key in ("amber_blue", "green_magenta"):
            if not -7 <= getattr(self, key) <= 7:
                problems.append(f"{key} {getattr(self, key)} is outside -7..+7")
        wb = self.white_balance
        if wb != "auto" and not (
            isinstance(wb, int) and 2500 <= wb <= 9900 and wb % 100 == 0
        ):
            problems.append(f"white balance {wb!r} is not auto or 2500K..9900K")
        if not -15 <= self.exposure <= 15:
            problems.append(f"exposure {self.exposure_ev:+.1f} is outside -5..+5")
        if self.dro not in DRO_VALUES:
            problems.append(f"dro {self.dro!r} is not off, auto or 1..5")
        if self.effect not in PE_KEYS:
            problems.append(f"effect {self.effect!r} is unknown")
        options = EFFECT_OPTIONS.get(self.effect)
        if options and self.effect_option not in options:
            problems.append(f"effect-option {self.effect_option!r} not in {options}")
        if problems:
            raise RecipeError(f"{self.name or '?'}: " + "; ".join(problems))
        return self

    def to_dict(self) -> dict:
        d = asdict(self)
        if not d["notes"]:
            del d["notes"]
        return d

    @classmethod
    def from_dict(cls, d: dict) -> Recipe:
        return cls(**d).validate()


# ---- Recipes.java -> recipes.json

_INT_DECL = re.compile(r"static\s+final\s+int\s+([^;\[\]]+);")
_GROUPS = re.compile(r"String\[\]\s+GROUPS\s*=\s*\{([^}]*)\}")
_ROW = re.compile(
    r'new\s+Recipe\(\s*(\w+)\s*,\s*"([^"]*)"\s*,([^)]*)\)\s*,?[ \t]*(?://[ \t]*(.*))?'
)


def _int_constants(src: str) -> dict[str, int]:
    consts: dict[str, int] = {}
    for decl in _INT_DECL.findall(src):
        for part in decl.split(","):
            if "=" in part:
                k, v = (s.strip() for s in part.split("=", 1))
                if re.fullmatch(r"-?\d+", v):
                    consts[k] = int(v)
    return consts


def parse_recipes_java(src: str) -> list[Recipe]:
    """Parse Recipe Lab's built-in table (`Recipes.ALL`) into Recipes."""
    consts = _int_constants(src)
    m = _GROUPS.search(src)
    if not m:
        raise RecipeError("no GROUPS array found")
    groups = re.findall(r'"([^"]*)"', m.group(1))

    def val(tok: str) -> int:
        tok = tok.strip()
        if re.fullmatch(r"-?\d+", tok):
            return int(tok)
        if tok in consts:
            return consts[tok]
        raise RecipeError(f"unknown constant {tok!r}")

    out = []
    for group_tok, name, rest, comment in _ROW.findall(src):
        args = [val(t) for t in rest.split(",") if t.strip()]
        if len(args) not in (8, 11, 12):
            raise RecipeError(f"{name}: unexpected {len(args)} values")
        style, sat, con, sharp, wb_mode, kelvin, ab, gm = args[:8]
        pe, ev, dro, sub = (args[8:] + [0, 0, 6, 0][len(args) - 8 :])[:4]
        effect = PE_KEYS[pe]
        options = EFFECT_OPTIONS.get(effect)
        recipe = Recipe(
            name=name,
            group=groups[val(group_tok)],
            style=STYLE_NAMES[style] or "standard",
            saturation=sat,
            contrast=con,
            sharpness=sharp,
            # 14 = colour temperature; 1 = auto; 0 = leave the camera's (auto here)
            white_balance=kelvin if wb_mode == 14 else "auto",
            amber_blue=ab,
            green_magenta=gm,
            exposure=ev,
            dro=DRO_VALUES[dro],
            effect=effect,
            effect_option=options[sub] if options else None,
            notes=[comment.strip()] if comment and comment.strip() else [],
        )
        out.append(recipe.validate())
    if not out:
        raise RecipeError("no `new Recipe(...)` rows found")
    return out


# ---- custom recipe files (Recipe Lab's RECIPES/*.YML, format 1)


def _parse_ev(text: str) -> int:
    try:
        ev = float(text)
    except ValueError:
        raise RecipeError(f"exposure {text!r} is not a number") from None
    thirds = round(ev * 3)
    if abs(ev * 3 - thirds) > 0.15:  # "+0.7" is 2.1 thirds as written
        raise RecipeError(f"exposure {text!r} is not in thirds of a stop")
    return thirds


def _parse_int(key: str, text: str) -> int:
    if not re.fullmatch(r"[+-]?\d+", text):
        raise RecipeError(f"{key} {text!r} is not a whole number")
    return int(text)


def parse_recipe_yaml(text: str, default_name: str = "Untitled") -> Recipe:
    """Read one custom recipe file. Every value is read as text, like Recipe Lab."""
    values: dict[str, str] = {}
    for n, raw in enumerate(text.lstrip("﻿").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            raise RecipeError(f"line {n} is not `key: value`")
        key, value = (s.strip() for s in line.split(":", 1))
        quoted = re.match(r"""^(["'])(.*?)\1\s*(#.*)?$""", value)
        value = quoted.group(2) if quoted else value.split("#", 1)[0].strip()
        values[key.lower()] = value

    fmt = values.get("format", "1")
    if fmt != "1":
        raise RecipeError(f"format {fmt} is newer than this reader")
    name = values.get("name", default_name)
    if not NAME_RE.match(name):
        raise RecipeError(f"name {name!r} has characters a recipe name can't hold")

    wb_text = values.get("white-balance", "auto").lower()
    if wb_text in ("auto", "keep"):
        wb: str | int = "auto"
    elif re.fullmatch(r"\d{4}k", wb_text):
        wb = int(wb_text[:-1])
    else:
        raise RecipeError(f"white-balance {wb_text!r} is not auto, keep or e.g. 5600K")

    dro_text = values.get("dro", "auto").lower()
    dro: str | int = int(dro_text) if dro_text.isdigit() else dro_text

    effect = values.get("effect", "off").lower()
    options = EFFECT_OPTIONS.get(effect)
    option = values.get("effect-option", options[0] if options else None)

    return Recipe(
        name=name,
        group="Custom",
        style=values.get("style", "standard").lower(),
        saturation=_parse_int("saturation", values.get("saturation", "0")),
        contrast=_parse_int("contrast", values.get("contrast", "0")),
        sharpness=_parse_int("sharpness", values.get("sharpness", "0")),
        white_balance=wb,
        amber_blue=_parse_int("amber-blue", values.get("amber-blue", "0")),
        green_magenta=_parse_int("green-magenta", values.get("green-magenta", "0")),
        exposure=_parse_ev(values.get("exposure", "0")),
        dro=dro,
        effect=effect,
        effect_option=option if options else None,
    ).validate()


def load_recipe_file(path: Path) -> Recipe:
    if path.stat().st_size > 8192:
        raise RecipeError(f"{path.name} is over 8 KB")
    return parse_recipe_yaml(path.read_text(encoding="utf-8"), default_name=path.stem)


# ---- the bundled table


def load_builtin() -> list[Recipe]:
    data = resources.files("recipe_dev").joinpath("data/recipes.json").read_text()
    return [Recipe.from_dict(d) for d in json.loads(data)["recipes"]]


def write_json(recipes: list[Recipe], path: Path, source: str) -> None:
    doc = {
        "source": source,
        "license": "GPL-3.0 (values from voxivoid/recipe-lab-sony-pmca)",
        "recipes": [r.to_dict() for r in recipes],
    }
    path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")


def find(recipes: list[Recipe], query: str) -> Recipe:
    q = query.casefold()
    exact = [r for r in recipes if r.name.casefold() == q]
    if exact:
        return exact[0]
    partial = [r for r in recipes if q in r.name.casefold()]
    if len(partial) == 1:
        return partial[0]
    if not partial:
        raise RecipeError(f"no recipe matches {query!r} (try `recipe-dev list`)")
    names = ", ".join(r.name for r in partial)
    raise RecipeError(f"{query!r} matches several recipes: {names}")

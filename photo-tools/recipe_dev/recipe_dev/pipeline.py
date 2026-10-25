"""The render pipeline: linear camera RGB + a recipe -> an 8-bit sRGB image.

Every stage is a plain function of (image, recipe, params), in the order the
iOS port will chain Core Image filters:

  1. white balance (camera-space multipliers) + camera matrix -> linear sRGB
  2. exposure
  3. DRO (shadow lift from a blurred, low-resolution luminance map)
  4. tone: calibrated LUT if one exists, else base filmic curve
  5. contrast S-curve, black lift
  6. Oklab: style/saturation chroma, hue tweaks, mono, tint, sharpening, grain
  7. vignette, sRGB encode
"""

from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass
from importlib import resources

import numpy as np

from . import decode, lut
from .decode import RawImage
from .recipes import Recipe
from .styles import EFFECTS, Look, look_for

WB_SHIFT_REFERENCE_K = 5500.0
DRO_MAP_EDGE = 256


@dataclass(frozen=True)
class Params:
    baseline_ev: float
    base_contrast: float
    contrast_per_step: float
    saturation_per_step: float
    sharpness_base: float
    sharpness_per_step: float
    ab_mired_per_step: float
    gm_duv_per_step: float
    dro_strength: tuple[float, ...]
    dro_auto_level: int

    @classmethod
    def load(cls) -> Params:
        text = resources.files("recipe_dev").joinpath("data/params.json").read_text()
        d = json.loads(text)
        d["dro_strength"] = tuple(d["dro_strength"])
        return cls(**d)


NEUTRAL = Recipe(name="Before", dro="off")


# ---- 1-2. white balance, camera matrix, exposure


def wb_multipliers(raw: RawImage, recipe: Recipe, p: Params) -> np.ndarray:
    if recipe.white_balance == "auto":
        base = raw.as_shot_mul
    else:
        base = decode.multipliers_for(raw.cam_xyz, float(recipe.white_balance))
    if not (recipe.amber_blue or recipe.green_magenta):
        return base
    # Amber +n renders warmer: as if the light were n steps bluer than set.
    ref = decode.mired(WB_SHIFT_REFERENCE_K)
    kelvin = 1e6 / (ref - recipe.amber_blue * p.ab_mired_per_step)
    # Green +n renders greener: as if the light were n steps more magenta.
    duv = -recipe.green_magenta * p.gm_duv_per_step
    shifted = decode.multipliers_for(raw.cam_xyz, kelvin, duv)
    neutral = decode.multipliers_for(raw.cam_xyz, WB_SHIFT_REFERENCE_K)
    return base * shifted / neutral


def to_linear(
    camera_rgb: np.ndarray, raw: RawImage, recipe: Recipe, look: Look, p: Params
) -> np.ndarray:
    mul = wb_multipliers(raw, recipe, p).astype(np.float32)
    x = camera_rgb * mul
    # A clipped channel times its multiplier would tint highlights; clip all
    # channels where the least-amplified one saturates.
    np.minimum(x, mul.min(), out=x)
    x = x @ raw.rgb_cam.T.astype(np.float32)
    np.maximum(x, 0.0, out=x)
    x *= np.float32(2.0 ** (p.baseline_ev + recipe.exposure_ev + look.ev))
    return x


# ---- 3. DRO


def box_blur(img: np.ndarray, radius: int, passes: int = 3) -> np.ndarray:
    """Separable box blur, repeated to approximate a Gaussian. Edges clamp."""
    out = img.astype(np.float32)
    for _ in range(passes):
        for axis in (0, 1):
            pad = [(0, 0)] * out.ndim
            pad[axis] = (radius + 1, radius)
            c = np.cumsum(np.pad(out, pad, mode="edge"), axis=axis)
            n = out.shape[axis]
            hi = np.take(c, np.arange(2 * radius + 1, 2 * radius + 1 + n), axis=axis)
            lo = np.take(c, np.arange(0, n), axis=axis)
            out = (hi - lo) / (2 * radius + 1)
    return out


def luminance(lin: np.ndarray) -> np.ndarray:
    return lin @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def dro_map(lin_small: np.ndarray) -> np.ndarray:
    """Blurred log2 luminance at low resolution — the 'local average' DRO uses."""
    lum = np.log2(np.maximum(luminance(lin_small), 1e-5))
    radius = max(1, round(max(lum.shape) * 0.03))
    return box_blur(lum, radius)


def sample_map(m: np.ndarray, y0: int, y1: int, height: int, width: int) -> np.ndarray:
    """Bilinear-sample a low-res map onto rows y0..y1 of a height x width image."""
    mh, mw = m.shape

    def coords(n_out: int, n_in: int, start: int, stop: int):
        c = (np.arange(start, stop) + 0.5) * n_in / n_out - 0.5
        c = np.clip(c, 0, n_in - 1)
        i0 = np.minimum(c.astype(np.int32), n_in - 2) if n_in > 1 else c.astype(int)
        return i0, (c - i0).astype(np.float32)

    iy, fy = coords(height, mh, y0, y1)
    ix, fx = coords(width, mw, 0, width)
    if mh > 1:
        rows = m[iy] * (1 - fy[:, None]) + m[iy + 1] * fy[:, None]
    else:
        rows = np.repeat(m, len(iy), axis=0)
    if mw > 1:
        return rows[:, ix] * (1 - fx) + rows[:, ix + 1] * fx
    return np.repeat(rows, width, axis=1)


def dro_strength(recipe: Recipe, p: Params) -> float:
    if recipe.dro == "off":
        return 0.0
    level = p.dro_auto_level if recipe.dro == "auto" else int(recipe.dro)
    return p.dro_strength[level - 1]


def apply_dro(lin: np.ndarray, local_log2: np.ndarray, strength: float) -> np.ndarray:
    if strength <= 0:
        return lin
    below = np.clip(np.log2(lut.MID_GREY) - local_log2, 0.0, 4.0)
    return lin * np.exp2(strength * below)[..., None].astype(np.float32)


# ---- 4-5. tone


CURVE_SIZE = 65536
_CURVE_X = np.linspace(0.0, 1.0, CURVE_SIZE)


def curve(table: np.ndarray, x: np.ndarray) -> np.ndarray:
    """Apply a 1-D curve sampled on 0..1 — a speed-up only; exact forms below."""
    i = (np.clip(x, 0.0, 1.0) * (CURVE_SIZE - 1) + 0.5).astype(np.int32)
    return table[i]


def srgb_encode_exact(lin: np.ndarray) -> np.ndarray:
    lin = np.clip(lin, 0.0, 1.0)
    return np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)


def srgb_decode_exact(enc: np.ndarray) -> np.ndarray:
    enc = np.clip(enc, 0.0, 1.0)
    return np.where(enc <= 0.04045, enc / 12.92, ((enc + 0.055) / 1.055) ** 2.4)


_ENCODE = srgb_encode_exact(_CURVE_X).astype(np.float32)
_DECODE = srgb_decode_exact(_CURVE_X).astype(np.float32)
_ENCODE_U8 = (_ENCODE * 255 + 0.5).astype(np.uint8)


def srgb_encode(lin: np.ndarray) -> np.ndarray:
    return curve(_ENCODE, lin)


def srgb_decode(enc: np.ndarray) -> np.ndarray:
    return curve(_DECODE, enc)


def filmic(lin: np.ndarray) -> np.ndarray:
    """Base tone curve (Narkowicz's ACES fit): scene linear -> display linear."""
    return np.clip(
        (lin * (2.51 * lin + 0.03)) / (lin * (2.43 * lin + 0.59) + 0.14), 0.0, 1.0
    )


CONTRAST_PIVOT = 0.45


def contrast_curve(enc: np.ndarray, steps: float, per_step: float) -> np.ndarray:
    """Power curves meeting at a pivot: slope 2^(steps * per_step) there.

    Monotonic for any strength, so stacked style + base + slider steps stay safe.
    """
    if steps == 0:
        return enc
    return curve(contrast_table(steps, per_step), enc)


def contrast_table(steps: float, per_step: float, x: np.ndarray = _CURVE_X):
    g = 2.0 ** (steps * per_step)
    c = CONTRAST_PIVOT
    lo = c * (x / c) ** g
    hi = 1 - (1 - c) * ((1 - x) / (1 - c)) ** g
    return np.where(x < c, lo, hi).astype(np.float32)


# ---- 6. Oklab


_LMS_FROM_RGB = np.array(
    [
        [0.4122214708, 0.5363325363, 0.0514459929],
        [0.2119034982, 0.6806995451, 0.1073969566],
        [0.0883024619, 0.2817188376, 0.6299787005],
    ],
    dtype=np.float32,
)
_LAB_FROM_LMS = np.array(
    [
        [0.2104542553, 0.7936177850, -0.0040720468],
        [1.9779984951, -2.4285922050, 0.4505937099],
        [0.0259040371, 0.7827717662, -0.8086757660],
    ],
    dtype=np.float32,
)
_LMS_FROM_LAB = np.linalg.inv(_LAB_FROM_LMS).astype(np.float32)
_RGB_FROM_LMS = np.linalg.inv(_LMS_FROM_RGB).astype(np.float32)


def oklab(lin: np.ndarray) -> np.ndarray:
    return np.cbrt(lin @ _LMS_FROM_RGB.T) @ _LAB_FROM_LMS.T


def oklab_to_linear(lab: np.ndarray) -> np.ndarray:
    return ((lab @ _LMS_FROM_LAB.T) ** 3) @ _RGB_FROM_LMS.T


def blur3(x: np.ndarray) -> np.ndarray:
    """[1 2 1] / 4 separable blur, edges clamped."""
    p = np.pad(x, 1, mode="edge")
    v = (p[:-2] + 2 * p[1:-1] + p[2:]) / 4
    return (v[:, :-2] + 2 * v[:, 1:-1] + v[:, 2:]) / 4


def color_and_detail(
    lab: np.ndarray,
    recipe: Recipe,
    look: Look,
    p: Params,
    scale: float,
    seed: int,
) -> np.ndarray:
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    if look.mono:
        a = np.zeros_like(a)
        b = np.zeros_like(b)
    else:
        chroma = look.chroma * (1 + recipe.saturation * p.saturation_per_step)
        if look.hues:
            hue = np.degrees(np.arctan2(b, a))
            gain = np.full_like(L, chroma)
            for center, width, factor in look.hues:
                d = (hue - center + 180) % 360 - 180
                gain *= 1 + (factor - 1) * np.exp(-0.5 * (d / width) ** 2)
        else:
            gain = chroma
        a = a * gain
        b = b * gain
    if look.tint != (0.0, 0.0):
        w = np.clip(L * 1.5, 0.0, 1.0)
        a = a + look.tint[0] * w
        b = b + look.tint[1] * w

    amount = p.sharpness_base + recipe.sharpness * p.sharpness_per_step
    if amount:
        # Detail a full-size image sharpens shrinks with it: scale for preview.
        L = L + amount * min(1.0, scale) * (L - blur3(L))
    if look.grain:
        rng = np.random.default_rng(seed)
        noise = rng.standard_normal(L.shape).astype(np.float32)
        L = L + look.grain * noise * np.sqrt(np.clip(L, 0.0, 1.0)) * (1 - L * 0.5)
    return np.stack([L, a, b], axis=-1)


def vignette(lin: np.ndarray, amount: float, y0: int, height: int) -> np.ndarray:
    if not amount:
        return lin
    h, w = lin.shape[:2]
    ys = (np.arange(y0, y0 + h, dtype=np.float32) + 0.5) / height * 2 - 1
    xs = (np.arange(w, dtype=np.float32) + 0.5) / w * 2 - 1
    r2 = (ys[:, None] ** 2 + xs[None, :] ** 2) / 2
    return lin * (1 - amount * r2**1.5)[..., None]


# ---- the whole thing


def effective(recipe: Recipe) -> tuple[Recipe, Look]:
    """On the camera a Picture Effect replaces Creative Style and its sliders."""
    look = look_for(recipe.style, recipe.effect, recipe.effect_option)
    if recipe.effect in EFFECTS:
        recipe = Recipe(
            **{**recipe.__dict__, "saturation": 0, "contrast": 0, "sharpness": 0}
        )
    return recipe, look


def _render_block(
    block: np.ndarray,
    raw: RawImage,
    recipe: Recipe,
    look: Look,
    p: Params,
    local: np.ndarray | None,
    y0: int,
    height: int,
) -> np.ndarray:
    lin = to_linear(block, raw, recipe, look, p)
    if local is not None:
        lin = apply_dro(lin, local, dro_strength(recipe, p))
    table = lut.for_style(recipe.style) if recipe.effect not in EFFECTS else None
    if table is not None:
        enc = lut.apply(table, lut.log_encode(lin))
    else:
        enc = srgb_encode(filmic(lin))
    steps = p.base_contrast + recipe.contrast + look.contrast
    enc = contrast_curve(enc, steps, p.contrast_per_step)
    if look.lift:
        enc = look.lift + (1 - look.lift) * enc
    lab = oklab(srgb_decode(enc))
    lab = color_and_detail(lab, recipe, look, p, raw.scale, seed=y0)
    lin = vignette(oklab_to_linear(lab), look.vignette, y0, height)
    return curve(_ENCODE_U8, lin)


def _dro_local(raw: RawImage, recipe: Recipe, look: Look, p: Params):
    if dro_strength(recipe, p) <= 0:
        return None
    img = raw.camera_rgb
    step = max(1, max(img.shape[:2]) // DRO_MAP_EDGE)
    return dro_map(to_linear(img[::step, ::step], raw, recipe, look, p))


def render(raw: RawImage, recipe: Recipe, p: Params) -> np.ndarray:
    """Render the whole buffer at once (the preview path)."""
    recipe, look = effective(recipe)
    h, w = raw.camera_rgb.shape[:2]
    m = _dro_local(raw, recipe, look, p)
    local = sample_map(m, 0, h, h, w) if m is not None else None
    return _render_block(raw.camera_rgb, raw, recipe, look, p, local, 0, h)


def render_tiled(
    raw: RawImage,
    recipe: Recipe,
    p: Params,
    rows: int = 512,
    progress: Callable[[float], None] | None = None,
) -> np.ndarray:
    """Render in horizontal strips, to keep a full-size export's memory flat."""
    recipe, look = effective(recipe)
    img = raw.camera_rgb
    h, w = img.shape[:2]
    m = _dro_local(raw, recipe, look, p)
    out = np.empty((h, w, 3), dtype=np.uint8)
    pad = 2  # blur3 reads one row beyond each edge
    for y in range(0, h, rows):
        a, b = max(0, y - pad), min(h, y + rows + pad)
        local = sample_map(m, a, b, h, w) if m is not None else None
        strip = _render_block(img[a:b], raw, recipe, look, p, local, a, h)
        out[y : min(h, y + rows)] = strip[y - a : y - a + min(rows, h - y)]
        if progress:
            progress(min(1.0, (y + rows) / h))
    return out

"""Parametric stand-ins for Sony's Creative Styles and Picture Effects.

These are hand-tuned approximations, not Sony's transforms. Each is a small set
of numbers the pipeline applies after the base tone curve:

  ev        exposure offset, stops
  contrast  added to the recipe's contrast, in slider steps
  chroma    Oklab chroma scale
  hues      (hue degrees, width degrees, chroma scale) Gaussian-weighted tweaks;
            Oklab hues: red ~30, orange ~55, yellow ~110, green ~142,
            cyan ~195, blue ~264, magenta ~330
  tint      (a, b) added in Oklab after chroma (warm = +b)
  mono      drop chroma entirely before the tint
  lift      raise blacks, in display units
  vignette  darken corners, 0..1
  grain     luminance noise amplitude

A calibrated LUT in data/luts/<style>.cube replaces a style's stand-in.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Look:
    ev: float = 0.0
    contrast: float = 0.0
    chroma: float = 1.0
    hues: tuple[tuple[float, float, float], ...] = field(default_factory=tuple)
    tint: tuple[float, float] = (0.0, 0.0)
    mono: bool = False
    lift: float = 0.0
    vignette: float = 0.0
    grain: float = 0.0


STYLES: dict[str, Look] = {
    "standard": Look(),
    "vivid": Look(contrast=1.0, chroma=1.3),
    "neutral": Look(contrast=-1.0, chroma=0.8),
    "portrait": Look(contrast=-0.5, chroma=0.95, hues=((55, 25, 0.85),)),
    "landscape": Look(contrast=0.5, chroma=1.1, hues=((142, 40, 1.2), (250, 40, 1.2))),
    "clear": Look(ev=0.15, contrast=0.5, chroma=1.05),
    "deep": Look(ev=-0.3, contrast=0.7, chroma=1.15),
    "light": Look(ev=0.35, contrast=-1.2, chroma=0.95, lift=0.02),
    "sunset": Look(chroma=1.1, hues=((40, 35, 1.3),), tint=(0.006, 0.012)),
    "night": Look(ev=-0.2, contrast=-0.5, chroma=0.9),
    "red-leaves": Look(hues=((30, 30, 1.35), (60, 25, 1.2))),
    "mono": Look(mono=True),
    "sepia": Look(mono=True, tint=(0.012, 0.035)),
}

# Picture Effects the built-in recipes use. On the camera an effect replaces the
# Creative Style and its sliders, and only works for JPEG; here it is an
# approximation applied to the RAW instead.
EFFECTS: dict[str, Look] = {
    "retro-photo": Look(
        contrast=-1.0, chroma=0.55, tint=(0.008, 0.03), lift=0.06, vignette=0.25
    ),
    "soft-high-key": Look(ev=0.7, contrast=-1.5, chroma=0.8),
    "rough-mono": Look(mono=True, contrast=3.5, grain=0.06),
}
SOFT_HIGH_KEY_TINTS = {
    "blue": (-0.005, -0.015),
    "pink": (0.015, -0.002),
    "green": (-0.012, 0.006),
}


def look_for(style: str, effect: str = "off", effect_option: str | None = None) -> Look:
    if effect in EFFECTS:
        look = EFFECTS[effect]
        if effect == "soft-high-key":
            tint = SOFT_HIGH_KEY_TINTS.get(effect_option or "blue", (0.0, 0.0))
            look = Look(**{**look.__dict__, "tint": tint})
        return look
    return STYLES[style]

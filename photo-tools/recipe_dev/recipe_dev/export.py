"""Full-resolution render -> JPEG on disk, with the RAW's EXIF carried over."""

from __future__ import annotations

import re
from collections.abc import Callable
from pathlib import Path

from PIL import Image

from . import decode, pipeline
from .recipes import Recipe

TAG_IMAGE_DESCRIPTION = 0x010E
TAG_ORIENTATION = 0x0112
TAG_SOFTWARE = 0x0131


def default_path(raw_path: str, recipe: Recipe) -> Path:
    slug = re.sub(r"[^a-z0-9]+", "-", recipe.name.lower()).strip("-")
    p = Path(raw_path)
    return p.with_name(f"{p.stem}_{slug}.jpg")


def export(
    raw_path: str,
    recipe: Recipe,
    out: Path,
    params: pipeline.Params,
    quality: int = 92,
    full: decode.RawImage | None = None,
    progress: Callable[[float], None] | None = None,
) -> Path:
    full = full or decode.load(raw_path)
    pixels = pipeline.render_tiled(full, recipe, params, progress=progress)
    img = Image.fromarray(pixels)
    exif = Image.Exif()
    if full.exif:
        exif.load(full.exif)
    # The decode already applied the RAW's rotation.
    exif[TAG_ORIENTATION] = 1
    exif[TAG_IMAGE_DESCRIPTION] = f"Recipe: {recipe.name}"
    exif[TAG_SOFTWARE] = "recipe-dev"
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "JPEG", quality=quality, exif=exif.tobytes(), subsampling=0)
    return out

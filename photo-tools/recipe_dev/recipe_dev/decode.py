"""ARW -> linear camera RGB, plus the white-balance maths.

The RAW is demosaiced once with no white balance and no colour matrix, so a WB
change re-runs only a 3x3 multiply, never LibRaw. Working space after
`to_working` is linear sRGB/Rec.709 primaries, D65 — the same as Core Image's
default working space, which is what the iOS port will use.
"""

from __future__ import annotations

import io
import math
from dataclasses import dataclass

import numpy as np
import rawpy
from PIL import Image


@dataclass
class RawImage:
    path: str
    camera_rgb: np.ndarray  # HxWx3 float32, linear, 0..1 of white level, no WB
    as_shot_mul: np.ndarray  # camera's own WB multipliers, G = 1
    cam_xyz: np.ndarray  # 3x3 XYZ -> camera (Adobe ColorMatrix)
    rgb_cam: np.ndarray  # 3x3 white-balanced camera -> linear sRGB
    full_size: tuple[int, int]  # (width, height) of the full-resolution render
    exif: bytes | None  # EXIF block from the embedded preview, if any

    @property
    def scale(self) -> float:
        """This buffer's width relative to the full-resolution render."""
        return self.camera_rgb.shape[1] / self.full_size[0]


def load(path: str, max_edge: int | None = None) -> RawImage:
    """Decode a RAW. With max_edge, a fast half-size decode scaled to fit it."""
    with rawpy.imread(path) as raw:
        sizes = raw.sizes
        flipped = sizes.flip in (5, 6)
        full = (sizes.height, sizes.width) if flipped else (sizes.width, sizes.height)
        rgb = raw.postprocess(
            half_size=max_edge is not None,
            use_camera_wb=False,
            use_auto_wb=False,
            user_wb=[1.0, 1.0, 1.0, 1.0],
            output_color=rawpy.ColorSpace.raw,
            gamma=(1, 1),
            no_auto_bright=True,
            output_bps=16,
            user_flip=None,
        )
        as_shot = np.array(raw.camera_whitebalance[:3], dtype=np.float64)
        if not as_shot.all():
            as_shot = np.array(raw.daylight_whitebalance[:3], dtype=np.float64)
        cam_xyz = np.array(raw.rgb_xyz_matrix[:3], dtype=np.float64)
        exif = _embedded_exif(raw)

    img = rgb.astype(np.float32) / 65535.0
    if max_edge is not None and max(img.shape[:2]) > max_edge:
        img = resize(img, max_edge)
    rgb_cam = camera_to_srgb(cam_xyz)
    return RawImage(path, img, as_shot / as_shot[1], cam_xyz, rgb_cam, full, exif)


# linear sRGB (D65) -> XYZ
XYZ_FROM_SRGB = np.array(
    [
        [0.4124564, 0.3575761, 0.1804375],
        [0.2126729, 0.7151522, 0.0721750],
        [0.0193339, 0.1191920, 0.9503041],
    ]
)


def camera_to_srgb(cam_xyz: np.ndarray) -> np.ndarray:
    """dcraw's rgb_cam: white-balanced camera RGB -> linear sRGB.

    Rows of camera-from-sRGB are normalised to 1, so a white-balanced neutral
    (equal camera channels) lands on sRGB neutral.
    """
    cam_rgb = cam_xyz @ XYZ_FROM_SRGB
    cam_rgb /= cam_rgb.sum(axis=1, keepdims=True)
    return np.linalg.inv(cam_rgb)


def resize(img: np.ndarray, max_edge: int) -> np.ndarray:
    h, w = img.shape[:2]
    k = max_edge / max(h, w)
    size = (max(1, round(w * k)), max(1, round(h * k)))
    chans = [
        np.asarray(Image.fromarray(img[..., c]).resize(size, Image.Resampling.BOX))
        for c in range(img.shape[2])
    ]
    return np.stack(chans, axis=-1)


def _embedded_exif(raw: rawpy.RawPy) -> bytes | None:
    try:
        thumb = raw.extract_thumb()
    except (rawpy.LibRawNoThumbnailError, rawpy.LibRawUnsupportedThumbnailError):
        return None
    if thumb.format != rawpy.ThumbFormat.JPEG:
        return None
    exif = Image.open(io.BytesIO(thumb.data)).getexif()
    return exif.tobytes() if len(exif) else None


# ---- white balance


def planckian_xy(kelvin: float) -> tuple[float, float]:
    """CIE 1931 xy of a blackbody (Kim et al. cubic spline, 1667..25000 K)."""
    t = float(np.clip(kelvin, 1667, 25000))
    if t <= 4000:
        x = -0.2661239e9 / t**3 - 0.2343589e6 / t**2 + 0.8776956e3 / t + 0.179910
    else:
        x = -3.0258469e9 / t**3 + 2.1070379e6 / t**2 + 0.2226347e3 / t + 0.240390
    if t <= 2222:
        y = -1.1063814 * x**3 - 1.34811020 * x**2 + 2.18555832 * x - 0.20219683
    elif t <= 4000:
        y = -0.9549476 * x**3 - 1.37418593 * x**2 + 2.09137015 * x - 0.16748867
    else:
        y = 3.0817580 * x**3 - 5.87338670 * x**2 + 3.75112997 * x - 0.37001483
    return x, y


def _xy_to_uv(x: float, y: float) -> tuple[float, float]:
    d = -2 * x + 12 * y + 3
    return 4 * x / d, 6 * y / d


def _uv_to_xy(u: float, v: float) -> tuple[float, float]:
    d = 2 * u - 8 * v + 4
    return 3 * u / d, 2 * v / d


def illuminant_xy(kelvin: float, duv: float = 0.0) -> tuple[float, float]:
    """xy of a light `duv` off the Planckian locus (positive = greener)."""
    u, v = _xy_to_uv(*planckian_xy(kelvin))
    if duv:
        u2, v2 = _xy_to_uv(*planckian_xy(kelvin + 10))
        tu, tv = u2 - u, v2 - v
        n = math.hypot(tu, tv)
        # normal pointing to +v (towards green) in CIE 1960 uv
        nu, nv = -tv / n, tu / n
        if nv < 0:
            nu, nv = -nu, -nv
        u, v = u + duv * nu, v + duv * nv
    return _uv_to_xy(u, v)


def multipliers_for(cam_xyz: np.ndarray, kelvin: float, duv: float = 0.0) -> np.ndarray:
    """Camera-channel multipliers that render a light of this colour as neutral."""
    x, y = illuminant_xy(kelvin, duv)
    xyz = np.array([x / y, 1.0, (1 - x - y) / y])
    cam = cam_xyz @ xyz
    mul = 1.0 / cam
    return mul / mul[1]


def mired(kelvin: float) -> float:
    return 1e6 / kelvin

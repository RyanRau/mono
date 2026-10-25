"""3D LUTs in the .cube format, applied with trilinear interpolation.

Optional: a style with data/luts/<style>.cube uses it in place of the base
tone curve + parametric style. The LUT's input is the log encoding below
(per channel, linear scene value relative to mid-grey); its output is
display-referred sRGB-encoded RGB. Same convention as a `CIColorCube` on iOS.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

LOG_MIN_EV = -6.5  # stops below mid-grey that map to 0
LOG_MAX_EV = 4.0  # stops above mid-grey that map to 1
MID_GREY = 0.18


def log_encode(linear: np.ndarray) -> np.ndarray:
    ev = np.log2(np.maximum(linear, 1e-7) / MID_GREY)
    return np.clip((ev - LOG_MIN_EV) / (LOG_MAX_EV - LOG_MIN_EV), 0.0, 1.0)


def read_cube(path: Path) -> np.ndarray:
    """Return an NxNxNx3 table indexed [r, g, b]."""
    size = None
    rows = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.upper().startswith("LUT_3D_SIZE"):
            size = int(line.split()[1])
        elif line[0].isdigit() or line[0] in "-.":
            rows.append([float(v) for v in line.split()[:3]])
    if size is None or len(rows) != size**3:
        raise ValueError(f"{path}: not a 3D .cube LUT")
    # .cube order: red changes fastest
    return (
        np.array(rows, dtype=np.float32)
        .reshape(size, size, size, 3)
        .transpose(2, 1, 0, 3)
    )


def write_cube(table: np.ndarray, path: Path, title: str = "") -> None:
    n = table.shape[0]
    lines = [f'TITLE "{title}"', f"LUT_3D_SIZE {n}"]
    for b in range(n):
        for g in range(n):
            for r in range(n):
                lines.append("{:.6f} {:.6f} {:.6f}".format(*table[r, g, b]))
    path.write_text("\n".join(lines) + "\n")


def identity(n: int = 17) -> np.ndarray:
    axis = np.linspace(0.0, 1.0, n, dtype=np.float32)
    r, g, b = np.meshgrid(axis, axis, axis, indexing="ij")
    return np.stack([r, g, b], axis=-1)


def apply(table: np.ndarray, img: np.ndarray) -> np.ndarray:
    """Trilinear lookup of img (..., 3) in 0..1."""
    n = table.shape[0]
    p = np.clip(img, 0.0, 1.0) * (n - 1)
    i0 = np.minimum(p.astype(np.int32), n - 2)
    f = p - i0
    r0, g0, b0 = i0[..., 0], i0[..., 1], i0[..., 2]
    fr, fg, fb = f[..., 0:1], f[..., 1:2], f[..., 2:3]
    out = np.zeros(img.shape, dtype=np.float32)
    for dr in (0, 1):
        wr = fr if dr else 1 - fr
        for dg in (0, 1):
            wg = fg if dg else 1 - fg
            for db in (0, 1):
                wb = fb if db else 1 - fb
                out += wr * wg * wb * table[r0 + dr, g0 + dg, b0 + db]
    return out


_cache: dict[str, np.ndarray | None] = {}


def for_style(style: str) -> np.ndarray | None:
    if style not in _cache:
        path = Path(__file__).parent / "data" / "luts" / f"{style}.cube"
        _cache[style] = read_cube(path) if path.exists() else None
    return _cache[style]

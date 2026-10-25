import numpy as np
import pytest
from recipe_dev import decode, lut, pipeline
from recipe_dev.recipes import Recipe

P = pipeline.Params.load()


def fake_raw(pixels: np.ndarray) -> decode.RawImage:
    """A RAW whose camera space is linear sRGB, already white-balanced."""
    cam_xyz = np.linalg.inv(decode.XYZ_FROM_SRGB)
    h, w = pixels.shape[:2]
    return decode.RawImage(
        path="fake.ARW",
        camera_rgb=pixels.astype(np.float32),
        as_shot_mul=np.ones(3),
        cam_xyz=cam_xyz,
        rgb_cam=decode.camera_to_srgb(cam_xyz),
        full_size=(w, h),
        exif=None,
    )


def colourful(h=48, w=64) -> np.ndarray:
    rng = np.random.default_rng(1)
    return rng.uniform(0.01, 0.4, size=(h, w, 3))


def chroma(img_u8: np.ndarray) -> float:
    lab = pipeline.oklab(pipeline.srgb_decode(img_u8.astype(np.float32) / 255))
    return float(np.hypot(lab[..., 1], lab[..., 2]).mean())


def test_fake_camera_matrix_is_identity():
    np.testing.assert_allclose(fake_raw(colourful()).rgb_cam, np.eye(3), atol=1e-6)


def test_standard_keeps_grey_neutral():
    raw = fake_raw(np.full((16, 16, 3), 0.1))
    out = pipeline.render(raw, Recipe(name="t"), P).astype(int)
    assert np.ptp(out, axis=-1).max() <= 1


def test_mono_is_neutral():
    for style in ("mono",):
        out = pipeline.render(fake_raw(colourful()), Recipe(name="t", style=style), P)
        assert np.ptp(out.astype(int), axis=-1).max() <= 1


def test_plus_one_ev_doubles_linear():
    raw = fake_raw(colourful())
    look = pipeline.effective(Recipe(name="t"))[1]
    base = pipeline.to_linear(raw.camera_rgb, raw, Recipe(name="t"), look, P)
    up = pipeline.to_linear(raw.camera_rgb, raw, Recipe(name="t", exposure=3), look, P)
    np.testing.assert_allclose(up, base * 2, rtol=1e-5)


def test_saturation_steps_change_chroma():
    raw = fake_raw(colourful())
    low = chroma(pipeline.render(raw, Recipe(name="t", saturation=-3), P))
    mid = chroma(pipeline.render(raw, Recipe(name="t"), P))
    high = chroma(pipeline.render(raw, Recipe(name="t", saturation=3), P))
    assert low < mid < high


def test_contrast_curve_monotonic_and_pinned():
    x = np.linspace(0, 1, 1001)
    for steps in (-8, -3, 3, 8):
        y = pipeline.contrast_curve(x, steps, P.contrast_per_step)
        assert np.all(np.diff(y) >= 0)
        assert y[0] == pytest.approx(0) and y[-1] == pytest.approx(1)


def test_amber_shift_warms_and_green_shift_greens():
    raw = fake_raw(colourful())
    m0 = pipeline.wb_multipliers(raw, Recipe(name="t"), P)
    amber = pipeline.wb_multipliers(raw, Recipe(name="t", amber_blue=5), P)
    green = pipeline.wb_multipliers(raw, Recipe(name="t", green_magenta=5), P)
    assert amber[0] / amber[2] > m0[0] / m0[2]
    assert green[1] / (green[0] + green[2]) > m0[1] / (m0[0] + m0[2])


def test_kelvin_multipliers_near_d65_are_neutral_in_srgb_camera():
    cam_xyz = np.linalg.inv(decode.XYZ_FROM_SRGB)
    np.testing.assert_allclose(decode.multipliers_for(cam_xyz, 6504), 1, atol=0.06)
    warm = decode.multipliers_for(cam_xyz, 3200)
    assert warm[2] > 1 > warm[0]  # tungsten light: boost blue, cut red


def test_tiled_render_matches_whole_render():
    raw = fake_raw(colourful(70, 40))
    r = Recipe(name="t", style="vivid", dro=4, sharpness=2)
    whole = pipeline.render(raw, r, P)
    tiled = pipeline.render_tiled(raw, r, P, rows=16)
    assert np.abs(whole.astype(int) - tiled.astype(int)).max() <= 1


def test_identity_cube_is_a_noop(tmp_path):
    img = np.random.default_rng(2).uniform(0, 1, size=(10, 10, 3)).astype(np.float32)
    path = tmp_path / "id.cube"
    lut.write_cube(lut.identity(9), path)
    np.testing.assert_allclose(lut.apply(lut.read_cube(path), img), img, atol=1e-5)


def test_every_builtin_recipe_renders():
    from recipe_dev import recipes

    raw = fake_raw(colourful(12, 16))
    for r in recipes.load_builtin():
        out = pipeline.render(raw, r, P)
        assert out.shape == (12, 16, 3) and out.dtype == np.uint8

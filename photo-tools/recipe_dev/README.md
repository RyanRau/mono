# recipe-dev

Apply [Recipe Lab](https://github.com/voxivoid/recipe-lab-sony-pmca) film
recipes to Sony RAW files. Open an `.ARW`, click through the 77 recipes,
adjust them with live preview, and export a JPEG.

Recipe Lab is a PlayMemories camera app, so it only runs on bodies with
`MENU → Application` (A6000 and similar). An A6400 can't run it. In Recipe Lab
a recipe is just a set of camera settings, and Sony's JPEG engine produces the
look. This tool emulates that engine on the RAW. It is also the reference
pipeline for a future iOS app.

## Install

Python 3.10+ with Tk.

```bash
cd photo-tools/recipe_dev
uv tool install -e .          # or: python3 -m venv .venv && .venv/bin/pip install -e .
```

On macOS, uv's Python builds include Tk. With Homebrew Python, run
`brew install python-tk` first. Check with `python3 -c "import tkinter"`.

## Use

```bash
recipe-dev DSC01234.ARW                                   # open the editor
recipe-dev DSC01234.ARW --recipe "Classic Chrome"         # export, no window → DSC01234_classic-chrome.jpg
recipe-dev DSC01234.ARW --recipe velvia -o ~/Desktop/v.jpg
recipe-dev DSC01234.ARW --recipe-file GOLDENHO.YML        # a Recipe Lab custom recipe file
recipe-dev DSC01234.ARW --recipes-dir /Volumes/SD/RECIPES # add custom recipes to the list
recipe-dev list [--group kodak]
recipe-dev port [Recipes.java path or URL]                # regenerate recipe_dev/data/recipes.json
```

`--recipe` takes an exact name or any unique part of one; for example,
`portra 400` works and `portra` does not.

### The editor

- **Recipe list:** recipes are grouped by brand. Up/Down steps through them,
  like the camera's wheel. ✦ marks a recipe that uses a Picture Effect.
- **Controls:** picking a recipe loads its values into the controls, which
  match the camera's settings (Creative Style, contrast/saturation/sharpness
  ±3, white balance auto or Kelvin, amber–blue/green–magenta ±7, exposure in
  thirds, DRO, Picture Effect). Changing one marks the recipe _edited_.
  **Reset to recipe** undoes your edits.
- **Before/after:** hold **B**, or the button, to see the plain render (Standard,
  as-shot WB, DRO off).
- **Export:** renders at full resolution in the background (about 10 s for
  24 MP) and copies the RAW's EXIF. ImageDescription is set to the recipe name.

## How faithful is it?

The tone and colour transforms are **approximations**, not Sony's.

- **Baseline:** the base exposure and contrast were matched to the A6400's
  embedded preview JPEG (Standard style) on one sample frame. Mean lightness
  is within about 2%; the spread (contrast) is about 10% lower than the
  camera's.
- **Creative Styles:** each style other than Standard is a hand-set offset
  (`styles.py`), chosen to look right, not measured.
- **Slider steps:** the step sizes for contrast, saturation, sharpness, DRO and
  WB shift are hand-set guesses in `recipe_dev/data/params.json`. Edit the file
  and reopen to tune them.
- **Picture Effects:** the six JPEG-only recipes use Retro Photo, Soft High-key
  and Rough Mono. They get simple approximations. As on the camera, an effect
  replaces the Creative Style and its sliders.

Calibration will improve this. Shoot RAW+JPEG on the camera with a style set,
fit a 3D LUT from this tool's neutral render to the camera's JPEG, and save it
as `recipe_dev/data/luts/<style>.cube`. A style with a LUT uses it instead of
its stand-in, and nothing else changes. The fitting tool isn't written yet.

## Pipeline

This is what the iOS app has to reproduce. Every stage is a function in
`pipeline.py`; the right-hand column is the Core Image equivalent.

| #   | Stage                                                                                                         | Core Image                                  |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | Demosaic with no WB or matrix (`decode.py`)                                                                   | `CIRAWFilter`                               |
| 2   | WB multipliers in camera space (as-shot, or Kelvin → xy → camera), A-B as mireds, G-M as Duv; dcraw `rgb_cam` | `neutralTemperature` / `neutralTint`        |
| 3   | Exposure: ×2^(baseline + recipe + style)                                                                      | `exposure`                                  |
| 4   | DRO: shadow lift from a blurred, low-res log-luminance map                                                    | custom kernel / `localToneMapAmount`        |
| 5   | Tone: ACES (Narkowicz) curve → sRGB, or the style's LUT on log-encoded input (`lut.py`)                       | `CIToneCurve` / `CIColorCubeWithColorSpace` |
| 6   | Contrast: power curves through a pivot (0.45), slope 2^(steps × k)                                            | `CIToneCurve`                               |
| 7   | Oklab: chroma × style × (1 + sat × k), hue-weighted tweaks, mono, tint                                        | custom kernel                               |
| 8   | Sharpen Oklab L (unsharp mask), grain, vignette, sRGB encode                                                  | `CISharpenLuminance`, `CIVignette`          |

The working space is linear sRGB primaries, the same as Core Image's default.
Exports are processed in strips so memory stays flat. The 1-D curves use
64K-entry lookup tables for speed; the exact formulas are next to them.

## Develop

```bash
uv pip install -e '.[test]'   # or pip
pytest tests
ruff check . && ruff format --check .
```

The tests use synthetic images, because a RAW is about 25 MB. Sample A6400
files are at <https://raw.pixls.us/data/Sony/ILCE-6400/>.

`recipe_dev/data/recipes.json` is generated from Recipe Lab's `Recipes.java`
by `recipe-dev port`. Recipe Lab is GPL-3.0, so redistributing this tool or
an app built on these values means honouring that licence.

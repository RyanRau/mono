"""recipe-dev: apply Recipe Lab film recipes to Sony RAW files.

recipe-dev IMG.ARW                                   open the editor
recipe-dev IMG.ARW --recipe "Classic Chrome" -o x.jpg   export, no window
recipe-dev list [--group kodak]                      recipe names by brand
recipe-dev port <Recipes.java path|URL>              regenerate recipes.json
"""

from __future__ import annotations

import argparse
import sys
import urllib.request
from itertools import groupby
from pathlib import Path

from . import export, pipeline, recipes

RECIPES_URL = (
    "https://raw.githubusercontent.com/voxivoid/recipe-lab-sony-pmca/main/"
    "src/com/voxivoid/recipelab/Recipes.java"
)
DATA_JSON = Path(__file__).parent / "data" / "recipes.json"


def _load_all(recipe_dir: str | None) -> list[recipes.Recipe]:
    out = recipes.load_builtin()
    if recipe_dir:
        names = {r.name.casefold() for r in out}
        for path in sorted(Path(recipe_dir).iterdir()):
            if path.suffix.lower() not in (".yml", ".yaml") or path.name[0] == ".":
                continue
            try:
                r = recipes.load_recipe_file(path)
            except recipes.RecipeError as e:
                print(f"skipped {path.name}: {e}", file=sys.stderr)
                continue
            if r.name.casefold() in names:
                print(
                    f"skipped {path.name}: {r.name!r} already loaded", file=sys.stderr
                )
                continue
            names.add(r.name.casefold())
            out.append(r)
    return out


def cmd_list(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="recipe-dev list")
    ap.add_argument("--group", help="only brands containing this text")
    ap.add_argument("--recipes-dir", help="also load custom *.YML recipes from here")
    args = ap.parse_args(argv)
    for group, rs in groupby(_load_all(args.recipes_dir), key=lambda r: r.group):
        if args.group and args.group.casefold() not in group.casefold():
            continue
        print(group)
        for r in rs:
            extra = f"  [{r.effect}]" if r.effect != "off" else ""
            print(f"  {r.name}{extra}")
    return 0


def cmd_port(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="recipe-dev port")
    ap.add_argument("source", nargs="?", default=RECIPES_URL, help="path or URL")
    ap.add_argument("-o", "--output", type=Path, default=DATA_JSON)
    args = ap.parse_args(argv)
    if args.source.startswith(("http://", "https://")):
        with urllib.request.urlopen(args.source, timeout=30) as resp:
            src = resp.read().decode("utf-8")
    else:
        src = Path(args.source).read_text(encoding="utf-8")
    rs = recipes.parse_recipes_java(src)
    recipes.write_json(rs, args.output, args.source)
    print(f"wrote {len(rs)} recipes to {args.output}")
    return 0


def cmd_main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        prog="recipe-dev",
        description="Apply Recipe Lab recipes to a Sony RAW. "
        "Other commands: `recipe-dev list`, `recipe-dev port`.",
    )
    ap.add_argument("raw", help="a RAW file (.ARW)")
    ap.add_argument("--recipe", help="export with this recipe, without a window")
    ap.add_argument("--recipe-file", type=Path, help="export with a custom .YML")
    ap.add_argument(
        "-o", "--output", type=Path, help="JPEG path (default: next to RAW)"
    )
    ap.add_argument("--quality", type=int, default=92)
    ap.add_argument("--recipes-dir", help="also load custom *.YML recipes from here")
    args = ap.parse_args(argv)

    if not Path(args.raw).is_file():
        ap.error(f"{args.raw}: no such file")
    params = pipeline.Params.load()
    try:
        all_recipes = _load_all(args.recipes_dir)
        if args.recipe_file:
            recipe = recipes.load_recipe_file(args.recipe_file)
        elif args.recipe:
            recipe = recipes.find(all_recipes, args.recipe)
        else:
            recipe = None
    except recipes.RecipeError as e:
        print(f"recipe-dev: {e}", file=sys.stderr)
        return 2

    if recipe is None:
        from . import ui  # tkinter is only needed for the window

        ui.run(args.raw, all_recipes, params, quality=args.quality)
        return 0

    out = args.output or export.default_path(args.raw, recipe)
    export.export(args.raw, recipe, out, params, quality=args.quality)
    print(out)
    return 0


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    commands = {"list": cmd_list, "port": cmd_port}
    if argv and argv[0] in commands:
        return commands[argv[0]](argv[1:])
    return cmd_main(argv)


if __name__ == "__main__":
    sys.exit(main())

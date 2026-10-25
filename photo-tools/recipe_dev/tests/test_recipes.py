from pathlib import Path

import pytest
from recipe_dev import recipes
from recipe_dev.recipes import Recipe, RecipeError, parse_recipe_yaml

FIXTURE = Path(__file__).parent / "fixtures" / "Recipes_snippet.java"


def test_port_reads_rows_and_defaults():
    rs = {r.name: r for r in recipes.parse_recipes_java(FIXTURE.read_text())}
    assert len(rs) == 5

    factory = rs["FACTORY (ST)"]  # the 10-value form: optional columns default
    assert (factory.group, factory.style, factory.white_balance) == (
        "Sony",
        "standard",
        "auto",
    )
    assert (factory.effect, factory.exposure, factory.dro) == ("off", 0, "auto")

    chrome = rs["Classic Chrome"]
    assert (chrome.saturation, chrome.contrast, chrome.sharpness) == (-1, 2, 0)
    assert (chrome.amber_blue, chrome.green_magenta, chrome.exposure) == (3, 1, -1)
    assert chrome.notes == [
        "golden with muted blues; Neutral -3 A2 came out grey-beige"
    ]

    assert rs["Cinestill 800T"].white_balance == 3200
    assert rs["Eterna Bleach Bypass"].dro == "off"

    sh = rs["Sony SH (soft high-key)"]
    assert (sh.effect, sh.effect_option, sh.exposure) == ("soft-high-key", "blue", 3)


def test_bundled_table_is_complete_and_valid():
    rs = recipes.load_builtin()
    assert len(rs) == 77
    assert len({r.name for r in rs}) == 77
    for r in rs:
        r.validate()
    effects = sorted(r.name for r in rs if r.effect != "off")
    assert len(effects) == 6


def test_yaml_example_from_recipe_lab_docs():
    r = parse_recipe_yaml(
        """
name: "Golden Hour"
style: portrait              # standard vivid neutral portrait …
saturation: -1               # -3 .. +3
white-balance: 5600K         # auto, keep, or 2500K .. 9900K
exposure: +0.7               # -5.0 .. +5.0 in thirds
"""
    )
    assert (r.name, r.style, r.saturation, r.white_balance, r.exposure) == (
        "Golden Hour",
        "portrait",
        -1,
        5600,
        2,
    )
    assert (r.contrast, r.dro, r.effect) == (0, "auto", "off")


def test_yaml_full_file_with_bom_crlf_and_effect():
    text = (
        "﻿format: 1\r\nname: 'Soft Pink'\r\nstyle: light\r\n"
        "effect: soft-high-key\r\neffect-option: pink\r\ndro: off\r\n"
        "amber-blue: -2\r\ngreen-magenta: +3\r\nwhite-balance: keep\r\n"
    )
    r = parse_recipe_yaml(text)
    assert (r.effect, r.effect_option, r.dro) == ("soft-high-key", "pink", "off")
    assert (r.amber_blue, r.green_magenta, r.white_balance) == (-2, 3, "auto")


@pytest.mark.parametrize(
    "line",
    [
        "saturation: 4",
        "amber-blue: -8",
        "white-balance: 2400K",
        "white-balance: 5650K",
        "exposure: +5.3",
        "exposure: 0.5",
        "dro: 6",
        "style: velvia",
        "effect-option: purple",
        "format: 2",
        "- a list item",
    ],
)
def test_yaml_rejects_out_of_range_instead_of_clamping(line):
    extra = "effect: soft-high-key\n" if line.startswith("effect-option") else ""
    with pytest.raises(RecipeError):
        parse_recipe_yaml(f'name: "X"\n{extra}{line}\n')


def test_find_matches_exact_then_unique_substring():
    rs = recipes.load_builtin()
    assert recipes.find(rs, "velvia").name == "Velvia"
    assert recipes.find(rs, "portra 400").name == "Kodak Portra 400"
    with pytest.raises(RecipeError, match="several"):
        recipes.find(rs, "portra")
    with pytest.raises(RecipeError, match="no recipe"):
        recipes.find(rs, "nope")


def test_validate_rejects_bad_values():
    with pytest.raises(RecipeError):
        Recipe(name="x", contrast=5).validate()
    with pytest.raises(RecipeError):
        Recipe(name="x", white_balance=1234).validate()

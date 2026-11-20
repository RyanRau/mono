// Categorical series colors for the forecast chart: the dataviz skill's
// reference palette, in its fixed order, with separately stepped dark-mode
// values (validated with its validate_palette.js against both surfaces).
// A bucket takes the slot matching its position, so its color stays put.
const LIGHT = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#6250d6", // violet
  "#e34948", // red
];
const DARK = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#0ca30c",
  "#9085e9",
  "#e66767",
];

export const seriesColors = (scheme: "light" | "dark") => (scheme === "dark" ? DARK : LIGHT);

/** A single total line needs no categorical contrast — slot 1. */
export const TOTAL_COLOR = { light: LIGHT[0], dark: DARK[0] };

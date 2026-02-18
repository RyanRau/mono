export interface Point {
  row: number;
  col: number;
}

export type ComponentType =
  | "header-1x2"
  | "header-1x3"
  | "header-1x4"
  | "header-1x6"
  | "header-1x8"
  | "header-2x2"
  | "header-2x3"
  | "header-2x4"
  | "header-2x5";

export interface ComponentDef {
  rows: number;
  cols: number;
  label: string;
}

export const COMPONENT_DEFS: Record<ComponentType, ComponentDef> = {
  "header-1x2": { rows: 1, cols: 2, label: "1x2 Header" },
  "header-1x3": { rows: 1, cols: 3, label: "1x3 Header" },
  "header-1x4": { rows: 1, cols: 4, label: "1x4 Header" },
  "header-1x6": { rows: 1, cols: 6, label: "1x6 Header" },
  "header-1x8": { rows: 1, cols: 8, label: "1x8 Header" },
  "header-2x2": { rows: 2, cols: 2, label: "2x2 Header" },
  "header-2x3": { rows: 2, cols: 3, label: "2x3 Header" },
  "header-2x4": { rows: 2, cols: 4, label: "2x4 Header" },
  "header-2x5": { rows: 2, cols: 5, label: "2x5 Header" },
};

export interface PlacedComponent {
  id: string;
  type: ComponentType;
  position: Point;
  orientation: "horizontal" | "vertical";
}

export interface Trace {
  id: string;
  points: Point[];
  color: string;
}

export type ToolMode = "select" | "place" | "draw" | "auto-connect" | "erase";

export interface BoardState {
  rows: number;
  cols: number;
  components: PlacedComponent[];
  traces: Trace[];
}

export const TRACE_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#eab308",
  "#f97316",
  "#a855f7",
  "#06b6d4",
  "#22c55e",
  "#ec4899",
  "#64748b",
  "#84cc16",
];

export const GRID_SPACING = 28;
export const HOLE_RADIUS = 3.5;
export const BOARD_PADDING = 30;

export function pointKey(p: Point): string {
  return `${p.row},${p.col}`;
}

export function getComponentHoles(comp: PlacedComponent): Point[] {
  const def = COMPONENT_DEFS[comp.type];
  const compRows = comp.orientation === "horizontal" ? def.rows : def.cols;
  const compCols = comp.orientation === "horizontal" ? def.cols : def.rows;
  const holes: Point[] = [];
  for (let r = 0; r < compRows; r++) {
    for (let c = 0; c < compCols; c++) {
      holes.push({ row: comp.position.row + r, col: comp.position.col + c });
    }
  }
  return holes;
}

export function getComponentBounds(comp: PlacedComponent): {
  rows: number;
  cols: number;
} {
  const def = COMPONENT_DEFS[comp.type];
  return {
    rows: comp.orientation === "horizontal" ? def.rows : def.cols,
    cols: comp.orientation === "horizontal" ? def.cols : def.rows,
  };
}

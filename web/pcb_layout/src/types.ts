export interface Point {
  row: number;
  col: number;
}

export interface PlacedComponent {
  id: string;
  headerRows: number;
  headerCols: number;
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
  const compRows = comp.orientation === "horizontal" ? comp.headerRows : comp.headerCols;
  const compCols = comp.orientation === "horizontal" ? comp.headerCols : comp.headerRows;
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
  return {
    rows: comp.orientation === "horizontal" ? comp.headerRows : comp.headerCols,
    cols: comp.orientation === "horizontal" ? comp.headerCols : comp.headerRows,
  };
}

export function getComponentLabel(comp: PlacedComponent): string {
  return `${comp.headerRows}x${comp.headerCols} Header`;
}

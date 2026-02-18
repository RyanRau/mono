import { Point, pointKey } from "../types";

function heuristic(a: Point, b: Point): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

export function findPath(
  start: Point,
  end: Point,
  rows: number,
  cols: number,
  blocked: Set<string>
): Point[] | null {
  const startKey = pointKey(start);
  const endKey = pointKey(end);
  if (startKey === endKey) return [start];

  const openSet: Record<string, Point> = {};
  openSet[startKey] = start;
  let openCount = 1;

  const closedSet: Record<string, boolean> = {};
  const cameFrom: Record<string, string> = {};
  const gScore: Record<string, number> = {};
  const fScore: Record<string, number> = {};

  gScore[startKey] = 0;
  fScore[startKey] = heuristic(start, end);

  while (openCount > 0) {
    let bestKey = "";
    let bestF = Infinity;
    const openKeys = Object.keys(openSet);
    for (let i = 0; i < openKeys.length; i++) {
      const k = openKeys[i];
      const f = fScore[k] ?? Infinity;
      if (f < bestF) {
        bestF = f;
        bestKey = k;
      }
    }

    if (bestKey === endKey) {
      const path: Point[] = [];
      let k: string | undefined = bestKey;
      while (k) {
        const [r, c] = k.split(",").map(Number);
        path.unshift({ row: r, col: c });
        k = cameFrom[k];
      }
      return path;
    }

    const current = openSet[bestKey];
    delete openSet[bestKey];
    openCount--;
    closedSet[bestKey] = true;

    const neighbors: Point[] = [
      { row: current.row - 1, col: current.col },
      { row: current.row + 1, col: current.col },
      { row: current.row, col: current.col - 1 },
      { row: current.row, col: current.col + 1 },
    ];

    for (const neighbor of neighbors) {
      if (neighbor.row < 0 || neighbor.row >= rows || neighbor.col < 0 || neighbor.col >= cols)
        continue;

      const nk = pointKey(neighbor);
      if (closedSet[nk]) continue;
      if (blocked.has(nk) && nk !== startKey && nk !== endKey) continue;

      const tentativeG = (gScore[bestKey] ?? Infinity) + 1;
      if (tentativeG < (gScore[nk] ?? Infinity)) {
        cameFrom[nk] = bestKey;
        gScore[nk] = tentativeG;
        fScore[nk] = tentativeG + heuristic(neighbor, end);
        if (!(nk in openSet)) {
          openSet[nk] = neighbor;
          openCount++;
        }
      }
    }
  }

  return null;
}

export function autoConnectPoints(
  points: Point[],
  rows: number,
  cols: number,
  existingBlocked: Set<string>
): Point[] | null {
  if (points.length < 2) return null;

  const allPathPoints: Point[] = [];
  const dynamicBlocked = new Set<string>();
  existingBlocked.forEach((v) => dynamicBlocked.add(v));

  for (let i = 0; i < points.length - 1; i++) {
    const path = findPath(points[i], points[i + 1], rows, cols, dynamicBlocked);
    if (!path) return null;

    for (let j = 0; j < path.length; j++) {
      dynamicBlocked.add(pointKey(path[j]));
    }

    if (i === 0) {
      allPathPoints.push(...path);
    } else {
      allPathPoints.push(...path.slice(1));
    }
  }

  return allPathPoints;
}

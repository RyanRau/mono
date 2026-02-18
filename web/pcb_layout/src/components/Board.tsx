import React, { useCallback, useMemo, useRef } from "react";
import {
  Point,
  PlacedComponent,
  Trace,
  ToolMode,
  GRID_SPACING,
  HOLE_RADIUS,
  BOARD_PADDING,
  pointKey,
  getComponentHoles,
  getComponentBounds,
  getComponentLabel,
} from "../types";

interface BoardProps {
  rows: number;
  cols: number;
  components: PlacedComponent[];
  traces: Trace[];
  mode: ToolMode;
  placementRows: number;
  placementCols: number;
  componentOrientation: "horizontal" | "vertical";
  drawingPoints: Point[];
  autoConnectComponentIds: string[];
  hoveredHole: Point | null;
  selectedComponentId: string | null;
  selectedTraceId: string | null;
  onHoleClick: (point: Point) => void;
  onHoleHover: (point: Point | null) => void;
  onHoleRightClick: (point: Point, e: React.MouseEvent) => void;
  onComponentClick: (id: string) => void;
  onTraceClick: (id: string) => void;
}

function holeX(col: number): number {
  return BOARD_PADDING + col * GRID_SPACING;
}

function holeY(row: number): number {
  return BOARD_PADDING + row * GRID_SPACING;
}

const Board: React.FC<BoardProps> = ({
  rows,
  cols,
  components,
  traces,
  mode,
  placementRows,
  placementCols,
  componentOrientation,
  drawingPoints,
  autoConnectComponentIds: acComponentIds,
  hoveredHole,
  selectedComponentId,
  selectedTraceId,
  onHoleClick,
  onHoleHover,
  onHoleRightClick,
  onComponentClick,
  onTraceClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const svgWidth = (cols - 1) * GRID_SPACING + 2 * BOARD_PADDING;
  const svgHeight = (rows - 1) * GRID_SPACING + 2 * BOARD_PADDING;

  const occupiedHoles = useMemo(() => {
    const set = new Set<string>();
    for (const comp of components) {
      for (const hole of getComponentHoles(comp)) {
        set.add(pointKey(hole));
      }
    }
    return set;
  }, [components]);

  const traceHoles = useMemo(() => {
    const set = new Set<string>();
    for (const trace of traces) {
      for (const p of trace.points) {
        set.add(pointKey(p));
      }
    }
    return set;
  }, [traces]);

  const snapToHole = useCallback(
    (e: React.MouseEvent<SVGSVGElement>): Point | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const col = Math.round((x - BOARD_PADDING) / GRID_SPACING);
      const row = Math.round((y - BOARD_PADDING) / GRID_SPACING);

      if (row < 0 || row >= rows || col < 0 || col >= cols) return null;

      const dx = x - holeX(col);
      const dy = y - holeY(row);
      if (Math.sqrt(dx * dx + dy * dy) > GRID_SPACING * 0.45) return null;

      return { row, col };
    },
    [rows, cols]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const hole = snapToHole(e);
      onHoleHover(hole);
    },
    [snapToHole, onHoleHover]
  );

  const handleMouseLeave = useCallback(() => {
    onHoleHover(null);
  }, [onHoleHover]);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const hole = snapToHole(e);
      if (hole) {
        onHoleClick(hole);
      }
    },
    [snapToHole, onHoleClick]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      e.preventDefault();
      const hole = snapToHole(e);
      if (hole) {
        onHoleRightClick(hole, e);
      }
    },
    [snapToHole, onHoleRightClick]
  );

  const placementPreview = useMemo(() => {
    if (mode !== "place" || !hoveredHole) return null;
    const compRows = componentOrientation === "horizontal" ? placementRows : placementCols;
    const compCols = componentOrientation === "horizontal" ? placementCols : placementRows;

    const endRow = hoveredHole.row + compRows - 1;
    const endCol = hoveredHole.col + compCols - 1;
    const inBounds = endRow < rows && endCol < cols;

    const overlaps = !inBounds
      ? true
      : (() => {
          for (let r = 0; r < compRows; r++) {
            for (let c = 0; c < compCols; c++) {
              if (
                occupiedHoles.has(pointKey({ row: hoveredHole.row + r, col: hoveredHole.col + c }))
              ) {
                return true;
              }
            }
          }
          return false;
        })();

    return { compRows, compCols, valid: inBounds && !overlaps };
  }, [mode, hoveredHole, placementRows, placementCols, componentOrientation, rows, cols, occupiedHoles]);

  const renderHoles = () => {
    const holes: React.ReactElement[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = pointKey({ row: r, col: c });
        const isOccupied = occupiedHoles.has(key);
        const isTrace = traceHoles.has(key);
        const isHovered = hoveredHole && hoveredHole.row === r && hoveredHole.col === c;
        const isDrawing = drawingPoints.some((p) => p.row === r && p.col === c);

        let fill = "#1a1a1a";
        let stroke = "#555";
        let radius = HOLE_RADIUS;

        if (isOccupied) {
          fill = "#b8860b";
          stroke = "#daa520";
        } else if (isTrace) {
          fill = "#666";
          stroke = "#888";
        }
        if (isDrawing) {
          fill = "#4ecdc4";
          stroke = "#45b7aa";
          radius = HOLE_RADIUS + 2;
        }
        if (isHovered) {
          stroke = "#fff";
          radius = HOLE_RADIUS + 1.5;
        }

        holes.push(
          <circle
            key={key}
            cx={holeX(c)}
            cy={holeY(r)}
            r={radius}
            fill={fill}
            stroke={stroke}
            strokeWidth={1}
            style={{ cursor: "pointer" }}
          />
        );
      }
    }
    return holes;
  };

  const renderComponents = () => {
    return components.map((comp) => {
      const bounds = getComponentBounds(comp);
      const x = holeX(comp.position.col) - GRID_SPACING * 0.4;
      const y = holeY(comp.position.row) - GRID_SPACING * 0.4;
      const w = (bounds.cols - 1) * GRID_SPACING + GRID_SPACING * 0.8;
      const h = (bounds.rows - 1) * GRID_SPACING + GRID_SPACING * 0.8;
      const isSelected = selectedComponentId === comp.id;
      const isAcSelected = acComponentIds.includes(comp.id);
      const acIndex = acComponentIds.indexOf(comp.id);

      let strokeColor = "#555";
      let strokeW = 1;
      if (isAcSelected) {
        strokeColor = "#ff4444";
        strokeW = 2;
      } else if (isSelected) {
        strokeColor = "#4ecdc4";
        strokeW = 2;
      }

      return (
        <g
          key={comp.id}
          onClick={(e) => {
            e.stopPropagation();
            onComponentClick(comp.id);
          }}
          style={{
            cursor:
              mode === "select" || mode === "erase" || mode === "auto-connect"
                ? "pointer"
                : "default",
          }}
        >
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={3}
            ry={3}
            fill={isAcSelected ? "#2a1a1a" : "#2a2a2a"}
            stroke={strokeColor}
            strokeWidth={strokeW}
          />
          {isAcSelected && (
            <text
              x={x + w / 2}
              y={y + h + 14}
              textAnchor="middle"
              fontSize={10}
              fontWeight="bold"
              fill="#ff6b6b"
              fontFamily="monospace"
            >
              #{acIndex + 1}
            </text>
          )}
          {getComponentHoles(comp).map((hole) => (
            <circle
              key={pointKey(hole)}
              cx={holeX(hole.col)}
              cy={holeY(hole.row)}
              r={HOLE_RADIUS + 1}
              fill="#b8860b"
              stroke="#daa520"
              strokeWidth={0.8}
            />
          ))}
          <text
            x={x + w / 2}
            y={y - 5}
            textAnchor="middle"
            fontSize={9}
            fill="#aaa"
            fontFamily="monospace"
          >
            {getComponentLabel(comp)}
          </text>
        </g>
      );
    });
  };

  const renderTraces = () => {
    return traces.map((trace) => {
      if (trace.points.length < 2) return null;
      const pts = trace.points.map((p) => `${holeX(p.col)},${holeY(p.row)}`).join(" ");
      const isSelected = selectedTraceId === trace.id;

      return (
        <g key={trace.id}>
          {isSelected && (
            <polyline
              points={pts}
              fill="none"
              stroke="#fff"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.3}
            />
          )}
          <polyline
            points={pts}
            fill="none"
            stroke={trace.color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            onClick={(e) => {
              e.stopPropagation();
              onTraceClick(trace.id);
            }}
            style={{
              cursor: mode === "select" || mode === "erase" ? "pointer" : "default",
            }}
          />
          {trace.points.map((p, i) => (
            <circle
              key={i}
              cx={holeX(p.col)}
              cy={holeY(p.row)}
              r={HOLE_RADIUS + 0.5}
              fill={trace.color}
              onClick={(e) => {
                e.stopPropagation();
                onTraceClick(trace.id);
              }}
              style={{
                cursor: mode === "select" || mode === "erase" ? "pointer" : "default",
              }}
            />
          ))}
        </g>
      );
    });
  };

  const renderDrawingPreview = () => {
    if (drawingPoints.length === 0) return null;
    const pts = drawingPoints.map((p) => `${holeX(p.col)},${holeY(p.row)}`).join(" ");

    return (
      <polyline
        points={pts}
        fill="none"
        stroke="#4ecdc4"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="6,4"
        opacity={0.8}
      />
    );
  };

  const renderPlacementPreview = () => {
    if (!placementPreview || !hoveredHole) return null;
    const { compRows, compCols, valid } = placementPreview;

    const x = holeX(hoveredHole.col) - GRID_SPACING * 0.4;
    const y = holeY(hoveredHole.row) - GRID_SPACING * 0.4;
    const w = (compCols - 1) * GRID_SPACING + GRID_SPACING * 0.8;
    const h = (compRows - 1) * GRID_SPACING + GRID_SPACING * 0.8;

    return (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={3}
        ry={3}
        fill={valid ? "rgba(78, 205, 196, 0.2)" : "rgba(239, 68, 68, 0.2)"}
        stroke={valid ? "#4ecdc4" : "#ef4444"}
        strokeWidth={1.5}
        strokeDasharray="4,3"
        pointerEvents="none"
      />
    );
  };

  // Auto-connect labels are now rendered inline in renderComponents via acComponentIds

  const renderCoordinateLabels = () => {
    const labels: React.ReactElement[] = [];
    for (let c = 0; c < cols; c++) {
      labels.push(
        <text
          key={`col-${c}`}
          x={holeX(c)}
          y={12}
          textAnchor="middle"
          fontSize={8}
          fill="#555"
          fontFamily="monospace"
        >
          {c + 1}
        </text>
      );
    }
    for (let r = 0; r < rows; r++) {
      labels.push(
        <text
          key={`row-${r}`}
          x={10}
          y={holeY(r) + 3}
          textAnchor="middle"
          fontSize={8}
          fill="#555"
          fontFamily="monospace"
        >
          {r + 1}
        </text>
      );
    }
    return labels;
  };

  return (
    <svg
      ref={svgRef}
      width={svgWidth}
      height={svgHeight}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      style={{ display: "block" }}
    >
      <rect
        x={BOARD_PADDING - 12}
        y={BOARD_PADDING - 12}
        width={(cols - 1) * GRID_SPACING + 24}
        height={(rows - 1) * GRID_SPACING + 24}
        rx={6}
        ry={6}
        fill="#1a5c2c"
        stroke="#0d3d1a"
        strokeWidth={2}
      />
      {renderCoordinateLabels()}
      {renderHoles()}
      {renderTraces()}
      {renderDrawingPreview()}
      {renderComponents()}
      {renderPlacementPreview()}
    </svg>
  );
};

export default Board;

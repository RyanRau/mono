import React, { useState, useCallback, useEffect, useRef } from "react";
import Board from "./components/Board";
import { autoConnectPoints } from "./utils/pathfinding";
import {
  Point,
  PlacedComponent,
  Trace,
  ToolMode,
  ComponentType,
  COMPONENT_DEFS,
  TRACE_COLORS,
  pointKey,
  getComponentHoles,
  getComponentBounds,
  BoardState,
} from "./types";
import "./App.css";

const STORAGE_KEY = "pcb-layout-state";

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function loadState(): BoardState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

function saveState(state: BoardState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

interface Notification {
  message: string;
  type: "info" | "error" | "success";
}

function App() {
  const saved = useRef(loadState());

  const [rows, setRows] = useState(saved.current?.rows ?? 30);
  const [cols, setCols] = useState(saved.current?.cols ?? 40);
  const [components, setComponents] = useState<PlacedComponent[]>(saved.current?.components ?? []);
  const [traces, setTraces] = useState<Trace[]>(saved.current?.traces ?? []);

  const [mode, setMode] = useState<ToolMode>("select");
  const [selectedComponentType, setSelectedComponentType] = useState<ComponentType | null>(null);
  const [componentOrientation, setComponentOrientation] = useState<"horizontal" | "vertical">(
    "horizontal"
  );

  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [acPoints, setAcPoints] = useState<Point[]>([]);
  const [hoveredHole, setHoveredHole] = useState<Point | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);

  const notificationTimeout = useRef<ReturnType<typeof setTimeout>>();

  const notify = useCallback((message: string, type: Notification["type"] = "info") => {
    setNotification({ message, type });
    if (notificationTimeout.current) clearTimeout(notificationTimeout.current);
    notificationTimeout.current = setTimeout(() => setNotification(null), 2500);
  }, []);

  useEffect(() => {
    saveState({ rows, cols, components, traces });
  }, [rows, cols, components, traces]);

  const nextTraceColor = useCallback(() => {
    return TRACE_COLORS[traces.length % TRACE_COLORS.length];
  }, [traces.length]);

  const getBlockedSet = useCallback((): Set<string> => {
    const blocked = new Set<string>();
    for (const comp of components) {
      for (const hole of getComponentHoles(comp)) {
        blocked.add(pointKey(hole));
      }
    }
    for (const trace of traces) {
      for (const p of trace.points) {
        blocked.add(pointKey(p));
      }
    }
    return blocked;
  }, [components, traces]);

  const canPlaceComponent = useCallback(
    (type: ComponentType, position: Point, orientation: "horizontal" | "vertical"): boolean => {
      const def = COMPONENT_DEFS[type];
      const compRows = orientation === "horizontal" ? def.rows : def.cols;
      const compCols = orientation === "horizontal" ? def.cols : def.rows;

      if (position.row + compRows > rows || position.col + compCols > cols) return false;

      const occupied = new Set<string>();
      for (const comp of components) {
        for (const hole of getComponentHoles(comp)) {
          occupied.add(pointKey(hole));
        }
      }

      for (let r = 0; r < compRows; r++) {
        for (let c = 0; c < compCols; c++) {
          if (occupied.has(pointKey({ row: position.row + r, col: position.col + c }))) {
            return false;
          }
        }
      }
      return true;
    },
    [components, rows, cols]
  );

  const handleHoleClick = useCallback(
    (point: Point) => {
      switch (mode) {
        case "place": {
          if (!selectedComponentType) {
            notify("Select a component type first", "error");
            return;
          }
          if (!canPlaceComponent(selectedComponentType, point, componentOrientation)) {
            notify("Cannot place component here", "error");
            return;
          }
          const newComp: PlacedComponent = {
            id: generateId(),
            type: selectedComponentType,
            position: point,
            orientation: componentOrientation,
          };
          setComponents((prev) => [...prev, newComp]);
          notify(`Placed ${COMPONENT_DEFS[selectedComponentType].label}`, "success");
          break;
        }

        case "draw": {
          setDrawingPoints((prev) => {
            if (prev.length > 0) {
              const last = prev[prev.length - 1];
              if (last.row === point.row && last.col === point.col) {
                return prev;
              }
            }
            return [...prev, point];
          });
          break;
        }

        case "auto-connect": {
          setAcPoints((prev) => {
            const exists = prev.findIndex((p) => p.row === point.row && p.col === point.col);
            if (exists >= 0) {
              return prev.filter((_, i) => i !== exists);
            }
            return [...prev, point];
          });
          break;
        }

        case "erase": {
          const pk = pointKey(point);
          const compToRemove = components.find((comp) =>
            getComponentHoles(comp).some((h) => pointKey(h) === pk)
          );
          if (compToRemove) {
            setComponents((prev) => prev.filter((c) => c.id !== compToRemove.id));
            notify("Component removed", "info");
            return;
          }
          const traceToRemove = traces.find((trace) =>
            trace.points.some((p) => pointKey(p) === pk)
          );
          if (traceToRemove) {
            setTraces((prev) => prev.filter((t) => t.id !== traceToRemove.id));
            notify("Trace removed", "info");
          }
          break;
        }

        case "select": {
          const pk = pointKey(point);
          const clickedComp = components.find((comp) =>
            getComponentHoles(comp).some((h) => pointKey(h) === pk)
          );
          if (clickedComp) {
            setSelectedComponentId(clickedComp.id);
            setSelectedTraceId(null);
            return;
          }
          const clickedTrace = traces.find((trace) => trace.points.some((p) => pointKey(p) === pk));
          if (clickedTrace) {
            setSelectedTraceId(clickedTrace.id);
            setSelectedComponentId(null);
            return;
          }
          setSelectedComponentId(null);
          setSelectedTraceId(null);
          break;
        }
      }
    },
    [
      mode,
      selectedComponentType,
      componentOrientation,
      components,
      traces,
      canPlaceComponent,
      notify,
    ]
  );

  const handleHoleRightClick = useCallback(
    (_point: Point, _e: React.MouseEvent) => {
      if (mode === "draw" && drawingPoints.length >= 2) {
        const newTrace: Trace = {
          id: generateId(),
          points: [...drawingPoints],
          color: nextTraceColor(),
        };
        setTraces((prev) => [...prev, newTrace]);
        setDrawingPoints([]);
        notify("Trace created", "success");
      }
    },
    [mode, drawingPoints, nextTraceColor, notify]
  );

  const handleComponentClick = useCallback(
    (id: string) => {
      if (mode === "erase") {
        setComponents((prev) => prev.filter((c) => c.id !== id));
        notify("Component removed", "info");
      } else if (mode === "select") {
        setSelectedComponentId(id);
        setSelectedTraceId(null);
      }
    },
    [mode, notify]
  );

  const handleTraceClick = useCallback(
    (id: string) => {
      if (mode === "erase") {
        setTraces((prev) => prev.filter((t) => t.id !== id));
        notify("Trace removed", "info");
      } else if (mode === "select") {
        setSelectedTraceId(id);
        setSelectedComponentId(null);
      }
    },
    [mode, notify]
  );

  const handleAutoRoute = useCallback(() => {
    if (acPoints.length < 2) {
      notify("Select at least 2 points to auto-connect", "error");
      return;
    }
    const blocked = getBlockedSet();
    const path = autoConnectPoints(acPoints, rows, cols, blocked);
    if (!path) {
      notify("No valid path found — try different points or clear obstacles", "error");
      return;
    }
    const newTrace: Trace = {
      id: generateId(),
      points: path,
      color: nextTraceColor(),
    };
    setTraces((prev) => [...prev, newTrace]);
    setAcPoints([]);
    notify("Auto-connected successfully", "success");
  }, [acPoints, rows, cols, getBlockedSet, nextTraceColor, notify]);

  const finishDrawing = useCallback(() => {
    if (drawingPoints.length >= 2) {
      const newTrace: Trace = {
        id: generateId(),
        points: [...drawingPoints],
        color: nextTraceColor(),
      };
      setTraces((prev) => [...prev, newTrace]);
      notify("Trace created", "success");
    }
    setDrawingPoints([]);
  }, [drawingPoints, nextTraceColor, notify]);

  const cancelDrawing = useCallback(() => {
    setDrawingPoints([]);
    setAcPoints([]);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case "1":
          setMode("select");
          break;
        case "2":
          setMode("place");
          break;
        case "3":
          setMode("draw");
          break;
        case "4":
          setMode("auto-connect");
          break;
        case "5":
          setMode("erase");
          break;
        case "r":
        case "R":
          if (mode === "place") {
            setComponentOrientation((prev) => (prev === "horizontal" ? "vertical" : "horizontal"));
          } else if (mode === "select" && selectedComponentId) {
            setComponents((prev) =>
              prev.map((c) => {
                if (c.id !== selectedComponentId) return c;
                const newOrientation = c.orientation === "horizontal" ? "vertical" : "horizontal";
                const bounds = getComponentBounds({
                  ...c,
                  orientation: newOrientation,
                });
                if (c.position.row + bounds.rows > rows || c.position.col + bounds.cols > cols) {
                  return c;
                }
                return { ...c, orientation: newOrientation };
              })
            );
          }
          break;
        case "Escape":
          if (drawingPoints.length > 0) {
            cancelDrawing();
          } else if (acPoints.length > 0) {
            cancelDrawing();
          } else {
            setSelectedComponentId(null);
            setSelectedTraceId(null);
          }
          break;
        case "Enter":
          if (mode === "draw") {
            finishDrawing();
          } else if (mode === "auto-connect") {
            handleAutoRoute();
          }
          break;
        case "Delete":
        case "Backspace":
          if (selectedComponentId) {
            setComponents((prev) => prev.filter((c) => c.id !== selectedComponentId));
            setSelectedComponentId(null);
            notify("Component deleted", "info");
          } else if (selectedTraceId) {
            setTraces((prev) => prev.filter((t) => t.id !== selectedTraceId));
            setSelectedTraceId(null);
            notify("Trace deleted", "info");
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    mode,
    selectedComponentId,
    selectedTraceId,
    drawingPoints,
    acPoints,
    rows,
    cols,
    finishDrawing,
    cancelDrawing,
    handleAutoRoute,
    notify,
  ]);

  useEffect(() => {
    setDrawingPoints([]);
    setAcPoints([]);
    setSelectedComponentId(null);
    setSelectedTraceId(null);
  }, [mode]);

  const handleClearAll = useCallback(() => {
    setComponents([]);
    setTraces([]);
    setDrawingPoints([]);
    setAcPoints([]);
    setSelectedComponentId(null);
    setSelectedTraceId(null);
    notify("Board cleared", "info");
  }, [notify]);

  const componentTypes = Object.entries(COMPONENT_DEFS) as [
    ComponentType,
    (typeof COMPONENT_DEFS)[ComponentType],
  ][];

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">PCB Layout Designer</div>

        <div className="sidebar-section">
          <h3>Board Size</h3>
          <div className="board-config">
            <div className="config-field">
              <label>Rows</label>
              <input
                type="number"
                min={5}
                max={80}
                value={rows}
                onChange={(e) => setRows(Math.max(5, Math.min(80, Number(e.target.value))))}
              />
            </div>
            <div className="config-field">
              <label>Columns</label>
              <input
                type="number"
                min={5}
                max={80}
                value={cols}
                onChange={(e) => setCols(Math.max(5, Math.min(80, Number(e.target.value))))}
              />
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Tools</h3>
          <div className="tool-buttons">
            <button
              className={`tool-btn ${mode === "select" ? "active" : ""}`}
              onClick={() => setMode("select")}
            >
              <span className="tool-icon">&#9654;</span> Select
              <span className="tool-key">1</span>
            </button>
            <button
              className={`tool-btn ${mode === "place" ? "active" : ""}`}
              onClick={() => setMode("place")}
            >
              <span className="tool-icon">&#9638;</span> Place Component
              <span className="tool-key">2</span>
            </button>
            <button
              className={`tool-btn ${mode === "draw" ? "active" : ""}`}
              onClick={() => setMode("draw")}
            >
              <span className="tool-icon">&#9998;</span> Draw Trace
              <span className="tool-key">3</span>
            </button>
            <button
              className={`tool-btn ${mode === "auto-connect" ? "active" : ""}`}
              onClick={() => setMode("auto-connect")}
            >
              <span className="tool-icon">&#9733;</span> Auto Connect
              <span className="tool-key">4</span>
            </button>
            <button
              className={`tool-btn ${mode === "erase" ? "active" : ""}`}
              onClick={() => setMode("erase")}
            >
              <span className="tool-icon">&#10005;</span> Erase
              <span className="tool-key">5</span>
            </button>
          </div>
        </div>

        {mode === "place" && (
          <div className="sidebar-section">
            <h3>Components</h3>
            <div className="component-grid">
              {componentTypes.map(([type, def]) => (
                <button
                  key={type}
                  className={`comp-btn ${selectedComponentType === type ? "active" : ""}`}
                  onClick={() => setSelectedComponentType(type)}
                >
                  {def.label}
                </button>
              ))}
            </div>
            <div className="orientation-toggle">
              <button
                className={componentOrientation === "horizontal" ? "active" : ""}
                onClick={() => setComponentOrientation("horizontal")}
              >
                Horizontal
              </button>
              <button
                className={componentOrientation === "vertical" ? "active" : ""}
                onClick={() => setComponentOrientation("vertical")}
              >
                Vertical
              </button>
            </div>
          </div>
        )}

        {mode === "draw" && drawingPoints.length > 0 && (
          <div className="sidebar-section">
            <h3>Drawing</h3>
            <div className="action-buttons">
              <button className="action-btn primary" onClick={finishDrawing}>
                Finish Trace (Enter)
              </button>
              <button className="action-btn" onClick={cancelDrawing}>
                Cancel (Esc)
              </button>
            </div>
            <p
              style={{
                fontSize: 11,
                color: "#666",
                marginTop: 6,
              }}
            >
              {drawingPoints.length} point{drawingPoints.length !== 1 ? "s" : ""} — right-click or
              Enter to finish
            </p>
          </div>
        )}

        {mode === "auto-connect" && (
          <div className="sidebar-section">
            <h3>Auto Connect</h3>
            <div className="action-buttons">
              <button
                className="action-btn primary"
                onClick={handleAutoRoute}
                disabled={acPoints.length < 2}
              >
                Route Path (Enter)
              </button>
              <button className="action-btn" onClick={cancelDrawing}>
                Clear Points (Esc)
              </button>
            </div>
            <p
              style={{
                fontSize: 11,
                color: "#666",
                marginTop: 6,
              }}
            >
              {acPoints.length} point{acPoints.length !== 1 ? "s" : ""} selected — click holes to
              add/remove
            </p>
          </div>
        )}

        <div className="sidebar-section">
          <h3>Traces ({traces.length})</h3>
          {traces.length === 0 ? (
            <p className="empty-text">No traces yet</p>
          ) : (
            <div className="trace-list">
              {traces.map((trace, i) => (
                <div
                  key={trace.id}
                  className={`trace-item ${selectedTraceId === trace.id ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedTraceId(trace.id);
                    setSelectedComponentId(null);
                  }}
                >
                  <span className="trace-color-dot" style={{ background: trace.color }} />
                  <span className="trace-item-label">
                    Trace {i + 1} ({trace.points.length} pts)
                  </span>
                  <button
                    className="trace-item-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTraces((prev) => prev.filter((t) => t.id !== trace.id));
                    }}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sidebar-section">
          <h3>Actions</h3>
          <div className="action-buttons">
            <button className="action-btn danger" onClick={handleClearAll}>
              Clear Board
            </button>
          </div>
        </div>

        <div className="status-bar">
          <span>{rows}</span> &times; <span>{cols}</span> board &middot;{" "}
          <span>{components.length}</span> components &middot; <span>{traces.length}</span> traces
          {hoveredHole && (
            <>
              {" "}
              &middot; ({hoveredHole.row + 1}, {hoveredHole.col + 1})
            </>
          )}
        </div>
      </div>

      <div className="board-area">
        <Board
          rows={rows}
          cols={cols}
          components={components}
          traces={traces}
          mode={mode}
          selectedComponentType={selectedComponentType}
          componentOrientation={componentOrientation}
          drawingPoints={drawingPoints}
          autoConnectPoints={acPoints}
          hoveredHole={hoveredHole}
          selectedComponentId={selectedComponentId}
          selectedTraceId={selectedTraceId}
          onHoleClick={handleHoleClick}
          onHoleHover={setHoveredHole}
          onHoleRightClick={handleHoleRightClick}
          onComponentClick={handleComponentClick}
          onTraceClick={handleTraceClick}
        />
      </div>

      {notification && (
        <div className={`notification ${notification.type}`}>{notification.message}</div>
      )}
    </div>
  );
}

export default App;

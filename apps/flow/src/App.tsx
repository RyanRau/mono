import { useCallback, useState } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type OnConnect,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import { ThemeProvider } from "bluestar";
import { Canvas } from "./components/Canvas";
import { Sidebar } from "./components/Sidebar";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { JsonExport } from "./components/JsonExport";
import type {
  FlowNode,
  FlowEdge,
  FlowMeta,
  NodeType,
  FlowNodeData,
  FlowEdgeData,
} from "./types";
import { newNodeData, buildFlowJson } from "./utils";
import { DARK_THEME } from "./styles";

let nodeCounter = 0;
let edgeCounter = 0;

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [meta, setMeta] = useState<FlowMeta>({ id: "", version: "" });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [jsonContent, setJsonContent] = useState("");

  const handleAddNode = useCallback(
    (type: NodeType) => {
      nodeCounter++;
      const id = `rf-node-${nodeCounter}`;
      const node: FlowNode = {
        id,
        type: "flowNode",
        position: {
          x: 180 + Math.random() * 300,
          y: 100 + Math.random() * 200,
        },
        data: newNodeData(type, nodeCounter),
      };
      setNodes((nds) => [...nds, node]);
    },
    [setNodes],
  );

  const handleConnect: OnConnect = useCallback(
    (connection) => {
      edgeCounter++;
      setEdges((eds) =>
        addEdge<FlowEdge>(
          {
            ...connection,
            id: `rf-edge-${edgeCounter}`,
            type: "flowEdge",
            data: {
              hasCondition: false,
              condition: { field: "", op: "eq", value: "" },
            },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const handleNodeUpdate = useCallback(
    (id: string, updates: Partial<FlowNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...updates } } : n,
        ),
      );
    },
    [setNodes],
  );

  const handleEdgeUpdate = useCallback(
    (id: string, updates: Partial<FlowEdgeData>) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === id
            ? { ...e, data: { ...(e.data ?? {}), ...updates } as FlowEdgeData }
            : e,
        ),
      );
    },
    [setEdges],
  );

  const handleNodeSelect = useCallback((id: string | null) => {
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
  }, []);

  const handleEdgeSelect = useCallback((id: string | null) => {
    setSelectedEdgeId(id);
    setSelectedNodeId(null);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) =>
        eds.filter((e) => e.source !== id && e.target !== id),
      );
      setSelectedNodeId(null);
    },
    [setNodes, setEdges],
  );

  const handleDeleteEdge = useCallback(
    (id: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== id));
      setSelectedEdgeId(null);
    },
    [setEdges],
  );

  const handleExport = useCallback(() => {
    const flow = buildFlowJson(meta, nodes, edges);
    setJsonContent(JSON.stringify(flow, null, 2));
    setShowJson(true);
  }, [meta, nodes, edges]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      for (const change of changes) {
        if (change.type === "remove" && change.id === selectedNodeId) {
          setSelectedNodeId(null);
        }
      }
      onNodesChange(changes);
    },
    [onNodesChange, selectedNodeId],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<FlowEdge>[]) => {
      for (const change of changes) {
        if (change.type === "remove" && change.id === selectedEdgeId) {
          setSelectedEdgeId(null);
        }
      }
      onEdgesChange(changes);
    },
    [onEdgesChange, selectedEdgeId],
  );

  return (
    <ThemeProvider theme={DARK_THEME}>
      <div
        style={{
          display: "flex",
          height: "100vh",
          background: "#111827",
          color: "#f9fafb",
          overflow: "hidden",
        }}
      >
        <Sidebar
          meta={meta}
          onMetaChange={setMeta}
          onAddNode={handleAddNode}
          onExport={handleExport}
        />

        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <Canvas
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeSelect={handleNodeSelect}
            onEdgeSelect={handleEdgeSelect}
            onPaneClick={handlePaneClick}
          />
        </div>

        <PropertiesPanel
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          nodes={nodes}
          edges={edges}
          onNodeUpdate={handleNodeUpdate}
          onEdgeUpdate={handleEdgeUpdate}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
        />

        {showJson && (
          <JsonExport json={jsonContent} onClose={() => setShowJson(false)} />
        )}
      </div>
    </ThemeProvider>
  );
}

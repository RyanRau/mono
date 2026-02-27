import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from "@xyflow/react";
import { FlowNodeCard } from "./FlowNodeCard";
import { FlowEdgeCard } from "./FlowEdgeCard";
import { colors } from "../styles";
import type { FlowNode, FlowEdge } from "../types";

const nodeTypes: NodeTypes = {
  flowNode: FlowNodeCard,
};

const edgeTypes: EdgeTypes = {
  flowEdge: FlowEdgeCard,
};

interface CanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange: OnNodesChange<FlowNode>;
  onEdgesChange: OnEdgesChange<FlowEdge>;
  onConnect: OnConnect;
  onNodeSelect: (id: string | null) => void;
  onEdgeSelect: (id: string | null) => void;
  onPaneClick: () => void;
}

export function Canvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeSelect,
  onEdgeSelect,
  onPaneClick,
}: CanvasProps) {
  const handleNodeClick: NodeMouseHandler<FlowNode> = useCallback(
    (_evt, node) => {
      onNodeSelect(node.id);
    },
    [onNodeSelect],
  );

  const handleEdgeClick: EdgeMouseHandler<FlowEdge> = useCallback(
    (_evt, edge) => {
      onEdgeSelect(edge.id);
    },
    [onEdgeSelect],
  );

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={onPaneClick}
        fitView
        style={{ background: colors.bg }}
        deleteKeyCode="Delete"
        defaultEdgeOptions={{ type: "flowEdge" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={colors.border}
        />
        <Controls
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
          }}
        />
        <MiniMap
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
          }}
          nodeColor={(node) => {
            const flowNode = node as FlowNode;
            return flowNode.data?.nodeType === "script"
              ? colors.scriptColor
              : colors.httpColor;
          }}
          maskColor="rgba(17,24,39,0.7)"
        />
      </ReactFlow>
    </div>
  );
}

import { colors, inputStyle, dangerBtnStyle } from "../styles";
import { ScriptNodeForm } from "./ScriptNodeForm";
import { HttpNodeForm } from "./HttpNodeForm";
import { ConditionForm } from "./ConditionForm";
import type {
  FlowNode,
  FlowEdge,
  FlowNodeData,
  FlowEdgeData,
  Condition,
} from "../types";

interface PropertiesPanelProps {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodeUpdate: (id: string, updates: Partial<FlowNodeData>) => void;
  onEdgeUpdate: (id: string, updates: Partial<FlowEdgeData>) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
}

function SectionHeader({ children }: { children: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: colors.textMuted,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 8,
        color: colors.textFaint,
        fontSize: 13,
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28 }}>☞</div>
      <div>Select a node or edge to configure it</div>
    </div>
  );
}

export function PropertiesPanel({
  selectedNodeId,
  selectedEdgeId,
  nodes,
  edges,
  onNodeUpdate,
  onEdgeUpdate,
  onDeleteNode,
  onDeleteEdge,
}: PropertiesPanelProps) {
  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;
  const selectedEdge = selectedEdgeId
    ? edges.find((e) => e.id === selectedEdgeId)
    : null;

  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        background: colors.surface,
        borderLeft: `1px solid ${colors.border}`,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {!selectedNode && !selectedEdge && <EmptyState />}

      {selectedNode && (
        <div style={{ padding: 16 }}>
          <SectionHeader>Node Properties</SectionHeader>

          {/* Node label / ID */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: colors.textMuted,
                marginBottom: 4,
              }}
            >
              Node ID (used in flow spec)
            </label>
            <input
              style={inputStyle}
              value={selectedNode.data.label}
              onChange={(e) =>
                onNodeUpdate(selectedNode.id, { label: e.target.value })
              }
              placeholder="my-node-id"
            />
          </div>

          {/* Type badge */}
          <div style={{ marginBottom: 16 }}>
            <span
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                background:
                  selectedNode.data.nodeType === "script"
                    ? `${colors.scriptColor}33`
                    : `${colors.httpColor}33`,
                color:
                  selectedNode.data.nodeType === "script"
                    ? colors.scriptColor
                    : colors.httpColor,
              }}
            >
              {selectedNode.data.nodeType}
            </span>
          </div>

          <div
            style={{
              borderTop: `1px solid ${colors.border}`,
              paddingTop: 16,
              marginBottom: 16,
            }}
          >
            {selectedNode.data.nodeType === "script" ? (
              <ScriptNodeForm
                data={selectedNode.data}
                onChange={(updates) =>
                  onNodeUpdate(selectedNode.id, updates)
                }
              />
            ) : (
              <HttpNodeForm
                data={selectedNode.data}
                onChange={(updates) =>
                  onNodeUpdate(selectedNode.id, updates)
                }
              />
            )}
          </div>

          <button
            style={dangerBtnStyle}
            onClick={() => onDeleteNode(selectedNode.id)}
          >
            Delete Node
          </button>
        </div>
      )}

      {selectedEdge && (
        <div style={{ padding: 16 }}>
          <SectionHeader>Edge Properties</SectionHeader>

          <div
            style={{
              fontSize: 12,
              color: colors.textMuted,
              marginBottom: 16,
              fontFamily: "monospace",
            }}
          >
            {(() => {
              const src = nodes.find((n) => n.id === selectedEdge.source);
              const tgt = nodes.find((n) => n.id === selectedEdge.target);
              return (
                <>
                  <span style={{ color: colors.scriptColor }}>{src?.data.label ?? selectedEdge.source}</span>
                  {" → "}
                  <span style={{ color: colors.httpColor }}>{tgt?.data.label ?? selectedEdge.target}</span>
                </>
              );
            })()}
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: colors.text,
              cursor: "pointer",
              marginBottom: 16,
            }}
          >
            <input
              type="checkbox"
              checked={selectedEdge.data?.hasCondition ?? false}
              onChange={(e) =>
                onEdgeUpdate(selectedEdge.id, {
                  hasCondition: e.target.checked,
                })
              }
            />
            Conditional edge
          </label>

          {selectedEdge.data?.hasCondition && (
            <div>
              <div
                style={{
                  borderTop: `1px solid ${colors.border}`,
                  paddingTop: 12,
                  marginBottom: 12,
                }}
              >
                <SectionHeader>Condition</SectionHeader>
                <ConditionForm
                  condition={
                    selectedEdge.data.condition ?? {
                      field: "",
                      op: "eq",
                      value: "",
                    }
                  }
                  onChange={(condition: Condition) =>
                    onEdgeUpdate(selectedEdge.id, { condition })
                  }
                />
              </div>
            </div>
          )}

          <button
            style={dangerBtnStyle}
            onClick={() => onDeleteEdge(selectedEdge.id)}
          >
            Delete Edge
          </button>
        </div>
      )}
    </div>
  );
}

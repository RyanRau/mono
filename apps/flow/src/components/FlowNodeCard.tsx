import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { colors } from "../styles";
import type { FlowNodeData } from "../types";

type FlowNodeType = Node<FlowNodeData, "flowNode">;

export function FlowNodeCard({ data, selected }: NodeProps<FlowNodeType>) {
  const isScript = data.nodeType === "script";
  const accentColor = isScript ? colors.scriptColor : colors.httpColor;

  return (
    <div
      style={{
        minWidth: 160,
        background: colors.surface,
        border: `2px solid ${selected ? accentColor : colors.border}`,
        borderRadius: 8,
        boxShadow: selected
          ? `0 0 0 2px ${accentColor}33`
          : "0 2px 8px rgba(0,0,0,0.4)",
        overflow: "hidden",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Header strip */}
      <div
        style={{
          background: accentColor,
          padding: "4px 10px",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {data.nodeType}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "8px 10px" }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: colors.text,
            marginBottom: 4,
            wordBreak: "break-all",
          }}
        >
          {data.label}
        </div>
        <div style={{ fontSize: 11, color: colors.textMuted }}>
          {isScript ? (
            <code style={{ fontFamily: "monospace" }}>{data.command || "—"}</code>
          ) : (
            <span>
              <span
                style={{
                  background: colors.surface2,
                  borderRadius: 3,
                  padding: "1px 4px",
                  marginRight: 4,
                  fontFamily: "monospace",
                  fontSize: 10,
                }}
              >
                {data.method}
              </span>
              <span
                style={{
                  maxWidth: 120,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "inline-block",
                  verticalAlign: "middle",
                }}
              >
                {data.url || "—"}
              </span>
            </span>
          )}
        </div>
        {data.output.as && (
          <div style={{ fontSize: 10, color: colors.textFaint, marginTop: 4 }}>
            → <code style={{ fontFamily: "monospace" }}>{data.output.as}</code>
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: accentColor,
          border: `2px solid ${colors.bg}`,
          width: 10,
          height: 10,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: accentColor,
          border: `2px solid ${colors.bg}`,
          width: 10,
          height: 10,
        }}
      />
    </div>
  );
}

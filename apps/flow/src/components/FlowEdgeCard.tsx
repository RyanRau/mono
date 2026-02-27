import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";
import { colors } from "../styles";
import type { FlowEdgeData } from "../types";

type FlowEdgeType = Edge<FlowEdgeData>;

export function FlowEdgeCard({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<FlowEdgeType>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeColor = selected ? colors.primary : colors.border;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: edgeColor,
          strokeWidth: selected ? 2.5 : 1.5,
          transition: "stroke 0.15s, stroke-width 0.15s",
        }}
        markerEnd={`url(#arrow-${selected ? "selected" : "default"})`}
      />
      {data?.hasCondition && data.condition.field && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
          >
            <div
              style={{
                background: colors.surface,
                border: `1px solid ${selected ? colors.primary : colors.border}`,
                borderRadius: 4,
                padding: "2px 6px",
                fontSize: 10,
                fontFamily: "monospace",
                color: colors.textMuted,
                whiteSpace: "nowrap",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              }}
            >
              {data.condition.op}{" "}
              <span style={{ color: colors.warning }}>{data.condition.value}</span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

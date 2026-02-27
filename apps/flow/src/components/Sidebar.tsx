import { colors, inputStyle } from "../styles";
import type { FlowMeta, NodeType } from "../types";

interface SidebarProps {
  meta: FlowMeta;
  onMetaChange: (meta: FlowMeta) => void;
  onAddNode: (type: NodeType) => void;
  onExport: () => void;
}

function AddNodeButton({
  label,
  color,
  onClick,
}: {
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "9px 12px",
        background: colors.surface2,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        color: colors.text,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 500,
        marginBottom: 8,
        transition: "background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = color;
        (e.currentTarget as HTMLButtonElement).style.background = `${color}22`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = colors.border;
        (e.currentTarget as HTMLButtonElement).style.background = colors.surface2;
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: 2,
          background: color,
          flexShrink: 0,
        }}
      />
      {label}
    </button>
  );
}

export function Sidebar({ meta, onMetaChange, onAddNode, onExport }: SidebarProps) {
  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        background: colors.surface,
        borderRight: `1px solid ${colors.border}`,
        display: "flex",
        flexDirection: "column",
        padding: 16,
        gap: 0,
        overflowY: "auto",
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: colors.text,
          marginBottom: 20,
          letterSpacing: "-0.02em",
        }}
      >
        Flow Editor
      </div>

      {/* Add nodes */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: colors.textMuted,
          marginBottom: 8,
        }}
      >
        Add Node
      </div>
      <AddNodeButton
        label="Script Node"
        color={colors.scriptColor}
        onClick={() => onAddNode("script")}
      />
      <AddNodeButton
        label="HTTP Node"
        color={colors.httpColor}
        onClick={() => onAddNode("http")}
      />

      {/* Divider */}
      <div
        style={{
          borderTop: `1px solid ${colors.border}`,
          margin: "16px 0",
        }}
      />

      {/* Flow metadata */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: colors.textMuted,
          marginBottom: 10,
        }}
      >
        Flow Metadata
      </div>

      <div style={{ marginBottom: 10 }}>
        <label
          style={{
            display: "block",
            fontSize: 11,
            color: colors.textMuted,
            marginBottom: 4,
          }}
        >
          ID
        </label>
        <input
          style={inputStyle}
          value={meta.id}
          onChange={(e) => onMetaChange({ ...meta, id: e.target.value })}
          placeholder="my-flow"
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: "block",
            fontSize: 11,
            color: colors.textMuted,
            marginBottom: 4,
          }}
        >
          Version
        </label>
        <input
          style={inputStyle}
          value={meta.version}
          onChange={(e) => onMetaChange({ ...meta, version: e.target.value })}
          placeholder="1.0"
        />
      </div>

      {/* Divider */}
      <div
        style={{
          borderTop: `1px solid ${colors.border}`,
          margin: "4px 0 16px",
        }}
      />

      {/* Help text */}
      <div
        style={{
          fontSize: 11,
          color: colors.textFaint,
          lineHeight: 1.5,
          marginBottom: 16,
        }}
      >
        Drag from a node's bottom handle to another's top handle to connect them.
        Click a node or edge to configure it.
        <br /><br />
        Press <kbd style={{ background: colors.surface2, padding: "1px 4px", borderRadius: 3, fontFamily: "monospace" }}>Delete</kbd> to remove selected elements.
      </div>

      {/* Export */}
      <div style={{ marginTop: "auto" }}>
        <button
          onClick={onExport}
          style={{
            display: "block",
            width: "100%",
            padding: "10px 16px",
            background: colors.primary,
            border: "none",
            borderRadius: 6,
            color: "#fff",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = colors.primaryHover;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = colors.primary;
          }}
        >
          Export JSON
        </button>
      </div>
    </div>
  );
}

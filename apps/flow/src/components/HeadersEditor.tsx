import { colors, inputStyle } from "../styles";
import type { HeaderEntry } from "../types";

interface HeadersEditorProps {
  headers: HeaderEntry[];
  onChange: (headers: HeaderEntry[]) => void;
}

let headerIdCounter = 0;

function newHeaderId(): string {
  return `h-${++headerIdCounter}`;
}

export function HeadersEditor({ headers, onChange }: HeadersEditorProps) {
  const addRow = () => {
    onChange([...headers, { id: newHeaderId(), key: "", value: "" }]);
  };

  const removeRow = (id: string) => {
    onChange(headers.filter((h) => h.id !== id));
  };

  const updateRow = (id: string, field: "key" | "value", val: string) => {
    onChange(headers.map((h) => (h.id === id ? { ...h, [field]: val } : h)));
  };

  return (
    <div>
      {headers.map((h) => (
        <div
          key={h.id}
          style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}
        >
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Header-Name"
            value={h.key}
            onChange={(e) => updateRow(h.id, "key", e.target.value)}
          />
          <input
            style={{ ...inputStyle, flex: 2 }}
            placeholder="value"
            value={h.value}
            onChange={(e) => updateRow(h.id, "value", e.target.value)}
          />
          <button
            onClick={() => removeRow(h.id)}
            style={{
              background: "none",
              border: "none",
              color: colors.textFaint,
              cursor: "pointer",
              fontSize: 16,
              padding: "0 4px",
              lineHeight: 1,
            }}
            title="Remove"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={addRow}
        style={{
          background: "none",
          border: `1px dashed ${colors.border}`,
          borderRadius: 4,
          color: colors.textMuted,
          cursor: "pointer",
          fontSize: 12,
          padding: "4px 8px",
          width: "100%",
        }}
      >
        + Add Header
      </button>
    </div>
  );
}

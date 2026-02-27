import { FormField } from "./FormField";
import { inputStyle, selectStyle, colors } from "../styles";
import type { FlowInput, InputVia } from "../types";

interface InputConfigProps {
  input: FlowInput;
  onChange: (input: FlowInput) => void;
}

const VIA_OPTIONS: { value: InputVia; label: string }[] = [
  { value: "", label: "None" },
  { value: "stdin_text", label: "stdin (text)" },
  { value: "stdin_binary", label: "stdin (binary)" },
];

export function InputConfig({ input, onChange }: InputConfigProps) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: colors.textMuted, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={input.useFromAny}
            onChange={(e) =>
              onChange({ ...input, useFromAny: e.target.checked })
            }
          />
          Use <code style={{ color: colors.textMuted }}>from_any</code>
        </label>
      </div>

      {input.useFromAny ? (
        <FormField
          label="From any (node IDs)"
          hint="Comma-separated node IDs; first non-skipped result is used"
        >
          <input
            style={inputStyle}
            value={input.from_any}
            onChange={(e) => onChange({ ...input, from_any: e.target.value })}
            placeholder="node-a, node-b"
          />
        </FormField>
      ) : (
        <FormField label="From (node ID)">
          <input
            style={inputStyle}
            value={input.from}
            onChange={(e) => onChange({ ...input, from: e.target.value })}
            placeholder="upstream-node-id"
          />
        </FormField>
      )}

      <FormField label="Field (output name)">
        <input
          style={inputStyle}
          value={input.field}
          onChange={(e) => onChange({ ...input, field: e.target.value })}
          placeholder="result"
        />
      </FormField>

      <FormField label="Via">
        <select
          style={selectStyle}
          value={input.via}
          onChange={(e) => onChange({ ...input, via: e.target.value as InputVia })}
        >
          {VIA_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </FormField>
    </div>
  );
}

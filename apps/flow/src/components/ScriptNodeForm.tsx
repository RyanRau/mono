import { FormField } from "./FormField";
import { OutputConfig } from "./OutputConfig";
import { InputConfig } from "./InputConfig";
import { inputStyle, textareaStyle, colors } from "../styles";
import type { FlowNodeData, FlowOutput, FlowInput } from "../types";

interface ScriptNodeFormProps {
  data: FlowNodeData;
  onChange: (updates: Partial<FlowNodeData>) => void;
}

export function ScriptNodeForm({ data, onChange }: ScriptNodeFormProps) {
  return (
    <div>
      <FormField label="Command" hint="Supports {{env.VAR}} templates">
        <input
          style={inputStyle}
          value={data.command}
          onChange={(e) => onChange({ command: e.target.value })}
          placeholder="echo"
        />
      </FormField>

      <FormField
        label="Args"
        hint="One argument per line. Supports {{nodes.<id>.<name>}} templates."
      >
        <textarea
          style={textareaStyle}
          value={data.args}
          onChange={(e) => onChange({ args: e.target.value })}
          placeholder={"Hello, {{env.USER}}!\nAnother arg"}
          rows={3}
        />
      </FormField>

      <FormField label="Timeout (seconds)">
        <input
          style={inputStyle}
          type="number"
          min={1}
          value={data.timeoutSeconds}
          onChange={(e) => onChange({ timeoutSeconds: e.target.value })}
          placeholder="300 (default)"
        />
      </FormField>

      <div
        style={{
          borderTop: `1px solid ${colors.border}`,
          paddingTop: 12,
          marginTop: 4,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Output
        </div>
        <OutputConfig
          output={data.output}
          onChange={(output: FlowOutput) => onChange({ output })}
        />
      </div>

      <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            fontWeight: 600,
            color: colors.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            cursor: "pointer",
            marginBottom: 10,
          }}
        >
          <input
            type="checkbox"
            checked={data.hasInput}
            onChange={(e) => onChange({ hasInput: e.target.checked })}
          />
          Input block
        </label>
        {data.hasInput && (
          <InputConfig
            input={data.input}
            onChange={(input: FlowInput) => onChange({ input })}
          />
        )}
      </div>
    </div>
  );
}

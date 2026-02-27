import { FormField } from "./FormField";
import { OutputConfig } from "./OutputConfig";
import { InputConfig } from "./InputConfig";
import { HeadersEditor } from "./HeadersEditor";
import { inputStyle, selectStyle, textareaStyle, colors } from "../styles";
import type { FlowNodeData, FlowOutput, FlowInput, HeaderEntry } from "../types";

interface HttpNodeFormProps {
  data: FlowNodeData;
  onChange: (updates: Partial<FlowNodeData>) => void;
}

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export function HttpNodeForm({ data, onChange }: HttpNodeFormProps) {
  return (
    <div>
      <FormField label="URL" hint="Supports {{env.VAR}} and {{nodes.<id>.<name>}} templates">
        <input
          style={inputStyle}
          value={data.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://api.example.com/data"
        />
      </FormField>

      <FormField label="Method">
        <select
          style={selectStyle}
          value={data.method}
          onChange={(e) => onChange({ method: e.target.value })}
        >
          {HTTP_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Headers">
        <HeadersEditor
          headers={data.headers}
          onChange={(headers: HeaderEntry[]) => onChange({ headers })}
        />
      </FormField>

      <FormField label="Body" hint="JSON object or raw string. Templates supported.">
        <textarea
          style={textareaStyle}
          value={data.body}
          onChange={(e) => onChange({ body: e.target.value })}
          placeholder={'{"key": "{{nodes.prev.result}}"}'}
          rows={4}
        />
      </FormField>

      <FormField label="Timeout (seconds)">
        <input
          style={inputStyle}
          type="number"
          min={1}
          value={data.timeoutSeconds}
          onChange={(e) => onChange({ timeoutSeconds: e.target.value })}
          placeholder="30 (default)"
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

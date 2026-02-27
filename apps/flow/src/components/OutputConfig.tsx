import { FormField } from "./FormField";
import { inputStyle, selectStyle } from "../styles";
import type { FlowOutput, OutputFormat } from "../types";

interface OutputConfigProps {
  output: FlowOutput;
  onChange: (output: FlowOutput) => void;
}

const FORMAT_OPTIONS: OutputFormat[] = ["text", "json", "binary"];

export function OutputConfig({ output, onChange }: OutputConfigProps) {
  return (
    <div>
      <FormField label="Output format">
        <select
          style={selectStyle}
          value={output.format}
          onChange={(e) =>
            onChange({ ...output, format: e.target.value as OutputFormat })
          }
        >
          {FORMAT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Output name (as)" hint='Referenced downstream as {{nodes.<id>.<name>}}'>
        <input
          style={inputStyle}
          value={output.as}
          onChange={(e) => onChange({ ...output, as: e.target.value })}
          placeholder="result"
        />
      </FormField>
    </div>
  );
}

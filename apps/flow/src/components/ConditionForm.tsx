import { FormField } from "./FormField";
import { inputStyle, selectStyle } from "../styles";
import type { Condition, ConditionOp } from "../types";

interface ConditionFormProps {
  condition: Condition;
  onChange: (condition: Condition) => void;
}

const OP_OPTIONS: { value: ConditionOp; label: string }[] = [
  { value: "eq", label: "eq — equal" },
  { value: "ne", label: "ne — not equal" },
  { value: "gt", label: "gt — greater than" },
  { value: "gte", label: "gte — ≥" },
  { value: "lt", label: "lt — less than" },
  { value: "lte", label: "lte — ≤" },
  { value: "contains", label: "contains — substring" },
];

export function ConditionForm({ condition, onChange }: ConditionFormProps) {
  return (
    <div>
      <FormField label="Field" hint='Dot-path e.g. nodes.node-id.result.status'>
        <input
          style={inputStyle}
          value={condition.field}
          onChange={(e) => onChange({ ...condition, field: e.target.value })}
          placeholder="nodes.step.result.status_code"
        />
      </FormField>
      <FormField label="Operator">
        <select
          style={selectStyle}
          value={condition.op}
          onChange={(e) =>
            onChange({ ...condition, op: e.target.value as ConditionOp })
          }
        >
          {OP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Value">
        <input
          style={inputStyle}
          value={condition.value}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          placeholder='200 or "ok"'
        />
      </FormField>
    </div>
  );
}

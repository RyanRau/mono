import { css } from "goober";
import { useTheme } from "../../../theme";
import FormInputLayout from "../FormInputLayout/FormInputLayout";
import Text from "../../text/Text/Text";

export type CheckboxOption = {
  label: string;
  value: string;
};

type CheckboxListProps = {
  options: CheckboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  description?: string;
  warning?: string;
  isDisabled?: boolean;
};

export default function CheckboxList({
  options,
  value,
  onChange,
  label,
  description,
  warning,
  isDisabled,
}: CheckboxListProps) {
  const theme = useTheme();

  function toggle(optionValue: string, checked: boolean) {
    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter((v) => v !== optionValue));
    }
  }

  return (
    <FormInputLayout label={label} description={description} warning={warning}>
      <div
        className={css`
          display: flex;
          flex-direction: column;
          gap: 8px;
        `}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={css`
              display: flex;
              align-items: center;
              gap: 8px;
              cursor: ${isDisabled ? "not-allowed" : "pointer"};
              opacity: ${isDisabled ? 0.5 : 1};
            `}
          >
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={(e) => toggle(option.value, e.target.checked)}
              disabled={isDisabled}
              className={css`
                width: 16px;
                height: 16px;
                cursor: ${isDisabled ? "not-allowed" : "pointer"};
                accent-color: ${theme.colors.primary};
                flex-shrink: 0;
              `}
            />
            <Text variant="subtitle">{option.label}</Text>
          </label>
        ))}
      </div>
    </FormInputLayout>
  );
}

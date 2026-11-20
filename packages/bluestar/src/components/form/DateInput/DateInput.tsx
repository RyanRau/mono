import { useTheme } from "../../../theme";
import FormInputLayout from "../FormInputLayout/FormInputLayout";
import type { FormFieldProps } from "../FormInputLayout/FormInputLayout";
import { controlClass } from "../controlStyles";

export type DateInputProps = FormFieldProps & {
  /** A calendar date as `"YYYY-MM-DD"`, or `""` when empty. Deliberately a
   *  string, not a `Date`: a date-only value has no time zone, and a `Date`
   *  would silently shift it a day for anyone west of UTC. */
  value: string;
  onChange: (value: string) => void;
  /** Earliest selectable date, `"YYYY-MM-DD"`. */
  min?: string;
  /** Latest selectable date, `"YYYY-MM-DD"`. */
  max?: string;
};

/**
 * A calendar-date field on the native `<input type="date">` — the browser
 * supplies the picker (and the mobile wheel), this supplies the shared
 * control box so it matches `TextInput`/`NumberInput` beside it.
 */
export default function DateInput({
  value,
  onChange,
  label,
  description,
  warning,
  error,
  required,
  name,
  min,
  max,
  isDisabled,
  hideLabel,
}: DateInputProps) {
  const theme = useTheme();

  return (
    <FormInputLayout
      label={label}
      description={description}
      warning={warning}
      error={error}
      required={required}
      hideLabel={hideLabel}
    >
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          name={name}
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          disabled={isDisabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={controlClass(theme, { invalid, warning: Boolean(warning) })}
          // The native picker icon and text follow the page's scheme.
          style={{ colorScheme: "light dark" }}
        />
      )}
    </FormInputLayout>
  );
}

import { css } from "goober";
import { useTheme } from "../../../theme";

export type ProgressBarProps = {
  /** Current amount. Clamped into `0..max` for drawing; the real value is
   *  still reported to assistive tech. */
  value: number;
  /** Defaults to `100`. */
  max?: number;
  /** Accessible name — what this measures ("Vacation goal"). Not rendered;
   *  put visible text beside the bar yourself. */
  label: string;
  /** Fill color intent. Defaults to `"primary"`. */
  variant?: "primary" | "success" | "warning" | "error";
  /** Track height in px. Defaults to `8`. */
  height?: number;
};

/**
 * A thin horizontal meter for progress toward a known total — a savings
 * goal, an upload. Flat track on `border`, rounded fill; no built-in text,
 * since the caller always has better words for the numbers than a bare
 * percentage.
 */
export default function ProgressBar({
  value,
  max = 100,
  label,
  variant = "primary",
  height = 8,
}: ProgressBarProps) {
  const theme = useTheme();
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const fill = {
    primary: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
  }[variant];

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={css`
        width: 100%;
        height: ${height}px;
        border-radius: ${theme.radius.full};
        background: ${theme.colors.border};
        overflow: hidden;
      `}
    >
      <div
        className={css`
          height: 100%;
          border-radius: ${theme.radius.full};
          background: ${fill};
          transition: width 0.3s ease;
        `}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

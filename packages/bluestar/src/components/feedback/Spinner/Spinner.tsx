import { css, keyframes } from "goober";
import { useTheme } from "../../../theme";

type SpinnerProps = {
  /** Diameter of the spinner in pixels. */
  size?: number;
  /** Spinner color. Defaults to `theme.colors.primary`. */
  color?: string;
};

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export default function Spinner({ size = 20, color }: SpinnerProps) {
  const theme = useTheme();
  const spinnerColor = color ?? theme.colors.primary;

  return (
    <span
      className={css`
        display: inline-block;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 2px solid transparent;
        border-top-color: ${spinnerColor};
        border-right-color: ${spinnerColor};
        animation: ${spin} 0.6s linear infinite;
        flex-shrink: 0;
      `}
    />
  );
}

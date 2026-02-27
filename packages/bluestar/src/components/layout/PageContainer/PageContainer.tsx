import { css } from "goober";
import type { Spacing } from "../../../theme";

export type PageContainerProps = {
  /** The page content. */
  children: React.ReactNode;
  /**
   * Maximum width of the content area in pixels. Defaults to `1200`.
   * Pass `"full"` to remove the max-width constraint.
   */
  maxWidth?: number | "full";
  /** Horizontal and vertical padding inside the container. Defaults to `24`. */
  padding?: Spacing;
};

export default function PageContainer({
  children,
  maxWidth = 1200,
  padding = 24,
}: PageContainerProps) {
  const maxWidthValue = maxWidth === "full" ? "none" : `${maxWidth}px`;

  return (
    <div
      className={css`
        max-width: ${maxWidthValue};
        margin: 0 auto;
        padding: ${padding}px;
        width: 100%;
        box-sizing: border-box;
      `}
    >
      {children}
    </div>
  );
}

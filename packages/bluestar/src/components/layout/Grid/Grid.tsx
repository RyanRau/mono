import type { ReactNode } from "react";
import type { Spacing } from "../../../theme";

export type GridProps = {
  children: ReactNode;
  /** Narrowest a column may get before the grid drops to fewer columns. */
  minColumnWidth: number;
  gap?: Spacing;
};

/**
 * Equal-width columns that reflow on their own — as many `minColumnWidth`
 * columns as fit, stretched to fill the row, down to one on a phone. For a
 * set of same-kind tiles or cards (stat tiles, a card per item); use
 * `Flexbox` for a single row or column of unlike things.
 */
export default function Grid({ children, minColumnWidth, gap = 16 }: GridProps) {
  return (
    <div
      style={{
        display: "grid",
        // min(100%, …) keeps one column from overflowing a container
        // narrower than minColumnWidth.
        gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minColumnWidth}px), 1fr))`,
        gap,
      }}
    >
      {children}
    </div>
  );
}

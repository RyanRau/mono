import React, { useMemo } from "react";

type Props = {
  children: React.ReactNode;
  direction?: "row" | "column";
  gap?: 8 | 12 | 16 | 20 | 24;
  grow?: number;
  shrink?: number;
  flexWrap?: "wrap" | "nowrap";
  justifyContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "space-around"
    | "space-evenly";
  alignContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "stretch"
    | "space-between"
    | "space-around";
  alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
  width?: number | string,
  height?: number | string,
  style?: object;
}

export default function Flexbox(
{
  children,
  direction = "row",
  grow,
  shrink,
  gap,
  flexWrap,
  justifyContent,
  alignContent,
  alignItems,
  width,
  height,
  style,
}: Props
): React.ReactElement {
  const styles = useMemo(() => {
    return {
      flexBox: {
        display: "flex",
        flexDirection: direction,
        flexGrow: grow,
        flexShrink: shrink,
        gap,
        flexWrap,
        justifyContent,
        alignContent,
        alignItems,
        width,
        height,
        ...style,
      },
    };
  }, [alignContent, alignItems, direction, flexWrap, gap, grow, height, justifyContent, shrink, style, width]);

  return <div style={styles.flexBox}>{children}</div>;
}
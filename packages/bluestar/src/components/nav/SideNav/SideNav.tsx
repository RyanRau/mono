import { css } from "goober";
import { useState } from "react";
import { useTheme } from "../../../theme";
import Text from "../../text/Text/Text";
import Header from "../../text/Header/Header";
import Flexbox from "../../layout/Flexbox/Flexbox";
import type { NavItem } from "../types";

export type SideNavProps = {
  /** The nav items to display. */
  items: NavItem[];
  /** Optional brand name rendered at the top as an h3 heading. */
  brand?: string;
  /** Width in pixels. Defaults to `240`. */
  width?: number;
};

function SideNavItem({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const indent = 12 + depth * 16;

  return (
    <Flexbox direction="column">
      <a
        href={hasChildren ? undefined : item.href}
        onClick={(e) => {
          if (hasChildren) {
            e.preventDefault();
            setExpanded((v) => !v);
          } else if (item.onClick) {
            e.preventDefault();
            item.onClick();
          }
        }}
        className={css`
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px 8px ${indent}px;
          text-decoration: none;
          cursor: pointer;
          border-radius: ${theme.radius};
          background-color: ${item.isActive ? theme.colors.secondary : "transparent"};
          transition: background-color 0.15s ease;
          &:hover {
            background-color: ${theme.colors.secondary};
          }
        `}
      >
        <Text variant={depth === 0 ? "navItem" : "body"} color={item.isActive ? theme.colors.primary : theme.colors.text}>
          {item.label}
        </Text>
        {hasChildren && (
          <span
            className={css`
              display: inline-block;
              width: 0;
              height: 0;
              border-left: 4px solid transparent;
              border-right: 4px solid transparent;
              border-top: 4px solid ${theme.colors.textMuted};
              transform: ${expanded ? "rotate(180deg)" : "rotate(0deg)"};
              transition: transform 0.15s ease;
              flex-shrink: 0;
            `}
          />
        )}
      </a>
      {hasChildren && expanded && (
        <Flexbox direction="column">
          {item.children!.map((child, i) => (
            <SideNavItem key={i} item={child} depth={depth + 1} />
          ))}
        </Flexbox>
      )}
    </Flexbox>
  );
}

export default function SideNav({ items, brand, width = 240 }: SideNavProps) {
  const theme = useTheme();

  return (
    <nav
      className={css`
        width: ${width}px;
        height: 100%;
        background-color: ${theme.colors.surface};
        border-right: 1px solid ${theme.colors.border};
        display: flex;
        flex-direction: column;
        overflow-y: auto;
      `}
    >
      {brand && (
        <div
          className={css`
            padding: 16px 12px;
            border-bottom: 1px solid ${theme.colors.border};
            flex-shrink: 0;
          `}
        >
          <Header variant="h3">{brand}</Header>
        </div>
      )}
      <Flexbox direction="column" style={{ padding: "8px", gap: "2px" }}>
        {items.map((item, i) => (
          <SideNavItem key={i} item={item} />
        ))}
      </Flexbox>
    </nav>
  );
}

import { css } from "goober";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "../../../theme";
import Text from "../../text/Text/Text";
import Header from "../../text/Header/Header";
import Flexbox from "../../layout/Flexbox/Flexbox";
import type { NavItem } from "../types";

export type NavBarProps = {
  /** The nav items to display. */
  items: NavItem[];
  /** Optional brand name rendered on the left as an h3 heading. */
  brand?: string;
  /** Optional content rendered on the right (e.g. user avatar, actions). */
  trailing?: React.ReactNode;
};

function NavDropdown({ items, onClose }: { items: NavItem[]; onClose: () => void }) {
  const theme = useTheme();

  return (
    <div
      className={css`
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        min-width: 160px;
        background-color: ${theme.colors.surface};
        border: 1px solid ${theme.colors.border};
        border-radius: ${theme.radius};
        box-shadow: ${theme.shadow};
        z-index: 100;
        overflow: hidden;
      `}
    >
      {items.map((item, i) => (
        <a
          key={i}
          href={item.href}
          onClick={(e) => {
            if (item.onClick) {
              e.preventDefault();
              item.onClick();
            }
            onClose();
          }}
          className={css`
            display: block;
            padding: 8px 12px;
            text-decoration: none;
            background-color: ${item.isActive ? theme.colors.secondary : "transparent"};
            cursor: pointer;
            transition: background-color 0.15s ease;
            &:hover {
              background-color: ${theme.colors.secondary};
            }
          `}
        >
          <Text variant="body" color={item.isActive ? theme.colors.primary : theme.colors.text}>
            {item.label}
          </Text>
        </a>
      ))}
    </div>
  );
}

function TopNavItem({ item }: { item: NavItem }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasChildren = item.children && item.children.length > 0;

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  return (
    <div
      ref={ref}
      className={css`
        position: relative;
      `}
    >
      <a
        href={hasChildren ? undefined : item.href}
        onClick={(e) => {
          if (hasChildren) {
            e.preventDefault();
            setOpen((v) => !v);
          } else if (item.onClick) {
            e.preventDefault();
            item.onClick();
          }
        }}
        className={css`
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-radius: ${theme.radius};
          text-decoration: none;
          cursor: pointer;
          background-color: ${item.isActive ? theme.colors.secondary : "transparent"};
          transition: background-color 0.15s ease;
          white-space: nowrap;
          &:hover {
            background-color: ${theme.colors.secondary};
          }
        `}
      >
        <Text variant="navItem" color={item.isActive ? theme.colors.primary : theme.colors.text}>
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
              transform: ${open ? "rotate(180deg)" : "rotate(0deg)"};
              transition: transform 0.15s ease;
              margin-top: 2px;
              flex-shrink: 0;
            `}
          />
        )}
      </a>
      {hasChildren && open && (
        <NavDropdown items={item.children!} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

export default function NavBar({ items, brand, trailing }: NavBarProps) {
  const theme = useTheme();

  return (
    <nav
      className={css`
        display: flex;
        align-items: center;
        padding: 0 16px;
        height: 52px;
        background-color: ${theme.colors.surface};
        border-bottom: 1px solid ${theme.colors.border};
        box-shadow: ${theme.shadow};
      `}
    >
      {brand && (
        <Flexbox shrink={0} style={{ marginRight: "16px" }}>
          <Header variant="h3">{brand}</Header>
        </Flexbox>
      )}
      <Flexbox grow={1} alignItems="center" gap={4}>
        {items.map((item, i) => (
          <TopNavItem key={i} item={item} />
        ))}
      </Flexbox>
      {trailing && (
        <Flexbox shrink={0} style={{ marginLeft: "16px" }}>
          {trailing}
        </Flexbox>
      )}
    </nav>
  );
}

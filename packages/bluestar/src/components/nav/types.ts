export type NavItem = {
  /** Display label for the nav item */
  label: string;
  /** Optional href for link navigation */
  href?: string;
  /** Optional click handler (used when href is not appropriate) */
  onClick?: () => void;
  /** Whether this item is currently active/selected */
  isActive?: boolean;
  /** Optional nested sub-items (collapsible) */
  children?: NavItem[];
};

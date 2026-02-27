import type { Meta, StoryObj } from "@storybook/react";
import SideNav from "./SideNav";

const meta = {
  title: "Nav/SideNav",
  component: SideNav,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A vertical sidebar navigation. Items with `children` expand and collapse in-place with indentation. Supports an optional `brand` header and configurable `width`.",
      },
    },
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ height: "400px", display: "flex" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SideNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      { label: "Dashboard", href: "/", isActive: true },
      { label: "Projects", href: "/projects" },
      { label: "Team", href: "/team" },
      { label: "Settings", href: "/settings" },
    ],
  },
  parameters: {
    docs: { description: { story: "Simple sidebar with flat items and one active." } },
  },
};

export const WithBrand: Story = {
  args: {
    brand: "MyApp",
    items: [
      { label: "Dashboard", href: "/", isActive: true },
      { label: "Projects", href: "/projects" },
      { label: "Team", href: "/team" },
    ],
  },
  parameters: {
    docs: { description: { story: "Brand content pinned to the top above the item list." } },
  },
};

export const WithSubItems: Story = {
  args: {
    brand: "MyApp",
    items: [
      { label: "Dashboard", href: "/", isActive: true },
      {
        label: "Projects",
        children: [
          { label: "All Projects", href: "/projects" },
          { label: "Archived", href: "/projects/archived" },
        ],
      },
      {
        label: "Settings",
        children: [
          { label: "Profile", href: "/settings/profile" },
          { label: "Security", href: "/settings/security" },
          { label: "Billing", href: "/settings/billing" },
        ],
      },
      { label: "Help", href: "/help" },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          "Items with `children` show a chevron. Click to expand — sub-items appear with indentation. Click again to collapse.",
      },
    },
  },
};

export const NestedSubItems: Story = {
  args: {
    brand: "Docs",
    items: [
      { label: "Introduction", href: "/docs", isActive: true },
      {
        label: "Components",
        children: [
          { label: "Buttons", href: "/docs/buttons" },
          {
            label: "Forms",
            children: [
              { label: "TextInput", href: "/docs/forms/text-input" },
              { label: "Dropdown", href: "/docs/forms/dropdown" },
              { label: "Checkbox", href: "/docs/forms/checkbox" },
            ],
          },
          { label: "Layout", href: "/docs/layout" },
        ],
      },
      { label: "Theming", href: "/docs/theming" },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: "Sub-items can themselves have children for multi-level nesting.",
      },
    },
  },
};

export const NarrowWidth: Story = {
  args: {
    width: 180,
    items: [
      { label: "Home", href: "/", isActive: true },
      { label: "Projects", href: "/projects" },
      {
        label: "More",
        children: [
          { label: "About", href: "/about" },
          { label: "Contact", href: "/contact" },
        ],
      },
    ],
  },
  parameters: {
    docs: { description: { story: "Width set to `180` for a compact sidebar." } },
  },
};

import type { Meta, StoryObj } from "@storybook/react";
import NavBar from "./NavBar";

const meta = {
  title: "Nav/NavBar",
  component: NavBar,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A horizontal top navigation bar. Items with `children` render a click-triggered dropdown. Supports optional `brand` content on the left and `trailing` content on the right.",
      },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof NavBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      { label: "Home", href: "/", isActive: true },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  parameters: {
    docs: { description: { story: "Simple nav with flat items and one active." } },
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
    docs: { description: { story: "Brand content pinned to the left." } },
  },
};

export const WithDropdown: Story = {
  args: {
    items: [
      { label: "Home", href: "/", isActive: true },
      {
        label: "Products",
        children: [
          { label: "Overview", href: "/products" },
          { label: "Pricing", href: "/pricing" },
          { label: "Changelog", href: "/changelog" },
        ],
      },
      {
        label: "Company",
        children: [
          { label: "About", href: "/about" },
          { label: "Blog", href: "/blog" },
          { label: "Careers", href: "/careers" },
        ],
      },
      { label: "Contact", href: "/contact" },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: "Items with `children` show a dropdown on click. Click outside to dismiss.",
      },
    },
  },
};

export const WithTrailing: Story = {
  args: {
    brand: "MyApp",
    items: [
      { label: "Dashboard", href: "/", isActive: true },
      { label: "Projects", href: "/projects" },
      {
        label: "Settings",
        children: [
          { label: "Profile", href: "/settings/profile" },
          { label: "Security", href: "/settings/security" },
          { label: "Billing", href: "/settings/billing" },
        ],
      },
    ],
    trailing: (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "13px", color: "#718096" }}>user@example.com</span>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "Full bar with brand, dropdown item, and trailing user info.",
      },
    },
  },
};

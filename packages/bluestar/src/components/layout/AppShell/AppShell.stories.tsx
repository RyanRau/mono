import type { Meta, StoryObj } from "@storybook/react";
import AppShell from "./AppShell";
import NavBar from "../../nav/NavBar/NavBar";
import SideNav from "../../nav/SideNav/SideNav";
import PageContainer from "../PageContainer/PageContainer";
import Flexbox from "../Flexbox/Flexbox";
import Card from "../Card/Card";
import Header from "../../text/Header/Header";
import Text from "../../text/Text/Text";

const meta = {
  title: "Layout/AppShell",
  component: AppShell,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Full-page layout shell. Composes a sticky top nav, an optional sidebar, and a scrollable main content area. Fills `100vh`.",
      },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", isActive: true },
  { label: "Projects", href: "/projects" },
  { label: "Team", href: "/team" },
];

const SIDE_ITEMS = [
  { label: "Dashboard", href: "/", isActive: true },
  {
    label: "Projects",
    children: [
      { label: "All Projects", href: "/projects" },
      { label: "Archived", href: "/projects/archived" },
    ],
  },
  { label: "Team", href: "/team" },
  { label: "Settings", href: "/settings" },
];

const SampleContent = () => (
  <PageContainer>
    <Flexbox direction="column" gap={16}>
      <Header variant="h2">Dashboard</Header>
      <Text variant="subtitle">Welcome back. Here's what's happening.</Text>
      <Flexbox gap={16} flexWrap="wrap">
        {["Overview", "Analytics", "Reports"].map((title) => (
          <Flexbox key={title} grow={1} style={{ minWidth: "200px" }}>
            <Card>
              <Header variant="h3">{title}</Header>
              <Text variant="body">Sample content for the {title} card.</Text>
            </Card>
          </Flexbox>
        ))}
      </Flexbox>
    </Flexbox>
  </PageContainer>
);

export const WithTopNav: Story = {
  args: {
    topNav: <NavBar brand="MyApp" items={NAV_ITEMS} />,
    children: <SampleContent />,
  },
  parameters: {
    docs: { description: { story: "Top nav only — no sidebar." } },
  },
};

export const WithSideNav: Story = {
  args: {
    sideNav: <SideNav brand="MyApp" items={SIDE_ITEMS} />,
    children: <SampleContent />,
  },
  parameters: {
    docs: { description: { story: "Sidebar only — no top nav." } },
  },
};

export const WithBoth: Story = {
  args: {
    topNav: <NavBar brand="MyApp" items={NAV_ITEMS} />,
    sideNav: <SideNav items={SIDE_ITEMS} />,
    children: <SampleContent />,
  },
  parameters: {
    docs: {
      description: {
        story: "Full app shell: sticky top nav + collapsible sidebar + scrollable main content.",
      },
    },
  },
};

export const ContentOnly: Story = {
  args: {
    children: <SampleContent />,
  },
  parameters: {
    docs: {
      description: { story: "Shell with no nav — just the background and main content area." },
    },
  },
};

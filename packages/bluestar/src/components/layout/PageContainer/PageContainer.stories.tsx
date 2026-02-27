import type { Meta, StoryObj } from "@storybook/react";
import PageContainer from "./PageContainer";
import Card from "../Card/Card";
import Header from "../../text/Header/Header";
import Text from "../../text/Text/Text";

const meta = {
  title: "Layout/PageContainer",
  component: PageContainer,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A centered, max-width constrained content wrapper. Use inside `AppShell` or any scrollable area to keep content readable at wide viewports.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ background: "#e2e8f0", minHeight: "200px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PageContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

const SampleContent = () => (
  <Card>
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <Header variant="h3">Page Title</Header>
      <Text variant="body">Content constrained to the container's max-width.</Text>
    </div>
  </Card>
);

export const Default: Story = {
  args: { children: <SampleContent /> },
  parameters: {
    docs: { description: { story: "Default: `maxWidth=1200`, `padding=24`." } },
  },
};

export const NarrowWidth: Story = {
  args: { maxWidth: 640, children: <SampleContent /> },
  parameters: {
    docs: { description: { story: "Narrow container suited for forms or article text." } },
  },
};

export const SmallPadding: Story = {
  args: { padding: 8, children: <SampleContent /> },
  parameters: {
    docs: { description: { story: "Reduced padding of `8px`." } },
  },
};

export const FullWidth: Story = {
  args: { maxWidth: "full", children: <SampleContent /> },
  parameters: {
    docs: { description: { story: "No max-width — content stretches to fill its parent." } },
  },
};

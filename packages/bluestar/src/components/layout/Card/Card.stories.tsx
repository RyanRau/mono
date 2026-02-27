import type { Meta, StoryObj } from "@storybook/react";
import Card from "./Card";
import Header from "../../text/Header/Header";
import Text from "../../text/Text/Text";

const meta = {
  title: "Layout/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A surface container with a themed background, border, corner radius, and shadow. Use it to visually group related content.",
      },
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <Header variant="h3">Card Title</Header>
        <Text variant="caption">This is some supporting text inside the card.</Text>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: { story: "Default card using `16` padding and the theme shadow." },
    },
  },
};

export const NoShadow: Story = {
  args: {
    shadow: "none",
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <Header variant="h3">Flat Card</Header>
        <Text variant="caption">A card without a shadow — relies on the border alone.</Text>
      </div>
    ),
  },
  parameters: {
    docs: { description: { story: "Shadow removed; border provides the boundary." } },
  },
};

export const LargePadding: Story = {
  args: {
    padding: 32,
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <Header variant="h3">Spacious Card</Header>
        <Text variant="caption">Extra internal padding of 32px.</Text>
      </div>
    ),
  },
  parameters: {
    docs: { description: { story: "Padding set to `32` (32px)." } },
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import Card from "./Card";
import { H3 } from "../Header";
import { Text } from "../Text";

const meta = {
  title: "Bluestar/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    padding: {
      control: "select",
      options: ["none", "sm", "md", "lg", "xl"],
    },
    elevation: {
      control: "select",
      options: ["none", "sm", "md", "lg", "xl"],
    },
    variant: {
      control: "select",
      options: ["default", "outlined"],
    },
    borderRadius: {
      control: "select",
      options: ["none", "sm", "md", "lg"],
    },
    hoverable: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div>
        <H3 marginBottom="sm">Card Title</H3>
        <Text>This is a default card with medium padding and small elevation.</Text>
      </div>
    ),
  },
};

export const Outlined: Story = {
  args: {
    variant: "outlined",
    children: (
      <div>
        <H3 marginBottom="sm">Outlined Card</H3>
        <Text>This card has an outline border instead of a shadow.</Text>
      </div>
    ),
  },
};

export const LargePadding: Story = {
  args: {
    padding: "xl",
    elevation: "md",
    children: (
      <div>
        <H3 marginBottom="sm">Large Padding</H3>
        <Text>This card has extra large padding for spacious content.</Text>
      </div>
    ),
  },
};

export const HighElevation: Story = {
  args: {
    elevation: "xl",
    children: (
      <div>
        <H3 marginBottom="sm">High Elevation</H3>
        <Text>This card has a large shadow to appear elevated above the page.</Text>
      </div>
    ),
  },
};

export const Hoverable: Story = {
  args: {
    hoverable: true,
    children: (
      <div>
        <H3 marginBottom="sm">Hoverable Card</H3>
        <Text>Hover over this card to see the interactive effect.</Text>
      </div>
    ),
  },
};

export const NoPadding: Story = {
  args: {
    padding: "none",
    elevation: "md",
    children: (
      <div style={{ padding: "16px" }}>
        <H3 marginBottom="sm">No Padding</H3>
        <Text>This card has no default padding (custom padding applied via div).</Text>
      </div>
    ),
  },
};

export const ProductCard: Story = {
  args: {
    hoverable: true,
    padding: "lg",
    elevation: "sm",
    children: (
      <div style={{ width: "250px" }}>
        <div
          style={{
            width: "100%",
            height: "150px",
            backgroundColor: "#e2e8f0",
            borderRadius: "8px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text color="secondary">Image Placeholder</Text>
        </div>
        <H3 marginBottom="xs">Product Name</H3>
        <Text variant="bodySmall" color="secondary" as="p" style={{ marginBottom: "8px" }}>
          Short product description goes here.
        </Text>
        <Text weight="bold" as="div" style={{ fontSize: "1.25rem" }}>
          $49.99
        </Text>
      </div>
    ),
  },
};

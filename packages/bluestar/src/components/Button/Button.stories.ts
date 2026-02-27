import type { Meta, StoryObj } from "@storybook/react";
import Button from "./Button";

const meta = {
  title: "Components/Button",
  component: Button,
  argTypes: {
    onClick: { action: "clicked" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Button",
  },
};

export const LongLabel: Story = {
  args: {
    label: "Click me to do something",
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";

import Button from "./Button";

const meta = {
  title: "Bluestar/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    label: "Primary Button",
    variant: "primary",
    onClick: () => console.log('clicked'),
  },
};

export const Secondary: Story = {
  args: {
    label: "Secondary Button",
    variant: "secondary",
    onClick: () => console.log('clicked'),
  },
};

export const Disabled: Story = {
  args: {
    label: "Disabled Button",
    variant: "primary",
    disabled: true,
    onClick: () => console.log('clicked'),
  },
};

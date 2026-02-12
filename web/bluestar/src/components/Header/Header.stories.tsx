import type { Meta, StoryObj } from "@storybook/react-vite";
import Header, { H1, H2, H3, H4, H5, H6 } from "./Header";

const meta = {
  title: "Bluestar/Header",
  component: Header,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    level: {
      control: 'select',
      options: [1, 2, 3, 4, 5, 6],
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'disabled', 'inverse'],
    },
    weight: {
      control: 'select',
      options: ['light', 'normal', 'medium', 'semibold', 'bold'],
    },
    align: {
      control: 'select',
      options: ['left', 'center', 'right'],
    },
    marginBottom: {
      control: 'select',
      options: ['none', 'xs', 'sm', 'md', 'lg', 'xl'],
    },
  },
} satisfies Meta<typeof Header>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Heading1: Story = {
  args: {
    level: 1,
    children: "Heading 1 - Main Title",
  },
};

export const Heading2: Story = {
  args: {
    level: 2,
    children: "Heading 2 - Section Title",
  },
};

export const Heading3: Story = {
  args: {
    level: 3,
    children: "Heading 3 - Subsection",
  },
};

export const Heading4: Story = {
  args: {
    level: 4,
    children: "Heading 4 - Minor Section",
  },
};

export const Heading5: Story = {
  args: {
    level: 5,
    children: "Heading 5 - Small Heading",
  },
};

export const Heading6: Story = {
  args: {
    level: 6,
    children: "Heading 6 - Smallest Heading",
  },
};

export const SecondaryColor: Story = {
  args: {
    level: 2,
    color: "secondary",
    children: "Secondary Color Heading",
  },
};

export const CustomWeight: Story = {
  args: {
    level: 2,
    weight: "medium",
    children: "Medium Weight Heading",
  },
};

export const Centered: Story = {
  args: {
    level: 2,
    align: "center",
    children: "Centered Heading",
  },
};

// Showcase all heading levels together
export const AllLevels = () => (
  <div style={{ padding: '20px' }}>
    <H1>Heading 1 - Main Title</H1>
    <H2>Heading 2 - Section Title</H2>
    <H3>Heading 3 - Subsection</H3>
    <H4>Heading 4 - Minor Section</H4>
    <H5>Heading 5 - Small Heading</H5>
    <H6>Heading 6 - Smallest Heading</H6>
  </div>
);

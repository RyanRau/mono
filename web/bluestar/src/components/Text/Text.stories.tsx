import type { Meta, StoryObj } from "@storybook/react-vite";
import Text from "./Text";

const meta = {
  title: "Bluestar/Text",
  component: Text,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["body", "bodyLarge", "bodySmall", "caption", "overline"],
    },
    color: {
      control: "select",
      options: ["primary", "secondary", "disabled", "inverse"],
    },
    weight: {
      control: "select",
      options: ["light", "normal", "medium", "semibold", "bold"],
    },
    align: {
      control: "select",
      options: ["left", "center", "right"],
    },
    as: {
      control: "select",
      options: ["span", "p", "div"],
    },
  },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Body: Story = {
  args: {
    children: "This is body text in the default variant.",
    variant: "body",
  },
};

export const BodyLarge: Story = {
  args: {
    children: "This is large body text for emphasis.",
    variant: "bodyLarge",
  },
};

export const BodySmall: Story = {
  args: {
    children: "This is small body text for less important content.",
    variant: "bodySmall",
  },
};

export const Caption: Story = {
  args: {
    children: "This is caption text for image captions or small notes.",
    variant: "caption",
    color: "secondary",
  },
};

export const Overline: Story = {
  args: {
    children: "Overline text",
    variant: "overline",
    color: "secondary",
  },
};

export const Semibold: Story = {
  args: {
    children: "This is semibold text for moderate emphasis.",
    weight: "semibold",
  },
};

export const Bold: Story = {
  args: {
    children: "This is bold text for strong emphasis.",
    weight: "bold",
  },
};

export const SecondaryColor: Story = {
  args: {
    children: "This text uses the secondary color.",
    color: "secondary",
  },
};

export const Paragraph: Story = {
  args: {
    children: "This is a paragraph of text. It uses the 'p' HTML element instead of 'span'.",
    as: "p",
    variant: "body",
  },
};

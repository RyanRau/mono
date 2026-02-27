import type { Meta, StoryObj } from "@storybook/react";
import TextPairing from "./TextPairing";

const meta = {
  title: "Text/TextPairing",
  component: TextPairing,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Combines a `Header` title and `Text` subtitle in a vertical stack. Useful for section headings, card headers, and page titles.",
      },
    },
  },
} satisfies Meta<typeof TextPairing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Section Title",
    subtitle: "Supporting subtitle text that provides additional context.",
  },
  parameters: {
    docs: { description: { story: "Default — h2 title with caption subtitle." } },
  },
};

export const LargeHeading: Story = {
  args: {
    title: "Page Heading",
    subtitle: "A prominent heading using the h1 variant.",
    titleVariant: "h1",
    subtitleVariant: "body",
  },
  parameters: {
    docs: { description: { story: "h1 title with body-size subtitle." } },
  },
};

export const SmallHeading: Story = {
  args: {
    title: "Card Title",
    subtitle: "Compact heading for cards or list items.",
    titleVariant: "h3",
    subtitleVariant: "caption",
  },
  parameters: {
    docs: { description: { story: "h3 title with caption subtitle." } },
  },
};

import type { Meta, StoryObj } from "@storybook/react";
import PhotoDisplay from "./PhotoDisplay";

const SAMPLE_URL = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800";

const meta = {
  title: "Media/PhotoDisplay",
  component: PhotoDisplay,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Displays a photo from a URL inside a fixed aspect-ratio container. A spinner is shown while the image loads. Supports an optional `onClick` handler for interactive galleries.",
      },
    },
  },
} satisfies Meta<typeof PhotoDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    url: SAMPLE_URL,
    alt: "Mountain landscape",
  },
  parameters: {
    docs: {
      description: { story: "Default square (1/1) aspect ratio." },
    },
  },
};

export const Widescreen: Story = {
  args: {
    url: SAMPLE_URL,
    alt: "Mountain landscape",
    aspectRatio: "16/9",
  },
  parameters: {
    docs: {
      description: { story: "16:9 widescreen aspect ratio." },
    },
  },
};

export const Portrait: Story = {
  args: {
    url: SAMPLE_URL,
    alt: "Mountain landscape",
    aspectRatio: "2/3",
  },
  parameters: {
    docs: {
      description: { story: "2:3 portrait aspect ratio." },
    },
  },
};

export const Clickable: Story = {
  args: {
    url: SAMPLE_URL,
    alt: "Mountain landscape",
    aspectRatio: "4/3",
    onClick: () => alert("Photo clicked"),
  },
  parameters: {
    docs: {
      description: {
        story: "With an `onClick` handler — hover shows a shadow and cursor becomes a pointer.",
      },
    },
  },
};

export const BrokenUrl: Story = {
  args: {
    url: "https://example.com/does-not-exist.jpg",
    alt: "A broken image",
  },
  parameters: {
    docs: {
      description: { story: "Error state when the image URL cannot be loaded." },
    },
  },
};

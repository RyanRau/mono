import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import MediaTile from "./MediaTile";
import Badge from "../Badge/Badge";

const meta = {
  title: "Display/MediaTile",
  component: MediaTile,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "One square, clickable tile in a media grid -- a photo, a file, a folder -- with an icon fallback.",
      },
    },
  },
} satisfies Meta<typeof MediaTile>;

export default meta;
type Story = StoryObj<typeof MediaTile>;

// Inline SVGs so the story needs no network.
const photo = (hue: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="hsl(${hue},60%,55%)"/><circle cx="300" cy="80" r="40" fill="hsl(${hue},80%,85%)"/></svg>`
  )}`;

function Demo() {
  const [selected, setSelected] = useState("beach.jpg");
  const items = [
    { title: "2024", icon: "folder" as const },
    { title: "beach.jpg", subtitle: "2.4 MB", src: photo(200) },
    { title: "sunset-over-the-ridge-long-name.heic", subtitle: "3.1 MB", src: photo(20) },
    {
      title: "garden.jpg",
      subtitle: "1.2 MB",
      src: photo(120),
      badge: (
        <Badge variant="primary" emphasis="solid">
          Public
        </Badge>
      ),
    },
    { title: "notes.pdf", subtitle: "88 KB", icon: "docs" as const },
    { title: "broken.jpg", subtitle: "Failed to load", src: "/does-not-exist.jpg" },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 8,
        maxWidth: 720,
      }}
    >
      {items.map((item) => (
        <MediaTile
          key={item.title}
          {...item}
          selected={selected === item.title}
          onClick={() => setSelected(item.title)}
        />
      ))}
    </div>
  );
}

export const Grid: Story = {
  render: () => <Demo />,
};

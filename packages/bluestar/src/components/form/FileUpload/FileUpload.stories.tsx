import type { Meta, StoryObj } from "@storybook/react";
import FileUpload from "./FileUpload";

const meta = {
  title: "Forms/FileUpload",
  component: FileUpload,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A drag-and-drop file upload zone. Supports single or multiple files and MIME-type / extension filtering via the `accept` prop.",
      },
    },
  },
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onFiles: (files) => alert(files.map((f) => f.name).join(", ")),
  },
  parameters: {
    docs: {
      description: { story: "Single file, all types accepted." },
    },
  },
};

export const MultipleFiles: Story = {
  args: {
    onFiles: (files) => alert(`${files.length} file(s) selected`),
    multiple: true,
  },
  parameters: {
    docs: {
      description: { story: "Allows selecting or dropping multiple files at once." },
    },
  },
};

export const ImagesOnly: Story = {
  args: {
    onFiles: (files) => alert(files.map((f) => f.name).join(", ")),
    accept: "image/*",
    multiple: true,
    label: "Drop images here, or click to browse",
  },
  parameters: {
    docs: {
      description: { story: "Restricts the file picker to image types." },
    },
  },
};

export const Disabled: Story = {
  args: {
    onFiles: () => {},
    isDisabled: true,
  },
  parameters: {
    docs: {
      description: { story: "Disabled state — interaction is blocked." },
    },
  },
};

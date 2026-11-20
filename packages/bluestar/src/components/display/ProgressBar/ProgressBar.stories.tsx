import type { Meta, StoryObj } from "@storybook/react";
import ProgressBar from "./ProgressBar";
import Flexbox from "../../layout/Flexbox/Flexbox";

const meta = {
  title: "Display/ProgressBar",
  component: ProgressBar,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "A thin meter for progress toward a known total, such as a savings goal.",
      },
    },
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Default: Story = {
  args: { value: 1250, max: 4000, label: "Vacation goal" },
};

export const Variants: Story = {
  render: () => (
    <Flexbox direction="column" gap={16} width={320}>
      <ProgressBar value={30} label="Primary" />
      <ProgressBar value={100} variant="success" label="Success" />
      <ProgressBar value={70} variant="warning" label="Warning" />
      <ProgressBar value={90} variant="error" label="Error" height={4} />
    </Flexbox>
  ),
};

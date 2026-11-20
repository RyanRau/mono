import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import DateInput from "./DateInput";

const meta = {
  title: "Forms/DateInput",
  component: DateInput,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Calendar-date field on the native date picker. The value is a "YYYY-MM-DD" string, never a Date.',
      },
    },
  },
} satisfies Meta<typeof DateInput>;

export default meta;
type Story = StoryObj<typeof DateInput>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("2026-11-20");
    return (
      <DateInput
        label="Payday"
        description="Any past payday — the schedule repeats from it."
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const Empty: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return <DateInput label="Date" value={value} onChange={setValue} required />;
  },
};

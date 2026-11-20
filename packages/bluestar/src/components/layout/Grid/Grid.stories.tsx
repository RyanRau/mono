import type { Meta, StoryObj } from "@storybook/react";
import Grid from "./Grid";
import StatTile from "../../display/StatTile/StatTile";

const meta = {
  title: "Layout/Grid",
  component: Grid,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Equal-width columns that reflow to fit: as many minColumnWidth columns as the row holds.",
      },
    },
  },
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof Grid>;

export const Tiles: Story = {
  render: () => (
    <Grid minColumnWidth={200}>
      <StatTile label="Total saved" value="$12,480" />
      <StatTile label="Next payday" value="+$400" />
      <StatTile label="Projected in 12 months" value="$22,880" />
      <StatTile label="Buckets" value="5" />
    </Grid>
  ),
};

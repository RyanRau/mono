import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import Flexbox from "./Flexbox";

const meta = {
  title: "Components/Flexbox",
  component: Flexbox,
} satisfies Meta<typeof Flexbox>;

export default meta;
type Story = StoryObj<typeof meta>;

const Box = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    "div",
    {
      style: {
        padding: "16px 24px",
        background: "#7da7d9",
        color: "#fff",
        borderRadius: "4px",
      },
    },
    children
  );

export const Row: Story = {
  args: {
    direction: "row",
    gap: 16,
  },
  render: (args) =>
    React.createElement(Flexbox, args, [
      React.createElement(Box, { key: "1" }, "One"),
      React.createElement(Box, { key: "2" }, "Two"),
      React.createElement(Box, { key: "3" }, "Three"),
    ]),
};

export const Column: Story = {
  args: {
    direction: "column",
    gap: 12,
  },
  render: (args) =>
    React.createElement(Flexbox, args, [
      React.createElement(Box, { key: "1" }, "One"),
      React.createElement(Box, { key: "2" }, "Two"),
      React.createElement(Box, { key: "3" }, "Three"),
    ]),
};

export const SpaceBetween: Story = {
  args: {
    direction: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  render: (args) =>
    React.createElement(Flexbox, args, [
      React.createElement(Box, { key: "1" }, "Left"),
      React.createElement(Box, { key: "2" }, "Right"),
    ]),
};

export const CenterAligned: Story = {
  args: {
    direction: "row",
    gap: 16,
    alignItems: "center",
    height: 120,
  },
  render: (args) =>
    React.createElement(
      Flexbox,
      { ...args, style: { border: "1px dashed #ccc" } },
      [
        React.createElement(Box, { key: "1" }, "Short"),
        React.createElement(
          "div",
          {
            key: "2",
            style: {
              padding: "32px 24px",
              background: "#7da7d9",
              color: "#fff",
              borderRadius: "4px",
            },
          },
          "Tall"
        ),
        React.createElement(Box, { key: "3" }, "Short"),
      ]
    ),
};

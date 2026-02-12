import type { Preview } from "@storybook/react";
import { ThemeProvider, defaultTheme } from "../src/theme";
import "../src/styling";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={defaultTheme}>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default preview;

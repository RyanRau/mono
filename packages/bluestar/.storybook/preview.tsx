import type { Preview, Decorator } from "@storybook/react";
import { ThemeProvider, defaultTheme } from "../src/theme";
import "../src/styling";

const darkTheme = {
  colors: {
    ...defaultTheme.colors,
    background: "#1a202c",
    surface: "#2d3748",
    text: "#f7fafc",
    textMuted: "#a0aec0",
    border: "#4a5568",
  },
};

const themes: Record<string, object> = {
  default: {},
  dark: darkTheme,
};

const withTheme: Decorator = (Story, context) => {
  const theme = themes[context.globals["theme"] ?? "default"] ?? {};
  return (
    <div
      style={{
        padding: "16px",
        backgroundColor:
          context.globals["theme"] === "dark"
            ? darkTheme.colors.background
            : defaultTheme.colors.background,
        minHeight: "100%",
      }}
    >
      <ThemeProvider theme={theme}>
        <Story />
      </ThemeProvider>
    </div>
  );
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Global theme",
      defaultValue: "default",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "default", title: "Default" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withTheme],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;

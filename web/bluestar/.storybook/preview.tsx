import type { Preview } from "@storybook/react";
import type { ReactRenderer } from "@storybook/react";
import type { DecoratorFunction } from "@storybook/types";
import { ThemeProvider, themePresets, type ThemePresetName } from "../src/theme";
import "../src/styling";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true, // Disable default backgrounds since we're using theme backgrounds
    },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'default',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'default', title: 'Default (Blue)', icon: 'circlehollow' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
          { value: 'purple', title: 'Purple', icon: 'hearthollow' },
          { value: 'green', title: 'Green', icon: 'growmedium' },
          { value: 'warm', title: 'Warm (Orange)', icon: 'sun' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    ((Story, context) => {
      const themeName = (context.globals.theme || 'default') as ThemePresetName;
      const theme = themePresets[themeName];

      return (
        <ThemeProvider theme={theme}>
          <div
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.textPrimary,
              minHeight: '100vh',
              padding: '1rem',
              transition: 'background-color 0.3s ease, color 0.3s ease',
            }}
          >
            <Story />
          </div>
        </ThemeProvider>
      );
    }) as DecoratorFunction<ReactRenderer>,
  ],
};

export default preview;

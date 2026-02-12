import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {},
  async viteFinal(config) {
    return mergeConfig(config, {
      define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
        __DEV__: false,
      },
      resolve: {
        conditions: ['production', 'default'],
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'react/jsx-runtime'],
        esbuildOptions: {
          define: {
            global: 'globalThis',
          },
        },
      },
    });
  },
};

export default config;

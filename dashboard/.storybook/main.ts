import path from 'path'
import { nodeResolve } from '@rollup/plugin-node-resolve';
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  viteFinal: (viteConfig) => {
    viteConfig.plugins = viteConfig.plugins || []
    viteConfig.plugins.push(nodeResolve({
      moduleDirectories: ['node_modules', 'src']
    }))

    return viteConfig
  }
};
export default config;

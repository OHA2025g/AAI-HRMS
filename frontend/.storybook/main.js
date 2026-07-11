/** @type { import('@storybook/react-webpack5').StorybookConfig } */
const path = require('path');

const config = {
  stories: ['../src/features/smart-hiring/components/hiring-dashboard/**/*.stories.@(js|jsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-links'],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  staticDirs: ['../public'],
  webpackFinal: async (cfg) => {
    cfg.resolve = cfg.resolve || {};
    cfg.resolve.alias = {
      ...(cfg.resolve.alias || {}),
      '@': path.resolve(__dirname, '../src'),
    };
    return cfg;
  },
};

module.exports = config;

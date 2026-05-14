import { defineConfig } from '@tarojs/cli';

export default defineConfig({
  projectName: 'unicorn-miniapp',
  date: '2026-05-13',
  designWidth: 375,
  deviceRatio: {
    375: 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  framework: 'react',
  compiler: {
    type: 'webpack5',
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
      },
    },
  },
});

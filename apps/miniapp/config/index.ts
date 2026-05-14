import path from 'node:path';
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
  /** 与 `apps/admin` 一致：通过别名引用 workspace 契约包，避免深层相对路径。 */
  alias: {
    '@contracts': path.resolve(__dirname, '..', '..', 'packages', 'api-contracts', 'src'),
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
      },
    },
  },
});

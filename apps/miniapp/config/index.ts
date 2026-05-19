import path from 'node:path';
import { defineConfig } from '@tarojs/cli';

const dockerDev = process.env.UNICORN_DOCKER_DEV === '1';
const miniappApiProxy = process.env.MINIAPP_API_PROXY_TARGET;
const enableH5DevProxy = dockerDev || Boolean(miniappApiProxy);

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
  plugins: ['@tarojs/plugin-platform-h5'],
  /** 与 `apps/admin` 一致：通过别名引用 workspace 契约包，避免深层相对路径。 */
  alias: {
    '@contracts': path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'packages',
      'api-contracts',
      'src'
    ),
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
      },
    },
    /**
     * Taro 在 weapp webpack 配置中会注入 `@tarojs/shared: null`。
     * 显式改成 `false`，避免 webpack schema 校验把 `null` 视为非法 alias 值。
     */
    webpackChain(chain) {
      chain.resolve.alias.set('@tarojs/shared', false as unknown as string);
    },
  },
  /** tabBar 图标等纯静态资源：需显式拷贝到 `dist`，否则真机/开发者工具找不到路径。 */
  copy: {
    patterns: [{ from: 'src/assets/tab/', to: 'dist/assets/tab/' }],
    options: {},
  },
  /**
   * H5 构建：供 Docker 内编译并在网关 `/h5/` 下静态托管。
   * 使用 hash 路由，避免刷新时 nginx 需为每个路由配置 fallback。
   * 本地或 Docker 开发时，可通过 MINIAPP_API_PROXY_TARGET 将 `/api` 反代到目标 API。
   */
  h5: {
    publicPath: enableH5DevProxy ? '/' : '/h5/',
    router: {
      mode: 'hash',
    },
    ...(enableH5DevProxy
      ? {
          devServer: {
            host: dockerDev ? '0.0.0.0' : '127.0.0.1',
            port: 10086,
            hot: true,
            ...(miniappApiProxy
              ? {
                  proxy: {
                    '/api': {
                      target: miniappApiProxy,
                      changeOrigin: true,
                    },
                  },
                }
              : {}),
          },
        }
      : {}),
  },
});

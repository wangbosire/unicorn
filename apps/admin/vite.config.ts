import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dockerDev = process.env.DOCKER === '1'
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || loadEnv('', __dirname, '').VITE_API_PROXY_TARGET

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@contracts': path.resolve(__dirname, '../../packages/api-contracts/src'),
    },
  },
  /** 本地或 Docker 开发：可通过 VITE_API_PROXY_TARGET 将 /api 反代到目标 API。 */
  ...(dockerDev || apiProxyTarget
    ? {
        server: {
          host: dockerDev ? '0.0.0.0' : '127.0.0.1',
          port: 5173,
          strictPort: true,
          ...(dockerDev ? { watch: { usePolling: true } } : {}),
          ...(apiProxyTarget
            ? {
                proxy: {
                  '/api': {
                    target: apiProxyTarget,
                    changeOrigin: true,
                  },
                },
              }
            : {}),
        },
      }
    : {}),
  test: {
    /** 与 `docs/FRONTEND.md` 一致：仅收集 `test/` 下镜像目录中的用例，避免与 `src/` 混放。 */
    include: ['test/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    silent: 'passed-only',
    unstubEnvs: true,
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    coverage: {
      // include: ['src/**/*.{js,jsx,ts,tsx}'], // Uncomment to expand the report to all src/**/* so untested modules appear as 0% coverage.
      exclude: [
        'src/components/ui/**',
        'src/assets/**',
        'src/tanstack-table.d.ts',
        'src/routeTree.gen.ts',
        'src/test-utils/**',
        'src/routes/**',
      ],
    },
  },
})

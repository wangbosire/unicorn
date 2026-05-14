/// <reference types="vitest/config" />
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { playwright } from '@vitest/browser-playwright'

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
  /** Docker 热更：绑定 0.0.0.0，并将 /api 反代到 compose 中的 api 服务。 */
  ...(process.env.DOCKER === '1'
    ? {
        server: {
          host: '0.0.0.0',
          port: 5173,
          strictPort: true,
          watch: { usePolling: true },
          ...(process.env.VITE_API_PROXY_TARGET
            ? {
                proxy: {
                  '/api': {
                    target: process.env.VITE_API_PROXY_TARGET,
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

/// <reference types="vitest/config" />
import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@contracts': path.resolve(__dirname, '../../packages/api-contracts/src'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'test/lib/**/*.{test,spec}.?(c|m)[jt]s?(x)',
      'test/stores/**/*.{test,spec}.?(c|m)[jt]s?(x)',
    ],
    setupFiles: ['test/setup-node.ts'],
    silent: 'passed-only',
    unstubEnvs: true,
  },
})

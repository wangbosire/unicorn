import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      '@contracts': path.resolve(__dirname, '../../packages/api-contracts/src'),
    },
  },
})

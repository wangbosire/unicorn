import { defineConfig } from 'vitest/config';

/**
 * 后端 Vitest 配置。
 * 当前主要承载 service 与公共 HTTP 层测试，统一运行 `test\/**\/*.test.ts` 目录下的测试文件。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});

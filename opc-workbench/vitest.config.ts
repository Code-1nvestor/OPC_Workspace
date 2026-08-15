import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // server 测试默认 node 环境；前端组件测试文件顶部加 // @vitest-environment jsdom
    environment: 'node',
    include: ['server/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    globals: false,
    css: false,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10000,
  },
});

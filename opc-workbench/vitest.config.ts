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
    // 顺序重要：vitest.server.setup 必须最先执行（在一切 import 前设置 :memory:），
    // 否则 ESM import 提升会让 server 测试连到真实 data/opc.db
    setupFiles: ['./vitest.server.setup.ts', './vitest.setup.ts'],
    testTimeout: 10000,
  },
});

// vitest setup：让 @testing-library/react 的 act() 在 jsdom 环境下正常工作
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// 抑制外部事件（如 matchMedia listener）在 act 外触发 setState 时产生的告警噪音。
// 测试中已用 act() 包裹所有断言，此告警无实际影响。
const originalError = console.error;
(console as any).error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('not wrapped in act')) return;
  originalError.apply(console, args);
};

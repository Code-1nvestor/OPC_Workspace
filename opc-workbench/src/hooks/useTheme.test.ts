// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

const STORAGE_KEY = 'theme';

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = [];
  const mq = {
    matches,
    addEventListener: (_type: string, cb: (e: { matches: boolean }) => void) => listeners.push(cb),
    removeEventListener: (_type: string, cb: (e: { matches: boolean }) => void) => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    },
    // 触发一次变化，模拟系统主题切换
    emit: (next: boolean) => listeners.forEach(cb => cb({ matches: next })),
  };
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mq));
  return mq;
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('默认读取 localStorage 中的主题', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('无存储值时跟随系统偏好', () => {
    mockMatchMedia(true); // prefers dark
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('toggleTheme 在 light/dark 之间切换并持久化', () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('系统主题变化且用户未手动设置时更新主题', () => {
    localStorage.removeItem(STORAGE_KEY);
    const mq = mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');

    act(() => mq.emit(true));
    expect(result.current.theme).toBe('dark');
  });

  it('用户已手动设置主题后，系统变化不再覆盖', () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    const mq = mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    act(() => mq.emit(true));
    expect(result.current.theme).toBe('light');
  });
});

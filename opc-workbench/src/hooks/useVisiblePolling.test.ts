// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVisiblePolling } from './useVisiblePolling';

describe('useVisiblePolling', () => {
  beforeEach(() => {
    // shouldAdvanceTime: true 让 waitFor 在 fake timers 下也能推进虚拟时钟
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // jsdom 默认 visibilityState 是 'visible'
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('初次加载时调用 fetcher 并返回数据', async () => {
    const fetcher = vi.fn().mockResolvedValue('data-1');
    const { result } = renderHook(() => useVisiblePolling(fetcher, { interval: 1000 }));

    await act(async () => { await Promise.resolve(); });
    expect(result.current.data).toBe('data-1');
    expect(result.current.loading).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('页面可见时按间隔轮询', async () => {
    const fetcher = vi.fn().mockResolvedValue('x');
    renderHook(() => useVisiblePolling(fetcher, { interval: 1000 }));

    await act(async () => { await Promise.resolve(); });
    expect(fetcher).toHaveBeenCalledTimes(1);

    // 推进 1s -> 触发一次轮询
    await act(async () => { vi.advanceTimersByTime(1000); await Promise.resolve(); });
    expect(fetcher).toHaveBeenCalledTimes(2);

    await act(async () => { vi.advanceTimersByTime(1000); await Promise.resolve(); });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('页面隐藏时暂停轮询，恢复可见时立即刷新', async () => {
    const fetcher = vi.fn().mockResolvedValue('y');
    renderHook(() => useVisiblePolling(fetcher, { interval: 1000 }));
    await act(async () => { await Promise.resolve(); });
    expect(fetcher).toHaveBeenCalledTimes(1);

    // 隐藏 -> 停止轮询
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    await act(async () => { vi.advanceTimersByTime(5000); await Promise.resolve(); });
    expect(fetcher).toHaveBeenCalledTimes(1); // 隐藏期间不轮询

    // 恢复可见 -> 立即刷新 + 恢复轮询
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await act(async () => { await Promise.resolve(); });
    expect(fetcher).toHaveBeenCalledTimes(2); // 恢复时立即刷新

    await act(async () => { vi.advanceTimersByTime(1000); await Promise.resolve(); });
    expect(fetcher).toHaveBeenCalledTimes(3); // 轮询恢复
  });

  it('fetcher 失败时记录 error 且不抛出', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('网络错误'));
    const { result } = renderHook(() => useVisiblePolling(fetcher, { interval: 5000 }));

    await act(async () => { await Promise.resolve(); });
    expect(result.current.error).toBe('网络错误');
    expect(result.current.data).toBeNull();
  });

  it('enabled=false 时不发起请求', async () => {
    const fetcher = vi.fn().mockResolvedValue('z');
    renderHook(() => useVisiblePolling(fetcher, { interval: 1000, enabled: false }));

    await act(async () => { vi.advanceTimersByTime(5000); await Promise.resolve(); });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('暴露手动 refresh 能力', async () => {
    const fetcher = vi.fn().mockResolvedValue('r');
    const { result } = renderHook(() => useVisiblePolling(fetcher, { interval: 60000 }));
    await act(async () => { await Promise.resolve(); });
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => { await result.current.refresh(); });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

/**
 * useVisiblePolling - 可见性感知轮询 Hook
 * 
 * 页面可见时按 interval 轮询，隐藏时自动暂停，恢复可见时立即刷新一次。
 * 配合手动刷新使用：const { data, loading, refresh } = useVisiblePolling(fetcher, 30000);
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface PollingOptions {
  /** 轮询间隔（ms），默认 30s */
  interval?: number;
  /** 是否启用，默认 true */
  enabled?: boolean;
}

export function useVisiblePolling<T>(
  fetcher: () => Promise<T>,
  options: PollingOptions = {}
) {
  const { interval = 30000, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初次加载 + 手动 refresh
  useEffect(() => {
    if (enabled) {
      refresh();
    }
  }, [enabled, refresh]);

  // 可见性感知轮询
  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return; // 已在运行
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          refresh();
        }
      }, interval);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // 恢复可见时立即刷新一次，然后继续轮询
        refresh();
        start();
      } else {
        // 隐藏时停止轮询
        stop();
      }
    };

    start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, interval, refresh]);

  return { data, loading, error, refresh, setData };
}

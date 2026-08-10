/**
 * 番茄专注钟模块 - 25 分钟计时，完成 POST 一次
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';
import { Button, MessagePlugin } from 'tdesign-react';
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react';
import { useVisiblePolling } from '../hooks/useVisiblePolling';

const FOCUS_DURATION = 25 * 60; // 25 分钟 = 1500 秒

export default function FocusModule({ onRefresh: _onRefresh }: { onRefresh?: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'focusing' | 'done'>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 今日统计
  const { data: statsData, refresh: refreshStats } = useVisiblePolling(
    () => api.getFocus(),
    { interval: 60000 }
  );

  // 计时
  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            // 计时结束
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            setPhase('done');
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, secondsLeft]);

  const handleComplete = useCallback(async () => {
    try {
      await api.createFocus({ duration_min: 25 });
      MessagePlugin.success('专注完成！已记录 25 分钟');
      refreshStats();
    } catch {
      MessagePlugin.error('记录失败，但专注已完成');
    }
  }, [refreshStats]);

  const handleStart = () => {
    if (phase === 'done') {
      setSecondsLeft(FOCUS_DURATION);
      setPhase('idle');
    }
    setPhase('focusing');
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(FOCUS_DURATION);
    setPhase('idle');
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progress = ((FOCUS_DURATION - secondsLeft) / FOCUS_DURATION) * 100;
  const todayCount = statsData?.todayCount || 0;
  const totalMinutes = statsData?.totalMinutes || 0;

  return (
    <div className="flex flex-col h-full items-center justify-center">
      {/* 计时圆盘 */}
      <div className="relative w-28 h-28 flex items-center justify-center mb-3">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke="var(--td-bg-color-component)"
            strokeWidth="6"
          />
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke="var(--td-brand-color)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="text-center">
          <div
            className="text-2xl font-bold font-mono"
            style={{
              color: phase === 'done' ? 'var(--td-success-color, #67c23a)' : 'var(--td-text-color-primary)',
            }}
          >
            {phase === 'done' ? '完成!' : formatTime(secondsLeft)}
          </div>
          {phase === 'done' && (
            <Coffee size={14} className="mx-auto mt-1" color="var(--td-success-color, #67c23a)" />
          )}
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="flex gap-2 mb-3">
        {!isRunning ? (
          <Button
            theme="primary"
            icon={<Play size={14} />}
            onClick={handleStart}
            size="small"
          >
            {phase === 'done' ? '再来一轮' : phase === 'focusing' ? '继续' : '开始专注'}
          </Button>
        ) : (
          <Button
            theme="default"
            icon={<Pause size={14} />}
            onClick={handlePause}
            size="small"
          >
            暂停
          </Button>
        )}
        <Button
          variant="outline"
          icon={<RotateCcw size={14} />}
          onClick={handleReset}
          size="small"
        >
          重置
        </Button>
      </div>

      {/* 统计 */}
      <div className="flex gap-4 text-xs" style={{ color: 'var(--td-text-color-secondary)' }}>
        <span>今日 <strong style={{ color: 'var(--td-brand-color)' }}>{todayCount}</strong> 次</span>
        <span>累计 <strong style={{ color: 'var(--td-brand-color)' }}>{totalMinutes}</strong> 分钟</span>
      </div>
    </div>
  );
}

/**
 * 重要日期倒计时模块 - DatePicker + 大字天数
 */

import { useVisiblePolling } from '../hooks/useVisiblePolling';
import { api } from '../api/client';
import { Button, DatePicker, Input, MessagePlugin, Popconfirm } from 'tdesign-react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function CountdownModule({ onRefresh: _onRefresh }: { onRefresh?: () => void }) {
  const { data, loading, setData } = useVisiblePolling(
    () => api.getCountdowns(),
    { interval: 60000 }
  );
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');

  const countdowns = data?.countdowns || [];

  const calcDays = (targetDate: string) => {
    const target = new Date(targetDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diff = target.getTime() - now.getTime();
    return Math.round(diff / 86400000);
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newDate) {
      MessagePlugin.warning('请填写标题和日期');
      return;
    }
    try {
      const dateStr = typeof newDate === 'string' ? newDate : new Date(newDate).toISOString().split('T')[0];
      const res = await api.createCountdown({ title: newTitle.trim(), target_date: dateStr });
      setData(prev => ({ ...prev!, countdowns: [...prev!.countdowns, res.countdown] }));
      setNewTitle(''); setNewDate(''); setShowAdd(false);
      MessagePlugin.success('已添加');
    } catch {
      MessagePlugin.error('添加失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteCountdown(id);
      setData(prev => ({ ...prev!, countdowns: prev!.countdowns.filter(c => c.id !== id) }));
      MessagePlugin.success('已删除');
    } catch {
      MessagePlugin.error('删除失败');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-end mb-2">
        <Button size="small" variant="text" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>添加</Button>
      </div>

      {showAdd && (
        <div className="mb-3 p-3 rounded-lg space-y-2" style={{ backgroundColor: 'var(--td-bg-color-secondarycontainer)' }}>
          <Input placeholder="事件标题" value={newTitle} onChange={(v: string) => setNewTitle(v)} size="small" />
          <DatePicker
            placeholder="选择日期"
            value={newDate}
            onChange={(v: any) => setNewDate(v ? String(v) : '')}
            mode="date"
            clearable
            size="small"
            style={{ width: '100%' }}
          />
          <div className="flex gap-2 justify-end">
            <Button size="small" variant="text" onClick={() => { setShowAdd(false); setNewTitle(''); setNewDate(''); }}>取消</Button>
            <Button size="small" theme="primary" onClick={handleAdd}>确认</Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {loading && countdowns.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--td-text-color-placeholder)' }}>加载中...</div>
        )}
        {!loading && countdowns.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--td-text-color-placeholder)' }}>暂无倒计时</div>
        )}
        {countdowns.map(cd => {
          const days = calcDays(cd.target_date);
          const isPast = days < 0;
          const isToday = days === 0;
          return (
            <div
              key={cd.id}
              className="flex items-center gap-3 p-3 rounded-lg group"
              style={{
                backgroundColor: 'var(--td-bg-color-secondarycontainer)',
                borderLeft: `3px solid ${cd.color || (isPast ? '#94a3b8' : isToday ? '#ef4444' : 'var(--td-brand-color)')}`,
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--td-text-color-primary)' }}>
                  {cd.title}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--td-text-color-placeholder)' }}>
                  {cd.target_date}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div
                  className="text-2xl font-bold leading-none"
                  style={{
                    color: isPast ? 'var(--td-text-color-placeholder)' : isToday ? '#ef4444' : 'var(--td-brand-color)',
                  }}
                >
                  {isToday ? '今天' : Math.abs(days)}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--td-text-color-placeholder)' }}>
                  {isPast ? '天前' : '天后'}
                </div>
              </div>
              <Popconfirm content="确定删除？" onConfirm={() => handleDelete(cd.id)}>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: 'var(--td-text-color-secondary)' }}>
                  <Trash2 size={14} />
                </button>
              </Popconfirm>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 进行中事项模块 - Progress 进度条 + Slider 调进度
 */

import { useVisiblePolling } from '../hooks/useVisiblePolling';
import { api } from '../api/client';
import { Progress, Slider, Button, Input, Textarea, Dialog, MessagePlugin } from 'tdesign-react';
import { PlusIcon, DeleteIcon } from 'tdesign-icons-react';
import { Trash2, Plus } from 'lucide-react';
import { useState } from 'react';

export default function OngoingModule({ onRefresh }: { onRefresh?: () => void }) {
  const { data, loading, refresh, setData } = useVisiblePolling(
    () => api.getOngoing(),
    { interval: 60000 }
  );
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const items = data?.items || [];

  const handleProgressChange = async (id: string, progress: number) => {
    setData(prev => ({
      ...prev!,
      items: prev!.items.map(it => it.id === id ? { ...it, progress } : it),
    }));
    try {
      await api.updateOngoing(id, { progress });
    } catch {
      MessagePlugin.error('更新进度失败');
      refresh();
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await api.createOngoing({ title: newTitle.trim(), description: newDesc.trim() || undefined, progress: 0 });
      setData(prev => ({ ...prev!, items: [...prev!.items, res.item] }));
      setNewTitle(''); setNewDesc(''); setShowAdd(false);
      MessagePlugin.success('已添加');
    } catch {
      MessagePlugin.error('添加失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteOngoing(id);
      setData(prev => ({ ...prev!, items: prev!.items.filter(it => it.id !== id) }));
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
        <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--td-bg-color-secondarycontainer)' }}>
          <Input
            placeholder="事项标题"
            value={newTitle}
            onChange={(v: string) => setNewTitle(v)}
            style={{ marginBottom: 8 }}
          />
          <Textarea
            placeholder="描述（可选）"
            value={newDesc}
            onChange={(v: string) => setNewDesc(v)}
            autosize={{ minRows: 2, maxRows: 4 }}
            style={{ marginBottom: 8 }}
          />
          <div className="flex gap-2 justify-end">
            <Button size="small" variant="text" onClick={() => { setShowAdd(false); setNewTitle(''); setNewDesc(''); }}>取消</Button>
            <Button size="small" theme="primary" onClick={handleAdd}>确认</Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3">
        {loading && items.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--td-text-color-placeholder)' }}>加载中...</div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--td-text-color-placeholder)' }}>暂无进行中的事项</div>
        )}
        {items.map(item => (
          <div key={item.id} className="p-3 rounded-lg group" style={{ backgroundColor: 'var(--td-bg-color-secondarycontainer)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--td-text-color-primary)' }}>{item.title}</span>
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--td-text-color-secondary)' }}
                onClick={() => handleDelete(item.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
            {item.description && (
              <p className="text-xs mb-2" style={{ color: 'var(--td-text-color-secondary)' }}>{item.description}</p>
            )}
            <div className="flex items-center gap-3">
              <Progress
                percentage={item.progress}
                size="small"
                style={{ flex: 1 }}
                color={{ from: 'var(--td-brand-color)', to: 'var(--td-brand-color-hover)' }}
              />
              <span className="text-xs font-mono w-10 text-right" style={{ color: 'var(--td-text-color-secondary)' }}>
                {item.progress}%
              </span>
            </div>
            <Slider
              value={item.progress}
              onChange={(v: number) => handleProgressChange(item.id, v)}
              min={0}
              max={100}
              step={5}
              style={{ marginTop: 4 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 快捷笔记模块 - 多色卡片 + 置顶 + 快速编辑
 */

import { useVisiblePolling } from '../hooks/useVisiblePolling';
import { api } from '../api/client';
import { Input, Textarea, Button, Popconfirm, MessagePlugin, Tooltip } from 'tdesign-react';
import { Pin, PinOff, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../i18n';

const NOTE_COLORS = ['#0052d9', '#2ba471', '#ed7b2f', '#e34d59', '#8a6be5', '#64748b'];

export default function NoteModule({ onRefresh: _onRefresh }: { onRefresh?: () => void }) {
  const { t } = useI18n();
  const { data, loading, setData } = useVisiblePolling(
    () => api.getNotes(),
    { interval: 60000 }
  );
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState(NOTE_COLORS[0]);

  const notes = data?.notes || [];

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await api.createNote({ title: newTitle.trim(), content: newContent.trim() || undefined, color: newColor });
      setData(prev => ({ ...prev!, notes: [res.note, ...prev!.notes] }));
      setNewTitle(''); setNewContent(''); setShowAdd(false);
      MessagePlugin.success(t('todo.added'));
    } catch {
      MessagePlugin.error(t('todo.addFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteNote(id);
      setData(prev => ({ ...prev!, notes: prev!.notes.filter(n => n.id !== id) }));
      MessagePlugin.success(t('todo.deleted'));
    } catch {
      MessagePlugin.error(t('todo.deleteFailed'));
    }
  };

  const handleTogglePin = async (note: any) => {
    try {
      await api.updateNote(note.id, { pinned: note.pinned ? 0 : 1 });
      setData(prev => ({
        ...prev!,
        notes: prev!.notes.map(n => n.id === note.id ? { ...n, pinned: note.pinned ? 0 : 1 } : n),
      }));
    } catch {
      MessagePlugin.error(t('note.pinFailed'));
    }
  };

  const handleSaveContent = async (note: any, content: string) => {
    try {
      await api.updateNote(note.id, { content });
      setData(prev => ({ ...prev!, notes: prev!.notes.map(n => n.id === note.id ? { ...n, content } : n) }));
    } catch {
      MessagePlugin.error(t('note.saveFailed'));
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-end mb-2 flex-shrink-0">
        <Button size="small" variant="text" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>{t('module.add')}</Button>
      </div>

      {showAdd && (
        <div className="mb-3 p-3 rounded-lg space-y-2 flex-shrink-0" style={{ backgroundColor: 'var(--td-bg-color-secondarycontainer)' }}>
          <Input placeholder={t('note.titlePlaceholder')} value={newTitle} onChange={(v: string) => setNewTitle(v)} size="small" />
          <Textarea placeholder={t('note.contentPlaceholder')} value={newContent} onChange={(v: string) => setNewContent(v)} autosize={{ minRows: 2, maxRows: 4 }} />
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {NOTE_COLORS.map(c => (
                <button
                  key={c}
                  className="w-4 h-4 rounded-full transition-transform"
                  style={{ backgroundColor: c, transform: c === newColor ? 'scale(1.2)' : 'scale(1)', outline: c === newColor ? '2px solid var(--td-brand-color)' : 'none' }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="small" variant="text" onClick={() => { setShowAdd(false); setNewTitle(''); setNewContent(''); }}>{t('module.cancel')}</Button>
              <Button size="small" theme="primary" onClick={handleAdd}>{t('module.confirm')}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {loading && notes.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--td-text-color-placeholder)' }}>{t('module.loading')}</div>
        )}
        {!loading && notes.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--td-text-color-placeholder)' }}>{t('note.empty')}</div>
        )}

        {notes.map(note => (
          <div
            key={note.id}
            className="p-3 rounded-lg group"
            style={{ backgroundColor: 'var(--td-bg-color-secondarycontainer)', borderTop: `3px solid ${note.color || 'var(--td-brand-color)'}` }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {note.pinned === 1 && <Pin size={12} color="var(--td-brand-color)" />}
                <span className="text-sm font-medium truncate" style={{ color: 'var(--td-text-color-primary)' }}>{note.title}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Tooltip content={note.pinned === 1 ? t('note.unpin') : t('note.pin')}>
                  <button onClick={() => handleTogglePin(note)} style={{ color: 'var(--td-text-color-secondary)' }}>
                    {note.pinned === 1 ? <PinOff size={14} /> : <Pin size={14} />}
                  </button>
                </Tooltip>
                <Popconfirm content={t('todo.confirmDelete')} onConfirm={() => handleDelete(note.id)}>
                  <button style={{ color: 'var(--td-text-color-secondary)' }}>
                    <Trash2 size={14} />
                  </button>
                </Popconfirm>
              </div>
            </div>
            {note.content && (
              <p
                className="text-xs whitespace-pre-wrap break-words cursor-pointer"
                style={{ color: 'var(--td-text-color-secondary)' }}
                onClick={() => {
                  const next = window.prompt(t('note.editContent'), note.content);
                  if (next !== null && next !== note.content) handleSaveContent(note, next);
                }}
              >
                {note.content.length > 120 ? note.content.slice(0, 120) + '...' : note.content}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 待办事项模块 - Checkbox + Popconfirm 删除
 */

import { useVisiblePolling } from '../hooks/useVisiblePolling';
import { api } from '../api/client';
import { Checkbox, Input, Button, Popconfirm, MessagePlugin } from 'tdesign-react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useState, useRef } from 'react';

export default function TodoModule({ onRefresh }: { onRefresh?: () => void }) {
  const { data, loading, refresh, setData } = useVisiblePolling(
    () => api.getTodos(),
    { interval: 30000 }
  );
  const [newTodo, setNewTodo] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const todos = data?.todos || [];
  const activeTodos = todos.filter(t => !t.done);
  const doneTodos = todos.filter(t => t.done);

  const handleAdd = async () => {
    if (!newTodo.trim()) return;
    try {
      const res = await api.createTodo(newTodo.trim());
      setData(prev => ({ ...prev!, todos: [res.todo, ...prev!.todos] }));
      setNewTodo('');
      MessagePlugin.success('已添加');
    } catch {
      MessagePlugin.error('添加失败');
    }
  };

  const handleToggle = async (id: string, done: number) => {
    const newDone = done ? 0 : 1;
    setData(prev => ({
      ...prev!,
      todos: prev!.todos.map(t => t.id === id ? { ...t, done: newDone } : t),
    }));
    try {
      await api.updateTodo(id, { done: newDone });
    } catch {
      refresh();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTodo(id);
      setData(prev => ({ ...prev!, todos: prev!.todos.filter(t => t.id !== id) }));
      MessagePlugin.success('已删除');
    } catch {
      MessagePlugin.error('删除失败');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 输入框 */}
      <div className="flex gap-2 mb-3 flex-shrink-0">
        <Input
          placeholder="添加待办..."
          value={newTodo}
          onChange={(v: string) => setNewTodo(v)}
          onEnter={handleAdd}
          size="small"
        />
        <Button size="small" theme="primary" icon={<Plus size={14} />} onClick={handleAdd} />
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {loading && todos.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--td-text-color-placeholder)' }}>加载中...</div>
        )}
        {!loading && todos.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--td-text-color-placeholder)' }}>暂无待办</div>
        )}

        {/* 未完成 */}
        {activeTodos.map(todo => (
          <div
            key={todo.id}
            className="flex items-center gap-2 px-2 py-2 rounded-lg group cursor-pointer hover:bg-[var(--td-bg-color-component-hover)] transition-colors"
          >
            <Checkbox
              checked={!!todo.done}
              onChange={() => handleToggle(todo.id, todo.done)}
            />
            <span className="flex-1 text-sm truncate" style={{ color: 'var(--td-text-color-primary)' }}>
              {todo.title}
            </span>
            <Popconfirm content="确定删除？" onConfirm={() => handleDelete(todo.id)}>
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                style={{ color: 'var(--td-text-color-secondary)' }}
              >
                <Trash2 size={14} />
              </button>
            </Popconfirm>
          </div>
        ))}

        {/* 已完成 */}
        {doneTodos.length > 0 && (
          <div className="pt-2 mt-2 border-t" style={{ borderColor: 'var(--td-component-border)' }}>
            <div className="text-xs mb-1 px-2" style={{ color: 'var(--td-text-color-placeholder)' }}>
              已完成 ({doneTodos.length})
            </div>
            {doneTodos.map(todo => (
              <div
                key={todo.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg group cursor-pointer hover:bg-[var(--td-bg-color-component-hover)] transition-colors"
              >
                <Checkbox
                  checked={!!todo.done}
                  onChange={() => handleToggle(todo.id, todo.done)}
                />
                <span className="flex-1 text-sm truncate line-through" style={{ color: 'var(--td-text-color-placeholder)' }}>
                  {todo.title}
                </span>
                <Popconfirm content="确定删除？" onConfirm={() => handleDelete(todo.id)}>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    style={{ color: 'var(--td-text-color-secondary)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </Popconfirm>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

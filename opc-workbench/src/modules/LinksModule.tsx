/**
 * 常用链接导航模块 - 图标网格
 */

import { useVisiblePolling } from '../hooks/useVisiblePolling';
import { api } from '../api/client';
import { Button, Input, MessagePlugin, Popconfirm } from 'tdesign-react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../i18n';

export default function LinksModule({ onRefresh: _onRefresh }: { onRefresh?: () => void }) {
  const { t } = useI18n();
  const { data, loading, setData } = useVisiblePolling(
    () => api.getLinks(),
    { interval: 120000 }
  );
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newIcon, setNewIcon] = useState('');

  const links = data?.links || [];

  const handleAdd = async () => {
    if (!newTitle.trim() || !newUrl.trim()) {
      MessagePlugin.warning(t('links.fillHint') || '请填写标题和 URL');
      return;
    }
    try {
      const url = newUrl.trim().startsWith('http') ? newUrl.trim() : `https://${newUrl.trim()}`;
      const res = await api.createLink({ title: newTitle.trim(), url, icon: newIcon.trim() || undefined });
      setData(prev => ({ ...prev!, links: [...prev!.links, res.link] }));
      setNewTitle(''); setNewUrl(''); setNewIcon(''); setShowAdd(false);
      MessagePlugin.success(t('todo.added') || '已添加');
    } catch {
      MessagePlugin.error(t('todo.addFailed') || '添加失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteLink(id);
      setData(prev => ({ ...prev!, links: prev!.links.filter(l => l.id !== id) }));
      MessagePlugin.success(t('todo.deleted') || '已删除');
    } catch {
      MessagePlugin.error(t('todo.deleteFailed') || '删除失败');
    }
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-end mb-2">
        <Button size="small" variant="text" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>{t('module.add')}</Button>
      </div>

      {showAdd && (
        <div className="mb-3 p-3 rounded-lg space-y-2" style={{ backgroundColor: 'var(--td-bg-color-secondarycontainer)' }}>
          <Input placeholder={t('links.titlePlaceholder')} value={newTitle} onChange={(v: string) => setNewTitle(v)} size="small" />
          <Input placeholder={t('links.urlPlaceholder')} value={newUrl} onChange={(v: string) => setNewUrl(v)} size="small" />
          <Input placeholder={t('links.iconPlaceholder')} value={newIcon} onChange={(v: string) => setNewIcon(v)} size="small" />
          <div className="flex gap-2 justify-end">
            <Button size="small" variant="text" onClick={() => { setShowAdd(false); setNewTitle(''); setNewUrl(''); setNewIcon(''); }}>{t('module.cancel')}</Button>
            <Button size="small" theme="primary" onClick={handleAdd}>{t('module.confirm')}</Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading && links.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--td-text-color-placeholder)' }}>{t('module.loading')}</div>
        )}
        {!loading && links.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--td-text-color-placeholder)' }}>{t('links.empty')}</div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {links.map(link => (
            <div key={link.id} className="group relative">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors hover:bg-[var(--td-bg-color-component-hover)]"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--td-bg-color-secondarycontainer)' }}>
                  {link.icon ? (
                    <span>{link.icon}</span>
                  ) : (
                    <img
                      src={getFaviconUrl(link.url)}
                      alt=""
                      className="w-5 h-5"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = '<ExternalLink size="16" />';
                      }}
                    />
                  )}
                </div>
                <span className="text-xs text-center truncate w-full" style={{ color: 'var(--td-text-color-primary)' }}>
                  {link.title}
                </span>
              </a>
              <Popconfirm content="确定删除？" onConfirm={() => handleDelete(link.id)}>
                <button
                  className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--td-error-color, #ef4444)', color: 'white' }}
                >
                  <Trash2 size={10} />
                </button>
              </Popconfirm>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

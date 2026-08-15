/**
 * AI 资讯模块 - Tabs 五分类 + sourceUrl 外链
 */

import { useVisiblePolling } from '../hooks/useVisiblePolling';
import { api } from '../api/client';
import { Tabs, Tag } from 'tdesign-react';
const { TabPanel } = Tabs;
import { ExternalLink, Clock } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../i18n';

const CATEGORY_KEYS = ['all', 'ai-models', 'ai-products', 'industry', 'paper', 'tip'] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];

const CATEGORY_I18N: Record<CategoryKey, string> = {
  all: 'news.cat.all',
  'ai-models': 'news.cat.models',
  'ai-products': 'news.cat.products',
  industry: 'news.cat.industry',
  paper: 'news.cat.paper',
  tip: 'news.cat.tip',
};

export default function NewsModule({ onRefresh: _onRefresh }: { onRefresh?: () => void }) {
  const { t } = useI18n();
  const [category, setCategory] = useState('all');
  const { data, loading } = useVisiblePolling(
    () => api.getNews({ category, since: 168 }),
    { interval: 600000 } // 10 分钟（与后端缓存同步）
  );

  const items = data?.items || [];

  const CATEGORIES = CATEGORY_KEYS.map(key => ({ key, label: t(CATEGORY_I18N[key]) }));

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return t('news.justNow');
    if (hours < 24) return t('news.hoursAgo').replace('{n}', String(hours));
    const days = Math.floor(hours / 24);
    return t('news.daysAgo').replace('{n}', String(days));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Tabs
        value={category}
        onChange={(v: string) => setCategory(v)}
        size="medium"
        style={{ flexShrink: 0 }}
      >
        {CATEGORIES.map(cat => (
          <TabPanel key={cat.key} value={cat.key} label={cat.label} />
        ))}
      </Tabs>

      <div className="flex-1 overflow-y-auto mt-2 space-y-2">
        {loading && items.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--td-text-color-placeholder)' }}>{t('module.loading')}</div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--td-text-color-placeholder)' }}>{t('news.empty')}</div>
        )}
        {items.slice(0, 20).map((item, idx) => (
          <a
            key={item.id || idx}
            href={item.sourceUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg transition-colors hover:bg-[var(--td-bg-color-component-hover)]"
            style={{ border: '1px solid var(--td-component-border)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate" style={{ color: 'var(--td-text-color-primary)' }}>
                  {item.title}
                </h4>
                {item.summary && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--td-text-color-secondary)' }}>
                    {item.summary}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  {item.category && (
                    <Tag size="small" variant="outline">{item.category}</Tag>
                  )}
                  {item.publishedAt && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--td-text-color-placeholder)' }}>
                      <Clock size={10} />
                      {formatTime(item.publishedAt)}
                    </span>
                  )}
                </div>
              </div>
              <ExternalLink size={14} className="flex-shrink-0 mt-1" style={{ color: 'var(--td-text-color-placeholder)' }} />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

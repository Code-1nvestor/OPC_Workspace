/**
 * DashboardPage - 工作台首页
 * Grid 卡片墙布局，每个卡片带手动刷新按钮
 */

import { useState, useCallback } from 'react';
import { Button, Tooltip } from 'tdesign-react';
import { RefreshIcon } from 'tdesign-icons-react';
import * as Icons from 'lucide-react';
import { moduleRegistry, ModuleComponentProps } from '../modules/registry';
import { useI18n } from '../i18n';

export function DashboardPage() {
  const { t } = useI18n();
  const [refreshKeys, setRefreshKeys] = useState<Record<string, number>>({});

  const triggerRefresh = useCallback((moduleId: string) => {
    setRefreshKeys(prev => ({ ...prev, [moduleId]: (prev[moduleId] || 0) + 1 }));
  }, []);

  const refreshAll = useCallback(() => {
    moduleRegistry.forEach(m => triggerRefresh(m.id));
  }, [triggerRefresh]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--td-text-color-primary)' }}>
          {t('dashboard.title')}
        </h2>
        <Tooltip content={t('dashboard.refreshAllTooltip')}>
          <Button
            variant="outline"
            icon={<RefreshIcon />}
            onClick={refreshAll}
          >
            {t('dashboard.refreshAll')}
          </Button>
        </Tooltip>
      </div>

      {/* 卡片墙 */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gridAutoRows: 'minmax(200px, auto)',
        }}
      >
        {moduleRegistry.map(mod => {
          const Component = mod.component;
          const Icon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[mod.icon] || (Icons.LayoutGrid as React.ComponentType<{ size?: number; color?: string }>);
          const props: ModuleComponentProps = {
            onRefresh: () => triggerRefresh(mod.id),
          };

          return (
            <div
              key={mod.id}
              className="rounded-xl p-4 flex flex-col"
              style={{
                backgroundColor: 'var(--td-bg-color-container)',
                border: '1px solid var(--td-component-border)',
                gridColumn: mod.colSpan ? `span ${mod.colSpan}` : undefined,
              }}
            >
              {/* 卡片头 */}
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--td-brand-color-light)' }}
                  >
                    <Icon size={16} color="var(--td-brand-color)" />
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--td-text-color-primary)' }}>
                    {mod.title}
                  </h3>
                </div>
                <Tooltip content={t('dashboard.refreshTooltip')}>
                  <Button
                    variant="text"
                    shape="circle"
                    size="small"
                    icon={<RefreshIcon />}
                    onClick={() => triggerRefresh(mod.id)}
                  />
                </Tooltip>
              </div>

              {/* 卡片内容 */}
              <div className="flex-1 overflow-hidden" key={refreshKeys[mod.id] || 0}>
                <Component {...props} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

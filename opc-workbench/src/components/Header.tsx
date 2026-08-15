import { Button, Tooltip, Tag } from 'tdesign-react';
import { RefreshIcon, SunnyIcon, MoonIcon, MenuFoldIcon, MenuUnfoldIcon } from 'tdesign-icons-react';
import { Bot, LayoutGrid } from 'lucide-react';
import { APP_CONFIG } from '../config';
import { Model, Session, Agent, Theme } from '../types';
import { ICON_MAP } from '../utils/iconMap';
import { useI18n } from '../i18n';

interface HeaderProps {
  isSettingsPage: boolean;
  isDashboard: boolean;
  sidebarOpen: boolean;
  theme: Theme;
  currentSession: Session | undefined;
  currentAgent: Agent | undefined;
  models: Model[];
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  onRefreshModels: () => void;
}

export function Header({ isSettingsPage, isDashboard, sidebarOpen, theme, currentSession, currentAgent, models, onToggleSidebar, onToggleTheme, onRefreshModels }: HeaderProps) {
  const { t } = useI18n();
  const formatModelName = (modelId: string) => {
    const model = models.find(m => m.modelId === modelId);
    const name = model?.name || modelId;
    return name.replace(/^(Claude|GPT|Gemini|Kimi|DeepSeek|Qwen|GLM)\s*/i, '').replace(/-/g, ' ').trim() || name;
  };

  return (
    <header className="h-14 flex justify-between items-center px-4 flex-shrink-0" style={{ backgroundColor: 'var(--td-bg-color-page)' }}>
      <div className="flex items-center gap-3">
        <Button variant="text" shape="circle" icon={sidebarOpen ? <MenuFoldIcon /> : <MenuUnfoldIcon />} onClick={onToggleSidebar} />
        {isDashboard ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--td-brand-color-light)' }}>
              <LayoutGrid size={14} color="var(--td-brand-color)" />
            </div>
            <h1 className="text-base font-semibold" style={{ color: 'var(--td-text-color-primary)' }}>
              {t('header.dashboard')}
            </h1>
          </div>
        ) : (
          <>
            {!isSettingsPage && currentAgent && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: currentAgent.color || 'var(--td-brand-color)' }}>
                {(() => { const Icon = ICON_MAP[currentAgent.icon || 'Bot'] || Bot; return <Icon size={14} color="white" />; })()}
              </div>
            )}
            <h1 className="text-base font-semibold" style={{ color: 'var(--td-text-color-primary)' }}>
              {isSettingsPage ? t('header.settings') : (currentSession?.title || APP_CONFIG.name)}
            </h1>
            {!isSettingsPage && currentSession && (
              <Tag size="small" variant="outline">{formatModelName(currentSession.model)}</Tag>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Tooltip content={theme === 'light' ? t('header.themeToDark') : t('header.themeToLight')}>
          <Button variant="outline" shape="circle" icon={theme === 'light' ? <MoonIcon /> : <SunnyIcon />} onClick={onToggleTheme} />
        </Tooltip>
        {!isSettingsPage && !isDashboard && (
          <Tooltip content={t('header.refreshModels')}>
            <Button variant="outline" shape="circle" icon={<RefreshIcon />} onClick={onRefreshModels} />
          </Tooltip>
        )}
      </div>
    </header>
  );
}

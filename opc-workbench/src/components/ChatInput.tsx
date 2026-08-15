import { useRef, useCallback } from 'react';
import { Select, Tooltip } from 'tdesign-react';
import { ChatSender } from '@tdesign-react/chat';
import { ChevronDownIcon, LockOnIcon, LockOffIcon, EditIcon, TaskIcon } from 'tdesign-icons-react';
import { Model, PermissionMode } from '../types';
import { useI18n } from '../i18n';

interface ChatInputProps {
  inputValue: string;
  selectedModel: string;
  models: Model[];
  isLoading: boolean;
  permissionMode: PermissionMode;
  onSend: (message: string) => void;
  onStop: () => void;
  onChange: (value: string) => void;
  onModelChange: (modelId: string) => void;
  onPermissionModeChange: (mode: PermissionMode) => void;
}

export function ChatInput({ inputValue, selectedModel, models, isLoading, permissionMode, onSend, onStop, onChange, onModelChange, onPermissionModeChange }: ChatInputProps) {
  const { t } = useI18n();
  const chatSenderRef = useRef<any>(null);

  const PERMISSION_MODE_CONFIG: Record<PermissionMode, { label: string; shortLabel: string; icon: React.ReactNode; color: string; description: string }> = {
    'default': { label: t('perm.default'), shortLabel: t('perm.defaultShort'), icon: <LockOnIcon />, color: '#0052d9', description: t('perm.defaultDesc') },
    'acceptEdits': { label: t('perm.acceptEdits'), shortLabel: t('perm.acceptEditsShort'), icon: <EditIcon />, color: '#2ba471', description: t('perm.acceptEditsDesc') },
    'plan': { label: t('perm.plan'), shortLabel: t('perm.planShort'), icon: <TaskIcon />, color: '#ed7b2f', description: t('perm.planDesc') },
    'bypassPermissions': { label: t('perm.bypass'), shortLabel: t('perm.bypassShort'), icon: <LockOffIcon />, color: '#e34d59', description: t('perm.bypassDesc') },
  };

  const handleSend = useCallback((e: any) => {
    const content = e?.detail?.message || e?.detail || e?.message || inputValue;
    if (content && typeof content === 'string' && content.trim() && selectedModel) {
      onSend(content.trim());
    } else if (inputValue.trim() && selectedModel) {
      onSend(inputValue.trim());
    }
  }, [inputValue, selectedModel, onSend]);

  const handleChange = useCallback((e: any) => {
    const value = e?.detail ?? e ?? '';
    onChange(typeof value === 'string' ? value : '');
  }, [onChange]);

  const currentModeConfig = PERMISSION_MODE_CONFIG[permissionMode];

  return (
    <div className="px-4 pb-6 pt-4" style={{ backgroundColor: 'var(--td-bg-color-page)' }}>
      <div className="max-w-3xl mx-auto">
        <ChatSender
          ref={chatSenderRef}
          value={inputValue}
          placeholder={t('chat.inputPlaceholder')}
          disabled={!selectedModel}
          loading={isLoading}
          autosize={{ minRows: 1, maxRows: 6 }}
          actions={['send']}
          onSend={handleSend}
          onStop={onStop}
          onChange={handleChange}
        >
          <div slot="footer-prefix" className="flex items-center gap-2">
            <Select value={selectedModel} onChange={(value) => onModelChange(value as string)} placeholder={t('chat.selectModel')} size="small" style={{ width: 160 }} filterable borderless suffixIcon={<ChevronDownIcon />}>
              {models.map(model => (<Select.Option key={model.modelId} value={model.modelId} label={model.name} />))}
            </Select>
            <div className="h-4 w-px" style={{ backgroundColor: 'var(--td-component-stroke)' }} />
            <Tooltip content={currentModeConfig.description} placement="top">
              <Select value={permissionMode} onChange={(value) => onPermissionModeChange(value as PermissionMode)} size="small" style={{ width: 110 }} borderless suffixIcon={<ChevronDownIcon />} prefixIcon={<span style={{ color: currentModeConfig.color }}>{currentModeConfig.icon}</span>} popupProps={{ overlayInnerStyle: { width: 140 } }}>
                {(Object.keys(PERMISSION_MODE_CONFIG) as PermissionMode[]).map(mode => {
                  const config = PERMISSION_MODE_CONFIG[mode];
                  return (
                    <Select.Option key={mode} value={mode} label={config.shortLabel}>
                      <div className="flex items-center gap-2"><span style={{ color: config.color }}>{config.icon}</span><span>{config.shortLabel}</span></div>
                    </Select.Option>
                  );
                })}
              </Select>
            </Tooltip>
          </div>
        </ChatSender>
      </div>
    </div>
  );
}

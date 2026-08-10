import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Model, Session, PermissionMode, CustomAgent, PermissionRequest } from '../types';
import { NewChatView } from '../components/NewChatView';
import { ChatMessages } from '../components/ChatMessages';
import { ChatInput } from '../components/ChatInput';
import { api } from '../api/client';
import { KeyRound, AlertCircle } from 'lucide-react';

interface ChatPageProps {
  currentSession: Session | undefined;
  models: Model[];
  selectedModel: string;
  agents: CustomAgent[];
  isLoading: boolean;
  inputValue: string;
  permissionRequest: PermissionRequest | null;
  permissionMode: PermissionMode;
  onSendMessage: (message: string, newChatOptions?: NewChatOptions, onNavigate?: (path: string) => void) => void;
  onStop: () => void;
  onInputChange: (value: string) => void;
  onModelChange: (modelId: string) => void;
  onPermissionAllow: () => void;
  onPermissionDeny: () => void;
  onPermissionModeChange: (mode: PermissionMode) => void;
}

interface NewChatOptions {
  agentId: string;
  cwd: string;
  permissionMode: PermissionMode;
}

export function ChatPage({
  currentSession,
  models,
  selectedModel,
  agents,
  isLoading,
  inputValue,
  permissionRequest,
  permissionMode,
  onSendMessage,
  onStop,
  onInputChange,
  onModelChange,
  onPermissionAllow,
  onPermissionDeny,
  onPermissionModeChange,
}: ChatPageProps) {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 新对话页面状态
  const [newChatAgentId, setNewChatAgentId] = useState('default');
  const [newChatCwd, setNewChatCwd] = useState('');

  // 登录状态检查（含 Provider 信息）
  const [loginStatus, setLoginStatus] = useState<{ checked: boolean; isLoggedIn: boolean; error?: string; providerId?: string; providerName?: string }>({
    checked: false,
    isLoggedIn: false,
  });

  useEffect(() => {
    api.checkLogin().then(res => {
      setLoginStatus({ checked: true, isLoggedIn: res.isLoggedIn, error: res.error, providerId: (res as any).providerId, providerName: (res as any).providerName });
    }).catch(() => {
      setLoginStatus({ checked: true, isLoggedIn: false, error: '无法连接服务器' });
    });
  }, []);

  // 监听 Provider 切换事件，重新检查登录状态
  useEffect(() => {
    const handleProviderChanged = () => {
      setLoginStatus({ checked: false, isLoggedIn: false });
      api.checkLogin().then(res => {
        setLoginStatus({ checked: true, isLoggedIn: res.isLoggedIn, error: res.error, providerId: (res as any).providerId, providerName: (res as any).providerName });
      }).catch(() => {
        setLoginStatus({ checked: true, isLoggedIn: false, error: '无法连接服务器' });
      });
    };
    window.addEventListener('provider-changed', handleProviderChanged);
    return () => window.removeEventListener('provider-changed', handleProviderChanged);
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // 处理发送消息
  const handleSend = useCallback((message: string) => {
    if (!currentSession) {
      // 新对话
      onSendMessage(message, {
        agentId: newChatAgentId,
        cwd: newChatCwd,
        permissionMode: permissionMode,
      }, (path) => {
        // 重置新对话选项
        setNewChatAgentId('default');
        setNewChatCwd('');
        navigate(path);
      });
    } else {
      onSendMessage(message);
    }
  }, [currentSession, newChatAgentId, newChatCwd, permissionMode, onSendMessage, navigate]);

  const showNewChatView = !currentSession || currentSession.messages.length === 0;

  // 未登录时显示配置引导卡片
  if (loginStatus.checked && !loginStatus.isLoggedIn) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="max-w-md w-full p-6 rounded-2xl text-center"
          style={{
            backgroundColor: 'var(--td-bg-color-container)',
            border: '1px solid var(--td-component-border)',
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--td-warning-color-light, rgba(230,162,60,0.1))' }}
          >
            <KeyRound size={28} color="var(--td-warning-color, #e6a23c)" />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--td-text-color-primary)' }}>
            聊天功能需要配置 LLM Provider
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--td-text-color-secondary)' }}>
            当前 Provider（{loginStatus.providerName || '未知'}）未检测到有效配置。请前往「设置」页面配置 API Key，或在 <code style={{ backgroundColor: 'var(--td-bg-color-secondarycontainer)', padding: '2px 6px', borderRadius: 4 }}>.env</code> 文件中设置。
          </p>
          {loginStatus.error && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg mb-4 text-xs"
              style={{
                backgroundColor: 'var(--td-bg-color-component)',
                color: 'var(--td-text-color-secondary)',
              }}
            >
              <AlertCircle size={14} className="flex-shrink-0" />
              <span className="truncate">{loginStatus.error}</span>
            </div>
          )}
          <div
            className="p-4 rounded-lg text-left text-xs space-y-2"
            style={{ backgroundColor: 'var(--td-bg-color-component)' }}
          >
            <p className="font-medium" style={{ color: 'var(--td-text-color-primary)' }}>支持的 Provider：</p>
            <div className="space-y-1.5" style={{ color: 'var(--td-text-color-secondary)' }}>
              <p><strong>CodeBuddy</strong>（默认）：CODEBUDDY_API_KEY 或 CLI 登录</p>
              <p><strong>火山 GLM-5.2</strong>：ANTHROPIC_API_KEY（当前免费）</p>
              <p><strong>Agnes</strong>（免费）：OPENAI_API_KEY，模型 agnes-2.0-flash</p>
            </div>
            <p className="mt-3" style={{ color: 'var(--td-text-color-secondary)' }}>
              在 <code style={{ backgroundColor: 'var(--td-bg-color-secondarycontainer)', padding: '2px 6px', borderRadius: 4 }}>.env</code> 文件中设置 <code style={{ backgroundColor: 'var(--td-bg-color-secondarycontainer)', padding: '2px 6px', borderRadius: 4 }}>LLM_PROVIDER</code> 和对应 Key，然后重启服务
            </p>
            <p style={{ color: 'var(--td-text-color-secondary)' }}>
              或前往「设置」页面通过界面配置
            </p>
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--td-text-color-placeholder)' }}>
            工作台功能不受影响，可正常使用
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        {showNewChatView ? (
          <NewChatView
            agents={agents}
            models={models}
            selectedModel={selectedModel}
            newChatAgentId={newChatAgentId}
            newChatCwd={newChatCwd}
            newChatPermissionMode={permissionMode}
            onSelectModel={onModelChange}
            onSelectAgent={setNewChatAgentId}
            onSetCwd={setNewChatCwd}
            onSetPermissionMode={onPermissionModeChange}
          />
        ) : (
          <ChatMessages
            messages={currentSession!.messages}
            models={models}
            messagesEndRef={messagesEndRef}
            permissionRequest={permissionRequest}
            onPermissionAllow={onPermissionAllow}
            onPermissionDeny={onPermissionDeny}
          />
        )}
      </div>

      {/* 输入区域 */}
      <ChatInput
        inputValue={inputValue}
        selectedModel={selectedModel}
        models={models}
        isLoading={isLoading}
        permissionMode={permissionMode}
        onSend={handleSend}
        onStop={onStop}
        onChange={onInputChange}
        onModelChange={onModelChange}
        onPermissionModeChange={onPermissionModeChange}
      />
    </>
  );
}

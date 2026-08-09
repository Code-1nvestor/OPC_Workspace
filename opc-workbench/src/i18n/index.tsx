/**
 * 轻量 i18n 国际化模块
 *
 * 基于 React Context 实现，不引入额外依赖。
 * 支持 zh-CN（默认）和 en-US 两种语言。
 * 通过 useI18n() hook 获取 t() 翻译函数和 locale 切换。
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

// ============= 类型定义 =============

export type Locale = 'zh-CN' | 'en-US';

type TranslationDict = Record<string, string>;

// ============= 翻译表 =============

const zhCN: TranslationDict = {
  // 通用
  'app.title': 'OPC 工作台',
  'app.tagline': '一人公司工作台',
  // 侧边栏
  'sidebar.newChat': '新对话',
  'sidebar.settings': '设置',
  'sidebar.dashboard': '工作台',
  'sidebar.deleteSession': '删除会话',
  // 设置页
  'settings.title': '设置',
  'settings.subtitle': '管理登录配置、LLM Provider 和自定义 Agent',
  'settings.llmProvider': 'LLM Provider',
  'settings.llmProviderDesc': '选择和配置 AI 模型提供方，切换即时生效',
  'settings.connected': '已连接',
  'settings.notConnected': '未连接',
  'settings.current': '当前',
  'settings.switch': '切换',
  'settings.switching': '切换中',
  'settings.configured': '已配置',
  'settings.notConfigured': '未配置',
  'settings.envConfig': '配置环境变量',
  'settings.envConfigTitle': '环境变量配置',
  'settings.saveConfig': '保存配置',
  'settings.exportSettings': '导出设置',
  'settings.importSettings': '导入设置',
  'settings.exportHint': '导出不含 API Key，导入后需单独配置 Key',
  'settings.agentConfig': 'Agent 配置',
  'settings.agentConfigDesc': '创建和管理自定义 Agent',
  'settings.createAgent': '从头创建 Agent',
  'settings.quickCreate': '快速创建',
  'settings.myAgents': '我的 Agent',
  'settings.refresh': '刷新',
  // 聊天页
  'chat.needProvider': '聊天功能需要配置 LLM Provider',
  'chat.workbenchUnaffected': '工作台功能不受影响，可正常使用',
  'chat.sendMessage': '发送消息',
  'chat.stop': '停止',
  // 工具状态
  'tool.running': '执行中...',
  'tool.completed': '完成',
  'tool.failed': '失败',
  'tool.viewSteps': '查看步骤',
  'tool.collapseSteps': '收起步骤',
  'tool.stepsCompleted': '个步骤已完成',
  'tool.result': '结果:',
  'tool.error': '错误:',
  'tool.input': '输入:',
  // 托盘
  'tray.open': '打开工作台',
  'tray.quit': '退出',
};

const enUS: TranslationDict = {
  // General
  'app.title': 'OPC Workbench',
  'app.tagline': 'One-Person Company Workbench',
  // Sidebar
  'sidebar.newChat': 'New Chat',
  'sidebar.settings': 'Settings',
  'sidebar.dashboard': 'Dashboard',
  'sidebar.deleteSession': 'Delete Session',
  // Settings
  'settings.title': 'Settings',
  'settings.subtitle': 'Manage login, LLM Provider and custom Agents',
  'settings.llmProvider': 'LLM Provider',
  'settings.llmProviderDesc': 'Select and configure AI model provider, instant switch',
  'settings.connected': 'Connected',
  'settings.notConnected': 'Not Connected',
  'settings.current': 'Current',
  'settings.switch': 'Switch',
  'settings.switching': 'Switching',
  'settings.configured': 'Configured',
  'settings.notConfigured': 'Not Configured',
  'settings.envConfig': 'Configure Environment',
  'settings.envConfigTitle': 'Environment Variables',
  'settings.saveConfig': 'Save Config',
  'settings.exportSettings': 'Export Settings',
  'settings.importSettings': 'Import Settings',
  'settings.exportHint': 'Export excludes API Keys; configure Keys separately after import',
  'settings.agentConfig': 'Agent Configuration',
  'settings.agentConfigDesc': 'Create and manage custom Agents',
  'settings.createAgent': 'Create Agent from Scratch',
  'settings.quickCreate': 'Quick Create',
  'settings.myAgents': 'My Agents',
  'settings.refresh': 'Refresh',
  // Chat
  'chat.needProvider': 'Chat requires an LLM Provider to be configured',
  'chat.workbenchUnaffected': 'Workbench features are unaffected',
  'chat.sendMessage': 'Send message',
  'chat.stop': 'Stop',
  // Tool status
  'tool.running': 'Running...',
  'tool.completed': 'Done',
  'tool.failed': 'Failed',
  'tool.viewSteps': 'View steps',
  'tool.collapseSteps': 'Collapse steps',
  'tool.stepsCompleted': 'steps completed',
  'tool.result': 'Result:',
  'tool.error': 'Error:',
  'tool.input': 'Input:',
  // Tray
  'tray.open': 'Open Workbench',
  'tray.quit': 'Quit',
};

const DICTS: Record<Locale, TranslationDict> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

// ============= Context =============

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'zh-CN',
  setLocale: () => {},
  t: (key: string) => key,
});

// ============= Provider =============

const STORAGE_KEY = 'opc-locale';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && (saved === 'zh-CN' || saved === 'en-US')) return saved;
    } catch { /* ignore */ }
    // 默认根据浏览器语言选择
    return navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try { localStorage.setItem(STORAGE_KEY, newLocale); } catch { /* ignore */ }
  }, []);

  const t = useCallback((key: string, fallback?: string) => {
    return DICTS[locale][key] || fallback || key;
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// ============= Hook =============

export function useI18n() {
  return useContext(I18nContext);
}

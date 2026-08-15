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
  'settings.checking': '正在检查...',
  'settings.langTitle': '语言 / Language',
  'settings.langDesc': '选择界面语言 / Select interface language',
  'settings.langZh': '简体中文',
  'settings.aboutTitle': '关于与更新',
  'settings.aboutDesc': '查看版本信息和检查更新',
  'settings.currentVersion': '当前版本：',
  'settings.updateAvailable': '新版本 v{v} 可用',
  'settings.downloading': '下载中 {p}%',
  'settings.downloaded': '已下载，可安装',
  'settings.upToDate': '已是最新版',
  'settings.downloadUpdate': '下载更新',
  'settings.installRestart': '安装并重启',
  // 数据备份
  'backup.title': '数据备份',
  'backup.export': '导出数据',
  'backup.import': '导入数据',
  'backup.hint': '备份全部业务数据（待办/进行中/倒计时/链接/番茄钟），导入默认合并',
  // 快捷笔记
  'note.titlePlaceholder': '笔记标题',
  'note.contentPlaceholder': '笔记内容（点击内容可编辑）',
  'note.empty': '暂无笔记',
  'note.pin': '置顶',
  'note.unpin': '取消置顶',
  'note.editContent': '编辑笔记内容：',
  'note.pinFailed': '置顶操作失败',
  'note.saveFailed': '保存失败',
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
  // Header
  'header.dashboard': '工作台',
  'header.settings': '设置',
  'header.themeToDark': '切换到深色模式',
  'header.themeToLight': '切换到浅色模式',
  'header.refreshModels': '刷新模型列表',
  // Sidebar
  'sidebar.dashboardEntry': '工作台',
  // ChatInput / 权限模式
  'chat.inputPlaceholder': '输入消息...',
  'chat.selectModel': '选择模型',
  'perm.default': '默认模式',
  'perm.defaultShort': '默认',
  'perm.defaultDesc': '每次操作都需要确认',
  'perm.acceptEdits': '自动编辑',
  'perm.acceptEditsShort': '自动编辑',
  'perm.acceptEditsDesc': '自动允许文件编辑操作',
  'perm.plan': '仅规划',
  'perm.planShort': '仅规划',
  'perm.planDesc': '只生成计划，不执行操作',
  'perm.bypass': '绕过权限',
  'perm.bypassShort': '绕过',
  'perm.bypassDesc': '允许所有操作，不做确认',
  // Dashboard
  'dashboard.title': '工作台',
  'dashboard.refreshAll': '全部刷新',
  'dashboard.refresh': '刷新',
  'dashboard.refreshAllTooltip': '刷新全部模块',
  'dashboard.refreshTooltip': '刷新',
  // NewChatView
  'newchat.chooseAgent': '选择一个 Agent 开始对话',
  'newchat.selectAgent': '选择 Agent',
  'newchat.workdir': '工作目录',
  'newchat.workdirOptional': '(可选)',
  'newchat.workdirPlaceholder': '例如：/Users/username/projects/my-app',
  'newchat.workdirHint': '指定 Agent 的工作目录，用于文件操作等',
  'newchat.startChat': '开始对话',
  // ChatPage 引导卡
  'chat.provider': 'Provider',
  'chat.providerNotConfigured': '未检测到有效配置',
  'chat.unknown': '未知',
  'chat.supportedProviders': '支持的 Provider：',
  'chat.providerCodebuddy': '（默认）：CODEBUDDY_API_KEY 或 CLI 登录',
  'chat.providerAnthropic': '：ANTHROPIC_API_KEY（当前免费）',
  'chat.providerOpenai': '（免费）：OPENAI_API_KEY，模型 agnes-2.0-flash',
  'chat.envSetupHint': '在',
  'chat.envSetupHint2': '文件中设置',
  'chat.envSetupHint3': '和对应 Key，然后重启服务',
  'chat.uiSetupHint': '或前往「设置」页面通过界面配置',
  // 模块 - 通用
  'module.loading': '加载中...',
  'module.empty': '暂无待办',
  'module.emptyOngoing': '暂无进行中的事项',
  'module.add': '添加',
  'module.cancel': '取消',
  'module.confirm': '确认',
  // 权限对话框
  'perm.confirm': '权限确认',
  'perm.tool': '工具：',
  'perm.bashWarning': '此操作将在您的系统上执行命令，请确认命令内容安全可信。',
  'perm.fsWarning': '此操作将修改您的文件系统，请确认操作正确。',
  'perm.allow': '允许',
  'perm.deny': '拒绝',
  'perm.dangerous': '危险操作',
  // Agent 配置对话框
  'agent.name': '名称',
  'agent.desc': '描述',
  'agent.iconColor': '图标和颜色',
  'agent.systemPrompt': '系统提示词',
  'agent.namePlaceholder': '例如：代码助手',
  'agent.descPlaceholder': '简短描述这个 Agent 的用途',
  'agent.promptPlaceholder': '定义 Agent 的行为和能力...',
  'agent.created': 'Agent 已创建',
  'agent.deleted': 'Agent 已删除',
  'agent.edit': '编辑 Agent',
  'agent.createNew': '创建新 Agent',
  'agent.saveChanges': '保存修改',
  'agent.create': '创建 Agent',
  'agent.quickCreate': '快速创建',
  'agent.createFromScratch': '从头创建 Agent',
  'agent.editTooltip': '编辑',
  // Todo 模块
  'todo.placeholder': '添加待办...',
  'todo.added': '已添加',
  'todo.addFailed': '添加失败',
  'todo.deleted': '已删除',
  'todo.deleteFailed': '删除失败',
  'todo.confirmDelete': '确定删除？',
  // Ongoing 模块
  'ongoing.titlePlaceholder': '事项标题',
  'ongoing.descPlaceholder': '描述（可选）',
  'ongoing.progressFailed': '更新进度失败',
  // Countdown 模块
  'countdown.titlePlaceholder': '事件标题',
  'countdown.datePlaceholder': '选择日期',
  'countdown.fillHint': '请填写标题和日期',
  'countdown.empty': '暂无倒计时',
  'countdown.today': '今天',
  'countdown.daysAgo': '天前',
  'countdown.daysLeft': '天后',
  // Links 模块
  'links.titlePlaceholder': '标题',
  'links.urlPlaceholder': 'https://...',
  'links.iconPlaceholder': '图标 emoji（可选）',
  'links.fillHint': '请填写标题和 URL',
  'links.empty': '暂无链接',
  // News 模块
  'news.empty': '暂无资讯',
  'news.justNow': '刚刚',
  'news.hoursAgo': '{n}小时前',
  'news.daysAgo': '{n}天前',
  // Focus 模块
  'focus.today': '今日',
  'focus.count': '次',
  'focus.total': '累计',
  'focus.minutes': '分钟',
  'focus.start': '开始专注',
  'focus.continue': '继续',
  'focus.again': '再来一轮',
  'focus.pause': '暂停',
  'focus.reset': '重置',
  'focus.doneToast': '专注完成！已记录 25 分钟',
  'focus.saveErrorToast': '记录失败，但专注已完成',
  // News 模块分类
  'news.cat.all': '全部',
  'news.cat.models': '模型',
  'news.cat.products': '产品',
  'news.cat.industry': '行业',
  'news.cat.paper': '论文',
  'news.cat.tip': '技巧',
  // 工具状态（ToolCallsCollapse 通用）
  'tool.runningState': '执行中...',
  'tool.searching': '搜索中...',
  'tool.fetching': '获取中...',
  'tool.writing': '写入中...',
  'tool.output': '输出: ',
  'tool.content': '内容: ',
  'tool.execCommand': '执行命令',
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
  'settings.checking': 'Checking...',
  'settings.langTitle': 'Language',
  'settings.langDesc': 'Select interface language',
  'settings.langZh': 'Simplified Chinese',
  'settings.aboutTitle': 'About & Updates',
  'settings.aboutDesc': 'View version info and check for updates',
  'settings.currentVersion': 'Current version: ',
  'settings.updateAvailable': 'New version v{v} available',
  'settings.downloading': 'Downloading {p}%',
  'settings.downloaded': 'Downloaded, ready to install',
  'settings.upToDate': 'Up to date',
  'settings.downloadUpdate': 'Download Update',
  'settings.installRestart': 'Install & Restart',
  // Data backup
  'backup.title': 'Data Backup',
  'backup.export': 'Export Data',
  'backup.import': 'Import Data',
  'backup.hint': 'Backs up all business data (todos/ongoing/countdowns/links/focus); import merges by default',
  // Notes
  'note.titlePlaceholder': 'Note title',
  'note.contentPlaceholder': 'Note content (click to edit)',
  'note.empty': 'No notes',
  'note.pin': 'Pin',
  'note.unpin': 'Unpin',
  'note.editContent': 'Edit note content:',
  'note.pinFailed': 'Failed to pin',
  'note.saveFailed': 'Save failed',
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
  // Header
  'header.dashboard': 'Dashboard',
  'header.settings': 'Settings',
  'header.themeToDark': 'Switch to dark mode',
  'header.themeToLight': 'Switch to light mode',
  'header.refreshModels': 'Refresh model list',
  // Sidebar
  'sidebar.dashboardEntry': 'Dashboard',
  // ChatInput / Permission modes
  'chat.inputPlaceholder': 'Type a message...',
  'chat.selectModel': 'Select model',
  'perm.default': 'Default mode',
  'perm.defaultShort': 'Default',
  'perm.defaultDesc': 'Confirm every operation',
  'perm.acceptEdits': 'Auto-edit',
  'perm.acceptEditsShort': 'Auto-edit',
  'perm.acceptEditsDesc': 'Automatically allow file edits',
  'perm.plan': 'Plan only',
  'perm.planShort': 'Plan',
  'perm.planDesc': 'Generate plan only, no execution',
  'perm.bypass': 'Bypass permissions',
  'perm.bypassShort': 'Bypass',
  'perm.bypassDesc': 'Allow all operations without confirmation',
  // Dashboard
  'dashboard.title': 'Dashboard',
  'dashboard.refreshAll': 'Refresh all',
  'dashboard.refresh': 'Refresh',
  'dashboard.refreshAllTooltip': 'Refresh all modules',
  'dashboard.refreshTooltip': 'Refresh',
  // NewChatView
  'newchat.chooseAgent': 'Choose an Agent to start chatting',
  'newchat.selectAgent': 'Select Agent',
  'newchat.workdir': 'Working directory',
  'newchat.workdirOptional': '(optional)',
  'newchat.workdirPlaceholder': 'e.g. /Users/username/projects/my-app',
  'newchat.workdirHint': 'Working directory for the Agent, used for file operations',
  'newchat.startChat': 'Start chat',
  // ChatPage guide card
  'chat.provider': 'Provider',
  'chat.providerNotConfigured': 'not properly configured',
  'chat.unknown': 'Unknown',
  'chat.supportedProviders': 'Supported Providers:',
  'chat.providerCodebuddy': ' (default): CODEBUDDY_API_KEY or CLI login',
  'chat.providerAnthropic': ': ANTHROPIC_API_KEY (currently free)',
  'chat.providerOpenai': ' (free): OPENAI_API_KEY, model agnes-2.0-flash',
  'chat.envSetupHint': 'Set',
  'chat.envSetupHint2': 'in',
  'chat.envSetupHint3': 'and the corresponding Key, then restart the service',
  'chat.uiSetupHint': 'Or configure via the Settings page',
  // Modules - common
  'module.loading': 'Loading...',
  'module.empty': 'No todos',
  'module.emptyOngoing': 'No ongoing items',
  'module.add': 'Add',
  'module.cancel': 'Cancel',
  'module.confirm': 'Confirm',
  // Permission dialog
  'perm.confirm': 'Permission Request',
  'perm.tool': 'Tool:',
  'perm.bashWarning': 'This operation will execute a command on your system. Please confirm the command is safe.',
  'perm.fsWarning': 'This operation will modify your file system. Please confirm it is correct.',
  'perm.allow': 'Allow',
  'perm.deny': 'Deny',
  'perm.dangerous': 'Dangerous operation',
  // Agent config dialog
  'agent.name': 'Name',
  'agent.desc': 'Description',
  'agent.iconColor': 'Icon and color',
  'agent.systemPrompt': 'System prompt',
  'agent.namePlaceholder': 'e.g. Code Assistant',
  'agent.descPlaceholder': 'Briefly describe the purpose of this Agent',
  'agent.promptPlaceholder': 'Define the behavior and capabilities of the Agent...',
  'agent.created': 'Agent created',
  'agent.deleted': 'Agent deleted',
  'agent.edit': 'Edit Agent',
  'agent.createNew': 'Create New Agent',
  'agent.saveChanges': 'Save Changes',
  'agent.create': 'Create Agent',
  'agent.quickCreate': 'Quick Create',
  'agent.createFromScratch': 'Create Agent from Scratch',
  'agent.editTooltip': 'Edit',
  // Todo module
  'todo.placeholder': 'Add a todo...',
  'todo.added': 'Added',
  'todo.addFailed': 'Add failed',
  'todo.deleted': 'Deleted',
  'todo.deleteFailed': 'Delete failed',
  'todo.confirmDelete': 'Delete this item?',
  // Ongoing module
  'ongoing.titlePlaceholder': 'Item title',
  'ongoing.descPlaceholder': 'Description (optional)',
  'ongoing.progressFailed': 'Failed to update progress',
  // Countdown module
  'countdown.titlePlaceholder': 'Event title',
  'countdown.datePlaceholder': 'Select date',
  'countdown.fillHint': 'Please enter title and date',
  'countdown.empty': 'No countdowns',
  'countdown.today': 'Today',
  'countdown.daysAgo': 'days ago',
  'countdown.daysLeft': 'days left',
  // Links module
  'links.titlePlaceholder': 'Title',
  'links.urlPlaceholder': 'https://...',
  'links.iconPlaceholder': 'Icon emoji (optional)',
  'links.fillHint': 'Please enter title and URL',
  'links.empty': 'No links',
  // News module
  'news.empty': 'No news',
  'news.justNow': 'Just now',
  'news.hoursAgo': '{n}h ago',
  'news.daysAgo': '{n}d ago',
  // Focus module
  'focus.today': 'Today',
  'focus.count': '',
  'focus.total': 'Total',
  'focus.minutes': 'min',
  'focus.start': 'Start focus',
  'focus.continue': 'Continue',
  'focus.again': 'One more round',
  'focus.pause': 'Pause',
  'focus.reset': 'Reset',
  'focus.doneToast': 'Focus complete! 25 minutes recorded',
  'focus.saveErrorToast': 'Save failed, but focus completed',
  // News categories
  'news.cat.all': 'All',
  'news.cat.models': 'Models',
  'news.cat.products': 'Products',
  'news.cat.industry': 'Industry',
  'news.cat.paper': 'Papers',
  'news.cat.tip': 'Tips',
  // Tool status (ToolCallsCollapse common)
  'tool.runningState': 'Running...',
  'tool.searching': 'Searching...',
  'tool.fetching': 'Fetching...',
  'tool.writing': 'Writing...',
  'tool.output': 'Output: ',
  'tool.content': 'Content: ',
  'tool.execCommand': 'Execute command',
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

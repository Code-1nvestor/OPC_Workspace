import express from "express";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import * as db from "./db.js";
import todosRouter from "./routes/todos.js";
import ongoingRouter from "./routes/ongoing.js";
import countdownsRouter from "./routes/countdowns.js";
import linksRouter from "./routes/links.js";
import newsRouter from "./routes/news.js";
import focusRouter from "./routes/focus.js";
import { getProvider, getAvailableProviders, resetProviderCache } from "./providers/index.js";

interface PendingPermission {
  resolve: (result: { behavior: 'allow' | 'deny'; message?: string }) => void;
  toolName: string;
  input: Record<string, unknown>;
  sessionId: string;
  timestamp: number;
}

const pendingPermissions = new Map<string, PendingPermission>();
const PERMISSION_TIMEOUT = 5 * 60 * 1000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ============= OPC 工作台路由 =============
app.use('/api/todos', todosRouter);
app.use('/api/ongoing', ongoingRouter);
app.use('/api/countdowns', countdownsRouter);
app.use('/api/links', linksRouter);
app.use('/api/news', newsRouter);
app.use('/api/focus', focusRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============= Provider 状态 =============

app.get("/api/providers", async (req, res) => {
  try {
    const providers = await getAvailableProviders();
    res.json({ providers, current: process.env.LLM_PROVIDER || 'codebuddy' });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "获取 Provider 列表失败" });
  }
});

app.post("/api/providers/switch", (req, res) => {
  const { provider } = req.body;
  const valid = ['codebuddy', 'anthropic', 'openai'];
  if (!valid.includes(provider)) {
    return res.status(400).json({ error: `无效的 provider，支持: ${valid.join(', ')}` });
  }
  process.env.LLM_PROVIDER = provider;
  resetProviderCache();
  res.json({ success: true, provider, message: `已切换到 ${provider}` });
});

// ============= 登录检测（兼容原接口） =============

app.get("/api/check-login", async (req, res) => {
  const provider = getProvider();
  try {
    const available = await provider.isAvailable();
    res.json({
      isLoggedIn: available,
      method: provider.id,
      providerId: provider.id,
      providerName: provider.name,
    });
  } catch (error: any) {
    res.json({
      isLoggedIn: false,
      method: 'none',
      providerId: provider.id,
      providerName: provider.name,
      error: error?.message,
    });
  }
});

// ============= 环境变量配置 =============

app.post("/api/save-env-config", (req, res) => {
  const { apiKey, authToken, internetEnv, baseUrl, llmProvider,
          anthropicApiKey, anthropicBaseUrl, anthropicModel,
          openaiApiKey, openaiBaseUrl, openaiModel } = req.body;

  const configuredVars: string[] = [];

  // CodeBuddy 配置
  if (apiKey) { process.env.CODEBUDDY_API_KEY = apiKey; configuredVars.push('CODEBUDDY_API_KEY'); }
  if (authToken) { process.env.CODEBUDDY_AUTH_TOKEN = authToken; configuredVars.push('CODEBUDDY_AUTH_TOKEN'); }
  if (internetEnv) { process.env.CODEBUDDY_INTERNET_ENVIRONMENT = internetEnv; configuredVars.push('CODEBUDDY_INTERNET_ENVIRONMENT'); }
  if (baseUrl) { process.env.CODEBUDDY_BASE_URL = baseUrl; configuredVars.push('CODEBUDDY_BASE_URL'); }

  // Provider 选择
  if (llmProvider) { process.env.LLM_PROVIDER = llmProvider; configuredVars.push('LLM_PROVIDER'); }

  // Anthropic 配置
  if (anthropicApiKey) { process.env.ANTHROPIC_API_KEY = anthropicApiKey; configuredVars.push('ANTHROPIC_API_KEY'); }
  if (anthropicBaseUrl) { process.env.ANTHROPIC_BASE_URL = anthropicBaseUrl; configuredVars.push('ANTHROPIC_BASE_URL'); }
  if (anthropicModel) { process.env.ANTHROPIC_MODEL = anthropicModel; configuredVars.push('ANTHROPIC_MODEL'); }

  // OpenAI/Agnes 配置
  if (openaiApiKey) { process.env.OPENAI_API_KEY = openaiApiKey; configuredVars.push('OPENAI_API_KEY'); }
  if (openaiBaseUrl) { process.env.OPENAI_BASE_URL = openaiBaseUrl; configuredVars.push('OPENAI_BASE_URL'); }
  if (openaiModel) { process.env.OPENAI_MODEL = openaiModel; configuredVars.push('OPENAI_MODEL'); }

  resetProviderCache();
  res.json({
    success: true,
    message: `已设置: ${configuredVars.join(', ')}`,
    note: '环境变量仅在当前服务器进程有效，重启后需要重新设置',
  });
});

// ============= 模型列表 =============

app.get("/api/models", async (req, res) => {
  try {
    const provider = getProvider();
    const models = await provider.getModels();
    const defaultModel = models[0]?.modelId || 'default';
    res.json({ models, defaultModel, providerId: provider.id, providerName: provider.name });
  } catch (error: any) {
    res.json({
      models: [{ modelId: "default", name: "默认模型" }],
      defaultModel: "default",
      error: error?.message || String(error),
    });
  }
});

// ============= 会话管理 =============

app.get("/api/sessions", (req, res) => {
  try {
    const sessions = db.getAllSessions();
    const sessionsWithMessages = sessions.map(session => ({ ...session, messageCount: db.getMessagesBySession(session.id).length }));
    res.json({ sessions: sessionsWithMessages });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "获取会话失败" });
  }
});

app.get("/api/sessions/:sessionId", (req, res) => {
  try {
    const session = db.getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "会话不存在" });
    const messages = db.getMessagesBySession(req.params.sessionId);
    const parsedMessages = messages.map(msg => ({ ...msg, tool_calls: msg.tool_calls ? JSON.parse(msg.tool_calls) : null }));
    res.json({ session, messages: parsedMessages });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "获取会话失败" });
  }
});

app.post("/api/sessions", (req, res) => {
  try {
    const { model = "default", title = "新对话" } = req.body;
    const now = new Date().toISOString();
    const session = db.createSession({ id: uuidv4(), title, model, sdk_session_id: null, created_at: now, updated_at: now });
    res.json({ session });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "创建会话失败" });
  }
});

app.patch("/api/sessions/:sessionId", (req, res) => {
  try {
    const success = db.updateSession(req.params.sessionId, req.body);
    if (!success) return res.status(404).json({ error: "会话不存在" });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "更新会话失败" });
  }
});

app.delete("/api/sessions/:sessionId", (req, res) => {
  try {
    const success = db.deleteSession(req.params.sessionId);
    if (!success) return res.status(404).json({ error: "会话不存在" });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "删除会话失败" });
  }
});

// ============= 权限响应 =============

app.post("/api/permission-response", (req, res) => {
  const { requestId, behavior, message } = req.body;
  const pending = pendingPermissions.get(requestId);
  if (!pending) return res.status(404).json({ error: "权限请求不存在或已超时" });
  pendingPermissions.delete(requestId);
  if (behavior === 'allow') {
    pending.resolve({ behavior: 'allow' });
  } else {
    pending.resolve({ behavior: 'deny', message: message || '用户拒绝了此操作' });
  }
  res.json({ success: true });
});

// ============= 聊天接口（核心改造） =============

app.post("/api/chat", async (req, res) => {
  const { sessionId, message, model, systemPrompt, cwd, permissionMode } = req.body;
  if (!message) return res.status(400).json({ error: "消息不能为空" });

  let session = sessionId ? db.getSession(sessionId) : null;
  const now = new Date().toISOString();

  if (!session) {
    session = db.createSession({
      id: sessionId || uuidv4(),
      title: message.slice(0, 30) + (message.length > 30 ? '...' : ''),
      model: model || 'default',
      sdk_session_id: null,
      created_at: now,
      updated_at: now
    });
  }

  const selectedModel = model || session.model;
  const userMessageId = uuidv4();
  const assistantMessageId = uuidv4();

  try {
    db.createMessage({ id: userMessageId, session_id: session.id, role: 'user', content: message, model: null, created_at: now, tool_calls: null });
  } catch (dbError: any) {
    return res.status(500).json({ error: "保存消息失败", detail: dbError?.message });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // 获取历史消息（用于非 CodeBuddy Provider 的多轮上下文）
  const dbMessages = db.getMessagesBySession(session.id);
  const history = dbMessages
    .filter(m => m.id !== userMessageId)
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // 权限回调
  const requestPermission = async (toolName: string, input: Record<string, unknown>, toolUseId?: string) => {
    if (permissionMode === 'bypassPermissions') {
      return { behavior: 'allow' as const };
    }
    const requestId = uuidv4();
    res.write(`data: ${JSON.stringify({ type: "permission_request", requestId, toolUseId: toolUseId || '', toolName, input, sessionId: session.id, timestamp: Date.now() })}\n\n`);
    return new Promise<{ behavior: 'allow' | 'deny'; message?: string }>((resolve) => {
      const pending: PendingPermission = { resolve, toolName, input, sessionId: session.id, timestamp: Date.now() };
      pendingPermissions.set(requestId, pending);
      setTimeout(() => {
        if (pendingPermissions.has(requestId)) {
          pendingPermissions.delete(requestId);
          resolve({ behavior: 'deny', message: '权限请求超时' });
        }
      }, PERMISSION_TIMEOUT);
    });
  };

  try {
    const provider = getProvider();

    let fullResponse = "";
    let toolCalls: Array<{ id: string; name: string; input?: Record<string, unknown>; status: string; result?: string; isError?: boolean }> = [];
    let newSdkSessionId: string | null = null;

    res.write(`data: ${JSON.stringify({ type: "init", sessionId: session.id, userMessageId, assistantMessageId, model: selectedModel })}\n\n`);

    for await (const event of provider.streamChat({
      message,
      history,
      model: selectedModel,
      systemPrompt,
      cwd,
      permissionMode,
      sdkSessionId: session.sdk_session_id,
      requestPermission,
    })) {
      switch (event.type) {
        case 'init':
          if (event.sessionId && event.sessionId !== session.sdk_session_id) {
            newSdkSessionId = event.sessionId;
            db.updateSession(session.id, { sdk_session_id: event.sessionId });
          }
          break;

        case 'text':
          fullResponse += event.content;
          res.write(`data: ${JSON.stringify({ type: "text", content: event.content })}\n\n`);
          break;

        case 'tool':
          toolCalls.push({ id: event.id, name: event.name, input: event.input, status: "running" });
          res.write(`data: ${JSON.stringify({ type: "tool", id: event.id, name: event.name, input: event.input, status: "running" })}\n\n`);
          break;

        case 'tool_result': {
          const tool = toolCalls.find(t => t.id === event.toolId);
          if (tool) {
            tool.status = event.isError ? "error" : "completed";
            tool.isError = event.isError;
            tool.result = event.content;
          }
          res.write(`data: ${JSON.stringify({ type: "tool_result", toolId: event.toolId, content: event.content, isError: event.isError })}\n\n`);
          break;
        }

        case 'permission_request':
          // 已经在 requestPermission 回调中处理了 SSE 推送
          break;

        case 'done':
          // 标记所有 running 的工具为 completed
          toolCalls.forEach(tool => {
            if (tool.status === "running") {
              tool.status = "completed";
              res.write(`data: ${JSON.stringify({ type: "tool_result", toolId: tool.id, content: tool.result || "已完成" })}\n\n`);
            }
          });
          res.write(`data: ${JSON.stringify({ type: "done", duration: event.duration, cost: event.cost })}\n\n`);
          break;

        case 'error':
          res.write(`data: ${JSON.stringify({ type: "error", message: event.message })}\n\n`);
          break;
      }
    }

    // 保存 assistant 消息
    db.createMessage({
      id: assistantMessageId,
      session_id: session.id,
      role: 'assistant',
      content: fullResponse,
      model: selectedModel,
      created_at: new Date().toISOString(),
      tool_calls: toolCalls.length > 0 ? JSON.stringify(toolCalls) : null,
    });

    // 更新会话标题（首条消息时）
    const messages = db.getMessagesBySession(session.id);
    if (messages.length <= 2) {
      db.updateSession(session.id, {
        title: message.slice(0, 30) + (message.length > 30 ? '...' : ''),
        model: selectedModel,
      });
    }

    res.end();
  } catch (error: any) {
    const errorMessage = error?.message || "处理请求时发生错误";
    res.write(`data: ${JSON.stringify({ type: "error", message: errorMessage })}\n\n`);
    res.end();
  }
});

// ============= 生产模式静态托管（Electron 内嵌时） =============
if (process.env.OPC_EMBEDDED === '1') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// ============= 服务启动 =============

export { closeDb } from './db.js';

export function startServer(port?: number) {
  const listenPort =
    typeof port === 'number' ? port : Number(process.env.PORT) || 3000;
  const server = app.listen(listenPort, () => {
    const addr = server.address();
    const actualPort = typeof addr === 'object' && addr ? addr.port : listenPort;
    const providerName = getProvider().name;
    console.log(`\n  API server started at http://localhost:${actualPort}\n  Database: SQLite (${process.env.OPC_DB_PATH || 'data/opc.db'})\n  LLM Provider: ${providerName}\n`);
  });
  return server;
}

const isMain = import.meta.url === `file://${process.argv[1]}` || process.env.OPC_DIRECT_RUN === '1';
if (isMain) {
  startServer();
}

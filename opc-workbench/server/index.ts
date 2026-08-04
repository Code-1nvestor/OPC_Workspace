import express from "express";
import { query, unstable_v2_createSession, unstable_v2_authenticate, PermissionResult, CanUseTool } from "@tencent-ai/agent-sdk";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";
import * as db from "./db.js";
import todosRouter from "./routes/todos.js";
import ongoingRouter from "./routes/ongoing.js";
import countdownsRouter from "./routes/countdowns.js";
import linksRouter from "./routes/links.js";
import newsRouter from "./routes/news.js";
import focusRouter from "./routes/focus.js";

const execAsync = promisify(exec);

interface PendingPermission {
  resolve: (result: PermissionResult) => void;
  reject: (error: Error) => void;
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

let cachedModels: Array<{ modelId: string; name: string; description?: string }> = [];
const defaultModel = "claude-sonnet-4";

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

type LoginMethod = 'env' | 'cli' | 'none';

interface LoginStatusResponse {
  isLoggedIn: boolean;
  method?: LoginMethod;
  envConfigured?: boolean;
  cliConfigured?: boolean;
  error?: string;
  apiKey?: string;
  envVars?: {
    apiKey?: string;
    authToken?: string;
    internetEnv?: string;
    baseUrl?: string;
  };
}

app.get("/api/check-login", async (req, res) => {
  const response: LoginStatusResponse = {
    isLoggedIn: false,
    envConfigured: false,
    cliConfigured: false,
    envVars: {},
  };

  const apiKey = process.env.CODEBUDDY_API_KEY;
  const authToken = process.env.CODEBUDDY_AUTH_TOKEN;
  const internetEnv = process.env.CODEBUDDY_INTERNET_ENVIRONMENT;
  const baseUrl = process.env.CODEBUDDY_BASE_URL;

  if (apiKey || authToken) {
    response.envConfigured = true;
    if (apiKey) {
      response.envVars!.apiKey = apiKey.slice(0, 8) + '****' + apiKey.slice(-4);
      response.apiKey = response.envVars!.apiKey;
    }
    if (authToken) {
      response.envVars!.authToken = authToken.slice(0, 8) + '****' + authToken.slice(-4);
    }
    if (internetEnv) {
      response.envVars!.internetEnv = internetEnv;
    }
    if (baseUrl) {
      response.envVars!.baseUrl = baseUrl;
    }
  }

  try {
    let needsLogin = false;
    const result = await unstable_v2_authenticate({
      environment: 'external',
      onAuthUrl: async (authState) => {
        needsLogin = true;
        console.log('[Check Login] needs login, auth URL:', authState.authUrl);
        response.error = '未登录，请先登录 CodeBuddy CLI';
      }
    });

    if (!needsLogin && result?.userinfo) {
      response.isLoggedIn = true;
      response.cliConfigured = true;
      response.method = response.envConfigured ? 'env' : 'cli';
      console.log('[Check Login] logged in user:', result.userinfo.userName);
    } else if (!needsLogin) {
      response.isLoggedIn = true;
      response.cliConfigured = true;
      response.method = response.envConfigured ? 'env' : 'cli';
    }
  } catch (error: any) {
    console.error("[Check Login] SDK Error:", error);
    if (response.envConfigured) {
      response.isLoggedIn = true;
      response.method = 'env';
    } else {
      response.error = error?.message || String(error);
      response.method = 'none';
    }
  }

  res.json(response);
});

app.post("/api/save-env-config", (req, res) => {
  const { apiKey, authToken, internetEnv, baseUrl } = req.body;
  if (!apiKey && !authToken) {
    return res.status(400).json({ error: '请至少配置 API Key 或 Auth Token' });
  }
  const configuredVars: string[] = [];
  if (apiKey) { process.env.CODEBUDDY_API_KEY = apiKey; configuredVars.push('CODEBUDDY_API_KEY'); }
  if (authToken) { process.env.CODEBUDDY_AUTH_TOKEN = authToken; configuredVars.push('CODEBUDDY_AUTH_TOKEN'); }
  if (internetEnv) { process.env.CODEBUDDY_INTERNET_ENVIRONMENT = internetEnv; configuredVars.push('CODEBUDDY_INTERNET_ENVIRONMENT'); }
  if (baseUrl) { process.env.CODEBUDDY_BASE_URL = baseUrl; configuredVars.push('CODEBUDDY_BASE_URL'); }
  cachedModels = [];
  res.json({ success: true, message: `已设置: ${configuredVars.join(', ')}`, note: '环境变量仅在当前服务器进程有效，重启后需要重新设置' });
});

app.get("/api/models", async (req, res) => {
  try {
    if (cachedModels.length === 0) {
      const session = await unstable_v2_createSession({ cwd: process.cwd() });
      const models = await session.getAvailableModels();
      if (models && Array.isArray(models)) cachedModels = models;
    }
    res.json({ models: cachedModels.length > 0 ? cachedModels : [{ modelId: "claude-sonnet-4", name: "Claude Sonnet 4" }], defaultModel });
  } catch (error: any) {
    res.json({ models: [{ modelId: "claude-sonnet-4", name: "Claude Sonnet 4" }, { modelId: "claude-opus-4", name: "Claude Opus 4" }], defaultModel, error: error?.message || String(error) });
  }
});

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
    const { model = defaultModel, title = "新对话" } = req.body;
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

app.post("/api/permission-response", (req, res) => {
  const { requestId, behavior, message } = req.body;
  const pending = pendingPermissions.get(requestId);
  if (!pending) return res.status(404).json({ error: "权限请求不存在或已超时" });
  pendingPermissions.delete(requestId);
  if (behavior === 'allow') {
    pending.resolve({ behavior: 'allow', updatedInput: pending.input });
  } else {
    pending.resolve({ behavior: 'deny', message: message || '用户拒绝了此操作' });
  }
  res.json({ success: true });
});

app.post("/api/chat", async (req, res) => {
  const { sessionId, message, model, systemPrompt, cwd, permissionMode } = req.body;
  if (!message) return res.status(400).json({ error: "消息不能为空" });

  let session = sessionId ? db.getSession(sessionId) : null;
  const now = new Date().toISOString();

  if (!session) {
    session = db.createSession({
      id: sessionId || uuidv4(),
      title: message.slice(0, 30) + (message.length > 30 ? '...' : ''),
      model: model || defaultModel,
      sdk_session_id: null,
      created_at: now,
      updated_at: now
    });
  }

  const selectedModel = model || session.model;
  const sdkSessionId = session.sdk_session_id;
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

  const defaultSystemPrompt = "你是一个专业的AI助手，善于帮助用户解决各种问题。请用简洁清晰的方式回答问题。";
  const workingDir = cwd || process.cwd();

  try {
    const canUseTool: CanUseTool = async (toolName, input, options) => {
      if (permissionMode === 'bypassPermissions') return { behavior: 'allow', updatedInput: input };
      const requestId = uuidv4();
      res.write(`data: ${JSON.stringify({ type: "permission_request", requestId, toolUseId: options.toolUseID, toolName, input, sessionId: session.id, timestamp: Date.now() })}\n\n`);
      return new Promise<PermissionResult>((resolve) => {
        const pending: PendingPermission = { resolve, reject: () => {}, toolName, input, sessionId: session.id, timestamp: Date.now() };
        pendingPermissions.set(requestId, pending);
        setTimeout(() => { if (pendingPermissions.has(requestId)) { pendingPermissions.delete(requestId); resolve({ behavior: 'deny', message: '权限请求超时' }); } }, PERMISSION_TIMEOUT);
      });
    };

    const stream = query({
      prompt: message,
      options: {
        cwd: workingDir,
        model: selectedModel,
        maxTurns: 10,
        systemPrompt: systemPrompt || defaultSystemPrompt,
        permissionMode: permissionMode || 'default',
        canUseTool,
        ...(sdkSessionId ? { resume: sdkSessionId } : {})
      }
    });

    let fullResponse = "";
    let toolCalls: Array<{ id: string; name: string; input?: Record<string, unknown>; status: string; result?: string; isError?: boolean }> = [];
    let newSdkSessionId: string | null = null;
    let currentToolId: string | null = null;

    res.write(`data: ${JSON.stringify({ type: "init", sessionId: session.id, userMessageId, assistantMessageId, model: selectedModel })}\n\n`);

    for await (const msg of stream) {
      if (msg.type === "system" && (msg as any).subtype === "init") {
        newSdkSessionId = (msg as any).session_id;
        if (newSdkSessionId && newSdkSessionId !== sdkSessionId) {
          db.updateSession(session.id, { sdk_session_id: newSdkSessionId });
        }
      } else if (msg.type === "assistant") {
        const content = msg.message.content;
        if (typeof content === "string") {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ type: "text", content })}\n\n`);
        } else if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "text") {
              fullResponse += block.text;
              res.write(`data: ${JSON.stringify({ type: "text", content: block.text })}\n\n`);
            } else if (block.type === "tool_use") {
              currentToolId = block.id || uuidv4();
              const toolInput = (block as any).input || {};
              const toolCall = { id: currentToolId, name: block.name, input: toolInput, status: "running" };
              toolCalls.push(toolCall);
              res.write(`data: ${JSON.stringify({ type: "tool", id: toolCall.id, name: toolCall.name, input: toolCall.input, status: toolCall.status })}\n\n`);
            }
          }
        }
      } else if ((msg as any).type === "tool_result") {
        const msgAny = msg as any;
        const toolId = msgAny.tool_use_id || currentToolId;
        const isError = msgAny.is_error || false;
        const content = msgAny.content;
        const tool = toolCalls.find(t => t.id === toolId) || toolCalls[toolCalls.length - 1];
        if (tool) {
          tool.status = isError ? "error" : "completed";
          tool.isError = isError;
          tool.result = typeof content === 'string' ? content : JSON.stringify(content);
          res.write(`data: ${JSON.stringify({ type: "tool_result", toolId: tool.id, content: tool.result, isError })}\n\n`);
        }
        currentToolId = null;
      } else if (msg.type === "result") {
        toolCalls.forEach(tool => {
          if (tool.status === "running") {
            tool.status = "completed";
            res.write(`data: ${JSON.stringify({ type: "tool_result", toolId: tool.id, content: tool.result || "已完成" })}\n\n`);
          }
        });
        res.write(`data: ${JSON.stringify({ type: "done", duration: (msg as any).duration, cost: (msg as any).cost })}\n\n`);
      }
    }

    db.createMessage({ id: assistantMessageId, session_id: session.id, role: 'assistant', content: fullResponse, model: selectedModel, created_at: new Date().toISOString(), tool_calls: toolCalls.length > 0 ? JSON.stringify(toolCalls) : null });

    const messages = db.getMessagesBySession(session.id);
    if (messages.length <= 2) {
      db.updateSession(session.id, { title: message.slice(0, 30) + (message.length > 30 ? '...' : ''), model: selectedModel });
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
  // SPA fallback：所有非 API 路由返回 index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// ============= 服务启动 =============

export function startServer(port?: number) {
  const listenPort = port || Number(process.env.PORT) || 3000;
  const server = app.listen(listenPort, () => {
    console.log(`\n  API server started at http://localhost:${listenPort}\n  Database: SQLite (${process.env.OPC_DB_PATH || 'data/opc.db'})\n`);
  });
  return server;
}

// 直接运行时自动启动（非 Electron 内嵌 import）
const isMain = import.meta.url === `file://${process.argv[1]}` || process.env.OPC_DIRECT_RUN === '1';
if (isMain) {
  startServer();
}

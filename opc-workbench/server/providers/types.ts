/**
 * Provider 统一接口定义
 *
 * 所有 LLM 提供方（CodeBuddy / Anthropic / OpenAI）实现同一套接口，
 * /api/chat 根据配置路由到对应 Provider，前端 SSE 格式保持不变。
 */

// ============= 统一事件类型（与前端 SSE 完全兼容） =============

export type ChatEvent =
  | { type: 'init'; sessionId: string; model: string }
  | { type: 'text'; content: string }
  | { type: 'tool'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolId: string; content: string; isError: boolean }
  | { type: 'permission_request'; requestId: string; toolUseId: string; toolName: string; input: Record<string, unknown>; sessionId: string; timestamp: number }
  | { type: 'done'; duration?: number; cost?: unknown }
  | { type: 'error'; message: string };

// ============= 聊天参数 =============

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatParams {
  /** 用户消息 */
  message: string;
  /** 历史消息（不含当前消息，用于多轮上下文） */
  history?: ChatMessage[];
  /** 模型 ID */
  model: string;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 工作目录（CodeBuddy 专用） */
  cwd?: string;
  /** 权限模式 */
  permissionMode?: string;
  /** SDK session ID（CodeBuddy 专用，用于恢复会话） */
  sdkSessionId?: string | null;
  /** 权限回调（CodeBuddy 专用） */
  requestPermission?: (toolName: string, input: Record<string, unknown>, toolUseId?: string) => Promise<{ behavior: 'allow' | 'deny'; message?: string }>;
}

// ============= 模型信息 =============

export interface ProviderModel {
  modelId: string;
  name: string;
  description?: string;
}

// ============= Provider 接口 =============

export interface ChatProvider {
  /** Provider 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 检查是否已配置（API Key / CLI 登录等） */
  isAvailable(): Promise<boolean>;
  /** 获取可用模型列表 */
  getModels(): Promise<ProviderModel[]>;
  /** 流式聊天，返回统一事件流 */
  streamChat(params: ChatParams): AsyncIterable<ChatEvent>;
}

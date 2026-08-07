/**
 * OpenAI 兼容 Provider
 *
 * 适配 Agnes AI（https://apihub.agnes-ai.com/v1）及其他 OpenAI 兼容 API。
 * 认证: Authorization: Bearer YOUR_API_KEY
 * 端点: POST /v1/chat/completions
 *
 * 支持：流式输出、多轮上下文、function calling 工具调用。
 * 免费模型 agnes-2.0-flash，512K 上下文，$0/1M tokens。
 */

import { v4 as uuidv4 } from 'uuid';
import type { ChatProvider, ChatEvent, ChatParams, ProviderModel } from './types';

// ============= 内置工具定义 =============

interface ToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

const BUILTIN_TOOLS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'get_todos',
      description: '获取当前所有待办事项列表',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_todo',
      description: '创建一条新的待办事项',
      parameters: {
        type: 'object',
        properties: { title: { type: 'string', description: '待办标题' } },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_ongoing',
      description: '获取进行中的事项列表',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_countdowns',
      description: '获取重要日期倒计时列表',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_news',
      description: '获取 AI 行业最新资讯',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: '分类: all/ai-models/ai-products/industry/paper/tip' },
        },
      },
    },
  },
];

// ============= Provider 实现 =============

export class OpenAIProvider implements ChatProvider {
  id = 'openai';
  name = 'OpenAI 兼容 / Agnes';

  private get baseUrl(): string {
    return process.env.OPENAI_BASE_URL || 'https://apihub.agnes-ai.com/v1';
  }

  private get apiKey(): string {
    return process.env.OPENAI_API_KEY || '';
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async getModels(): Promise<ProviderModel[]> {
    const modelStr = process.env.OPENAI_MODEL || 'agnes-2.0-flash';
    return [{ modelId: modelStr, name: modelStr, description: 'Agnes（免费）' }];
  }

  async *streamChat(params: ChatParams): AsyncIterable<ChatEvent> {
    const { message, history = [], model, systemPrompt, requestPermission } = params;

    if (!this.apiKey) {
      yield { type: 'error', message: '未配置 OPENAI_API_KEY' };
      return;
    }

    const selectedModel = model || process.env.OPENAI_MODEL || 'agnes-2.0-flash';
    yield { type: 'init', sessionId: '', model: selectedModel };

    // 构建消息列表（OpenAI 格式）
    const messages: Array<Record<string, unknown>> = [];

    const sysPrompt = systemPrompt || '你是一个专业的AI助手，善于帮助用户解决各种问题。请用简洁清晰的方式回答问题。';
    messages.push({ role: 'system', content: sysPrompt });

    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: 'user', content: message });

    // 工具执行循环（最多 5 轮，防死循环）
    const maxRounds = 5;

    for (let round = 0; round < maxRounds; round++) {
      const body: Record<string, unknown> = {
        model: selectedModel,
        messages,
        stream: true,
        tools: BUILTIN_TOOLS,
        tool_choice: 'auto',
      };

      // 流式请求 + 实时 yield 文本
      const result = yield* this.fetchStreamAndYield(body);

      if (result.error) {
        yield { type: 'error', message: result.error };
        return;
      }

      // 没有工具调用 -> 流式输出已完成，结束
      if (!result.toolCalls || result.toolCalls.length === 0) {
        yield { type: 'done' };
        return;
      }

      // 有工具调用 -> 将 assistant 消息加入 messages
      messages.push({
        role: 'assistant',
        content: result.fullText || null,
        tool_calls: result.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: tc.arguments },
        })),
      });

      // 逐个执行工具
      for (const tc of result.toolCalls) {
        let parsedInput: Record<string, unknown> = {};
        try { parsedInput = tc.arguments ? JSON.parse(tc.arguments) : {}; } catch { /* 空 */ }

        yield { type: 'tool', id: tc.id, name: tc.name, input: parsedInput };

        // 权限检查
        if (requestPermission) {
          const permResult = await requestPermission(tc.name, parsedInput, tc.id);
          if (permResult.behavior === 'deny') {
            yield { type: 'tool_result', toolId: tc.id, content: permResult.message || '用户拒绝了此操作', isError: true };
            messages.push({ role: 'tool', tool_call_id: tc.id, content: permResult.message || '用户拒绝了此操作' });
            continue;
          }
        }

        // 执行工具
        const toolResult = await this.executeTool(tc.name, parsedInput);
        yield { type: 'tool_result', toolId: tc.id, content: toolResult, isError: false };
        messages.push({ role: 'tool', tool_call_id: tc.id, content: toolResult });
      }
      // 继续循环，让模型基于工具结果继续回复
    }

    yield { type: 'done' };
  }

  // ============= 流式请求（实时 yield 文本） =============

  private async *fetchStreamAndYield(
    body: Record<string, unknown>
  ): AsyncGenerator<ChatEvent, {
    fullText: string;
    toolCalls: Array<{ id: string; name: string; arguments: string }>;
    error?: string;
  }, void> {
    const textChunks: string[] = [];
    const toolCallMap = new Map<number, { id: string; name: string; arguments: string }>();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const resp = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        return {
          fullText: '',
          toolCalls: [],
          error: `API 错误 ${resp.status}: ${errText || resp.statusText}`,
        };
      }

      const reader = resp.body?.getReader();
      if (!reader) {
        return { fullText: '', toolCalls: [], error: '无法读取响应流' };
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr || dataStr === '[DONE]') continue;

          try {
            const data = JSON.parse(dataStr);
            const choices = data.choices;
            if (!choices || choices.length === 0) continue;

            const delta = choices[0].delta;
            if (!delta) continue;

            // 文本内容 -> 实时 yield
            if (delta.content) {
              textChunks.push(delta.content);
              yield { type: 'text', content: delta.content };
            }

            // 工具调用 -> 累积
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallMap.has(idx)) {
                  toolCallMap.set(idx, {
                    id: tc.id || uuidv4(),
                    name: tc.function?.name || '',
                    arguments: tc.function?.arguments || '',
                  });
                } else {
                  const existing = toolCallMap.get(idx)!;
                  if (tc.function?.name) existing.name = tc.function.name;
                  if (tc.function?.arguments) existing.arguments += tc.function.arguments;
                  if (tc.id) existing.id = tc.id;
                }
              }
            }
          } catch {
            // 忽略 JSON 解析错误
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { fullText: '', toolCalls: [], error: '请求超时（2 分钟）' };
      }
      return { fullText: '', toolCalls: [], error: error?.message || '请求失败' };
    }

    return {
      fullText: textChunks.join(''),
      toolCalls: Array.from(toolCallMap.values()),
    };
  }

  // ============= 工具执行 =============

  private async executeTool(name: string, args: Record<string, unknown>): Promise<string> {
    try {
      const db = await import('../db.js');

      switch (name) {
        case 'get_todos': {
          return JSON.stringify(db.getAllTodos());
        }
        case 'create_todo': {
          const title = String(args.title || '');
          if (!title) return JSON.stringify({ error: 'title 不能为空' });
          const now = new Date().toISOString();
          const todo = db.createTodo({
            id: uuidv4(), title, note: null, done: 0, created_at: now, updated_at: now,
          });
          return JSON.stringify({ success: true, todo });
        }
        case 'get_ongoing': {
          return JSON.stringify(db.getAllOngoing());
        }
        case 'get_countdowns': {
          return JSON.stringify(db.getAllCountdowns());
        }
        case 'get_news': {
          const category = String(args.category || 'all');
          const resp = await fetch(`http://localhost:${process.env.PORT || 3000}/api/news?category=${category}&since=24`);
          const data = await resp.json();
          return JSON.stringify(data.items || []);
        }
        default:
          return JSON.stringify({ error: `未知工具: ${name}` });
      }
    } catch (error: any) {
      return JSON.stringify({ error: error?.message || '工具执行失败' });
    }
  }
}

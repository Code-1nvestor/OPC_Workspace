/**
 * Anthropic Provider
 *
 * 兼容火山引擎 CodingPlan GLM-5.2（使用 Anthropic Messages API 格式）。
 * Base URL: https://ark.cn-beijing.volces.com/api/coding/v1
 * 认证: x-api-key header
 *
 * 支持流式输出 + 多轮上下文，纯文本对话（不含工具调用）。
 */

import type { ChatProvider, ChatEvent, ChatParams, ProviderModel } from './types';

export class AnthropicProvider implements ChatProvider {
  id = 'anthropic';
  name = 'Anthropic / 火山 GLM';

  private get baseUrl(): string {
    return process.env.ANTHROPIC_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v1';
  }

  private get apiKey(): string {
    return process.env.ANTHROPIC_API_KEY || '';
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async getModels(): Promise<ProviderModel[]> {
    const modelStr = process.env.ANTHROPIC_MODEL || 'glm-5.2';
    return [
      { modelId: modelStr, name: modelStr.toUpperCase(), description: '火山 CodingPlan' },
    ];
  }

  async *streamChat(params: ChatParams): AsyncIterable<ChatEvent> {
    const { message, history = [], model, systemPrompt } = params;

    if (!this.apiKey) {
      yield { type: 'error', message: '未配置 ANTHROPIC_API_KEY' };
      return;
    }

    const selectedModel = model || process.env.ANTHROPIC_MODEL || 'glm-5.2';
    yield { type: 'init', sessionId: '', model: selectedModel };

    // 构建消息列表（Anthropic 格式）
    const messages: Array<{ role: string; content: string }> = [];
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: 'user', content: message });

    const body: Record<string, unknown> = {
      model: selectedModel,
      max_tokens: 4096,
      messages,
      stream: true,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 2 分钟超时

      const resp = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        yield { type: 'error', message: `API 错误 ${resp.status}: ${errText || resp.statusText}` };
        return;
      }

      // 解析 SSE 流
      const reader = resp.body?.getReader();
      if (!reader) {
        yield { type: 'error', message: '无法读取响应流' };
        return;
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
          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            // Anthropic SSE 事件类型
            if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
              yield { type: 'text', content: data.delta.text };
            } else if (data.type === 'message_stop') {
              // 流结束
            } else if (data.type === 'error') {
              yield { type: 'error', message: data.error?.message || 'API 流式错误' };
              return;
            }
          } catch {
            // 忽略 JSON 解析错误
          }
        }
      }

      yield { type: 'done' };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (err.name === 'AbortError') {
        yield { type: 'error', message: '请求超时（2 分钟）' };
      } else {
        yield { type: 'error', message: err.message || '请求失败' };
      }
    }
  }
}

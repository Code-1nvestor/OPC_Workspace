/**
 * CodeBuddy Provider
 *
 * 封装 @tencent-ai/agent-sdk 的 query() 函数，
 * 保持原有行为不变（工具调用、权限交互、SDK session 恢复）。
 */

import { query, unstable_v2_createSession, unstable_v2_authenticate } from '@tencent-ai/agent-sdk';
import type { ChatProvider, ChatEvent, ChatParams, ProviderModel } from './types';

export class CodeBuddyProvider implements ChatProvider {
  id = 'codebuddy';
  name = 'CodeBuddy';

  private cachedModels: ProviderModel[] = [];
  private defaultModel = 'claude-sonnet-4';

  async isAvailable(): Promise<boolean> {
    // 环境变量优先
    const apiKey = process.env.CODEBUDDY_API_KEY;
    const authToken = process.env.CODEBUDDY_AUTH_TOKEN;
    if (apiKey || authToken) return true;

    // 检测 CLI 登录状态
    try {
      let needsLogin = false;
      await unstable_v2_authenticate({
        environment: 'external',
        onAuthUrl: async () => {
          needsLogin = true;
        },
      });
      return !needsLogin;
    } catch {
      return false;
    }
  }

  async getModels(): Promise<ProviderModel[]> {
    if (this.cachedModels.length > 0) return this.cachedModels;
    try {
      const session = await unstable_v2_createSession({ cwd: process.cwd() });
      const models = await session.getAvailableModels();
      if (models && Array.isArray(models)) {
        this.cachedModels = models;
      }
    } catch {
      // 静默失败，返回默认模型
    }
    return this.cachedModels.length > 0
      ? this.cachedModels
      : [{ modelId: this.defaultModel, name: 'Claude Sonnet 4' }];
  }

  async *streamChat(params: ChatParams): AsyncIterable<ChatEvent> {
    const { message, model, systemPrompt, cwd, permissionMode, sdkSessionId, requestPermission } = params;

    const defaultSystemPrompt = '你是一个专业的AI助手，善于帮助用户解决各种问题。请用简洁清晰的方式回答问题。';
    const workingDir = cwd || process.cwd();

    const canUseTool = async (toolName: string, input: Record<string, unknown>, options: { toolUseID?: string }) => {
      if (permissionMode === 'bypassPermissions') {
        return { behavior: 'allow' as const, updatedInput: input };
      }
      if (requestPermission) {
        const result = await requestPermission(toolName, input, options.toolUseID);
        if (result.behavior === 'allow') {
          return { behavior: 'allow' as const, updatedInput: input };
        }
        return { behavior: 'deny' as const, message: result.message || '用户拒绝了此操作' };
      }
      return { behavior: 'deny' as const, message: '未配置权限回调' };
    };

    const stream = query({
      prompt: message,
      options: {
        cwd: workingDir,
        model: model || this.defaultModel,
        maxTurns: 10,
        systemPrompt: systemPrompt || defaultSystemPrompt,
        permissionMode: (permissionMode as 'default' | 'acceptEdits' | 'bypassPermissions') || 'default',
        canUseTool,
        ...(sdkSessionId ? { resume: sdkSessionId } : {}),
      },
    });

    let currentToolId: string | null = null;

    for await (const msg of stream) {
      const msgAny = msg as any;

      if (msg.type === 'system' && msgAny.subtype === 'init') {
        const newSdkSessionId = msgAny.session_id;
        yield { type: 'init', sessionId: newSdkSessionId || '', model: model || this.defaultModel };
      } else if (msg.type === 'assistant') {
        const content = msgAny.message?.content;
        if (typeof content === 'string') {
          yield { type: 'text', content };
        } else if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text') {
              yield { type: 'text', content: block.text };
            } else if (block.type === 'tool_use') {
              const toolId = block.id || crypto.randomUUID();
              currentToolId = toolId;
              yield {
                type: 'tool',
                id: toolId,
                name: block.name,
                input: (block as any).input || {},
              };
            }
          }
        }
      } else if (msgAny.type === 'tool_result') {
        const toolId = msgAny.tool_use_id || currentToolId;
        const isError = msgAny.is_error || false;
        const resultContent = msgAny.content;
        if (toolId) {
          yield {
            type: 'tool_result',
            toolId,
            content: typeof resultContent === 'string' ? resultContent : JSON.stringify(resultContent),
            isError,
          };
        }
        currentToolId = null;
      } else if (msg.type === 'result') {
        yield { type: 'done', duration: msgAny.duration, cost: msgAny.cost };
      }
    }
  }
}

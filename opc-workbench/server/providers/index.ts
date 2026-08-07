/**
 * Provider 工厂与路由
 *
 * 根据 LLM_PROVIDER 环境变量选择对应的 Provider。
 * 支持的值: codebuddy | anthropic | openai
 */

import type { ChatProvider } from './types';
import { CodeBuddyProvider } from './codebuddy';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';

// ============= Provider 单例缓存 =============

let cachedProvider: ChatProvider | null = null;
let cachedProviderId: string | null = null;

// ============= 获取当前 Provider =============

export function getProvider(): ChatProvider {
  const providerId = process.env.LLM_PROVIDER || 'codebuddy';

  // 配置未变化时复用单例
  if (cachedProvider && cachedProviderId === providerId) {
    return cachedProvider;
  }

  switch (providerId) {
    case 'anthropic':
      cachedProvider = new AnthropicProvider();
      break;
    case 'openai':
      cachedProvider = new OpenAIProvider();
      break;
    case 'codebuddy':
    default:
      cachedProvider = new CodeBuddyProvider();
      break;
  }

  cachedProviderId = providerId;
  return cachedProvider;
}

// ============= 获取所有已配置的 Provider =============

export async function getAvailableProviders(): Promise<Array<{
  id: string;
  name: string;
  available: boolean;
  isCurrent: boolean;
}>> {
  const currentId = process.env.LLM_PROVIDER || 'codebuddy';
  const providers: ChatProvider[] = [
    new CodeBuddyProvider(),
    new AnthropicProvider(),
    new OpenAIProvider(),
  ];

  const result = [];
  for (const p of providers) {
    result.push({
      id: p.id,
      name: p.name,
      available: await p.isAvailable(),
      isCurrent: p.id === currentId,
    });
  }
  return result;
}

// ============= 重置缓存（配置变更时调用） =============

export function resetProviderCache(): void {
  cachedProvider = null;
  cachedProviderId = null;
}

import { describe, it, expect, beforeEach, vi } from 'vitest';

// CodeBuddy SDK 的 isAvailable() 会触发真实身份认证（网络/浏览器），
// 在测试环境中不稳定。这里用桩对象替换，只验证工厂编排逻辑。
vi.mock('../codebuddy', () => ({
  CodeBuddyProvider: class {
    id = 'codebuddy';
    name = 'CodeBuddy';
    async isAvailable() {
      return false;
    }
  },
}));

import { getProvider, getAvailableProviders, resetProviderCache } from '../index';

describe('Provider 工厂', () => {
  beforeEach(() => {
    resetProviderCache();
    vi.stubEnv('LLM_PROVIDER', 'openai');
  });

  it('LLM_PROVIDER=openai 时返回 OpenAIProvider', () => {
    vi.stubEnv('LLM_PROVIDER', 'openai');
    expect(getProvider().id).toBe('openai');
  });

  it('LLM_PROVIDER=anthropic 时返回 AnthropicProvider', () => {
    vi.stubEnv('LLM_PROVIDER', 'anthropic');
    expect(getProvider().id).toBe('anthropic');
  });

  it('LLM_PROVIDER 为空时默认 CodeBuddyProvider', () => {
    vi.stubEnv('LLM_PROVIDER', '');
    expect(getProvider().id).toBe('codebuddy');
  });

  it('getAvailableProviders 返回 3 个 Provider 及其可用性', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    vi.stubEnv('OPENAI_API_KEY', '');
    const list = await getAvailableProviders();
    expect(list.length).toBe(3);
    const anthropic = list.find((p) => p.id === 'anthropic');
    expect(anthropic?.available).toBe(true);
    const openai = list.find((p) => p.id === 'openai');
    expect(openai?.available).toBe(false);
    const codebuddy = list.find((p) => p.id === 'codebuddy');
    expect(codebuddy?.isCurrent).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../openai';

/** 构造一个带 SSE 文本流的 Response（mock fetch 返回值） */
function makeStreamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) {
        controller.enqueue(encoder.encode(c));
      }
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

const SAMPLE_SSE = [
  'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
  'data: [DONE]\n\n',
];

describe('OpenAIProvider (Agnes)', () => {
  beforeEach(() => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    vi.stubEnv('OPENAI_BASE_URL', 'https://example.com/v1');
    vi.stubEnv('OPENAI_MODEL', 'agnes-2.0-flash');
  });

  it('未配置 API Key 时返回 error 事件', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    const provider = new OpenAIProvider();
    const events: any[] = [];
    for await (const ev of provider.streamChat({ message: 'hi' })) events.push(ev);
    expect(events[0].type).toBe('error');
    expect(events[0].message).toContain('OPENAI_API_KEY');
  });

  it('从 SSE 流式解析并依次 emit init / text / done', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeStreamResponse(SAMPLE_SSE)));
    const provider = new OpenAIProvider();
    const events: any[] = [];
    for await (const ev of provider.streamChat({ message: 'hi' })) events.push(ev);

    expect(events[0].type).toBe('init');
    expect(events[0].model).toBe('agnes-2.0-flash');

    const text = events.filter((e) => e.type === 'text').map((e) => e.content).join('');
    expect(text).toBe('Hello world');

    expect(events[events.length - 1].type).toBe('done');
  });

  it('API 返回非 2xx 时 emit error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('bad', { status: 401, statusText: 'Unauthorized' }))
    );
    const provider = new OpenAIProvider();
    const events: any[] = [];
    for await (const ev of provider.streamChat({ message: 'hi' })) events.push(ev);
    expect(events.some((e) => e.type === 'error' && /401/.test(e.message))).toBe(true);
  });

  it('getModels 返回环境变量中的模型', async () => {
    const provider = new OpenAIProvider();
    const models = await provider.getModels();
    expect(models[0].modelId).toBe('agnes-2.0-flash');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from '../anthropic';

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
  'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}\n\n',
  'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" there"}}\n\n',
  'data: {"type":"message_stop"}\n\n',
];

describe('AnthropicProvider (火山 GLM)', () => {
  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    vi.stubEnv('ANTHROPIC_BASE_URL', 'https://example.com/v1');
    vi.stubEnv('ANTHROPIC_MODEL', 'glm-5.2');
  });

  it('未配置 API Key 时返回 error 事件', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const provider = new AnthropicProvider();
    const events: any[] = [];
    for await (const ev of provider.streamChat({ message: 'hi' })) events.push(ev);
    expect(events[0].type).toBe('error');
  });

  it('解析 content_block_delta 流并 emit text / done', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeStreamResponse(SAMPLE_SSE)));
    const provider = new AnthropicProvider();
    const events: any[] = [];
    for await (const ev of provider.streamChat({ message: 'hi' })) events.push(ev);

    expect(events[0].type).toBe('init');
    const text = events.filter((e) => e.type === 'text').map((e) => e.content).join('');
    expect(text).toBe('Hi there');
    expect(events[events.length - 1].type).toBe('done');
  });

  it('请求使用 x-api-key 头且端点包含 /messages', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeStreamResponse(SAMPLE_SSE));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new AnthropicProvider();
    // 消费流
    for await (const _ of provider.streamChat({ message: 'hi' })) void _;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/messages');
    expect((opts as any).headers['x-api-key']).toBe('test-key');
  });
});

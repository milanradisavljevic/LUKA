import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeOpenAiCompatProvider } from './provider-openai-compat.js';

const originalFetch = globalThis.fetch;

function response(status: number, body: string, headers?: Record<string, string>): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    text: async () => body,
    json: async () => JSON.parse(body),
  } as Response;
}

const provider = makeOpenAiCompatProvider({
  id: 'mistral',
  baseUrl: 'https://example.test/v1',
  defaultModel: 'test-model',
  envKey: 'MISTRAL_API_KEY',
});

beforeEach(() => {
  vi.stubEnv('MISTRAL_API_KEY', 'test-key');
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe('OpenAI-kompatible Provider: Retry/Backoff', () => {
  it('respektiert Retry-After bei HTTP 429 und liefert danach Text', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(response(429, 'Rate limit exceeded', { 'retry-after': '3' }))
      .mockResolvedValueOnce(response(200, JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] })));

    const result = provider.complete([{ role: 'user', content: 'Test' }], { provider: 'mistral' });

    await vi.waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(2999);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toBe('{"ok":true}');
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('nutzt exponentiellen Backoff bei HTTP 5xx', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(response(500, 'Server down'))
      .mockResolvedValueOnce(response(502, 'Bad gateway'))
      .mockResolvedValueOnce(response(200, JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] })));

    const result = provider.complete([{ role: 'user', content: 'Test' }], { provider: 'mistral' });

    await vi.waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(2000);
    await vi.waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
    await vi.advanceTimersByTimeAsync(4000);

    await expect(result).resolves.toBe('{"ok":true}');
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('retryt HTTP 400 nicht und wirft den bisherigen Fehlertext', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(response(400, 'Bad request'));

    await expect(
      provider.complete([{ role: 'user', content: 'Test' }], { provider: 'mistral' }),
    ).rejects.toThrow('mistral API Fehler 400: Bad request');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});

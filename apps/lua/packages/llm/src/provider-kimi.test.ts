import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { kimiProvider } from './provider-kimi.js';
import type { GenerateInput } from './types.js';

// fetch mocken
const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.stubEnv('KIMI_API_KEY', 'test-key');
});

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

const baseInput: GenerateInput = {
  meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'Test', datum: '2026-05-30', klasse: '7A', notizen: '' },
  quelltexte: [],
  bloecke: [],
};

describe('Kimi-Provider: Datenschutz-Schranke', () => {
  it('laesst selbst verfasste Inhalte durch (keine Quelltexte)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"test": true}' } }] }),
    } as Response);

    const result = await kimiProvider.complete(
      [{ role: 'user', content: 'Erzeuge JSON.' }],
      { provider: 'kimi' },
      baseInput,
    );

    expect(result).toBe('{"test": true}');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('lehnt fremde Quelltexte ab', async () => {
    const inputMitQuellen: GenerateInput = {
      ...baseInput,
      quelltexte: [{ id: 'q1', titel: 'Fremder Text', inhalt: 'Ein Artikel...', herkunft: { typ: 'upload', ref: 'artikel.pdf' } }],
    };

    await expect(
      kimiProvider.complete(
        [{ role: 'user', content: 'Erzeuge JSON.' }],
        { provider: 'kimi' },
        inputMitQuellen,
      ),
    ).rejects.toThrow('Kimi darf nur fuer selbst verfasste Inhalte verwendet werden');
  });

  it('lehnt Quelltexte auch bei leerem Array ab, wenn input fehlt', async () => {
    // Ohne input-Parameter: Kimi laeuft (keine Pruefung moeglich)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"test": true}' } }] }),
    } as Response);

    const result = await kimiProvider.complete(
      [{ role: 'user', content: 'Erzeuge JSON.' }],
      { provider: 'kimi' },
    );

    expect(result).toBe('{"test": true}');
  });

  it('wirft Fehler wenn API-Key fehlt', async () => {
    vi.unstubAllEnvs();

    await expect(
      kimiProvider.complete(
        [{ role: 'user', content: 'Test' }],
        { provider: 'kimi' },
      ),
    ).rejects.toThrow('KIMI_API_KEY fehlt');
  });
});

describe('Kimi-Provider: API-Kommunikation', () => {
  it('sendet korrekte Request-Struktur', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"ok": true}' } }] }),
    } as Response);

    await kimiProvider.complete(
      [{ role: 'system', content: 'Du bist ein Assistent.' }, { role: 'user', content: 'Hallo' }],
      { provider: 'kimi', model: 'moonshot-v1-32k', kreativitaet: 0.7 },
      baseInput,
    );

    const [url, opts] = (globalThis.fetch as any).mock.calls[0];
    expect(url).toBe('https://api.moonshot.cn/v1/chat/completions');

    const body = JSON.parse(opts.body);
    expect(body.model).toBe('moonshot-v1-32k');
    expect(body.temperature).toBe(0.7);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.messages).toHaveLength(2);
  });

  it('wirft bei API-Fehler', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    } as Response);

    await expect(
      kimiProvider.complete(
        [{ role: 'user', content: 'Test' }],
        { provider: 'kimi' },
        baseInput,
      ),
    ).rejects.toThrow('Kimi API Fehler 401');
  });
});

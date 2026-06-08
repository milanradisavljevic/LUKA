import type { ChatMessage, Provider, ProviderConfig } from './types.js';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

// Phase-2-Adapter fuer Anthropic (Claude). Nutzt globales fetch (Node 20+),
// damit keine zusaetzliche SDK-Abhaengigkeit noetig ist.
export const anthropicProvider: Provider = {
  id: 'anthropic',
  async complete(messages: ChatMessage[], cfg: ProviderConfig): Promise<string> {
    const apiKey = cfg.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY fehlt (Umgebungsvariable oder cfg.apiKey setzen).');
    }

    const system = messages.find((m) => m.role === 'system')?.content;
    const rest = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: cfg.model ?? DEFAULT_MODEL,
        max_tokens: 16000,
        temperature: cfg.kreativitaet ?? 0.4,
        system,
        messages: rest,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Anthropic API Fehler ${res.status}: ${detail}`);
    }

    const data: any = await res.json();
    const text = (data.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n');

    if (!text) throw new Error('Anthropic API lieferte keinen Text zurueck.');
    return text;
  },
};

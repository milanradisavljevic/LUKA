import type { ChatMessage, Provider, ProviderConfig } from './types.js';

const DEFAULT_MODEL = 'gpt-4o';
const API_URL = 'https://api.openai.com/v1/chat/completions';

// Phase-5-Adapter fuer OpenAI (ChatGPT). Nutzt globales fetch (Node 20+),
// damit keine zusaetzliche SDK-Abhaengigkeit noetig ist.
export const openaiProvider: Provider = {
  id: 'openai',
  async complete(messages: ChatMessage[], cfg: ProviderConfig): Promise<string> {
    const apiKey = cfg.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY fehlt (Umgebungsvariable oder cfg.apiKey setzen).');
    }

    const oaiMessages = messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }));

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model ?? DEFAULT_MODEL,
        max_tokens: 16000,
        temperature: cfg.kreativitaet ?? 0.4,
        response_format: { type: 'json_object' },
        messages: oaiMessages,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`OpenAI API Fehler ${res.status}: ${detail}`);
    }

    const data: any = await res.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) throw new Error('OpenAI API lieferte keinen Text zurueck.');
    return text;
  },
};

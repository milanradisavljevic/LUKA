import type { ChatMessage, GenerateInput, Provider, ProviderConfig } from './types.js';

const DEFAULT_MODEL = 'moonshot-v1-128k';
const API_URL = 'https://api.moonshot.cn/v1/chat/completions';

// Phase-5-Adapter fuer Kimi (Moonshot). Nutzt globales fetch (Node 20+).
// DATENSCHUTZ: Kimi darf NUR fuer selbst verfasste Inhalte verwendet werden,
// nicht fuer fremde Quelltexte. Siehe DESIGN.md Abschnitt 9.
export const kimiProvider: Provider = {
  id: 'kimi',

  async complete(messages: ChatMessage[], cfg: ProviderConfig, input?: GenerateInput): Promise<string> {
    const apiKey = cfg.apiKey ?? process.env.KIMI_API_KEY;
    if (!apiKey) {
      throw new Error('KIMI_API_KEY fehlt (Umgebungsvariable oder cfg.apiKey setzen).');
    }

    // Datenschutz-Schranke: Kimi nur fuer selbst verfasste Inhalte
    if (input && input.quelltexte.length > 0) {
      throw new Error(
        'Kimi darf nur fuer selbst verfasste Inhalte verwendet werden. ' +
        'Es sind fremde Quelltexte vorhanden. Bitte einen anderen Anbieter waehlen ' +
        '(z.B. Claude oder ChatGPT) oder die Quelltexte entfernen.',
      );
    }

    const kimiMessages = messages.map((m) => ({
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
        messages: kimiMessages,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Kimi API Fehler ${res.status}: ${detail}`);
    }

    const data: any = await res.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) throw new Error('Kimi API lieferte keinen Text zurueck.');
    return text;
  },
};

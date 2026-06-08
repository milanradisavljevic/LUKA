import type { ChatMessage, Provider, ProviderConfig, ProviderId } from './types.js';

// Fabrik fuer OpenAI-kompatible Anbieter (gleiches /chat/completions-Schema,
// nur andere Base-URL + Default-Modell + Env-Key). Spiegelt die Rust-Adapter
// in src-tauri/src/adapters/openai_compat.rs.
export function makeOpenAiCompatProvider(opts: {
  id: ProviderId;
  baseUrl: string;
  defaultModel: string;
  envKey: string;
}): Provider {
  return {
    id: opts.id,
    async complete(messages: ChatMessage[], cfg: ProviderConfig): Promise<string> {
      const apiKey = cfg.apiKey ?? process.env[opts.envKey];
      if (!apiKey) {
        throw new Error(`${opts.envKey} fehlt (Umgebungsvariable oder cfg.apiKey setzen).`);
      }

      const oaiMessages = messages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${opts.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model ?? opts.defaultModel,
          max_tokens: 16000,
          temperature: cfg.kreativitaet ?? 0.4,
          response_format: { type: 'json_object' },
          messages: oaiMessages,
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`${opts.id} API Fehler ${res.status}: ${detail}`);
      }

      const data: any = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error(`${opts.id} API lieferte keinen Text zurueck.`);
      return text;
    },
  };
}

export const deepseekProvider = makeOpenAiCompatProvider({
  id: 'deepseek',
  baseUrl: 'https://api.deepseek.com/v1',
  defaultModel: 'deepseek-chat',
  envKey: 'DEEPSEEK_API_KEY',
});

export const mistralProvider = makeOpenAiCompatProvider({
  id: 'mistral',
  baseUrl: 'https://api.mistral.ai/v1',
  defaultModel: 'mistral-small-latest',
  envKey: 'MISTRAL_API_KEY',
});

export const qwenProvider = makeOpenAiCompatProvider({
  id: 'qwen',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  defaultModel: 'qwen-plus',
  envKey: 'QWEN_API_KEY',
});

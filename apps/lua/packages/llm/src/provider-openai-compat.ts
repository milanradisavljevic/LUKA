import type { ChatMessage, Provider, ProviderConfig, ProviderId } from './types.js';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;

function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500;
}

function retryDelayMs(res: Response, attempt: number): number {
  const retryAfter = res.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number.parseFloat(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  return INITIAL_BACKOFF_MS * 2 ** attempt;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

      let res!: Response;
      for (let attempt = 0; ; attempt++) {
        res = await fetch(`${opts.baseUrl}/chat/completions`, {
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

        if (res.ok || !shouldRetry(res.status) || attempt >= MAX_RETRIES) {
          break;
        }

        await sleep(retryDelayMs(res, attempt));
      }

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

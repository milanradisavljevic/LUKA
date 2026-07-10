/**
 * Modell-Metadaten fuer die LLM-Auswahl.
 * Preise sind verifizierte USD-Betraege pro 1 Mio Token (Stand 2026-06-01).
 * Quellen als Kommentar bei jedem Modell.
 */

export interface ModelInfo {
  label: string;
  apiName: string;
  provider: 'claude' | 'chatgpt' | 'kimi' | 'deepseek' | 'mistral' | 'qwen';
  staerken: string[];
  /** Kosten pro 1 Mio Input-Token in USD (0 = unbekannt/Platzhalter) */
  kostenInputProMioToken: number;
  /** Kosten pro 1 Mio Output-Token in USD (0 = unbekannt/Platzhalter) */
  kostenOutputProMioToken: number;
  /** Server-Standort / DSGVO-Region */
  region: string;
  /** Kurzer Datenschutz-Hinweis */
  datenschutz: string;
}

export const MODELS: ModelInfo[] = [
  // --- Anthropic Claude ---
  // Quelle: https://www.anthropic.com/pricing, Stand 2026-06-01
  {
    label: 'Opus 4.8',
    apiName: 'claude-opus-4-8',
    provider: 'claude',
    staerken: ['Höchste Qualität', 'Komplexe Aufgaben', 'Lange Kontexte'],
    kostenInputProMioToken: 5,
    kostenOutputProMioToken: 25,
    region: 'USA (Anthropic)',
    datenschutz: 'US-Anbieter — keine DSGVO-Garantie',
  },
  {
    label: 'Opus 4.7',
    apiName: 'claude-opus-4-7',
    provider: 'claude',
    staerken: ['Sehr hohe Qualität', 'Ausgefeiltes Reasoning'],
    kostenInputProMioToken: 5,
    kostenOutputProMioToken: 25,
    region: 'USA (Anthropic)',
    datenschutz: 'US-Anbieter — keine DSGVO-Garantie',
  },
  {
    label: 'Sonnet 4.6',
    apiName: 'claude-sonnet-4-6',
    provider: 'claude',
    staerken: ['Gutes Preis-Leistungs-Verhältnis', 'Schnell', 'Vielseitig'],
    kostenInputProMioToken: 3,
    kostenOutputProMioToken: 15,
    region: 'USA (Anthropic)',
    datenschutz: 'US-Anbieter — keine DSGVO-Garantie',
  },
  {
    label: 'Haiku 4.5',
    apiName: 'claude-haiku-4-5-20251001',
    provider: 'claude',
    staerken: ['Sehr schnell', 'Günstig', 'Einfache Aufgaben'],
    kostenInputProMioToken: 1,
    kostenOutputProMioToken: 5,
    region: 'USA (Anthropic)',
    datenschutz: 'US-Anbieter — keine DSGVO-Garantie',
  },

  // --- OpenAI ---
  // Quelle: https://platform.openai.com/docs/pricing, Stand 2026-06-01
  // GPT-5.4 ist der Nachfolger von GPT-4o, Preisstruktur aktualisiert.
  {
    label: 'GPT-5.4',
    apiName: 'gpt-5.4',
    provider: 'chatgpt',
    staerken: ['Multimodal', 'Schnell', 'Gute Allrounder-Qualität'],
    kostenInputProMioToken: 2.5,
    kostenOutputProMioToken: 15,
    region: 'USA (OpenAI)',
    datenschutz: 'US-Anbieter — keine DSGVO-Garantie',
  },
  {
    label: 'GPT-5.4 mini',
    apiName: 'gpt-5.4-mini',
    provider: 'chatgpt',
    staerken: ['Schnell', 'Günstig', 'Einfache Aufgaben'],
    kostenInputProMioToken: 0.75,
    kostenOutputProMioToken: 4.5,
    region: 'USA (OpenAI)',
    datenschutz: 'US-Anbieter — keine DSGVO-Garantie',
  },
  {
    label: 'GPT-5.4 nano',
    apiName: 'gpt-5.4-nano',
    provider: 'chatgpt',
    staerken: ['Sehr schnell', 'Sehr günstig', 'Bulk-Aufgaben'],
    kostenInputProMioToken: 0.2,
    kostenOutputProMioToken: 1.25,
    region: 'USA (OpenAI)',
    datenschutz: 'US-Anbieter — keine DSGVO-Garantie',
  },

  // --- DeepSeek ---
  // Quelle: https://platform.deepseek.com/pricing, Stand 2026-06-01
  // Preise sind ohne Cache-Hit-Rabatt. V4 Pro: Aktionspreis (75% off bis 2026-05-31).
  {
    label: 'DeepSeek V4 Flash',
    apiName: 'deepseek-v4-flash',
    provider: 'deepseek',
    staerken: ['Schnell', 'Sehr günstig', 'Allrounder'],
    kostenInputProMioToken: 0.14,
    kostenOutputProMioToken: 0.28,
    region: 'China (DeepSeek)',
    datenschutz: 'Chinesischer Anbieter — nur für selbst verfasste Inhalte',
  },
  {
    label: 'DeepSeek V4 Pro',
    apiName: 'deepseek-v4-pro',
    provider: 'deepseek',
    staerken: ['Starkes Reasoning', 'Lange Kontexte', 'Günstig'],
    kostenInputProMioToken: 0.435,
    kostenOutputProMioToken: 0.87,
    region: 'China (DeepSeek)',
    datenschutz: 'Chinesischer Anbieter — nur für selbst verfasste Inhalte',
  },

  // --- Mistral ---
  // Quelle: https://docs.mistral.ai/models/model-cards/mistral-small-4-0-26-03, Stand 2026-07-10
  {
    label: 'Mistral Medium 3.5',
    apiName: 'mistral-medium-3-5',
    provider: 'mistral',
    staerken: ['Multimodal', 'Hohe Qualität', 'Agenten-Fähigkeiten'],
    kostenInputProMioToken: 1.5,
    kostenOutputProMioToken: 7.5,
    region: 'EU (Mistral, Frankreich)',
    datenschutz: 'EU-Anbieter — Datenschutzbedingungen des Kontos prüfen',
  },
  {
    label: 'Mistral Small 4',
    apiName: 'mistral-small-2603',
    provider: 'mistral',
    staerken: ['Schnell', 'Günstig', 'Code und Reasoning'],
    kostenInputProMioToken: 0.15,
    kostenOutputProMioToken: 0.6,
    region: 'EU (Mistral, Frankreich)',
    datenschutz: 'EU-Anbieter — Datenschutzbedingungen des Kontos prüfen',
  },

  // --- Qwen (Alibaba Cloud / DashScope) ---
  // Quelle: https://www.alibabacloud.com/help/en/model-studio/getting-started/models, Stand 2026-06-01
  // Preise: Global Deployment (Virginia/Frankfurt). Qwen 3.7 Max ist ein aktives Modell.
  // Die API-Namen können von den offiziellen Doku-Namen abweichen.
  {
    label: 'Qwen 3.7 Max',
    apiName: 'qwen3-max',
    provider: 'qwen',
    staerken: ['Starke Qualität', 'Lange Kontexte', 'Chinesisch/Englisch'],
    kostenInputProMioToken: 0.359,
    kostenOutputProMioToken: 1.434,
    region: 'China (Alibaba Cloud)',
    datenschutz: 'Chinesischer Anbieter — nur für selbst verfasste Inhalte',
  },
  {
    label: 'Qwen 3.5 Plus',
    apiName: 'qwen3.5-plus',
    provider: 'qwen',
    staerken: ['Gutes Preis-Leistungs-Verhältnis', 'Vielseitig'],
    kostenInputProMioToken: 0.115,
    kostenOutputProMioToken: 0.688,
    region: 'China (Alibaba Cloud)',
    datenschutz: 'Chinesischer Anbieter — nur für selbst verfasste Inhalte',
  },

  // --- Kimi (Moonshot AI) ---
  // Quelle: https://platform.moonshot.cn/docs/pricing/chat-v1, Stand 2026-06-01
  // Preise in CNY: moonshot-v1-8k Input ¥2.00/MTok, Output ¥10.00/MTok.
  // Umrechnung 1 USD ≈ 7.25 CNY → Input ≈ $0.28/MTok, Output ≈ $1.38/MTok.
  {
    label: 'Moonshot V1 8K',
    apiName: 'moonshot-v1-8k',
    provider: 'kimi',
    staerken: ['Langer Kontext', 'Chinesischer Anbieter'],
    kostenInputProMioToken: 0.28,
    kostenOutputProMioToken: 1.38,
    region: 'China (Moonshot AI)',
    datenschutz: 'Chinesischer Anbieter — nur für selbst verfasste Inhalte',
  },
  // Quelle: https://platform.moonshot.cn/docs/pricing/chat-k26
  // Kimi K2.6: Input ¥6.50/MTok (cache miss), Output ¥27.00/MTok
  // Umrechnung: Input ≈ $0.90/MTok, Output ≈ $3.72/MTok
  {
    label: 'Kimi K2.6',
    apiName: 'kimi-k2.6',
    provider: 'kimi',
    staerken: ['Langer Kontext (256K)', 'Multimodal', 'Starkes Reasoning'],
    kostenInputProMioToken: 0.9,
    kostenOutputProMioToken: 3.72,
    region: 'China (Moonshot AI)',
    datenschutz: 'Chinesischer Anbieter — nur für selbst verfasste Inhalte',
  },
];

export function getModelInfo(label: string): ModelInfo | undefined {
  return MODELS.find((m) => m.label === label);
}

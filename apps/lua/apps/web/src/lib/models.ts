/**
 * Modell-Metadaten fuer die LLM-Auswahl.
 * Preise sind USD-Betraege pro 1 Mio Token (Stand 2026-10-19).
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
  // Quelle: https://platform.claude.com/docs/en/about-claude/pricing, Stand 2026-10-19
  // Claude 4.7 und neuer akzeptieren kein eigenes temperature; der Adapter
  // lässt den Parameter dort weg.
  {
    label: 'Opus 5.5',
    apiName: 'claude-opus-5-5',
    provider: 'claude',
    staerken: ['Höchste Qualität', 'Komplexe Aufgaben', 'Lange Kontexte (1M)'],
    kostenInputProMioToken: 4,
    kostenOutputProMioToken: 20,
    region: 'USA (Anthropic)',
    datenschutz: 'US-Anbieter — keine DSGVO-Garantie',
  },
  {
    label: 'Sonnet 5.5',
    apiName: 'claude-sonnet-5-5',
    provider: 'claude',
    staerken: ['Gutes Preis-Leistungs-Verhältnis', 'Schnell', 'Vielseitig'],
    kostenInputProMioToken: 2,
    kostenOutputProMioToken: 10,
    region: 'USA (Anthropic)',
    datenschutz: 'US-Anbieter — keine DSGVO-Garantie',
  },
  {
    // Preis gilt bis 100.000 Token Prompt; darüber 0,50 / 2,50 USD.
    label: 'Haiku 5.5',
    apiName: 'claude-haiku-5-5',
    provider: 'claude',
    staerken: ['Sehr schnell', 'Sehr günstig', 'Einfache Aufgaben'],
    kostenInputProMioToken: 0.1,
    kostenOutputProMioToken: 0.5,
    region: 'USA (Anthropic)',
    datenschutz: 'US-Anbieter — keine DSGVO-Garantie',
  },
  {
    label: 'Opus 4.8',
    apiName: 'claude-opus-4-8',
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
    staerken: ['Bewährt', 'Schnell', 'Vielseitig'],
    kostenInputProMioToken: 3,
    kostenOutputProMioToken: 15,
    region: 'USA (Anthropic)',
    datenschutz: 'US-Anbieter — keine DSGVO-Garantie',
  },

  // --- OpenAI ---
  // Quelle: https://developers.openai.com/api/docs/pricing, Stand 2026-10-19
  // GPT-5.4 nano ist abgekündigt (Abschaltung 2027-04-01, Nachfolger GPT-6 Luna).
  {
    label: 'GPT-6.1 Sol',
    apiName: 'gpt-6.1-sol',
    provider: 'chatgpt',
    staerken: ['Multimodal', 'Starkes Reasoning', 'Lange Kontexte'],
    kostenInputProMioToken: 2,
    kostenOutputProMioToken: 10,
    region: 'USA (OpenAI)',
    datenschutz: 'US-Anbieter — keine DSGVO-Garantie',
  },
  {
    label: 'GPT-6 Luna',
    apiName: 'gpt-6-luna',
    provider: 'chatgpt',
    staerken: ['Sehr schnell', 'Sehr günstig', 'Bulk-Aufgaben'],
    kostenInputProMioToken: 0.1,
    kostenOutputProMioToken: 0.5,
    region: 'USA (OpenAI)',
    datenschutz: 'US-Anbieter — keine DSGVO-Garantie',
  },
  {
    label: 'GPT-5.4',
    apiName: 'gpt-5.4',
    provider: 'chatgpt',
    staerken: ['Bewährt', 'Gute Allrounder-Qualität'],
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

  // --- DeepSeek ---
  // Quelle: https://api-docs.deepseek.com/quick_start/pricing/ (Stoßzeiten, Stand 2026-10-03).
  // V4-Flash ist abgeschaltet,umbenannt in deepseek-flash (V4.1-Flash).
  // Legacy-Name deepseek-v4-flash wird noch unterstützt.
  {
    label: 'DeepSeek V4.1 Flash',
    apiName: 'deepseek-flash',
    provider: 'deepseek',
    staerken: ['Schnell', 'Sehr günstig', 'Allrounder', 'Nativ multimodal'],
    kostenInputProMioToken: 0.3,
    kostenOutputProMioToken: 1.2,
    region: 'China (DeepSeek)',
    datenschutz: 'Texte werden an DeepSeek übertragen',
  },
  {
    label: 'DeepSeek V4 Pro',
    apiName: 'deepseek-v4-pro',
    provider: 'deepseek',
    staerken: ['Starkes Reasoning', 'Lange Kontexte', 'Günstig'],
    kostenInputProMioToken: 1.32,
    kostenOutputProMioToken: 3.96,
    region: 'China (DeepSeek)',
    datenschutz: 'Texte werden an DeepSeek übertragen',
  },

  // --- Mistral ---
  // Quelle: https://docs.mistral.ai/inference/pricing, Stand 2026-10-19
  // Mistral Large 4 (v26.10) ist seit 2026-10-06 als öffentliche Vorschau verfügbar.
  // Listenpreis eingetragen; Mistral gewährt zum Start zeitlich begrenzt 50 % Rabatt.
  {
    label: 'Mistral Large 4',
    apiName: 'mistral-large-4',
    provider: 'mistral',
    staerken: ['Neues Spitzenmodell (Vorschau)', 'Multimodal', 'Langer Kontext (1M)'],
    kostenInputProMioToken: 1.36,
    kostenOutputProMioToken: 4.18,
    region: 'EU (Mistral, Frankreich)',
    datenschutz: 'EU-Anbieter — Datenschutzbedingungen des Kontos prüfen',
  },
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
  // Quelle Modellnamen: https://www.alibabacloud.com/help/en/model-studio/getting-started/models,
  // Stand 2026-10-19. Die Übersicht nennt qwen3.8-max und qwen3.7-plus als aktuelle Flaggschiffe.
  // Preise (international) laut Drittquellen, offizielle Preisseite vor Freigabe prüfen.
  {
    label: 'Qwen 3.8 Max',
    apiName: 'qwen3.8-max',
    provider: 'qwen',
    staerken: ['Starke Qualität', 'Lange Kontexte (1M)', 'Chinesisch/Englisch'],
    kostenInputProMioToken: 2,
    kostenOutputProMioToken: 6,
    region: 'China (Alibaba Cloud)',
    datenschutz: 'Chinesischer Anbieter — nur für selbst verfasste Inhalte',
  },
  {
    label: 'Qwen 3.7 Plus',
    apiName: 'qwen3.7-plus',
    provider: 'qwen',
    staerken: ['Gutes Preis-Leistungs-Verhältnis', 'Vielseitig'],
    kostenInputProMioToken: 0.4,
    kostenOutputProMioToken: 1.6,
    region: 'China (Alibaba Cloud)',
    datenschutz: 'Chinesischer Anbieter — nur für selbst verfasste Inhalte',
  },

  // --- Kimi (Moonshot AI) ---
  // Quelle: https://platform.kimi.ai/docs/pricing/chat, Stand 2026-09-15
  // moonshot-v1-Serie wurde am 31.08.2026 abgeschaltet. Aktuelle Modelle: kimi-k3, kimi-k2.6.
  {
    label: 'Kimi K2.6',
    apiName: 'kimi-k2.6',
    provider: 'kimi',
    staerken: ['Langer Kontext (256K)', 'Multimodal', 'Starkes Reasoning'],
    kostenInputProMioToken: 0.95,
    kostenOutputProMioToken: 4.0,
    region: 'China (Moonshot AI)',
    datenschutz: 'Chinesischer Anbieter — nur für selbst verfasste Inhalte',
  },
  {
    label: 'Kimi K3',
    apiName: 'kimi-k3',
    provider: 'kimi',
    staerken: ['Stärkstes Modell', '1M Kontext', 'Nativ multimodal', 'Agenten-Fähigkeiten'],
    kostenInputProMioToken: 3.0,
    kostenOutputProMioToken: 15.0,
    region: 'China (Moonshot AI)',
    datenschutz: 'Chinesischer Anbieter — nur für selbst verfasste Inhalte',
  },
];

export function getModelInfo(label: string): ModelInfo | undefined {
  return MODELS.find((m) => m.label === label);
}

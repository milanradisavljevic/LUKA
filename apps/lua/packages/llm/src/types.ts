import type { DocumentV1, Meta, QuellText, Block, StoffItem } from '@lehrunterlagen/schema';

// Anbieter-Kennung. anthropic + OpenAI-kompatible (openai, deepseek, mistral, qwen, kimi).
export type ProviderId = 'anthropic' | 'openai' | 'deepseek' | 'mistral' | 'qwen' | 'kimi';

export interface ProviderConfig {
  provider: ProviderId;
  /** API-Modellname, z. B. 'claude-sonnet-4-6'. Faellt auf Anbieter-Default zurueck. */
  model?: string;
  /** Wird sonst aus der Umgebungsvariable des Anbieters gelesen. Nie hartkodieren. */
  apiKey?: string;
  /** 0..1, wird auf temperature gemappt. Default 0.4. */
  kreativitaet?: number;
}

// Vom Nutzer im Baukasten gewaehlte Vorgaben pro Block.
// Inhalt und Loesung erzeugt das LLM, diese Felder gibt die Lehrkraft vor.
export type BlockRequest =
  | { typ: 'lueckentext'; punkte: number; quelleId?: string; anzahlLuecken: number; wortbank: boolean; distraktoren: number }
  | { typ: 'matching'; punkte: number; quelleId?: string; anzahlItems: number }
  | { typ: 'multipleChoice'; punkte: number; quelleId?: string; anzahlFragen: number; mehrfach: boolean }
  | { typ: 'offeneVerstaendnisfrage'; punkte: number; quelleId?: string; anzahlFragen: number }
  | {
      typ: 'offeneSchreibaufgabe';
      punkte: number;
      quelleId?: string;
      textsorte: string;
      situation?: string;
      umfangWorte: { min: number; max: number };
      aspekte: string[];
    }
  | { typ: 'markieraufgabe'; punkte: number; quelleId: string; anweisung: string }
  // saetze/eintraege/woerter/vokabeln: optionale, von der Lehrkraft VORGEGEBENE Inhalte
  // (Manuell/Hybrid). Befüllte Einträge übernimmt das LLM unverändert, leere ergänzt es bis Anzahl.
  | { typ: 'wordScramble'; punkte: number; quelleId?: string; anzahlSaetze: number; saetze?: { wort: string }[] }
  | { typ: 'kategorisierung'; punkte: number; quelleId?: string; anzahlItems: number; kategorien: string[] }
  | { typ: 'tabelle'; punkte: number; quelleId?: string; spalten: string[] }
  | { typ: 'stiluebung'; punkte: number; quelleId?: string; zielniveau: string; transformation: string }
  | { typ: 'songanalyse'; punkte: number; quelleId?: string; aufgabe: string }
  | { typ: 'kreuzwortraetsel'; punkte: number; quelleId?: string; anzahlWoerter: number; eintraege?: { wort: string; hinweis: string }[] }
  | { typ: 'wortgitter'; punkte: number; quelleId?: string; anzahlWoerter: number; woerter?: string[] }
  | { typ: 'vokabeluebung'; punkte: number; quelleId?: string; anzahlVokabeln: number; richtung: 'de_fremd' | 'fremd_de'; vokabeln?: { deutsch: string; fremdsprache: string; kontextsatz?: string }[] }
  | { typ: 'umformung'; punkte: number; quelleId?: string; anzahlAufgaben: number }
  | { typ: 'fehlerkorrektur'; punkte: number; quelleId?: string; anzahlSaetze: number; saetze?: { nr: number; satz: string; anzahlFehler: number }[] }
  | { typ: 'roleplay'; punkte: number; quelleId?: string; situation?: string; setting?: string; ziel?: string; zeitMinuten?: number; rollen?: { name?: string; beschreibung?: string; aufgabe?: string; redemittel?: string[] }[]; redemittel?: string[]; bewertung?: string[] }
  | { typ: 'rollenkartenSet'; punkte: number; quelleId?: string; rahmen?: string; zeitMinuten?: number; anzahlSzenarien?: number; rollen?: { name?: string; rollenhinweis?: string; inhaltsLabel?: string; sprachhinweis?: string }[]; szenarien?: { nummer?: number; titel?: string; fakten?: string; rollenInhalte?: { untertitel?: string; punkte?: string[] }[] }[] };

export type BlockTyp = Block['typ'];

export interface GenerateInput {
  meta: Meta;
  quelltexte: QuellText[];
  bloecke: BlockRequest[];
  stoffItems?: StoffItem[];
  inhaltsModul?: { titel: string; beschreibung: string };
}

export interface GenerateOk {
  ok: true;
  document: DocumentV1;
  rohText: string;
  versuche: number;
}

export interface GenerateError {
  ok: false;
  fehler: string;
  rohText?: string;
  versuche: number;
}

export type GenerateResult = GenerateOk | GenerateError;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Provider {
  id: ProviderId;
  complete(messages: ChatMessage[], cfg: ProviderConfig, input?: GenerateInput): Promise<string>;
}

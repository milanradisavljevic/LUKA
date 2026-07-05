import { useState, useCallback, useRef } from 'react';
import type { Block, DocumentV1, StoffItem } from '@lehrunterlagen/schema';
import type { GenerateInput, BlockRequest, ChatMessage } from '@lehrunterlagen/llm';
import { buildMessages, buildRepairMessage, parseAndValidate, runJudge, istRisikoTyp, type QualityIssue } from '@lehrunterlagen/llm';
import { invoke } from '@tauri-apps/api/core';
import type { AppState, AppAction } from '../lib/types';
import { loadSettings } from '../lib/storage';
import { getStoffItems } from '../lib/stoffkatalog';
import { getInhaltsModul } from '../lib/inhaltskatalog';

/** Baut die Stoff-Items für den Generator: Katalog-Items + optional ein synthetisches Item für Freitext. */
function buildStoffItems(meta: AppState['meta']): StoffItem[] | undefined {
  if (meta.modus !== 'kompetenz') return undefined;
  const items = getStoffItems(meta.stoffItemIds ?? []);
  const freitext = meta.freieKompetenz?.trim();
  if (freitext) {
    items.push({
      id: 'frei-kompetenz',
      rahmenwerk: meta.rahmenwerk ?? 'at-lehrplan',
      titel: freitext,
      fach: meta.fach,
      stufe: meta.stufe,
      kategorie: 'grammatik',
      deskriptorIds: [],
      defaultAufgabentypen: [],
    });
  }
  return items.length > 0 ? items : undefined;
}

/** Baut das optionale Inhalts-Modul für den Generator. */
function buildInhaltsModul(meta: AppState['meta']): { titel: string; beschreibung: string } | undefined {
  if (meta.modus !== 'kompetenz') return undefined;
  const id = meta.inhaltsModulId;
  if (!id) return undefined;
  const modul = getInhaltsModul(id);
  if (!modul) return undefined;
  return { titel: modul.titel, beschreibung: modul.beschreibung };
}

// Phasen der Generierung — die UI (Kimi) zeigt daraus eine Fortschrittsanzeige.
export type GenerateStage = 'idle' | 'sende' | 'validiere' | 'korrigiere' | 'fertig' | 'fehler';

// Ersatz-Anbieter nur bei Transport-/API-Fehlern (nicht bei ungültigem Output).
// Standardmäßig DeepSeek bevorzugt (User-Setting), Anthropic als Fallback.
const FALLBACK_MODEL: Record<string, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  deepseek: 'deepseek-chat',
};
const FALLBACK_ORDER = ['deepseek', 'anthropic'];

const PROVIDER_MAP = {
  claude: 'anthropic',
  chatgpt: 'openai',
  kimi: 'kimi',
  deepseek: 'deepseek',
  mistral: 'mistral',
  qwen: 'qwen',
} as const;

const MODEL_MAP: Record<string, string> = {
  // Anthropic
  'Opus 4.8': 'claude-opus-4-8',
  'Opus 4.7': 'claude-opus-4-7',
  'Sonnet 4.6': 'claude-sonnet-4-6',
  'Haiku 4.5': 'claude-haiku-4-5-20251001',
  // OpenAI
  'GPT-5.4': 'gpt-5.4',
  'GPT-5.4 mini': 'gpt-5.4-mini',
  'GPT-5.4 nano': 'gpt-5.4-nano',
  // DeepSeek
  'DeepSeek V4 Flash': 'deepseek-v4-flash',
  'DeepSeek V4 Pro': 'deepseek-v4-pro',
  // Mistral
  'Mistral Medium 3.5': 'mistral-medium-3-5',
  'Mistral Small 4': 'mistral-small-4',
  // Qwen
  'Qwen 3.7 Max': 'qwen3-max',
  'Qwen 3.6 Plus': 'qwen3.5-plus',
  // Kimi
  'Moonshot V1 8K': 'moonshot-v1-8k',
  'Kimi K2.6': 'kimi-k2.6',
};

function blockToRequest(block: Block): BlockRequest {
  switch (block.typ) {
    case 'lueckentext':
      return { typ: 'lueckentext', punkte: block.punkte, quelleId: block.quelleId,
        anzahlLuecken: block.config.anzahlLuecken, wortbank: block.config.wortbank,
        distraktoren: block.config.distraktoren };
    case 'matching':
      return { typ: 'matching', punkte: block.punkte, quelleId: block.quelleId,
        anzahlItems: block.config.items.length };
    case 'multipleChoice':
      return { typ: 'multipleChoice', punkte: block.punkte, quelleId: block.quelleId,
        anzahlFragen: block.config.fragen.length,
        mehrfach: block.config.fragen.some((f) => f.mehrfach) };
    case 'offeneVerstaendnisfrage':
      return { typ: 'offeneVerstaendnisfrage', punkte: block.punkte, quelleId: block.quelleId,
        anzahlFragen: block.config.fragen.length };
    case 'offeneSchreibaufgabe':
      return { typ: 'offeneSchreibaufgabe', punkte: block.punkte, quelleId: block.quelleId,
        textsorte: block.config.textsorte, situation: block.config.situation,
        umfangWorte: block.config.umfangWorte, aspekte: block.config.aspekte };
    case 'markieraufgabe':
      return { typ: 'markieraufgabe', punkte: block.punkte, quelleId: block.config.quelleId,
        anweisung: block.config.anweisung };
    case 'wordScramble': {
      const manuell = block.config.eingabemodus === 'manuell';
      const gefuellt = (block.config.saetze ?? []).filter((s) => s.wort.trim().length > 0);
      return { typ: 'wordScramble', punkte: block.punkte, quelleId: block.quelleId,
        anzahlSaetze: Math.max(1, block.config.saetze?.length ?? 1),
        ...(manuell && gefuellt.length > 0 ? { saetze: gefuellt } : {}) };
    }
    case 'kategorisierung':
      return { typ: 'kategorisierung', punkte: block.punkte, quelleId: block.quelleId,
        anzahlItems: block.config.items.length,
        kategorien: block.config.kategorien.map((k) => k.name) };
    case 'tabelle':
      return { typ: 'tabelle', punkte: block.punkte, quelleId: block.quelleId,
        spalten: block.config.spalten.map((s) => s.titel) };
    case 'stiluebung':
      return { typ: 'stiluebung', punkte: block.punkte, quelleId: block.quelleId,
        zielniveau: block.config.zielniveau, transformation: block.config.transformation };
    case 'songanalyse':
      return { typ: 'songanalyse', punkte: block.punkte, quelleId: block.quelleId,
        aufgabe: block.config.aufgabe };
    case 'kreuzwortraetsel': {
      const manuell = block.config.eingabemodus === 'manuell';
      const gefuellt = (block.config.eintraege ?? []).filter((e) => e.wort.trim().length > 0);
      return { typ: 'kreuzwortraetsel', punkte: block.punkte, quelleId: block.quelleId,
        anzahlWoerter: block.config.anzahlWoerter ?? block.config.eintraege?.length ?? 6,
        ...(manuell && gefuellt.length > 0 ? { eintraege: gefuellt } : {}) };
    }
    case 'wortgitter': {
      const manuell = block.config.eingabemodus === 'manuell';
      const gefuellt = (block.config.woerter ?? []).filter((w) => w.trim().length > 0);
      return { typ: 'wortgitter', punkte: block.punkte, quelleId: block.quelleId,
        anzahlWoerter: block.config.anzahlWoerter ?? block.config.woerter?.length ?? 6,
        ...(manuell && gefuellt.length > 0 ? { woerter: gefuellt } : {}) };
    }
    case 'vokabeluebung': {
      const manuell = block.config.eingabemodus === 'manuell';
      const gefuellt = (block.config.vokabeln ?? []).filter((v) => v.deutsch.trim().length > 0 || v.fremdsprache.trim().length > 0);
      return { typ: 'vokabeluebung', punkte: block.punkte, quelleId: block.quelleId,
        anzahlVokabeln: block.config.anzahlVokabeln ?? block.config.vokabeln?.length ?? 6, richtung: block.config.richtung,
        ...(manuell && gefuellt.length > 0 ? { vokabeln: gefuellt } : {}) };
    }
    case 'fehlerkorrektur': {
      const manuell = block.config.eingabemodus === 'manuell';
      const gefuellt = (block.config.saetze ?? []).filter((s) => s.satz.trim().length > 0);
      return { typ: 'fehlerkorrektur', punkte: block.punkte, quelleId: block.quelleId,
        anzahlSaetze: block.config.saetze.length,
        ...(manuell && gefuellt.length > 0 ? { saetze: gefuellt } : {}) };
    }
    case 'roleplay': {
      const manuell = block.config.eingabemodus === 'manuell';
      const gefuellteRollen = (block.config.rollen ?? []).filter((r) => r.name.trim().length > 0 || r.beschreibung.trim().length > 0 || r.aufgabe.trim().length > 0);
      const gefuellteRedemittel = (block.config.redemittel ?? []).filter((r) => r.trim().length > 0);
      return {
        typ: 'roleplay',
        punkte: block.punkte,
        quelleId: block.quelleId,
        situation: block.config.situation,
        setting: block.config.setting,
        ziel: block.config.ziel,
        zeitMinuten: block.config.zeitMinuten,
        ...(manuell && gefuellteRedemittel.length > 0 ? { redemittel: gefuellteRedemittel } : {}),
        ...(manuell && gefuellteRollen.length > 0 ? { rollen: gefuellteRollen } : {}),
        bewertung: block.config.bewertung,
      };
    }
    case 'rollenkartenSet': {
      const manuell = block.config.eingabemodus === 'manuell';
      const gefuellteRollen = (block.config.rollen ?? []).filter((r) => r.name.trim().length > 0 && !r.name.trim().startsWith('['));
      const gefuellteSzenarien = (block.config.szenarien ?? []).filter((s) => s.titel.trim().length > 0 && !s.titel.startsWith('['));
      return {
        typ: 'rollenkartenSet',
        punkte: block.punkte,
        quelleId: block.quelleId,
        rahmen: block.config.rahmen,
        zeitMinuten: block.config.zeitMinuten,
        anzahlSzenarien: block.config.szenarien?.length ?? 1,
        ...(gefuellteRollen.length > 0 ? { rollen: gefuellteRollen } : {}),
        ...(manuell && gefuellteSzenarien.length > 0 ? { szenarien: gefuellteSzenarien } : {}),
      };
    }
    case 'umformung':
      throw new Error('Blocktyp "umformung" wird nicht mehr unterstützt.');
  }
}

/** Prüft, ob wir in einer Tauri-Umgebung laufen. */
function isTauri(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
}

function errToMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') return (err as any).message ?? (err as any).error ?? JSON.stringify(err);
  return 'Unbekannter Fehler';
}

// Markiert Transport-/API-Fehler (Netz, Rate-Limit, Key) — nur diese lösen einen
// Anbieter-Wechsel aus. Ungültiger Output ist KEIN Transportfehler.
const TRANSPORT = '__TRANSPORT__:';

export function useGenerate(dispatch: React.Dispatch<AppAction>) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<GenerateStage>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [aktiverProvider, setAktiverProvider] = useState<string | null>(null);
  const [pruefend, setPruefend] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelRef = useRef(false);

  const startTimer = () => {
    const t0 = Date.now();
    setElapsedMs(0);
    timerRef.current = setInterval(() => setElapsedMs(Date.now() - t0), 200);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  // Ein Anbieter, 2 Versuche (mit Reparaturrunde). Wirft bei Transportfehler mit TRANSPORT-Prefix.
  const runAttempts = useCallback(async (
    providerId: string, apiModel: string, input: GenerateInput, state: AppState, extraHinweis?: string,
    judgeCfg?: { provider: string; model?: string; enabled?: boolean },
  ): Promise<DocumentV1> => {
    const messages = buildMessages(input);
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system') as ChatMessage[];
    if (extraHinweis?.trim()) {
      chatMessages.push({ role: 'user', content: `Zusätzliche Anweisung für diesen Block: ${extraHinweis.trim()}` });
    }

    // Judge-Kosten-Guard: Kompetenz-Modus immer (erfundene Übungen brauchen die
    // grammatik-/inhaltsbewusste Prüfung). Im Text-Modus nur, wenn fehleranfällige
    // Musterlösungs-Typen angefordert sind (Audit A5: umformung/fehlerkorrektur) —
    // sonst weiterhin kein zusätzlicher Judge-Call pro Schularbeit.
    const modus = input.meta.modus ?? 'text';
    const hatMusterloesungsRisiko = input.bloecke.some(
      (b) => b.typ === 'fehlerkorrektur' || b.typ === 'umformung',
    );
    const judgeAktiv = (modus === 'kompetenz' || hatMusterloesungsRisiko) && judgeCfg?.enabled !== false;
    const judgeComplete: ((msgs: ChatMessage[]) => Promise<string>) | undefined = judgeAktiv
      ? async (msgs) => {
          const sys = msgs.find((m) => m.role === 'system');
          const rest = msgs.filter((m) => m.role !== 'system') as ChatMessage[];
          return invoke<string>('llm_complete', {
            provider: judgeCfg!.provider,
            model: judgeCfg!.model ?? '',
            system: sys?.content ?? '',
            messages: rest,
            kreativitaet: 0.1,
          });
        }
      : undefined;
    const judgeStoffItems = judgeAktiv ? input.stoffItems?.map((s) => ({ titel: s.titel })) : undefined;

    for (let versuch = 1; versuch <= 2; versuch++) {
      setStage(versuch === 1 ? 'sende' : 'korrigiere');
      let rohText: string;
      try {
        rohText = await invoke<string>('llm_complete', {
          provider: providerId, model: apiModel,
          system: systemMessage?.content ?? '', messages: chatMessages,
          kreativitaet: state.kreativitaet,
        });
      } catch (e) {
        throw new Error(`${TRANSPORT} ${errToMessage(e)}`);
      }
      if (cancelRef.current) throw new Error('__CANCELLED__');

      setStage('validiere');
      const validiert = await parseAndValidate(rohText, state.meta, state.quelltexte, judgeCfg, judgeComplete, judgeStoffItems);
      if (validiert.ok && validiert.document) return validiert.document;
      if (cancelRef.current) throw new Error('__CANCELLED__');

      if (versuch < 2) {
        chatMessages.push({ role: 'assistant', content: rohText });
        chatMessages.push(buildRepairMessage(rohText, validiert.fehler ?? 'unbekannter Fehler'));
      } else {
        const e = new Error(validiert.fehler ?? 'Generierung fehlgeschlagen');
        (e as any).rohText = rohText;
        throw e;
      }
    }
    throw new Error('Generierung fehlgeschlagen');
  }, []);

  const guards = (state: AppState): string | null => {
    if (!isTauri()) return 'LLM-Generierung ist nur in der Desktop-App verfügbar. Bitte `pnpm run tauri dev` verwenden.';
    if (!state.meta.thema?.trim()) return 'Bitte gib ein Thema ein (Schritt 1: Absicht).';
    if (state.bloecke.length === 0) return 'Keine Aufgabenblöcke vorhanden (Schritt 3: Baukasten).';

    const modus = state.meta.modus ?? 'text';
    if (modus === 'kompetenz') {
      const hatKatalog = (state.meta.stoffItemIds?.length ?? 0) > 0;
      const hatFreitext = !!state.meta.freieKompetenz?.trim();
      if (!hatKatalog && !hatFreitext) {
        return 'Bitte eine Kompetenz aus dem Katalog wählen oder eine Kompetenz/Thema frei eingeben.';
      }
      return null;
    }

    // Text-Modus: Quelltext-Pflicht
    if (state.quelltexte.length === 0) return 'Mindestens ein Quelltext ist erforderlich (Schritt 2: Quelltexte).';
    const MIN_WOERTER = 80;
    const woerter = state.quelltexte.reduce(
      (sum, q) => sum + (q.inhalt?.trim() ? q.inhalt.trim().split(/\s+/).length : 0), 0,
    );
    if (woerter < MIN_WOERTER) {
      return `Die Quelltexte sind zu kurz (${woerter} Wörter, mindestens ${MIN_WOERTER} nötig). Bitte lade längere Texte hoch.`;
    }
    return null;
  };

  const resolveProvider = (state: AppState) => {
    const uiProvider = state.llmProvider ?? 'mistral';
    const providerId = PROVIDER_MAP[uiProvider as keyof typeof PROVIDER_MAP];
    if (!providerId) throw new Error(`Unbekannter Anbieter: ${uiProvider}`);
    return { providerId, apiModel: MODEL_MAP[state.modelName] ?? state.modelName };
  };

  const generate = useCallback(async (state: AppState) => {
    const guardMsg = guards(state);
    if (guardMsg) { setError(guardMsg); return false; }

    cancelRef.current = false;
    setGenerating(true);
    setError(null);
    setStage('sende');
    startTimer();
    dispatch({ type: 'SET_GENERIERTES_DOKUMENT', dokument: null });

    try {
      const { providerId, apiModel } = resolveProvider(state);
      const settings = loadSettings();
      const modus = state.meta.modus ?? 'text';
      const input: GenerateInput = {
        meta: state.meta,
        quelltexte: modus === 'kompetenz' ? [] : state.quelltexte,
        bloecke: state.bloecke.map(blockToRequest),
        stoffItems: buildStoffItems(state.meta),
        inhaltsModul: buildInhaltsModul(state.meta),
      };
      const judgeCfg = settings.judgeEnabled !== false ? {
        provider: 'deepseek',
        model: 'deepseek-chat',
        enabled: true,
      } : { provider: 'deepseek', model: 'deepseek-chat', enabled: false as const };

      // Anbieter-Kette: gewählter Anbieter, dann bei TRANSPORTfehler ein westlicher Ersatz.
      const chain: Array<{ providerId: string; apiModel: string }> = [{ providerId, apiModel }];
      const fb = FALLBACK_ORDER.find((p) => p !== providerId);
      if (fb) chain.push({ providerId: fb, apiModel: FALLBACK_MODEL[fb]! });

      let lastErr: unknown = null;
      for (let i = 0; i < chain.length; i++) {
        const cand = chain[i]!;
        setAktiverProvider(cand.providerId);
        try {
          const document = await runAttempts(cand.providerId, cand.apiModel, input, state, undefined, judgeCfg);
          dispatch({ type: 'SET_GENERIERTES_DOKUMENT', dokument: document });
          setStage('fertig');
          return true;
        } catch (err) {
          lastErr = err;
          const msg = errToMessage(err);
          if (msg === '__CANCELLED__') { setStage('idle'); return false; }
          // Nur bei echtem Transportfehler auf Ersatz-Anbieter wechseln.
          const istTransport = msg.startsWith(TRANSPORT);
          if (istTransport && i < chain.length - 1) {
            console.warn(`[useGenerate] ${cand.providerId} nicht erreichbar, wechsle zu ${chain[i + 1]!.providerId}`);
            continue;
          }
          throw err;
        }
      }
      throw lastErr ?? new Error('Generierung fehlgeschlagen');
    } catch (err) {
      let msg = errToMessage(err).replace(TRANSPORT, 'Anbieter nicht erreichbar:');
      const rohText = (err as any)?.rohText as string | undefined;
      if (rohText) {
        msg += '\n\n--- ROHANTWORT (erste 800 Zeichen) ---\n' + rohText.slice(0, 800) + (rohText.length > 800 ? '\n... (abgeschnitten)' : '');
      }
      setError(msg);
      setStage('fehler');
      return false;
    } finally {
      stopTimer();
      setGenerating(false);
    }
  }, [dispatch, runAttempts]);

  // Einen einzelnen Block neu generieren (optional mit Hinweis wie „kürzer", „schwieriger").
  // Ersetzt den Block im bereits generierten Dokument. Kein Anbieter-Fallback (günstig halten).
  const regenerateBlock = useCallback(async (state: AppState, blockId: string, hinweis?: string): Promise<Block | null> => {
    const doc = state.generiertesDokument;
    if (!doc) { setError('Kein generiertes Dokument vorhanden.'); return null; }
    const ziel = doc.bloecke.find((b) => b.id === blockId);
    if (!ziel) { setError('Block nicht gefunden.'); return null; }
    if (!isTauri()) { setError('Nur in der Desktop-App verfügbar.'); return null; }

    cancelRef.current = false;
    setGenerating(true);
    setError(null);
    setStage('sende');
    startTimer();
    try {
      const { providerId, apiModel } = resolveProvider(state);
      setAktiverProvider(providerId);
      const modus = doc.meta.modus ?? 'text';
      const input: GenerateInput = {
        meta: doc.meta,
        quelltexte: modus === 'kompetenz' ? [] : doc.quelltexte,
        bloecke: [blockToRequest(ziel)],
        stoffItems: buildStoffItems(doc.meta),
        inhaltsModul: buildInhaltsModul(doc.meta),
      };
      const ergebnis = await runAttempts(providerId, apiModel, input, { ...state, meta: doc.meta, quelltexte: modus === 'kompetenz' ? [] : doc.quelltexte }, hinweis);
      const neu = ergebnis.bloecke[0];
      if (!neu) throw new Error('Kein Block in der Antwort.');
      // id des Originalblocks beibehalten, restliche Felder ersetzen.
      const neuMitId = { ...neu, id: blockId } as Block;
      dispatch({ type: 'UPDATE_GENERIERTER_BLOCK', id: blockId, block: neuMitId as Partial<Block> });
      setStage('fertig');
      return neuMitId;
    } catch (err) {
      const msg = errToMessage(err);
      if (msg === '__CANCELLED__') { setStage('idle'); return null; }
      setError(msg.replace(TRANSPORT, 'Anbieter nicht erreichbar:'));
      setStage('fehler');
      return null;
    } finally {
      stopTimer();
      setGenerating(false);
    }
  }, [dispatch, runAttempts]);

  const pruefeLoesungen = useCallback(async (state: AppState): Promise<{ issuesByBlock: Record<string, string[]>; gepruefteIds: string[] }> => {
    if (!state.generiertesDokument) return { issuesByBlock: {}, gepruefteIds: [] };
    if (!isTauri()) { setError('Nur in der Desktop-App verfügbar.'); return { issuesByBlock: {}, gepruefteIds: [] }; }

    const { providerId, apiModel } = resolveProvider(state);
    const complete = async (messages: ChatMessage[]): Promise<string> => {
      const sys = messages.find((m) => m.role === 'system');
      const rest = messages.filter((m) => m.role !== 'system') as ChatMessage[];
      return invoke<string>('llm_complete', {
        provider: providerId,
        model: apiModel,
        system: sys?.content ?? '',
        messages: rest,
        kreativitaet: 0.1,
      });
    };

    setPruefend(true);
    setError(null);
    try {
      const issues: QualityIssue[] = await runJudge(state.generiertesDokument, state.quelltexte, complete);
      const issuesByBlock: Record<string, string[]> = {};
      for (const issue of issues) {
        if (!issue.blockId) continue;
        if (!issuesByBlock[issue.blockId]) issuesByBlock[issue.blockId] = [];
        issuesByBlock[issue.blockId]!.push(issue.message);
      }
      const gepruefteIds = state.generiertesDokument.bloecke
        .filter((b) => istRisikoTyp(b.typ))
        .map((b) => b.id);
      return { issuesByBlock, gepruefteIds };
    } catch (err) {
      const msg = errToMessage(err);
      setError(`Lösungsprüfung fehlgeschlagen: ${msg}`);
      return { issuesByBlock: {}, gepruefteIds: [] };
    } finally {
      setPruefend(false);
    }
  }, []);

  const cancel = useCallback(() => { cancelRef.current = true; }, []);

  return { generate, regenerateBlock, pruefeLoesungen, cancel, generating, pruefend, stage, elapsedMs, aktiverProvider, error };
}

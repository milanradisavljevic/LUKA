import type {
  GenerateInput,
  GenerateResult,
  ProviderConfig,
} from './types.js';
import { buildMessages, buildRepairMessage } from './prompt.js';
import { parseAndValidate } from './validate.js';
import type { ChatMessage } from './types.js';
import { getProvider } from './provider-registry.js';

export * from './types.js';
export { buildMessages, buildRefinementMessages, buildSrdpDeutschTrainingHint } from './prompt.js';
export { parseAndValidate, extractJson } from './validate.js';
export { refineDocument, type RefineComplete } from './refine.js';
export { normalizeDocument } from './normalize.js';
export { transformToSchema } from './transform.js';
export { buildRepairMessage } from './prompt.js';
export { runQualityChecks, checkGrounding, checkDuplicates, checkSchreibaufgabe, checkLernzielCoverage, llmJudgeHook, type QualityIssue, type LlmJudgeResult, type QualityCheckResult } from './quality.js';
export { runJudge, istRisikoTyp } from './judge.js';

export { getProvider } from './provider-registry.js';

/**
 * Erzeugt aus Quelltexten und Baukasten-Vorgaben ein schema-konformes Dokument.
 * Validiert die Modellantwort gegen das Zod-Schema und versucht bei Fehlern
 * einmal eine Korrektur. Das Ergebnis ist garantiert schema-konform (ok=true)
 * und kann direkt an den Renderer uebergeben werden.
 */
export async function generateDocument(
  input: GenerateInput,
  cfg: ProviderConfig,
  judgeCfg?: { provider: string; model?: string; apiKey?: string; enabled?: boolean },
): Promise<GenerateResult> {
  const provider = getProvider(cfg.provider);
  const messages = buildMessages(input);

  const judgeComplete = judgeCfg?.enabled
    ? async (msgs: ChatMessage[]) => {
        const judgeProvider = getProvider(judgeCfg.provider as ProviderId);
        return judgeProvider.complete(msgs, { provider: judgeCfg.provider as ProviderId, model: judgeCfg.model ?? '', apiKey: judgeCfg.apiKey ?? '', kreativitaet: 0.1 });
      }
    : undefined;

  let rohText = '';
  for (let versuch = 1; versuch <= 2; versuch++) {
    rohText = await provider.complete(messages, cfg, input);
    const validiert = await parseAndValidate(rohText, input.meta, input.quelltexte, judgeCfg, judgeComplete, input.stoffItems);

    if (validiert.ok && validiert.document) {
      return { ok: true, document: validiert.document, rohText, versuche: versuch };
    }

    if (versuch < 2) {
      // Eine Korrekturrunde: Fehler zurueckspielen.
      messages.push({ role: 'assistant', content: rohText });
      messages.push(buildRepairMessage(rohText, validiert.fehler ?? 'unbekannter Fehler'));
    } else {
      return { ok: false, fehler: validiert.fehler ?? 'unbekannter Fehler', rohText, versuche: versuch };
    }
  }

  return { ok: false, fehler: 'Generierung fehlgeschlagen', rohText, versuche: 2 };
}

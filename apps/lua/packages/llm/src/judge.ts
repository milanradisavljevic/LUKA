import type { DocumentV1, QuellText, Block } from '@lehrunterlagen/schema';
import type { QualityIssue } from './quality.js';
import type { ChatMessage } from './types.js';

const RISIKO_TYPEN = new Set<string>([
  'multipleChoice',
  'matching',
  'lueckentext',
  'offeneVerstaendnisfrage',
]);

function findeQuelltext(quelltexte: QuellText[], quelleId?: string): QuellText | undefined {
  if (!quelleId) return quelltexte[0];
  return quelltexte.find((q) => q.id === quelleId);
}

function buildJudgePrompt(block: Block, quelltexte: QuellText[]): string {
  const qt = findeQuelltext(quelltexte, block.quelleId);
  const quelltextText = qt ? `${qt.titel}\n\n${qt.inhalt}` : '(kein Quelltext)';

  const base = `Du bist ein unabhaengiger Pruefer. Lies den Quelltext und loese die Aufgabe AUSSCHLIESSLICH aus dem Quelltext.\n\nQUELLTEXT:\n${quelltextText}\n\n`;

  switch (block.typ) {
    case 'multipleChoice': {
      const cfg = block.config as { fragen: Array<{ nr: number; frage: string; optionen: Array<{ key: string; text: string }>; korrekt: string[]; mehrfach: boolean }> };
      let prompt = base + `AUFGABE: ${block.arbeitsanweisung}\n\n`;
      for (const frage of cfg.fragen) {
        prompt += `Frage ${frage.nr}: ${frage.frage}\n`;
        for (const opt of frage.optionen) {
          prompt += `${opt.key}: ${opt.text}\n`;
        }
        prompt += '\n';
      }
      prompt += `Antworte NUR im JSON-Format: { "antworten": { "1": "A", "2": "B", ... } }.\nGib fuer jede Frage den Key der richtigen Option an.`;
      return prompt;
    }
    case 'matching': {
      const cfg = block.config as { items: Array<{ nr: number; prompt: string; korrekt: string }>; optionen: Array<{ key: string; text: string }> };
      let prompt = base + `AUFGABE: ${block.arbeitsanweisung}\n\n`;
      prompt += 'Items:\n';
      for (const item of cfg.items) {
        prompt += `${item.nr}: ${item.prompt}\n`;
      }
      prompt += '\nOptionen:\n';
      for (const opt of cfg.optionen) {
        prompt += `${opt.key}: ${opt.text}\n`;
      }
      prompt += `\nAntworte NUR im JSON-Format: { "zuordnung": { "1": "A", "2": "B", ... } }.\nGib fuer jedes Item den Key der passenden Option an.`;
      return prompt;
    }
    case 'lueckentext': {
      const cfg = block.config as { anzahlLuecken: number; wortbank: boolean; distraktoren: number; text?: string };
      let prompt = base + `AUFGABE: ${block.arbeitsanweisung}\n\n`;
      if (cfg.text) prompt += `Text: ${cfg.text}\n\n`;
      prompt += `Antworte NUR im JSON-Format: { "luecken": { "1": "Loesungswort", "2": "Loesungswort", ... } }.\nGib fuer jede Luecke (nummeriert) das fehlende Wort an.`;
      return prompt;
    }
    case 'offeneVerstaendnisfrage': {
      const cfg = block.config as { fragen: Array<{ nr: number; frage: string; zeilen: number; musterantwort: string }> };
      let prompt = base + `AUFGABE: ${block.arbeitsanweisung}\n\n`;
      for (const frage of cfg.fragen) {
        prompt += `Frage ${frage.nr}: ${frage.frage}\n`;
      }
      prompt += `\nAntworte NUR im JSON-Format: { "antworten": { "1": "Deine Antwort", "2": "Deine Antwort", ... } }.\nBeantworte jede Frage kurz und praegnant (2-5 Saetze).`;
      return prompt;
    }
    default:
      return '';
  }
}

function extractJson(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

function vergleicheMC(block: Block, parsed: any): string | null {
  const antworten: Record<string, string> = parsed?.antworten ?? {};
  const cfg = block.config as { fragen: Array<{ nr: number; korrekt: string[] }> };
  for (const frage of cfg.fragen) {
    const judgeKey = antworten[String(frage.nr)];
    const korrekt = (frage.korrekt ?? [])[0];
    if (!judgeKey || judgeKey.toUpperCase() !== korrekt?.toUpperCase()) {
      return `Frage ${frage.nr}: Judge-Antwort "${judgeKey ?? '?'}" weicht vom Schlüssel "${korrekt}" ab. Mögliche Mehrdeutigkeit.`;
    }
  }
  return null;
}

function vergleicheMatching(block: Block, parsed: any): string | null {
  const zuordnung: Record<string, string> = parsed?.zuordnung ?? {};
  const cfg = block.config as { items: Array<{ nr: number; korrekt: string }> };
  for (const item of cfg.items) {
    const judgeKey = zuordnung[String(item.nr)];
    if (!judgeKey || judgeKey.toUpperCase() !== item.korrekt?.toUpperCase()) {
      return `Item ${item.nr}: Judge-Antwort "${judgeKey ?? '?'}" weicht vom Schlüssel "${item.korrekt}" ab. Mögliche Mehrdeutigkeit.`;
    }
  }
  return null;
}

function normalizeToken(t: string): string {
  return t.toLowerCase().replace(/[^\w]/g, '');
}

function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\s+/)
      .map(normalizeToken)
      .filter((t) => t.length >= 3),
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const x of a) if (b.has(x)) count++;
  return count;
}

function vergleicheLueckentext(block: Block, parsed: any): string | null {
  const luecken: Record<string, string> = parsed?.luecken ?? {};
  if (!('loesung' in block) || !block.loesung) return null;
  const loesung = block.loesung as { luecken: Array<{ nr: number; wort: string }> };
  for (const loes of loesung.luecken) {
    const judgeWort = normalizeToken(luecken[String(loes.nr)] ?? '');
    const korrektWort = normalizeToken(loes.wort);
    if (judgeWort !== korrektWort) {
      return `Luecke ${loes.nr}: Judge-Antwort "${judgeWort || '?'}" weicht vom Schlüssel "${korrektWort}" ab. Mögliche Mehrdeutigkeit.`;
    }
  }
  return null;
}

function vergleicheOffeneFrage(block: Block, parsed: any): string | null {
  const antworten: Record<string, string> = parsed?.antworten ?? {};
  const cfg = block.config as { fragen: Array<{ nr: number; musterantwort: string }> };
  for (const frage of cfg.fragen) {
    const judgeAntwort = antworten[String(frage.nr)] ?? '';
    const muster = frage.musterantwort ?? '';
    if (!judgeAntwort.trim()) {
      return `Frage ${frage.nr}: Judge lieferte keine Antwort. Mögliche Mehrdeutigkeit.`;
    }
    // Semantik-Nähe per Token-Overlap
    const judgeTokens = tokenSet(judgeAntwort);
    const musterTokens = tokenSet(muster);
    if (musterTokens.size === 0) continue;
    const shared = overlap(judgeTokens, musterTokens);
    const ratio = shared / musterTokens.size;
    if (ratio < 0.3) {
      return `Frage ${frage.nr}: Judge-Antwort deckt sich nur zu ${Math.round(ratio * 100)}% mit der Musterantwort. Mögliche Mehrdeutigkeit.`;
    }
  }
  return null;
}

function bewerteBlock(block: Block, raw: string): string | null {
  const parsed = extractJson(raw);
  if (!parsed) return 'Judge-Antwort konnte nicht geparst werden.';

  switch (block.typ) {
    case 'multipleChoice':
      return vergleicheMC(block, parsed);
    case 'matching':
      return vergleicheMatching(block, parsed);
    case 'lueckentext':
      return vergleicheLueckentext(block, parsed);
    case 'offeneVerstaendnisfrage':
      return vergleicheOffeneFrage(block, parsed);
    default:
      return null;
  }
}

export async function runJudge(
  doc: DocumentV1,
  quelltexte: QuellText[],
  complete: (messages: ChatMessage[]) => Promise<string>,
): Promise<QualityIssue[]> {
  const issues: QualityIssue[] = [];
  const risikoBloecke = doc.bloecke.filter((b) => RISIKO_TYPEN.has(b.typ));

  for (const block of risikoBloecke) {
    const prompt = buildJudgePrompt(block, quelltexte);
    if (!prompt) continue;

    try {
      const raw = await complete([
        { role: 'user', content: prompt },
      ]);
      const fehler = bewerteBlock(block, raw);
      if (fehler) {
        issues.push({
          blockId: block.id,
          severity: 'warning',
          message: `Judge: ${fehler}`,
        });
      }
    } catch {
      // Judge-Fehler sollen die Generierung nicht blockieren
      issues.push({
        blockId: block.id,
        severity: 'warning',
        message: 'Judge-Pruefung konnte nicht durchgefuehrt werden (API-Fehler).',
      });
    }
  }

  return issues;
}

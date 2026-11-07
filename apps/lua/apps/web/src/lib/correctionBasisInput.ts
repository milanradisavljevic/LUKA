/** Lokale Vorbelegung aus einer einzigen Unterrichtsdatei; keine KI und keine Textreparatur. */
export function inferCorrectionBasis(text: string): {task: string; wordChoices: string[]; ambiguousTask: boolean} {
  const lines = text.split(/\r?\n/);
  const alternatives = lines.filter(line => /^\s*(?:aufgabe|thema)\s+\d+\s*[:.)–-]/iu.test(line));
  const starts = lines.flatMap((line,index) => /^\s*(?:verfasse(?:n\s+sie)?|schreibe(?:n\s+sie)?|analysiere(?:n\s+sie)?|interpretiere(?:n\s+sie)?|erörtere(?:n\s+sie)?|aufgabenstellung|arbeitsauftr(?:ag|äge))\b/iu.test(line) ? [index] : []);
  const commands = starts.filter(index => !/^\s*(?:aufgabenstellung|arbeitsauftr)/iu.test(lines[index]!));
  const ambiguousTask = alternatives.length > 1 || commands.length > 1;
  const aa = lines.findIndex(line => /^\s*(?:AA\s*1|Arbeitsauftrag\s*1)\s*[:.)]/iu.test(line));
  const start = starts[0] ?? (aa >= 0 ? aa : -1);
  let task = '';
  if (start >= 0 && !ambiguousTask) {
    const end = lines.findIndex((line,index) => index > start && /^\s*(?:textbeilage|beilage|ausgangstext|material)\s*:\s*$/iu.test(line));
    task = lines.slice(start,end >= 0 ? end : undefined).join('\n').trim();
  }
  const choices = new Set<string>();
  for (const match of (task || text).matchAll(/\b([1-9]\d{1,3})(?:\s*(?:[-–]|bis|und)\s*([1-9]\d{1,3}))?\s*W(?:ö|oe|o)rter(?:n)?\b/giu)) {
    const prefix = (task || text).slice(Math.max(0,match.index! - 30),match.index);
    if (/(?:mindestens|maximal|höchstens|mehr als|weniger als)\s*$/iu.test(prefix)) continue;
    if (match[2] && Number(match[2]) < Number(match[1])) continue;
    choices.add(match[2] ? `${match[1]}–${match[2]}` : match[1]!);
  }
  return {task, wordChoices:[...choices], ambiguousTask};
}

export function correctionBasisBlocker(input: {scope: string; loading: boolean; loaded: boolean; task: string; amount: string; confirmed: boolean}): string | null {
  if (input.scope === 'sprache') return null;
  if (input.loading) return 'Deine Datei und das Bewertungsraster werden gelesen …';
  if (!input.loaded) return 'Bitte in Schritt 3 die Datei und das Bewertungsraster prüfen.';
  if (!input.task.trim()) return 'Bitte in Schritt 3 den Arbeitsauftrag aus deiner Datei auswählen oder ergänzen.';
  const amount = input.amount.match(/^([1-9]\d{0,3})(?:[-–]([1-9]\d{0,3}))?$/);
  if (input.amount !== 'keine Vorgabe' && (!amount || (amount[2] && Number(amount[2]) < Number(amount[1])))) return 'Bitte in Schritt 3 die Wortzahl prüfen oder ausdrücklich „Keine Wortzahlvorgabe“ wählen.';
  if (!input.confirmed) return 'Bitte in Schritt 3 bestätigen, dass Arbeitsauftrag, Text und Wortzahl stimmen.';
  return null;
}

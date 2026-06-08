// Heuristische Quelltext-Säuberung.
//
// Entfernt Website-Boilerplate, das bei Import/Einfügen im Quelltext landet
// (Navigation, Footer, Newsletter-Aufrufe, Related-Article-Listen, reine URL-Zeilen,
// wiederholte Kurz-Labels). Bewusst KONSERVATIV: echte Inhaltsabsätze (lang, keine
// URLs, nicht wiederholt) bleiben unangetastet. Rein, deterministisch, ohne Abhängigkeiten,
// damit Renderer, Web-App und Input-Paket dieselbe Logik nutzen.

// Marker, die am Zeilenanfang auf Boilerplate hindeuten (case-insensitive).
const BOILERPLATE_PREFIXES = [
  'skip to',
  'zum inhalt springen',
  'zur navigation springen',
  'zur suche springen',
  'related content',
  'subscribe to',
  'sign up here',
  'sign up',
  'follow us',
  'share this',
  'share your reality',
  'join the',
  'methodology:',
  'image:',
  'photo:',
  'foto:',
  'advertisement',
  'read more',
  'weiterlesen',
  'mehr erfahren',
  'cookie',
  'datenschutz',
  'privacy policy',
];

// Kurze Zeilen, die als Ganzes reine Navigations-/Kategorie-Labels sind.
const NAV_LABELS = new Set([
  'big survey',
  'article',
  'report',
  'survey',
  'related content',
  'more',
  'mehr',
  'menu',
  'menü',
  'suche',
  'search',
  'login',
  'anmelden',
  'newsletter',
  'getty',
]);

function istBoilerplateZeile(line: string): boolean {
  const trimmed = line.trim();
  const t = trimmed.toLowerCase();
  if (t.length === 0) return false;
  // Zeile ist im Wesentlichen nur eine URL/Domain (ggf. mit kurzem Label davor wie
  // "nach:", "Text 1:", "Quelle:"). Echte Sätze, die nebenbei einen Link enthalten,
  // bleiben (Rest-Text > 15 Zeichen).
  const urlMatch = trimmed.match(/https?:\/\/\S+|[\w-]+(?:\.[\w-]+)+\/\S*/i);
  if (urlMatch) {
    const rest = trimmed.replace(urlMatch[0], '').replace(/[:|–—-]/g, ' ').trim();
    if (rest.length <= 15) return true;
  }
  // Ganzzeilige Navigations-Labels.
  if (NAV_LABELS.has(t)) return true;
  // Bekannte Marker am Zeilenanfang.
  for (const m of BOILERPLATE_PREFIXES) if (t.startsWith(m)) return true;
  return false;
}

/**
 * Säubert einen Quelltext von typischem Website-Boilerplate.
 * Erhält Absatzstruktur (Leerzeilen), entfernt nur eindeutigen Müll.
 */
export function bereinigeQuelltext(text: string): string {
  if (!text) return text;
  const roh = text.replace(/\r\n/g, '\n').split('\n');

  // Häufig wiederholte kurze Zeilen sind fast immer Navigations-/Label-Müll.
  const haeufigkeit = new Map<string, number>();
  for (const l of roh) {
    const t = l.trim();
    if (t.length > 0 && t.length < 40) haeufigkeit.set(t, (haeufigkeit.get(t) ?? 0) + 1);
  }

  const out: string[] = [];
  for (const line of roh) {
    const t = line.trim();
    if (t.length === 0) {
      out.push('');
      continue;
    }
    if (istBoilerplateZeile(line)) continue;
    // Wiederholtes Kurz-Label (≥ 3×) — typisch für Related-Article-Listen.
    if (t.length < 40 && (haeufigkeit.get(t) ?? 0) >= 3) continue;
    out.push(line.trimEnd());
  }

  // Mehrfache Leerzeilen zu einer (Absatztrenner) zusammenfassen, Rand trimmen.
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

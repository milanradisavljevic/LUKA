/**
 * Tastenkürzel — **eine** Quelle für die ganze App.
 *
 * Vorher standen die Kürzel an fünf Stellen verteilt: im globalen keydown in
 * `App.tsx`, in `useZoom`, im Tafel-Modus, in der Palette und in der Hilfe. Die
 * Hilfe nannte drei davon, der Rest war nirgends dokumentiert. Diese Liste ist
 * der Ort, an dem ein neues Kürzel eingetragen wird; Hilfe und Kopfzeile lesen
 * daraus.
 *
 * `Mod` ist ein Platzhalter und wird über `formatShortcut()` zur tatsächlich
 * gedrückten Taste: `⌘` auf Apple-Geräten, `Strg` sonst. Vorher stand im Kopf
 * fest `⌘K` — auf Windows eine Anweisung ins Leere.
 */
import type { LucideIcon } from 'lucide-react';
import { Command, Compass, Presentation, Wand2 } from 'lucide-react';

export type ShortcutScope = 'ueberall' | 'palette' | 'assistent' | 'tafel';

export interface Shortcut {
  /** Tastenfolge mit `Mod` als Platzhalter, z. B. `'Mod + K'`. */
  keys: string;
  desc: string;
  scope: ShortcutScope;
}

export const SHORTCUT_SCOPES: { id: ShortcutScope; label: string; Icon: LucideIcon }[] = [
  { id: 'ueberall', label: 'Überall', Icon: Command },
  { id: 'palette', label: 'In der Suche', Icon: Compass },
  { id: 'assistent', label: 'Im Assistenten', Icon: Wand2 },
  { id: 'tafel', label: 'Im Tafel-Modus', Icon: Presentation },
];

export const SHORTCUTS: Shortcut[] = [
  // --- überall ---
  { keys: 'Mod + K', desc: 'Suche und Befehle öffnen oder schließen', scope: 'ueberall' },
  { keys: 'Esc', desc: 'Suche, Dialog oder Tafel-Modus schließen', scope: 'ueberall' },
  { keys: 'Enter', desc: 'Aktion im Eingabefeld bestätigen', scope: 'ueberall' },
  { keys: 'Mod + +', desc: 'Gesamte App größer', scope: 'ueberall' },
  { keys: 'Mod + −', desc: 'Gesamte App kleiner', scope: 'ueberall' },
  { keys: 'Mod + 0', desc: 'Größe zurücksetzen', scope: 'ueberall' },
  { keys: 'Mod + Mausrad', desc: 'Größe mit dem Mausrad ändern', scope: 'ueberall' },
  // --- Palette ---
  { keys: '↑ / ↓', desc: 'Trefferzeile wählen', scope: 'palette' },
  { keys: 'Enter', desc: 'Gewählten Treffer öffnen oder Befehl ausführen', scope: 'palette' },
  { keys: 'Esc', desc: 'Suche schließen', scope: 'palette' },
  // --- Assistent ---
  { keys: 'Mod + Z', desc: 'Letzte Änderung zurücknehmen (nicht im Textfeld)', scope: 'assistent' },
  { keys: 'Mod + Y', desc: 'Zurückgenommenes wiederherstellen', scope: 'assistent' },
  { keys: 'Mod + Shift + Z', desc: 'Zurückgenommenes wiederherstellen', scope: 'assistent' },
  // --- Tafel ---
  { keys: '→ / Leertaste', desc: 'Nächste Folie', scope: 'tafel' },
  { keys: '←', desc: 'Vorherige Folie', scope: 'tafel' },
  { keys: 'L', desc: 'Lösung aufdecken bzw. wieder ausblenden', scope: 'tafel' },
  { keys: '+ / −', desc: 'Schriftgröße im Tafel-Modus', scope: 'tafel' },
  { keys: 'Esc', desc: 'Tafel-Modus beenden', scope: 'tafel' },
];

/** Apple-Geräte (macOS/iOS) benutzen ⌘ statt Strg. */
export function isApplePlattform(navigatorLike?: { platform?: string; userAgent?: string }): boolean {
  const nav = navigatorLike ?? (typeof navigator === 'undefined' ? undefined : navigator);
  const quelle = `${nav?.platform ?? ''} ${nav?.userAgent ?? ''}`.toLowerCase();
  return quelle.includes('mac') || quelle.includes('iphone') || quelle.includes('ipad') || quelle.includes('ipod');
}

/** `Mod` durch die tatsächlich gedrückte Taste ersetzen. */
export function formatShortcut(keys: string, apple: boolean = isApplePlattform()): string {
  return keys.replace(/\bMod\b/g, apple ? '⌘' : 'Strg');
}

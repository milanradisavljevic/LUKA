# Spec — Kimi: Rollenkarten-Set UI-Editor

> Branch `main`, vorher `git pull` (Chief-Fundament `3f0ca20`). Nach Fertig:
> `cd apps/lua && pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test` grün.

## Kontext
Chief hat den Blocktyp `rollenkartenSet` komplett gebaut: schema, prompt (+Few-Shot), renderer,
qa, normalize, `createDefaultBlock`-Default, `blockToRequest`. **Generierung läuft schon** (Live-Smoke
grün). Es fehlt nur die **Baukasten-Sichtbarkeit + der Konfig-Editor**, damit die Lehrkraft Rahmen,
Rollen und Szenario-Anzahl selbst setzen kann. Datenmodell (aus `@lehrunterlagen/schema`):

```ts
config: {
  eingabemodus?: 'ki' | 'manuell';
  rahmen: string;            // "Disaster Reports — live TV news"
  zeitMinuten: number;       // default 8
  rollen: { name; rollenhinweis; inhaltsLabel; sprachhinweis }[];   // 2–3
  szenarien: { nummer; titel; fakten; rollenInhalte: { untertitel; punkte: string[] }[] }[]; // 1–15
  schnittlinie: boolean; teamFeld: boolean;
}
loesung: { hinweise: string }
```

## Schritt 1 — Baukasten-Sichtbarkeit (`apps/lua/apps/web/src/lib/constants.ts`)
- `BLOCK_TYPE_DEFS` (nach dem `roleplay`-Eintrag, ~Z.29) ergänzen:
  ```ts
  { id: 'rollenkartenSet', label: 'Rollenkarten-Set', description: 'Differenzierte Sprech-Szenarien als Karten-Set (jedes Paar ein Szenario)', Icon: Users, color: '#ff7043', minuten: [8, 15] },
  ```
  (Icon `Users` oder `Layers` — beides schon importiert? sonst Import ergänzen.)
- `STUFE_RULES.oberstufe.allowedBlockTypes` **und** `.unterstufe.allowedBlockTypes`: `'rollenkartenSet'`
  hinzufügen (wie `roleplay` — Sprechen ist beide Stufen sinnvoll).

## Schritt 2 — Konfig-Editor (`apps/lua/apps/web/src/components/BlockConfigPanel.tsx`)
Neuer Zweig `if (block.typ === 'rollenkartenSet') { … }` — **Muster: der bestehende `roleplay`-Zweig
(~Z.955)**, gleiche `set('feld', wert)`-Mechanik, gleiche Tile/Input-Stile. Felder:
- **Rahmen** (`rahmen`) — Textinput („z. B. Disaster Reports — live TV news").
- **Zeit pro Paar** (`zeitMinuten`) — Number.
- **Eingabemodus** (`eingabemodus` ki|manuell) — Toggle wie bei roleplay/wordScramble. Bei `ki`:
  nur Rollen-Struktur + Szenario-Anzahl; das LLM erfindet die Szenarien. Bei `manuell`: zusätzlich
  Szenario-Titel-Liste editierbar (Inhalte füllt weiter das LLM bzw. bleiben Gerüst).
- **Rollen** (2–3) — Liste editierbarer Rollen, je: `name`, `rollenhinweis` (Funktion + Sprech-Reihenfolge),
  `inhaltsLabel` („Report on:"/„Advise on:"), `sprachhinweis`. „Rolle hinzufügen/entfernen" (min 2, max 3).
- **Szenario-Anzahl** — Number (steuert, wie viele Karten-Paare erzeugt werden). Umsetzung: das Array
  `szenarien` auf die gewünschte Länge bringen (Platzhalter-Szenarien `{ nummer, titel: '[Szenario n]',
  fakten:'', rollenInhalte: rollen.map(() => ({ untertitel:'', punkte:['…'] })) }`). `blockToRequest`
  liest `szenarien.length` als `anzahlSzenarien` — also reicht es, die Array-Länge zu setzen.
- **Toggles** `schnittlinie`, `teamFeld` (Checkbox/Switch).
- (Optional) **Hinweise** (`loesung.hinweise`) als Textarea.

Wichtig: bei `manuell` müssen vorgegebene Szenario-Titel die Platzhalter-Erkennung in `blockToRequest`
überstehen — dort gilt ein Titel als „echt", wenn er nicht leer ist und **nicht** mit `[` beginnt.
Also echte Titel ohne führende `[`.

## Schritt 3 — (optional) Schnell-Einfügen (`apps/lua/apps/web/src/lib/commands.ts`)
Analog anderer Typen einen Eintrag, der `createDefaultBlock('rollenkartenSet', meta)` einfügt.

## Akzeptanz
- Baukasten zeigt „Rollenkarten-Set"; einfügen → Konfig-Panel mit Rahmen/Rollen/Anzahl/Toggles.
- Rahmen + 2 Rollen + Anzahl 4 setzen → generieren → 4 Karten-Paare im DOCX (Schülerfassung), je mit
  Fakten + Bullet-Punkten + Sprach-Hinweis + Schnittlinie; Lösung = nur Lehrer-Hinweise.
- `manuell` + 3 Szenario-Titel vorgegeben → diese Titel bleiben wortgleich, LLM füllt Inhalte.
- build/typecheck/test grün.

## Chief-Review danach
Chief prüft: Panel-Zweig folgt roleplay-Muster, Szenario-Anzahl ↔ `szenarien`-Array korrekt,
manuelle Titel überstehen `blockToRequest` (kein `[`-Präfix), Live-Sichtprüfung in Tauri.

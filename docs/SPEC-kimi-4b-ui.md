# Spec — Kimi 4b UI: In-App-Übung mit vorbefülltem Quelltext

> Branch `main`, vorher `git pull` (Chief-Commit `d790f0e` liefert die Rust-/Python-Seite).
> Nach Fertig: `cd apps/lua && pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test` grün.

## Kontext
Der **Rust-Command + Python-CLI ist fertig** (Chief, `d790f0e`):
`natascha_quelltext_get(dir, python, klasse, aufgabe)` → JSON-String
`{ "klasse": "...", "aufgabe": "...", "ausgangstext": "..." }` (leer wenn keiner gespeichert).
`NataschaPrefill.ausgangstext?: string` existiert bereits (`lib/nataschaBridge.ts:80`) und der
Step0-Konsum dispatcht `ausgangstext` schon als Quelltext (Welle-3-Brücke). Es fehlt nur:
**die In-App-"Übung erzeugen"-Buttons holen den gespeicherten Ausgangstext und legen ihn in
`prefill.ausgangstext`.** Heute bleibt das Feld undefined → Übung startet ohne Quelltext.

## Schritt 1 — Hook-Getter (`apps/lua/apps/web/src/hooks/useNatascha.ts`)
Analog zu `retroImport` (Z. 258) eine `quelltextGet`-Funktion ergänzen:

```ts
const quelltextGet = useCallback(async (klasse: string, aufgabe: string): Promise<string> => {
  const s = loadSettings();
  try {
    const result = await invoke<string>('natascha_quelltext_get', {
      dir: s.nataschaDir ?? '', python: s.pythonCommand ?? '', klasse, aufgabe,
    });
    const parsed = JSON.parse(result) as { ausgangstext?: string };
    return (parsed.ausgangstext ?? '').trim();
  } catch { return ''; }
}, []);
```

In den Return-Block (Z. ~402, neben `retroImport`) `quelltextGet` aufnehmen.

## Schritt 2 — KlassenView (`apps/lua/apps/web/src/views/KlassenView.tsx`) — Hauptfall
`handleGenerateUebung` (~Z. 174) hat sauberen Kontext: `selectedKlasse` + `selectedAufgabe`.
- `quelltextGet` aus `useNatascha()` ziehen.
- `handleGenerateUebung` **async** machen; vor dem `prefill`-Aufbau:
  ```ts
  let ausgangstext = '';
  if (selectedKlasse && selectedAufgabe) {
    ausgangstext = await quelltextGet(selectedKlasse, selectedAufgabe);
  }
  ```
- Im `prefill`-Objekt `ausgangstext: ausgangstext || undefined` ergänzen.
- `quelltextGet` in die `useCallback`-Deps.

## Schritt 3 — SchuelerView (`apps/lua/apps/web/src/views/SchuelerView.tsx`) — Nuance
**Achtung:** Der Schüler-Längsschnitt spannt **mehrere Aufgaben** (XAxis `dataKey="aufgabe"`),
es gibt keine eindeutige einzelne Aufgabe. Quelltext ist aber pro `klasse+aufgabe` gespeichert.
→ **Nimm die jüngste Aufgabe des Längsschnitts**, sonst lass `ausgangstext` weg (Feld ist optional,
Step0 funktioniert auch ohne — kein harter Fehler).
- Klasse: `laengsschnitt.schueler.klasse`. Jüngste Aufgabe: aus der Trend-/Abgaben-Liste des
  `laengsschnitt` die letzte (höchstes Datum / letztes Element). **Erst prüfen, welches Feld die
  Aufgabenliste trägt** (`laengsschnitt.trend`/`.verlauf`/`.abgaben` o. Ä.) — nicht raten.
- `handleGenerateUebung` (~Z. 112) async machen, analog Schritt 2 fetchen, `prefill.ausgangstext`
  setzen. Wenn keine Aufgabe ableitbar → Feld weglassen (kein Fehler).

## Akzeptanz
- KlassenView: Klasse+Aufgabe mit gespeichertem Ausgangstext gewählt → "Übung erzeugen" → Step0
  startet mit **vorbefülltem Quelltext** (Herkunft natascha). Ohne gespeicherten Text: Übung
  startet wie bisher (leer, kein Fehler).
- SchuelerView: lädt Quelltext der jüngsten Aufgabe, falls vorhanden; sonst still ohne.
- build/typecheck/test grün. Kein Crash bei fehlendem Python/leerer DB (Getter fängt → "").

## Chief-Review danach
Chief prüft: async-Umbau bricht keine bestehenden Aufrufer; SchuelerView-Aufgaben-Ableitung
korrekt (richtiges Feld, jüngste); Live-Smoke des Closed Loops (Korrektur mit Ausgangstext →
In-App-Button → Quelltext vorbefüllt).

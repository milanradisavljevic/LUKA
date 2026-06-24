# PLAN — Rollenkarten-Set-Modus (Sprech-Differenzierung) — 2026-06-25

## Auslöser
Natascha lieferte eine claude.ai-DOCX (`apps/lua/VORLAGE FÜR ROLEPLAY_Disaster_Reports_Rolecards_ALL.docx`),
die sie als „ABSOLUT perfekt" einstuft. Aufbau: **10 Szenarien**, je ein Paar **Card A (Live Reporter)**
+ **Card B (Safety Expert)**, dazwischen Schnittlinie (zum Ausschneiden). Jede Karte:
- Rolle + „Team: ___"-Feld
- Szenario-Nr. + Name (z. B. „#1 Shaanxi Earthquake")
- **Fakten-Briefing** (Ort · Jahr · Tote · Detail)
- **Rollenhinweis / Sprech-Reihenfolge** („Reporter at the scene. You speak first.")
- **Inhalts-Label + Stichpunktliste** („Report on:" / „Advise on:" + 4 Bullets)
- **Sprach-/Zeiten-Hinweis** („present continuous · present perfect · past simple")

Der bestehende `roleplay`-Block modelliert **ein** Rollenspiel (2–4 Rollen, eine Situation). Das hier ist
ein **differenziertes Klassen-Set**: 1 Rollen-Struktur × N Szenarien → jedes Schüler-Paar bekommt ein
anderes Szenario mit gleicher Rollenmechanik. User-Entscheidung: **Weg B** (eigenes Set-Konzept), nicht nur
Einzel-Rollenspiel aufbohren.

## Datenmodell (neuer Blocktyp `rollenkartenSet`)
`packages/schema/src/index.ts`:
```ts
RollenkartenRolleSchema = {
  name: string(min1),            // "Live Reporter"
  rollenhinweis: string(min1),   // "Reporter at the scene. You speak first." (Sprech-Reihenfolge + Funktion)
  inhaltsLabel: string(min1),    // "Report on:" / "Advise on:"
  sprachhinweis: string().default(''), // "present continuous · present perfect · past simple"
}
RollenkartenSzenarioSchema = {
  nummer: int.positive(),
  titel: string(min1),           // "Shaanxi Earthquake"
  fakten: string().default(''),  // "China · 1556 · ~830,000 deaths · cave homes collapsed"
  rollenInhalte: array({         // GENAU rollen.length Einträge, in Rollen-Reihenfolge
    untertitel: string().default(''), // z. B. Expert: "What to do in an earthquake"
    punkte: array(string(min1)).min(1), // Stichpunkte (Bullets)
  }),
}
RollenkartenSetBlockSchema = BlockBase.extend({
  typ: literal('rollenkartenSet'),
  config: {
    eingabemodus: enum(['ki','manuell']).optional(),
    rahmen: string(min1),        // gemeinsamer Rahmen, z. B. "Disaster Reports — live TV news"
    zeitMinuten: int.positive().default(8),
    rollen: array(RollenkartenRolle).min(2).max(3),
    szenarien: array(RollenkartenSzenario).min(1).max(15),
    schnittlinie: boolean().default(true),
    teamFeld: boolean().default(true),
  },
  loesung: { hinweise: string(min1) }, // Lehrer-Hinweise (keine Musterlösung — Sprechprodukt)
}
```
- `punkte: 0` (Sprechaktivität, ungraded — wie `roleplay`).
- **superRefine:** jedes Szenario muss `rollenInhalte.length === config.rollen.length` erfüllen
  (sonst hätte eine Rolle für ein Szenario keinen Inhalt). Klarer Zod-Fehlerpfad.
- In `BlockSchema`-Union + `buildSkelett`-`switch` (Skelett mit 1 Default-Szenario + 2 Rollen) ergänzen.

## Generierung (`packages/llm/src/prompt.ts`)
- Neue Beschreibungs-Sektion (analog `roleplay`, ~Z. 214) + **Few-Shot aus Nataschas DOCX** (1–2 Szenarien
  als Beispiel — exakt diese Karten-Struktur, damit das Modell das Niveau trifft).
- Lehrkraft gibt vor: `rahmen`, Rollen (Name + Funktion/Reihenfolge + Inhalts-Label + Sprachhinweis),
  Szenario-Anzahl N. Das LLM **erfindet die Szenarien** (titel/fakten/per-Rolle-Punkte) passend zum Rahmen
  (oder zum Quelltext, falls vorhanden).
- **Manuell/Hybrid:** vorgegebene `szenarien` (titel) WORTGLEICH übernehmen, fehlende bis N ergänzen —
  in die bestehende Preserve-Regel (`prompt.ts:538`) aufnehmen (`rollenkartenSet.szenarien`,
  `rollenkartenSet.rollen`).
- `normalize.ts`: leere `punkte`-Strings filtern (wie bei `aspekte`); wenn ein Szenario danach für eine
  Rolle leer ist → sinnvoller Fallback statt Crash.

## Rendering (`packages/renderer/src/index.ts`)
- `buildRollenkartenSet(block, mode, template, fach)` + Dispatch (`~Z.1376`) + Label-Maps (`~1226/1246`).
- **Schülerfassung:** je Szenario eine Karte pro Rolle als gerahmte Tabelle:
  Kopf `{rolle.name} · Team: ____` (Team-Feld nur wenn `teamFeld`) → `#{nummer} {titel}` →
  `fakten` (grau) → `rollenhinweis` → `{inhaltsLabel}` + **Bullet-Liste** `punkte` →
  `sprachhinweis` (kursiv, grau). Zwischen den gepaarten Karten `✂ — — —` (nur wenn `schnittlinie`).
  Zwischen Szenarien: Abstand / optional Seitenumbruch.
- **Lösung:** nur `loesung.hinweise` (Lehrer-Hinweise) — kein Musterdialog.
- Druck-tauglich (schwarz-weiß, ausschneidbar).

## QA (`packages/qa/src/korrekturraster/builder.ts`)
- `rollenkartenSet` erzeugt **kein** Korrekturraster (Sprechprodukt, `punkte:0`) → in der Block-Schleife
  überspringen (wie `roleplay`). Prüfen, dass `buildRaster` nicht darüber stolpert.

## UI (Kimi, nach Schema)
- `lib/constants.ts` `BLOCK_TYPE_DEFS`: Eintrag `rollenkartenSet`
  („Rollenkarten-Set", „Differenzierte Sprech-Szenarien als Karten-Set", Icon `Users`/`Layers`,
  minuten `[8,15]`); in die Aufgabenart-Listen (Z. 39/49) aufnehmen, wo sinnvoll (Sprachfächer).
- `lib/blockDefaults.ts`: `case 'rollenkartenSet'` (Default: 2 Rollen, 1 Szenario-Gerüst,
  `schnittlinie:true`, `teamFeld:true`, `punkte:0`) + `BLOCK_ARBEITSANWEISUNG_PLACEHOLDER` +
  `getBlockLabel`-Eintrag.
- `components/BlockConfigPanel.tsx`: neuer `block.typ === 'rollenkartenSet'`-Zweig —
  `rahmen`-Feld, Szenario-Anzahl, Rollen-Editor (Name + Funktion/Reihenfolge + Inhalts-Label +
  Sprachhinweis, 2–3 Rollen), optional manuelle Szenario-Titel (Liste), Toggles Schnittlinie/Team-Feld,
  `zeitMinuten`. Muster: bestehender `roleplay`-Zweig (`~Z.955`).
- `lib/commands.ts`: Schnell-Einfügen analog anderer Typen.

## Aufgabenteilung
| Schicht | Wer |
|---|---|
| schema (Blocktyp + Union + buildSkelett + superRefine) | **Chief** |
| prompt (Sektion + Few-Shot aus DOCX + Preserve-Regel) | **Chief** |
| renderer (`buildRollenkartenSet` + Dispatch + Labels) | **Chief** |
| qa (Skip im Raster) + normalize (leere punkte) | **Chief** |
| UI (constants/blockDefaults/BlockConfigPanel/commands) | **Kimi** (Spec nach Schema) |
| Live-Smoke (DeepSeek) | **Chief** |

## Verifikation (Definition of Done)
- `pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test` grün; neue Tests:
  schema (Block akzeptiert/abgelehnt bei rollenInhalte-Längen-Mismatch; buildSkelett deckt Typ ab),
  renderer (Smoke: N Szenarien → 2N Karten + Schnittlinien), qa (kein Raster für rollenkartenSet).
- Live-Smoke: Rahmen „Disaster Reports", 2 Rollen (Reporter/Expert), N=4 → 4 Szenarien,
  je Karte A+B mit Fakten + Bullet-Punkten + Sprachhinweis; Schülerfassung gerendert, ausschneidbar.
- Sicht-Vergleich gegen Nataschas DOCX: gleiche Karten-Anatomie erreicht.

## Offene Mini-Entscheidung (kein Blocker)
Default-Generierung = **voll KI** (Lehrkraft gibt Rahmen + Anzahl, LLM erfindet Szenarien).
Manuelle Szenario-Titel werden via Preserve-Regel unterstützt. Seitenumbruch je Szenario:
Default **an** (eine Karte/Seitenpaar sauber ausschneidbar) — beim Renderer-Bau final entscheiden.

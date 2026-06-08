# TASKS.md — Aufgabenbrett

Bevor du eine Aufgabe startest: trage deinen Namen und Status `in Arbeit` ein und
committe das zuerst. Status-Werte: `offen`, `in Arbeit`, `fertig`, `blockiert`.

Schema-Aenderungswuensche an Claude Code bitte unten unter "Schema-Anfragen" eintragen.

---

## Phase 0 — Fundament (Gate: Natascha)

| ID  | Aufgabe                                            | Owner       | Status |
|-----|----------------------------------------------------|-------------|--------|
| 0.1 | Monorepo scaffolden (pnpm, TS, Vitest)             | Claude Code | fertig    |
| 0.2 | Zod-Schema: meta, quelltexte, 6 Blocktypen         | Claude Code | fertig    |
| 0.3 | TS-Typen exportieren, in allen Modulen importierbar| Claude Code | fertig    |
| 0.4 | Beispiel-JSON pro Blocktyp als Fixture             | OpenCode #3 | fertig |

## Phase 1 — Renderer (Gate: Natascha, kritisch)

| ID  | Aufgabe                                            | Owner       | Status |
|-----|----------------------------------------------------|-------------|--------|
| 1.1 | Renderer-Grundgeruest, Hausstil verdrahten         | Claude Code | fertig    |
| 1.2 | Schuelerfassung: Loesungsfelder leer                | Claude Code | fertig    |
| 1.3 | Loesungsfassung: Loesungen kursiv, eingerueckt       | Claude Code | fertig    |
| 1.4 | Linien fuer Luecken und Schreibflaechen (>=9mm)     | Claude Code | fertig    |
| 1.5 | Kopf-/Fusszeile, kein Aufgaben-Umbruch              | Claude Code | fertig    |
| 1.6 | Integrationstest: Fixture -> 2 gueltige .docx        | OpenCode #3 | fertig |

## Phase 2 — Ein LLM end-to-end (Gate: Natascha)

| ID  | Aufgabe                                            | Owner       | Status |
|-----|----------------------------------------------------|-------------|--------|
| 2.1 | Anbieter-Schnittstelle + Claude-Adapter            | OpenCode #1 | fertig (Architekt) |
| 2.2 | JSON erzwingen + Zod-Validierung der Antwort       | OpenCode #1 | fertig (Architekt) |
| 2.3 | Prompt-Bau aus Bloecken + Quelltext                | OpenCode #1 | fertig (Architekt) |
| 2.4 | txt-Parser fuer ersten echten Quelltext             | Kimi Code   | fertig  |
| 2.5 | End-to-end-Test: Quelltext -> 2 .docx                | OpenCode #3 | fertig |

> Hinweis: 2.1 bis 2.3 wurden vom Architekten als Fundament in `packages/llm`
> angelegt (Anbieter-Registry, Anthropic-Adapter, Prompt-Bau, Zod-Validierung mit
> einer Korrekturrunde, netzunabhaengiger Test fuer die Validierung). OpenCode #1
> uebernimmt das Modul und ergaenzt in Phase 5 die Adapter fuer ChatGPT (5.1) und
> Kimi (5.2). Vor 2.5 fehlt nur noch die Verdrahtung llm -> renderer.

## Phase 3 — Input-Flexibilitaet (Gate: optional)

| ID  | Aufgabe                                            | Owner       | Status |
|-----|----------------------------------------------------|-------------|--------|
| 3.1 | docx- und pdf-Parser                                | Kimi Code   | fertig  |
| 3.2 | html-Upload zu sauberem Text                       | Kimi Code   | fertig  |
| 3.3 | url-Abruf mit Block-/Login-Fehlerbehandlung        | Kimi Code   | fertig  |
| 3.4 | Quelltext-Aufbereitung (kuerzen auf Lesetempo)     | Kimi Code   | fertig  |

## Phase 4 — Baukasten-UI + Vorschau (Gate: Natascha, kritisch)

| ID  | Aufgabe                                            | Owner       | Status |
|-----|----------------------------------------------------|-------------|--------|
| 4.1 | Vier-Schritte-Flow nach Mockup                     | OpenCode #2 | fertig |
| 4.2 | Baukasten: Drag and Drop, Punkte, Gesamtpunkte     | OpenCode #2 | fertig |
| 4.3 | Block-Konfigurationspanel pro Blocktyp             | OpenCode #2 | fertig |
| 4.4 | Stufenabhaengige Optionen deaktivieren             | OpenCode #2 | fertig |
| 4.5 | Zweispaltige editierbare Vorschau vor Export       | OpenCode #2 | fertig |
| 4.6 | Vorlagen speichern und laden                       | OpenCode #2 | fertig |

## Phase 5 — Ausbau (Gate: Natascha, final)

| ID  | Aufgabe                                            | Owner       | Status |
|-----|----------------------------------------------------|-------------|--------|
| 5.1 | ChatGPT-Adapter                                    | OpenCode #1 | fertig |
| 5.2 | Kimi-Adapter (mit Datenschutz-Schranke)            | OpenCode #1 | fertig |
| 5.3 | Drive-Anbindung, private Bibliothek                | Kimi Code   | offen  |
| 5.4 | Sprach-/Tippbefehl zu Dokument (ueber Renderer)    | OpenCode #2 | fertig |
| 5.5 | Korrekturraster-Anbindung                          | OpenCode #3 | fertig |
| 5.6 | Modell-Info-Panel (Stärken, Region, Datenschutz)   | Kimi Code   | fertig |
| 5.7 | Provider-Logos in KI-Auswahl                       | Kimi Code   | fertig |
| 5.8 | PDF-Hinweis-Dialog im Export-Schritt               | Kimi Code   | fertig |

---

## Phase 6 — Aufgabentypen-Erweiterung (Vertrag: `docs/aufgabentypen-erweiterung.md`)

Reihenfolge & Timing dort. Feldnamen sind fix. Kimi liefert pro Typ ZUERST Schema+Util.

| ID  | Aufgabe                                                      | Owner    | Status |
|-----|-------------------------------------------------------------|----------|--------|
| 6.0 | Vertrag + Verteilung festlegen                              | Claude   | fertig |
| 6.1a| Schema+Util: Lückentext echte Wortbank (`distraktorWoerter`, `baueWortbank`) | Kimi    | fertig (Konsolidierung Minimax 2026-06-04) |
| 6.1b| Schema+Util: wordScramble (`verwuerfle`)                    | Kimi     | fertig (Konsolidierung Minimax 2026-06-04) |
| 6.1c| Schema: kategorisierung                                     | Kimi     | fertig (Konsolidierung Minimax 2026-06-04) |
| 6.1d| Schema: tabelle (Tabellen-Lückentext)                       | Kimi     | fertig (Konsolidierung Minimax 2026-06-04) |
| 6.1e| Schema: stiluebung                                          | Kimi     | fertig (Konsolidierung Minimax 2026-06-04) |
| 6.1f| Schema: songanalyse                                         | Kimi     | fertig (Konsolidierung Minimax 2026-06-04) |
| 6.2 | Web (Preview+ConfigPanel+constants+defaults) je Typ        | Kimi     | fertig (2026-06-05, ConfigPanel = R5) |
| 6.3 | LLM-Vertrag (prompt/normalize/transform/quality) je Typ    | Claude   | fertig (2026-06-05) |
| 6.4 | Renderer (`build<Typ>`+Dispatch+Labels) je Typ             | Claude   | fertig (Determinismus-Fix Claude 2026-06-05) |
| 6.5 | Korrekturraster + Fixtures + Tests je Typ                   | Minimax  | fertig (2026-06-04) |
| 6.6 | E2E reaktivieren (Mock-Provider, ≥1 Lauf/Typ)              | Minimax  | fertig (2026-06-04) |
| 6.7 | Streaming + Provider-Fallback (`src-tauri`)                | Qwen     | offen (Frontend-Fallback via R-CB erledigt; echtes Rust-Streaming offen) |
| 6.8 | Prompt-Injection-Sanitisierung                             | Claude   | fertig (2026-06-05, = R4) |
| 6.9 | `convert_pdf` für tabellen-/gitterlastige DOCX härten      | Qwen     | offen  |
| 6.10| Lernziel-Coverage-Ansicht (Audit K3)                       | Claude+Kimi | fertig (2026-06-05, = R-CA/R3/R6) |
| 6.11| Schema-Versionierung + Migration (Audit T-3)              | Claude   | fertig (2026-06-05, = R8) |
| 6.12| Markieraufgabe-Semantik dokumentieren (Audit D-7)         | Claude   | fertig (2026-06-05, = R9c) |
| 6.P2| Phase 2: Kreuzworträtsel + Wortgitter (`grids.ts` + Render)| Claude   | fertig (2026-06-06, beide Typen end-to-end + im UI-Picker) |

---

## Phase R — Release-Kandidat Lehrer-Test (Plan: `docs/plan-lehrer-test-2026-06.md`)

Seam: Claude besitzt `useGenerate.ts` + `packages/*`; Kimi nur `apps/web/src/components/**`.
Konvergenz: R3a + R-Hook (C-A/C-B) müssen gemergt sein, bevor Kimi R1/R3/R6/R2-UI startet.

| ID  | Aufgabe                                                      | Owner    | Status |
|-----|-------------------------------------------------------------|----------|--------|
| R-CA| Vertrag: `Block.lernziele?` (Schema+Prompt+Normalize)       | Claude   | fertig (2026-06-05) |
| R-CB| `useGenerate`-API: stage/elapsedMs/cancel/regenerateBlock + Provider-Fallback | Claude | fertig (2026-06-05) |
| R2  | Robuste Fehler-/Retry-UX (Logik)                            | Claude   | fertig (Teil von R-CB) |
| R4  | Prompt-Injection-Sanitisierung (am Prompt-Bau)             | Claude   | fertig (2026-06-05) |
| R8  | Schema-Versionierung + `migrateDocument`                    | Claude   | fertig (2026-06-05) |
| R9c | anzahlWoerter härten + markieraufgabe-Doku (6.12)          | Claude   | fertig (2026-06-05) |
| R1  | Generierungs-Feedback-UI (nutzt stage/elapsedMs/cancel)     | Kimi     | fertig (2026-06-05) |
| R3  | Lernziel-Abdeckungs-Ansicht (nutzt Block.lernziele)        | Kimi     | fertig (2026-06-05) |
| R6  | „Block neu generieren"-Button (nutzt regenerateBlock)       | Kimi     | fertig (2026-06-05) |
| R5  | ConfigPanel editierbar (kategorisierung/tabelle/songanalyse)| Kimi    | fertig (2026-06-05) |
| R7  | Vorlagen Export/Import als Datei                            | Kimi     | fertig (2026-06-05) |
| R9a | Beispiel-Absichten (Step0 Quick-Start)                     | Kimi     | fertig (2026-06-05) |

---

## Schema-Anfragen (an Claude Code)

Format: `- [Datum] Antragsteller: gewuenschte Aenderung, Begruendung`

(noch keine)

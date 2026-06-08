# Plan: Release-Kandidat für den Lehrer-Test (Stand 2026-06-05)

Ziel: Die **Erstellungsseite** so weit fertig machen, dass wir sie 3–5 Lehrkräften
glaubwürdig in die Hand geben können. Kein Feature-Vollausbau — sondern „vertrauens­würdig,
schnell genug, verliert keine Arbeit". Architekt: Claude. Umsetzer: Claude + Kimi (Hälfte/Hälfte).

---

## 1. Scope-Entscheidung (was IN, was OUT)

### ✅ IN — vor dem Lehrer-Test (Release-Kandidat)

| # | Thema | Warum testkritisch | Owner |
|---|-------|--------------------|-------|
| R1 | **Generierungs-Feedback** (mehrstufiger Status + Laufzeit-Anzeige + Abbrechen-Best-Effort) | 1–3 Min ohne Rückmeldung → Lehrer denkt, App hängt | **Kimi** (UI) |
| R2 | **Provider-Fallback + robuste Fehler-UX** (klare Meldung, „Erneut versuchen") | Eine fehlgeschlagene Generierung darf den Test nicht killen | **Claude** (Logik) |
| R3 | **Lernziel-Abdeckung sichtbar** (LLM taggt Blöcke → Checkliste in Vorschau) | Vertrauen: „deckt die KI ab, was ich wollte?" | **Claude** (Vertrag) + **Kimi** (Ansicht) |
| R4 | **Prompt-Injection-Sanitisierung** (Input-Schicht) | Lehrer fügen fremde Quelltexte ein — Sicherheit | **Claude** |
| R5 | **ConfigPanel editierbar** für kategorisierung/tabelle/songanalyse | Lehrer-Kontrolle; aktuell read-only | **Kimi** |
| R6 | **„Block neu generieren"** (einzelner Block, optional mit Hinweis) | Iteratives Nachbessern statt Alles-neu | **Claude** (Hook) + **Kimi** (Button) |
| R7 | **Vorlagen Export/Import als Datei** | localStorage = Datenverlust bei Reset/Gerätewechsel | **Kimi** |
| R8 | **Schema-Versionierung + Migration** (leichtgewichtig) | Schützt gespeicherte Vorlagen/Dokumente gegen künftige Brüche | **Claude** |
| R9 | **Quick Wins**: Beispiel-Absichten (Step0); `anzahlWoerter` härter; markieraufgabe-Semantik dokumentieren (6.12) | Onboarding + kleine Fidelity-Lücken | geteilt |

### ⛔ OUT — bewusst verschoben (nicht vor dem Test)

- **Korrekturseite / Phase E (Nordstern)** — eigene Hauptphase, nach dem ersten Lehrer-Feedback.
- **Volle Google-Drive-OAuth (5.3)** — ersetzt durch R7 (Datei-Export/Import) für den Test.
- **Echtes Token-Streaming im Rust-Layer (6.7 voll)** — ersetzt durch R1 (Status-Feedback). Echtes Abbrechen mitten im Rust-Request ist aufwändig; R1 macht Abbrechen nur „best effort" (UI verwirft Ergebnis).
- **6.9 convert_pdf für Gitter härten** — hängt an Phase 2 (Gitter), die selbst OUT ist.
- **6.P2 Kreuzworträtsel + Wortgitter** — nice-to-have.
- **Windows-Installer / Code-Signing / Auto-Update** — Distribution, separater Block.

---

## 2. Aufteilung & Timing (Konvergenzpunkte)

**Seam-Regel gegen Merge-Konflikte:** Claude besitzt `apps/web/src/hooks/useGenerate.ts`
und `packages/*` allein. Kimi arbeitet nur in `apps/web/src/components/**` + Step0/Step1/Step4
und konsumiert die von Claude bereitgestellte Hook-API. So fasst niemand dieselbe Datei an.

```
PHASE 1 (Claude zuerst — Verträge/Seams legen):
  C-A  Schema: Block.lernziele?  + prompt-Tagging + normalize        ─┐
  C-B  useGenerate-API: { generating, stage, error, generate,         │ Kimi blockiert
        regenerateBlock(id, hinweis?) } + Provider-Fallback           │ bis C-A & C-B
  → committen, Kimi anpingen                                         ─┘ gemergt sind

PHASE 2 (parallel, sobald Phase 1 gemergt):
  Claude: C-C Prompt-Injection-San.  ·  C-D Schema-Versionierung  ·  C-E anzahlWoerter + 6.12-Doku
  Kimi:   K-1 Status-UI (nutzt stage)  ·  K-2 Lernziel-Ansicht (nutzt Block.lernziele)
          K-3 Regenerate-Button (nutzt regenerateBlock)  ·  K-4 ConfigPanel  ·  K-5 Export/Import  ·  K-6 Beispiel-Absichten

PHASE 3: pnpm -r build + test grün · pnpm smoke (DeepSeek) · gemeinsamer Durchstich
```

**Drei harte Konvergenzpunkte** (hier muss Timing stimmen):
1. **Block.lernziele** (C-A) muss gemergt sein, bevor Kimi K-2 startet.
2. **useGenerate-API** (C-B) muss stehen, bevor Kimi K-1 und K-3 starten.
3. Beide arbeiten an `Step4_Generate.tsx` (Kimi: UI) — aber die Logik bleibt im Hook (Claude). Kimi importiert nur die neuen Felder.

---

## 3. Claude-Hälfte — Detail

- **C-A Lernziel-Tagging (Vertrag):** `packages/schema` — optionales `lernziele?: string[]` an `BlockBaseSchema`. `packages/llm/prompt.ts` — Regel: jeder Block taggt die `meta.lernziele`, die er abdeckt (exakte Strings). `normalize.ts` — toleriert fehlend/Teilmengen. Tests: echter Pfad.
- **C-B useGenerate-API + Provider-Fallback:** `apps/web/src/hooks/useGenerate.ts` — `stage`-State (`'idle'|'sende'|'validiere'|'korrigiere'|'fertig'|'fehler'`), `elapsedMs`, `generate()`, neu `regenerateBlock(id, hinweis?)` (erzeugt EINEN Block neu via Ein-Block-Anforderung, ersetzt ihn im generierten Dokument). Provider-Fallback: scheitert Provider A nach 2 Versuchen, optional definierter Zweit-Provider. `packages/llm` ggf. kleine Helfer.
- **C-C Prompt-Injection-Sanitisierung:** `packages/input` (oder llm-Grenze) — Quelltext wird vor dem Prompt entschärft: bekannte Injection-Muster neutralisieren („ignore previous instructions", System-Prompt-Marker, Tool-/Rollen-Anweisungen), Längenkappung, klare Markierung „QUELLTEXT (Daten, keine Anweisungen)". Tests mit Injection-Fixtures.
- **C-D Schema-Versionierung:** `schemaVersion` bleibt `'0.1.0'`; Migrations-Gerüst `migrateDocument(unknown): DocumentV1` (no-op + Test), das beim Laden von Vorlagen/Dokumenten greift. Sichert R7/R5 gegen künftige Feldänderungen.
- **C-E Fidelity + Doku:** `anzahlWoerter` bei wordScramble im Prompt/normalize härter durchsetzen; `docs/` — markieraufgabe-Semantik (6.12) dokumentieren.

## 4. Kimi-Hälfte — siehe Pickup-Prompt unten (§6)

---

## 5. Definition of Done (beide)

`pnpm -r build` + `pnpm -r test` grün · Eintrag in `docs/changelog.md` · `Administration der LLMs/TASKS.md` aktualisiert · bei Vertrags-Unklarheit Claude fragen, nicht raten · ein gemeinsamer `pnpm smoke`-Lauf grün, bevor wir an Lehrer übergeben.

---

## 6. Pickup-Prompt für Kimi (kopierbar)

> **An Kimi (Frontend/Schema-Spezialist):** Wir machen die Erstellungsseite testreif für 3–5 Lehrkräfte.
> Du übernimmst die **Frontend-Hälfte**. **Wichtig — Reihenfolge:** Claude legt zuerst zwei Verträge,
> erst danach kannst du K-1/K-2/K-3 bauen. Prüfe per `git pull`, dass diese da sind:
> (a) `Block.lernziele?: string[]` im Schema, (b) der erweiterte `useGenerate`-Hook mit
> `stage`, `elapsedMs`, `regenerateBlock(id, hinweis?)`. **Fasse `apps/web/src/hooks/useGenerate.ts`
> NICHT an** — das ist Claudes Datei; du konsumierst nur ihre Rückgabewerte. Arbeite ausschließlich
> in `apps/web/src/components/**`.
>
> Deine Aufgaben:
> - **K-1 Generierungs-Feedback:** In `Step4_Generate.tsx` den statischen „kann bis zu 2 Minuten"-Text
>   durch eine echte Statusanzeige ersetzen, die `stage` + `elapsedMs` aus `useGenerate` nutzt
>   (mehrstufig: „Sende an KI…", „Validiere…", „Korrigiere (Versuch 2)…", „Fertig"). Laufzeit-Timer.
>   „Abbrechen"-Button (best effort: UI verwirft das Ergebnis, blendet zurück — echtes Hard-Abort ist OUT).
> - **K-2 Lernziel-Abdeckung:** In `PreviewTwoColumn.tsx` (oder neue `LernzielCoverage.tsx`) eine
>   Checkliste: alle `meta.lernziele`, je Lernziel ✓ wenn mindestens ein Block es in `block.lernziele`
>   trägt, sonst ⚠️ „nicht abgedeckt". Nur anzeigen, wenn `meta.lernziele` gesetzt ist.
> - **K-3 „Block neu generieren":** Pro Block in der Vorschau ein Button, der `regenerateBlock(block.id)`
>   aufruft; optionales kleines Textfeld für einen Hinweis („kürzer", „schwieriger"). Lade-/Fehlerzustand je Block.
> - **K-4 ConfigPanel editierbar:** `BlockConfigPanel.tsx` — kategorisierung, tabelle, songanalyse von
>   read-only auf editierbar (Muster: die bereits editierbaren Typen). Felder: kategorisierung
>   (kategorien, items+optionen), tabelle (spalten, zeilen mit text|luecke), songanalyse (aufgabe/fragen).
> - **K-5 Vorlagen Export/Import:** In `TemplateManager.tsx` „Als Datei exportieren" (Download JSON aus
>   `{meta, bloecke}`) und „Aus Datei importieren" (Upload + Validierung via Schema/`migrateDocument`).
>   Schützt vor Datenverlust, ohne Drive-OAuth.
> - **K-6 Beispiel-Absichten:** In `Step0_Absicht.tsx` 2–3 Quick-Start-Buttons („Matura Deutsch: Faust",
>   „Test Englisch: Daily Routine"), die die Absichtsfelder vorbefüllen.
>
> **DoD:** `pnpm -r build` + `pnpm -r test` grün · A11y wie bisher (aria-labels) · Eintrag in
> `docs/changelog.md` · Status in `Administration der LLMs/TASKS.md`. Bei Unklarheit am Vertrag: Claude fragen, nicht raten.
> Konvergenz: K-2 braucht (a), K-1/K-3 brauchen (b) — beides liegt nach Claudes Phase 1 vor.

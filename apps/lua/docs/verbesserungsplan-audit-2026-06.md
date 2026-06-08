# Verbesserungsplan — Audit-Befunde, aufgeteilt nach Coding-Agent

**Stand:** 2026-06-03 · **Grundlage:** Code-Audit (`~/.claude/plans/du-agierst-als-erfahrener-eventual-sedgewick.md`)
**Rollenmodell:** `docs/agents-aufteilung.md` (2026-06-01)

Dieses Dokument verteilt die 10 priorisierten Maßnahmen + 5 Didaktik-Verbesserungen aus dem Audit
auf die aktiven Agenten **entlang der bestehenden Modul-Ownership**. Jeder Agent editiert nur sein
Modul; modulübergreifende Wünsche laufen über den Owner (Schema: Kimi).

---

## Rollen-Recap (Modul-Ownership)

| Agent | Modul / Zone | Rolle |
|-------|--------------|-------|
| **Qwen** | `src-tauri/*` | Rust-/Tauri-Kern: Adapter, Keystore, PDF, Korrektur-Kern |
| **Kimi** | `packages/schema/*`, `apps/web/src/*` | Schema-Owner, Frontend-Architekt, Integrator, Review-Gate |
| **GLM** | isolierte Lanes | Tests, Logos/Assets, UI-Politur, A11y, Doku, Tippfehler |
| **Claude** | `packages/llm/*` (Prompt/Validierung), Architektur-Review | Didaktik-Engine: Prompt-Qualität + inhaltliche Validierung |

> `packages/llm` (Prompt-Bau + Validierung) hat im aktuellen Modell keinen expliziten Owner. Es ist die
> didaktische Kernzone und wird hier **Claude** zugeordnet (Architektur/Didaktik). Schema-Felder, die der
> Prompt braucht, liefert **Kimi**.

---

## Arbeitspakete

### 🦀 Qwen — `src-tauri/`

| WP | Befund | Datei | Aufwand | Abhängig von |
|----|--------|-------|---------|--------------|
| **Q1** | **T-2**: Kimi & Qwen erhalten keinen JSON-Mode | `src-tauri/src/adapters/openai_compat.rs:57-60` | S | — |
| Q2 *(Stretch)* | Provider-Fallback bei Dauerfehler; Erkennung abgeschnittener JSON-Antworten (max_tokens) | `src-tauri/src/commands/llm.rs` | M | — |
| Q3 *(Stretch)* | Streaming-Variante von `llm_complete` für lange Generierungen | `src-tauri/src/commands/llm.rs` | L | — |

**Q1 konkret:** `matches!(... "openai" | "mistral" | "deepseek")` um `"kimi" | "qwen"` erweitern
(Moonshot & DashScope unterstützen `response_format: json_object`). Bestehenden Test
`test_build_request_kimi` (`:161`) so erweitern, dass `response_format` vorhanden ist.
**DoD:** Rust-Unit-Test grün, JS↔Rust konsistent.

---

### 🧩 Kimi — `packages/schema/` + `apps/web/`

| WP | Befund | Datei | Aufwand | Abhängig von |
|----|--------|-------|---------|--------------|
| **K1** | **T-1**: Unterstufen-Lückentext-Default ist schema-invalide | `apps/web/src/lib/blockDefaults.ts:19-23` | S | — |
| **K2** | **D-1a**: `schwierigkeit` ins Datenmodell, das ans LLM geht | `packages/schema/src/index.ts` (MetaSchema) | S | — *(schaltet C1 frei)* |
| **K3** | **D-3**: `lernziele`-Feld + Coverage-Ansicht + Provenance | `schema` + `Step0_Absicht.tsx`, `PreviewTwoColumn.tsx` | M | K2 |
| **K4** | **D-5a**: MC-Mindestoptionen erzwingen | `schema:116` `.min(4)`, `blockDefaults.ts:43` Default 4 | S | mit C2 abstimmen |
| **K5** | **D-6**: Edge-Case-Guards vor Generierung (leer/Mindestlänge) | `apps/web/src/hooks/useGenerate.ts` | S | — |
| **K6** | **U-1**: Zwei-Spalten-Vorschau responsiv stapeln | `apps/web/src/components/PreviewTwoColumn.tsx:61` | S | — |
| **K7** *(später)* | **T-3**: Schema-Versionierung mit Migrationspfad | `schema:221` | M | — |

**K1 konkret:** `distraktoren: isWortbankEnabled(meta?.stufe ?? 'oberstufe') ? 3 : 0` — damit erfüllt der
Default die `refine`-Regel `schema:70`.
**K2 konkret:** `schwierigkeit: z.enum(['leicht','mittel','schwer']).optional()` in `MetaSchema`; im
Generierungsfluss sicherstellen, dass `meta.schwierigkeit` aus dem `Auftrag` übernommen wird (heute geht
sie verloren). **Das ist die Voraussetzung dafür, dass Claudes Bloom-Steuerung (C1) überhaupt wirkt.**

---

### 🔧 GLM — Lanes / QA / Politur

| WP | Befund | Datei | Aufwand | Abhängig von |
|----|--------|-------|---------|--------------|
| **G1** | **U-2**: ARIA-Grundausstattung | Stepper, `Sidebar.tsx`, `BlockCard.tsx` (Drag-Handle) | M | — |
| **G2** | **#10/D-2-Tests**: Validierungs-Tests pro Blocktyp + Grounding-Check-Tests | `packages/qa/` | M | C3 |
| **G3** | **D-7**: Markieraufgabe-Semantik dokumentieren (kein Wahr/Falsch-Konstrukt) | `docs/` | S | — |
| **G4** | E2E reaktivieren: ≥1 deterministischer Lauf pro Blocktyp (Mock-Provider) | `packages/qa/src/e2e.test.ts` | M | mit Qwen/Kimi |

**Regel (aus agents-aufteilung):** GLM fasst weder `packages/schema/` noch `src-tauri/` an und trifft keine
Architekturentscheidungen. G1 ist rein additiv (Attribute), G2/G4 sind Tests.

---

### 🧠 Claude — `packages/llm/` (Didaktik-Engine) — *teilweise schon übernommen, siehe unten*

| WP | Befund | Datei | Aufwand | Abhängig von |
|----|--------|-------|---------|--------------|
| **C2** ✅ | **D-4 + D-5b + D-3-Lückentext**: Distraktoren als Fehlkonzepte, MC-Positions-Randomisierung, Lückentext-Distraktor-Leitlinie | `packages/llm/src/prompt.ts` | S | — |
| **C1** | **D-1b**: Bloom-Steuerung im SYSTEM-Prompt; `buildMessages` reicht `meta.schwierigkeit` durch | `packages/llm/src/prompt.ts` | S–M | K2 |
| **C3** | **D-2**: Post-Processing-Validierungspipeline (Grounding-Spotcheck + Dubletten-Hash, Hook für LLM-Judge) | `packages/llm/src/validate.ts` (+ neues `quality.ts`) | M | — |

---

## Reihenfolge & Abhängigkeiten

```
Sofort parallel (keine Abhängigkeiten):
  Q1 (Qwen)   K1 (Kimi)   K2 (Kimi)   C2 (Claude ✅)   K5, K6 (Kimi)   G1, G3 (GLM)

Nach K2 (schwierigkeit im Modell):
  C1 (Claude) ── Bloom-Steuerung wirkt jetzt end-to-end

Abstimmung C2 ↔ K4:
  Prompt (≥4 Optionen, Randomisierung) und Schema (.min(4)) müssen zusammenpassen

Nach C3 (Validierungspipeline):
  G2 (GLM) ── Tests für Grounding-/Dubletten-Checks

Später / Stretch:
  K7 (Versionierung)   Q2, Q3 (Fallback/Streaming)   K3 (Lernziele)   G4 (E2E)
```

**Kritischer didaktischer Pfad:** K2 → C1. Ohne K2 bleibt der Schwierigkeitsregler wirkungslos (Audit-Befund D-1).

---

## Von Claude bereits übernommen: WP-C2

Ich (Claude) habe WP-C2 direkt umgesetzt, weil es ausschließlich `packages/llm/src/prompt.ts` betrifft
(keine Kollision mit anderen Agenten, keine Schema-Abhängigkeit, hoher didaktischer Hebel). Siehe Diff in
`prompt.ts` und Eintrag in `Administration der LLMs/changelog/claude.md`. Inhalt:
- MC-Distraktoren als plausible **Fehlkonzepte/Misconceptions**, kein offensichtlicher Unsinn, kein „alle/keine der genannten".
- **Positions-Randomisierung** der richtigen MC-Antwort (gegen den A-Bias im bisherigen Beispiel).
- Lückentext-**Distraktor-Leitlinie** (gleiches Wortfeld, grammatisch einsetzbar, inhaltlich falsch) + Eindeutigkeit der Lücke.
- Vorbereitete (auskommentierte/aktive) Bloom-Hinweise als Anknüpfung für C1.

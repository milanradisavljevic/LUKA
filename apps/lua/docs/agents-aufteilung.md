# Agenten-Aufteilung und Fahrplan

Stand: 2026-06-01. Dieses Dokument ersetzt `iterationen.md` und `DESIGN.md`, die nach `docs/archiv/` verschoben wurden. Die Quelle der Wahrheit für Inhalt und Architektur bleibt `produktvision.md`, `tauri-architektur.md`, `datenmodell-erweiterung.md` und `fahrplan.md`.

---

## Zuständigkeiten (aktive Agenten)

| Agent | Rolle | Kernaufgaben |
|-------|-------|-------------|
| **Qwen** | **Rust-/Tauri-Ingenieur** | Alles unter `src-tauri/`. `llm_complete`, sichere Schlüsselablage, PDF-Konvertierung, Korrektur-Kern. |
| **Kimi** (ich) | **Schema-Owner, Frontend-Architekt, Integrator** | `packages/schema/*`, `apps/web/src/*`, State-Fluss, Vorschau, Export-UI. Review aller Änderungen vor dem Merge. |
| **GLM** | **Lane-Worker, Qualitätssicherung** | Klar abgegrenzte, isolierte Tasks: Preise, Logos, Tippfehler, Tests, UI-Politur. Keine Architekturentscheidungen. |

**Wichtig:** Schema-Änderungen laufen ausschließlich über Kimi (Schema-Owner). Andere Agenten dürfen `packages/schema/` nicht direkt ändern — Wünsche über Kimi oder über die Dokumentation einbringen.

---

## Abhängigkeiten und Los-Reihenfolge

```
Tag 0 (JETZT)
├── Qwen: GO → Phase A (Tauri scaffolden, llm_complete, Schlüsselablage)
├── Kimi: GO → Phase B (Schema-Erweiterung + UI-Komponenten vorbereiten)
└── GLM:  GO → Lane-Tasks (Preise, Logos, Tippfehler, Tests)

Tag 1–2
├── Qwen: Rust-Kern wächst, erste Adapter stehen
├── Kimi: Schema steht, UI-Masken sind gebaut
└── GLM: Lane-Tasks fertig oder fast fertig

Tag 2–3 (Qwen meldet: Phase A fertig, invoke funktioniert)
├── Kimi: GO → useGenerate auf invoke umstellen, Vorschau-Integration
└── Qwen: GO → Phase C (alle 6 Adapter vervollständigen)

Tag 3–5
├── Qwen: Adapter fertig, Rust-Seite stabil
├── Kimi: Frontend fließt, Baukasten als Werkstatt funktioniert
└── GLM: Poliert, Tests laufen

Tag 5+ (Phase D & E)
├── Qwen: PDF-Kommando + Korrektur-Kern
└── Kimi: Export-UI, Korrektur-Oberfläche
```

**Kritischer Pfad:** Phase A muss zuerst laufen. Ohne Tauri-Rust-Seite funktionieren keine lokalen LLM-Aufrufe und kein sicherer Schlüsselspeicher.

---

## Detaillierte Aufgaben pro Agent

### Qwen — Rust/Tauri-Kern

**Phase A — Sofort loslegen**
1. `src-tauri/` mit Tauri 2 scaffolden (offizielles CLI, nicht von Hand raten).
2. Rust-Kommando `llm_complete(provider, model, system, messages, kreativitaet) -> string`:
   - Anthropic-Adapter (eigenes Format: `x-api-key`, `anthropic-version`).
   - OpenAI-kompatibler Adapter (OpenAI, DeepSeek, Mistral, Qwen, Kimi — je eigene Basis-URL, Bearer-Token).
3. Sichere Schlüsselablage: Tauri-Stronghold oder OS-Keyring. Kommando zum Speichern und Lesen bereitstellen.
4. Erststart-Maske (die UI-Seite baut Kimi; Qwen stellt nur die Rust-Schnittstelle).

**Phase C — Nach Phase A**
5. Direkte Adapter für alle 6 Anbieter vervollständigen und testen.

**Phase D — Nach Phase B**
6. Rust-Kommando `convert_pdf(docx) -> pdf` über `std::process::Command` mit `soffice --headless --convert-to pdf`.
7. Fallback-Logik wenn LibreOffice fehlt.

**Phase E — Später**
8. Korrektur-Kern: Scan-Import, lokale Texterkennung, Abgleich geschlossener Aufgaben.

**Lesestoff:** `docs/tauri-architektur.md`, `docs/datenmodell-erweiterung.md`.

---

### Kimi — Schema & Frontend

**Phase B — Sofort loslegen (parallel zu Qwen)**
1. **Schema-Erweiterung** (TypeScript/Zod, `packages/schema/`):
   - `UnterlagentypSchema`, `AuftragSchema`, `TypProfil`, `PROFILE`.
   - `buildSkelett(auftrag: Auftrag): Block[]` — deterministisch, kein LLM.
   - `meta.typ` additiv (optional mit Default `'schularbeit'`, damit 108 Tests grün bleiben).
   - Korrektur-Namespace reservieren (`Abgabe`, `Bewertung`) — noch nicht verdrahten.
2. **Neue UI-Komponenten** vorbereiten (noch ohne Tauri-Anbindung):
   - Absicht-Eingabemaske (Typ, Fach, Stufe, Thema, Quelltexte, Dauer, Schwierigkeit, optionale Aufgabenarten).
   - Vorschau mit zwei Modi: Struktur sofort (kein API-Aufruf), Inhalt nach Generierung.
   - Baukasten als Werkstatt hinter dem Entwurf.
   - Iterative Nachbesserung pro Block ("kürzer", "schwieriger").
   - Vorlagen je Typ und Klasse.

**Nach Qwens Phase A**
3. `useGenerate` umbauen: `invoke('llm_complete', ...)` statt `fetch`.
4. State-Anpassung (`useWizard.ts`, `lib/types.ts`): `generiertesDokument`, Fluss `Auftrag → buildSkelett → invoke → DocumentV1`.

**Phase C/D — Parallel zu Qwen**
5. Anbieter-Logos und Modell-Info-Panel im UI integrieren (GLM liefert Assets/Preise).
6. Korrekturraster-Anbindung: `useExport` um Raster-Export erweitern.
7. PDF-Export-UI (wenn Tauri+LibreOffice da: direkt; sonst Fallback-Modal).

**Lesestoff:** `docs/produktvision.md`, `docs/datenmodell-erweiterung.md`, `docs/fahrplan.md`.

---

### GLM — Lane-Tasks (Sofort loslegen, völlig unabhängig)

1. **Modell-Preise verifizieren** in `apps/web/src/lib/models.ts` (oder `packages/llm/src/models.ts`):
   - Offizielle Preisseiten abrufen und Preise eintragen.
   - Platzhalter `0` bis verifiziert, Quelle als Kommentar.
   - **Quellen:** Anthropic (`anthropic.com/pricing`), OpenAI (`openai.com/pricing`), DeepSeek (`platform.deepseek.com/pricing`), Mistral (`mistral.ai/products/la-plateforme`), Qwen (`help.aliyun.com/.../models`), Kimi (`platform.moonshot.cn/docs/pricing/chat`).
2. **Offizielle Anbieter-Logos** (SVGs) unter `apps/web/src/assets/` ablegen.
3. **Navigationsleiste aufraeumen:**
   - Aktiven Menüpunkt visuell hervorheben.
   - Noch nicht verfügbare Punkte als "bald verfügbar" kennzeichnen (nicht nur ausgrauen).
4. **Arbeitsanweisungs-Platzhalter pro Blocktyp** passend machen.
5. **Tippfehler:** "Aufgabenblockoecke" in `PointSummary.tsx` beheben.
6. **Kreativitätsregler:** Rot → violetter Akzent in `Step3_LLMOptions.tsx`.
7. **Leerzustände und UI-Politur.**
8. **Zusätzliche Tests:** z. B. `packages/input` hat Tests aber kein `vitest.config.ts`.

**Regel:** Keine Änderungen an `packages/schema/`, `src-tauri/`, oder Architekturentscheidungen. Bei Unklarheiten in Kimis Code: fragen, nicht raten.

**Lesestoff:** `docs/fahrplan.md` (Abschnitt "Lane für einfache Arbeiten"), betroffene Source-Dateien.

---

## Kritische Abhängigkeiten

| Blockiert | Bis folgendes bereit ist |
|-----------|-------------------------|
| Kimi: `useGenerate` auf `invoke` umstellen | Qwens `llm_complete` + `invoke`-Schnittstelle |
| Kimi: PDF-Export-UI (direkter Modus) | Qwens `convert_pdf` Kommando |
| Qwen: Rust-Structs für Korrektur | Kimis Schema-Erweiterung (`Abgabe`, `Bewertung`) |

---

## Test-Strategie

| Ebene | Wer | Wann |
|-------|-----|------|
| Unit (Schema, buildSkelett) | Kimi | Mit Phase B |
| Rust-Unit (Adapter, Commands) | Qwen | Mit Phase A/C |
| Integration (LLM-Invoke-Wrapper) | Qwen + Kimi | Nach Phase A |
| Frontend (State, Vorschau, UI) | Kimi | Mit Phase B |
| E2E (Gesamtfluss) | Kimi + Qwen | Nach Phase D |
| Regression (108 Tests) | Alle | Vor jedem Commit |

---

## Review-Prozess

1. **Kimi reviewed alle Änderungen** vor dem Merge (funktionale Korrektheit, Schema-Konformität, Test-Grün).
2. **Claude Code prüft die Architektur** sobald wieder verfügbar (Schema-Owner-Verantwortung, Datenschutz-Prüfung für Phase E).
3. **Natascha-Gates** bleiben wie in `fahrplan.md` definiert.

---

## Changelog

Siehe `docs/changelog.md`. Jeder Agent dokumentiert dort seine Änderungen mit Datum, Agent-Name, Datei und Kurzbeschreibung.

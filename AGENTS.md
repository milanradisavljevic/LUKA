# AGENTS.md — Onboarding für Coding-Agents

Dieses Repo (`lehr-suite`) verschmilzt zwei Lehrer-Desktop-Tools zu einem
**Closed-Loop-System** (Erstellen → Korrigieren → gezielt Üben). Lies das hier,
bevor du Code änderst.

## Goldene Regeln

1. **Changelog pflegen.** Jede substanzielle Änderung kommt in `CHANGELOG.md`
   (oben, mit Datum). Das ist die Übergabe an den nächsten Agent.
2. **Keine Schüler-Echtdaten committen.** DBs (`*.db`), `apps/natascha/output/`,
   `apps/natascha/input/`, „abgegebene Arbeiten", `bridge/inbox/*.json` und
   `.env` sind per `.gitignore` ausgeschlossen — halte es so.
3. **Vor „fertig": verifizieren.** Befehle unten ausführen und Output prüfen,
   nicht raten.
4. **Snapshot-Charakter respektieren.** `apps/lua` und `apps/natascha` sind
   Kopien eigenständiger Apps; sie sollen je für sich lauffähig bleiben.
5. **Interne Docs nicht committen.** Das Repo ist **öffentlich**. Arbeits- und
   Planungsdokumente (`docs/PLAN-*`, `MASTERPLAN-*`, `STRATEGIE-*`, `REVIEW-*`,
   `AUDIT-*`, `SPEC-*`, `TESTPLAN-*`, Handoffs, Phasen-Pläne …) bleiben lokal —
   `docs/*` ist per `.gitignore` ausgeschlossen. Versioniert sind nur echte
   Doku-Dateien (Whitelist in `.gitignore`): `docs/ANLEITUNG.md`,
   `docs/DATENSCHUTZ.md`, `docs/invarianten.md`, `docs/szenarien.md` und
   `docs/lehrplan-quellen/` (Input der Stoffkatalog-Generierung). Neue echte
   Doku ausdrücklich in die Whitelist aufnehmen, nicht `docs/*` aufweichen.
6. **CHANGELOG vor Release-Tag lehrkraft-tauglich.** Vor jedem Versions-Tag
   muss der CHANGELOG-Abschnitt der Version existieren und die
   nutzersichtbaren Punkte so formulieren, dass eine Lehrkraft sie versteht
   (kurz, ohne Implementierungsdetail) — die App zeigt diese Notes im
   Update-Dialog an (`releaseBody` → `latest.json` → `update.body`).
7. **Fachpaket-JSONs vor dem Commit validieren.** `samples/fachpakete/*.json`
   werden vom Rust-Import **nicht** gegen das Block-Schema geprüft — Fehler
   fallen sonst erst beim Laden in der App auf. Vor jedem Commit an diesen
   Dateien: `node scripts/validate-fachpakete.mjs` (braucht ein gebautes
   `packages/schema`, siehe oben) muss ohne FAIL durchlaufen; dieselbe Prüfung
   läuft auch in CI. Wichtigste Stolperfalle: `blockJson`-Strings brauchen
   **doppelt** escapte Zeilenumbrüche (`\\n`, nicht `\n`), da sie selbst JSON
   innerhalb von JSON sind. Schema-Limits (z. B. max. Rollen bei
   `rollenkartenSet`) stehen in `apps/lua/packages/schema/src/index.ts`.

## Struktur

```
apps/lua/        Lehrunterlagen-Tool — TS + React + Vite + Tauri (pnpm-Monorepo)
                 packages/{schema,llm,input,renderer,qa} + apps/web + src-tauri
apps/natascha/   NATASCHA — Python 3.11+ / Textual-TUI, SQLite
bridge/          Datei-Brücke: schema.json (Vertrag) + README.md + inbox/
```

## Apps bauen / verifizieren

**LUA** (in `apps/lua/`):
```bash
pnpm install
pnpm -r build         # Pakete bauen (web löst @lehrunterlagen/schema über dist/ auf → erst bauen!)
pnpm -r typecheck
pnpm -r test
pnpm smoke            # echter LLM→DOCX Smoke-Test (billiges Haiku) — kostet API
cd src-tauri && cargo check   # Rust-Backend
pnpm tauri:dev        # Desktop-App (braucht Display; real auf Windows)
```

> **WSL-Stolperstein:** Auf `/mnt/c` (WSL→Windows-FS) materialisiert pnpm die
> rollup-Optional-Plattform-Binary `@rollup/rollup-linux-x64-gnu` oft nicht →
> `vite build`/`vitest` brechen mit „Cannot find module @rollup/rollup-linux-x64-gnu".
> Das ist ein Umgebungs-/Optional-Deps-Flake (npm-Bug #4828), **nicht** der Code, und
> betrifft den Windows-Build nicht (anderes Binary). Workaround: `CI=true pnpm install`
> (hilft mal, mal nicht). `tsc --noEmit` und `tauri:dev` funktionieren unabhängig davon;
> `vite build`/`vitest` zuverlässig auf Windows oder echtem Linux prüfen.

**NATASCHA** (in `apps/natascha/`):
```bash
python3 seed_testdaten.py     # Test-DB (Klasse TEST-7a), braucht keine venv
python3 natascha.py           # Textual-TUI
python3 -m py_compile *.py    # schneller Syntax-Check
```

## Konventionen

- **LUA UI: Icons statt Emojis.** Emojis rendern im gepackten Tauri-EXE
  (WebView2) nicht → `lucide-react`-SVGs verwenden.
- **NATASCHA TUI: Emojis sind ok** (echtes Terminal).
- **Schema-first (LUA):** Typen/Zod liegen in `packages/schema`. Da `apps/web`
  über `dist/` auflöst, nach Schema-Änderungen `pnpm -r build` laufen lassen,
  bevor du Web-Typen prüfst.
- **NATASCHA DB-Zugriff** ist stdlib-only (`sqlite3`); keine schweren Deps in
  `natascha_db.py` einführen.
- **Neue Tauri-Commands**: in `src-tauri/src/commands/*.rs` + in `mod.rs` und
  `main.rs` registrieren (Muster: `commands/bridge.rs`).

## Bridge-Vertrag (Phase 1)

`bridge/schema.json` ist die **Single Source of Truth** des Austauschformats.
Beide Seiten halten sich daran; `schemaVersion` versioniert es. NATASCHA schreibt
nach `~/lehr-suite-bridge/inbox` (Default, home-basiert), LUA liest dort. Details:
`bridge/README.md`.

End-to-End-Smoke (ohne GUI):
```bash
cd apps/natascha && python3 seed_testdaten.py && python3 natascha_bridge.py TEST-7a SA2
# erzeugt ~/lehr-suite-bridge/inbox/TEST_7a_SA2_<datum>.json (schema-konform)
```

## Roadmap

- **Phase 1 — Datei-Brücke (MVP): DONE.** Siehe CHANGELOG 2026-06-08.
- **Phase 2 — Gemeinsame SQLite: DONE.** Ist-Architektur:
  **`docs/phase2-shared-db.md`**. LUA initialisiert die gemeinsame DB
  `~/lehr-suite-bridge/lehr-suite.db` über `apps/lua/src-tauri/src/db.rs`
  aus `natascha_schema.sql` + `lua_schema.sql`; `apps/web/src/lib/storage.ts`
  nutzt einen Hydrate-Cache mit SQLite-Persistenz und Browser/localStorage-
  Fallback. NATASCHA bleibt Schema-Eigentümer; LUA spiegelt das NATASCHA-Schema
  additiv und reicht für Headless-Sidecar-Aufrufe immer `--db-path` weiter.
- **Phase 3 — Native Korrektur-UI: RELEASE-KANDIDAT.** Die Korrektur ist als
  nativer React-Arbeitsbereich integriert; der Python-Core läuft als headless
  Sidecar. Gemeinsame Datenbank, Korrekturgrundlage, Rubrik-Kontext,
  Feedback-DOCX und Closed-Loop-Folgeübung sind implementiert. Die TUI bleibt
  als technischer Fallback in den erweiterten Einstellungen.
- **Nächster Gate:** v1.2.0 dokumentieren, lokal/CI verifizieren und den
  installierten Windows-/macOS-Pfad mit synthetischen Daten abnehmen. Erst
  danach folgen Pilotfeedback und weitere Fachpakete/Lehrpläne.

# Phase 3 — Korrektur-UI ins Tauri/React-Frontend bringen

> Frage: „Wie arbeiten wir die Terminal-UI (NATASCHA, Textual) in das Rust/React-UI ein?"

## Kernproblem

NATASCHAs Korrektur-Oberfläche ist eine **Textual-TUI** — sie braucht ein echtes
Terminal (PTY, ANSI, Tastatur-Fokus) und lässt sich **nicht** als Komponente in
die WebView einbetten. Drei realistische Wege, vom günstigsten zum aufwändigsten:

### Weg A — TUI in einem Terminalfenster starten  ✅ umgesetzt (Phase 3a)
Ein Button/Sidebar-Eintrag in der App startet `python natascha.py` in einem
**neuen Terminalfenster** (Tauri-Rust `Command`, plattformspezifisch).

- **Pro:** minimaler Aufwand, NATASCHAs volle TUI bleibt 1:1 erhalten, kein Rewrite.
- **Contra:** separates Fenster, nicht „in der App" eingebettet.
- **Status:** gebaut. Command `launch_natascha` (`src-tauri/src/commands/natascha.rs`),
  Sidebar-Eintrag „Korrektur (NATASCHA)", View `KorrekturView.tsx`, konfigurierbar
  über Einstellungen (`nataschaDir`, `pythonCommand`).
- **Offen/Verifikation:** Das Spawnen wurde nur auf Linux kompiliert; **Windows-
  Pfad braucht einen echten Test** (`cmd /C start … cmd /K python natascha.py`).
  Fallback (manueller Befehl) ist in der View dokumentiert.

### Weg B — Eingebettetes Terminal (xterm.js + PTY)
Ein React-Panel mit **xterm.js**, das über eine PTY-Brücke (Rust-Crate
`portable-pty`) die TUI rendert; Bytes laufen via Tauri-Events hin und her.

- **Pro:** Fühlt sich „integriert" an, TUI bleibt unverändert.
- **Contra:** Neue Deps (portable-pty, xterm.js), Resize/Fokus/Encoding-Feinheiten,
  plattformsensibel. Mittlerer Aufwand.
- **Wann:** Wenn Weg A als „separates Fenster" stört, aber ein Rewrite zu teuer ist.

### Weg C — Headless-Pipeline + native React-Korrektur-UI
NATASCHAs Analyse-Pipeline (`natascha_core.run_llm_analysis`) wird **headless**
aufrufbar gemacht (CLI/JSON-in-out) und aus Tauri via
`Command::new("python")` gestartet; die Korrektur-Oberfläche wird in **React neu
gebaut** (Datei wählen → analysieren → Heatmap/Noten anzeigen), auf der
gemeinsamen DB aus Phase 2.

- **Pro:** Echte „eine App, zwei Module"-Vision; konsistente UI.
- **Contra:** Größter Brocken — Teile der ~13k Zeilen TUI-Logik müssen als
  Service entkoppelt und das UI neu gebaut werden.
- **Voraussetzung:** Phase 2 (gemeinsame DB) als Bindeglied.

## Empfehlung (gestaffelt)

1. **Jetzt:** Weg A (erledigt) — sofort nutzbarer Einstieg „zum Korrekturmenü".
2. **Phase 2** bauen (gemeinsame DB), damit LUA Klassen/Heatmaps **lesen** kann.
3. **Dann** entscheiden: reicht Weg A + native „Meine Klassen"-Ansichten (Lesen
   aus der DB), oder lohnt sich Weg C (volle React-Korrektur-UI)? Weg B nur, falls
   ein eingebettetes Terminal explizit gewünscht ist.

## Packaging-Hinweis (für echten Installer)

Weg A/B/C brauchen im gepackten Build ein lauffähiges NATASCHA (Python + Deps).
Optionen: Python-Sidecar via PyInstaller als Tauri-`externalBin`, oder
dokumentierte Python-Installation. Heute (Dev/kopiertes Repo) findet
`launch_natascha` `apps/natascha` automatisch relativ zur App.

## Verifikation Phase 3a

- `cd apps/lua/src-tauri && cargo check` — grün.
- In der App: Sidebar „Korrektur (NATASCHA)" → „NATASCHA-Korrektur öffnen" →
  Terminalfenster mit der TUI öffnet sich (auf der Zielplattform testen).
- Fehlerfall: klare Meldung + manueller Befehl in der View.

# NATASCHA – TUI-Wrapper (zugewiesen an GLM)

> Prioritaet: Hauptaufgabe Phase 2
> Erstellt: 2026-04-10 von Claude Opus

---

## Dein Auftrag

Baue ein Terminal User Interface (TUI) fuer das NATASCHA-Projekt: einen Korrektur-Agenten fuer oesterreichische Gymnasium-Schularbeiten in Deutsch und Englisch.

Erstelle zuerst den Ordner `prompts/` im Projektroot und verschiebe diese Datei dorthin.

## Vorbereitung – Lies zuerst diese Dateien

Bevor du Code schreibst, lies und verstehe:

1. `MASTER_PROMPT.md` – der gewuenschte Korrektur-Workflow
2. `generate_feedback.py` – der bestehende DOCX-Generator (geschrieben von Codex)
3. `feedback_schema.json` – das JSON-Schema fuer Analyse-Ergebnisse
4. `rubrics/` – alle verfuegbaren Bewertungsraster (nicht legacy/)
5. `tests/test_feedback.py` und `tests/fixtures/` – bestehende Tests und Beispiel-JSONs

WICHTIG: Du aenderst KEINE bestehenden Dateien. Du baust eine neue TUI, die den bestehenden Code nutzt.

---

## Warum TUI statt GUI

- Laeuft direkt in WSL ohne Browser oder Server
- Bei Problemen: Quellcode lesen, Fehler fixen, fertig
- Passt zum Terminal-Workflow des Nutzers (codex, claude, qwen, glm CLI-Tools)
- Zielgruppe ist eine Lehrkraft, die mit etwas Anleitung im Terminal arbeiten kann, aber keine JSON-Dateien manuell erstellen will

---

## Tech-Stack

**Framework:** `textual` (pip install textual)

Gruende:
- Modernste Python-TUI-Bibliothek, aktiv maintained (2024/2025)
- Maus-Support im Terminal (wichtig fuer weniger technische User)
- Rich-Text, Tabellen, Fortschrittsbalken out of the box
- Debug-Modus: `textual run --dev natascha_tui.py`

Falls du `textual` fuer zu komplex haeltst: Fallback auf `rich` + `InquirerPy`.
Dokumentiere deine Entscheidung und den Grund.

---

## Workflow der TUI (5 Screens)

### Screen 1: Willkommen & Dateiauswahl

```
+-- NATASCHA - Korrektur-Agent ----------------+
|                                                |
|  Dateien in /input/:                           |
|  [x] deutsch_digga.docx          (342 Woerter)|
|  [x] kommentar_bachler.docx      (518 Woerter)|
|  [ ] english_essay_mueller.docx   (411 Woerter)|
|                                                |
|  [Alle auswaehlen]  [Weiter]                  |
+------------------------------------------------+
```

- Zeige alle .docx Dateien aus dem konfigurierten Input-Ordner
- Checkbox-Auswahl (einzeln oder alle)
- Wortanzahl aus dem DOCX extrahieren (python-docx)
- Dateien unter 50 Woertern: Warnung anzeigen

### Screen 2: Zuordnung (Fach / Schulstufe / Textsorte / Rubrik)

```
+-- Zuordnung ---------------------------------+
|                                                |
|  deutsch_digga.docx                            |
|  Fach:        [Deutsch v]                     |
|  Schulstufe:  [Oberstufe v]                   |
|  Textsorte:   [Eroerterung    ]               |
|  Rubrik:      [srdp_deutsch_oberstufe.md v]   |
|                                                |
|  [Zurueck]  [Analyse starten]                 |
+------------------------------------------------+
```

- Pro Datei: Dropdowns fuer Fach und Schulstufe
- Textsorte: Freitextfeld (kein Dropdown – zu viele Optionen)
- Rubrik: Dropdown, automatisch vorbelegt basierend auf Fach+Schulstufe:
  - Deutsch + Oberstufe → srdp_deutsch_oberstufe.md
  - Deutsch + Unterstufe → deutsch_unterstufe.md
  - Englisch + Oberstufe → srdp_englisch_b2.md (Default, aenderbar auf b1)
  - Englisch + Unterstufe → englisch_a2.md
- KEINE automatische Textsorterkennung noetig. Manuell reicht voellig.

### Screen 3: LLM-Analyse

```
+-- Analyse ------------------------------------+
|                                                |
|  Agent: [claude v]                            |
|                                                |
|  deutsch_digga.docx                            |
|  Status: Warte auf Analyse...                 |
|  [========----------]  40%                    |
|                                                |
|  kommentar_bachler.docx                        |
|  Status: In Warteschlange                     |
|                                                |
|  [Prompt kopieren]  [Agent starten]  [Abbruch]|
+------------------------------------------------+
```

Zwei Modi:

**Modus A – "Prompt kopieren" (immer verfuegbar):**
- Generiere den vollstaendigen Analyse-Prompt (System + User)
- Kopiere ihn in die Zwischenablage (oder zeige ihn an)
- User fuettert ihn manuell an einen LLM-Agent
- User fuegt das JSON-Ergebnis manuell ein oder speichert es nach output/feedback_data/

**Modus B – "Agent starten" (optional, wenn CLI verfuegbar):**
- Rufe den konfigurierten Agent per Subprocess auf
- Agent-Befehle (konfigurierbar in natascha_config.toml):
  ```
  claude:  echo "$PROMPT" | claude --print
  codex:   echo "$PROMPT" | codex --quiet
  qwen:    echo "$PROMPT" | qwen --no-stream
  glm:     echo "$PROMPT" | glm
  ```
- Parse stdout, extrahiere JSON (zwischen ```json ... ``` oder als raw JSON)
- Validiere gegen feedback_schema.json
- Bei Fehler: Retry-Option oder Fallback auf Modus A
- Timeout: konfigurierbar (Default 120s)

**Prompt-Generierung:**

Erstelle eine Funktion `build_analysis_prompt(docx_text, rubric_content, fach, schulstufe, textsorte) -> str`

Der generierte Prompt muss:
- Den vollstaendigen Text der Schuelerarbeit enthalten
- Die vollstaendige Rubrik enthalten
- Klar anweisen: "Antworte NUR mit validem JSON, kein Markdown, kein Erklaertext"
- Das feedback_schema.json als Referenz einbetten oder zusammenfassen
- Fach, Schulstufe und Textsorte angeben
- Ein Beispiel-JSON aus tests/fixtures/ als Referenz einbetten

### Screen 4: JSON-Review

```
+-- Ergebnis pruefen --------------------------+
|                                                |
|  deutsch_digga.docx                            |
|  Textsorte: Eroerterung                       |
|  Note: 3 - Befriedigend (Schnitt 2.75)        |
|                                                |
|  +- Inhalt --------------------------+        |
|  | Stufe: im Wesentlichen richtig     |        |
|  | Punkte: 2                          |        |
|  | Staerken: 3 | Schwaechen: 4        |        |
|  | [Details anzeigen]                 |        |
|  +------------------------------------+        |
|                                                |
|  Schema-Validierung: OK                        |
|                                                |
|  [JSON editieren]  [DOCX generieren]          |
+------------------------------------------------+
```

- Zeige das Analyse-Ergebnis strukturiert (nicht als raw JSON)
- Kompaktansicht: Kriterium, Stufe, Punkte, Anzahl Staerken/Schwaechen
- "Details anzeigen": Klappt Staerken, Schwaechen, Vorschlaege auf
- "JSON editieren": Oeffnet das JSON in einem Texteditor-Widget
- Echtzeit-Validierung gegen feedback_schema.json
- Validierungsfehler rot markieren

### Screen 5: DOCX-Generierung & Abschluss

```
+-- Fertig -------------------------------------+
|                                                |
|  OK  deutsch_digga_feedback.docx               |
|      output/deutsch_digga_feedback.docx        |
|                                                |
|  OK  kommentar_bachler_feedback.docx           |
|      output/kommentar_bachler_feedback.docx    |
|                                                |
|  [Ordner oeffnen]  [Neue Analyse]  [Beenden]  |
+------------------------------------------------+
```

- Rufe generate_feedback.py als Modul auf (importiere build_feedback_document und Helfer)
- Zeige Ergebnis-Dateien mit Pfad
- "Ordner oeffnen": oeffnet den Output-Ordner (xdg-open oder explorer.exe fuer WSL)

---

## Konfigurationsdatei

Erstelle `natascha_config.toml`:

```toml
[project]
name = "NATASCHA"
description = "Normbasierte Analyse von Textproduktionen: Automatisierte Schularbeits-Correction als Hilfe-Agent"

[agent]
default = "claude"
timeout_seconds = 120
# Verfuegbare Agents und ihre CLI-Aufrufe:
# claude = 'echo "{prompt}" | claude --print'
# codex  = 'echo "{prompt}" | codex --quiet'
# qwen   = 'echo "{prompt}" | qwen --no-stream'
# glm    = 'echo "{prompt}" | glm'

[paths]
input = "input"
output = "output"
rubrics = "rubrics"
feedback_data = "output/feedback_data"

[defaults]
fach = "Deutsch"
schulstufe = "Oberstufe"
```

---

## Integrationspruefung (WICHTIG)

Waehrend du den Code von Codex liest, pruefe auf Inkonsistenzen.
Falls du Probleme findest, dokumentiere sie in `INTEGRATION_NOTES.md`:

- Funktionen in generate_feedback.py die nicht exportiert sind, aber sollten
- Felder im JSON-Schema die unklar definiert sind
- MASTER_PROMPT.md Stellen die nicht zum Code passen
- Rubrik-Dateien die Formatprobleme haben

Das ist kein formaler Review, sondern eine praktische Notiz: "Das ist mir beim Bauen aufgefallen."

---

## Lieferumfang

| Datei | Beschreibung |
|-------|-------------|
| `natascha_tui.py` | Haupt-TUI |
| `natascha_config.toml` | Default-Konfiguration |
| `requirements_tui.txt` | Abhaengigkeiten (textual etc.) |
| `INTEGRATION_NOTES.md` | Gefundene Inkonsistenzen (falls vorhanden) |

---

## Einschraenkungen

- NICHT aendern: generate_feedback.py, feedback_schema.json, MASTER_PROMPT.md, rubrics/*
- Keine Webserver, kein Flask, kein Electron
- Kein automatisches Installieren von Paketen – requirements_tui.txt reicht
- Alle Texte in der TUI auf Deutsch
- Umlaute als ae/oe/ue in Dateinamen und Code-Kommentaren, aber als ae/oe/ue auch in der TUI-Anzeige (Konsistenz mit dem Gesamtprojekt)

---

*Zugewiesen an: GLM 5.1*
*Erstellt: 2026-04-10, Claude Opus via claude.ai*

# NATASCHA -- Anleitung für Endnutzer

**Version 0.7.0 | Stand: Mai 2026**

NATASCHA analysiert Deutsch- und Englisch-Schularbeiten automatisch und erstellt strukturiertes Feedback.

---

## Installation

**Voraussetzungen:**
- Python 3.11 oder neuer
- API-Key für einen LLM-Provider (Anthropic, OpenAI, Mistral oder andere)

**Installation:**
```bash
pip install -r requirements_tui.txt
```

**API-Key konfigurieren:**
Erstellen Sie eine `.env`-Datei im Projektverzeichnis:
```
ANTHROPIC_API_KEY=ihr-key-hier
MISTRAL_API_KEY=ihr-mistral-key
```

---

## Starten

**TUI-Dashboard (empfohlen):**
```bash
python natascha.py
```

**CLI-Wizard (alternativ):**
```bash
python natascha_wizard.py
```

---

## Das TUI-Dashboard

Das Dashboard hat drei Spalten:

**Linke Spalte - Dateien:**
- Listet alle .docx-Dateien der aktuellen Aufgabe auf
- Markierung mit `>` = aktuell ausgewählt
- Markierung mit `X` = nicht relevant (z.B. .history, .md)

**Mittlere Spalte - Zuordnung:**
- Klasse, Aufgabe, Textsorte, Schulstufe, Fach, Rubrik

**Rechte Spalte - Vorschau:**
- Zeigt den Inhalt der ausgewählten Datei

**Navigation:**
- **TAB**: Zwischen Spalten wechseln
- **Pfeiltasten hoch/runter**: In aktueller Spalte navigieren
- **Leertaste**: Datei markieren/entmarkieren
- **Q**: Programm beenden

---

## Arbeitsablauf

### 1. Ordnerstruktur vorbereiten

```
input/
  6i/
    SA_Thema_Genderneutrale_Mode/
      ausgangstext/
        [optional: Vorlage/Aufgabenstellung].docx
      Eva 6i.docx
      Max 6i.docx
      ...
```

Jede Klasse erhält einen eigenen Ordner unter `input/`. Pro Aufgabe ein Unterordner.

### 2. Klasse und Aufgabe konfigurieren

Öffnen Sie `natascha_config.toml` und fügen Sie Ihre Klasse hinzu:

```toml
[classes.6i]
input = "input/6i"
output = "output/6i"
active_aufgabe = "SA_Thema_Genderneutrale_Mode"

[classes.6i.aufgaben.SA_Thema_Genderneutrale_Mode]
label = "SA Thema Genderneutrale Mode"
fach = "Deutsch"
schulstufe = "Oberstufe"
textsorte = "Kommentar"
rubric = "kommentar.md"
input = "input/6i/SA_Thema_Genderneutrale_Mode"
output = "output/6i/SA_Thema_Genderneutrale_Mode"
```

### 3. Erwartungshorizont erstellen (optional)

Erstellen Sie eine Markdown-Datei mit Ihren inhaltlichen Erwartungen:

```toml
[classes.6i.aufgaben.SA_Thema_Genderneutrale_Mode]
erwartungshorizont = "erwartungshorizont.md"
```

Die Datei kommt in den gleichen Ordner wie die Rubrik.

### 4. App starten und Aufgabe auswählen

1. `python natascha.py` ausführen
2. Im Dashboard: Klasse auswählen
3. Aufgabe auswählen
4. Die Dateien werden in der linken Spalte angezeigt

### 5. Analyse durchführen

**Einzeldatei:**
- Datei mit Pfeiltasten auswählen
- Analyse starten (Tastenkürzel im Menü beachten)

**Batch (mehrere Dateien):**
- Dateien mit Leertaste markieren
- Batch-Analyse starten

Die App:
- Liest den Text aus der .docx-Datei
- Lädt Rubrik und optional Erwartungshorizont
- Sendet alles an das LLM
- Berechnet intern die Note
- Speichert Analyse-JSON in `output/.../feedback_data/`

### 6. Feedback-Dokument generieren

Aus dem Analyse-JSON wird automatisch ein DOCX-Feedback erstellt:
- Grün: Stärken
- Rot: Schwächen
- Blau: Verbesserungsvorschläge
- Vollständige Fehlerliste mit Korrekturen

Das fertige Dokument: `output/6i/SA_Thema_Genderneutrale_Mode/Eva_feedback.docx`

---

## Konfiguration

### API-Provider wählen

```toml
[api]
enabled = true
provider = "anthropic"  # oder: openai, deepseek, ollama
model = "claude-sonnet-4-6"  # oder: gpt-4.1-mini, etc.
```

### Rubrik zuweisen

Die App nutzt SRDP-konforme Rubriken. Zuordnung in `natascha_config.toml`:

```toml
[rubric_mapping]
"Deutsch+Oberstufe" = "srdp_deutsch_oberstufe.md"
"Deutsch+Unterstufe" = "deutsch_unterstufe.md"
"Englisch+Unterstufe" = "englisch_a2.md"
```

Rubrik-Dateien liegen im Ordner `rubrics/`.

---

## Bewertungssystem

### Deutsch Oberstufe (SRDP)
- 4 Kriterien: Inhalt, Textstruktur, Stil/Ausdruck, Sprachrichtigkeit
- Punkte 1-5 pro Kriterium
- Note 1-5 (App-Berechnung ist maßgeblich)

### Deutsch Unterstufe
- 4 Kriterien mit 5-stufiger Skala

### Englisch (A2/B1/B2)
- 4 Kriterien mit Punkteskala 0-40

**Wichtig:** Das LLM schlägt ebenfalls eine Note vor, aber die **App-Berechnung ist die tragende Note**.

---

## Ausgabe

```
output/
  6i/
    SA_Thema_Genderneutrale_Mode/
      feedback_data/
        Eva_analysis.json  # Analyse-Daten
        Max_analysis.json
      Eva_feedback.docx    # Fertiges Feedback
      Max_feedback.docx
```

---

## Fehlerbehandlung

**`fehlerlog.txt`** im Output-Ordner enthält Fehlerprotokolle.

**Häufige Probleme:**
- Fehlender API-Key → Fehlermeldung im TUI
- JSON-Validierung fehlgeschlagen → bis zu 3 automatische Retries
- Alte Analysen werden in `.history/` archiviert

---

## Hinweise

- Originaldateien im Input-Ordner werden **niemals verändert**
- Schülernamen werden nur als Vornamen aus dem Dateinamen extrahiert
- Die Analyse-Qualität hängt vom gewählten LLM-Modell ab
- Die Notenempfehlung ist immer als **Vorschlag** zu verstehen

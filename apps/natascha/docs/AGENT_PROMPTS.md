# Agent-Prompts: Natascha Korrektur-Agent – SRDP-Upgrade

> Erstellt: 2026-04-10
> Zweck: Drei aufeinanderfolgende Aufgaben fuer CLI-Coding-Agents (Claude Code, Codex, Qwen, GLM)
> Arbeitsverzeichnis: /home/milan/dev/Natascha3/

---

## Prompt 1: SRDP-konforme Rubrics fuer Deutsch (Oberstufe + Unterstufe)

**Empfohlener Agent:** Claude Code oder Qwen (braucht Recherche-Faehigkeit + strukturiertes Schreiben)

```
Du arbeitest im Verzeichnis /home/milan/dev/Natascha3/.

KONTEXT:
Dieses Projekt ist ein Korrektur-Agent fuer oesterreichische Gymnasium-Schularbeiten.
Lies zuerst diese Dateien, um den bestehenden Stand zu verstehen:
- MASTER_PROMPT.md (Gesamtlogik des Korrektur-Agents)
- rubrics/eroerterung.md (bestehendes Bewertungsraster als Referenz fuer Format und Stil)

AUFGABE:
Erstelle SRDP-konforme Bewertungsraster als Markdown-Dateien im Ordner rubrics/.
Die Raster muessen auf dem offiziellen SRDP-Beurteilungsraster des BMBWF basieren.

QUELLEN (offiziell):
- Beurteilungsraster SRDP Deutsch: https://www.matura.gv.at/downloads/download/Beurteilungsdokumente%20SRDP%20Unterrichtssprache
- Korrektur- und Beurteilungsanleitung: https://www.matura.gv.at/index.php?eID=dumpFile&t=f&f=6826&token=27eb707b451005bddd8d60d954be55067e81ae00
- Handreichung zum Beurteilungsraster: https://www.matura.gv.at/index.php?eID=dumpFile&t=f&f=4841&token=c757edec822756f93c143afc9f25741ddee32048
- Leitfaden Schularbeiten Deutsch AHS: https://www.bmb.gv.at/dam/jcr:c88a8215-c400-48a2-b5a2-626470aa0050/reifepr_ahs_msd_lf.pdf

SRDP DEUTSCH STRUKTUR (Oberstufe, ab 9. Schulstufe):
Die SRDP Deutsch verwendet 3 Kompetenzbereiche mit je 2 Dimensionen:
- K1: Inhalt (Aufgabenerfuellung aus inhaltlicher Sicht) + Textstruktur (Aufgabenerfuellung aus textstruktureller Sicht)
- K2: Inhalt + Textstruktur (fuer Text 2, identische Dimensionen)
- K3: Stil und Ausdruck + normative Sprachrichtigkeit (bewertet fuer beide Texte: K3/1 und K3/2)

5-stufige Skala:
1. nicht erfuellt
2. das Wesentliche ueberwiegend erfuellt
3. das Wesentliche zur Gaenze erfuellt
4. ueber das Wesentliche hinausgehend erfuellt
5. weit ueber das Wesentliche hinausgehend erfuellt

Fuer Schularbeiten (nicht Matura) wird dieser Raster vereinfacht angewendet:
- Oft nur 1 Text statt 2
- K1 und K3 reichen dann aus (Inhalt+Textstruktur und Stil+Sprachrichtigkeit)
- Die 5 Stufen bleiben gleich

ZU ERSTELLEN:
1. rubrics/srdp_deutsch_oberstufe.md
   - Vollstaendiges Raster mit allen Dimensionen und Deskriptoren
   - Mapping auf oesterreichische Noten (1-5)
   - Gewichtungsempfehlung fuer Schularbeiten (nicht Matura)
   - Textsorten-spezifische Hinweise fuer: Eroerterung, Kommentar, Textanalyse, Textinterpretation, Leserbrief, Zusammenfassung, Empfehlung, offener Brief, Meinungsrede

2. rubrics/srdp_deutsch_unterstufe.md
   - Vereinfachtes Raster fuer 5.-8. Schulstufe
   - Angepasste Deskriptoren (weniger komplex, altersgerecht)
   - Textsorten der Unterstufe: Erzaehlung, Beschreibung, Bericht, Brief, einfache Eroerterung

WICHTIG:
- Behalte das bestehende Format der rubrics/*.md Dateien bei (Markdown-Tabellen, klare Abschnitte)
- Die bestehenden Dateien (eroerterung.md, kommentar.md) NICHT veraendern oder loeschen
- Die neuen SRDP-Dateien sind eine Ergaenzung, kein Ersatz
- Alle Inhalte auf Deutsch
- Umlaute als ae/oe/ue (Konsistenz mit dem restlichen Projekt)
```

---

## Prompt 2: SRDP-konforme Rubrics fuer Englisch (B1/B2 + A2)

**Empfohlener Agent:** Claude Code oder GLM (braucht Verstaendnis von GERS/CEFR + strukturiertes Schreiben)

```
Du arbeitest im Verzeichnis /home/milan/dev/Natascha3/.

KONTEXT:
Dieses Projekt ist ein Korrektur-Agent fuer oesterreichische Gymnasium-Schularbeiten.
Lies zuerst diese Dateien:
- MASTER_PROMPT.md (Gesamtlogik)
- rubrics/eroerterung.md (bestehendes Format als Referenz)
- Falls vorhanden: rubrics/srdp_deutsch_oberstufe.md (wurde in Prompt 1 erstellt)

AUFGABE:
Erstelle SRDP-konforme Bewertungsraster fuer Englisch als Lebende Fremdsprache.
Basierend auf den offiziellen SRDP-Rastern des BMBWF und dem GERS (Gemeinsamer Europaeischer Referenzrahmen fuer Sprachen).

QUELLEN (offiziell):
- SRDP Lebende Fremdsprachen Uebersicht: https://www.matura.gv.at/srdp/lebende-fremdsprachen
- Bewertungsraster B1 mit Begleittext: https://www.matura.gv.at/fileadmin/user_upload/downloads/Begleitmaterial/LFS/srdp_lfs_Bewertungsraster_B1_Begleittext_2023.pdf
- Bewertungsraster B2: https://www.bifie.at/system/files/dl/srdp_lfs_bewertungsraster_b2_2013-05-06.pdf
- A2-Raster: https://www.bmb.gv.at/dam/jcr:ec4e3c97-8d45-4c05-a90d-8d9a764eed7e/reifepr_ahs_mslf_bwr.pdf

SRDP ENGLISCH STRUKTUR:
Die Raster fuer Lebende Fremdsprachen verwenden 4 gleichgewichtete Kriterien:
1. Task Achievement (Aufgabenerfuellung)
2. Organisation and Layout (Textaufbau)
3. Lexical Range and Accuracy (Wortschatz)
4. Grammatical Range and Accuracy (Grammatik)

Skala: 11 Stufen (0-10), wobei die geraden Stufen (0, 2, 4, 6, 8, 10) ausfuehrliche Deskriptoren haben.
Umrechnung in Noten ueber den Schularbeitenrechner des BMBWF.

ZIELGRUPPEN (Nataschas Klassen):
- 2a Englisch (6. Schulstufe) → A2-Niveau
- 7i/IB German A (11. Schulstufe) → B2-Niveau (Englisch als Arbeitssprache im IB)
- Allgemein Oberstufe Englisch → B1 (5./6. Klasse) und B2 (7./8. Klasse)

ZU ERSTELLEN:
1. rubrics/srdp_englisch_a2.md
   - 4 Kriterien mit Deskriptoren fuer A2
   - Vereinfachter Raster (Stufen 0-10 oder vereinfacht auf 0-5)
   - Textsorten A2: informal email, blog post, message, short story
   - Notenumrechnung

2. rubrics/srdp_englisch_b1.md
   - 4 Kriterien mit vollstaendigen Deskriptoren
   - Textsorten B1: email/letter, article, blog post, report
   - 11-stufige Skala mit Notenumrechnung

3. rubrics/srdp_englisch_b2.md
   - 4 Kriterien mit vollstaendigen Deskriptoren
   - Textsorten B2: article, report, essay, letter/email, review
   - 11-stufige Skala mit Notenumrechnung

WICHTIG:
- Kriterien und Deskriptoren auf Deutsch verfassen (Unterrichtssprache der Lehrkraft)
- Fachbegriffe (Task Achievement etc.) im Original belassen und in Klammern uebersetzen
- Bestehendes Format der rubrics/*.md beibehalten
- Umlaute als ae/oe/ue
```

---

## Prompt 3: generate_feedback.py generisch refactoren

**Empfohlener Agent:** Claude Code oder Codex (braucht Python-Staerke + Verstaendnis des bestehenden Codes)

```
Du arbeitest im Verzeichnis /home/milan/dev/Natascha3/.

KONTEXT:
Dieses Projekt ist ein Korrektur-Agent fuer oesterreichische Gymnasium-Schularbeiten.
Lies zuerst:
- MASTER_PROMPT.md (beschreibt den gewuenschten Workflow)
- generate_feedback.py (aktueller Code -- funktioniert, aber ist pro Schueler hardcodiert)
- rubrics/ (alle vorhandenen Rubrik-Dateien)

PROBLEM:
Der aktuelle Code hat fuer jeden Schueler eine eigene Funktion (build_feedback_tamara, build_feedback_matthias).
Das skaliert nicht. Der MASTER_PROMPT.md beschreibt bereits den richtigen generischen Workflow,
aber der Python-Code setzt ihn nicht um.

AUFGABE:
Refactore generate_feedback.py zu einem generischen Pipeline-Skript.

ANFORDERUNGEN:

1. DOCX-Eingabe automatisch erkennen:
   - Alle .docx Dateien aus /input/ lesen
   - python-docx zum Textextrahieren verwenden
   - Dateien mit weniger als 50 Woertern markieren, aber trotzdem verarbeiten

2. Rubrik-Auswahl:
   - Alle .md Dateien aus /rubrics/ beim Start einlesen
   - Eine Funktion detect_text_type(text) die anhand von Merkmalen die Textsorte erkennt
   - Mapping Textsorte → passende Rubrik (wie in MASTER_PROMPT.md definiert)
   - Fallback auf aufbau_referenz.md wenn unklar

3. Bewertungsstruktur als Datenmodell:
   - dataclass oder TypedDict fuer: Kategorie, Bewertungsstufe, Punkte, Staerken, Schwaechen, Vorschlaege
   - Notenberechnung als Funktion (gewichteter Durchschnitt → oesterr. Note)
   - Die Bewertung selbst wird NICHT automatisch generiert -- das macht der LLM-Agent
   - Das Skript stellt die Struktur bereit und erzeugt das DOCX aus einem JSON/Dict-Input

4. DOCX-Output:
   - Behalte das bestehende Formatting bei (add_heading, add_divider, add_section_header etc.)
   - Output nach /output/[originalname]_feedback.docx
   - Fehlerlog nach /output/fehlerlog.txt

5. CLI-Interface:
   - python generate_feedback.py              → alle Dateien in /input/ verarbeiten
   - python generate_feedback.py single datei.docx → eine Datei verarbeiten
   - python generate_feedback.py --rubric srdp_deutsch_oberstufe.md → Rubrik erzwingen
   - python generate_feedback.py --list-rubrics → verfuegbare Rubrics anzeigen

6. Integration mit LLM-Agent:
   - Eine Funktion generate_assessment_prompt(text, rubric_content, text_type) → str
     die einen vollstaendigen Prompt fuer einen LLM erzeugt
   - Der Prompt soll das LLM anweisen, ein JSON mit der Bewertungsstruktur zurueckzugeben
   - Eine Funktion parse_assessment_response(json_str) → Assessment-Dataclass
   - Eine Funktion build_feedback_docx(assessment, original_filename) → speichert DOCX

NICHT AENDERN:
- MASTER_PROMPT.md
- rubrics/*.md (nicht loeschen oder ueberschreiben)
- Bestehende DOCX-Formatting-Funktionen duerfen refactored werden, aber das visuelle Ergebnis muss gleich bleiben

TECH:
- Python 3.13 (installiert)
- python-docx (installiert)
- argparse fuer CLI
- dataclasses fuer Datenmodell
- json fuer LLM-Response-Parsing
- pathlib statt os.path
- Type hints ueberall
- Docstrings auf Deutsch
```

---

## Reihenfolge und Empfehlung

| Schritt | Prompt | Empfohlener Agent | Abhaengigkeit |
|---------|--------|-------------------|---------------|
| 1 | Deutsch-Rubrics | Claude Code oder Qwen | Keine |
| 2 | Englisch-Rubrics | Claude Code oder GLM | Keine (parallel zu 1 moeglich) |
| 3 | Python-Refactoring | Claude Code oder Codex | Nach 1+2 (braucht die Rubrics) |

Prompts 1 und 2 sind unabhaengig und koennen parallel laufen.
Prompt 3 sollte erst laufen, wenn mindestens die Deutsch-Rubrics existieren.

---

*Erstellt von Claude Opus via claude.ai, 2026-04-10*

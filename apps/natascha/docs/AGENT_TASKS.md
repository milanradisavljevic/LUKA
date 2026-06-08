# Agent-Aufgabenplan: Natascha Korrektur-Agent — SRDP-Upgrade

> Erstellt: 2026-04-10
> Zweck: Drei fokussierte Prompts fuer CLI-Agenten, die das Korrektur-Tool auf den offiziellen oesterreichischen SRDP-Standard bringen.
> Reihenfolge: Prompt 1 und 2 koennen parallel laufen. Prompt 3 haengt von deren Ergebnis ab.

---

## Prompt 1: Rubrics Deutsch — SRDP-konform (Oberstufe + Unterstufe)

**Empfohlener Agent:** Claude Code (`claude`)
**Arbeitsverzeichnis:** `/home/milan/dev/Natascha3/`

```
Du arbeitest im Projekt /home/milan/dev/Natascha3/ — einem Korrektur-Agenten fuer oesterreichische Gymnasien.

KONTEXT:
- Lies zuerst MASTER_PROMPT.md und die bestehenden Rubrics in /rubrics/ (eroerterung.md, kommentar.md, aufbau_referenz.md, rhetorische_figuren.md).
- Das aktuelle Bewertungsraster nutzt eine eigene 5-Punkte-Skala (1-5) mit vier gleichgewichteten Kategorien (Inhalt, Aufbau, Ausdruck, Sprachrichtigkeit).
- Dieses Raster ist NICHT konform mit dem offiziellen SRDP-Beurteilungsraster des BMBWF.

AUFGABE:
Erstelle neue, SRDP-konforme Rubric-Dateien. Behalte das bestehende MD-Format bei, aber passe die Struktur an den offiziellen Standard an.

1. OBERSTUFE DEUTSCH (Klassen 5-8, Schulstufen 9-12):
   Erstelle: rubrics/srdp_deutsch_oberstufe.md
   
   Der offizielle SRDP-Raster fuer Deutsch hat:
   - 3 Kompetenzbereiche: K1, K2, K3
   - 4 Dimensionen: Inhalt (Aufgabenerfuellung), Textstruktur (Gliederung/Kohaerenz/Kohaesion), Stil und Ausdruck, Normative Sprachrichtigkeit
   - 5 Kompetenzstufen: "nicht erfuellt", "das Wesentliche ueberwiegend erfuellt", "das Wesentliche zur Gaenze erfuellt", "ueber das Wesentliche hinausgehend erfuellt", "weit ueber das Wesentliche hinausgehend erfuellt"
   - K1 = Inhalt + Textstruktur (von Text 1)
   - K2 = Inhalt + Textstruktur (von Text 2)  
   - K3 = Stil/Ausdruck + Sprachrichtigkeit (Text 1 als K3/1, Text 2 als K3/2)
   - Fuer eine positive Gesamtbeurteilung muessen alle 3 Kompetenzbereiche positiv sein
   - Quelle: https://www.matura.gv.at/downloads/download/Beurteilungsdokumente%20SRDP%20Unterrichtssprache

   WICHTIG: Bei Schularbeiten (nicht Matura) gibt es typischerweise nur EINEN Text, nicht zwei. Passe den Raster so an, dass er fuer Schularbeiten mit einem Text funktioniert, aber erwaehne die Matura-Variante mit zwei Texten als Referenz.

   Textsorten die abgedeckt sein muessen (SRDP Deutsch):
   - Eroerterung (texgebunden, frei)
   - Kommentar
   - Leserbrief
   - Textanalyse
   - Textinterpretation
   - Zusammenfassung
   - Offener Brief
   - Empfehlung/Rezension
   - Meinungsrede

   Pro Textsorte: Beschreibe die spezifischen Anforderungen (was macht z.B. eine gute Eroerterung aus vs. einen guten Kommentar), aber verwende fuer die Bewertung IMMER die gleiche 4-Dimensionen x 5-Stufen-Matrix.

2. UNTERSTUFE DEUTSCH (Klassen 1-4, Schulstufen 5-8):
   Erstelle: rubrics/deutsch_unterstufe.md
   
   Fuer die Unterstufe gibt es keinen offiziellen SRDP-Raster (SRDP gilt nur fuer die Reifepr.). Erstelle einen vereinfachten Raster, der:
   - Die gleichen 4 Dimensionen nutzt (Inhalt, Textstruktur, Ausdruck, Sprachrichtigkeit)
   - Eine vereinfachte 5-Punkte-Skala verwendet, die auf das oesterreichische Notensystem (1-5) mappt
   - Altersgemaesse Erwartungen formuliert (z.B. einfacherer Satzbau erwartet, weniger rhetorische Figuren)
   - Textsorten der Unterstufe abdeckt: Erzaehlung, Beschreibung, Bericht, Zusammenfassung, einfacher Kommentar, Leserbrief

3. BESTEHENDE RUBRICS:
   - Loesche die alten Dateien NICHT
   - Verschiebe sie nach rubrics/legacy/ (erstelle den Ordner)
   - Die neuen Dateien sollen klar als SRDP-konform gekennzeichnet sein

4. MASTER_PROMPT.md ANPASSEN:
   - Aktualisiere den Abschnitt "Schritt 4: Passende Rubrik laden" so, dass er auf die neuen Rubric-Dateien verweist
   - Aktualisiere den Abschnitt "Schritt 6: Notenempfehlung berechnen" so, dass er die SRDP-Kompetenzstufen nutzt
   - Behalte die grundsaetzliche Struktur des Master-Prompts bei

Recherchiere bei Bedarf online unter matura.gv.at fuer Details zum offiziellen Raster.
Schreibe am Ende eine kurze CHANGELOG.md mit den durchgefuehrten Aenderungen.
```

---

## Prompt 2: Rubrics Englisch — SRDP/GERS-konform (B1, B2, A2)

**Empfohlener Agent:** Qwen (`qwen`) oder GLM (`glm`)
**Arbeitsverzeichnis:** `/home/milan/dev/Natascha3/`

```
Du arbeitest im Projekt /home/milan/dev/Natascha3/ — einem Korrektur-Agenten fuer oesterreichische Gymnasien.

KONTEXT:
- Lies MASTER_PROMPT.md fuer den aktuellen Workflow.
- Das Tool bewertet bisher NUR Deutsch-Schularbeiten. Englisch-Rubrics fehlen komplett.
- Ziel: Englisch-Bewertungsraster nach dem offiziellen SRDP-Standard fuer Lebende Fremdsprachen ergaenzen.

AUFGABE:
Erstelle Englisch-Rubric-Dateien im Verzeichnis /rubrics/:

1. rubrics/srdp_englisch_b2.md (Oberstufe, 7./8. Klasse AHS)
   
   Der offizielle SRDP-Raster fuer Lebende Fremdsprachen B2 hat:
   - 4 gleichgewichtete Kriterien: Task Achievement, Organisation & Layout, Lexical Range & Accuracy, Grammatical Range & Accuracy
   - 11 Stufen (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10), wobei die geraden Stufen (0, 2, 4, 6, 8, 10) ausfuehrliche Deskriptoren haben
   - Ungerade Stufen (1, 3, 5, 7, 9) liegen zwischen den beschriebenen Stufen
   - Vetokriterium: Bei "Verfehlung der Aufgabenstellung" (Task Achievement = 0) werden alle anderen Kriterien NICHT bewertet
   - Basiert auf dem GERS (Gemeinsamer Europaeischer Referenzrahmen fuer Sprachen)
   - Quelle: https://www.matura.gv.at/srdp/lebende-fremdsprachen

   Relevante Textsorten B2:
   - Article, Report, Essay, Email/Letter (formal), Review, Blog post, Proposal

2. rubrics/srdp_englisch_b1.md (Oberstufe, 5./6. Klasse AHS)
   
   Gleiche Struktur wie B2, aber mit B1-Deskriptoren:
   - Einfachere sprachliche Anforderungen
   - Kuerzere erwartete Texte
   - Weniger Varianz im Ausdruck erwartet
   
   Relevante Textsorten B1:
   - Email/Letter (formal and informal), Article, Blog post, Report, Story

3. rubrics/englisch_a2.md (Unterstufe, 1.-4. Klasse AHS)
   
   Der A2-Raster hat:
   - 4 Kriterien: Erfuellung der Aufgabenstellung, Aufbau und Layout, Wortschatz, Grammatik
   - 6 Stufen (0-5), multipliziert mit Faktor 2 fuer den Schularbeitenrechner
   - Vetokriterium: Bei Verfehlung der Aufgabenstellung = 0 in allen Kriterien
   - Quelle: https://www.bmb.gv.at (A2-Raster Bewertungskriterien)
   
   Relevante Textsorten A2:
   - Email/Letter (informal), Postcard, Short message, Simple description, Short story

FORMAT-ANFORDERUNGEN:
- Verwende Markdown mit klaren Tabellen
- Jede Datei soll enthalten: Uebersicht, Kriterien mit Deskriptoren pro Stufe, Textsorten-Anforderungen, Notenumrechnung (wie die Punkte auf oesterreichische Noten 1-5 mappen)
- Schreibe auf Deutsch (Kriterien-Namen auf Englisch beibehalten, Deskriptoren auf Deutsch)

Erstelle ausserdem eine kurze Datei rubrics/README_ENGLISH.md die erklaert:
- Welcher Raster fuer welche Schulstufe gilt
- Wie die Notenberechnung funktioniert
- Wie der Schularbeitenrechner-Faktor (Umrechnungsfaktor 2 bei A2) funktioniert
```

---

## Prompt 3: Refactoring generate_feedback.py (nach Prompt 1+2)

**Empfohlener Agent:** Codex (`codex`) oder Claude Code (`claude`)
**Arbeitsverzeichnis:** `/home/milan/dev/Natascha3/`
**Voraussetzung:** Prompt 1 und 2 muessen abgeschlossen sein.

```
Du arbeitest im Projekt /home/milan/dev/Natascha3/ — einem Korrektur-Agenten fuer oesterreichische Gymnasien.

KONTEXT:
- Lies MASTER_PROMPT.md fuer den vollstaendigen Workflow.
- Lies generate_feedback.py — das ist der aktuelle Code. Er funktioniert, ist aber pro Schueler HARDCODIERT (eine Python-Funktion pro Schueler). Das skaliert nicht.
- Im /rubrics/-Verzeichnis liegen jetzt SRDP-konforme Bewertungsraster als Markdown-Dateien.
- Im /input/-Verzeichnis liegen Schuelerarbeiten als .docx-Dateien.

AUFGABE:
Refactore generate_feedback.py zu einem generischen, skalierbaren Skript.

ANFORDERUNGEN:

1. GENERISCHE PIPELINE:
   - Lese alle .docx Dateien aus /input/ automatisch
   - Extrahiere den Text aus jeder DOCX (mit python-docx)
   - Die LLM-basierte Analyse (Textsortenkennung, Bewertung) passiert NICHT in diesem Skript — das Skript ist der DOCX-Output-Generator
   - Erwarte als Input pro Schueler eine JSON-Datei (z.B. /output/feedback_data/dateiname.json) mit der fertigen Analyse
   - Generiere daraus ein formatiertes DOCX-Feedback-Dokument

2. JSON-INPUT-FORMAT definieren:
   Erstelle eine Datei feedback_schema.json die das erwartete Format beschreibt:
   {
     "datei": "schueler_arbeit.docx",
     "schueler": "optional",
     "textsorte": "Eroerterung",
     "fach": "Deutsch",  // oder "Englisch"
     "schulstufe": "Oberstufe",  // oder "Unterstufe"
     "rubrik": "srdp_deutsch_oberstufe.md",
     "bewertung": {
       "inhalt": { "stufe": "das Wesentliche zur Gaenze erfuellt", "punkte": 3, "staerken": [...], "schwaechen": [...], "vorschlaege": [...] },
       "textstruktur": { ... },
       "ausdruck": { ... },
       "sprachrichtigkeit": { "stufe": ..., "fehler_detail": [...], "fehlerschwerpunkte": [...], ... }
     },
     "notenempfehlung": { "durchschnitt": 3.25, "note": 3, "bezeichnung": "Befriedigend", "begruendung": "..." }
   }

3. DOCX-OUTPUT:
   - Behalte das bestehende Formatierungssystem (add_heading, add_divider, add_section_header, add_label, add_bullet, add_body) — es ist gut
   - Mache es aber datengetrieben: eine Funktion build_feedback(data: dict) -> Document
   - Passe das Layout an Deutsch vs. Englisch an (z.B. Kriterien-Namen, Stufen-Bezeichnungen)
   - Speichere als /output/[originalname]_feedback.docx

4. BATCH-MODUS:
   - Verarbeite alle JSON-Dateien in /output/feedback_data/ 
   - Ueberspringe Dateien, fuer die schon ein _feedback.docx existiert (--force Flag zum Ueberschreiben)
   - Logge Fehler in /output/fehlerlog.txt

5. CLI-INTERFACE:
   - python generate_feedback.py                    # verarbeite alle
   - python generate_feedback.py --file name.json   # verarbeite eine
   - python generate_feedback.py --force             # ueberschreibe bestehende
   - python generate_feedback.py --dry-run           # zeige was verarbeitet wuerde

6. TESTS:
   - Erstelle tests/test_feedback.py mit pytest
   - Erstelle tests/fixtures/ mit 2-3 Beispiel-JSONs (basierend auf den Tamara- und Matthias-Daten aus dem alten Code)
   - Teste: JSON laden, DOCX erzeugen, DOCX oeffnen und pruefen ob Sektionen vorhanden sind

NICHT aendern:
- MASTER_PROMPT.md (wurde schon in Prompt 1 aktualisiert)
- Die Rubric-Dateien
- Die Original-Schuelerarbeiten in /input/

Dependencies: python-docx ist bereits installiert. Keine neuen Dependencies einfuehren.
Schreibe am Ende eine kurze CHANGELOG.md Ergaenzung.
```

---

## Ausfuehrungsreihenfolge

```
Phase 1 (parallel):
  Terminal A: cd /home/milan/dev/Natascha3 && claude   → Prompt 1 einfuegen
  Terminal B: cd /home/milan/dev/Natascha3 && qwen     → Prompt 2 einfuegen

Phase 2 (nach Phase 1):
  Terminal A: cd /home/milan/dev/Natascha3 && codex    → Prompt 3 einfuegen

Phase 3 (Validierung):
  - Rubrics pruefen: Stimmen die SRDP-Stufen?
  - Testlauf: python generate_feedback.py --dry-run
  - pytest tests/
```

---

## Offene Entscheidungen fuer Milan

1. **Welches Natascha-Verzeichnis?** Ich habe Natascha3 gewaehlt weil es die neueste Iteration ist. Falls du lieber ein frisches Verzeichnis willst (z.B. Natascha4 oder natascha-srdp), sag Bescheid.
2. **IB German A:** Natascha unterrichtet auch 7i/IB German A — das ist ein eigenes Bewertungssystem (IB Criterion A-D). Soll das als Prompt 4 dazukommen?
3. **LLM-Analyse-Prompt:** Die Prompts oben decken Rubrics und DOCX-Output ab. Der eigentliche LLM-Analyse-Schritt (Schuelertext → JSON-Bewertung) ist bewusst ausgeklammert, weil das der MASTER_PROMPT.md-Workflow ist. Soll dafuer ein separater Prompt kommen?

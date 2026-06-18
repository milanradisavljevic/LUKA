# Szenarien — LUKA

> Konkrete Benutzergeschichten mit erwartetem Ergebnis.
> Pro neues Feature mindestens Happy Path, Hybrid/Edge, Sprach-Flip, Punkte-Toggle und Reroll/Edit abhaken.

## Szenario 1 — Schularbeit aus Quelltext (Happy Path)

**Schritte:**
1. Step0: Typ „Schularbeit", Fach „Deutsch", Stufe „Oberstufe", Thema „Medienkonsum".
2. Step1: PDF-Quelltext hochladen.
3. Step2: Ein Lückentext (8 Punkte) + eine offene Schreibaufgabe (20 Punkte) hinzufügen.
4. Step3: Provider/Modell wählen.
5. Step4: „Inhalt generieren" → „Beide Dokumente exportieren".

**Erwartet:**
- Schülerfassung enthält Quelltext, Aufgaben und Schreiblinien.
- Lösung enthält Lösungen.
- Gesamtpunkte = 28.
- DOCX-Dateien sind gültig.

---

## Szenario 2 — Manuelle Kreuzworträtsel-Einträge (Hybrid)

**Schritte:**
1. Step2: Block „Kreuzworträtsel" hinzufügen.
2. Im Block-Editor auf „Selbst festlegen" umschalten.
3. 2 von 5 Einträgen manuell eingeben (Wort + Hinweis).
4. Step4: Generieren.

**Erwartet:**
- Die 2 manuellen Einträge erscheinen wortgleich im DOCX.
- Die restlichen 3 Einträge werden von der KI ergänzt.
- Kein Eintrag ist dupliziert.

---

## Szenario 3 — Sprach-Flip Deutsch → Englisch

**Schritte:**
1. Step0: Fach „Englisch", Stufe „Unterstufe", Thema „Past Simple".
2. Step2: Ein Multiple-Choice-Block hinzufügen.
3. Step4: Generieren + „Beide Dokumente exportieren".

**Erwartet:**
- Alle Renderer-Labels („Aufgabe", „Lösungen" → „Solutions") sind auf Englisch.
- Kein deutscher Standard-Text im DOCX.
- Prompt wurde auf Englisch generiert.

---

## Szenario 4 — Punkte ausblenden

**Schritte:**
1. Step0: Typ „Hausübung", Punkte-Schalter auf „Ohne Punkte".
2. Step2: Beliebige Blöcke hinzufügen.
3. Step4: Generieren + Export.

**Erwartet:**
- In Vorschau und DOCX sind keine Punktespalten sichtbar.
- Keine Gesamtpunktezahl erscheint.
- Korrekturraster-Export ist deaktiviert oder ohne Punktspalte.

---

## Szenario 5 — Preserve-Edits bei Reroll

**Schritte:**
1. Step4: Dokument generieren.
2. In der Vorschau eine Aufgabe manuell bearbeiten.
3. Auf „Neu generieren" für denselben Block klicken.
4. Im Dialog „Abbrechen" wählen.

**Erwartet:**
- Die manuelle Bearbeitung bleibt erhalten.
- Kein LLM-Call für diesen Block stattgefunden.

---

## Szenario 6 — 3 Niveaus

**Schritte:**
1. Step4: Dokument generieren.
2. „3 Niveaus erzeugen" klicken.

**Erwartet:**
- Drei DOCX-Dateien mit Suffixen `_leicht`, `_mittel`, `_schwer` werden heruntergeladen.
- Die Vorschau zeigt nach dem Export wieder die Mittel-Fassung.

---

## Szenario 7 — Selbstlern-Variante

**Schritte:**
1. Step4: Dokument generieren.
2. „Übung mit Lösungsteil" klicken.

**Erwartet:**
- Eine DOCX-Datei mit Suffix `_Uebung-mit-Loesung`.
- Dokument enthält Schülerfassung, Seitenumbruch und Lösungsteil.

---

## Szenario 8 — Vertrauens-Badge

**Schritte:**
1. Step4: Dokument mit MC- und Matching-Blöcken generieren.
2. „Lösungen prüfen" klicken.

**Erwartet:**
- Pro Risiko-Block erscheint ✓ oder ⚠ in der Vorschau.
- Nicht-Risiko-Blöcke haben kein Badge.
- Es wurde genau ein zusätzlicher LLM-Call ausgelöst.

---

## Szenario 9 — Quelltext-Check

**Schritte:**
1. Step1: Quelltext mit 50 Wörtern und kurzen Sätzen eingeben.
2. Step1: Quelltext mit 1.500 Wörtern und langen Sätzen eingeben.

**Erwartet:**
- Kurzer Text zeigt Hinweis „eher Unterstufe · sehr kurz".
- Langer Text zeigt Hinweis „eher Oberstufe · sehr lang".

---

## Szenario 10 — Kompetenz-Modus mit Coverage

**Schritte:**
1. Sidebar → „Kompetenz-Übung".
2. Englisch · Oberstufe · Stoff-Item aus Katalog wählen.
3. Step4: Generieren.

**Erwartet:**
- Coverage-Panel zeigt abgedeckte und fehlende Deskriptoren.
- „Kompetenznachweis exportieren" erzeugt lesbares DOCX.

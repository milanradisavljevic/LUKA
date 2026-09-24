# Invarianten — LUKA

> Feste Regeln, die in der App **immer** gelten müssen.
> Vor jedem Merge prüfen, ob bestehende Invarianten verletzt wurden; ggf. neue hinzufügen.

## Sprache

- [ ] `meta.fach === 'englisch'` → Prompt-Output, Renderer-Labels und alle DOCX-Texte sind auf Englisch.
- [ ] `meta.fach === 'deutsch'` → Prompt-Output, Renderer-Labels und alle DOCX-Texte sind auf Deutsch.

## Punkte

- [ ] `meta.punkteAusblenden === true` → In **Vorschau**, **beiden DOCX-Exporten** und **Korrekturraster** ist keine Punktespalte und keine Gesamtpunktezahl sichtbar.
- [ ] `meta.punkteAusblenden === false` → Summe der Block-Punkte entspricht der angezeigten Gesamtpunktezahl.

## Manuelle Eingaben in KI-Blöcken

- [ ] Manuell festgelegte Einträge (Wörter, Hinweise, Sätze, Fehler) werden niemals stillschweigend verworfen.
- [ ] Im Hybrid-Modus übernimmt die KI vorgegebene Einträge wortgleich und ergänzt nur Leere.

## Export

- [ ] „3 Niveaus erzeugen" erstellt genau drei Dateien mit den Suffixen `_leicht`, `_mittel`, `_schwer`.
- [ ] „Übung mit Lösungsteil" erstellt genau eine Datei mit Suffix `_Uebung-mit-Loesung`.
- [ ] Nach „3 Niveaus erzeugen" zeigt die Vorschau wieder die Mittel-Fassung.
- [ ] DOCX-Exporte sind gültige ZIP-Dateien (magic bytes `PK\x03\x04`).

## Vorschau

- [ ] Nach „Selbstkontrolle starten" erscheint pro Risiko-Block (`multipleChoice`, `matching`, `lueckentext`, `offeneVerstaendnisfrage`) entweder ✓ oder ⚠.
- [ ] Nicht-Risiko-Blöcke zeigen keinen Judge-Badge.
- [ ] Bearbeitete Blöcke lösen bei „Neu generieren" einen Bestätigungsdialog aus.

## Wizard / State

- [ ] Step0–Step4: Bei „zurück" gehen keine bereits eingegebenen Pflichtdaten verloren.
- [ ] `gesamtpunkte` in Meta == Summe aller `block.punkte`.

## Quelltexte

- [ ] Leere oder nur aus Whitespace bestehende Quelltexte werden nicht als gültige Quelltexte gezählt.
- [ ] Hochgeladene Dateien werden als Text extrahiert (kein Binärmüll im State).

## Korrektur & Feedback-DOCX

- [ ] Fehler mit `lehrkraft_aktion == 'verworfen'` erscheinen **nie** im Feedback-DOCX.
- [ ] Fehler mit `lehrkraft_aktion == 'geaendert'` nutzen den Text aus `lehrkraft_korrektur` statt dem KI-Vorschlag.
- [ ] Die Vertrauensstufe wird nach Schema-Validierung angehängt (`"hoch"|"mittel"|"niedrig"`), nie vorher — `feedback_schema.json` bleibt kompatibel.
- [ ] `fehler_historie`-Migration ist additiv (ALTER TABLE), bestehende Zeilen bleiben unverändert.
- [ ] Bei Rate-Limit (HTTP 429) wird automatisch mit Backoff wiederholt, nicht abgebrochen.

## Sachfach-Korrektur

- [ ] Sachfach-Korrekturen führen fachliche Kriterien in `sachfach_bewertung`;
  Sprachfehler bleiben im Top-Level-Feld `fehler` ergänzend.
- [ ] Wenn `sachfach_bewertung` vorhanden ist, basiert die App-Note ausschließlich
  auf diesen fachlichen Kriterien und nicht auf Sprachfehlern.
- [ ] Jede Korrektur-Revision bewahrt den verwendeten Erwartungshorizont als
  lokalen Inhalts-Schnappschuss mit stabiler Fassung-ID.

## Korrektur-Land/Skala (L2)

- [ ] Ohne `--land` (bzw. `land`-Parameter) ist der Analyse-Prompt **byte-identisch** zum Stand vor L2 — der AT-Pfad ist die Benchmark-Baseline und darf sich nie still ändern (Regressionstest `test_at_prompt_unchanged_default`).
- [ ] `land='de'` ändert ausschließlich Kopf/Terminologie im Prompt, die Notenberechnung (`berechne_note_de`, 1–6) und überspringt den SRDP-Detail-Zweitcall.
- [ ] Profil-Land **Schweiz** blockiert den Analysestart mit klarer Meldung — es wird nie eine fremde Skala still angewendet.
- [ ] `qualitaetswarnungen` (Konsistenz-Check, Note-Begründung) sind **advisory**: Sie ändern nie eine Note und sind von den pädagogischen `hinweise` des LLM getrennt.

## Closed Loop — Klassenkontext

- [ ] Folgeübungen übernehmen ein ausdrücklich gesetztes Klassen-Land vor dem Lehrkraft-Profilstandard.
- [ ] Bestehende Klassen ohne Land bleiben gültig und verwenden den Profilstandard.
- [ ] Änderungen am Land einer Klasse ändern keine bereits gespeicherten Korrektur- oder Übungsdaten.

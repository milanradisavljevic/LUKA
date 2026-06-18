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

- [ ] Nach „Lösungen prüfen" erscheint pro Risiko-Block (`multipleChoice`, `matching`, `lueckentext`, `offeneVerstaendnisfrage`) entweder ✓ oder ⚠.
- [ ] Nicht-Risiko-Blöcke zeigen keinen Judge-Badge.
- [ ] Bearbeitete Blöcke lösen bei „Neu generieren" einen Bestätigungsdialog aus.

## Wizard / State

- [ ] Step0–Step4: Bei „zurück" gehen keine bereits eingegebenen Pflichtdaten verloren.
- [ ] `gesamtpunkte` in Meta == Summe aller `block.punkte`.

## Quelltexte

- [ ] Leere oder nur aus Whitespace bestehende Quelltexte werden nicht als gültige Quelltexte gezählt.
- [ ] Hochgeladene Dateien werden als Text extrahiert (kein Binärmüll im State).

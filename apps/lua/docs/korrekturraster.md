# Spezifikation: Korrekturraster-Anbindung (Aufgabe 5.5)

Stand: 2026-05-31. Quelle der Wahrheit fuer Inhalt und Aufbau: der Skill
`korrekturraster-natascha`. Diese Datei uebersetzt ihn in eine Bauvorgabe.

## Grundsatz

- Das Korrekturraster ist ein eigenes drittes Dokument (Lehrerinstrument), kein
  Feld am Block. Dateiname: `JJJJ-MM-TT_fach_stufe_thema_Raster.docx`.
- Deterministisch im Code gebaut aus dem fertigen `DocumentV1`, danach editierbar.
- Keine automatische Bewertung. Die Spalte "Erreichte Punkte" bleibt leer.
- Kein Schema-Eingriff noetig. Eigener `Korrekturraster`-Typ, abgeleitet vom Dokument.

## Aufbau eines Rasters (Reihenfolge)

1. Kopf: Klasse, Name, Datum.
2. Aufgaben-Uebersicht (nur bei Mischformen): Nummer, Beschreibung, Maximalpunkte.
3. Kriterienkatalog je Block. Spalten: Kriterium, Beschreibung/Erwartung,
   Max. Punkte, Erreichte Punkte (leer), Anmerkung (leer).
4. Gesamtpunkte-Zeile (fett, mit oberem Rand).
5. Notenschluessel (AHS-Standard, aus Gesamtpunkten berechnet).
6. Freitextfeld "Allgemeine Anmerkungen" (vier Linien).

## Kriterienkatalog je Blocktyp

- Geschlossen (lueckentext, matching, multipleChoice): eine starre Zeile,
  volle Punkte bei richtig, Maximum = `block.punkte`.
- offeneVerstaendnisfrage: pro Frage aufgeteilt (Richtwert je Frage: 2 Punkte
  Aufgabenerfuellung, 1 Punkt Sprache), skaliert auf `block.punkte`.
- offeneSchreibaufgabe: voller Katalog nach `config.textsorte` und `meta.fach`.
  Vorlagen aus dem Skill: Eroerterung, Textanalyse, Zusammenfassung (Deutsch),
  Open Writing nach SRDP und Reading Comprehension (Englisch). Der vorhandene
  `erwartungshorizont` (inhalt, struktur, ausdruck, sprachrichtigkeit) fuellt die
  Beschreibungsspalte. Richtwerte auf `block.punkte` skalieren.

## Notenschluessel (AHS-Standard, Default)

| Note | Bezeichnung | Prozent |
|------|-------------|---------|
| 1 | Sehr gut | 87-100 |
| 2 | Gut | 73-86 |
| 3 | Befriedigend | 59-72 |
| 4 | Genuegend | 45-58 |
| 5 | Nicht genuegend | 0-44 |

Punktebereiche aus der Gesamtpunktezahl berechnen und eintragen.

## Hausstil

Rastertabelle 0,5 pt schwarz, Kopfzeile fett, keine Farbfuellung. Spaltenbreiten
laut Skill. Gesamtpunkte-Zeile fett. Freitextfeld mit duenner Unterkante.

## Umsetzung

Neuer Builder `buildKorrekturraster(document): Korrekturraster` plus Renderer
`renderKorrekturraster(raster)`. Owner: Claude Code (Renderer-Modul, docx-Skill).

# Testplan — Installations-/Update-Abnahme

**Version:** v1.3.4
**Stand:** 2026-09-16
**Voraussetzung:** Installer-Build von GitHub Actions (v1.3.4-Tag)
**Geschätzte Dauer:** 30–45 Minuten

---

## A. Vor dem Test

- [ ] Installer-Datei herunterladen (`LUKA_1.3.4_x64-setup.exe` / `.dmg`)
- [ ] Vorherige Installation deinstallieren (falls vorhanden)
- [ ] API-Schlüssel für mindestens einen Anbieter bereithalten

---

## B. Installation

### B1 — Windows (NSIS)
- [ ] Installer ausführen — kein Fehler
- [ ] Standard-Installationsordner akzeptieren
- [ ] App startet nach Installation automatisch oder per Desktop-Verknüpfung
- [ ] Kein Konsolenfenster erscheint
- [ ] Version in der App zeigt `1.3.4`

### B2 — macOS (DMG)
- [ ] DMG mounten — App in Applications ziehen
- [ ] App startet ohne Gatekeeper-Warnung (oder Warning bestätigen)
- [ ] Version in der App zeigt `1.3.4`

---

## C. Erster Start / Onboarding

- [ ] First-Run-Dialog erscheint
- [ ] API-Schlüssel kann eingegeben werden
- [ ] Verbindungstest funktioniert
- [ ] App wechselt zur Startseite

---

## D. Generierung (mit installiertem Build)

### D1 — Standard-Generierung
- [ ] Neue Unterlage erstellen
- [ ] Fach: Deutsch, Stufe: Oberstufe
- [ ] Thema eingeben (z.B. "Textanalyse")
- [ ] Quelltext einfügen
- [ ] KI-Modell wählen
- [ ] "Inhalt generieren" klicken
- [ ] Generierung läuft (Fortschritt sichtbar)
- [ ] Vorschau zeigt generierte Blöcke an

### D2 — Export
- [ ] Schülerfassung als DOCX exportieren
- [ ] Datei kann geöffnet werden
- [ ] Lösung als DOCX exportieren
- [ ] Datei kann geöffnet werden

---

## E. Differenzierung

- [ ] Nach Generierung: "Leichtere Variante" Checkbox sichtbar
- [ ] Label zeigt "Mehr Platz für Antworten, kürzere Wortbereiche"
- [ ] "Schwerere Variante" Checkbox sichtbar
- [ ] Beide Checkboxen können gleichzeitig gewählt werden
- [ ] "Variante(n) erstellen & exportieren" Button klickbar
- [ ] Leicht-Export wird ohne LLM erzeugt (schnell)
- [ ] Schwer-Export zeigt Fortschritt an
- [ ] Bei Fehlschlag: Warnung wird angezeigt (kein stiller Export)

---

## F. Korrektur (NATASCHA Sidecar)

### F1 — Sidecar-Verfügbarkeit
- [ ] In Einstellungen: NATASCHA-Sektion sichtbar
- [ ] Python-Befehl korrekt erkannt
- [ ] Sidecar-Status zeigt "verfügbar"

### F2 — Testdaten laden
- [ ] "Testdaten laden (Dev)" Button klicken (oder `seed_testdaten.py` ausführen)
- [ ] Klasse TEST-7a erscheint in der Klassenliste

### F3 — Analyse
- [ ] Korrektur-Bereich öffnen
- [ ] Klasse TEST-7a wählen
- [ ] Aufgabe wählen
- [ ] "Neue Analyse" klicken
- [ ] Datei auswählen (aus `apps/natascha/input/TEST-7a/`)
- [ ] Rubrik wählen (Deutsch Unterstufe)
- [ ] Analyse läuft
- [ ] Ergebnis wird angezeigt (Note, Kriterien, Fehler)

---

## G. Datenbank

### G1 — Backup
- [ ] Einstellungen > Datenbank öffnen
- [ ] "Datensicherung exportieren" klicken
- [ ] Speicher-Dialog erscheint
- [ ] Datei wird gespeichert

### G2 — Restore
- [ ] "Datensicherung wiederherstellen" klicken
- [ ] Datei-Dialog erscheint
- [ ] Bestätigungsdialog wird angezeigt
- [ ] Nach Bestätigung: App lädt Datenbank neu

---

## H. Undo/Redo

- [ ] Nach Generierung: Undo-Button (RotateCcw) im Footer sichtbar
- [ ] Undo-Button ist deaktiviert wenn keine History
- [ ] Nach Edit: Undo-Button wird aktiv
- [ ] Undo stellt vorherigen Zustand wieder her
- [ ] Redo stellt zurückgenommenen Zustand wieder her
- [ ] Strg+Z / Strg+Y funktionieren als Keyboard-Shortcut
- [ ] Nach Dokumentwechsel: History ist geleert

---

## I. Updates

- [ ] Wenn Update verfügbar: Hinweis erscheint
- [ ] Update-Download startet
- [ ] Installation wird gestartet
- [ ] App schließt sich automatisch (Windows)
- [ ] Nach Update: Version zeigt 1.3.5 (oder nächste)
- [ ] Daten und Einstellungen bleiben erhalten

---

## J. Spezifische v1.3.4-Features

### J1 — Seitenumbruch-Schätzung
- [ ] In der Vorschau: gestrichelte Trennlinien sichtbar
- [ ] Trennlinien erscheinen bei langen Dokumenten (mehr als eine Seite)

### J2 — Block-Diff
- [ ] Block "Neu generieren" klicken
- [ ] Nach Regenerierung: Side-by-Side-Vergleich erscheint
- [ ] Vorher (rot) / Nachher (grün) sichtbar
- [ ] "Schließen"-Button funktioniert

---

## K. Abschluss

- [ ] Alle Funktionen getestet
- [ ] Keine Abstürze aufgetreten
- [ ] Bei Problemen: Screenshots + Schritte notieren

---

## Feedback geben

Bei Problemen:
1. Screenshot machen
2. Schritte dokumentieren (was wurde geklickt, was ist passiert)
3. Fehlermeldung kopieren
4. GitHub Issue erstellen oder direkt melden

---

## Akzeptanzkriterien (Zusammenfassung)

| Kriterium | Erwartung |
|-----------|-----------|
| Installation | Saubere Installation ohne Fehler |
| Start | App startet ohne Konsolenfenster |
| Generierung | KI-generierte Inhalte werden erzeugt |
| Export | DOCX-Dateien sind geöffnet/lesbar |
| Korrektur | Sidecar analysiert Abgaben |
| Datenbank | Backup/Restore funktioniert |
| Undo/Redo | History wird korrekt verwaltet |
| Update | Daten bleiben erhalten |

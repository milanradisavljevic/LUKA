# Testplan — Installations-/Update-Abnahme

**Version:** v1.3.5
**Stand:** 2026-09-16
**Voraussetzung:** Installer-Build von GitHub Actions (v1.3.5-Tag)
**Geschätzte Dauer:** 45–60 Minuten

---

## A. Vor dem Test

- [ ] Installer-Datei herunterladen (`LUKA_1.3.5_x64-setup.exe` / `.dmg`)
- [ ] Vorherige Installation deinstallieren (falls vorhanden)
- [ ] API-Schlüssel für mindestens einen Anbieter bereithalten
- [ ] `seed_testdaten.py` ausführen (erzeugt Klasse TEST-7a mit 3 Schülern + 4 Arbeiten)

---

## B. Installation

### B1 — Windows (NSIS)
- [ ] Installer ausführen — kein Fehler
- [ ] Standard-Installationsordner akzeptieren
- [ ] App startet nach Installation automatisch oder per Desktop-Verknüpfung
- [ ] Kein Konsolenfenster erscheint
- [ ] Version in der App zeigt `1.3.5`

### B2 — macOS (DMG)
- [ ] DMG mounten — App in Applications ziehen
- [ ] App startet ohne Gatekeeper-Warnung (oder Warning bestätigen)
- [ ] Version in der App zeigt `1.3.5`

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

## F. Korrektur — 4-Schritte-Dialog (NEU in v1.3.5)

### F1 — Sidecar-Verfügbarkeit
- [ ] In Einstellungen: NATASCHA-Sektion sichtbar
- [ ] Python-Befehl korrekt erkannt
- [ ] Sidecar-Status zeigt "verfügbar"

### F2 — Testdaten laden
- [ ] `seed_testdaten.py` ausgeführt
- [ ] Klasse TEST-7a erscheint in der Klassenliste

### F3 — 4-Schritte-Dialog: Schritt 1 "Auftrag"
- [ ] "Neue Analyse" Button klicken
- [ ] Modal öffnet sich mit Step-Indicator "1. Auftrag"
- [ ] Klasse TEST-7a auswählen
- [ ] Aufgabe eingeben (z.B. "SA1")
- [ ] Optional: Unterrichtseinsatz auswählen
- [ ] "Weiter" Button ist nur aktiv wenn Klasse + Aufgabe ausgefüllt
- [ ] "Weiter" klicken → wechselt zu Schritt 2

### F4 — 4-Schritte-Dialog: Schritt 2 "Abgaben"
- [ ] Step-Indicator zeigt "2. Abgaben" fett
- [ ] Datei-Upload-Zone sichtbar (Drag & Drop + Picker)
- [ ] Datei auswählen (aus `apps/natascha/input/TEST-7a/`)
- [ ] Datei erscheint in der Liste mit Prüfungsstatus
- [ ] Schülerzuordnung: Automatisch oder manuell
- [ ] Datenschutz-Pseudonymisierung: Checkbox standardmäßig aktiv
- [ ] "Zurück" Button kehrt zu Schritt 1 zurück
- [ ] "Weiter" Button ist aktiv wenn mindestens 1 Datei vorhanden
- [ ] "Weiter" klicken → wechselt zu Schritt 3

### F5 — 4-Schritte-Dialog: Schritt 3 "Prüfgrundlage"
- [ ] Step-Indicator zeigt "3. Prüfgrundlage" fett
- [ ] Vorschau-Card "Bewertungsraster" zeigt gewähltes Raster an
- [ ] Vorschau-Card "Ausgangsmaterial" zeigt Dateiname oder Text-Ausschnitt
- [ ] Vorschau-Card "Klasse & Aufgabe" zeigt gewählte Werte
- [ ] Vorschau-Card "Abgaben" zeigt Anzahl Dateien
- [ ] Jede Card hat "Ändern"-Button der zum entsprechenden Schritt zurückführt
- [ ] Runtime-Information (Anbieter, Modell, Datenschutz) sichtbar
- [ ] "Weiter" klicken → wechselt zu Schritt 4

### F6 — 4-Schritte-Dialog: Schritt 4 "Prüfen & Start"
- [ ] Step-Indicator zeigt "4. Prüfen & Start" fett
- [ ] Liste aller Dateien mit Status-Icon (✅ bereit / ⚠️ Problem)
- [ ] Bei Problemen: konkrete Fehlermeldung (z.B. "Kein Schüler zugeordnet")
- [ ] Start-Button zeigt "KI-Vorschlag für N Abgaben erstellen"
- [ ] Analyse startet und läuft
- [ ] Nach Abschluss: Modal schließt sich, Klasse wird aktualisiert

### F7 — Navigation im Dialog
- [ ] "Zurück" Button funktioniert in Schritten 2–4
- [ ] Step-Indicator zeigt aktuellen Schritt korrekt an
- [ ] "Entwurf schließen" Button schließt Modal in jedem Schritt
- [ ] Daten bleiben beim Zurücknavigieren erhalten

---

## G. Datenbank

### G1 — Backup
- [ ] Einstellungen > Datenbank öffnen
- [ ] "Datensicherung exportieren" klicken
- [ ] Speicher-Dialog erscheint
- [ ] Datei wird gespeichert

### G2 — Restore (gepatcht in v1.3.5)
- [ ] "Datensicherung wiederherstellen" klicken
- [ ] Datei-Dialog erscheint
- [ ] Bestätigungsdialog wird angezeigt
- [ ] Nach Bestätigung: "Wiederherstellung abgeschlossen" Meldung
- [ ] App lädt automatisch neu (Reload)
- [ ] Daten aus der Sicherung sind sichtbar

### G3 — Restore-Persistenz nach Neustart (NEU)
- [ ] App schließen und neu starten
- [ ] Wiederhergestellte Daten sind noch vorhanden
- [ ] Aktive Datenbank-Pfad zeigt den wiederhergestellten Pfad

### G4 — Restore mit ungültiger Datei (NEU)
- [ ] "Datensicherung wiederherstellen" klicken
- [ ] Datei wählen die keine SQLite-Datenbank ist
- [ ] Fehlermeldung: "Die Datei ist keine gültige SQLite-Datenbank"
- [ ] Aktuelle DB bleibt unverändert

### G5 — Restore-Sicherungen prüfen (NEU)
- [ ] Nach Restore: Prüfen ob `lehr-suite.pre-restore-*-vacuum.db` existiert
- [ ] Nach Restore: Prüfen ob `lehr-suite.pre-restore-*-archive.db` existiert
- [ ] Beide Dateien haben unterschiedliche Zeitstempel

---

## H. Undo/Redo

- [ ] Nach Generierung: Undo-Button (RotateCcw) im Footer sichtbar
- [ ] Undo-Button ist deaktiviert wenn keine History
- [ ] Nach Edit: Undo-Button wird aktiv
- [ ] Undo stellt vorherigen Zustand wieder her (inkl. korrekte Wizard-Seite)
- [ ] Redo stellt zurückgenommenen Zustand wieder her
- [ ] Strg+Z / Strg+Y funktionieren als Keyboard-Shortcut
- [ ] Strg+Z wird NICHT abgefangen wenn Fokus in Textfeld liegt
- [ ] Nach Dokumentwechsel: History ist geleert

---

## I. Pool-Direkt-Export (NEU in v1.3.5)

- [ ] Aufgaben-Pool öffnen
- [ ] Mindestens ein Eintrag vorhanden
- [ ] "Exportieren" Button sichtbar neben "Einfügen"
- [ ] Klick auf "Exportieren": DOCX wird erzeugt und heruntergeladen
- [ ] Datei kann geöffnet werden

---

## J. Updates

- [ ] Wenn Update verfügbar: Hinweis erscheint
- [ ] Update-Download startet
- [ ] Installation wird gestartet
- [ ] App schließt sich automatisch (Windows)
- [ ] Nach Update: Version zeigt neue Version
- [ ] Daten und Einstellungen bleiben erhalten

---

## K. Spezifische v1.3.4-Features (bleiben erhalten)

### K1 — Seitenumbruch-Schätzung
- [ ] In der Vorschau: gestrichelte Trennlinien sichtbar
- [ ] Trennlinien erscheinen bei langen Dokumenten (mehr als eine Seite)

### K2 — Block-Diff
- [ ] Block "Neu generieren" klicken
- [ ] Nach Regenerierung: Side-by-Side-Vergleich erscheint
- [ ] Vorher (rot) / Nachher (grün) sichtbar
- [ ] "Schließen"-Button funktioniert

---

## L. Abschluss

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
| Korrektur | 4-Schritte-Dialog funktioniert, Sidecar analysiert Abgaben |
| Datenbank | Backup/Restore funktioniert, Persistenz nach Neustart |
| Restore-Sicherungen | Vacuum + Archive werden erzeugt, Fehlerbehandlung korrekt |
| Undo/Redo | History wird korrekt verwaltet, Step wird wiederhergestellt |
| Pool-Export | Direkter Export funktioniert |
| Update | Daten bleiben erhalten |

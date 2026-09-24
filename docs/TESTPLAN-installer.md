# Testplan — Installations-/Update-Abnahme

**Version:** v1.5.1 (Build-Kandidat)
**Stand:** 2026-09-24
**Voraussetzung:** Installer-Build des aktuellen v1.5.1-Kandidaten
**Geschätzte Dauer:** 45–60 Minuten

---

## A. Vor dem Test

- [x] **Korrektur-Release bauen:** Zuerst in `apps/natascha` den Sidecar aus dem
  aktuellen Quellstand erzeugen (`.\build_sidecar.ps1`), danach in `apps/lua`
  mit `pnpm tauri build --bundles nsis --config src-tauri/tauri.natascha-sidecar.conf.json`
  paketieren. Der einfache Befehl ohne `--config` ist nur ein Generator-Build
  und kein abnahmefaehiger Korrektur-Installer.
  *Erledigt 2026-09-24 19:16: Vite-Build grün (5,2 s), Rust-Release 39 s,
  NSIS-Setup erzeugt. Hinweis: der Prozess endet lokal mit Exit-1, weil
  `TAURI_SIGNING_PRIVATE_KEY` fehlt (Updater-Signaturen erzeugt nur CI) —
  das Setup ist trotzdem vollständig gebündelt.*
- [x] Zeitstempel des erzeugten `natascha-cli-x86_64-pc-windows-msvc.exe` ist
  neuer als die geaenderten NATASCHA-Quelltexte; kein vorhandenes, aelteres
  Sidecar wiederverwenden.
  *Sidecar 18:50, kein `apps/natascha/*.py` ist neuer.*
- [x] **Isoliert geprüft (ohne Installation):** Setup per 7-Zip nach
  `%TEMP%\luka-installer-smoke` entpackt. `natascha-cli.exe` im Paket:
  SHA-256 `8ce1aa50…69e1cebd` — identisch mit der frischen Dist-Datei;
  `analyze --help` startet (Exit 0) und zeigt `--einsatz-id` + `--material-id`.
  *Vollinstallation und Start der App bleiben davon getrennt offen (B–F).*
- [ ] Installer-Datei des aktuellen Kandidaten herunterladen (`.exe` / `.dmg`)
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
- [ ] Version in der App zeigt `1.5.1`

### B2 — macOS (DMG)
- [ ] DMG mounten — App in Applications ziehen
- [ ] App startet ohne Gatekeeper-Warnung (oder Warning bestätigen)
- [ ] Version in der App zeigt `1.5.1`

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

## F. Korrektur — 4-Schritte-Dialog

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

### G2 — Restore
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

## I. Pool-Direkt-Export

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

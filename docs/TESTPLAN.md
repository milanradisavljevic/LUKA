# Testplan — LUKA (Beta)

Danke fürs Testen! Dieser Plan führt strukturiert durch alle Funktionen. Hake ab,
was funktioniert, und notiere bei Problemen die Schritte (siehe **Feedback geben**).

- **Version / Stand:** Beta, aus dem Quellcode (`pnpm tauri:dev`)
- **Geschätzte Dauer:** ca. 45–60 Minuten für den vollen Durchlauf
- **Vor dem Start:** Abschnitt **Voraussetzungen** erledigen

---

## Voraussetzungen

- [ ] App startet (`apps/lua` → `pnpm install` → `pnpm tauri:dev`)
- [ ] Python-Sidecar eingerichtet (`apps/natascha` venv + `pip install -r requirements_cli.txt`)
- [ ] In *Einstellungen*: **API-Schlüssel** hinterlegt, **Python-Befehl** und **NATASCHA-Ordner** gesetzt
- [ ] Optional: Testdaten via `python seed_testdaten.py` (Klasse TEST-7a)
- [ ] Beispiel-Abgaben unter `samples/` vorhanden

> **Tipp für günstige Tests:** ein kleines/günstiges Modell wählen.

---

## Wie der Testplan funktioniert

Jedes Szenario hat **Schritte** und ein **erwartetes Ergebnis**. Stimmt das Ergebnis →
abhaken. Weicht es ab → unter **Feedback geben** notieren (mit Screenshot).

Legende: ✅ ok · ⚠️ kleiner Mangel · ❌ Fehler/Absturz

---

## 1 · Onboarding & erster Eindruck
- [ ] **1.1** App öffnen → Sidebar zeigt alle Bereiche (Übersicht, Klassen, Korrektur, Schüler, Erwartungshorizont, Vorlagen, Verlauf, Einstellungen, Hilfe).
- [ ] **1.2** *Hilfe* öffnen → Handbuch mit Inhaltsverzeichnis; Klick auf einen Punkt scrollt zur Sektion; verständlich?
- [ ] **1.3** *Einstellungen* → API-Schlüssel speichern; nach Neustart noch vorhanden.
  *Erwartet:* Schlüssel bleibt erhalten, kein Klartext sichtbar.

## 2 · Unterlagen erstellen (Generator)
- [ ] **2.1** *Neue erstellen* → Schritt **Absicht**: Stufe/Fach/Thema/Art festlegen.
- [ ] **2.2** **Quelltexte**: einen Text per Direkteingabe **oder** Datei/URL hinzufügen.
- [ ] **2.3** **Aufgabenblöcke**: 2–3 Aufgabentypen hinzufügen; einen Blocktyp per **X** wieder entfernen.
- [ ] **2.4** **KI-Modell** wählen, **Generieren**.
  *Erwartet:* Inhalte erscheinen; Export als DOCX (Schülerfassung/Lösung) möglich; Eintrag im **Verlauf**.
- [ ] **2.5** Erzeugtes DOCX öffnen und grob prüfen (Formatierung, Lösungen).

## 3 · Korrektur — einzeln
- [ ] **3.1** *Korrektur* → Klasse/Aufgabe wählen (oder via Analyse neu anlegen).
- [ ] **3.2** **Neue Analyse** → eine Datei aus `samples/` hochladen → analysieren.
  *Erwartet:* Note, Kriterien, Fehlerliste (R/G/Z/A) erscheinen.
- [ ] **3.3** Rechts die **A4-Vorschau**: markierter Schülertext, Farben passen zu den Fehlern.
- [ ] **3.4** **Lehrernote** + Kommentar speichern.
  *Erwartet:* gespeichert; nach Neustart noch da.
- [ ] **3.5** **Feedback-DOCX** erzeugen → Datei wird erstellt.
- [ ] **3.6** Klick auf den **Schülernamen** → springt in die Schüler-Ansicht.

## 4 · Korrektur — Batch (ganze Klasse)
- [ ] **4.1** **Neue Analyse** → **Mehrere wählen …** → mehrere `samples/`-Dateien.
- [ ] **4.2** **Stapel analysieren** → Fortschrittsbalken läuft, Ergebnisliste je Datei.
- [ ] **4.3** **Abbrechen** testen → stoppt nach der laufenden Datei.
- [ ] **4.4** Denselben Stapel erneut → Duplikate werden übersprungen (kein Absturz).

## 5 · Klassen-Auswertung
- [ ] **5.1** *Meine Klassen* → Klasse wählen → **Heatmap**, **Notenverteilung**, **Trend**, **Kalibrierung** sichtbar.
- [ ] **5.2** **KI-Klassen-Briefing** generieren → Text erscheint.
- [ ] **5.3** **Noten-CSV** exportieren → Datei plausibel.

## 6 · Schüler-Längsschnitt
- [ ] **6.1** *Schüler* → Klasse/Schüler wählen → Notenverlauf, Fehlerschwerpunkte.
- [ ] **6.2** **KI-Schüler-Profil** generieren → Text erscheint.
- [ ] **6.3** **CSV-Import**: kleine CSV (Vorname,Nachname) importieren → Schüler erscheinen.

## 7 · Erwartungshorizont & Rubrik-Editor
- [ ] **7.1** *Erwartungshorizont* → Klasse/Aufgabe → **Generieren** → bearbeiten → **Akzeptieren & speichern**.
- [ ] **7.2** **Rubrik-Editor**: Rubrik laden, kleine Änderung, **speichern**.
  *Erwartet:* keine Fehlermeldung; Änderung wirkt bei der nächsten Korrektur.

## 8 · Closed Loop (das Kernfeature)
- [ ] **8.1** In *Klassen* → **„Übungsblatt zu Top-Fehlern generieren"** → landet im Generator mit vorbefülltem Fokus.
- [ ] **8.2** In *Schüler* → **„Übungsblatt zu Schwächen"** → Generator mit den Schwächen dieses Schülers.
- [ ] **8.3** Jeweils generieren → DOCX passt thematisch zu den Fehlern.

## 9 · Übersicht (Dashboard)
- [ ] **9.1** *Übersicht* → Kennzahlen (Klassen, Abgaben, Handlungsbedarf) plausibel.
- [ ] **9.2** Klick auf eine Klassen-Karte → Klassen-Ansicht.

## 10 · Retro-Import
- [ ] **10.1** Falls vorhandene Analyse-JSONs existieren: in *Korrektur* **Retro-Import** → Meldung „X importiert, Y übersprungen".

## 11 · Persistenz & Robustheit
- [ ] **11.1** App schließen und neu starten → alle Daten (Korrekturen, Noten, Schüler) noch da.
- [ ] **11.2** Analyse **ohne** API-Schlüssel → klare Fehlermeldung (kein Absturz).
- [ ] **11.3** Falsche/leere Datei hochladen → verständliche Fehlermeldung.

---

## Feedback geben

Bitte pro Problem notieren:

1. **Bereich/Schritt** (z. B. „4.2 Batch")
2. **Schweregrad** (❌ Absturz / ⚠️ Mangel / 💡 Wunsch)
3. **Was ist passiert** vs. **was erwartet**
4. **Schritte zum Nachstellen**
5. **Screenshot** (gern mit sichtbarer Fehlermeldung/Toast)

Kanal: *(hier euren Weg eintragen — z. B. GitHub-Issues im LUKA-Repo, E-Mail oder ein gemeinsames Dokument.)*

---

## Vorab bekannte Einschränkungen (bitte **nicht** doppelt melden)

- Erzeugte DOCX öffnen sich in der Entwicklungs-/WSL-Umgebung evtl. nicht automatisch → Datei manuell im Ausgabeordner öffnen.
- Sehr günstige Modelle liefern selten unvollständige Antworten (abgeschnittenes JSON) → Analyse erneut starten oder besseres Modell wählen.
- Windows-Installer/Bündelung folgt erst nach der Testphase (aktuell Start aus dem Quellcode).

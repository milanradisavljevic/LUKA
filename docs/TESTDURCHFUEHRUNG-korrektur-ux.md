# Durchführungsanleitung: Korrektur-UX Test

**Version:** v1.3.5
**Ziel:** Zwei realistische Korrektur-Fälle (Deutsch + Englisch) mit dem 4-Schritte-Dialog durchführen und strukturiertes Feedback einholen.

---

## Voraussetzungen

- [ ] Installer `LUKA_1.3.5_x64-setup.exe` installiert
- [ ] API-Schlüssel für mindestens einen Anbieter eingegeben
- [ ] `seed_testdaten.py` ausgeführt (Klasse TEST-7a vorhanden)
- [ ] Die Testperson kennt die App grundlegend (Erstellen von Unterlagen)

---

## Testdaten

### Fall 1: Deutsch

| Eigenschaft | Wert |
|-------------|------|
| **Klasse** | TEST-7a |
| **Aufgabe** | SA1 (Schularbeit 1) |
| **Dateien** | `apps/natascha/input/TEST-7a/Testschueler_Mona.docx`, `Testschueler_Max.docx`, `Testschueler_Mia.docx` |
| **Fach** | Deutsch |
| **Schulstufe** | Unterstufe (7. Klasse) |
| **Erwartung** | 3 Abgaben, KI-Vorschläge mit Noten und Fehlern |

### Fall 2: Englisch

| Eigenschaft | Wert |
|-------------|------|
| **Klasse** | TEST-7a |
| **Aufgabe** | Essay1 (English Essay) |
| **Datei** | `apps/natascha/input/TEST-7a/Emma_Schmidt_English.docx` |
| **Fach** | Englisch |
| **Schulstufe** | Unterstufe (7. Klasse) |
| **Erwartung** | 1 Abgabe, KI-Vorschlag mit Note und Fehlern |

**Wichtig:** Diese Datei ist ein eigenständiger englischer Text (Essay über Climate Change), kein deutscher Dummy-Text. Die Datei ist unabhängig vom Deutschfall und ermöglicht einen echten fachlichen Test.

---

## Durchführung

### Schritt 1: Vorbereitung (5 Minuten)

1. App starten
2. Prüfen ob Klasse TEST-7a sichtbar ist (Korrekturbereich)
3. `docs/TESTFEEDBACK-korrektur-ux.md` ausdrücken oder digital bereithalten

### Schritt 2: Fall 1 — Deutsch (15–20 Minuten)

Die Testperson arbeitet den folgenden Ablauf selbstständig durch. **Nicht einwissen!**

1. **Korrekturbereich öffnen**
2. **"Neue Analyse" klicken**
3. **Schritt 1 (Auftrag):**
   - Klasse: TEST-7a wählen
   - Aufgabe: "SA1" eingeben
   - "Weiter" klicken
4. **Schritt 2 (Abgaben):**
   - Dateien auswählen: `Testschueler_Mona.docx`, `Testschueler_Max.docx`, `Testschueler_Mia.docx`
   - Schülerzuordnung prüfen
   - Datenschutz-Pseudonymisierung: aktiv lassen
   - "Weiter" klicken
5. **Schritt 3 (Prüfgrundlage):**
   - Vorschau-Cards prüfen
   - "Weiter" klicken
6. **Schritt 4 (Prüfen & Start):**
   - Status pro Datei prüfen
   - "KI-Vorschlag für 3 Abgaben erstellen" klicken
7. **Warten** bis Analyse fertig ist
8. **Ergebnis prüfen:** Note, Kriterien, Fehler ansehen

**Während der Durchführung beobachten:**
- Wo zögert die Testperson?
- Wo klickt sie falsch oder geht zurück?
- Wo fragt sie nach Hilfe?
- Wie lange dauert jeder Schritt?

**Danach:** Feedback-Template ausfüllen.

### Schritt 3: Fall 2 — Englisch (10–15 Minuten)

Gleicher Ablauf, nur mit einer Datei:

1. **"Neue Analyse" klicken**
2. **Schritt 1:** Klasse TEST-7a, Aufgabe "Essay1"
3. **Schritt 2:** Nur `Emma_Schmidt_English.docx` wählen
4. **Schritt 3:** Weiter
5. **Schritt 4:** "KI-Vorschlag erstellen"
6. **Ergebnis prüfen**

**Danach:** Feedback-Template ausfüllen.

### Schritt 4: Zusammenfassung (5 Minuten)

1. Gesamtbewertung (1–5) für Verständlichkeit, Zeitaufwand, fachliche Qualität
2. Top-3 Verbesserungswünsche
3. Entscheidung: UX, Inhalt, Beides, oder Alles okay

---

## Beobachtungsliste

Während der Testdurchführung auf Folgendes achten:

| Was | Warum |
|-----|-------|
| **Verweildauer je Schritt** | Verständnis des Dialogs |
| **Rücknavigation** | Verwirrung oder Korrekturbedarf |
| **Fragen an Testleiter** | Unklare Labels oder Prozesse |
| **Fehlbedienung** | UX-Probleme (falsche Buttons, falsche Reihenfolge) |
| **Zeit bis zum Start** | Gesamte Anlaufzeit für einen Korrekturauftrag |
| **Reaktion auf Ergebnis** | Vertrauen in die KI-Vorschläge |

---

## Auswertung

Nach den beiden Fällen:

1. **Feedback-Template auswerten** (siehe `TESTFEEDBACK-korrektur-ux.md`)
2. **Entscheidung treffen:**
   - UX vor Inhalt → Dialog vereinfachen
   - Fachliche Qualität → Rubriken/Noten/Feedback verbessern
   - Beides → Parallele Arbeit
   - Alles okay → v1.4.0 vorbereiten
3. **Ergebnis dokumentieren** in `STATUS-offene-themen-2026-09.md`

---

## Zeitplan

| Phase | Dauer |
|-------|-------|
| Vorbereitung | 5 Min |
| Fall 1 (Deutsch) | 15–20 Min |
| Fall 2 (Englisch) | 10–15 Min |
| Zusammenfassung | 5 Min |
| **Gesamt** | **35–45 Min** |

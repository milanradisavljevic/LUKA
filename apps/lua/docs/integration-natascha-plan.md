# Bewertung Qwen-Plan + Alternativplan für NATASCHA-Integration

> Status: Plan-Modus. Ziel: Qwens Vorschlag bewerten und einen
> umsetzbaren, risikoarmen Plan für die Verschmelzung entwickeln.

---

## Was Qwen richtig gemacht hat

Die drei Feature-Ideen treffen den Kern:

1. **Adaptive Übungen aus Korrekturdaten** — Hoher Lehrer-Mehrwert, gut
   erklärbar.
2. **Prüfungs-Generator mit Kompetenz-Vorhersage** — Starke Vision,
   aber abhängig von sehr sauberen historischen Daten.
3. **Feedback-to-Task Pipeline** — Pädagogisch der stärkste Hebel, weil
   Feedback sonst verpufft.

Die Vision "Closed-Loop-Lernsystem" ist richtig und verkaufsfähig.

---

## Was am Qwen-Plan problematisch ist

### 1. Architektur-Vorschlag "Microservices" ist Overkill

NATASCHA und das Lehrunterlagen-Tool (LUA) sind **Desktop-Tools für
Einzel-Lehrer**. Microservices (API-Gateway, separate Services, shared
schemas) bedeuten:
- Deployment-Komplexität
- Netzwerk-Overhead
- DevOps-Aufwand
- Kein Offline-Betrieb mehr (oder zumindest fragilem)

Für ein Lehrer-Tool auf einem einzelnen Laptop ist das der falsche
Maßstab.

### 2. Keine technische Realitätsprüfung

- NATASCHA ist **Python + Textual TUI** (~12.000 Zeilen).
- LUA ist **TypeScript + React + Vite + Tauri** (~15.000 Zeilen).
- Eine "Monolithische Mega-App" mit Python-TUI in Tauri einbetten ist
  praktisch unmöglich (Textual läuft im Terminal, nicht im Browser).
- Ein Rewrite von NATASCHA in TypeScript wäre 6+ Monate Arbeit.

### 3. Fehlende Phasierung

Qwen springt von "Feature-Idee" direkt zu "Microservices". Es fehlt der
**zwischen Schritt**: Wie kommen wir von zwei separaten Tools zu einem
gemeinsamen Erlebnis, ohne einen der beiden Codes zu zerstören?

### 4. Kein MVP-Gedanke

Die vorgeschlagenen Zeiten (3–10 Wochen pro Feature) sind realistisch
für eine integrierte Lösung, aber es gibt **keinen schnellen
Proof-of-Concept**, mit dem man testen kann, ob Lehrer das überhaupt
wollen.

---

## Mein Gegen-Vorschlag: Inkrementelle Integration

Statt einer großen Architektur: drei Phasen, jede mit lieferbarem
Mehrwert.

```
Phase 1: Datei-Brücke (2–3 Wochen)
   NATASCHA exportiert JSON → LUA generiert Übungen
   = Schneller Win, kein Code-Risiko

Phase 2: Gemeinsame Datenbank (4–6 Wochen)
   Beide Apps lesen/schreiben dieselbe SQLite
   = Echte Synergien, aber beide UIs bleiben erhalten

Phase 3: Unified Tauri-Frontend (8–12 Wochen)
   Ein UI, zwei Backend-Engines (TS + Python)
   = Die "Mega-App"
```

Jede Phase kann allein deployed und getestet werden.

---

## Phase 1: Datei-Brücke (MVP)

### Ziel
Nach einer Korrektur in NATASCHA kann der Lehrer mit einem Klick
"Übungsblatt generieren" — LUA öffnet sich (oder wird im Browser
geöffnet) mit vorausgefüllten Fehler-Themen.

### Technisch
1. NATASCHA erweitern: Export-Funktion `natascha_export_profile()`
   schreibt pro Klasse/Aufgabe eine JSON-Datei:
   ```json
   {
     "klasse": "7A",
     "aufgabe": "Kommentar_Elektromuell",
     "datum": "2026-05-26",
     "fehler_heatmap": {
       "grammatik": {"konjunktiv_ii": 14, "komma": 11},
       "stil": {"wortwiederholungen": 9}
     },
     "top_fehler": [
       {"kategorie": "grammatik", "typ": "konjunktiv_ii", "anzahl": 14},
       {"kategorie": "stil", "typ": "wortwiederholungen", "anzahl": 9}
     ],
     "schueler_schwaechen": [
       {"name": "M. M.", "fehler": ["konjunktiv_ii", "komma"]}
     ]
   }
   ```

2. LUA erweitern: Import-Dialog im Step0 (neben "Weitermachen" und
   "Aus Vorlage"): "Aus NATASCHA-Korrektur generieren".

3. Die Fehler-Typen werden in `meta.notizen` und/oder ein neues Feld
   `meta.fokusThemen` geschrieben. Der Prompt in `packages/llm` wird
   erweitert: "Generiere Übungen zu diesen Fehler-Typen".

### Liefergegenstand
- Ein DOCX mit 5–10 Übungen zu den Top-3-Fehlern der Klasse
- Keine gemeinsame Codebase nötig
- Kein Rewrite

---

## Phase 2: Gemeinsame SQLite-Datenbank

### Ziel
Beide Apps nutzen dieselbe Datenbank für Schüler, Klassen, Aufgaben,
Abgaben und Bewertungen.

### Technisch
- Neues Package `packages/db` (TypeScript + better-sqlite3 in Tauri,
  oder Python-Seite mit sqlite3).
- Schema:
  - `classes`, `students`, `assignments`
  - `submissions` (Schülerabgaben + Feedback)
  - `assessments` (Bewertungen, Noten)
  - `error_tags` (Fehler-Kategorien, aus NATASCHAs Heatmap)
  - `generated_materials` (von LUA erzeugte Übungen)

- NATASCHA ändert `natascha_db.py`, um in dieselbe DB zu schreiben.
- LUA zeigt Korrektur-History und Fehler-Heatmap im UI an.

### Liefergegenstand
- In LUA: Ansicht "Meine Klassen" mit Schülerliste, Fehler-Heatmap,
  Notenverlauf
- In NATASCHA: Weiterschreiben in dieselbe DB (Migrationsskript)

---

## Phase 3: Unified Tauri-Frontend

### Ziel
Eine einzige Desktop-App mit zwei Hauptmodulen:
- **Modul A: Unterrichtsmaterialien** (heutiges LUA)
- **Modul B: Korrektur** (heutiges NATASCHA)

### Technisch
- Tauri als Container (wie heute schon bei LUA).
- Frontend in React/TypeScript.
- Backend:
  - TypeScript-Services für Generierung, Rendering, DB
  - Python-Prozess für NATASCHA-Korrektur (Tauri ruft Python via
    `Command::new("python")` auf)
- Navigation zwischen den Modulen über Sidebar.

### Vorteil gegenüber Microservices
- Kein Netzwerk-Stack nötig
- Offline-fähig
- Einfacheres Debugging
- Wiederverwendung von LUAs Tauri-Infrastruktur

### Liefergegenstand
- Eine App, in der der Lehrer:
  1. Aufgaben generiert
  2. Schülerabgaben korrigieren lässt
  3. Automatisch Übungen generiert
  4. Alles in einer Historie sieht

---

## Weitere Ideen für LUA allein

Die Verschmelzung ist nicht der einzige Hebel. Was kann man aus LUA
noch herausholen, ohne NATASCHA?

### Kurzfristig (1–4 Wochen)

1. **Aufgaben-Bibliothek mit Tags**
   - Generierte Dokumente werden nicht nur gespeichert, sondern
     getaggt (Fach, Thema, Textsorte, Schwierigkeit).
   - Suche: "Alle Kommentar-Aufgaben zur Oberstufe".

2. **Varianten-Generator**
   - Aus einer Aufgabe automatisch 3 Varianten generieren (A/B/C
     oder leicht/mittel/schwer).
   - Nutzt das Design aus Didaktik-Runde 1 (Bloom-Gating) und Runde
     2 (kostensmarte Differenzierung).

3. **Export in LMS**
   - Moodle-XML, MS Teams-Assignment, Google Classroom.
   - Nicht trivial, aber klar definierte APIs.

### Mittelfristig (1–3 Monate)

4. **Schüler-Portal (lokal)**
   - Tauri-App öffnet einen lokalen Server, Schüler können Aufgaben
     auf dem Handy/Tablet einsehen.
   - Mit QR-Code auf dem ausgedruckten Arbeitsblatt.

5. **Audio-Ausgabe für Inklusion**
   - TTS für Aufgabenstellungen (Web Speech API oder lokal).
   - Für Schüler mit Lese-Rechtschreib-Schwäche.

6. **Batch-Generierung von Klassenarbeiten**
   - Lehrer lädt eine CSV mit Themen hoch → App generiert 20
     verschiedene Schularbeiten.
   - Praktisch für Nachschreib-Prüfungen.

### Langfristig (3–6 Monate)

7. **Lehrplan-Abdeckungs-Tracker**
   - Lehrer ordnet jede Aufgabe Kompetenzen zu (z. B. SRDP).
   - App zeigt an: "Kompetenz X wurde in diesem Semester 3x geprüft,
     Y noch gar nicht."

8. **KI-Lehrassistent (über die ganze App)**
   - Chat-Interface für didaktische Fragen: "Wie erkläre ich
     Konjunktiv II?" → App generiert Erklärung + 3 Übungen.

---

## Empfohlene nächste Schritte

1. **Sofort**: Phase 1 planen — konkrete JSON-Schnittstelle zwischen
   NATASCHA und LUA definieren.
2. **In 1 Woche**: Prototyp "Export aus NATASCHA" + "Import in LUA"
   bauen (nur Datei-Exchange, keine gemeinsame UI).
3. **Testen**: Mit einer echten Korrektur von NATASCHA durchspielen,
   ob die generierten Übungen didaktisch sinnvoll sind.
4. **Entscheiden**: Wenn Phase 1 funktioniert → Phase 2 (gemeinsame
   DB) oder direkt Phase 3 (Unified Frontend) planen.

---

## Fazit

Qwens Plan ist **visionär richtig**, aber **architektonisch zu groß**.
Die eigentliche Innovation ist nicht die Microservice-Architektur,
sondern der **Closed-Loop zwischen Erstellen, Korrigieren und
Üben**. Der risikoärmste Weg dorthin ist eine **Datei-Brücke** als
erster Schritt, dann gemeinsame Datenbank, dann optionales Unified
Frontend.

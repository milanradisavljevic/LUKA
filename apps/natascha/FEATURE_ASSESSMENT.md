# FEATURE ASSESSMENT — NATASCHA

**Datum:** 2026-05-29 | **Version:** 0.7.3
**Zweck:** Bewertung dreier Feature-Ideen (Skala 1 = unnötig … 5 = hoher Mehrwert), **ohne
Umsetzung**. Bewertung berücksichtigt den **aktuellen Codestand** — insbesondere die bereits
vorhandene SQLite-Persistenz (`natascha_db.py`) und den bereits existierenden
`RubrikEditorScreen`.

| # | Feature | Bewertung |
|---|---------|:---------:|
| 1 | Klassenübersicht / Dashboard (longitudinal) | **5 / 5** |
| 2 | Vergleichsansicht (Modell A vs. B) | **2 / 5** |
| 3 | Rubrik-Editor als TUI-Formular | **2 / 5** |

---

## 1. Klassenübersicht / Dashboard — ⭐ 5/5

**Idee:** Übersichtsseite aller Schüler einer Klasse mit Noten über mehrere Aufgaben;
longitudinaler Blick („Sophie: Note 4 → 3"); Export als CSV/DOCX.

**Bewertung: 5 — hoher Mehrwert, niedrige bis mittlere Umsetzungshürde.**

- **Pädagogischer Kern-Mehrwert:** Lehrkräfte denken in Lernverläufen, nicht in
  Einzelarbeiten. Genau dieser longitudinale Blick fehlt bisher und ist der eigentliche
  Gewinn eines digitalen Assistenten gegenüber dem Notenheft.
- **Datenbasis ist bereits da:** `natascha_db.py` persistiert exakt die nötigen Daten —
  Tabellen `schueler`, `abgabe`, `kriterium_historie`, `fehler_historie` plus die Queries
  `get_abgaben_by_klasse_aufgabe()`, `get_abgaben_by_schueler()`. Das Feature ist im Kern
  eine **neue Lese-/Aggregations-Sicht** auf vorhandene Daten — kein neues Daten-Erfassungs-
  konzept nötig.
- **Export teils vorhanden:** Ein CSV-Noten-Export existiert bereits
  (`SchuelerVerwaltungScreen` → „CSV-Export Noten"); ein DOCX-Export ließe sich über den
  bestehenden `generate_feedback`-Apparat anschließen.
- **Synergie:** Ergänzt die bereits gebaute Fehler-Heatmap (Klassen-Schwächen) um die
  Schüler-Längsachse → rundet das Analyse-Angebot ab.
- **Risiko/Hinweis:** DSGVO beachten (aggregierte Notenanzeige = personenbezogen; siehe
  `SECURITY_AUDIT.md`, Löschkonzept).

---

## 2. Vergleichsansicht (zwei Analysen nebeneinander) — ⭐ 2/5

**Idee:** Zwei Analysen derselben Arbeit (z. B. GPT-4.1 vs. Claude) nebeneinander; zeigt, wo
Modelle unterschiedlich bewerten.

**Bewertung: 2 — überwiegend Entwickler-/Evaluations-Werkzeug, geringer Alltagsnutzen.**

- **Falsche Zielgruppe:** Für die Lehrkraft im Korrekturalltag ist das Ziel **eine**
  belastbare Notenempfehlung, nicht ein Modell-Vergleich. Zwei divergierende Bewertungen
  erzeugen eher Verunsicherung als Entlastung („welcher hat recht?").
- **Kosten/Aufwand:** Verdoppelt API-Calls (Kosten, Zeit) und damit auch das DSGVO-
  Übermittlungsvolumen (siehe `SECURITY_AUDIT.md`, DSGVO-2).
- **Wo es Wert hätte:** Als einmaliges **Kalibrierungs-/QA-Werkzeug** für die Entwicklung
  (Prompt-/Modell-Auswahl validieren). Dafür reicht aber ein Skript/Off-Screen-Vergleich; es
  muss keine Daueransicht in der TUI sein.
- **Teil-Basis vorhanden:** `provider`/`modell` werden bereits im Analyse-JSON gespeichert,
  ein Diff wäre also machbar — der Nutzen rechtfertigt den UI-Aufwand aber nicht.

---

## 3. Rubrik-Editor als TUI-Formular — ⭐ 2/5

**Idee:** Statt `.md`-Dateien manuell zu bearbeiten, ein TUI-Formular zum Erstellen/Bearbeiten
von Rubriken mit Vorschau.

**Bewertung: 2 — Kernnutzen ist bereits abgedeckt; strukturierter Formular-Editor ist
riskant und wenig zusätzlich wert.**

- **Bereits implementiert:** `RubrikEditorScreen` (`natascha.py:1317`) bietet schon einen
  In-App-Editor: TextArea zum Bearbeiten der `.md`, **Vorschau-Tab** (Markdown-Rendering),
  Speichern (Ctrl+S) und „Extern öffnen". Das vom Feature genannte Kernbedürfnis — Rubriken
  in der App bearbeiten + Vorschau, ohne extern `.md` zu editieren — **ist also erfüllt.**
- **Geringer Delta-Nutzen:** Der Vorschlag würde lediglich den freien Markdown-Editor durch
  ein strukturiertes Formular ersetzen.
- **Erhebliches Risiko:** Rubriken haben ein striktes, parser-relevantes Format
  (`## JSON-Kriterien`, `## Gewichtung`, `## Stufenbeschreibungen (1–5)`, `## SRDP-Detail` mit
  K1/K3-Sub-Kriterien). Ein Formular muss all diese Strukturen exakt erzeugen; Fehler hier
  brechen die Bewertungs-Pipeline. Hoher Implementierungs- und Validierungsaufwand bei
  zugleich seltener Nutzung (Rubriken ändern sich kaum).
- **Empfehlung:** Statt Formular-Editor lieber den bestehenden Editor um eine **leichte
  Struktur-Validierung** ergänzen (prüft beim Speichern, ob Pflicht-Abschnitte vorhanden und
  Gewichtungen = 100 % sind). Das adressiert das eigentliche Risiko (kaputte Rubriken) mit
  Bruchteil des Aufwands — wäre eher eine 4/5-Mini-Erweiterung.

---

## Empfehlung

**Priorität auf Feature 1 (Dashboard)** — höchster pädagogischer Mehrwert, baut direkt auf
der bereits vorhandenen DB auf. Features 2 und 3 in der vorgeschlagenen Form zurückstellen;
bei Feature 3 stattdessen die o. g. Struktur-Validierung des bestehenden Editors erwägen.

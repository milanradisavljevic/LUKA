# Bestandsaufnahme LUA (Lehrunterlagen-Applikation)

**Datum:** 2026-06-15
**Kontext:** UX-Redesign, Fokus auf didaktische Features und Workflow-Verbesserungen

---

## 1. Was wurde gemacht (Bestandsaufnahme aus dem Changelog)

### Architektur & Fundament
- **Tauri 2 Desktop-App** mit Rust-Backend und React-Frontend (WebView2)
- **6 LLM-Provider-Adapter:** Anthropic, OpenAI, DeepSeek, Mistral, Qwen, Kimi/Moonshot
- Sichere API-Key-Verwaltung via OS-Keyring
- Monorepo mit 6 Paketen: `schema`, `llm`, `renderer`, `qa`, `input`, `web`
- SVG-Icon-System (lucide-react) statt Emojis für stabile Darstellung

### Aufgabentypen (13 Blocktypen)
| Basis-Typen | Phase-2-Erweiterungen |
|-------------|----------------------|
| multipleChoice | wordScramble |
| matching | kategorisierung |
| lueckentext | tabelle |
| offeneVerstaendnisfrage | stiluebung |
| offeneSchreibaufgabe | songanalyse |
| markieraufgabe | kreuzwortraetsel (2026-06-05) |
| | wortgitter (2026-06-06) |

### UX & Workflow
- **5-Schritt-Wizard:** Absicht → Input → Baukasten → LLM-Options → Generate
- **Sidebar-Navigation:** Dokumente, Vorlagen, Verlauf, Favoriten, Papierkorb, Hilfe, Einstellungen
- **Persistenz:** localStorage für Dokumente, Verlauf, Vorlagen, Einstellungen
- **Import:** PDF-Upload (pdfjs-dist), URL-Import (Rust `fetch_url`), HTML-Upload als Fallback
- **Export:** DOCX (Schülerfassung + Lösung), PDF via LibreOffice-Konvertierung
- **Generierungs-Feedback:** Mehrstufiger Status, Laufzeit-Timer, Abbrechen (best effort)
- **Per-Block-Reroll** mit kontextsensitiven Hints
- **Lernziel-Coverage-Anzeige** in der Vorschau
- **Rebranding** auf "LUA" (Lehrunterlagen-Applikation) am 2026-06-06

### Didaktik-Features (implementiert)
- **Bloom-Steuerung** im System-Prompt (leicht=Bloom 1-2, mittel=3-4, schwer=5-6)
- **CEFR-Mapping für Englisch** (A2/B1/B2)
- **Distraktor-Qualitätsregeln** (thematische Nähe, Längen-Ähnlichkeit, typische Schülerfehler)
- **Terminologie-Konservierung** (Fachbegriffe wortwörtlich übernehmen)
- **Coverage-Prävention** (Absatznummerierung im Prompt ab ≥2 Absätzen UND ≥200 Zeichen)
- **Quality-Pipeline:** Grounding-Check, Duplikate-Check, Fragen-Dubletten
- **Prompt-Injection-Sanitisierung** (`sanitizeQuelltext()`)
- **Schema-Versionierung** mit Migrations-Gerüst

---

## 2. Didaktische Features — Was fehlt oder kann verbessert werden

### A) Sofort umsetzbar (geringer Aufwand, hoher Impact)

| # | Maßnahme | Problem | Lösung | Status |
|---|----------|---------|--------|--------|
| 1 | **UI-Typ-Gating nach Bloom** | "schweres MC" ist Widerspruch — Prompt versucht, Taxonomie-Tiefe in geschlossenen Typ zu pressen | In der UI bei `schwierigkeit=schwer` keine geschlossenen Typen anbieten | Im Didaktik-Plan vorgesehen, **nicht implementiert** |
| 2 | **Lernziel-Coverage erzwingen** | Export trotz nicht-abgedeckter Lernziele möglich (nur rote Anzeige) | `severity='error'` statt `'warning'` → blockiert Export | Nur Anzeige, **keine Blockierung** |
| 3 | **Wortzahl-Validierung Schreibaufgabe** | Musterlösung ignoriert `config.umfangWorte` (häufiges LLM-Versagen) | Längen-Check in `quality.ts` | **Nicht implementiert** |
| 4 | **Thematische Distraktor-Regel für ALLE geschlossenen Typen** | Nur MC hat gute Distraktor-Anweisung, Matching/Lückentext nicht | Prompt-Sektion für alle geschlossenen Typen | Teilweise (nur MC) |

### B) Mittlerer Aufwand

| # | Maßnahme | Problem | Lösung | Status |
|---|----------|---------|--------|--------|
| 5 | **Topic-Coverage-Validierung** | LLM deckt typisch nur den ersten Absatz ab | `checkTopicCoverage()` in `quality.ts` (Code im Deep-Dive vorgeschlagen) | **Nicht implementiert** |
| 6 | **Schwierigkeit PRO Block** | Nur globale Schwierigkeit (`meta.schwierigkeit`) | `BlockSchema` um `schwierigkeit` erweitern | Audit K2, **nicht implementiert** |
| 7 | **LLM-Judge (solve-then-compare)** | `llmJudgeHook` ist nur ein Stub, keine echte Qualitätsprüfung | Haiku-Modell löst Aufgabe, vergleicht mit Schlüssel | Spezifiziert, **nicht implementiert** |
| 8 | **Differenzierung 3 Niveaus (kostensmart)** | 3× Generierung zu teuer | Mittel=Generierung, Leicht=Transformation (ohne LLM), Schwer=Reroll nur offener Typen | Konzept, **nicht implementiert** |

### C) Grössere Features

| # | Maßnahme | Problem | Lösung | Status |
|---|----------|---------|--------|--------|
| 9 | **Formative Diagnostik** | Lernziel-Coverage ist binär (abgedeckt/nicht abgedeckt) | Item-Level-Mapping "welches Item deckt welches Lernziel ab" | **Nicht implementiert** |
| 10 | **Kontextbewusstsein (Zielgruppe)** | Nur `stufe`/`fach`, keine Klasse/Zielgruppe im Prompt | Alter/Reifegrad/Lehrberuf in Prompt propagieren | `klasse` ist im Schema, wird aber **nicht genutzt** |
| 11 | **Stunden-Architekt (Kimi C)** | Nur einzelne Aufgaben, keine ganzen Unterrichtsstunden | Eigenes Datenmodell für Phasen | **Zurückgestellt** ("pädagogische Basis ist Behauptung") |

---

## 3. Workflow-Diskrepanzen

### Diskrepanz 1: "Assistenten-Charakter" fehlt
**Diagnose aus Didaktik-Roundtable:** "Persistenz ist da, wird aber nicht proaktiv genutzt."

- Verlauf, Vorlagen, Defaults existieren — sind aber versteckt in der Sidebar
- **Empfehlung:** Proaktive Vorschläge beim Start ("Letzte Woche: Photosynthese-Test, weitermachen?"), prominente "Zuletzt verwendet"-Sektion

### Diskrepanz 2: Kein "Preserve User Edits"
- Wenn die Lehrkraft die Musterlösung editiert und dann "Neu generieren" klickt, gehen die Edits verloren
- **Empfehlung:** Diff/Merge-Logik oder Warnung vor Datenverlust

### Diskrepanz 3: Feedback bei manuellen Änderungen fehlt
- Wenn die Lehrkraft das ConfigPanel manuell ändert, weiss das LLM bei Reroll nichts davon
- **Empfehlung:** Hinweis an LLM: "Lehrkraft hat X manuell geändert, berücksichtige das"

### Diskrepanz 4: Vorlagen-Formatierung
- Offener Punkt #6: "die Vorlagen müssen definitiv nachgearbeitet werden, da die erstellten Docx durchaus noch zahlreiche Formatierungsfehler haben"
- **Betroffen:** `packages/renderer`

### Diskrepanz 5: Onboarding für neue Nutzer
- 13 Blocktypen, komplexe Konfiguration — kein interaktives Tutorial
- **Empfehlung:** Geführte Tour oder Beispiel-Dokumente zum Ausprobieren

---

## 4. Didaktik-Scorecard (aus Deep-Dive Analyse)

| Kriterium | Status | Fundstelle |
|-----------|--------|------------|
| Bloom-Integration | ⚠️ | `prompt.ts:13–23` — ignoriert Blocktyp-Inkompatibilität |
| Distraktor-Qualität | ⚠️ | MC: gut; Matching/Lückentext: keine Anweisung |
| Quellen-Treue | ✅ | `prompt.ts:27` + `quality.ts:145–194` + Injection-Schutz |
| Output-Validierung | ⚠️ | Lücken: Topic-Coverage, Progression, Längen, LLM-Judge-Stub |
| Lehrer-Kontrolle | ✅ | Reroll + Edit + Delete + Manual |
| Lernziel-Mapping | ⚠️ | Schema: ✅ · Prompt: ⚠️ · UI: ✅ · **Erzwingung: ❌** |

---

## 5. Priorisierte Empfehlungen

### Priorität 1 — Sofort (vor/nach Lehrer-Test)
1. **UI-Typ-Gating** — verhindert didaktisch unsinnige Kombinationen
2. **Lernziel-Coverage erzwingen** — Export blockieren wenn Lernziele nicht abgedeckt
3. **Wortzahl-Validierung Schreibaufgabe** — häufiges LLM-Versagen abfangen

### Priorität 2 — Kurzfristig (1-2 Wochen)
4. **Topic-Coverage-Validierung** — verhindert dass nur erster Absatz behandelt wird
5. **Schwierigkeit PRO Block** — granularere Steuerung
6. **LLM-Judge implementieren** — objektive Qualitätsprüfung
7. **"Preserve User Edits"** — verhindert Datenverlust bei Reroll

### Priorität 3 — Mittelfristig (1-2 Monate)
8. **Differenzierung 3 Niveaus (kostensmart)**
9. **Proaktive Assistenten-Features** — Verlauf/Vorlagen prominent machen
10. **Formative Diagnostik** — Item-Level-Lernziel-Mapping

---

## Zusammenfassung

LUA ist eine **solide Basis mit gutem didaktischen Fundament**. Die grössten Lücken:

1. **Quality-Checks sind nicht erzwungen** (nur warnings, keine Export-Blockierung)
2. **Bloom-Typ-Gating fehlt in der UI** (didaktisch unsinnige Kombinationen möglich)
3. **LLM-Judge ist nicht implementiert** (Stub statt echter Qualitätsprüfung)
4. **"Assistenten-Charakter" fehlt** (Persistenz wird nicht proaktiv genutzt)
5. **Korrekturseite (Phase E) ist noch komplett offen** (Nordstern nicht erreicht)

Die App ist bereit für den Lehrer-Test, aber es gibt klare Verbesserungspotenziale für didaktische Qualität und Workflow.

---

## Nächste Schritte

- Soll eine der priorisierten Massnahmen direkt umgesetzt werden?
- Gibt es spezifische didaktische Features, die priorisiert werden sollen?

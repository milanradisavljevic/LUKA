# Plan: Klassenfeedback + Heatmap als Gesamtsystem

> Phase 1 — Bestandsaufnahme + Plan.  
> Keine Code-Änderungen. Freigabe erforderlich vor Phase 2.

---

## 1. Bestand: Klassenbezogene DB-Funktionen

| Funktion | Datei | SQL | Rückgabe | Im TUI? |
|----------|-------|-----|----------|---------|
| `get_fehler_heatmap` | `natascha_db.py` | JOIN fehler_historie → abgabe; GROUP BY typ | `[{"typ":"Z","anzahl":42,"prozent":35.0},…]` | ✅ `FehlerHeatmapScreen` |
| `get_fehler_heatmap_detail` | `natascha_db.py` | JOIN fehler_historie → abgabe → LEFT JOIN schueler; GROUP BY zitat | `[{"zitat":"…","korrektur":"…","vorname":"…"},…]` | ❌ **brach** — nur in `tests/test_db.py` |
| `get_kriterien_durchschnitt` | `natascha_db.py` | JOIN kriterium_historie → abgabe; GROUP BY kriterium_name | `{"inhalt":{"avg":2.8,"count":18},…}` | ❌ nur intern (`get_klassen_feedback`) |
| `get_klassen_feedback` | `natascha_db.py` | Komposition aus Heatmap + Kriterien + COUNTs + Top-Zitate | `{"klasse":"…","aufgabe":"…","anzahl_abgaben":N,"gesamt_fehler":N,"heatmap":[…],"kriterien":{…},"empfehlungen":[…],"beispiele":[…]}` | ✅ `KlassenFeedbackScreen` |
| `get_abgaben_by_klasse_aufgabe` | `natascha_db.py` | SELECT * FROM abgabe WHERE klasse=? AND aufgabe=? | `[{…abgabe…},…]` | ❌ **brach** |
| `export_noten_csv` | `natascha_db.py` | LEFT JOIN schueler → abgabe | CSV-String | ✅ `SchuelerVerwaltungScreen` |
| `compute_class_progress` | `natascha_core.py` | **Kein SQL** — liest `feedback_data/*.json` von Disk | `[{"aufgabe":"…","avg_note":float,"avg_criteria":{…},"n":int},…]` | ✅ `StatisticsScreen` |

**Wichtige Erkenntnis:** `get_kriterien_durchschnitt` arbeitet mit **rohen** `kriterium_name`-Strings aus der DB. Es nutzt **nicht** `KRITERIUM_KEY_VARIANTS` und bildet daher **keine K1/K3**-Gruppierung ab. Die vier kanonischen SRDP-Kategorien werden auf Klassenebene nicht aggregiert.

---

## 2. Bestand: TUI-Sicht

### 2.1 Erreichbare Screens

| Screen | Erreichbar via | Datenquelle | LLM? |
|--------|---------------|-------------|------|
| `FehlerHeatmapScreen` | Footer "🔥 Heatmap" | SQLite `get_fehler_heatmap` | ❌ |
| `KlassenFeedbackScreen` | Footer "📊 Feedback" | SQLite `get_klassen_feedback` | ✅ Freitext-Zusammenfassung (Button "🤖 LLM-Zusammenfassung") |

### 2.2 Brach / versteckt

| Screen | Erreichbar via | Datenquelle | Status |
|--------|---------------|-------------|--------|
| `StatisticsScreen` | **Versteckte Taste `t`** (`Binding(show=False)`) | `feedback_data/*.json` (nicht DB!) | **Effektiv unentdeckt** — kein Footer-Button, kein Menüeintrag. Zeigt Notenverteilung + Kriterien-Durchschnitte + "Lernfortschritt" über Aufgaben. |
| `get_fehler_heatmap_detail` | **Nirgends** | SQLite | Funktion existiert, wird nie aufgerufen. Könnte Klick auf Heatmap-Zeile auslösen. |
| `get_abgaben_by_klasse_aufgabe` | **Nirgends** | SQLite | Funktion existiert, wird nie aufgerufen. |

### 2.3 Klasse/Aufgabe-Auswahl

Beide Dropdowns im **linken Panel** (`#files-panel`):
- `Select(id="class-select")` → `nc.active_klasse(config)`
- `Select(id="aufgabe-select")` → `config["classes"][klasse]["active_aufgabe"]`

Wechsel der Klasse repopuliert Aufgaben-Select und lädt Dateien neu.  
Beide Screens (`FehlerHeatmapScreen`, `KlassenFeedbackScreen`) lesen aktiv aus `nc.active_klasse(config)`. `FehlerHeatmapScreen` liest zusätzlich seinen `Select(id="heatmap-aufgabe")`; `KlassenFeedbackScreen` bekommt die Aufgabe als Konstruktor-Parameter.

---

## 3. Bestand: Kriteriums-Mapping

### 3.1 `KRITERIUM_KEY_VARIANTS` (natascha_core.py, Zeile ~1230)

```python
{
    "inhalt": ("inhalt", "task_achievement"),
    "textstruktur": ("textstruktur", "aufbau", "organisation_layout"),
    "ausdruck": ("ausdruck", "stil_ausdruck", "lexical_range_accuracy"),
    "sprachrichtigkeit": ("sprachrichtigkeit", "normative_sprachrichtigkeit", "grammatical_range_accuracy"),
}
```

### 3.2 Reale Rubrik-Keys (27 Rubrik-Dateien)

**Deutsch (Unterstufe + Oberstufe):** `inhalt`, `textstruktur`, `aufbau`, `ausdruck`, `stil_ausdruck`, `sprachrichtigkeit`, `normative_sprachrichtigkeit`, `einleitung_aufbau`, `analyse`, `interpretation`

**Englisch (A2/B1/B2):** `task_achievement`, `organisation_layout`, `lexical_range_accuracy`, `grammatical_range_accuracy`

### 3.3 Lücke: Nicht abgedeckte Keys

`einleitung_aufbau`, `analyse`, `interpretation` (Textinterpretation) haben **keinen Eintrag** in `KRITERIUM_KEY_VARIANTS` und werden bei Normalisierung stillschweigend verworfen. Für das Klassensystem sollten sie entweder ergänzt oder als eigenständige Kategorien behandelt werden.

### 3.4 K1/K3 auf Klassenebene: Existiert nicht

- `get_schueler_laengsschnitt` berechnet K1 (`inhalt` + `textstruktur`) und K3 (`ausdruck` + `sprachrichtigkeit`) pro Schüler.
- `get_kriterien_durchschnitt` arbeitet mit rohen Keys, bildet keine K1/K3.
- `get_klassen_feedback` zeigt daher nur Einzelkriterien, nie K1/K3-Rollups.

---

## 4. Was fehlt regelbasiert (Lücken)

### 4.1 K1/K3-Aggregation klassenweit
**Status:** Fehlt komplett.  
**Vorschlag:** Neue Funktion `get_klassen_k1_k3(db_path, klasse, aufgabe=None)`:
1. Lädt alle `kriterium_historie`-Einträge für die Klasse (ggf. gefiltert auf Aufgabe).
2. Normalisiert via `_normalisiere_kriterien()` (reuse aus `get_schueler_laengsschnitt`, NICHT duplizieren).
3. Berechnet K1 = AVG(inhalt, textstruktur), K3 = AVG(ausdruck, sprachrichtigkeit) über alle Abgaben.
4. Gibt `{"k1": {"avg": float, "count": int}, "k3": {"avg": float, "count": int}}` zurück.

### 4.2 Notenverteilung aus der DB
**Status:** `StatisticsScreen` liest aus `feedback_data/*.json` (Dateisystem), nicht aus der DB.  
**Vorschlag:** Neue Funktion `get_notenverteilung(db_path, klasse, aufgabe=None)`:
- COUNT/GROUP BY `note` aus `abgabe`.
- Gibt `{1: n1, 2: n2, …, 5: n5}` zurück.
- Optional: Berücksichtige `lehrer_feedback.note_final` wenn vorhanden (Lehrer-Note hat Vorrang vor App-Note).

### 4.3 App-Note vs. Lehrer-Note klassenweit (Kalibrierung)
**Status:** `get_schueler_laengsschnitt` berechnet Kalibrierung pro Schüler (`kalibrierung_diff`). Auf Klassenebene fehlt das.  
**Vorschlag:** Neue Funktion `get_klassen_kalibrierung(db_path, klasse, aufgabe=None)`:
- AVG(`note_app_snapshot`) vs. AVG(`note_final`) aus `lehrer_feedback`.
- Zählt wie viele Abgaben Lehrer-Feedback haben.
- Gibt `{"app_avg": float, "lehrer_avg": float, "diff": float, "n_mit_feedback": int, "n_gesamt": int}` zurück.

### 4.4 Trend über mehrere Aufgaben auf Klassenebene
**Status:** `compute_class_progress` liest JSON-Dateien von Disk. Kein DB-basierter Trend.  
**Vorschlag:** Neue Funktion `get_klassen_trend(db_path, klasse)`:
- GROUP BY `aufgabe`, AVG(note) pro Aufgabe.
- Gibt `[{"aufgabe": "SA1", "avg_note": 3.2, "n": 18}, …]` chronologisch sortiert.
- Mit `lehrer_feedback` verknüpfen für Lehrer-Noten-Trend.

### 4.5 `get_fehler_heatmap_detail` anzeigen
**Status:** Funktion existiert, wird nie aufgerufen.  
**Vorschlag:** In `FehlerHeatmapScreen` bei Klick auf eine Heatmap-Zeile den Detail-Panel befüllen (analog `SchuelerDetailScreen` → Kriterien-Tabelle).

---

## 5. Vorschlag: LLM-Klassen-Briefing

### 5.1 Design-Prinzipien (analog Schülerprofil)

- **Datenminimiert:** Keine Schülernamen, keine ganzen Texte, keine Dateinamen.
- **Nur Aggregate + kurze Beispielzitate** (max. 3 Zeichen, gekürzt).
- **DSGVO-konform:** Prompt enthält nur Zahlen, Stufen, Prozente, gekürzte Fehlerzitate.
- **Kein Auto-Call:** Nur auf Knopfdruck.
- **Historisch speichern:** Tabelle `klassen_briefing` (append-only).
- **Veraltungserkennung:** `basis_anzahl_abgaben` gespeichert, bei Laden mit aktuellem Stand vergleichen.

### 5.2 Prompt-Inhalt (datenminimiert)

```
Klasse: [anonymisiert, nur "Klasse X"]
Aufgabe: [Aufgabenbezeichnung]
Abgaben: N

K1 (Inhalt & Struktur): Ø Stufe X.Y (n=…)
K3 (Sprache & Ausdruck): Ø Stufe X.Y (n=…)

Notenverteilung: 1→n, 2→n, 3→n, 4→n, 5→n
App-Note-Ø: X.Y | Lehrer-Note-Ø: X.Y | Diff: ±X.Y

Fehler-Heatmap:
- Zeichensetzung: 42 (35%)
- Grammatik: 28 (23%)
- …

Top-Beispielzitate (gekürzt, keine Namen):
- "Schüler die keine" → "Schüler, die keine" (7×)
- …

Schwächstes Kriterium: [Kategorie] Ø X.Y
Stärkstes Kriterium: [Kategorie] Ø X.Y
```

### 5.3 Output-JSON (strukturiert)

```json
{
  "kurzbild": "Fließtext, 3–4 Sätze. Gesamteinschätzung der Klasse.",
  "schwerpunkte": [
    {
      "bereich": "K1 / Inhalt & Struktur",
      "befund": "Konkreter Befund mit Zahlenbezug.",
      "empfehlung": "Konkrete Unterrichtsempfehlung (Stundenidee)."
    },
    {
      "bereich": "K3 / Sprache & Ausdruck",
      "befund": "…",
      "empfehlung": "…"
    }
  ],
  "unterrichtsempfehlungen": [
    {
      "fokus": "Kommasetzung bei Relativsätzen",
      "stundenidee": "Konkrete 45-Minuten-Stunde: …",
      "material": "Arbeitsblatt / Übung / …",
      "zielgruppe": "schwache Hälfte / ganze Klasse / …"
    }
  ],
  "matura_fokus": "Fließtext. Welche Matura-Kompetenzen sind gefährdet / stark? Bezug zu SRDP."
}
```

### 5.4 Prompt-Stil

- **Rolle:** Erfahrene AHS-Deutschlehrerin / Fachkoordinatorin.
- **Adressat:** Du sprichst eine Kollegin direkt an ("Du").
- **Anti-Floskel:** Keine "Es ist wichtig, dass…", keine "Schüler sollten…". Stattdessen: "Wiederhole Kommasetzung systematisch…", "Setze im nächsten Textproduktionstraining…"
- **Konkret:** Jede Empfehlung muss an eine schwache Kategorie gekoppelt sein und eine Stundenidee enthalten.
- **Kein Markdown** im `kurzbild` und `matura_fokus` (fließender Text).

---

## 6. UI-Vorschlag: Screen-Erweiterung

### 6.1 Kein neuer Screen

`KlassenFeedbackScreen` erweitern statt neu bauen.

### 6.2 Layout

```
┌─ Klassen-Feedback – 6i ──────────────────────────────┐
│ [🔄 Aktualisieren] [🤖 Klassen-Briefing] [📄 DOCX] [✕]│
├─ Regelbasierte Sicht (immer sichtbar) ───────────────┤
│ Abgaben: 20 | Fehler: 45                              │
│ K1 Ø 2.8 | K3 Ø 3.1                                   │
│ Noten: 1→2, 2→5, 3→8, 4→4, 5→1                        │
│ App-Ø 3.2 | Lehrer-Ø 2.9 | Diff -0.3                  │
│                                                       │
│ Empfehlungen …                                        │
│ Kriterien …                                           │
│ Häufige Fehler-Beispiele …                            │
├─ KI-Klassen-Briefing (nur nach Klick sichtbar) ──────┤
│ [KI-Briefing erstellen]  (Hinweis: anonymisierte …)   │
│                                                       │
│ [geladener/gespeicherter Inhalt]                      │
│ ⚠ Veraltet: Basis 18 Abgaben, aktuell 20              │
└───────────────────────────────────────────────────────┘
```

### 6.3 Button-Änderungen

- **Ersetzen:** Der alte "🤖 LLM-Zusammenfassung"-Button (freier Text) wird durch "🤖 Klassen-Briefing" ersetzt.
- **Hinweis-Label:** Darunter `Static` mit "Sendet anonymisierte Kennzahlen an den aktiven LLM-Provider."
- **Speichern/Laden:** Analog `SchuelerDetailScreen`:
  - Nach erfolgreicher Erstellung → auto-save in `klassen_briefing`.
  - "Letztes Briefing laden"-Button.
  - Veraltungshinweis (gelb/grün).

### 6.4 Styling

- `natascha.tcss` erweitern um `.feedback-briefing` (ähnlich `.stats-container`).
- K1/K3-Block fett hervorgehoben, Notenverteilung mit Mini-Balken (wie `StatisticsScreen`).

---

## 7. Datenbank-Tabelle `klassen_briefing`

```sql
CREATE TABLE IF NOT EXISTS klassen_briefing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    klasse TEXT NOT NULL,
    aufgabe TEXT,
    briefing_json TEXT NOT NULL,
    basis_anzahl_abgaben INTEGER NOT NULL,
    basis_anzahl_fehler INTEGER NOT NULL DEFAULT 0,
    modell TEXT,
    erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_briefing_klasse ON klassen_briefing(klasse);
CREATE INDEX IF NOT EXISTS idx_briefing_klasse_aufgabe ON klassen_briefing(klasse, aufgabe);
```

CRUD-Funktionen analog `schueler_profil`:
- `save_klassen_briefing(db_path, klasse, aufgabe, briefing, basis_abgaben, basis_fehler, modell)` → `id`
- `get_latest_klassen_briefing(db_path, klasse, aufgabe=None)` → `dict | None`
- `get_klassen_briefing_historie(db_path, klasse, aufgabe=None)` → `list[dict]`

---

## 8. Phase 2 — Umsetzungsplan (geschätzte Reihenfolge)

### 8a. Regelbasierte Lücken (kein LLM)
1. `get_klassen_k1_k3()` — reuse `_normalisiere_kriterien()` aus `natascha_db.py`.
2. `get_notenverteilung()` — mit `lehrer_feedback`-Fallback.
3. `get_klassen_kalibrierung()` — AVG über `lehrer_feedback`.
4. `get_klassen_trend()` — GROUP BY aufgabe, chronologisch.
5. Tests je Funktion (`tmp_path`-DB).
6. `KlassenFeedbackScreen._build_text()` erweitern: K1/K3-Block + Notenverteilung + Kalibrierung oben einblenden.

### 8b. LLM-Klassen-Briefing
1. `build_klassen_briefing_prompt(aggregat: dict) → str` in `natascha_core.py`.
   - Input: Dict aus `get_klassen_feedback` + `get_klassen_k1_k3` + `get_notenverteilung` + `get_klassen_kalibrierung`.
   - DSGVO-Test: Keine Schülernamen, keine Dateinamen, Zitate gekürzt.
2. `KlassenFeedbackScreen`:
   - Button "Klassen-Briefing erstellen" (`@work(thread=True)`).
   - Hinweis-Label.
   - Auto-save nach Erstellung.
   - "Letztes Briefing laden"-Button.
   - Veraltungshinweis.
3. DB-Tabelle `klassen_briefing` + CRUD.

### 8c. UI-Polish
1. `FehlerHeatmapScreen`: Klick auf Zeile → `get_fehler_heatmap_detail` im Detail-Panel anzeigen (brach aufheben).
2. `StatisticsScreen`: Entscheiden — integrieren in `KlassenFeedbackScreen` oder Footer-Button hinzufügen?
3. `natascha.tcss`: Styling für neue Elemente.

### 8d. Verifikation
1. `pytest` grün (DSGVO-Regressionstest inklusive).
2. `ruff` ohne neue Findings.
3. `seed_testdaten.py` ggf. erweitern (2. Klasse oder mehrere Schüler pro Klasse).
4. `CHANGELOG.md`, `ARCHITECTURE.md`, `AGENTS.md` ergänzen.

---

## 9. Offene Design-Fragen (für Freigabe)

1. **Alter LLM-Button:** Soll der existierende "🤖 LLM-Zusammenfassung"-Button (freier Text, kein JSON) durch das neue strukturierte "Klassen-Briefing" **ersetzt** oder **ergänzt** werden?
2. **StatisticsScreen:** Soll der versteckte `StatisticsScreen` (Taste `t`) in `KlassenFeedbackScreen` integriert werden oder einen eigenen Footer-Button bekommen?
3. **Nicht-SRDP-Kriterien:** Sollen `einleitung_aufbau`, `analyse`, `interpretation` in `KRITERIUM_KEY_VARIANTS` ergänzt werden (z.B. als eigene Kategorie) oder bei K1/K3-Aggregation ignoriert bleiben?
4. **Briefing-Speicherung:** Soll das Briefing **pro Klasse+Aufgabe** gespeichert werden (wie vorgeschlagen) oder nur **pro Klasse** (alle Aufgaben aggregiert)?
5. **Heatmap-Detail:** Soll `get_fehler_heatmap_detail` mit Schülernamen im TUI angezeigt werden, oder nur anonymisiert (nur Zitat + Korrektur)?

---

*Dokument erstellt: 2026-05-29*  
*Nächster Schritt: Freigabe Phase 2 durch Nutzer.*

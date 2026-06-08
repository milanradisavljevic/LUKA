# Claude-Code-Auftrag: Schüler-Längsschnitt (Lernverlauf) + LLM-Profil-Entwurf

## Kontext

NATASCHA speichert pro korrigierter Arbeit strukturierte Daten in SQLite
(`natascha_db.py`): Abgaben (`abgabe`), Kriterien-Stufen (`kriterium_historie`),
Sprachfehler (`fehler_historie`), und seit Kurzem die echte Lehrer-Note
(`lehrer_feedback`). Bisher ist jede Abgabe eine Insel — es gibt keine Sicht auf die
Entwicklung EINES Schülers über mehrere Arbeiten hinweg.

Ziel dieses Auftrags ist die erste Stufe eines dreischichtigen Systems:

1. UNTERE SCHICHT (dieser Auftrag, Kern): eine rein regelbasierte, kostenlose
   Aggregationsfunktion, die für einen Schüler den vollständigen Längsschnitt liefert.
2. OBERE SCHICHT (dieser Auftrag, einfach): eine Schüler-Detailansicht im TUI, die den
   Längsschnitt darstellt.
3. MITTLERE SCHICHT (dieser Auftrag, NUR ENTWURF): eine Funktion, die aus dem Aggregat
   einen DATENMINIMIERTEN LLM-Prompt baut (Stärken/Schwächen/Förderung). Diese wird in
   diesem Schritt NUR als Entwurf mit ausführlichem Docstring und Beispiel-Output
   angelegt, NICHT in die UI verdrahtet und NICHT automatisch aufgerufen.

## Leitprinzipien (nicht verhandelbar)

- SRDP als Leitachse: Der Verlauf denkt in den vier Hauptkriterien (Inhalt,
  Textstruktur/Aufbau, Ausdruck, Sprachrichtigkeit) UND in der K1/K3-Gruppierung
  (K1 = Inhalt + Textstruktur, K3 = Ausdruck + Sprachrichtigkeit), analog zur
  bestehenden `berechne_note_srdp()` in `natascha_core.py`. KEINE 15 SRDP-Unterkriterien
  — die werden derzeit nicht in der DB persistiert. Nur die vier Hauptkriterien aus
  `kriterium_historie` verwenden.
- Note app vs. Lehrer-Note: Der Notenverlauf zeigt BEIDE nebeneinander — die App-Note
  (`abgabe.note`) und die echte Lehrer-Note (`lehrer_feedback.note_final`), wo vorhanden.
- DATENMINIMIERUNG (DSGVO): Die LLM-Prompt-Funktion (Schicht 3) darf NIEMALS Namen,
  Nachnamen oder zusammenhängende Schülertexte enthalten. Nur aggregierte Kennzahlen und
  isolierte, kurze Fehlerzitate (max. 6 Wörter, wie in der DB). Der Name wird erst NACH
  der LLM-Antwort lokal wieder ans Profil geheftet.

## WICHTIG — zuerst lesen, dann bauen

- `natascha_db.py` vollständig: insbesondere `get_abgaben_by_schueler`,
  `get_schueler_by_klasse`, `kriterium_historie`-Schema, `fehler_historie`-Schema,
  `get_lehrer_feedback`, `get_fehler_heatmap`, `compute_class_progress`
  (in `natascha_core.py`) als Vorbild für die Aggregationslogik.
- `natascha_core.py`: `berechne_note_srdp` (K1/K3-Gruppierung + KEY_VARIANTS für die
  Kriteriumsnamen-Varianten — diese Varianten MÜSSEN wiederverwendet werden, da die
  Kriteriumsnamen je nach Rubrik variieren: "inhalt"/"task_achievement",
  "textstruktur"/"aufbau"/"organisation_layout", etc.), `_BEZ` (Notenbezeichnungen).
- In `natascha.py`: Wie bestehende Screens aufgebaut sind (Screen-Klassen, `compose`,
  Bindings), insbesondere ob es schon einen "Schüler"-Screen/Button gibt (im Footer ist
  ein "Schüler"-Eintrag sichtbar). Daran andocken statt neuen Screen erfinden, falls
  vorhanden. Lies die `natascha.tcss` für vorhandene Styling-Klassen.

Stil strikt einhalten: `from __future__ import annotations`, deutsche Docstrings,
snake_case, Typ-Hints, stdlib + vorhandene Deps, keine neuen Abhängigkeiten.

## Schritt 1 — Aggregationsfunktion (`natascha_db.py` oder `natascha_core.py`)

Entscheide nach Codelage, wohin es am besten passt (Aggregation über mehrere DB-Tabellen
spricht eher für `natascha_db.py`, aber die K1/K3-Logik liegt in `natascha_core.py` —
wenn du es in `natascha_db.py` baust, dupliziere die KEY_VARIANTS NICHT, sondern
importiere sie oder lege sie als gemeinsame Konstante ab).

```python
def get_schueler_laengsschnitt(
    db_path: Path | str,
    schueler_id: int,
) -> dict[str, Any]:
    """Aggregiert den Lernverlauf EINES Schülers über alle seine Abgaben.

    Liest aus abgabe (Note, Datum, Aufgabe), kriterium_historie (vier Hauptkriterien),
    fehler_historie (Fehlertypen + Zitate) und lehrer_feedback (echte Note).

    Returns ein Dict:
    {
        "schueler": {"id": int, "vorname": str, "nachname": str, "klasse": str},
        "anzahl_abgaben": int,
        "verlauf": [
            {
                "abgabe_id": int,
                "aufgabe": str,
                "datum": str,
                "note_app": float | None,
                "note_lehrer": float | None,     # aus lehrer_feedback, sonst None
                "kriterien": {                    # die vier Hauptkriterien, normalisiert
                    "inhalt": float | None,
                    "textstruktur": float | None,
                    "ausdruck": float | None,
                    "sprachrichtigkeit": float | None,
                },
                "k1": float | None,               # (inhalt + textstruktur) / 2
                "k3": float | None,               # (ausdruck + sprachrichtigkeit) / 2
            },
            ...   # chronologisch sortiert
        ],
        "trend": {                                # Vergleich erste vs. letzte Abgabe
            "note_app": {"start": float, "ende": float, "richtung": "steigt|stabil|faellt"},
            "inhalt": {...}, "textstruktur": {...},
            "ausdruck": {...}, "sprachrichtigkeit": {...},
            "k1": {...}, "k3": {...},
        },
        "fehlerschwerpunkte": [                    # über ALLE Abgaben aggregiert
            {
                "typ": "Z",
                "label": "Zeichensetzung",
                "anzahl": int,
                "beispiele": [                     # max 3, kurze Zitate aus der DB
                    {"zitat": "...", "korrektur": "..."},
                ],
            },
            ...   # nach Anzahl absteigend, nur die Top 3-4 Typen
        ],
        "kalibrierung": {                          # nur wo Lehrer-Note vorhanden
            "paare": int,                          # Anzahl Abgaben mit beiden Noten
            "mittlere_abweichung": float | None,   # Ø |note_app - note_lehrer|
            "tendenz": "app strenger|app milder|deckungsgleich|n/a",
        },
    }

    Hinweise:
    - Kriteriumsnamen variieren je Rubrik. Nutze dieselbe KEY_VARIANTS-Zuordnung wie
      berechne_note_srdp(), um inhalt/textstruktur/ausdruck/sprachrichtigkeit robust zu
      mappen. Wenn ein Kriterium in einer Abgabe fehlt, None statt Crash.
    - Notenrichtung: Differenz < 0.5 Notenstufen = "stabil". Bei Noten gilt: kleinere
      Zahl = besser, also note sinkt = "steigt" (Verbesserung!). Kommentiere diese
      Invertierung im Code deutlich, das ist eine typische Fehlerquelle.
    - fehlerschwerpunkte: Beispiele aus fehler_historie, dedupliziert nach zitat.
    - Wenn der Schüler nur 1 Abgabe hat: verlauf mit 1 Eintrag, trend mit richtung
      "stabil" und start==ende, kalibrierung wie gehabt. Kein Crash bei n=1.
    """
```

Schreibe gründliche Tests in `tests/test_db.py` (oder neue `tests/test_laengsschnitt.py`):
- Schüler mit 3 Abgaben, Kriterien steigend → trend "steigt" (Note sinkt) korrekt erkannt.
- Schüler mit gemischten Lehrer-Noten → kalibrierung.paare und mittlere_abweichung korrekt.
- Schüler mit 1 Abgabe → kein Crash, sinnvolle Defaults.
- Fehlende Kriterien in einer Abgabe → None, kein Crash.
- Fehlerschwerpunkte korrekt aggregiert und nach Anzahl sortiert.

## Schritt 2 — Schüler-Detailansicht (`natascha.py`)

Wenn es bereits einen Schüler-Screen gibt: dort eine Detailansicht ergänzen, die beim
Auswählen eines Schülers `get_schueler_laengsschnitt()` aufruft und darstellt. Falls
nicht, einen schlichten `SchuelerDetailScreen` (oder Panel) bauen. TUI-tauglich, rein
textbasiert, an `natascha.tcss` orientiert.

Darstellung (kompakt, monospace-freundlich):
- Kopf: Vorname (+ Nachname falls vorhanden), Klasse, Anzahl Abgaben.
- Notenverlauf als Textzeile, App vs. Lehrer nebeneinander, z. B.:
    `Note (App):    SA1: 4  SA2: 3  SA3: 3   (Trend: steigt)`
    `Note (Lehrer): SA1: 3  SA2: 3  SA3: 2   (Trend: steigt)`
- Kriterien-Trend als vier Zeilen mit Start→Ende und Richtungspfeil (↑ ↓ →), wobei
  ↑ = Verbesserung. WICHTIG: Pfeilrichtung an Verbesserung koppeln, nicht an Zahlrichtung.
- K1/K3-Zeile mit Maturabezug-Hinweis, z. B.:
    `K3 (Stil + Sprachnormen): Stufe 2.0 → 2.5  ↑`
- Fehlerschwerpunkte: Top 3 Typen mit Anzahl und je einem Beispiel.
- Kalibrierungs-Zeile (dezent, grau): `App vs. Lehrer: Ø Abweichung 0.7 Notenstufen,
  App tendenziell strenger (3 Vergleichspaare)` — nur zeigen, wenn paare > 0.

Keine LLM-Calls in dieser Ansicht. Reine Anzeige der Aggregation. Robust bei n=1 und bei
Schülern ganz ohne Kriteriendaten (dann freundlicher Hinweis statt leerer Block).

## Schritt 3 — LLM-Prompt-Funktion NUR ALS ENTWURF (`natascha_core.py`)

Lege eine Funktion an, die NUR den datenminimierten Prompt-String baut und zurückgibt —
KEIN API-Call, KEINE Verdrahtung in die UI. Sie dient als Diskussionsgrundlage.

```python
def build_schueler_profil_prompt(laengsschnitt: dict[str, Any]) -> str:
    """Baut einen DATENMINIMIERTEN Prompt für ein LLM-Schülerprofil.

    DSGVO-KRITISCH: Dieser Prompt darf NIEMALS enthalten:
    - Vorname, Nachname, Klasse, Schüler-ID, Dateinamen
    - zusammenhängende Schülertexte oder ganze Sätze
    Erlaubt sind NUR: aggregierte Stufen/Noten, Fehlertyp-Häufigkeiten und die kurzen
    isolierten Fehlerzitate (max. 6 Wörter), die ohnehin schon in der DB stehen.

    Der Aufrufer entfernt vor dem Aufruf alle Identifikatoren aus dem laengsschnitt-Dict
    (schueler-Block wird NICHT in den Prompt übernommen). Diese Funktion liest bewusst nur
    verlauf/trend/fehlerschwerpunkte, niemals laengsschnitt["schueler"].

    Gibt den fertigen Prompt-String zurück. Erwarteter LLM-Output (im Prompt spezifiziert):
    JSON mit staerken[], schwaechen[], foerderbereiche[] (je mit konkreter, auf die
    SRDP-Kategorien bezogener Übungsempfehlung), und einem kurzen maturabezug-Text
    (nur Oberstufe). KI-Floskeln verbieten (wie in build_analysis_prompt).
    """
```

Der Prompt soll fachlich auf AHS-Deutsch/SRDP zugeschnitten sein: Er bekommt den Verlauf
in K1/K3 und den vier Kriterien, die Fehlerschwerpunkte, und die Aufgabe, daraus eine
pädagogisch warme, konkrete Einschätzung zu machen — Stärken zuerst, dann
Förderbereiche mit konkreten Übungsvorschlägen, die sich auf die schwächsten Kategorien
beziehen. Ton: wie eine erfahrene Deutschlehrerin, kein KI-Sprech, Du-Anrede an die
Lehrkraft (nicht an den Schüler).

Schreibe einen Test, der prüft, dass der erzeugte Prompt KEINEN Namen/keine Klasse aus
einem Beispiel-Längsschnitt enthält (DSGVO-Regressionstest): Beispiel-Dict mit
schueler={"vorname": "Felix", "nachname": "Müller", "klasse": "6i"} bauen, Prompt
erzeugen, assert "Felix" not in prompt and "Müller" not in prompt and "6i" not in prompt.

## Schritt 4 — Verifikation

- `python3 -m pytest tests/` grün (inkl. neuer Tests).
- `ruff check` ohne neue Findings.
- Manueller Smoke-Test: einen Schüler mit mehreren Abgaben öffnen, Verlauf prüfen;
  App- und Lehrer-Note erscheinen nebeneinander; Trendpfeile zeigen Verbesserung als ↑.
- `CHANGELOG.md` + `ARCHITECTURE.md`/`AGENTS.md` um die neue Funktion und die geplante
  Drei-Schichten-Logik ergänzen.

## Grenzen / NICHT tun

- KEIN LLM-Call in diesem Auftrag. Schicht 3 ist nur ein Prompt-Builder + Test.
- KEINE 15-SRDP-Unterkriterien-Persistierung (späterer, separater Schritt).
- KEINE Änderung am bestehenden Notenberechnungs- oder Speicherpfad.
- KEINE neuen Dependencies.
- Schülername/Klasse niemals in den LLM-Prompt — der DSGVO-Regressionstest muss das
  absichern.

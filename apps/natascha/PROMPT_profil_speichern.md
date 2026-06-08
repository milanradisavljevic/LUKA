# Claude-Code-Auftrag: Schülerprofile speichern und laden

## Kontext

Der Test-Knopf "KI-Profil erstellen" im `SchuelerDetailScreen` (natascha.py) baut über
`natascha_core.build_schueler_profil_prompt(laengsschnitt)` einen datenminimierten Prompt,
schickt EINEN LLM-Call und zeigt das Ergebnis (kurzbild, staerken[], foerderbereiche[],
maturabezug) an. Aktuell wird das Ergebnis NICHT gespeichert — bei jedem Klick entsteht ein
neuer (kostenpflichtiger) Call, und die Einschätzung geht beim Schließen verloren.

Dieser Auftrag macht das Profil persistent: speichern, später laden, Veraltung erkennen.

## Designentscheidungen (vom Nutzer bestätigt)

- HISTORISCH speichern, NICHT überschreiben. Jede Profilerstellung legt einen neuen
  Datensatz an. Alte Profile bleiben erhalten (spätere Auswertung der Entwicklung der
  Einschätzung über das Schuljahr).
- "Neuestes gilt": Anzeige lädt standardmäßig das jüngste Profil eines Schülers.
- NUR auf Knopfdruck: Weder Laden noch Erstellen passiert automatisch beim Öffnen des
  Screens. Es gibt einen Knopf zum Erstellen (neuer Call) und einen zum Laden des letzten
  gespeicherten Profils (kein Call).
- Veraltung: Ein Profil speichert, auf wie vielen Abgaben es beruht. Hat der Schüler
  inzwischen mehr Abgaben, gilt das Profil als veraltet und wird mit Hinweis angezeigt.

## WICHTIG — zuerst lesen, dann bauen

- `natascha_db.py`: Schema-Muster (SCHEMA_SQL, IF NOT EXISTS, init_db via executescript),
  CRUD-Stil, `get_schueler_by_id`, `get_schueler_laengsschnitt` (liefert anzahl_abgaben).
- `natascha.py`: den `SchuelerDetailScreen` und den bestehenden "KI-Profil erstellen"-
  Handler — dort wird nach erfolgreichem Call das geparste Profil-Dict bereits gehalten.
  An genau dieser Stelle nach dem Anzeigen zusätzlich speichern.
- Die JSON-Struktur des Profils (kurzbild, staerken, foerderbereiche, maturabezug), damit
  die Speicher- und Ladefunktion dieselben Felder bedienen.

Stil: `from __future__ import annotations`, deutsche Docstrings, snake_case, Typ-Hints,
stdlib (json, sqlite3), keine neuen Dependencies.

## Schritt 1 — Schema + CRUD (`natascha_db.py`)

### Tabelle in SCHEMA_SQL ergänzen (additiv):

```sql
CREATE TABLE IF NOT EXISTS schueler_profil (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schueler_id INTEGER NOT NULL REFERENCES schueler(id) ON DELETE CASCADE,
    profil_json TEXT NOT NULL,
    basis_anzahl_abgaben INTEGER NOT NULL,
    modell TEXT,
    erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profil_schueler ON schueler_profil(schueler_id);
```

`profil_json` enthält das komplette Profil-Dict als JSON-Text. `basis_anzahl_abgaben` ist
die Anzahl Abgaben zum Erstellungszeitpunkt (für die Veraltungs-Erkennung). `modell` ist
der Modellname/Provider (z. B. "deepseek-chat"), damit später nachvollziehbar ist, womit
ein Profil erzeugt wurde.

### CRUD-Funktionen:

```python
def save_schueler_profil(
    db_path: Path | str,
    schueler_id: int,
    profil: dict[str, Any],
    basis_anzahl_abgaben: int,
    modell: str = "",
) -> int:
    """Speichert ein neues Schülerprofil (historisch, kein Überschreiben).

    profil wird als JSON serialisiert (ensure_ascii=False, damit Umlaute erhalten
    bleiben). Gibt die neue profil-id zurück.
    """


def get_latest_schueler_profil(
    db_path: Path | str, schueler_id: int
) -> dict[str, Any] | None:
    """Holt das jüngste gespeicherte Profil eines Schülers, oder None.

    Returns ein Dict:
    {
        "id": int,
        "profil": dict,                  # aus profil_json deserialisiert
        "basis_anzahl_abgaben": int,
        "modell": str,
        "erstellt_am": str,
    }
    oder None, wenn noch kein Profil existiert.
    """


def get_schueler_profil_historie(
    db_path: Path | str, schueler_id: int
) -> list[dict[str, Any]]:
    """Alle Profile eines Schülers, neueste zuerst (für spätere Entwicklungsansicht).

    Gibt eine Liste von Dicts wie get_latest_schueler_profil, chronologisch absteigend.
    """
```

Tests in `tests/test_db.py` oder `tests/test_laengsschnitt.py`:
- save + get_latest gibt dasselbe Profil zurück (Umlaute erhalten, JSON roundtrip).
- Zweites save legt zweiten Datensatz an (Historie wächst, get_latest liefert das neuere).
- get_schueler_profil_historie liefert neueste zuerst.
- get_latest bei Schüler ohne Profil → None.

## Schritt 2 — UI: Speichern nach Erstellung + Laden-Knopf (`natascha.py`)

Im `SchuelerDetailScreen`:

### Nach erfolgreicher Profilerstellung automatisch speichern
Im bestehenden "KI-Profil erstellen"-Handler, NACH erfolgreichem Parsen und Anzeigen:
`save_schueler_profil(db_path, schueler_id, profil_dict, basis_anzahl_abgaben, modell)`.
- `basis_anzahl_abgaben` = `laengsschnitt["anzahl_abgaben"]` (die Zahl, die der Erstellung
  zugrunde lag).
- `modell` = aktiver Modellname aus der Config.
- Nach dem Speichern dezente notify: "Profil gespeichert."
- Defensiv: Wenn Speichern fehlschlägt, notify-Warnung, aber das angezeigte Profil bleibt.

### Zweiter Knopf "Letztes Profil laden"
- Lädt via `get_latest_schueler_profil` das jüngste Profil OHNE LLM-Call und zeigt es im
  selben Format wie ein frisch erstelltes.
- Wenn keines existiert: notify "Noch kein gespeichertes Profil vorhanden."
- VERALTUNG: Wenn `profil["basis_anzahl_abgaben"] < laengsschnitt["anzahl_abgaben"]`, über
  dem geladenen Profil einen deutlichen, aber dezenten Hinweis zeigen, z. B.:
  "Hinweis: Dieses Profil beruht auf X Arbeiten, inzwischen liegen Y vor. Neu erstellen
  für eine aktuelle Einschätzung." Plus das Erstellungsdatum anzeigen.
- Beim geladenen Profil immer Erstellungsdatum + Modell dezent (grau) mit anzeigen.

Beide Knöpfe an das bestehende Button-Styling/Layout im Screen anpassen (natascha.tcss).
Der Erstellen-Knopf bleibt wie er ist (löst den Call aus); der Laden-Knopf macht nie einen
Call.

## Schritt 3 — Verifikation

- `python3 -m pytest tests/` grün (inkl. neuer Profil-Tests).
- `ruff check` auf geänderten Dateien ohne neue Findings.
- Manuell: Testschüler öffnen → "KI-Profil erstellen" → "Profil gespeichert" → Screen
  schließen und neu öffnen → "Letztes Profil laden" zeigt dasselbe Profil ohne Call.
  Dann eine weitere Abgabe für den Schüler anlegen (seed_testdaten erweitern oder manuell)
  → "Letztes Profil laden" zeigt den Veraltungs-Hinweis.
- CHANGELOG.md ergänzen.

## Grenzen / NICHT tun

- Kein automatischer LLM-Call und kein automatisches Laden beim Öffnen des Screens.
- Profile NICHT überschreiben oder löschen (historisch behalten).
- profil_json mit ensure_ascii=False speichern (Umlaute!).
- Keine neuen Dependencies.
- Keine Änderung an build_schueler_profil_prompt oder am Längsschnitt.

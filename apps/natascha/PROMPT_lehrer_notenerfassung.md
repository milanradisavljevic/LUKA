# Claude-Code-Auftrag: Lehrer-Notenerfassung + optionaler Kommentar

## Kontext

NATASCHA ist ein Textual-TUI zur Korrektur von Schülerarbeiten. Aktuell berechnet
`natascha_core.run_llm_analysis()` eine App-Note (SRDP bzw. Unterstufe) und speichert
sie via `natascha_db.save_analysis_to_db()` in der Tabelle `abgabe` (Spalte `note`).

Was fehlt: Die Lehrkraft kann die App-Note nicht bestätigen oder überschreiben, und es
gibt kein Feld für eine echte, von der Lehrkraft vergebene Note. Genau dieses Delta
(App-Note vs. Lehrer-Note) ist langfristig die Datengrundlage, um die Automatik zu
kalibrieren.

## Ziel

1. Datenbank: neue Tabelle `lehrer_feedback` + CRUD-Funktionen in `natascha_db.py`.
2. UI: aufklappbarer Rückmelde-Block im mittleren Panel (`#middle-panel`) von
   `natascha.py`, in dem die Lehrkraft die echte Note (1–5) und einen optionalen
   Kommentar einträgt und speichert.
3. Status-Marker: in der Dateiliste links sichtbar machen, ob für eine Datei bereits
   ein Lehrer-Feedback existiert.

PDF-Upload ist AUSDRÜCKLICH NICHT Teil dieses Auftrags (kommt später). Lege das
Spaltenfeld `pdf_pfad` aber schon an, damit später kein Migrationsschritt nötig ist.

## WICHTIG — zuerst lesen, dann bauen

Bevor du Code schreibst, lies die tatsächlichen Strukturen, statt Namen zu raten:

- `natascha_db.py` vollständig (Schema-Konventionen, `sqlite3.connect`-Muster,
  `init_db`, `save_analysis_to_db`, wie `abgabe_id` entsteht).
- In `natascha.py`: Finde den Screen/Container, der das mittlere Panel rendert
  (`#middle-panel`), und die Stelle, die nach der Analyse die Note-Zeile
  ("Note: 4 — Genügend", "Durchschnitt", "K1/K3", "LLM empfiehlt") anzeigt. Finde
  außerdem die Dateiliste im linken Panel (`#files-panel`) und wie deren Einträge
  formatiert werden (aktuell etwa "☐ ● Dateiname.docx (NNN W)").
- Prüfe, ob nach der Analyse die `abgabe_id` der gespeicherten Zeile überhaupt
  verfügbar ist. WICHTIG: `save_analysis_to_db()` gibt die `abgabe_id` zurück (oder -1
  bei Duplikat), aber der Rückgabewert wird in `run_llm_analysis()` derzeit verworfen.
  Du musst die `abgabe_id` bis zur UI durchreichen (siehe Schritt 2).

Halte dich strikt an den bestehenden Stil: `from __future__ import annotations`,
deutsche Docstrings, snake_case, Typ-Hints, keine neuen Dependencies.

## Schritt 1 — Datenbank (`natascha_db.py`)

### 1a. Schema erweitern

Ergänze in `SCHEMA_SQL` eine neue Tabelle (additiv, bestehende Tabellen unverändert):

```sql
CREATE TABLE IF NOT EXISTS lehrer_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    abgabe_id INTEGER NOT NULL REFERENCES abgabe(id) ON DELETE CASCADE,
    schueler_id INTEGER REFERENCES schueler(id) ON DELETE SET NULL,
    klasse TEXT NOT NULL,
    aufgabe TEXT NOT NULL,
    note_final REAL,
    note_app_snapshot REAL,
    lehrer_kommentar TEXT,
    pdf_pfad TEXT,
    erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    geaendert_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(abgabe_id)
);

CREATE INDEX IF NOT EXISTS idx_lf_abgabe ON lehrer_feedback(abgabe_id);
CREATE INDEX IF NOT EXISTS idx_lf_klasse ON lehrer_feedback(klasse);
CREATE INDEX IF NOT EXISTS idx_lf_aufgabe ON lehrer_feedback(aufgabe);
```

`init_db()` führt `SCHEMA_SQL` per `executescript` aus; durch `IF NOT EXISTS` ist das
idempotent und bestehende DBs werden beim nächsten `init_db()` automatisch ergänzt.

### 1b. CRUD-Funktionen

Füge diese Funktionen hinzu (Signaturen einhalten, damit die UI sie aufrufen kann):

```python
def upsert_lehrer_feedback(
    db_path: Path | str,
    abgabe_id: int,
    klasse: str,
    aufgabe: str,
    note_final: float | None,
    note_app_snapshot: float | None = None,
    lehrer_kommentar: str = "",
    pdf_pfad: str = "",
    schueler_id: int | None = None,
) -> int:
    """Legt Lehrer-Feedback an oder aktualisiert es (Upsert über abgabe_id).

    Gibt die lehrer_feedback-id zurück. geaendert_am wird bei Update neu gesetzt.
    """
    # Implementierung:
    # - INSERT ... ON CONFLICT(abgabe_id) DO UPDATE SET note_final=excluded.note_final,
    #   lehrer_kommentar=excluded.lehrer_kommentar, pdf_pfad=excluded.pdf_pfad,
    #   note_app_snapshot=excluded.note_app_snapshot, geaendert_am=CURRENT_TIMESTAMP
    # - schueler_id und note_app_snapshot bei UPDATE nur überschreiben, wenn nicht None
    #   (COALESCE-Logik), damit ein reiner Kommentar-Edit den Snapshot nicht löscht.


def get_lehrer_feedback(db_path: Path | str, abgabe_id: int) -> dict[str, Any] | None:
    """Holt das Lehrer-Feedback zu einer Abgabe, oder None."""


def get_lehrer_feedback_by_hash(
    db_path: Path | str, datei_hash: str
) -> dict[str, Any] | None:
    """Holt Lehrer-Feedback über den Datei-Hash (für die Dateiliste/Status-Marker).

    Joint abgabe (datei_hash) -> lehrer_feedback. Gibt None, wenn keine Abgabe oder
    kein Feedback existiert.
    """


def has_lehrer_feedback_for_file(db_path: Path | str, datei_hash: str) -> bool:
    """True, wenn für die Datei (per Hash) bereits eine note_final eingetragen ist."""
```

Schreibe Tests in `tests/test_db.py` analog zu den bestehenden (In-Memory-SQLite
`:memory:` bzw. tmp_path): Insert, Update (Upsert ändert dieselbe Zeile, kein zweiter
Datensatz), Kommentar-only-Edit lässt note_app_snapshot stehen, `has_lehrer_feedback_*`
liefert korrekt True/False.

## Schritt 2 — abgabe_id bis zur UI durchreichen

In `natascha_core.run_llm_analysis()` wird am Ende `ndb.save_analysis_to_db(...)`
aufgerufen, dessen Rückgabewert (`abgabe_id`) aktuell verworfen wird. Sorge dafür, dass
die `abgabe_id` im zurückgegebenen `data`-Dict landet, z. B. unter dem Schlüssel
`data["_abgabe_id"]` (Unterstrich-Präfix = interne UI-Metadaten, NICHT Teil des
JSON-Schemas, also vor dem Speichern als feedback_data-JSON entfernen ODER vom Schema
ignorieren lassen — prüfe, ob `additionalProperties` das erlaubt; falls nicht, halte den
Wert getrennt). Sauberste Variante: `save_analysis_to_db` gibt die id ohnehin zurück;
fang sie auf und häng sie an `data` an, bevor `return data, []` erfolgt. Falls Duplikat
(-1), versuche die bestehende `abgabe_id` über `get_abgabe_by_hash()` zu ermitteln.

Verändere NICHT das feedback_data-JSON-Format auf der Festplatte. `_abgabe_id` ist nur
für die laufende UI-Session gedacht.

## Schritt 3 — UI: Rückmelde-Block im mittleren Panel (`natascha.py`)

Unter dem bestehenden Noten-/Kriterien-Block im `#middle-panel`, dort wo aktuell
Leerraum ist:

- Ein einklappbarer Bereich (Textual `Collapsible`, Titel z. B. "Echte Note eintragen").
- Note-Auswahl 1–5 (RadioSet oder fünf kleine Buttons), vorausgewählt mit der App-Note
  aus der aktuellen Analyse (`data["notenempfehlung"]["note"]`).
- Ein `TextArea` für den optionalen Kommentar (Platzhalter: "Optionaler Kommentar zur
  Note …").
- Ein Button "Speichern".
- Beim Speichern: `ndb.upsert_lehrer_feedback(...)` mit der `abgabe_id` aus
  `data["_abgabe_id"]`, der gewählten Note, dem Kommentartext und
  `note_app_snapshot=data["notenempfehlung"]["note"]`. Klasse/Aufgabe aus dem aktiven
  Kontext.
- Nach dem Speichern: kompakte Bestätigung anzeigen ("✓ Eingetragen: Note X" + erste
  Kommentarzeile) und den Status-Marker links aktualisieren (Schritt 4).
- Beim Öffnen einer bereits bewerteten Datei: bestehendes Feedback laden
  (`get_lehrer_feedback`) und Note + Kommentar vorbefüllen, damit man es editieren kann.

Falls `data["_abgabe_id"]` fehlt (z. B. Analyse aus Cache ohne DB-Zeile): Block trotzdem
anzeigen, aber beim Speichern defensiv prüfen und eine kurze Notify-Meldung ausgeben
statt zu crashen.

Halte dich an das bestehende TUI-Styling in `natascha.tcss` (nur unterstützte Properties,
kein gradient/shadow/gap). Keine neuen Farben erfinden; nutze die vorhandenen Klassen.

## Schritt 4 — Status-Marker in der Dateiliste (`#files-panel`)

Finde, wie die Dateiliste ihre Einträge baut (aktuell etwa "☐ ● Dateiname.docx (NNN W)").
Ergänze pro Eintrag ein Statuszeichen, das anzeigt, ob bereits eine echte Note vorliegt:

- Berechne pro Datei den `datei_hash` (es gibt `ndb._file_hash(path)`) und rufe
  `ndb.has_lehrer_feedback_for_file(db_path, hash)`.
- Wenn True: ein deutliches Zeichen voranstellen/anhängen, z. B. "✓" (Feedback vorhanden)
  vs. nichts (offen). Wähle ein Zeichen, das sich klar vom bestehenden "●"/"☐"
  unterscheidet und im TUI monospace sauber dargestellt wird.
- Performance: Hash-Berechnung pro Datei bei jedem Listen-Rebuild kann teuer werden.
  Cache das Ergebnis pro Pfad in der laufenden Session (dict path->bool), und invalidiere
  den Eintrag, wenn für diese Datei gerade gespeichert wurde.

## Schritt 5 — Verifikation

- `python3 -m pytest tests/` muss grün sein (inkl. der neuen DB-Tests).
- `ruff check natascha_db.py natascha_core.py` ohne neue Findings (E501 in bestehenden
  langen Zeilen ignorieren).
- Manueller Smoke-Test: eine Datei analysieren, Note überschreiben, speichern, Datei neu
  öffnen → Note/Kommentar sind vorbefüllt; Marker links zeigt "erledigt".
- Dokumentation: kurzen Eintrag in `CHANGELOG.md` und `KNOWN_ISSUES.md` (falls offen)
  ergänzen; `ARCHITECTURE.md`/`AGENTS.md` um die neue Tabelle `lehrer_feedback` und die
  CRUD-Funktionen erweitern.

## Grenzen / NICHT tun

- Keine Pseudonymisierung in diesem Auftrag (eigener späterer Schritt).
- Kein PDF-Upload-Flow (nur Spalte `pdf_pfad` anlegen).
- Keine Änderung am feedback_data-JSON-Format auf der Festplatte.
- Keine neuen externen Dependencies.
- `note_final` als REAL speichern (erlaubt später Halbnoten/Tendenzen), in der UI aber
  nur ganze Noten 1–5 anbieten.

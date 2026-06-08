# NATASCHA: Analyse-Versionierung

## Ziel

Beim Speichern einer Analyse die vorherige Version behalten, statt sie
zu überschreiben. Jede Version enthält Timestamp und Modell-Info.

## Dateistruktur

```
feedback_data/
  Flora_Lex_analysis.json                          ← aktuelle Version
  .history/
    Flora_Lex_analysis_20260524_153012_gpt41.json   ← Archiv
    Flora_Lex_analysis_20260524_162345_sonnet4.json  ← Archiv
```

- `_analysis.json` bleibt der aktuelle, aktive Dateiname (keine Änderung
  an bestehender Logik die diese Datei liest)
- `.history/` enthält alle früheren Versionen mit Timestamp + Modellkürzel
- Der Punkt im Ordnernamen versteckt ihn in Standard-Dateimanagern

## Implementierung

### 1. Neue Funktion in `natascha_core.py`

```python
from datetime import datetime

def _model_slug(provider: str, model: str) -> str:
    """Kurzes Modellkürzel für Dateinamen."""
    # "gpt-4.1-mini" → "gpt41mini"
    # "claude-sonnet-4-20250514" → "sonnet4"
    # "deepseek-chat" → "deepseek"
    slug = model.lower()
    slug = re.sub(r"claude-?", "", slug)
    slug = re.sub(r"[-_.]", "", slug)
    slug = re.sub(r"\d{8,}", "", slug)  # Datumsstempel entfernen
    return slug[:12] or provider[:8]


def archive_existing_analysis(analysis_path: Path) -> Path | None:
    """Archiviert eine bestehende Analyse in .history/ bevor sie überschrieben wird.
    
    Returns: Pfad der archivierten Datei, oder None wenn keine existierte.
    """
    if not analysis_path.exists():
        return None
    
    history_dir = analysis_path.parent / ".history"
    history_dir.mkdir(exist_ok=True)
    
    # Modell und Timestamp aus der bestehenden JSON lesen
    try:
        data = json.loads(analysis_path.read_text(encoding="utf-8"))
        provider = data.get("provider", "unknown")
        model = data.get("modell", "unknown")
        slug = _model_slug(provider, model)
    except Exception:
        slug = "unknown"
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    stem = analysis_path.stem  # z.B. "Flora_Lex_analysis"
    archive_name = f"{stem}_{timestamp}_{slug}.json"
    archive_path = history_dir / archive_name
    
    # Verschieben (nicht kopieren — die aktuelle wird gleich überschrieben)
    import shutil
    shutil.move(str(analysis_path), str(archive_path))
    
    return archive_path
```

### 2. Integration in die Analyse-Speicherung

An der Stelle wo die Analyse-JSON gespeichert wird (nach LLM-Call,
nach Validierung, nach Metadaten-Override, nach Notenberechnung):

```python
# VOR dem Schreiben der neuen Analyse:
archived = archive_existing_analysis(analysis_path)
if archived:
    log.info(f"Vorherige Analyse archiviert: {archived.name}")

# Neue Analyse schreiben (wie bisher):
analysis_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
```

### 3. UI: Versions-Anzeige (optional)

In der Detailansicht einer analysierten Datei:

```
Analysiert mit: gpt-4.1-mini (openai)
Versionen: 2 (History verfügbar)
```

Tastenkürzel `v` (für Versionen): Zeigt eine Liste aller Versionen
im `.history/`-Ordner mit Datum, Modell und Note:

```
┌─ Versionshistorie: Flora Lex ──────────────────┐
│                                                  │
│  2026-05-24 16:23  sonnet4    Note: 2 (Gut)     │
│  2026-05-24 15:30  gpt41      Note: 3 (Befr.)   │
│                                                  │
│  [Enter] Version laden  [Esc] Schließen          │
└──────────────────────────────────────────────────┘
```

"Version laden" kopiert die archivierte JSON zurück als aktuelle
`_analysis.json` (und archiviert die bisherige aktuelle).

### 4. Aufräum-Logik (optional, später)

Maximale Anzahl Versionen pro Datei konfigurierbar:

```toml
[versionierung]
max_versionen = 10  # Ältere werden gelöscht
```

## Dateien

| Datei | Änderung |
|-------|----------|
| `natascha_core.py` | `archive_existing_analysis()`, `_model_slug()` |
| `natascha.py` | Versions-Anzeige + Tastenkürzel `v` (optional) |

## Edge Cases

- Erste Analyse einer Datei: kein Archiv, `.history/` wird nicht angelegt
- Mehrere Analysen am selben Tag mit demselben Modell: Timestamp enthält
  Sekunden, daher keine Kollision
- Analyse-JSON ist korrupt/nicht lesbar: `slug = "unknown"`, archivieren
  geht trotzdem (es wird nur verschoben)
- `.history/` Ordner wird manuell gelöscht: kein Problem, wird bei
  Bedarf neu angelegt

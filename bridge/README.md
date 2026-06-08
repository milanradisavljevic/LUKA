# Bridge — Datei-Brücke NATASCHA ⇄ LUA

Die Bridge entkoppelt beide Apps: **NATASCHA schreibt**, **LUA liest**. Keine
gemeinsame Codebase, kein Netzwerk, offline-fähig.

## Ablauf (Phase 1)

```
NATASCHA  --schreibt-->  bridge/inbox/<klasse>_<aufgabe>_<datum>.json
LUA Step0 --liest-->     Liste der neuesten Korrekturen → [Übungen generieren]
```

## Vertrag

`schema.json` (JSON Schema draft-07) ist die **Single Source of Truth** für das
Austauschformat. Beide Seiten müssen sich daran halten.

- **Versionierung:** `schemaVersion` (aktuell `1`). LUA lehnt unbekannte Versionen
  freundlich ab, statt zu raten.
- **`heatmap`** — grobe Fehlerkategorien (R/G/Z/A), das ist alles, was NATASCHA kennt.
- **`beispiele`** — echte, anonymisierte Schülerfehler (`zitat`/`korrektur`). Diese
  liefern dem LUA-Prompt die didaktische Zielgenauigkeit.
- **`empfehlungen`** — optionale LLM-Klassenempfehlungen aus `klassen_briefing`.

## Datenschutz

Die JSON-Dateien in `inbox/` enthalten echte (wenn auch anonymisierte) Schülerfehler
und sind **per `.gitignore` vom Repo ausgeschlossen**. Niemals committen.

## Kategorie → Aufgabentyp (LUA-Heuristik)

| `typ` | Kategorie       | Passende LUA-Aufgabentypen                                      |
|-------|-----------------|----------------------------------------------------------------|
| R     | Rechtschreibung | `lueckentext`, `vokabeluebung`                                  |
| G     | Grammatik       | `lueckentext`, `offeneVerstaendnisfrage`, `offeneSchreibaufgabe`|
| Z     | Zeichensetzung  | `lueckentext`, `markieraufgabe`                                 |
| A     | Ausdruck/Stil   | `stiluebung`, `wordScramble`                                    |

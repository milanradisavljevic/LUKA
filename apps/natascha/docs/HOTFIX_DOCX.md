# NATASCHA Hotfix: DOCX-Generierung schlägt fehl

## Diagnose

Die DOCX-Generierung ist nach dem v0.7.3-Patch kaputt. Wahrscheinliche
Ursachen (in Reihenfolge der Wahrscheinlichkeit):

### 1. _split_run_at gibt (None, None) zurück

Die Funktion `_split_run_at(run, offset)` gibt `(None, None)` zurück
wenn `offset <= 0` oder `offset >= len(run.text)`. Die aufrufenden
Stellen prüfen das nicht:

```python
# Hier crasht es wenn _split_run_at None zurückgibt:
_, start_run = _split_run_at(start_run, start_off)
# start_run ist jetzt None → start_run._r crasht
```

**Fix:** Rückgabewert prüfen:
```python
if start_off > 0:
    result = _split_run_at(start_run, start_off)
    if result[1] is not None:
        _, start_run = result
        end_run = start_run
```

### 2. Overlapping Fehler im selben Absatz

Wenn zwei Fehler im selben Absatz liegen und ihre Zitate überlappen,
modifiziert der erste Match die Run-Struktur. Der zweite Match findet
dann falsche Offsets. Runs werden gesplittet, eingefügt, verschoben —
die Indizes stimmen nicht mehr.

**Fix:** Fehler pro Absatz sammeln, nach Position sortieren, von hinten
nach vorne verarbeiten (damit Offsets stabil bleiben):

```python
# Statt:
for fehler in fehler_list:
    for para in pool:
        ...

# Besser:
para_fehler_map: dict[int, list] = {}
for fehler in fehler_list:
    for para in pool:
        full_text = "".join(r.text for r in para.runs)
        pos = full_text.lower().find(fehler.zitat.lower())
        if pos >= 0:
            para_fehler_map.setdefault(id(para), []).append((pos, para, fehler))
            break

for para_id, matches in para_fehler_map.items():
    # Von hinten nach vorne verarbeiten!
    for pos, para, fehler in sorted(matches, key=lambda m: m[0], reverse=True):
        _apply_fehler_markup(para, fehler, root, comment_id, author)
        comment_id += 1
```

### 3. lxml Import-Fehler

`_split_run_at` verwendet `_etree.fromstring(_etree.tostring(rPr))`.
Wenn `rPr` None ist (Run ohne Formatierung) oder lxml nicht verfügbar,
crasht das.

**Fix:** Null-Check:
```python
rpr = run._r.find(f"{{{_W_NS}}}rPr")
if rpr is not None:
    import copy
    new_run.append(copy.deepcopy(rpr))  # Sicherer als etree roundtrip
```

## Vorgehensweise

1. **Erstmal den Fehler reproduzieren und den Traceback lesen.**
   In natascha.py den DOCX-Export-Aufruf in einen try/except wrappen
   und den vollständigen Traceback loggen (falls nicht schon).

2. **Dann den spezifischen Fix anwenden.**

3. **Defensiv-Wrapper als Sofortmaßnahme:** Die gesamte fehler-Markup-
   Schleife in `_attach_word_level_comments` in try/except wrappen,
   damit ein einzelner fehlgeschlagener Fehler-Match nicht den ganzen
   Export killt:

```python
for fehler in (fehler_list or []):
    try:
        _apply_single_fehler(...)
    except Exception as exc:
        logging.warning(f"Fehler-Markierung übersprungen: {fehler.zitat!r} — {exc}")
        continue
```

## Befehl für Claude Code

```
Die DOCX-Generierung crasht nach den v0.7.3-Änderungen.
Lies HOTFIX_DOCX.md.

Schritt 1: Finde den genauen Fehler — führe einen DOCX-Export für eine
bestehende Analyse aus und lies den Traceback.

Schritt 2: Wende den passenden Fix aus der Datei an.

Schritt 3: Als Sofortmaßnahme die fehler-Markup-Schleife in try/except
wrappen, damit einzelne Fehler den Export nicht komplett verhindern.

Schritt 4: Teste den Export erneut.
```

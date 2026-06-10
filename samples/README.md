# Beispiel-Abgaben (synthetisch)

Diese Dateien sind **frei erfunden** und enthalten **keine echten Schülerdaten**. Sie
dienen dazu, LUKA sofort auszuprobieren, ohne reale Abgaben zu verwenden.

| Datei | Textsorte | Zweck |
|---|---|---|
| `Beispiel_Kommentar_AB.docx` | Kommentar | Einzel-Korrektur testen |
| `Beispiel_Eroerterung_CD.docx` | Erörterung | zweite Datei für die **Batch-Korrektur** |

Die Texte enthalten **absichtlich Fehler** (Rechtschreibung, Grammatik, Zeichensetzung,
Ausdruck), damit die Korrektur etwas zu finden hat.

## So testest du damit

1. In *Korrektur* → **Neue Analyse** → eine dieser Dateien hochladen → analysieren.
2. Für die Batch-Korrektur: **Mehrere wählen …** → beide Dateien → **Stapel analysieren**.

## Neu erzeugen

```bash
cd samples
python3 _generate_samples.py
```

(Benötigt `python-docx`, ist in den NATASCHA-Requirements enthalten.)

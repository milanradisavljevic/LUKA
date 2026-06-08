# NATASCHA Bugfix: Fehler-Array wird nicht befüllt

## Diagnose

Die Sophia-Dankl-Analyse hat kein `fehler`-Array, obwohl Schema und Prompt es fordern.
Stattdessen nutzt das LLM die alten Felder `fehler_detail` und `fehlerschwerpunkte`
innerhalb der Kriterien. Drei Ursachen:

1. **Konkurrierende Schema-Felder:** Das `kriterium`-Schema erlaubt `fehler_detail` und
   `fehlerschwerpunkte` als Strings-Array. Das LLM bevorzugt diese Kurzform ("Mehrere
   Kommafehler") statt 25 einzelner strukturierter Einträge im Top-Level `fehler`.

2. **Falsches Beispiel:** `emma_b2_feedback.json` ist ein englischer Essay mit 4 Fehlern.
   Bei einer deutschen Arbeit mit 25 Fehlern produziert das LLM trotzdem nur ca. 4.

3. **Altdaten:** Bestehende Analysen (vor dem Patch) haben kein `fehler`-Feld.
   Diese müssen alle neu analysiert werden.

## Fix 1: Konkurrierende Felder entfernen

In `feedback_schema.json` im `$defs/kriterium`-Objekt die Felder `fehler_detail` und
`fehlerschwerpunkte` ENTFERNEN:

```json
"kriterium": {
  "type": "object",
  "required": ["stufe", "punkte", "staerken", "vorschlaege"],
  "properties": {
    "stufe": { ... },
    "punkte": { ... },
    "gewicht": { ... },
    "staerken": { ... },
    "schwaechen": { ... },
    "vorschlaege": { ... },
    "rhetorische_figuren": { ... }
  },
  "additionalProperties": false
}
```

Die Felder `fehler_detail` und `fehlerschwerpunkte` komplett raus.
Durch `additionalProperties: false` würde das LLM sie auch nicht mehr
heimlich einschmuggeln können.

## Fix 2: Deutsches Beispiel-Fixture mit realistischer Fehleranzahl

Die Datei `tests/fixtures/emma_b2_feedback.json` durch ein zweites Fixture
`tests/fixtures/beispiel_deutsch_kommentar.json` ergänzen ODER ersetzen.

Das neue Fixture soll:
- Fach: Deutsch, Textsorte: Kommentar, Schulstufe: Oberstufe
- 10-15 Fehler im `fehler`-Array (nicht 4) -- realistisch für eine 6. Klasse
- Fehlertypen gemischt: ca. 5x Z (Zeichensetzung), 3x R, 3x G, 2x A
- KEINE `fehler_detail` oder `fehlerschwerpunkte` in den Kriterien
- Kriterien-Keys: inhalt, aufbau, ausdruck, sprachrichtigkeit (gemäß kommentar.md)

Wichtig: Die Funktion `load_example_fixture()` nimmt die erste JSON-Datei
alphabetisch. Wenn beide Fixtures existieren, kommt `beispiel_deutsch*` vor
`emma_b2*`. Für Englisch-Aufgaben sollte langfristig das passende Fixture
nach Fach geladen werden -- kurzfristig ist das deutsche Fixture aber besser
als das englische, weil die Deutsch-Korrektur das Kernproblem ist.

## Fix 3: Prompt-Verstärkung

Im Prompt (build_analysis_prompt) nach der fehler-Beschreibung hinzufügen:

```
ACHTUNG: Trage Sprachfehler AUSSCHLIESSLICH im Top-Level-Array 'fehler' ein.
Verwende NICHT 'fehler_detail' oder 'fehlerschwerpunkte' innerhalb der Kriterien.
Diese Felder sind veraltet und werden vom System ignoriert.
```

## Fix 4: Neuanalyse erzwingen

Alle bestehenden Analysen im output-Verzeichnis, die kein `fehler`-Array haben,
müssen neu analysiert werden. Hinweis in der App anzeigen, wenn eine geladene
Analyse kein `fehler`-Feld enthält: "Analyse veraltet -- Neuanalyse empfohlen (Taste a)".

## Priorität

Fix 1 (Schema) + Fix 3 (Prompt) zusammen umsetzen. Dann Fix 2 (Fixture).
Dann Fix 4 (Altdaten-Hinweis) als Nice-to-have.

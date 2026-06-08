# [VERALTET / ARCHIVIERT] Lehrunterlagen-Tool — Designdokument

> Dieses Dokument ist veraltet und wurde am 2026-06-01 archiviert.
> Die aktuelle Planung findet sich in `docs/agents-aufteilung.md` und `docs/fahrplan.md`.
> Die Quellen der Wahrheit sind: `produktvision.md`, `tauri-architektur.md`, `datenmodell-erweiterung.md`.

Status: Entwurf v0.1 (Phase 0, vor Natascha-Abnahme)
Letzte Aenderung: 2026-05-31

Dieses Dokument ist die einzige Quelle der Wahrheit fuer alle Coding-Agents.
Wer am Projekt arbeitet, liest zuerst dieses Dokument und danach `AGENTS.md`.

---

## 1. Vision

Eine App, die den manuellen LLM-Workflow einer AHS-Lehrkraft standardisiert:
Quelltexte rein, definierte Aufgabenbloecke zusammenstellen, mit einem waehlbaren
LLM Inhalte generieren, am Ende zwei druckfertige Word-Dokumente raus
(Schueler*innenfassung und Loesung), garantiert im Hausstil.

Zielgruppe: AHS-Gymnasium, Faecher Deutsch und Englisch, Unter- und Oberstufe.

## 2. Positionierung gegenueber der Konkurrenz

Bekannte Wettbewerber (KI Schulgenie, fobizz, schulKI, paddy) sind breit ueber
alle Faecher aufgestellt und liefern Inhalt, behandeln das Layout aber als
Nebensache. Unser Vorteil liegt in der Tiefe statt der Breite:

1. Echte oesterreichische Maturastruktur fuer Deutsch und Englisch (Situation,
   Textsorte, Umfang, Aspekte; SRDP-Logik).
2. Layout-Garantie plus Doppeldokument: Inhalt (LLM) und Layout (Code) sind
   strikt getrennt. Es entstehen immer Schuelerfassung und Loesung paargleich.
3. Baukasten statt isolierter Einzeltools: reale Schularbeitsstruktur als
   komponierbare Bloecke mit Punktelogik.
4. Multi-LLM-Wahl statt Bindung an ein Modell.
5. Erstellung und Beurteilung in einer Pipeline (Anbindung Korrekturraster).
6. Datenschutz als Verkaufsargument statt als Luecke.

## 3. Architekturprinzip (nicht verhandelbar)

Der Kern des Projekts ist eine Trennung in zwei Welten:

- Das LLM erzeugt ausschliesslich INHALT als strukturiertes JSON.
- Der Code (Renderer) erzeugt das LAYOUT aus diesem JSON.

Damit ist der Hausstil unabhaengig vom gewaehlten Modell garantiert. Beide
Dokumente (Schueler + Loesung) entstehen aus derselben Datenstruktur.

```
Quelltext --> Input-Pipeline --> Prompt --> LLM-Adapter --> JSON (Block-Schema)
   --> Validierung (Zod) --> [optional: Vorschau/Editieren] --> Renderer
   --> SA.docx + Loesung.docx
```

## 4. Tech-Stack

- Sprache: TypeScript, Node.js 20+
- Monorepo: pnpm workspaces
- Dokument-Rendering: npm-Paket `docx`
- Schema und Laufzeitvalidierung: Zod (LLM-Antworten werden gegen das Schema validiert)
- Frontend: React + Vite
- Tests: Vitest
- LLM-Anbieter ueber Adapter: Anthropic (Claude), OpenAI (ChatGPT), Kimi

### Monorepo-Layout

```
/packages/schema     Datenstruktur als Zod-Schema + TS-Typen (Quelle der Wahrheit)
/packages/renderer   JSON -> 2x .docx, kodiert den Hausstil
/packages/input      Quelltexte parsen (docx, pdf, txt, html, url) + Drive lesen
/packages/llm        Anbieter-Adapter, erzwingt JSON-Ausgabe
/packages/qa         Fixtures, Integrationstests, Korrekturraster-Anbindung
/apps/web            Baukasten-UI + editierbare Vorschau
/docs                Spezifikationen, Beispiel-JSON
```

Regel: `packages/schema` ist der Vertrag zwischen allen Modulen. Aenderungen am
Schema laufen ausschliesslich ueber den Schema-Owner (Claude Code). Andere Module
importieren das Schema, aendern es nie selbst.

## 5. Datenstruktur (Herzstueck)

Ein Dokument ist ein JSON-Objekt. Aus genau diesem Objekt entstehen beide Word-Dateien.

```json
{
  "schemaVersion": "0.1.0",
  "meta": {
    "stufe": "oberstufe",
    "fach": "deutsch",
    "thema": "Medienkonsum und Jugendliche",
    "datum": "2026-05-30",
    "klasse": "7A",
    "notizen": ""
  },
  "quelltexte": [
    { "id": "q1", "titel": "Social Media", "inhalt": "...", "herkunft": { "typ": "upload", "ref": "quelltext_1.pdf" } }
  ],
  "bloecke": [
    {
      "id": "b1", "typ": "lueckentext", "punkte": 8, "quelleId": "q1",
      "arbeitsanweisung": "Lies den Text. Setze die fehlenden Begriffe ein.",
      "config": { "anzahlLuecken": 8, "wortbank": false, "distraktoren": 0 },
      "loesung": { "luecken": [ { "nr": 1, "wort": "..." } ] }
    }
  ]
}
```

Allgemeine Felder jedes Blocks: `id`, `typ`, `punkte`, optional `quelleId`,
`arbeitsanweisung` (Imperativ, Du-Anrede), optional `clue` (kursiv, in Klammern),
`config` (typabhaengig), `loesung` (typabhaengig; in der Schuelerfassung leer
gerendert, in der Loesungsfassung kursiv und leicht eingerueckt eingetragen).

## 6. Block-Katalog (Phase-0-Spezifikation)

Jeder Blocktyp traegt seine Regeln als feste Constraints. Diese gehoeren in den
Renderer-Code, nicht in den Prompt.

### 6.1 lueckentext
- config: `anzahlLuecken` (int), `wortbank` (bool), `distraktoren` (int)
- Regel: jede Luecke wird als `(1) ____________` gerendert (Linie, kein "_").
- Regel: `wortbank` darf nur bei `stufe = unterstufe` true sein.
- Regel: wenn Wortbank, dann immer mit Distraktoren (`distraktoren >= 1`).
- loesung: Liste von `{ nr, wort }`.

### 6.2 matching
- config: `items` (Liste `{ nr, prompt }`), `optionen` (Liste `{ key, text }`)
- Regel: es gibt immer mehr Optionen als Items (z. B. 8 Optionen fuer 6 Items).
- Regel: die Reihenfolge der Optionen ist NICHT parallel zur Aufgabenreihenfolge.
- loesung: Zuordnung `item.nr -> option.key`.

### 6.3 multipleChoice
- config: `fragen` (Liste `{ nr, frage, optionen [{key,text}], mehrfach }`)
- loesung: pro Frage die korrekten `key`s.

### 6.4 offeneVerstaendnisfrage
- config: `fragen` (Liste `{ nr, frage, zeilen }`), `zeilen` = Anzahl Schreiblinien.
- Regel: Schreiblinien mindestens 9 mm Zeilenhoehe, als Linie gerendert.
- loesung: pro Frage eine Musterantwort auf Schuelerniveau.

### 6.5 offeneSchreibaufgabe
- config: `situation`, `textsorte`, `umfangWorte { min, max }`, `aspekte` (Liste)
- Oberstufe: an Maturastruktur orientiert (Situation + Textsorte + Umfang + Aspekte).
- loesung: `musterloesung` (Sehr-gut-Niveau einer Schuelerin der Zielklasse,
  KEIN Expertentext) plus kompakter `erwartungshorizont`
  `{ inhalt, struktur, ausdruck, sprachrichtigkeit }`.

### 6.6 markieraufgabe
- config: `arbeitsanweisung`, Verweis auf `quelleId`, zu markierende Stellen.
- loesung: die zu markierenden Textstellen.

### Clues
Clues duerfen den Loesungsweg nicht vorwegnehmen. Sie werden kursiv in Klammern
hinter der Arbeitsanweisung gerendert.

## 7. Hausstil (im Renderer fest kodiert, nicht verhandelbar)

- Schrift: Arial 11 pt Fliesstext; H1 14 pt fett, H2 12 pt fett, H3 11 pt fett.
- Farben: nur Schwarz (#000000) und Grau (#595959, #BFBFBF fuer Trennlinien).
- Tabellen: 0,5 pt Linie schwarz, keine Farbfuellung, Kopfzeilen nur durch Fettdruck.
- Raender: 2,0 cm oben/unten, 2,2 cm links/rechts.
- Handschriftflaechen: Zeilenhoehe mindestens 9 mm, Unterstrich als Linie (nicht "_").
- Aufgaben nie ueber Seitenumbrueche zerreissen.
- Kopfzeile bei Schularbeiten: "Klasse ___ Name ___________ Datum ___".
- Fusszeile: Seitenzahl rechts in Grau.

## 8. Sprache und Anrede

- Durchgehend Du-Anrede in Aufgabentexten.
- Arbeitsanweisungen im Imperativ: "Lies den Text. Markiere ...".
- In Meta-Texten (Titel, Deckblatt): "Schueler*innen".
- Keine Substantivierungen wie "Aufgabenstellung: Lesen".
- Oberstufe: Orientierung an oesterreichischer Maturastruktur.

## 9. Quelltext-Pipeline

- Formate Phase 3: docx, pdf, txt, dann html-Upload und url-Eingabe.
- url-Eingabe: fuer offen zugaengliche Seiten. Caveat: viele Seiten blockieren
  automatischen Abruf, Login-Seiten ohnehin.
- html-Upload: die robuste Loesung fuer blockierte oder login-geschuetzte Seiten.
  Die Lehrkraft speichert die Seite und laedt das HTML hoch.
- Drive: private Bibliothek pro Lehrkraft, app-vermittelt. Die App liest die vom
  Nutzer ausgewaehlte Datei ueber die Drive-API und reicht nur diesen Text ins
  Prompt. Das Modell stoebert NICHT selbst (Schutz vor Prompt Injection und
  unkontrolliertem Datenabfluss).

### Datenschutz-Hinweis (wichtig)
Quelltexte verlassen bei der Verarbeitung den Drive und gehen an den jeweiligen
Anbieter. Kimi (chinesischer Anbieter) wirft DSGVO-Fragen auf und sollte
standardmaessig nur fuer unkritische, selbst verfasste Inhalte freigegeben sein,
nicht fuer fremde Quelltexte. Keine Schuelerdaten verarbeiten. Serverstandort und
Nichtspeicherung klar dokumentieren (Verkaufsargument).

## 10. Die sechs Phasen

Leitprinzip: zuerst ein duenner, vollstaendiger Durchstich vom Input bis zum
fertigen Dokument, dann verbreitern.

### Phase 0 — Fundament und Spezifikation
Block-Katalog, Datenstruktur, JSON-Schema, Hausstil als Code-Constraints.
Lieferobjekt: dieses Dokument + `packages/schema`.
Natascha-Gate: ja (Kickoff, bestaetigt Blocktypen und Regeln).

### Phase 1 — Renderer (Herzstueck)
JSON rein, zwei .docx raus, Hausstil garantiert. Noch kein LLM, mit handgeschriebenem Test-JSON.
Lieferobjekt: lauffaehiger Renderer + Beispiel-Dokumente.
Natascha-Gate: ja (druckt aus, prueft Unterrichtstauglichkeit; wichtigster Test).

### Phase 2 — Ein LLM end-to-end
Erster Durchstich: einfacher Quelltext, ein Anbieter (Claude), erzwungenes JSON,
Adapter-Architektur angelegt.
Lieferobjekt: Generierung aus einem echten Quelltext.
Natascha-Gate: ja (didaktische Qualitaet der Inhalte).

### Phase 3 — Input-Flexibilitaet
Multi-Format: docx, pdf, txt, html-Upload, url. Quelltext-Aufbereitung.
Lieferobjekt: robuste Eingabe-Pipeline.
Natascha-Gate: optional.

### Phase 4 — Baukasten-UI und editierbare Vorschau
Funktionales UI. Zentral: zweispaltige Vorschau (Schueler links, Loesung rechts),
pro Block editierbar, bevor exportiert wird.
Lieferobjekt: bedienbare App.
Natascha-Gate: ja (Usability-Test, sie baut eine Schularbeit ohne Hilfe).

### Phase 5 — Ausbau
ChatGPT- und Kimi-Adapter, private Bibliothek (Drive-Backend), Sprachbefehl,
Anbindung des Korrekturrasters.
Lieferobjekt: Version 1.0.
Natascha-Gate: ja (finale Abnahme).

## 11. Pflicht-Reviews mit der menschlichen Natascha

Pflicht-Gates am Ende von Phase 0, 1, 2, 4 und 5. Kritischste Gates: Phase 1
(Hausstil und Druckbild) und Phase 4 (kann sie es allein bedienen). Ohne Abnahme
keine naechste Phase.

## 12. Offene Annahmen

- Verfuegbare Claude-Modelle aktuell: Opus 4.8 (neuestes), Opus 4.7/4.6,
  Sonnet 4.6, Haiku 4.5. Modellnamen im UI entsprechend aktualisieren.
- Plattform (Web vs. Desktop) ist noch nicht final; Architektur ist
  plattformunabhaengig gehalten, Entscheidung folgt nach Phase 4.
- Genaue Punkte-Defaults pro Blocktyp legt Natascha im Phase-0-Gate fest.

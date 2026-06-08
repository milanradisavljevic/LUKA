# [VERALTET / ARCHIVIERT] Iterationsplan bis zur Uebergabe

> Dieser Plan ist veraltet und wurde am 2026-06-01 archiviert.
> Die aktuelle Planung findet sich in `docs/agents-aufteilung.md` und `docs/fahrplan.md`.
> Die Quellen der Wahrheit sind: `produktvision.md`, `tauri-architektur.md`, `datenmodell-erweiterung.md`.

Stand: 2026-05-31. Basis: gelesener Code in `apps/web/src`, `packages/llm`, `packages/renderer`.
Ziel: vier Iterationen, danach Uebergabe an die menschliche Natascha.
Regel: Funktion und Schema werden nur dort veraendert, wo ausdruecklich genannt.
Schema-Aenderungen laufen ausschliesslich ueber Claude Code (Schema-Owner).

---

## Befund, der die Reihenfolge bestimmt

Die Vorschau (`PreviewTwoColumn.tsx`) rendert aus `state.bloecke`, also dem leeren
Skelett. Das vom LLM erzeugte `DocumentV1` mit Inhalt und Loesung entsteht erst im
Export (`useExport.ts`) und fliesst nur in die Datei, nie zurueck in den State und
nie in die Vorschau. Folge: Die Lehrkraft sieht und editiert das Skelett, nicht das
Ergebnis. Das untergraebt das Kernversprechen von Phase 4. Iteration 1 behebt das.

---

## Iteration 1: Generieren-Schritt mit zwei Vorschau-Modi (Herzstueck)

Einzige zwingende Iteration vor der Uebergabe.

**State-Design: Zwei Felder fuer Skelett und generiertes Dokument**

Der State in `apps/web/src/lib/types.ts` erhaelt zwei Felder:

```typescript
export interface AppState {
  // ... andere Felder
  bloecke: Block[];                      // Das Skelett (vom Benutzer konfiguriert)
  generiertesDokument: DocumentV1 | null; // Das generierte Dokument (mit LLM-Inhalt)
}
```

**Warum zwei Felder?**
- `state.bloecke` bleibt das Skelett, das die Lehrkraft im Baukasten konfiguriert hat
- `state.generiertesDokument` enthaelt das vollstaendige `DocumentV1` mit LLM-generierten Loesungen
- Die Zwei-Modi-Vorschau kann zwischen Skelett und gefuelltem Dokument wechseln
- Wenn die Lehrkraft zu Schritt 2 zurueckgeht, wird `generiertesDokument` auf `null` gesetzt, aber `bloecke` bleibt erhalten

**Datenfluss:**
1. Lehrkraft konfiguriert Bloecke im Baukasten → `state.bloecke` wird gefuellt
2. Lehrkraft klickt "Generieren" → `generateDocument()` erzeugt `DocumentV1` und speichert es in `state.generiertesDokument`
3. Vorschau rendert `state.generiertesDokument` (gefuellter Modus) oder `state.bloecke` (Skelett-Modus)
4. Lehrkraft editiert Bloecke in der Vorschau → Aenderungen werden in `state.generiertesDokument` geschrieben
5. Lehrkraft klickt "Exportieren" → `exportDocx()` nutzt `state.generiertesDokument`

**Funktionen:**

- "Generieren" und "Export" trennen.
- Modus A, Struktur-Vorschau (ohne KI, sofort): zeigt das Blatt mit den zugeteilten
  Aufgaben, Ueberschriften, Punkten, Aufgabengeruest und leeren Linien. Kein API-Aufruf.
- Modus B, Inhalts-Vorschau (nach Generieren): das vollstaendige `DocumentV1` wird im
  State gespeichert und gerendert. Schuelerspalte ohne Loesung, Loesungsspalte mit.
  Pro Block editierbar; Aenderungen fliessen in das generierte Dokument zurueck.
- Iterative KI-Nachbesserung pro Block: einen einzelnen Block neu generieren mit
  kurzer Anweisung ("kuerzer", "schwieriger", "anderer Aspekt"). Nur der betroffene
  Block wird ersetzt, gegen das Schema validiert.
- Entscheidungspunkt am Ende: DOCX exportieren oder PDF drucken (siehe Iteration 4
  fuer hochwertiges PDF; in Iteration 1 genuegt Druck/PDF aus der Vorschau).
- Lade- und Fehlerzustaende waehrend der Generierung.
- Danach: echter Lauf mit gesetztem `ANTHROPIC_API_KEY`, beide `.docx` ausdrucken,
  Hausstil pruefen. Das ist das Pflicht-Gate fuer Phase 1 und 2 mit Natascha.

Dateien: `Step4_Generate.tsx`, `PreviewTwoColumn.tsx`, `useExport.ts` (Generierung
vom Export trennen), `useWizard.ts` und `lib/types.ts` (State um `generiertesDokument`
erweitern), `BlockPreview.tsx`.
Empfohlener Coding-Agent: Kimi Code (UI und State). Renderer-Beruehrungen an Claude Code.

## Iteration 2: Eingabe und Korrektheitsfehler

- Quelltext-Eingabe in Schritt 1: echtes Hochladen von PDF, DOCX, TXT, HTML plus URL,
  geroutet durch `packages/input`. Aktuell nur ein Button.
- Arbeitsanweisungs-Platzhalter pro Blocktyp passend machen. Derzeit steht ueberall
  das Lueckentext-Beispiel, auch bei Multiple Choice und Schreibaufgabe.
- Tippfehler "Aufgabenblockoecke" in der Punktezeile beheben (`PointSummary.tsx`).
- Kreativitaetsregler von Rot auf den violetten Akzent umstellen (`Step3_LLMOptions.tsx`).
- Kleiner Feinschliff der Leerzustaende.

Dateien: `Step1_Input.tsx`, `packages/input`, `constants.ts`, `PointSummary.tsx`,
`Step3_LLMOptions.tsx`.
Empfohlener Coding-Agent: Kimi Code (Frontend und Input-Paket gehoeren Kimi).

## Iteration 3: Alle LLM-Anbieter, Logos, Modell-Info und Kosten

- Sechs Anbieter: Claude, ChatGPT, Kimi, Qwen, Mistral, DeepSeek.
- Implementierung: ein OpenAI-kompatibler Adapter mit Basis-URL je Anbieter deckt
  OpenAI, DeepSeek, Mistral, Qwen und Kimi ab. Anthropic bleibt eigen. So bleibt das
  `llm`-Paket schlank.
- Logos je Anbieter (offizielle Marken-SVGs, lokal unter `apps/web/src/assets`).
- Modell-Info- und Kosten-Panel: pflegbare `models`-Konfiguration mit Feldern
  `label`, `provider`, `region`, `staerken`, `kostenInputProMioToken`,
  `kostenOutputProMioToken`. Beim Wechsel des Modells im UI anzeigen.
- **Wichtig: Preise als Platzhalter.** Die Preise muessen aus den offiziellen Preisseiten
  der Anbieter verifiziert werden, nicht aus dem Gedaechtnis uebernommen. Platzhalter (`0`)
  verwenden, bis die Preise verifiziert sind.
  
  **Offizielle Preisquellen:**
  - Anthropic: https://www.anthropic.com/pricing
  - OpenAI: https://openai.com/pricing
  - DeepSeek: https://platform.deepseek.com/pricing
  - Mistral: https://mistral.ai/products/la-plateforme/
  - Qwen: https://help.aliyun.com/zh/model-studio/getting-started/models
  - Kimi: https://platform.moonshot.cn/docs/pricing/chat
  
  **Beispiel mit Platzhaltern:**
  ```typescript
  {
    label: 'Claude Opus 4',
    provider: 'anthropic',
    apiName: 'claude-opus-4-20250514',
    region: 'USA',
    staerken: ['Hoechste Qualitaet', 'Komplexe Aufgaben'],
    kostenInputProMioToken: 0, // TODO: Aus https://www.anthropic.com/pricing uebernehmen
    kostenOutputProMioToken: 0, // TODO: Aus https://www.anthropic.com/pricing uebernehmen
  }
  ```
  
  **Akzeptanzkriterium:** Alle Preise sind entweder verifiziert (mit Quelle als Kommentar)
  oder `0` (als Platzhalter).

- Datenschutz-Kennzeichnung im Panel: Mistral als EU-Anbieter (DSGVO-freundlich)
  hervorheben; Qwen, DeepSeek, Kimi als chinesische Anbieter mit Hinweis; ChatGPT USA.

Dateien: `packages/llm` (neuer `provider-openai-compatible.ts`, Registry erweitern),
`apps/web/src/components/Step3_LLMOptions.tsx`, neue `apps/web/src/lib/models.ts`,
`apps/web/src/assets`.
Empfohlener Coding-Agent: OpenCode #1 fuer die Adapter im `llm`-Paket, Kimi Code fuer
das Info-Panel und die Logos im Frontend.

## Iteration 4: Korrekturraster, hochwertiges PDF, Uebergabe-Feinschliff

**Vorbedingung: Plattformentscheidung treffen**

Bevor der PDF-Export umgesetzt wird, muss geklaert werden:
- **Web-App (reiner Browser):** PDF-Export nur manuell durch die Lehrkraft (DOCX in
  Word/LibreOffice oeffnen, als PDF drucken). Die UI zeigt einen Hinweis mit Anleitung.
- **Desktop-App (Electron/Tauri):** PDF-Export mit eingebettetem LibreOffice oder pandoc.
  Erfordert Installer und ~200 MB zusaetzliche Binaries.
- **Hybrid:** Web-App mit optionalem Node-Backend (z.B. als Docker-Container oder lokaler
  Service). Komplexer, aber flexibel.

**Empfehlung:** Fuer den MVP reicht die Web-App mit manuellem PDF-Export. Der Button
"PDF exportieren" in der UI zeigt dann einen Modal-Dialog mit Anleitung: "Bitte oeffnen
Sie die heruntergeladenen DOCX-Dateien in Word oder LibreOffice und drucken Sie als PDF."

**Umsetzung (nach Plattformentscheidung):**
- Web-App: Modal-Dialog mit Anleitung, kein technischer PDF-Export
- Desktop-App: Neues Paket `packages/pdf` mit `convertDocxToPdf()`, das LibreOffice
  headless oder pandoc aufruft
- Hybrid: Backend-Service mit LibreOffice, Frontend sendet DOCX per POST

**Korrekturraster: Integration statt Neubau**

Das Korrekturraster ist bereits vollstaendig implementiert in `packages/qa/src/korrekturraster/`:
- `builder.ts`: Baut das `RasterInput` aus `DocumentV1`
- `kataloge.ts`: Kriterienkataloge fuer jeden Blocktyp
- `notenschluessel.ts`: AHS-Notenschluessel-Berechnung
- `types.ts`: Typen fuer `RasterInput`, `RasterBlock`, etc.
- Tests und fertige `_raster.docx`-Dateien fuer jeden Blocktyp

**Aufgabe:** Die Web-App muss das bestehende Raster nutzen koennen.

**Option A: Raster bleibt in `packages/qa/`**
- Die Web-App importiert `@lehrunterlagen/qa` und ruft `buildKorrekturraster(document)` auf
- Vorteil: Keine Code-Duplikation, `qa` ist das natuerliche Zuhause fuer Bewertungslogik
- Nachteil: `qa` hat aktuell keine Abhaengigkeiten auf `schema`, muss ggf. angepasst werden

**Option B: Raster wandert nach `packages/renderer/`**
- `builder.ts`, `kataloge.ts`, `notenschluessel.ts` werden nach `packages/renderer/src/korrekturraster/`
  verschoben
- Vorteil: `renderer` ist das Paket fuer alle Ausgabeformate (DOCX, PDF, Raster)
- Nachteil: Code-Migration, Tests muessen angepasst werden

**Empfehlung:** Option A (Raster bleibt in `qa`), weil:
- Die Logik ist bereits getestet und funktioniert
- `qa` ist semantisch korrekt (Qualitaetsbewertung)
- Die Web-App kann `@lehrunterlagen/qa` als Dependency hinzufuegen

**Umsetzung:**
1. `packages/qa/package.json`: `@lehrunterlagen/schema` als Dependency hinzufuegen
2. `apps/web/package.json`: `@lehrunterlagen/qa` als Dependency hinzufuegen
3. `apps/web/src/hooks/useExport.ts`: `exportKorrekturraster` hinzufuegen, das
   `buildKorrekturraster` aus `@lehrunterlagen/qa` aufruft
4. `apps/web/src/components/Step4_Generate.tsx`: Button "Korrekturraster exportieren" hinzufuegen

**Weitere Funktionen:**
- Hochwertiges PDF: DOCX bleibt das Master-Format, PDF entsteht als Ableitung mit
  identischem Hausstil (Konvertierung statt separatem Layout). Siehe Plattformentscheidung oben.
- Export-Dateien als visuelle Karten plus Zeitschaetzung (`Step4_Generate.tsx`).
- Abschluss: Phase-4-Usability-Test, bei dem Natascha eine echte Schularbeit ohne
  Hilfe baut. Das ist das Uebergabe-Gate.

Dateien: `packages/qa` (Raster bleibt dort, Dependency auf `schema` hinzufuegen),
`packages/pdf` (nur bei Desktop/Hybrid), `Step4_Generate.tsx`.
Empfohlener Coding-Agent: Claude Code (Renderer-Owner, nutzt die docx- und pdf-Skills
fuer Dokumenttreue).

---

## Akzeptanzkriterien (Uebergabe)

- Struktur-Vorschau ohne API-Aufruf korrekt; Inhalts-Vorschau zeigt LLM-Inhalt,
  Schueler ohne, Loesung mit Loesungen.
- Iterative Nachbesserung pro Block funktioniert und bleibt schema-konform.
- Echter Lauf erzeugt zwei `.docx` mit gefuellten Loesungen im Hausstil; PDF identisch.
- Sechs Anbieter waehlbar; Modell-Info und Kosten sichtbar; Datenschutz gekennzeichnet.
- Korrekturraster als drittes Dokument erzeugbar.
- Funktion und Schema unveraendert, ausser an den genannten Stellen; Tests gruen.

## Empfehlung Coding-Agent gesamt

Frontend- und State-Arbeit (Iteration 1, 2 und die UI-Teile von 3): Kimi Code, der
die Oberflaeche bereits gut kennt. Adapter im `llm`-Paket (Iteration 3): OpenCode #1.
Renderer, Korrekturraster und PDF (Iteration 4): Claude Code wegen der Modul-Ownership
und der Dokumenttreue.

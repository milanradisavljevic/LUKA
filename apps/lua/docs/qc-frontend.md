# QC-Bericht Frontend (apps/web) und Diff zum Mockup

Stand: 2026-05-31. Basis: Lesung des tatsaechlichen Codes in `apps/web/src`.
Zweck: Handlungsvorlage zur Umsetzung mit einem Coding-Agent (Kimi).
Wichtig: Nur Optik und Verdrahtung. Die Funktion und das Schema NICHT veraendern.

---

## 1. Einordnung

Der funktionale Stand ist weiter als der erste Eindruck. Vorhanden und in Ordnung:
- vierstufiger Ablauf (`useWizard.ts`), Drag-and-Drop-Reihenfolge (`Step2_Baukasten.tsx`)
- vollstaendige Konfigurationspanels fuer alle sechs Blocktypen mit Inline-Validierung,
  die die Zod-Regeln spiegelt (`BlockConfigPanel.tsx`)
- zweispaltige editierbare Vorschau (`PreviewTwoColumn.tsx`), Export-Hook (`useExport.ts`)
- Stufen-Gating der Blocktypen und der Wortbank (`constants.ts`)
- Vorlagen (`TemplateManager.tsx`), Befehlspalette mit Ctrl+K (`CommandPalette.tsx`)
- Design-Tokens treffen den Hausstil exakt (`index.css`): Arial, Schwarz, #595959, #BFBFBF

Die Luecke zum Mockup ist also fast rein visuell und strukturell.

---

## 2. Offene Strukturentscheidung (zuerst klaeren)

Das Mockup ist eine einspaltige Arbeitsflaeche: dunkle Sidebar links, drei Spalten
(Metadaten, Baukasten, LLM und Export) gleichzeitig sichtbar. Der Build ist ein
gefuehrter Assistent, der immer nur einen Schritt zeigt.

Entscheidung noetig:
- Option A: Assistent beibehalten, nur visuell veredeln (kleiner Aufwand).
- Option B: Auf die Arbeitsflaeche des Mockups umstellen (groesserer Umbau von `App.tsx`
  und der Schritt-Komponenten).
- Option C (empfohlen): Arbeitsflaeche am Desktop, Assistent am schmalen Bildschirm.

Der Rest dieses Berichts gilt unabhaengig von der Wahl. Die mit (B) markierten Punkte
betreffen nur den Umbau zur Arbeitsflaeche.

---

## 3. Diff zum Mockup (visuell und strukturell)

### 3.1 App-Rahmen und Navigation
- [ ] Linke dunkle Sidebar ergaenzen: Marke "Natascha / Lehrunterlagen-Generator",
      Navigationspunkte (Neue erstellen, Meine Unterlagen, Vorlagen, Verlauf, Favoriten,
      Papierkorb, Einstellungen, API-Schluessel, LLM-Anbieter, Hilfe, Feedback),
      Versionsangabe unten. Punkte ohne Zielseite vorerst als deaktivierte Platzhalter.
- [ ] Kopfleiste rechts oben: Profil, Hilfe, Einstellungen.
- Dateien: `App.tsx`, neue `components/Sidebar.tsx`, `App.css`.

### 3.2 Baukasten
- [ ] Blockauswahl von Dropdown auf anklickbare Kartengalerie umstellen (Icon, Name,
      Kurzhinweis je Typ, z. B. "Wortbank nur Unterstufe").
- [ ] Farbige Nummern-Badges fuer die Bloecke in der aktuellen Reihenfolge.
- Dateien: `Step2_Baukasten.tsx`, `BlockCard.tsx`, `constants.ts` (BLOCK_TYPE_DEFS um
      Icon und Farbe ergaenzen).

### 3.3 LLM-Schritt
- [ ] Drei Anbieterkarten nebeneinander statt gestapelter Radios, mit Logo je Anbieter.
- [ ] Kreativitaets-Schieberegler ergaenzen (0..1). Der Adapter unterstuetzt `kreativitaet`
      bereits, das Bedienelement fehlt nur.
- [ ] Ausgabe-Sprache-Dropdown ergaenzen.
- [ ] Datenschutz-Hinweis beibehalten (gute Ergaenzung, war nicht im Mockup).
- Dateien: `Step3_LLMOptions.tsx`, `lib/types.ts` (State um `kreativitaet` und
      `ausgabeSprache` erweitern), `useWizard.ts` (Default-Werte).

### 3.4 Export und Vorschau
- [ ] Rechte Spalte bzw. Export-Bereich: die beiden Ausgabedateien als Karten
      (Schuelerfassung.docx, Loesung.docx), prominenter Generieren-Button mit Zeitschaetzung.
- Datei: `Step4_Generate.tsx`.

### 3.5 Visuelles
- [ ] Akzentfarbe von Google-Blau (#1a73e8) auf das Violett des Mockups umstellen
      (Richtwert ~ #5b5bd6). Nur `--color-accent` in `index.css` aendern, der Rest folgt.
- [ ] Inline-Styles schrittweise in CSS-Klassen oder kleine Komponenten ueberfuehren,
      damit das Layout pflegbar wird.
- [ ] Weichere Schatten, mehr Innenabstand, abgesetzte Karten, Icons.
- Dateien: `index.css`, `App.css`, betroffene Komponenten.

---

## 4. Integrations-Risiken (wichtiger als Optik, zuerst beheben)

### 4.1 Anbieter-Kennungen passen nicht zusammen
Das UI nutzt `claude`, `chatgpt`, `kimi` (`constants.ts`).
Das `llm`-Paket nutzt `anthropic`, `openai`, `kimi` (`packages/llm/src/types.ts`).
- [ ] Mapping am Aufrufrand einfuehren (UI-Kennung -> Adapter-Kennung). Vorschlag:

```ts
const PROVIDER_MAP = { claude: 'anthropic', chatgpt: 'openai', kimi: 'kimi' } as const;
```
- Datei: `useExport.ts` bzw. die Stelle, die `generateDocument` aus `@lehrunterlagen/llm` aufruft.

### 4.2 Modellnamen sind Anzeigenamen, der Adapter braucht API-Strings
UI zeigt `Opus 4.8`, `Sonnet 4.6`, `Haiku 4.5` (`constants.ts`).
Der Adapter braucht z. B. `claude-sonnet-4-6`.
- [ ] Mapping ergaenzen:

```ts
const MODEL_MAP: Record<string, string> = {
  'Opus 4.8': 'claude-opus-4-8',
  'Opus 4.7': 'claude-opus-4-7',
  'Sonnet 4.6': 'claude-sonnet-4-6',
  'Haiku 4.5': 'claude-haiku-4-5-20251001',
  'GPT-4o': 'gpt-4o',          // Phase 5
  'kimi-latest': 'kimi-latest', // Phase 5
};
```
- [ ] Default-Modell von `Haiku 4.5` auf `Sonnet 4.6` aendern (Generierungsqualitaet).
- Dateien: `useWizard.ts` (INITIAL_STATE.modelName), `useExport.ts` (Mapping).

### 4.3 End-to-end-Verdrahtung pruefen
- [ ] Sicherstellen, dass `useExport.ts` zuerst `generateDocument(...)` aus
      `@lehrunterlagen/llm` aufruft (Inhalt und Loesung erzeugen, gegen Schema validiert)
      und erst das Ergebnis an den Renderer uebergibt. Sonst werden nur die leeren
      Skelett-Bloecke gerendert und die Loesungen bleiben leer.
- Erwarteter Ablauf:
  `Skelett-Bloecke + Quelltexte -> generateDocument -> DocumentV1 -> Renderer -> 2x .docx`.
- Dateien: `useExport.ts`, Abhaengigkeit auf `@lehrunterlagen/llm` und `@lehrunterlagen/renderer`.

---

## 5. Reihenfolge der Umsetzung (Empfehlung)

1. Abschnitt 4 zuerst (Integrations-Risiken). Ohne die Verdrahtung ist die Optik egal.
2. Strukturentscheidung aus Abschnitt 2 treffen.
3. Akzentfarbe und Stilschicht (4.x in Abschnitt 3.5), schneller sichtbarer Gewinn.
4. LLM-Schritt (3.3), dann Baukasten-Galerie (3.2), dann Sidebar (3.1), dann Export (3.4).

## 6. Akzeptanzkriterien
- Ein echter Lauf erzeugt zwei .docx mit gefuellten Loesungen (nicht leer).
- Anbieter- und Modellwahl im UI fuehren ohne Fehler zum richtigen API-Aufruf.
- Kreativitaetsregler und Ausgabesprache sind bedienbar und wirken.
- Optik nahe am Mockup: Sidebar, violetter Akzent, Kartengalerie, drei Anbieterkarten.
- Funktion und Schema unveraendert; Tests bleiben gruen.

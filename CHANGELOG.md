# Changelog

Alle nennenswerten Änderungen an **lehr-suite** (NATASCHA × LUA Integration).
Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/).
Neueste Einträge oben. Bitte bei jeder substanziellen Änderung hier ergänzen
(auch andere Coding-Agents) — siehe `AGENTS.md`.

## [Unreleased]

### Added — Schulstufen-Granularität 5–12 im Kompetenz-Modus (Welle B)
- `apps/lua/packages/schema/src/index.ts`: `SCHULSTUFEN`, `stufeFromSchulstufe(s)`
  und optionales `schulstufe`-Feld an `DeskriptorSchema`, `StoffItemSchema`,
  `MetaSchema` und `AuftragSchema`.
- `apps/lua/apps/web/src/lib/stoffkatalog/index.ts`: `listStoffItems` und
  `listDeskriptoren` mit optionalem `schulstufe`-Parameter und Fallback-Regel
  (exakte Schulstufe ODER grobe Stufe, wenn keine Schulstufe angegeben).
- `apps/lua/apps/web/src/views/KompetenzView.tsx`: Schulstufen-Wähler 5–12
  plus „ganze Unter-/Oberstufe"; `stufe` bleibt synchron; `schulstufe` fließt
  in `meta`/`auftrag` ein.
- `apps/lua/packages/llm/src/prompt.ts`: altersgenauer `zielgruppeHinweis` mit
  konkreter Schulstufe/Klasse AHS, wenn `meta.schulstufe` gesetzt.
- `apps/lua/packages/schema/src/schema.test.ts`: Tests für `schulstufe` und
  `stufeFromSchulstufe`.
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck &&
  `pnpm -r test` grün (Schema 141, LLM 126, Renderer 38, Input 17, QA 103, Web 67).

### Added — Multi-Kompetenz-Auswahl im Kompetenz-Modus (Welle A)
- `apps/lua/apps/web/src/views/KompetenzView.tsx`: Stoff-Item-Auswahl von
  Single-`<select>` auf Checkbox-Kacheln (gruppiert nach Kompetenzbereich)
  umgestellt; mehrere Items gleichzeitig wählbar.
- State `stoffItem` → `stoffItemIds`; `handleErstellen` übergibt das Array an
  `meta`/`auftrag`; `thema`-Fallback nutzt das erste gewählte Item.
- `toggleStoffItem`: Thema-Prefill nur bei exakt einer Auswahl, sonst Typen
  aus `defaultAufgabentypen` aller gewählten Items in `gewuenschteTypen` mergen.
- `apps/lua/packages/llm/src/prompt.ts`: Verzahnungs-Anweisung im
  Kompetenz-Zweig — mehrere `stoffItems` sollen organisch in EINEM Arbeitsblatt
  umgesetzt werden, keine getrennten Teilblätter.
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck &&
  `pnpm -r test` grün (Schema 133, LLM 126, Renderer 38, Input 17, QA 103, Web 67).

### Added — Phase-0 Launch-Härtung (Generator-only, NATASCHA gegated)
- `apps/lua/apps/web/src/lib/features.ts`: neues Feature-Flag `FEATURES.natascha = false`.
- `apps/lua/apps/web/src/components/Sidebar.tsx`: NATASCHA-Nav-Items
  (`klassen`, `korrektur`, `schueler`, `erwartungshorizont`) ausgeblendet, wenn
  `FEATURES.natascha` aus ist.
- `apps/lua/apps/web/src/views/DashboardView.tsx`: NATASCHA-Klassenstats/-Widgets
  nur noch bei `FEATURES.natascha`.
- `apps/lua/apps/web/src/components/Step0_Absicht.tsx`: Closed-Loop-Einstieg
  (`consumePendingUebung`, `FehlerKuration`, NATASCHA-Export-Sektion) gegated.
- `apps/lua/apps/web/src/App.tsx`: NATASCHA-Views landen bei ausgeschaltetem
  Flag auf dem Dashboard; First-Run-Onboarding-Gate verlangt mindestens einen
  API-Key, bevor die App bedienbar wird (nur Tauri).
- `apps/lua/apps/web/src/hooks/usePdfExport.ts` +
  `apps/lua/apps/web/src/components/Step4_Generate.tsx`: LibreOffice-Verfügbarkeit
  abfragen (Command vom Chief) — PDF-Button nur anzeigen, sonst dezenter Hinweis.
- `apps/lua/apps/web/src/components/SettingsPanel.tsx`: optionales
  `onKeySaved`-Callback für das Onboarding-Gate.
- `apps/lua/apps/web/src/views/TrashView.tsx`: freundlicherer Leerzustand mit
  Aktion „Neue Übung erstellen".
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck &&
  `pnpm -r test` grün (Schema 132, LLM 126, Renderer 38, Input 17, QA 103, Web 67).

### Added — Rollenkarten-Set UI-Editor
- `apps/lua/apps/web/src/lib/constants.ts`: Baukasten-Kachel „Rollenkarten-Set"
  (`Layers`-Icon) + Freigabe für Unter- und Oberstufe.
- `apps/lua/apps/web/src/components/BlockConfigPanel.tsx`: Neuer Zweig für
  `rollenkartenSet` — Rahmen, Zeit pro Paar, KI/Manuell-Toggle, editierbare
  Rollenliste (2–3 Rollen), Szenario-Anzahl (1–15), manuelle Szenario-Titel
  und Toggles für Schnittlinie/Team-Feld.
- `apps/lua/apps/web/src/lib/commands.ts`: Schnell-Einfügen-Befehl für
  „Rollenkarten" / „rollenkartenSet".
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck &&
  `pnpm -r test` grün (Schema 132, LLM 126, Renderer 38, Input 17, QA 103, Web 67).

### Added — Rollenkarten-Set-Modus (Sprech-Differenzierung) — Fundament (Chief)
- Neuer Blocktyp `rollenkartenSet`: EINE Rollen-Struktur (2–3 Rollen) × N Szenarien — jedes
  Schüler-Paar bekommt ein eigenes Szenario mit gleicher Rollenmechanik (Reporter/Experte-Muster
  aus Nataschas „Disaster Reports"-Vorlage).
- schema: neue Block-/Rollen-/Szenario-Schemata + Union + BlockTyp-Enum + Tests.
- prompt: Beschreibungs-Sektion + Few-Shot (aus der Referenz-DOCX) + Preserve-Regel (manuelle
  Szenario-Titel/Rollen bleiben wortgleich).
- renderer: `buildRollenkartenSet` — Karten als gerahmte Tabellen (Rolle + Team-Feld, Szenario,
  Fakten, Sprech-Reihenfolge, Inhalts-Bullets, Sprach-Hinweis), Schnittlinie zwischen Paaren.
- qa: `rollenkartenSet` erzeugt kein Korrekturraster (Sprechprodukt). normalize: leere Punkte gefiltert.
- web: createDefaultBlock + Labels + blockToRequest (BlockRequest-Variante) — Generierung lauffähig.
- Live-Smoke (DeepSeek): Rahmen + 4 Szenarien × 2 Rollen × 4 Punkte, gerendert. UI-Editor (BlockConfigPanel,
  Baukasten-Kachel) = Kimi.

### Added — Gesourcte Lehrplan-Recherche in Stoffkatalog integriert (Task 2)
- `apps/lua/scripts/generate-stoffkatalog-from-research.mjs`: `--only`-Filter,
  `--output`-Verzeichnis wird rekursiv angelegt, `DEFAULT_AUFGABENTYPEN`-Mapping
  je Kompetenzbereich (1–2 BlockTyp-Werte pro StoffItem).
- `apps/lua/scripts/merge-language-stoffkatalog.mjs`: neues Merge-Skript für
  Sprachfächer; ersetzt Skill-Blöcke aus `docs/lehrplan-quellen/` und behält
  kuratierte Grammatik-/Wortschatz-/Sprachmittlungs-/Literatur-Blöcke bei.
- Sachfächer `ethik`, `geschichte`, `geographie`, `philosophie` vollständig aus
  den Recherche-JSONs neu generiert (Voloverwrite, verlustfrei).
- Sprachfächer `deutsch`, `englisch`, `franzoesisch`, `italienisch`, `spanisch`
  gemerged: gesourcte Skill-Deskriptoren + erhaltene kuratierte Spezialbereiche.
- `latein`, `religion`, `psychologie` nachträglich aus `docs/lehrplan-quellen/`
  generiert; Mapping um Latein-/Religions-/Psychologie-Kompetenzbereiche erweitert.
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck &&
  pnpm -r test` grün (Schema 129, LLM 126, Renderer 38, Input 17, QA 103, Web 64).

### Added — SRDP-Matura-Modus (Task 1, Deutsch + Englisch)
- `packages/schema/src/index.ts`: neuer Unterlagentyp `'matura'` + `PROFILE.matura`
  (SRDP-Struktur, K1/K3-Hinweis, Raster + Notenschlüssel, ~270 Min).
- `packages/renderer/src/template.ts`: nüchternes Render-Template `'srdp'` (formell, s/w).
- `packages/qa/src/korrekturraster/`: SRDP-Deutsch-Katalog (K1 Inhalt/Textstruktur, K3
  Ausdruck/Sprachnormen); `waehleKatalog` routet bei `typ==='matura'` (DE → SRDP, EN → Open Writing).
- `packages/llm/src/prompt.ts`: `maturaHinweis` (SRDP-Format je Fach) in beide Prompt-Pfade.
- `apps/web/src/components/Step0_Absicht.tsx`: Unterlagentyp-Kachel „Matura (SRDP)" +
  automatische Vorwahl des `srdp`-Templates.
- `apps/lua/scripts/srdp-smoke.mjs`: Live-Smoke DE + EN (DeepSeek) — K1/K3- bzw. Open-Writing-Raster.
- Tests: schema (matura-Profil + Skelett), qa (matura → SRDP/Open-Writing). Schema 129, QA 103.

### Added — In-App-Auto-Fetch Ausgangstext (Task 4b UI)
- `apps/lua/apps/web/src/hooks/useNatascha.ts`: neuer `quelltextGet(klasse, aufgabe)`-Getter,
  ruft `natascha_quelltext_get` (Chief: Rust/Python) ab und liefert den gespeicherten Ausgangstext.
- `apps/lua/apps/web/src/views/KlassenView.tsx`: `handleGenerateUebung` ist jetzt async und
  befüllt `prefill.ausgangstext` mit dem Ausgangstext der gewählten Klasse/Aufgabe.
- `apps/lua/apps/web/src/views/SchuelerView.tsx`: `handleGenerateUebung` holt den Ausgangstext
  der jüngsten Aufgabe aus dem Längsschnitt (`laengsschnitt.verlauf`) und setzt ihn in den Prefill.
- Step0 konsumiert den Ausgangstext bereits als Quelltext — Closed Loop damit komplett.

### Added — Quick-Übung als eigener 1-Screen (Task 3b)
- `apps/lua/apps/web/src/lib/types.ts`: `ActiveView` um `'quick'` erweitert.
- Neue `apps/lua/apps/web/src/views/QuickExerciseView.tsx`: Eingaben Thema, Fach, Stufe,
  Aufgabentyp (nach Stufe gefiltert) → `buildSkelett` → sofortiger Sprung in den Baukasten.
- `apps/lua/apps/web/src/App.tsx`: View-Route + Titel für `quick` eingetragen.
- `apps/lua/apps/web/src/components/Sidebar.tsx`: Sidebar-Eintrag „Schnell-Übung" (Zap-Icon).
- `apps/lua/apps/web/src/views/DashboardView.tsx`: Dashboard-Kachel „Eigene Schnell-Übung".

### Added — Einheitliche Empty-States für leere Views (Task 3a)
- Neue wiederverwendbare `EmptyState`-Komponente in `apps/web/src/views/_EmptyState.tsx`
  (Icon + Titel + Beschreibung + optional CTA), orientiert am bestehenden Muster in
  `_DocumentList.tsx`.
- `HistoryView.tsx`: Aufgewerteter Leerzustand mit CTA „Neue Übung erstellen".
- `KlassenView.tsx`: Freundliche Leerzustände für „Noch keine Klassen", „Keine Noten",
  „Keine Fehlerdaten" und „Wähle eine Klasse".
- `SchuelerView.tsx`: Leerzustände für „Noch keine Klassen", „Keine Schüler in dieser
  Klasse" und „Wähle eine Klasse und einen Schüler".
- `App.tsx`: `onCreateNew` an `HistoryView` durchgereicht.
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test`
  grün (Schema 127, LLM 126, Renderer 38, Input 17, QA 101, Web 64).

### Added — Kompetenz-Modus: Sachfach-Stoffkataloge Welle 2
- Neue Fach-Kataloge für die 6 Sachfächer in `apps/web/src/lib/stoffkatalog/`:
  `geschichte.ts`, `geographie.ts`, `religion.ts`, `ethik.ts`, `psychologie.ts`,
  `philosophie.ts`. Jeder Katalog hält je Stufe (Unter-/Oberstufe) Deskriptoren
  und Stoff-Items pro Kompetenzbereich (exakte Namen aus `KOMPETENZBEREICHE`
  in `@lehrunterlagen/schema`).
- `apps/web/src/lib/stoffkatalog/index.ts`: Alle neuen Fächer in die
  Aggregat-Arrays `DESKRIPTOREN` und `STOFF_ITEMS` eingetragen.
- Deskriptoren sind als kuratierte Entwürfe gekennzeichnet (`quelle` =
  „Entwurf, angelehnt an BMBWF-Lehrplan AHS <Fach> …").
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test`
  grün (Schema 127, LLM 126, Renderer 38, Input 17, QA 101, Web 64).

### Added — Neuer Aufgabenblock: Rollenspiel (Roleplay)
- `packages/schema/src/index.ts`: Neuer `RoleplayBlock` mit Situation, Setting,
  Ziel, Zeitvorgabe, gemeinsamen + rollenspezifischen Redemitteln, 2–4 Rollen,
  Bewertungs-Checkliste und Lösung (Musterdialog + Lehrerhinweise). Der Block
  trägt immer 0 Punkte (reine Sprechübung).
- `packages/llm/src/prompt.ts`: System-Prompt, Beispiel-JSON und
  Manuell/Hybrid-Instruktionen für Rollenspiele.
- `packages/llm/src/normalize.ts`: `normalizeRoleplay` bereinigt Rollen,
  Redemittel, Bewertung und Zeitangaben aus LLM-Antworten.
- `packages/renderer/src/index.ts`: `buildRoleplay` rendert Schülerfassung mit
  Situation/Ziel/Zeit, gemeinsamer Wortbank und gerahmten Ausschneide-Karten pro
  Rolle; Lösung zeigt Musterdialog und Hinweise.
- `apps/web/src/components/BlockConfigPanel.tsx`: Vollständiger Editor für
  Rollenspiele inkl. KI/Manuell-Umschalter, Rollen-Editor und Redemittel-Listen.
- `apps/web/src/components/BlockPreviewRoleplay.tsx` + `BlockPreview.tsx`:
  Live-Vorschau der Rollenkarten und des Musterdialogs.
- `apps/web/src/lib/constants.ts`: Rollenspiel in Block-Typ-Definitionen und
  Stufen-Regeln (Unter-/Oberstufe) aufgenommen.
- `apps/web/src/hooks/useGenerate.ts`: Roleplay-Blöcke werden korrekt in den
  LLM-Generate-Input überführt (Hybrid-Modus unterstützt).
- `packages/qa/src/korrekturraster/builder.ts`: Rollenspiele liefern ein leeres
  Korrekturraster (keine schriftliche Bewertung).
- `docs/ANLEITUNG.md` + `apps/web/src/views/HelpView.tsx`: Dokumentation des
  neuen Blocktyps mit Best Practices und Beispiel.
- Tests: Schema-Validierung, Normalizer, Renderer, BlockDefaults.

### Added — Selbsteinschätzungsbogen (Quick Win #5)
- `packages/renderer/src/index.ts`: `renderSelbsteinschaetzungToBlob(raster, lernziele, template)`
  — ein DOCX, das Schüler/innen VOR der Abgabe ausfüllen. Aussagen aus Lernzielen
  („Ich kann: …") + eindeutigen Raster-Kriterien, 3-stufige Skala (sicher/teilweise/
  unsicher) + Reflexionszeilen. Kein LLM, fach-lokalisiert (DE/EN).
- `apps/web/src/hooks/useExport.ts`: `exportSelbsteinschaetzung(state)` (buildRaster +
  Lernziele → Blob, Dateiname `…_Selbsteinschaetzung.docx`).
- `apps/web/src/components/Step4_Generate.tsx`: Knopf „Selbsteinschätzungsbogen"
  im Akkordeon „Weitere Exporte & Werkzeuge".

### Added — Früh-Warnung bei fehlendem API-Key
- `apps/web/src/components/Step3_LLMOptions.tsx`: prüft beim Provider-Wechsel, ob ein
  Key im Keychain liegt; sonst Hinweis + Direkt-Button zu den Einstellungen (statt
  erst beim Generieren zu scheitern).
- `PROVIDER_KEY_IDS` nach `lib/constants.ts` ausgelagert/exportiert (gemeinsames
  Mapping UI-Provider → Keychain-ID, verhindert falsch-negative Warnungen bei claude/chatgpt).

### Added — UX-Friction: Quelltext wird optional für kleine Übungen
- `apps/web/src/components/Step1_Input.tsx`: Button „Ohne Quelltext fortfahren",
  wenn noch keine Quelltexte vorhanden sind.
- `apps/web/src/components/Step0_Absicht.tsx`: Neue Schnellstart-Kachelreihe
  „Schnell ohne Quelltext" für Kreuzworträtsel, Vokabeltest, Fehlerkorrektur.
- `apps/web/src/views/DashboardView.tsx` + `apps/web/src/App.tsx`: Shortcuts
  „Schnell ohne Quelltext" auf dem Dashboard; jeder Shortcut startet den Wizard
  direkt im Baukasten mit passendem Blocktyp und leeren Quelltexten.
- `packages/llm/src/prompt.ts`: Wenn `quelltexte` leer ist, bekommt das LLM
  explizit die Instruktion, Inhalte aus Thema + manuellen Vorgaben zu erfinden.
- `packages/schema/src/index.ts`: `DocumentSchema` erlaubt jetzt leere
  `quelltexte` auch im Text-Modus; entsprechender Test angepasst.
- `apps/lua/scripts/quick-exercise-smoke.mjs`: Echter LLM-Smoke-Test für den
  neuen Pfad ohne Quelltext (mit DeepSeek verifiziert).

### Added — F1: Quelltext-Check in Schritt 1
- `apps/web/src/lib/quelltextInfo.ts`: Heuristik für Wortzahl, Satzzahl und
  durchschnittliche Satzlänge ohne LLM.
- `apps/web/src/components/Step1_Input.tsx`: Pro Quelltext wird angezeigt:
  „{woerter} Wörter · Ø {schnitt} W/Satz · {hinweis}" mit Stufen-Einschätzung.
- `apps/web/src/lib/quelltextInfo.test.ts`: 7 Tests für kurze/mittlere/lange Sätze,
  leeren Text, Einzelsatz und Wortzahl-Extreme.

### Added — F3: Selbstlern-Variante (Übung + Lösungsteil in einem DOCX)
- `packages/renderer/src/index.ts`: `buildDocumentChildren` aus `buildDocxPacked`
  herausfaktorisiert; neue `renderSelbstlernToBlob` erzeugt ein DOCX mit
  Schülerfassung, Seitenumbruch und Lösungsteil (inkl. Englisch-Variante
  „Solutions").
- `apps/web/src/hooks/useExport.ts`: Neue `exportSelbstlern(state)` mit Dateiname
  `{datum}_{thema}_Uebung-mit-Loesung.docx`.
- `apps/web/src/components/Step4_Generate.tsx`: Button „Übung mit Lösungsteil" in
  der Export-Spalte.
- `packages/renderer/src/renderer.test.ts`: 2 Smoke-Tests für die Selbstlern-Variante.
- **Hinweis:** Chief-Review vor Merge empfohlen (Renderer-Refactor).

### Added — Vertrauens-Badge: „Lösungen prüfen" im Haupt-Modus
- `packages/llm/src/judge.ts` (Basis `921935a`): `runJudge` + `istRisikoTyp` exportiert.
- `apps/web/src/hooks/useGenerate.ts`: Neue `pruefeLoesungen(state)` mit `llm_complete`-Invoke,
  `runJudge`-Aufruf und Ladezustand `pruefend`.
- `apps/web/src/components/Step4_Generate.tsx`: Button „Lösungen prüfen" (nur bei
  `canExport`), Summenzeile „X geprüft · Y auffällig", Judge-Ergebnis wird an
  `PreviewTwoColumn` durchgereicht.
- `apps/web/src/components/PreviewTwoColumn.tsx`: Pro Risiko-Block (`multipleChoice`,
  `matching`, `lueckentext`, `offeneVerstaendnisfrage`) erscheint nach Prüfung ✓
  „Lösung geprüft" oder ⚠ „bitte prüfen" mit Tooltip der Befunde. Kein Extra-Call
  bei normaler Generierung.

### Added — Kimi-Specs Runde 2 (2026-06-17)
- `docs/ANLEITUNG.md`: Neue standalone-Anleitung, die alle 14 Hilfe-Abschnitte aus der
  In-App-Hilfe als reines Markdown abbildet (zum Ausdrucken/Onboarding außerhalb der App).
- `apps/web/src/components/PreviewTwoColumn.tsx`: Warnung vor Datenverlust beim
  „Neu generieren" einer manuell bearbeiteten Aufgabe via `window.confirm`;
  Bearbeitung wird bei Abbruch beibehalten.
- `apps/web/src/components/Step4_Generate.tsx`: Nach „3 Niveaus erzeugen" wird die
  Vorschau wieder auf die Mittel-Fassung zurückgesetzt, während die drei Exporte
  (`_leicht`, `_mittel`, `_schwer`) korrekt erzeugt werden.
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test`
  grün (Schema 118, LLM 123, Renderer 33, Input 17, QA 96, Web 54).

### Added — Kompetenz-Modus: Freitext-Kompetenz + „ohne Quelltext"-Tür
- `packages/schema/src/index.ts`: Neues optionales Feld `freieKompetenz` in `MetaSchema` und
  `AuftragSchema` — additiv, kein Breaking Change.
- `apps/web/src/views/KompetenzView.tsx`: Prominentes Freitextfeld für Kompetenz oder Thema;
  Katalog-Dropdown ist jetzt optional. Generierung möglich mit Freitext, Katalog-Item oder beiden.
- `apps/web/src/hooks/useGenerate.ts`: Guard akzeptiert `stoffItemIds` ODER `freieKompetenz`;
  bei Freitext wird ein synthetisches `StoffItem` erzeugt, das Prompt + Judge kontextualisiert.
  Judge-Anbieter auf DeepSeek (`deepseek-chat`) umgestellt; Fallback-Reihenfolge DeepSeek zuerst.
- `apps/web/src/components/Step4_Generate.tsx` + `apps/web/src/hooks/useExport.ts`: Bei rein
  freier Kompetenz (kein Katalog-Item) wird kein Coverage-Panel und kein
  „Kompetenznachweis exportieren" angeboten — stattdessen Hinweis „frei definiert, kein
  formaler Lehrplan-Nachweis".
- `apps/web/src/components/Step4_Generate.tsx`: `canGenerate` ist jetzt modus-bewusst:
  Im Kompetenz-Modus wird kein Quelltext für den „Inhalt generieren"-Button verlangt;
  Hinweistext passt sich entsprechend an.
- `apps/web/src/views/KompetenzView.tsx`: Neuer Schalter „Punkte vergeben" (Default an).
  Aus → `meta.punkteAusblenden = true` für einfache Übungen ohne Punkteangaben.
- `apps/web/src/components/PreviewTwoColumn.tsx`: A4-Vorschau spiegelt den didaktischen
  Rahmen 1:1 — sprechender Titel als H1, Fach/Thema in Unterzeile, Einleitung kursiv,
  Merkkasten als gerahmte Box, `block.beispiel` pro Block, Transferaufgabe „Zum Schluss –
  jetzt du!" mit Schreiblinien am Ende.
- `apps/web/src/components/Step0_Absicht.tsx`: Link-Text angepasst auf „Übung ohne Quelltext".

### Fixed — Welle 6: Natascha-Testfeedback (Bugs + Didaktik)
- `apps/web/src/lib/commands.ts`: Ctrl+K-/Command-Pfad für `multipleChoice` erzeugt jetzt
  4 Optionen (A–D), statt 2 — konsistent mit `createDefaultBlock` und Schema-Minimum.
- `apps/web/src/lib/blockDefaults.ts`: `createDefaultBlock` setzt bei `meta.punkteAusblenden === true`
  neue Blöcke auf `punkte: 0` (punktlose Schulübungen bleiben punktefrei).
- `packages/llm/src/normalize.ts`: Leere/whitespace Strings werden gefiltert in
  `config.aspekte`, MC-`optionen` und `distraktorWoerter`. Offene Schreibaufgabe bekommt
  bei ausschließlich leeren Aspekten einen sinnvollen Fallback (`['Inhalt', 'Struktur']`).
- `packages/llm/src/prompt.ts`: Didaktik-Härtung — Distraktoren an Stufe gekoppelt
  (Oberstufe = konzeptuell nahe, fein nuanciert; Unterstufe = klare Begriffsverwechslungen);
  `offeneSchreibaufgabe` mit ausführlicherer Schreibsituation, Adressat, Anlass, Medium;
  Beispiel angereichert.
- Verifikation: `pnpm -r build` + `pnpm -r test` grün (Schema 118, LLM 123, Renderer 31,
  Input 17, QA 96, Web 52).

### Added — Kimi-Specs 2026-06-16
- `packages/llm/src/prompt.ts`: Zielgruppen-Hinweis (`meta.klasse` + `meta.stufe`) in beiden
  Prompt-Pfaden (normal + kompetenz).
- `apps/web/src/index.css`: Dark-Theme `.btn-primary` bekommt dunklen Text (`#14241F`) für
  besseren Kontrast auf dem hellen Akzent.
- `apps/web/src/index.css`: Tote `.door-icon`-Regel entfernt (war bereits nicht mehr im Code).
- `apps/web/src/components/Step4_Generate.tsx`: Quality-Gate vor DOCX-Export —
  `checkLernzielCoverage` und `checkSchreibaufgabe` zeigen mögliche Probleme; Export erst nach
  „Trotzdem exportieren".
- `apps/web/src/lib/niveauTransform.ts` + `apps/web/src/hooks/useExport.ts` +
  `apps/web/src/components/Step4_Generate.tsx`: 3-Niveau-Differenzierung — Button „3 Niveaus
  erzeugen" erstellt `_leicht`, `_mittel`, `_schwer` Fassungen. „leicht" = reine TS-Transformation
  ohne LLM; „schwer" = regenerateBlock nur für offene Blöcke.
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test`
  grün (Schema 118, LLM 123, Renderer 31, Input 17, QA 96, Web 52).

### Added — Kompetenz-Modus: Stoffkatalog-Erweiterung Unterstufe Englisch
- `apps/web/src/lib/stoffkatalog.ts`: Neue Deskriptoren + Stoff-Items für Unterstufe Englisch:
  `Present Perfect Simple`, `Past Simple vs. Present Perfect`, `Questions, Negation, Short Answers`.
  Deckt Nataschas erste Anfrage ab; Integritätstest (`coverage.test.ts`) bleibt grün.
- Verifikation: `pnpm -r build` + `pnpm -r test` grün (Schema 118, LLM 123, Renderer 31,
  Input 17, QA 96, Web 52).

### Added — Kompetenz-Modus: Phase 4 (Coverage-Export + UI + Stoffkatalog-Erweiterung)
- `apps/web/src/hooks/useExport.ts`: `exportKompetenzraster(state)` berechnet über
  `lib/coverage.computeCoverage` die abgedeckten/fehlenden Deskriptoren und exportiert
  sie als `<datum>_<thema>_Kompetenznachweis.docx` via `renderer.renderCoverageToBlob`.
- `apps/web/src/components/Step4_Generate.tsx`: Coverage-Panel (abgedeckt grün /
  fehlend grau) + Button „Kompetenznachweis exportieren", strikt nur wenn
  `meta.modus === 'kompetenz'`.
- `apps/web/src/lib/stoffkatalog.ts`: Katalog erweitert auf Englisch Unterstufe
  (6 Items) sowie Deutsch Unterstufe (5 Items) und Oberstufe (5 Items). Alle
  Stoff-Items verweisen referentiell korrekt auf Deskriptoren desselben Fachs/Stufe;
  Coverage-Integritätstest bleibt grün.
- Verifikation: `pnpm -r build` + `pnpm -r test` grün (Web 52 Tests inkl.
  `coverage.test.ts`).

### Added — Kompetenz-Modus: Phase 2b (grammatik-bewusster Judge)
- `packages/llm/src/judge.ts`: `runKompetenzJudge` + `buildKompetenzJudgePrompt` —
  LLM-as-Judge für erfundene Übungsinhalte (umformung/fehlerkorrektur) ohne Quelltext:
  prüft sprachliche Korrektheit der Musterlösung, Aufgabe↔Lösung-Konsistenz und
  Passung zu Stoff-Item/Niveau. „hart" → error (löst Reparaturrunde aus), „weich" → Warnung.
- `packages/llm/src/quality.ts`: `runQualityChecks` ruft im Kompetenz-Modus den
  Kompetenz-Judge auf (wenn `complete` verfügbar), inkl. Stoff-Item-/Niveau-Kontext.
- `packages/llm/src/validate.ts`: `parseAndValidate` nimmt optional aufgelöste
  `stoffItems` für den Judge-Kontext entgegen.
- `packages/llm/src/judge.test.ts`: 6 Tests (korrekt/hart/weich/Kontext/Typ-Filter/API-Fehler).

### Added — Kompetenz-Modus: Phase 2 (Prompt-Dualität + Validierung)
- `packages/llm/src/prompt.ts`: `SYSTEM` in gemeinsame `BLOCK_REGELN` + Text-/Kompetenz-Kopf
  gesplittet (Text-Modus unverändert); Block-Regeln + Beispiele für `umformung`/`fehlerkorrektur`;
  `buildMessages` schaltet auf `meta.modus`; IB-Command-Terms bei `rahmenwerk === 'ib-dp'`.
- `packages/llm/src/quality.ts`: Quelltext-Grounding/Schreibaufgaben-Check im Kompetenz-Modus
  übersprungen.

### Added — Kompetenz-Modus: Phase 0 + 1b (App-Wiring + Stoffkatalog + UI)
- `apps/web/src/views/KompetenzView.tsx`: Neue 1-Screen-Ansicht für Kompetenz-Übungen.
  Wahl von Rahmenwerk, Fach, Stufe, Stoff-Item, Thema/Kontext, Niveau und Aufgabentypen.
  Setzt `modus: 'kompetenz'`, baut deterministisches Skelett (`buildSkelett`) und ruft
  `useGenerate().generate()` direkt auf.
- `apps/web/src/lib/stoffkatalog.ts`: Proof-Slice mit 8 englischen Grammatik-Stoff-Items
  (Oberstufe, at-lehrplan) + zugehörigen Deskriptoren; Lookup-Funktionen
  `listStoffItems`, `getStoffItems`, `getDeskriptoren`, `getAllDeskriptoren`.
- `apps/web/src/hooks/useGenerate.ts`: Modus-abhängige Guards (Kompetenz: keine
  Quelltextpflicht, aber `stoffItemIds` erforderlich); `GenerateInput` bekommt leere
  `quelltexte` und `stoffItems` im Kompetenz-Modus; `regenerateBlock` ebenfalls modus-aware.
- `apps/web/src/lib/types.ts`: `ActiveView` um `'kompetenz'` erweitert.
- `apps/web/src/components/Sidebar.tsx`: Neuer Navigationspunkt „Kompetenz-Übung"
  mit `Target`-Icon.
- `apps/web/src/components/Step0_Absicht.tsx` + `apps/web/src/App.tsx`: Link
  „Aus Kompetenz erstellen" im Absicht-Schritt; `KompetenzView` in `renderView` eingebunden.
- Verifikation: `pnpm -r build` und `pnpm -r test` alle grün (Schema, LLM, Renderer,
  Input, QA, Web).

### Added — Kompetenz-Modus: Phase 0 + 1 (Schema + 2 neue Blocktypen)
- `packages/schema/src/index.ts`: Neuer `Modus` (`text` | `kompetenz`), `Rahmenwerk`
  (`at-lehrplan` | `ib-dp`), `Bewertungsschema` (`at-1-5` | `ib-1-7`), `Deskriptor`,
  `StoffItem`. `MetaSchema` und `AuftragSchema` um Kompetenz-Felder erweitert.
- `DocumentSchema`: Quelltext-Pflicht ist jetzt modus-abhängig (`refine`); Kompetenz-Modus
  darf leere `quelltexte` haben.
- Zwei neue Blocktypen: `umformung` (Satztransformation) und `fehlerkorrektur`
  (Fehler finden + korrigieren) — Schema, Skelett, Renderer, Web-Config, Web-Preview,
  Korrekturraster-Logik und Block-Typ-Definitionen.
- `packages/llm/src/types.ts`: `GenerateInput` um `stoffItems` erweitert; `BlockRequest`
  um `umformung` und `fehlerkorrektur` erweitert.
- Tests erweitert: Schema-Tests für neue Typen, Kompetenz-Modus-Document, Refinement,
  BlockTyp-Enum.
- Verifikation: `pnpm -r build` und `pnpm -r test` alle grün (Schema, LLM, Renderer,
  Input, QA, Web).

### Added — Stage 4: LLM-Klassen-Briefing + Schüler-Profil
- **KI-Klassen-Briefing** (Statistik-Tab in `KlassenView`): Button „Briefing generieren" ruft
  `klassen-briefing`-CLI auf (aggregiert Fehlerheatmap, Notenverteilung, Trend, Kalibrierung → LLM
  → speichert in `klassen_briefing`-Tabelle). Letztes Briefing wird beim Klassen-Wechsel automatisch
  geladen. Rust-Command `natascha_klassen_briefing`, Rust-Read `db_get_klassen_briefing`.
- **KI-Schüler-Profil** (`SchuelerView`): Button „Profil generieren" ruft `schueler-profil`-CLI
  auf (Längsschnitt → LLM → speichert in `schueler_profil`-Tabelle). Profil wird beim
  Schüler-Wechsel automatisch geladen. Rust-Command `natascha_schueler_profil`,
  Rust-Read `db_get_schueler_profil`.
- **Python CLI** (`natascha_cli.py`): `cmd_klassen_briefing` + `cmd_schueler_profil` rufen jetzt
  `nc.run_llm_api()` auf + speichern via `ndb.save_klassen_briefing/save_schueler_profil`.
  `--provider`/`--model` Override-Args ergänzt. `_apply_provider_override()` als Helper.
- TS-Hooks `generateKlassenBriefing`, `generateSchuelerProfil`, `getKlassenBriefing`,
  `getSchuelerProfil` in `useNatascha.ts` + Interfaces `KlassenBriefingRow`, `SchuelerProfilRow`.
- Verifikation: 41 Web-Tests, 27 Rust-Tests, `tsc`, `cargo check` alle grün.

### Added — Stage 3b: Korrektur-Feedback-Vorschau (Schülertext annotiert)
- `KorrekturView`: neues **„Schülertext mit Markierungen"**-Panel nach der Fehler-Liste.
  Klappt per Toggle auf (Eye/EyeOff). Rendert `rohtext` mit farbigen Inline-Markierungen
  für jedes `fehler_historie.zitat` (R=rot, G=grün, Z=blau, A=orange). Legende unten.
  `annotateText()`-Funktion findet Zitatpositionen, löst Überlappungen auf (first-wins),
  rendert React-Nodes. Keine DOCX-Erstellung mehr nötig für die Schnell-Übersicht.
- `AbgabeInfo` (Rust struct + SQL): `rohtext: Option<String>` hinzugefügt. `db_get_abgabe_detail`
  selektiert jetzt `a.rohtext` (Spalte 16). `db_get_abgaben` (Listen-View) setzt `rohtext: None`
  (kein unnötiger Datentransfer). TypeScript-Interfaces in `useNatascha.ts` +
  `KorrekturView.tsx` entsprechend ergänzt (`rohtext: string | null`).
- Verifikation: 41 Web-Tests, 27 Rust-Tests, `tsc --noEmit`, `cargo check` alle grün.

### Added — Erwartungshorizont speichern + in der Korrektur nutzen
- `ErwartungshorizontView`: Ergebnis ist jetzt **bearbeitbar** (Textarea) +
  Button **„Akzeptieren & speichern"** → schreibt `rubrics/erwartungshorizont_*.md`
  und verlinkt ihn in der Config (CLI `erwartungshorizont-save`, Text via stdin;
  nutzt NATASCHAs `save_erwartungshorizont_to_config`). Die Korrektur lädt ihn dann
  automatisch (`load_erwartungshorizont`). Rust-Command `natascha_save_erwartungshorizont`
  (stdin-Piping), Hook `saveErwartungshorizont`. CLI-Roundtrip smoke-getestet.

### Added — Closed Loop: Heatmap → Übungsblatt (1 Klick)
- `KlassenView` (Fehler-Heatmap): Button **„Übungsblatt zu Top-Fehlern generieren"**
  springt direkt in LUAs Generator (Step0) — Top-3-Fehlerkategorien werden zu
  `meta.fokusThemen` + passenden Aufgabentypen (`KATEGORIE_TO_BLOCKTYPEN`),
  Thema/Notizen vorbefüllt. **Keine Datei-Brücke mehr nötig** (eine App, gemeinsame
  DB): transiente In-Memory-Übergabe `lib/korrekturBridge.ts`, Step0 konsumiert sie
  beim Mounten. Schließt den Loop Korrigieren→Üben in einem Klick.

### Added — UX: Baukasten-Blocktyp komplett entfernen
- In `Step2_Baukasten` lässt sich ein ganzer Blocktyp per **X** (oben rechts)
  entfernen; der Zähler wandert nach oben links (Design-Konsistenz). Karte von
  `<button>` auf `<div role="button">` umgestellt (valides HTML für den inneren
  X-Button) inkl. Tastatur-Support. Neue Reducer-Action `REMOVE_BLOCKS_BY_TYPE`
  + `removeBlocksByType` in `useBlocks`.

### Added — Welle 4b: Erwartungshorizont-Generator (UI)
- Neue `ErwartungshorizontView` + Sidebar-Eintrag „Erwartungshorizont": Klasse
  wählen, Aufgabe (mit Vorschlägen aus vorhandenen Aufgaben) → „Generieren" ruft
  NATASCHAs LLM-Erwartungshorizont (Backend war bereits da) → Markdown-Ergebnis
  mit Kopieren-Button.
- `useNatascha.generateErwartungshorizont` wirft den (kategorisierten) Fehler jetzt
  durch, statt ihn zu schlucken — die View zeigt „API-Key fehlt" etc.

### Added — Härtung (Tests + Fehler-Sichtbarkeit)
- **Rust-Unit-Tests** für `natascha_read.rs`: Read-Logik in testbare
  `*_impl(conn, …)`-Helfer extrahiert (list_aufgaben, fehler_heatmap, schueler-
  CRUD); Tests gegen In-Memory-`rusqlite` (Schema laden → seeden → Aggregat/CRUD
  prüfen). `cargo test` 27 grün.
- **P1-4:** Fire-and-forget-DB-Writes in `storage.ts` laufen über `persist()` —
  Fehler werden geloggt (+ optionaler `setPersistErrorHandler` für UI-Toasts),
  statt dass Cache und DB still auseinanderlaufen.

### Added — Welle 4: Aufgabe/Klasse/Rubrik nativ anlegen
- **CLI** (`natascha_cli.py`): `add-klasse`, `add-aufgabe` (mit `--fach/--schulstufe/
  --textsorte/--rubric`), `list-rubrics` — nutzen NATASCHAs vorhandene, kommentar-
  erhaltende Config-Schreiber (`nc.add_class_to_config`/`add_aufgabe_to_config`/
  `rubric_options_for`/`default_rubric_for`). Smoke-getestet (Config-Roundtrip).
- **Rust** (`natascha.rs`): `natascha_add_klasse`/`natascha_add_aufgabe`/
  `natascha_list_rubrics` (Sidecar) + Registrierung.
- **UI** (`SchuelerView`): „Aufgabe anlegen (Rubrik)"-Formular (Bezeichnung, Fach,
  Schulstufe, Rubrik-Dropdown). `useNatascha` um `addKlasse`/`addAufgabe`/
  `listRubrics` erweitert. (Schüler-Anlegen war bereits da; Klassen entstehen
  automatisch.)

### Added — M1 Polish (Fehler + Dev-Seed)
- **Strukturierte Analyse-Fehler:** `natascha.rs` kategorisiert CLI-Fehler jetzt
  (API-Key fehlt / Netzwerk / Ratenlimit / fehlende Python-Deps / Python nicht
  startbar) statt rohem stderr/Traceback durchzureichen (`categorize_cli_error`).
- **Dev-Seed-Button:** `natascha_seed_testdaten` (Rust) führt `seed_testdaten.py`
  in die gemeinsame DB aus; Button „Testdaten laden (Dev)" + DB-Pfad-Anzeige im
  Einstellungen-Abschnitt „NATASCHA". Behebt das „Views sind leer"-Rätsel beim Testen.

### Changed/Removed — M2 Aufräumen (eine Read-Quelle, Bugfixes)
- **Doppelten Read-Pfad entfernt:** Die 6 ungenutzten CLI-Sidecar-Read-Commands
  (`natascha_klassen_liste/aufgaben/abgaben/heatmap/notenverteilung/statistik` in
  `natascha.rs`) und ihre Python-Pendants in `natascha_cli.py` gelöscht. LUA liest
  ausschließlich über den Rust-Read-Layer (`natascha_read.rs`, `db_*`). Kein
  Drift-Risiko mehr durch zwei Read-Implementierungen.
- **`feedback-docx`-Bug behoben:** suchte die Abgabe via
  `get_abgaben_by_klasse_aufgabe(db,"","")` (leere Filter → nichts gefunden) + toter
  Loop. Jetzt direkter `SELECT * FROM abgabe WHERE id=?`.
- **`db_set_path`** stellt die gemanagte Connection jetzt sofort um (vorher erst nach
  Neustart wirksam).
- `natascha_schema.sql` mit Hinweis versehen, dass NATASCHA Schema-Eigentümer ist
  (1:1-Spiegelung). Ungenutzter `Mutex`-Import entfernt.

### Fixed — M0 Blocker + WSLg-Crash (Review-Nacharbeit)
- **DB-Split-Brain behoben:** `natascha_analyze` schrieb über die CLI in
  `natascha_schuljahr.db`, während die UI aus `lehr-suite.db` las → Analysen tauchten
  nie in den Views auf. Jetzt ist Rust Single Source of Truth: `natascha.rs`
  `build_cli_command` reicht `--db-path` (`db::resolve_db_path`) an `natascha_cli.py`
  (neues globales `--db-path`); `natascha_config.toml [database] path` aktiv auf
  `~/lehr-suite-bridge/lehr-suite.db` (für TUI/seed). Verifiziert: seed → CLI-Read
  finden dieselben Daten.
- **`require()`-Runtime-Crash** in `useNatascha.ts` (3×) → echtes
  `import { loadSettings }` (Vite/ESM kennt kein `require`; Analyse-Button war so tot).
- **Terminal-Start-Crash unter WSLg** (`fontpack.cc: No suitable files for '9x18'`):
  `x-terminal-emulator` → Zutty stürzt ohne die Bitmap-Schrift ab. `launch_natascha`
  bevorzugt jetzt `xterm` mit skalierbarer Xft-Schrift (`-fa Monospace -fs 11`),
  Zutty/x-terminal-emulator nur noch als letzter Fallback.

### Added — Welle 4 (P3, Start): Schüler nativ anlegen
- Native Rust-Commands `db_insert_schueler` / `db_delete_schueler`
  (`natascha_read.rs`, reiner SQL-INSERT/DELETE, kein Python). `db_load_all` listet
  Klassen jetzt aus Abgaben **und** Schülern (neu angelegte Klasse erscheint sofort).
- `SchuelerView`: „Schüler anlegen"-Formular (Klasse/Vorname/Nachname) + Löschen je
  Zeile; `useNatascha` um `insertSchueler`/`deleteSchueler` erweitert.

### Added — Welle 3 (P2): Klassen-/Schüler-Ansichten
- **7 neue Rust-Commands in `natascha_read.rs`:**
  - `db_list_schueler` — Schülerliste pro Klasse
  - `db_get_schueler_laengsschnitt` — Längsschnittprofil (Verlauf, Trend, Fehlerschwerpunkte, Kalibrierung)
  - `db_get_klassen_trend` — Noten-Trend über Aufgaben (KI + Lehrer)
  - `db_get_klassen_kalibrierung` — KI vs. Lehrer-Notenvergleich
  - `db_get_fehler_detail` — Drill-down einzelner Fehlerzitate pro Typ
  - `db_export_noten_csv` — Semicolon-getrennter CSV-Export der Noten
- **`SchuelerView.tsx`** — Neue Sidebar-Ansicht „Schüler":
  Klassen/Schüler-Selector, Längsschnitt-Profil mit Notenverlauf (LineChart via Recharts),
  Trend-Indikatoren, Kriterien-K1/K3-Verlauf, Fehlerschwerpunkte, Kalibrierung.
- **`KlassenView.tsx`** — Erweitert mit Tab „Statistik":
  Noten-Trend (LineChart), Kalibrierung (KI vs. Lehrer), Heatmap-Drilldown (Klick → Fehler-Detail-Liste),
  CSV-Export-Button.
- **Recharts** — Neue Dependency für Charts (`BarChart`, `LineChart`, `ResponsiveContainer`).
- **Sidebar** — Neuer Eintrag „Schüler" (Users-Icon) zwischen Korrektur und Vorlagen.
- **`useNatascha.ts`** — 6 neue Methoden: `listSchueler`, `getSchuelerLaengsschnitt`, `getKlassenTrend`,
  `getKlassenKalibrierung`, `getFehlerDetail`, `exportNotenCsv` + zugehörige TypeScript-Interfaces.

### Added — Welle 2: P1 Korrektur-Core-Flow
- **`KorrekturView.tsx`** — Native React-View fuer Korrektur-Workflow:
  TUI-Modus (startet NATASCHA-Terminal) + Native-Modus (Klassen/Aufgaben-Selector,
  Abgaben-Tabelle, Detail-Ansicht mit Kriterien, Fehlern, Lehrer-Noten-Vergabe).
  Neue-Analyse-Dialog (Datei-Chooser + Klasse/Aufgabe + `natascha_analyze` Sidecar).
  Feedback-DOCX-Button in Detail-Ansicht.
- **`db_get_abgabe_detail`** — Neuer Rust-Command fuer vollstaendige Abgabe-Details
  (AbgabeInfo + KriteriumRow + FehlerRow + LehrerFeedbackRow).
- **`db_upsert_lehrer_feedback`** — INSERT/UPDATE Lehrer-Feedback (Note, Kommentar).
- **`useNatascha.ts`** — Neue Methoden `getAbgabeDetail()`, `upsertLehrerFeedback()`
  + zugehoerige TypeScript-Interfaces (`KriteriumRow`, `FehlerRow`,
  `LehrerFeedbackRow`, `AbgabeDetail`). Alle Views nutzen jetzt den Hook statt
  direktem `invoke()` (DRY).
- **`KlassenView.tsx`** — Refactored auf `useNatascha`-Hook.
- **`tauri-plugin-dialog`** — Datei-Dialog-Plugin (Tauri v2) fuer
  Datei-Auswahl im Analyse-Dialog.
- **`@keyframes spin`** — CSS-Animation fuer Lade-Spinner in `index.css`.

### Added — Welle 1: Headless-CLI + Sidecar-Commands
- **`natascha_cli.py`** — Neues Headless-CLI (12 Sub-Commands):
  `analyze`, `srdp-detail`, `schueler-profil`, `klassen-briefing`,
  `feedback-docx`, `erwartungshorizont`, `klassen-liste`, `aufgaben`,
  `abgaben`, `heatmap`, `notenverteilung`, `statistik`.
  Alle Ausgabe als JSON auf stdout, Fehler auf stderr. Kein TUI-Import.
- **`requirements_cli.txt`** — Minimale Dependencies fuer Headless-Betrieb
  (ohne `textual`/`rich`, nur API+DB+DOCX).
- **Tauri Sidecar-Commands** — 8 neue Commands in `natascha.rs`:
  `natascha_analyze`, `natascha_klassen_liste`, `natascha_aufgaben`,
  `natascha_abgaben`, `natascha_heatmap`, `natascha_notenverteilung`,
  `natascha_statistik`, `natascha_feedback_docx`,
  `natascha_erwartungshorizont`. Alle rufen `natascha_cli.py` als
  Sidecar auf und reichen JSON durch.
- **React Hook `useNatascha.ts`** —抽象ion fuer alle NATASCHA-Operationen
  aus der UI: `analyze()`, `listKlassen()`, `listAufgaben()`, `getAbgaben()`,
  `getHeatmap()`, `getNotenverteilung()`, `getKlassenStatistik()`,
  `generateFeedbackDocx()`, `generateErwartungshorizont()`.

### Added — Phase 2: Gemeinsame SQLite-Datenbank
- **Rust-DB-Infrastruktur:** `rusqlite` (bundled) als neue Dependency.
  `src-tauri/src/db.rs` + `natascha_schema.sql` + `lua_schema.sql` — erstellt
  alle 7 NATASCHA-Tabellen + 4 LUA-Tabellen (`generated_materials`, `lua_history`,
  `lua_settings`, `lua_templates`) mit WAL-Modus und Foreign Keys.
- **Tauri-Commands:** 16 neue Commands in `commands/db.rs` und
  `commands/natascha_read.rs`: `db_load_all`, `db_upsert_document`,
  `db_delete_document`, `db_restore_document`, `db_purge_deleted`,
  `db_toggle_favorite`, `db_append_history`, `db_clear_history`,
  `db_save_settings`, `db_save_template`, `db_delete_template`,
  `db_migrate_from_localstorage`, `db_resolve_path`, `db_set_path`,
  `db_list_aufgaben`, `db_get_abgaben`, `db_get_fehler_heatmap`,
  `db_get_notenverteilung`, `db_get_klassen_statistik`,
  `db_upsert_lehrer_feedback`.
- **Hydrate-Cache:** `storage.ts` liest jetzt aus einem In-Memory-Cache, der
  beim App-Start asynchron aus der SQLite-DB geladen wird. Schreibzugriffe
  erfolgen als fire-and-forget über Tauri-Commands. Fallback auf localStorage
  im Browser. Einmalige Migration localStorage → SQLite beim ersten Start.
- **„Meine Klassen"-View:** Neue `KlassenView` in der Sidebar — zeigt
  Klassenliste mit Abgabenzahl, Aufgabenauswahl, Notenverteilung,
  Fehler-Heatmap (R/G/Z/A) und Abgaben-Tabelle. Liest direkt aus der
  NATASCHA-Datenbank (via Rust SQL-Commands, kein Python-Sidecar nötig).
- **DB-Pfad-Sektion in Einstellungen:** Zeigt den erkannten DB-Pfad an
  (`~/lehr-suite-bridge/lehr-suite.db` oder Auto-Erkennung von
  `apps/natascha/*.db`).
- **NATASCHA `natascha_db.py`:** `init_db()` aktiviert jetzt WAL-Modus und
  Foreign Keys. `save_analysis_to_db()` nutzt atomare Transaktionen statt
  einzelner Inserts. `get_db_path()` unterstützt `~/`-Pfade.
- **App-Start:** Loading-Spinner während DB-Hydratation, bevor die
  Oberfläche rendert. Templates werden jetzt über die DB gespeichert
  statt direkt in localStorage.

### Added — Phase 3c Bauplan (voller Port, freigegeben)
- `docs/phase3c-natascha-port-plan.md` — verbindlicher Bauplan: NATASCHA komplett
  nativ in die LUA-UX (Python-Core als headless Sidecar, alle ~15 Screens in
  React), inkrementell in Wellen 0–4. Erster Bau-Schritt = Welle 0 = Phase 2
  (gemeinsame DB). Verlinkt aus `AGENTS.md`.

### Added — Phase 3a: NATASCHA-Korrektur aus der App starten
- Sidebar-Eintrag **„Korrektur (NATASCHA)"** + neue `KorrekturView` mit Button
  „NATASCHA-Korrektur öffnen" (startet die TUI in einem Terminalfenster) und
  manuellem Fallback-Befehl.
- Tauri-Command `launch_natascha` (`src-tauri/src/commands/natascha.rs`),
  plattformspezifisch (Windows/macOS/Linux, je `#[cfg]`); findet `apps/natascha`
  automatisch relativ zur App.
- Einstellungen: `AppSettings.nataschaDir` + `pythonCommand` (Abschnitt „NATASCHA").
- Design-Doku `docs/phase3-correction-ui.md` (Wege A/B/C + Empfehlung).
- **Verifikation offen:** Terminal-Spawn nur auf Linux kompiliert; Windows-Pfad
  braucht echten Test (Fallback-Befehl in der View dokumentiert).

### Added
- **Phase-1-UX:** Auswahlliste „Aus NATASCHA-Korrektur" zeigt jetzt pro Export
  ein Badge „X Fehler · Y Kategorien" + Mini-Heatmap-Balken (farbcodiert R/G/Z/A)
  + Top-3-Kategorien. Rust-`BridgeExportMeta` um `gesamtFehler` + `heatmap`
  erweitert (`commands/bridge.rs`).
- **Inbox-Ordner konfigurierbar:** neues Feld `AppSettings.nataschaInboxDir`
  (Default leer = `~/lehr-suite-bridge/inbox`), Eingabe im Einstellungen-View
  (Abschnitt „NATASCHA-Brücke"). Step0 übergibt den Ordner an die Bridge-Commands.
- **Bessere Leer-/Fehlerzustände:** Leerzustand zeigt den tatsächlich gesuchten
  Pfad (neuer Command `resolve_bridge_inbox`) + Hinweis auf NATASCHA-Export-Button
  und die Einstellung; klarere Fehlermeldungen (z. B. „nur in Desktop-App").
- `docs/phase2-shared-db.md` — ausführbares Design für Phase 2 (gemeinsame
  SQLite). Kernentscheidung dokumentiert: `storage.ts` ist synchron, SQLite-
  über-Tauri ist async → Hydrate-Cache (Weg A), sync-API erhalten.

## 2026-06-08 — Phase 1: Datei-Brücke NATASCHA → LUA (MVP)

### Added
- **Neues Mono-Repo** `lehr-suite/` mit `apps/lua/` (Lehrunterlagen-Tool) und
  `apps/natascha/` (NATASCHA) als sauberer Snapshot ihrer eigenständigen Repos
  (keine Alt-Git-Historie). Original-Repos bleiben als Backup unangetastet.
- **Bridge-Vertrag** `bridge/schema.json` (JSON Schema, `schemaVersion: 1`):
  Heatmap (R/G/Z/A) + echte Fehlerbeispiele (`zitat`/`korrektur`) + Empfehlungen.
  Doku: `bridge/README.md`.
- **NATASCHA** `natascha_bridge.py`: `export_klassen_bridge()` schreibt pro
  Klasse/Aufgabe ein schema-konformes JSON in die Inbox (atomar). Mit CLI
  (`python natascha_bridge.py <klasse> <aufgabe>`).
- **NATASCHA-TUI**: Button „🎯 Für Übungs-Tool" im Heatmap-Tab
  (`natascha.py`, Handler `_export_bridge`). Config-Sektion `[bridge]` in
  `natascha_config.toml` (`inbox_dir`, Default `~/lehr-suite-bridge/inbox`).
- **LUA** `meta.fokusThemen` (+ in `AuftragSchema`) in
  `packages/schema/src/index.ts`. Prompt-Hinweis `fokusThemenHinweis` in
  `packages/llm/src/prompt.ts` (`buildMessages`).
- **LUA** Tauri-Commands `list_bridge_exports` / `read_bridge_export`
  (`src-tauri/src/commands/bridge.rs`, registriert in `main.rs`/`mod.rs`).
- **LUA** Step0-Einstieg „Aus NATASCHA-Korrektur" + Mapping-Helfer
  `apps/web/src/lib/nataschaBridge.ts` (Kategorie → Aufgabentypen, Vorbefüllung).
- **Tests**: `prompt.test.ts` (fokusThemen-Hinweis), `nataschaBridge.test.ts`
  (Parse + Mapping).

### Verified
- `pnpm build`, `pnpm -r typecheck`, `pnpm -r test` — grün.
- `cargo check` (Tauri-Backend) — sauber.
- NATASCHA seed (`seed_testdaten.py`) → Export → `jsonschema.validate` — PASS.

### Noch offen
- Phase 2 (gemeinsame SQLite) und Phase 3 (Unified Tauri-Frontend) — geplant,
  nicht gebaut. Siehe `AGENTS.md` → Roadmap und `docs/phase2-shared-db.md`.

### 2026-06-08 — Live-GUI-Test bestanden
- `pnpm tauri:dev` baut & läuft (Tauri-Backend inkl. `commands/bridge.rs`
  kompiliert in ~1m13s); NATASCHA-Sektion in Step0 sichtbar und funktional.

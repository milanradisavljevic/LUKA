# Invarianten — LUKA

> Feste Regeln, die in der App **immer** gelten müssen.
> Vor jedem Merge prüfen, ob bestehende Invarianten verletzt wurden; ggf. neue hinzufügen.

## Sprache

- [ ] `meta.fach === 'englisch'` → Prompt-Output, Renderer-Labels und alle DOCX-Texte sind auf Englisch.
- [ ] `meta.fach === 'deutsch'` → Prompt-Output, Renderer-Labels und alle DOCX-Texte sind auf Deutsch.

## Punkte

- [ ] `meta.punkteAusblenden === true` → In **Vorschau**, **beiden DOCX-Exporten** und **Korrekturraster** ist keine Punktespalte und keine Gesamtpunktezahl sichtbar.
- [ ] `meta.punkteAusblenden === false` → Summe der Block-Punkte entspricht der angezeigten Gesamtpunktezahl.

## Manuelle Eingaben in KI-Blöcken

- [ ] Manuell festgelegte Einträge (Wörter, Hinweise, Sätze, Fehler) werden niemals stillschweigend verworfen.
- [ ] Im Hybrid-Modus übernimmt die KI vorgegebene Einträge wortgleich und ergänzt nur Leere.

## Export

- [ ] „3 Niveaus erzeugen" erstellt genau drei Dateien mit den Suffixen `_leicht`, `_mittel`, `_schwer`.
- [ ] „Übung mit Lösungsteil" erstellt genau eine Datei mit Suffix `_Uebung-mit-Loesung`.
- [ ] Nach „3 Niveaus erzeugen" zeigt die Vorschau wieder die Mittel-Fassung.
- [ ] DOCX-Exporte sind gültige ZIP-Dateien (magic bytes `PK\x03\x04`).

## Vorschau

- [ ] Nach „Selbstkontrolle starten" erscheint pro Risiko-Block (`multipleChoice`, `matching`, `lueckentext`, `offeneVerstaendnisfrage`) entweder ✓ oder ⚠.
- [ ] Nicht-Risiko-Blöcke zeigen keinen Judge-Badge.
- [ ] Bearbeitete Blöcke lösen bei „Neu generieren" einen Bestätigungsdialog aus.

## Wizard / State

- [ ] Step0–Step4: Bei „zurück" gehen keine bereits eingegebenen Pflichtdaten verloren.
- [ ] `gesamtpunkte` in Meta == Summe aller `block.punkte`.

## Quelltexte

- [ ] Leere oder nur aus Whitespace bestehende Quelltexte werden nicht als gültige Quelltexte gezählt.
- [ ] Hochgeladene Dateien werden als Text extrahiert (kein Binärmüll im State).

## Korrektur & Feedback-DOCX

- [ ] Fehler mit `lehrkraft_aktion == 'verworfen'` erscheinen **nie** im Feedback-DOCX.
- [ ] Fehler mit `lehrkraft_aktion == 'geaendert'` nutzen den Text aus `lehrkraft_korrektur` statt dem KI-Vorschlag.
- [ ] Die Vertrauensstufe wird nach Schema-Validierung angehängt (`"hoch"|"mittel"|"niedrig"`), nie vorher — `feedback_schema.json` bleibt kompatibel.
- [ ] `fehler_historie`-Migration ist additiv (ALTER TABLE), bestehende Zeilen bleiben unverändert.
- [ ] Bei Rate-Limit (HTTP 429) wird automatisch mit Backoff wiederholt, nicht abgebrochen.

## Korrektur: Fehlerliste ↔ markierter Schülertext

- [ ] Ein Zitat mit mehreren Fundstellen wird **nie** als eindeutig ausgewiesen und **nie** still auf die erste Stelle gesetzt; alle Fundstellen werden markiert (`mehrdeutig`).
- [ ] Findet der Anker nichts, wird der Vorschlag **nicht** verworfen, sondern in die Gruppe „nicht im Schülertext auffindbar" verschoben — er bleibt sichtbar und entscheidbar.
- [ ] Die Auflösung überlappender Fundstellen ist deterministisch und unabhängig von der Reihenfolge der Fehlerliste (längere Stelle gewinnt, dann kleinere `id`) und weist verlorene Vorschläge als `ohnePlatz` aus, statt sie zu verschlucken.
- [ ] Die Farbe einer Markierung zeigt **immer** den Fehlertyp, nie den Bearbeitungsstand; der aktive Vorschlag wird ausschließlich über Form (Ring) unterschieden.
- [ ] Markierungsnummern werden erst nach Filter und Sortierung vergeben, damit Nummer auf der Karte und Ziffer am Text übereinstimmen.
- [ ] Die Nummern-Ziffern sind nicht markierbar (`user-select: none`) — beim Kopieren des Schülertexts dürfen sie nicht mitgeschrieben werden.
- [ ] Ein Wechsel der Abgabe löscht die Text-Auswahl und die Ref-Registry; eine Markierung zeigt nie in die nächste Abgabe hinein.
- [ ] Markierungen erhalten **keinen** `tabIndex`; der tastaturbedienbare Pfad ist die Fehlerliste (eine Sprungfläche je Karte).

## Sachfach-Korrektur

- [ ] Sachfach-Korrekturen führen fachliche Kriterien in `sachfach_bewertung`;
  Sprachfehler bleiben im Top-Level-Feld `fehler` ergänzend.
- [ ] Wenn `sachfach_bewertung` vorhanden ist, basiert die App-Note ausschließlich
  auf diesen fachlichen Kriterien und nicht auf Sprachfehlern.
- [ ] Jede Korrektur-Revision bewahrt den verwendeten Erwartungshorizont als
  lokalen Inhalts-Schnappschuss mit stabiler Fassung-ID.

## Korrektur-Land/Skala (L2)

- [ ] Ohne `--land` (bzw. `land`-Parameter) ist der Analyse-Prompt **byte-identisch** zum Stand vor L2 — der AT-Pfad ist die Benchmark-Baseline und darf sich nie still ändern (Regressionstest `test_at_prompt_unchanged_default`).
- [ ] `land='de'` ändert ausschließlich Kopf/Terminologie im Prompt, die Notenberechnung (`berechne_note_de`, 1–6) und überspringt den SRDP-Detail-Zweitcall.
- [ ] Profil-Land **Schweiz** blockiert den Analysestart mit klarer Meldung — es wird nie eine fremde Skala still angewendet.
- [ ] `qualitaetswarnungen` (Konsistenz-Check, Note-Begründung) sind **advisory**: Sie ändern nie eine Note und sind von den pädagogischen `hinweise` des LLM getrennt.

## Closed Loop — Klassenkontext

- [ ] Folgeübungen übernehmen ein ausdrücklich gesetztes Klassen-Land vor dem Lehrkraft-Profilstandard.
- [ ] Bestehende Klassen ohne Land bleiben gültig und verwenden den Profilstandard.
- [ ] Änderungen am Land einer Klasse ändern keine bereits gespeicherten Korrektur- oder Übungsdaten.

## Unterrichtsplanung

- [ ] Ein Raster-Slot gehört zu **genau einem** Schuljahr (Beginnjahr). Slots ohne Jahr gelten als Altbestand und werden nur angezeigt, nie als Vorlage für ein neues Jahr benutzt.
- [ ] Einplanen ist **idempotent**: derselbe Raster-Slot am selben Datum erzeugt keine zweite Stunde. `woche_einplanen` meldet angelegte und übersprungene getrennt.
- [ ] `woche_einplanen` legt immer `status='geplant'` und `einsatz_art='nur_geplant'` an. Es schreibt **keine** Kalenderdaten – es materialisiert nur, was die Lehrkraft sieht.
- [ ] Erlaubte Werte bleiben `EINSATZ_STATUS = geplant|vorbereitet|eingesetzt`. Es gibt **keinen** Status `verworfen`; „Entfallen" ist die Einsatzart `ausgefallen`.
- [ ] Datumslogik (Wochentag, Monatsgitter, Schuljahresgrenzen, Feiertagsberechnung) liegt in **TypeScript** (`lokalDatum`, `ferien`, `stundenMappen`). Rust prüft nur das Format (`YYYY-MM-DD`) und speichert.
- [ ] Gesetzliche Feiertage werden **berechnet**, Schulferien und schulinterne Pausen werden **gespeichert** (`schulferien`, `schulpause`). Der Ferienvorschlag ist ein Vorschlag: die Verordnung bleibt maßgeblich.
- [ ] **Schulferien werden nie berechnet, immer nachgeschlagen.** `ferienTermine.ts` hält die amtlichen Termine als Daten; `ferienBestandVorschlag` liest daraus und rechnet nichts. Grund: die Osterformel „Ostermontag + 13 Tage" ergab für 2026/27 den 11.04. statt der amtlichen 20.03.–29.03. – LUA hätte in die Osterferien geplant.
- [ ] Die Tests gegen Schulferien prüfen gegen **die Verordnung**, nicht gegen den Code. Wer ein Datum ändert, muss die Quelle ändern – und das soll auffallen. Zusätzlich vergleicht ein Test `REGION_AT`/`REGION_DE` mit den Tabellenschlüsseln, damit sich Profil und Tabelle nicht stillschweigend trennen.
- [ ] Jeder hinterlegte Ferienbestand nennt **Quelle und Abrufdatum** (`QUELLEN`). Eine erfundene Datumsangabe ist schlimmer als eine Lücke: Fehlt ein Jahr, liefert `ferientermine()` `null` und LUA meldet eine Lücke, statt zu raten.
- [ ] **Profil und Ferientabelle sprechen dieselbe Sprache: Bundeslandnamen.** `lua_lehrerprofil.region_at` speichert „Salzburg"; die Tabelle ist danach geschlüsselt. Die alten Nummern 1..9 werden über `atBundesland`/`regionNormalisieren` nur noch als Alteingabe akzeptiert. Grund: Als die Tabelle auf Codes stand und das Profil Namen lieferte, waren **alle neun** österreichischen Termintabellen unerreichbar – ohne Fehlermeldung, weil `null` als „keine Termine" gelesen wurde.
- [ ] Jeder Vergleich auf eine Region läuft über `regionNormalisieren` (oder `atBundesland` bei österreichischem Feiertagsrecht). `schulferien.region` ist ein freier Text in der Datenbank und kann alte Nummern enthalten. Ein Direktvergleich `f.region === region` ist verboten.
- [ ] Für die **Schweiz** werden keine Ferien hinterlegt (kantonal). LUA sagt das ehrlich und lässt die Termine leer, statt einen Schweizer Gesamtkalender zu behaupten.
- [ ] `istWochenende` ist die einzige Quelle für „Wochenende" (Startseiten-Streifen, Wochenkarte, Monatsraster). Samstag/Sonntag werden gekennzeichnet, aber nie als Fehler markiert – ein Wochenende ist kein fehlender Unterricht.
- [ ] Der Startseiten-Streifen zeigt **rollierende sieben Tage** (heute + 6), nicht die Kalenderwoche: am Freitag darf keine leere Woche dastehen.
- [ ] **Eine Stunde entsteht nie ohne Rasterzeile und ohne Planungsweg.** Aus dem Kalender liefert LUA nur das Gerüst (Klasse, Fach, Thema, Datum) und öffnet den Assistenten; Quelltext und Aufgaben entstehen dort. LUA erfindet keinen Quelltext, weil ein Kalendereintrag keine Datei daneben hat – dieselbe Regel wie bei Ferien.
- [ ] Eine von Hand angelegte Stunde (`raster_id IS NULL`) wird **nicht** vom Einplanen erneut erzeugt. `woche_einplanen` arbeitet ausschließlich auf Rasterzeilen.
- [ ] **Das Land gehört zum Gerüst und ist Pflicht.** `kontextAusStunde` verlangt `land`, weil `stufeFromSchulstufe` die Grenze je nach Land setzt (DE 10, AT 8) und `Meta.land` Lehrplan und Vorlage bestimmt. Als das Land fehlte, wurde eine deutsche Klasse 9 zur Oberstufe und die Unterlage bekam den österreichischen Lehrplan. Das Land kommt aus dem **Lehrerprofil**, nicht aus `lua_klassen.land` – das ist bei älteren Datensätzen leer.
- [ ] `init_schema` ergänzt fehlende Tabellen nur beim **Start**. Ein laufender Prozess mit älterem Schema kennt sie nicht, und jeder Planungsbefehl darauf schlägt fehl. Deshalb prüft ein Test, dass `LUA_SCHEMA_SQL` jede Planungstabelle anlegt.
- [ ] Schema-Änderungen an `lua_klassen`, `stundenraster`, `schulferien` oder `schulpause` sind **additiv** und über Migrationen nachgezogen – eine bestehende Lehrkraft-DB muss ohne Migrationsschritt starten.
- [ ] Klassenfarben werden **nie** in der Korrekturansicht verwendet. Dort ist Farbe für Richtig/Falsch/Zeichen/Ausdruck reserviert.
- [ ] Farbe wird nur als Rand/Text/Fläche einer Kachel gesetzt, nie als Kartenhintergrund der Klassenliste. Ein Klassenname ohne zugewiesene Farbe bekommt deterministisch den nächsten freien Ton; zwei Klassen teilen nie einen Ton.
- [ ] Die Farbzuordnung ist eine reine Funktion aus der Klassenliste (`farbListeAusKlassen`) und wird von Planung, Klassenverwaltung und Startseite geteilt – damit dieselbe Klasse überall gleich aussieht.
- [ ] `woche_einplanen` überspringt Rasterzeilen **ohne Klasse** und zählt sie in `EinplanErgebnis.ohne_klasse`. Eine Freistunde bleibt im Raster, erzeugt aber keine Stunde – sonst stünde „ohne Klasse" im Kalender.
- [ ] Rasterzeilen **ohne** `schuljahr` (Altbestand) erscheinen nur im laufenden Schuljahr, nicht in jedem. `slotsDesJahres` in `PlanungView`.
- [ ] **Zwei Wege, eine Unterlage an einen Termin zu hängen – nicht vermischen.** `unterrichtseinsatz.material_id` (1:1) ist die Korrekturgrundlage und wird nur aus dem Baukasten gesetzt; `stundenmaterial` (1:n) ist der Weg der Planung und wird über `anzahl_materialien` gezählt. Beide zeigen auf `generated_materials.id`; wer sie zusammenführt, verliert entweder die Korrekturgrundlage oder die Anlagenliste.
- [ ] Aus einem Termin wird **nur dann ohne Nachfrage erzeugt**, wenn Thema *und* Fach bekannt sind. Fehlt eins, öffnet der Assistent mit Vorbefüllung. `unterlageAusTermin` liefert `ok: false` mit `fehlt`, statt zu raten.
- [ ] `lua_klassen.fach` ist freier Text und wird über `FachSchema` geprüft (`fachPruefen`), nicht gecastet. Passt er nicht auf das Schema, gilt die Klasse als fachlich unbestimmt.
- [ ] Die Vorbefüllung aus der Planung ist **nicht** an `FEATURES.natascha` gebunden und erwartet **keinen** Ausgangstext. `korrekturBridge` trägt die Quelle, `Step0` verzweigt danach.
## Hilfe & Suche

- [ ] **Jede Liste, die auch nur eine App-Liste wiedergibt, wird erzeugt, nicht abgeschrieben.** Fächer kommen aus `FACH_META`, Aufgabentypen aus `BLOCK_TYPE_DEFS`, Tastenkürzel aus `SHORTCUTS`. Grund: Als die Hilfe die Listen selbst schrieb, fehlten zwei von 14 Fächern, einer von 20 Aufgabentypen und 16 von 19 Tastenkürzeln - und niemand merkte es, weil eine Prosa-Liste keinen Test hat.
- [ ] Eine neue Liste in der Hilfe braucht einen Wächter in `helpSections.test.tsx`, der sie gegen ihre Quelle prüft und beim Fehlen **sagt, was fehlt**. Ein Test, der nur "ist nicht leer" prüft, ist kein Wächter.
- [ ] **Anzeigename und interner Bezeichner sind getrennt.** In der Suche und in der Hilfe steht der Name, den die Lehrkraft in der App auch sieht ("Geschichte"), nicht der Schemaschlüssel (`geschichte`). Ausnahme ist bewusst nur `umformung`: der Typ ist im Baukasten nicht wählbar, braucht aber trotzdem einen Namen, falls er in alten Dokumenten oder Pool-Einträgen auftaucht.
- [ ] Ein **sichtbarer** Treffer in der Palette muss **ausführbar** sein. Befehle mit Platzhalter ("Thema: …", "Punkte: …") erscheinen erst, wenn die Eingabe ihr Muster erfüllt. Grund: Vorher standen solche Zeilen in der Liste und meldeten beim Klick "Befehl nicht erkannt".
- [ ] **Kein Weg in der App verwirft ungespeicherte Arbeit ohne Rückfrage** - auch nicht die Suchpalette. `bestaetigeVerwerfen` ist die eine Stelle, die das prüft; `handleOpenDocument`, `handleNewDocument`, `handleStartQuickExercise`, `handleGenerateUebung`, `handleUnterlageAusTermin` und der `view`-Zweig von `handleExecuteResult` gehen alle durch sie.
- [ ] **Ein Sprung verliert nie mehr, als die Lehrkraft bestätigt hat.** Wer im Assistenten "Abbrechen" wählt, bleibt im Assistenten. Eine geschlossene Palette darf daran nichts ändern.
- [ ] Befehle, die Daten ablegen, gehen **über die Datenbank**, nicht über `localStorage`. `localStorage` ist der Browser-Fallback; im Desktop schreibt `saveTemplate`. Der Umweg führte dazu, dass eine per Palette gespeicherte Vorlage nach dem Neustart fehlte.
- [ ] Die Trefferliste ist **nach Art gedeckelt, nicht nur insgesamt.** Trifft nur eine Sektion, gilt das globale Cap; trifft es mehrere, bekommt jede ihre eigenen Plätze. Grund: Beim globalen Cap vor der Gruppierung waren bei 30 Unterlagen Pool, Klassen und Navigation unsichtbar, obwohl es Treffer gab.
- [ ] Die Palette ist ein **Dialog**: `role="dialog"`, `aria-modal`, Fokusfalle über `useDialogFocus` und Fokusrückgabe. `aria-selected` gehört an `role="option"`-Zeilen in einem `role="listbox"`, nicht an frei herumfliegende Schaltflächen.
- [ ] Ein Tastenkürzel wird **einmal** in `lib/shortcuts.ts` eingetragen und über `formatShortcut()` plattformabhängig gemacht (`Mod` = `Strg` bzw. `⌘`). Kein fest verdrahtetes `⌘` in einer Oberfläche, die auch unter Windows läuft.
- [ ] Ein Kürzel-Eintrag nennt seinen **Geltungsbereich**. "Rückgängig" gilt nur im Assistenten, "Zoom" überall, der Tafel-Modus hat eigene Tasten. Eine pauschale Liste führt zu Fehlbedienungen.
- [ ] Die Hilfe verweist **nur auf mitgelieferte Dateien**. `docs/TESTPLAN.md` ist ein internes, nicht versioniertes Dokument und war als Ziel in der Hilfe ein toter Zeiger.
- [ ] Ein Entwickler-Umgebungsproblem ist **keine** Lehrkraft-Einschränkung. Der Hinweis "DOCX öffnet sich in der WSL-Umgebung nicht" wurde entfernt und durch den realen Fall ersetzt (PDF-Export ohne LibreOffice).

# Gunst der Stunde: „Medien und Demokratie" + „Informatik und KI" in LUKA

Stand 2026-07-07. Umsetzung aufgeteilt zwischen Sonnet 5 (Architektur/Code-Wiring
+ Bulk-Pipeline) und Codex (Recherche-Content). **Reihenfolge zwingend:** Sonnet
zuerst (legt die exakten Kompetenzbereich-Namen fest), erst danach Codex (referenziert
diese Namen wortgleich im Content).

## Kontext

Der Nationalrat hat am 07.07.2026 zwei neue AHS-Oberstufen-Pflichtfächer beschlossen:
**„Medien und Demokratie"** (2 Wochenstunden, Medienkompetenz/Kritikfähigkeit) und
**„Informatik und Künstliche Intelligenz"** (1 Wochenstunde, Algorithmen/Programmierung/
Privatsphäre/Cybersecurity), zulasten der 2. Fremdsprache bzw. Latein. Start:
**Schuljahr 2026/27** — in ~6–8 Wochen. Entscheidend: die **Lehrplan-Verordnung
existiert noch nicht**, sie geht laut Parlament erst „bald in Begutachtung". Kein
Lehrbuch, kein Aufgabenpool, keine Konkurrenz-Inhalte existieren am Markt — jede
Lehrkraft steht im September vor einem neuen Fach ohne Material. Das ist das Zeitfenster.

Architektur-Check: ein neues Fach ist in LUKA billig (FACH_META-Eintrag + Enum +
KOMPETENZBEREICHE → alle UI-Dropdowns sind bereits generisch,
`packages/schema/src/index.ts`). Es gibt eine bewährte Bulk-Pipeline
(`scripts/generate-stoffkatalog-from-research.mjs`), mit der bereits 6 Sachfächer
auf einmal als „kuratierte Entwürfe" angelegt wurden (`CHANGELOG.md` „Welle 2").
Die bestehende Ehrlichkeits-Vermerk-Mechanik (`quelle`-Feld, `istEntwurfsQuelle()`,
automatisches Entwurf-Badge in der UI) deckt genau diesen Fall ab, ohne neuen Code:
Inhalte gehen als klar markierter Entwurf raus, werden revidiert, sobald die echte
Verordnung da ist.

Entscheidungen: Tempo vor Schulstart. Informatik/KI zuerst nur auf Konzept-Ebene
(kein neuer Blocktyp für echten Code — ~17-Datei-Eingriff, bewusst V2). Aufgabenpool
per LLM-Batch-Generierung + menschlicher Review.

## Phase A — Fundament (Sonnet)

1. `packages/schema/src/index.ts`: `FachSchema`-Enum um `mediendemokratie` und
   `informatikki` erweitern; `FACH_META`-Einträge (`label`, `sprachfach: false`,
   `zielsprache: 'Deutsch'`); `KOMPETENZBEREICHE`-Einträge mit Arbeitstitel-
   Kompetenzbereichen (Medien und Demokratie: Medienkompetenz/Quellenkritik,
   Politische Bildung/Demokratieverständnis, Kommunikation; Informatik und KI:
   Algorithmisches Denken, KI-Grundlagen & Ethik, Datenschutz & Cybersecurity) —
   `quelle`-Feld ehrlich als „Arbeitsentwurf, keine amtliche Quelle — Verordnung
   stand bei Erstellung noch aus (07/2026)" im bestehenden Vermerk-Stil.
2. `packages/qa/src/korrekturraster/{kataloge.ts,builder.ts}`: `waehleKatalog`
   um `fach === 'mediendemokratie'` → adaptiertes Raster ergänzen (Wortlaut
   angepasst: „Quelle" → „Medienquelle/Post", „Autor/in" → „Urheber/Plattform").
   Für `informatikki` reicht der bestehende Fallback.
3. `scripts/generate-stoffkatalog-from-research.mjs`: `FACH_CODE`-Map (Z. 38–51)
   um beide neuen Kürzel erweitern.
4. Integritätstests laufen generisch mit (`packages/schema/src/schema.test.ts:1755-1795`,
   `stoffkatalog.test.ts`, `inhaltskatalog.test.ts`) — nur grün-Verifikation, kein
   Testcode-Neubau.

## Phase B — Aufgaben-Content-Zuordnung (Referenz für Codex + Pool-Skript)

**Medien und Demokratie** (reine Fließtext-/Diskussions-Aufgaben, bestehende Blocktypen):
- Quellenkritik/Fact-Checking: `offeneVerstaendnisfrage` + `markieraufgabe`, `kategorisierung` (Fakt/Meinung/Fake)
- Demokratie-Mechanismen: `rollenkartenSet` (Nationalrats-Debatte), `matching` (Institution↔Funktion), `multipleChoice` (Wahlsystem)
- Meinungsbildung: `offeneSchreibaufgabe` (Leserbrief/Kommentar)

**Informatik und KI** (Konzept-Ebene, kein Code-Blocktyp):
- Privatsphäre/Cybersecurity: `multipleChoice`/`matching` (Phishing/Malware/Verschlüsselung), `kategorisierung` (personenbezogene Daten), `roleplay`
- Algorithmisches Denken: `tabelle` (Trace-Tabelle, reine Werte ohne Syntax-Highlighting)
- KI-Grundlagen/Ethik: `offeneSchreibaufgabe` (KI-Bias/Deepfakes), `roleplay` (Pro/Contra KI-Regulierung), `offeneVerstaendnisfrage`

**Bewusst V2:** echter Code/Pseudocode-Blocktyp — nicht Teil dieses Plans.

## Phase C — Bulk-Aufgabenpool-Pipeline (Sonnet)

`aufgabe_pool` hat keinen Enum-Constraint auf `fach` — technisch aufnahmefähig,
sobald die Fächer im Enum stehen. `pool_add` ist Einzeleintrag; Tauri-Commands
sind nur per IPC aus dem Webview aufrufbar, nicht von einem Node-Skript. Muster:
`src-tauri/src/bin/import_keys.rs` (eigenständiges Binary, öffnet DB direkt via
`db::open_db()`, Cargo entdeckt `src/bin/*.rs` automatisch — kein `[[bin]]`-Eintrag
in Cargo.toml nötig).

1. `scripts/generate-aufgabenpool-draft.mjs` (neu, Muster: `scripts/llm-smoke.mjs`
   für Env/Key-Loading): iteriert Fach × Schulstufe × kuratierte Thema/Aufgabentyp-
   Kombis aus Phase B, ruft `generateDocument` (`packages/llm`) im Kompetenz-Modus
   auf, schreibt Ergebnisse als `PoolEntry`-JSON-Array in eine Review-Datei
   (`quelleHinweis: "LLM-Entwurf, ungeprüft"`).
2. Review-Pass (Milan/Kimi, außerhalb dieses Plans).
3. `src-tauri/src/bin/seed_pool.rs` (neu, Muster `import_keys.rs`): liest die
   reviewte JSON-Datei, INSERTet direkt in `aufgabe_pool` (Wiederverwendung der
   `PoolEntry`-Struktur aus `commands/pool.rs`). Aufruf:
   `cargo run --bin seed_pool -- reviewte_entries.json`.

## Verifikation
```bash
cd apps/lua && CI=true pnpm --filter @lehrunterlagen/schema test
CI=true pnpm --filter @lehrunterlagen/web test
CI=true pnpm --filter @lehrunterlagen/qa test
node scripts/generate-stoffkatalog-from-research.mjs --write
cd src-tauri && cargo build && cargo test
```
Sicht (Tauri): beide Fächer im Fach-Dropdown wählbar, Entwurfs-Badge sichtbar.

---

## Copy-Paste-Prompt: Sonnet (ZUERST ausführen)

```
Lies AGENTS.md und docs/PLAN-neue-faecher-2026-07.md (Phase A + C). Setze das
Fundament für zwei neue Fächer um: „Medien und Demokratie" (mediendemokratie)
und „Informatik und Künstliche Intelligenz" (informatikki).

1) apps/lua/packages/schema/src/index.ts: FachSchema-Enum um 'mediendemokratie'
   und 'informatikki' erweitern. FACH_META-Einträge (label, sprachfach: false,
   zielsprache: 'Deutsch'). KOMPETENZBEREICHE-Einträge:
   mediendemokratie: ['Medienkompetenz & Quellenkritik', 'Politische Bildung &
   Demokratieverständnis', 'Kommunikation & Meinungsbildung']
   informatikki: ['Algorithmisches Denken', 'KI-Grundlagen & Ethik',
   'Datenschutz & Cybersecurity']
   (Diese exakten Strings sind bindend — Codex referenziert sie später wortgleich
   im Content. Nicht mehr ändern, nachdem du committet hast.)

2) apps/lua/packages/qa/src/korrekturraster/kataloge.ts + builder.ts: in
   waehleKatalog einen Zweig für fach === 'mediendemokratie' ergänzen — kopiere
   QUELLENANALYSE oder SACHERORTERUNG (je nachdem was strukturell besser passt,
   beide existieren schon) und passe nur den Wortlaut an: "Quelle" → "Medienquelle/
   Post", "Autor/in" → "Urheber/Plattform". Für informatikki reicht der
   bestehende Fallback, kein neuer Zweig nötig.

3) apps/lua/scripts/generate-stoffkatalog-from-research.mjs: FACH_CODE-Map
   (~Z. 38-51) um beide neuen Fachkürzel erweitern (Muster: bestehende Einträge).

4) Neu: apps/lua/scripts/generate-aufgabenpool-draft.mjs. Node-Skript (Muster:
   scripts/llm-smoke.mjs für Env/Key-Loading aus src-tauri/.env.local). Iteriert
   über eine kuratierte Liste von (fach, schulstufe, thema, aufgabentyp)-Kombis
   passend zu Abschnitt "Phase B" im Plan-Dokument (mediendemokratie: rollenkartenSet
   Nationalratsdebatte, offeneSchreibaufgabe Leserbrief, kategorisierung Fakt/
   Meinung/Fake, matching Institution↔Funktion, multipleChoice Wahlsystem,
   markieraufgabe+offeneVerstaendnisfrage Quellenkritik; informatikki: multipleChoice/
   matching Cybersecurity-Begriffe, kategorisierung personenbezogene Daten,
   tabelle Trace-Tabelle, offeneSchreibaufgabe KI-Ethik, roleplay KI-Regulierung/
   Datenschutz). Ruft generateDocument (packages/llm) im Kompetenz-Modus auf
   (kein Quelltext, wie bei erfundenen Kompetenz-Beispielen — siehe wie
   Step0_Absicht/KompetenzView das für andere Fächer aufruft). Schreibt Ergebnis-
   Blöcke als PoolEntry-JSON-Array (Feldnamen wie apps/web/src/lib/pool.ts
   PoolEntry: id/fach/stufe/schulstufe/thema/aufgabentyp/tags/blockJson/
   quelleHinweis: "LLM-Entwurf, ungeprüft"/createdAt) in eine Datei
   apps/lua/scripts/out/aufgabenpool-draft.json. Provider/Modell per Env
   steuerbar wie llm-smoke.mjs (Default deepseek, günstig).

5) Neu: apps/lua/src-tauri/src/bin/seed_pool.rs. Eigenständiges Rust-Binary
   (Muster: src-tauri/src/bin/import_keys.rs — Cargo entdeckt src/bin/*.rs
   automatisch, kein Cargo.toml-Eintrag nötig). Liest einen JSON-Dateipfad aus
   argv (PoolEntry-Array wie oben), öffnet die DB via crate::db::open_db(),
   INSERTet jeden Eintrag in aufgabe_pool (Spalten wie in
   src-tauri/src/commands/pool.rs pool_add, camelCase→snake_case beachten:
   blockJson→block_json, quelleHinweis→quelle_hinweis, createdAt→created_at).
   Gib am Ende Anzahl eingefügter Zeilen aus. Kein neuer Tauri-Command nötig.

Verifikation: cd apps/lua && CI=true pnpm --filter @lehrunterlagen/schema test
&& CI=true pnpm --filter @lehrunterlagen/web test && CI=true pnpm --filter
@lehrunterlagen/qa test; node scripts/generate-stoffkatalog-from-research.mjs
--write (muss ohne die zwei neuen Fächer als unbekannt fehlschlagen, da noch
kein Research-JSON existiert — das ist Codex' Teil, hier nur Exit-Code/Fehlertext
prüfen, nicht crashen); cd src-tauri && cargo build && cargo test.
CHANGELOG.md als letzter Schritt: frisch lesen, Eintrag oben, nur eigene Files
stagen (git add <pfad>, nie -A).
```

## Copy-Paste-Prompt: Codex (ERST NACH Sonnets Commit ausführen)

```
Lies AGENTS.md und docs/PLAN-neue-faecher-2026-07.md (Phase A Punkt 1 — die
KOMPETENZBEREICHE-Kategorienamen sind dort bindend definiert, wortgleich
übernehmen). Voraussetzung: Sonnets Commit mit dem Schema-Fundament ist bereits
gelandet (git log prüfen, ob apps/lua/packages/schema/src/index.ts bereits
'mediendemokratie'/'informatikki' enthält — falls nicht, abbrechen und Bescheid
geben statt zu raten).

Aufgabe: Recherche-Input-JSONs für zwei neue AHS-Oberstufen-Fächer schreiben
(Schulstufen 9-12), als kuratierte ARBEITSENTWÜRFE (die offizielle Lehrplan-
Verordnung existiert noch nicht — das MUSS im quelle-Feld jedes Eintrags stehen:
"Arbeitsentwurf LUKA-Team, keine amtliche Quelle — Verordnung stand bei
Erstellung noch aus (07/2026)"). Format: schau dir ein bestehendes Beispiel an,
z. B. apps/lua/docs/lehrplan-quellen/ (Root-Ebene docs/lehrplan-quellen/, NICHT
apps/lua/docs/) — die *_stufen.json/*_oberstufe.json-Dateien eines der 6
bestehenden Sachfächer (z. B. geschichte) als Formatvorlage nehmen.

1) docs/lehrplan-quellen/mediendemokratie_oberstufe.json: je Schulstufe 9-12,
   Deskriptoren verteilt über die drei Kompetenzbereiche "Medienkompetenz &
   Quellenkritik", "Politische Bildung & Demokratieverständnis", "Kommunikation
   & Meinungsbildung" (exakte Namen aus dem Schema, Groß-/Kleinschreibung/
   Sonderzeichen genau übernehmen). Referenzgröße wie bei den 6 Sachfächern
   (siehe docs/NEXT-STEPS.md, CHANGELOG.md "Welle 2"): ca. 15-25 Deskriptoren
   und 4-8 StoffItems gesamt über die 4 Schulstufen. Inhalte orientieren sich an
   der öffentlich bekannten Fachbeschreibung (Medienkompetenz/Kritikfähigkeit,
   Mechanismen der Medien verstehen — aus der Nationalrats-Debatte 07.07.2026),
   erfinde plausible, altersgerecht gestufte Kompetenzen 9.→12. Schulstufe
   (steigende Komplexität: von "Quelle vs. Meinung unterscheiden" bis
   "Medienwirkung auf demokratische Prozesse kritisch bewerten").

2) docs/lehrplan-quellen/informatikki_oberstufe.json: gleiches Format, drei
   Kompetenzbereiche "Algorithmisches Denken", "KI-Grundlagen & Ethik",
   "Datenschutz & Cybersecurity". Öffentlich bekannte Fachinhalte: Grundlagen,
   Algorithmen, Programmierung, Privatsphäre, Cybersecurity. WICHTIG: Da echte
   Code-Aufgaben in LUKA (noch) nicht unterstützt werden (siehe Plan Phase B),
   formuliere die "Programmierung"-Deskriptoren konzeptuell (Ablauflogik,
   Variablen als Konzept, Algorithmus in eigenen Worten beschreiben) statt
   syntaxbezogen.

3) Nach Fertigstellung: cd apps/lua && node scripts/generate-stoffkatalog-from-
   research.mjs --write ausführen — das generiert automatisch
   apps/lua/apps/web/src/lib/stoffkatalog/{mediendemokratie,informatikki}.ts
   (und inhaltskatalog-Pendants, falls das Skript die auch erzeugt — prüfen).
   Muss ohne Fehler durchlaufen (Sonnets FACH_CODE-Map-Erweiterung ist
   Voraussetzung).

Verifikation: CI=true pnpm --filter @lehrunterlagen/web test (stoffkatalog.test.ts
+ inhaltskatalog.test.ts müssen grün sein — prüfen u. a. dass jede
StoffItem.kategorie in KOMPETENZBEREICHE[fach] existiert und keine doppelten
IDs). CHANGELOG.md als letzter Schritt: frisch lesen, Eintrag oben, nur eigene
Files stagen.
```

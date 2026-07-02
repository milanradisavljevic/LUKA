# Welle 1: Loop-Ernte-Features — Empfehlung des Tages (A) · Wirksamkeits-Ansicht (B) · Tafel-Modus (D)

## Kontext

Das Review ergab: LUKA sammelt Korrektur-Daten (fehler_historie, kriterium_historie), erntet sie aber kaum. Welle 1 baut die drei Ernte-Features mit bestem Nutzen/Aufwand: Dashboard empfiehlt gezielte Übungen aus echten Klassenfehlern (A), KlassenView zeigt, ob Fehlerkategorien über Schularbeiten sinken (B), und jedes Dokument wird per Vollbild-Tafel-Modus zum Unterrichtsmaterial (D). Umsetzung durch **Codex + Opus via Copy-Paste-Prompts** (ein Working-Tree, kein Branch — nur eigene Files stagen). `FEATURES.natascha` wird auf `true` geflippt (Teil von PR A).

Nach Freigabe: Plan als `docs/PLAN-welle1-loop.md` ins Repo speichern (Prompts inklusive), dann verteilt Milan die Prompts.

## Reihenfolge & Aufteilung

| PR | Agent | Wann | Dateien (disjunkt!) |
|---|---|---|---|
| A Empfehlung | Codex | sofort | features.ts, nataschaBridge.ts(+test), DashboardView.tsx, App.tsx |
| B Wirksamkeit | Opus | parallel zu A | natascha_read.rs, main.rs, useNatascha.ts, KlassenView.tsx |
| D Tafel-Modus | Codex | **nach A** (beide App.tsx) | TafelModus.tsx(neu), lib/tafel.ts(neu,+test), Step4_Generate.tsx, App.tsx, commands.ts, CommandPalette.tsx, index.css |

**Konflikt-Regeln:** PR A fasst KlassenView.tsx NICHT an (Helper-Extraktion nur nach nataschaBridge.ts; KlassenView behält sein Inline-Duplikat, B darf es am Ende optional auf den Helper umstellen, falls A schon gelandet ist). CHANGELOG.md = einzige geteilte Datei → als allerletzter Schritt, direkt vorher frisch von Platte lesen, Eintrag oben unter [Unreleased], nur mit eigenen Files stagen.

## PR A — Empfehlung des Tages (+ NATASCHA-Gate auf)

1. `lib/features.ts`: `natascha: true` (macht 4 Views sichtbar: Sidebar.tsx:57-59, navigation.ts:38-39, App.tsx:394-398, aktiviert Step0-Prefill).
2. `lib/nataschaBridge.ts`: `KATEGORIE_LABEL` (R/G/Z/A→Rechtschreibung/Grammatik/Zeichensetzung/Ausdruck) + `buildPrefillFromHeatmap({klasse, aufgabe?, heatmap, ausgangstext?}): NataschaPrefill | null` — Verhalten exakt wie KlassenView.tsx:164-188: anzahl>0 filtern, desc sortieren, Top 3, fokusThemen via Label-Map (Fallback: typ roh), Aufgabenarten = dedupte Union aus `KATEGORIE_TO_BLOCKTYPEN`, fach 'deutsch'/stufe 'oberstufe' (Kommentar: bewusste V1-Limitierung), null bei leerer Heatmap.
3. `views/DashboardView.tsx`: neue Prop `onGenerateUebung?`; im bestehenden NATASCHA-Effect (Z. 71-100) Klasse mit jüngstem Trend-Datum wählen → letzte Aufgabe → `getHeatmap(klasse, aufgabe)` **in try/catch** (getHeatmap wirft, anders als listKlassen!) → Top-Fehler → Karte „Empfehlung des Tages": „7a: häufigster Fehler in SA2 war Zeichensetzung (12×)." Button „Gezielte Übung erstellen" (lucide `Wand2`) → `quelltextGet` (try/catch, optional) → `buildPrefillFromHeatmap` → `onGenerateUebung(prefill)`. Karte verstecken bei keinen Daten/Browser-Modus.
4. `App.tsx`: `onGenerateUebung={handleGenerateUebung}` an **beide** DashboardView-Instanzen (Z. 397 + 421). Handler existiert (Z. 326, inkl. Dirty-Confirm).
5. Tests in `lib/nataschaBridge.test.ts`: Top-3-Ordnung+Dedup, leer→null, unbekannter typ 'X' (Label-Fallback, keine Blocktypen, kein Crash), ohne aufgabe/ausgangstext.

## PR B — Wirksamkeits-Ansicht

1. `src-tauri/src/commands/natascha_read.rs` (nach db_get_klassen_trend, ~Z. 740): `db_get_fehler_trend(klasse) → Vec<FehlerTrendPunkt>`; Struct camelCase: `{aufgabe, datum: Option<String>, nAbgaben, fehler: BTreeMap<String,i64>, fehlerProAbgabe: BTreeMap<String,f64>}`. Zwei Queries: (1) `SELECT aufgabe, MIN(datum), COUNT(*) FROM abgabe WHERE klasse=?1 GROUP BY aufgabe` (seedet auch fehlerfreie SAs), (2) `SELECT a.aufgabe, f.typ, COUNT(*) FROM fehler_historie f JOIN abgabe a ON a.id=f.abgabe_id WHERE a.klasse=?1 GROUP BY a.aufgabe, f.typ`. Normalisierung count/nAbgaben (2 Dezimalen, Division nur bei nAbgaben>0). Sortierung wie Z. 738 (datum, dann aufgabe). typ NICHT auf R/G/Z/A filtern. Kommentar: datum = Import-Zeitpunkt, nicht Prüfungsdatum (gleiche Annahme wie klassen_trend). Kein Schema-Change → Sync-Wächter bleibt grün.
2. `main.rs`: im generate_handler registrieren (nach db_get_klassen_trend, Z. 67).
3. Rust-Tests (mod tests ab Z. 975, setup() nutzt Schema): SA1 (2 Abgaben, Fehler Z,Z,Z,Z,G) vor SA2 (1 Abgabe, Z,G,X): Chronologie, fehlerProAbgabe Z: 2.0→1.0, unbekannter Code 'X' überlebt, SA ohne Fehler = Punkt mit leeren Maps, unbekannte Klasse = leer.
4. `hooks/useNatascha.ts`: `getFehlerTrend` + Interface, Muster getKlassenTrend (Z. 314-320, catch→[]).
5. `views/KlassenView.tsx`: fetch in loadKlasse-Promise.all; Sektion „Wirksamkeit über die Schularbeiten" im Statistik-Tab unter dem Noten-LineChart (JSX-Vorlage Z. 431-439): LineChart, eine Line je R/G/Z/A (`HEATMAP_COLORS`/`HEATMAP_LABELS` Z. 78-81), Y = „Fehler pro Abgabe"; Gate ≥2 SAs mit nAbgaben>0, bei genau 1: Hinweistext „Ab der zweiten Schularbeit siehst du hier, wie sich die Fehlerkategorien entwickeln." Delta-Kacheln letzte vs. vorletzte SA: Rückgang = `TrendingDown` grün (gut!), Anstieg rot; **absolute pro-Abgabe-Werte neben dem Prozent** (kleine Basen → sonst „+100 %"-Alarm bei Rauschen); prev==0&&last>0 → „neu". Ehrlichkeits-Caption: „Zeigt die Entwicklung, keinen Beweis: ob deine Übungen die Ursache sind, lässt sich daraus nicht sicher ablesen."

## PR D — Tafel-Modus

1. `lib/tafel.ts` (neu, testbar): `TafelSlide = {kind:'quelltext',quelltext} | {kind:'block',block}`; `buildTafelSlides(bloecke, quelltexte?)` (Quelltexte zuerst, leere überspringen); `clampFontScale` (0.85–1.6, Schritt 0.15). + `lib/tafel.test.ts`.
2. `components/TafelModus.tsx` (neu): Props `{meta, bloecke, quelltexte?, onClose}`. Fixed inset-0, zIndex 2500, Klasse `tafel-overlay`. Header: Thema, „i / n", Schrift ±, Lösung-Toggle (`Eye`/`EyeOff`, „Lösung (L)"), Beenden (`X`, „Esc"). Slide zentriert maxWidth 900, overflowY auto, `fontSize: calc(1.25rem * scale)`. Block-Slide: `<BlockPreview block showSolution={showSolution} />` — **ohne onUpdate** = read-only, Lösungs-Reveal ist eingebaut. showSolution bei Slide-Wechsel zurücksetzen. Keyboard (window-Listener, Muster App.tsx:197-209): →/Space/PageDown weiter (Space preventDefault), ←/PageUp zurück, L Lösung, +/- Schrift, Esc schließen mit stopPropagation. Body-Scroll-Lock via useEffect.
3. `index.css`: `.tafel-overlay { … }` redefiniert die `--color-*`-Variablen lokal mit den Kreide-Werten aus `:root[data-theme="dark"]` (Z. 151+; CSS-Var-Vererbung stylt alle BlockPreview-Kinder). **Cross-Referenz-Kommentar an beiden Stellen** („Bei Dark-Theme-Änderungen auch .tafel-overlay anpassen"). Kein data-theme-Umschalten (Selektor ist :root-gebunden, würde mit useTheme kollidieren).
4. `App.tsx`: `tafelOpen`-State; Render nahe CommandPalette (~Z. 618) mit `doc?.bloecke ?? state.bloecke` etc., nur wenn bloecke.length>0; `onOpenTafel` an Step4; in handleExecuteResult (Z. 344) case `tafel-modus`: bei Dokument → wizard/generate + öffnen, sonst Toast „Noch kein Dokument da — generiere zuerst eine Unterlage."
5. `Step4_Generate.tsx`: Button „Tafel-Modus" (lucide `Presentation`) im Vorschau-Header (Z. 700-714), sichtbar bei bloecke.length>0, Tooltip „Vollbild für den Beamer — Pfeiltasten blättern, L zeigt die Lösung".
6. `lib/commands.ts`: Command `tafel-modus` (Pattern `tafel|beamer|präsentation`, parse→null = app-handled); `CommandPalette.tsx:46`: in `APP_HANDLED_COMMANDS` aufnehmen (Routing-Muster wie 'new', Z. 185).

## Bekannte Risiken (bewusst akzeptiert)

- `abgabe.datum` = Import-Zeitpunkt, nicht Prüfungsdatum → Chronologie kippt bei nachträglichem Import (konsistent mit bestehendem klassen_trend; Kommentar im Code).
- fach/stufe im Prefill hart 'deutsch'/'oberstufe' (V1, Lehrkraft korrigiert in Step 0; Kommentar im Helper).
- Kreide-CSS ist Kopie des Dark-Themes → Drift-Gefahr, per Kommentar mitigiert.
- Flag-Flip zeigt die 4 NATASCHA-Views erstmals auch im Browser-Dev (Empty/Error-States) → explizit smoke-testen.

## Verifikation

```bash
cd apps/lua && pnpm -r typecheck && pnpm -r test    # vitest ggf. CI (WSL-Flake)
cd src-tauri && cargo test                           # PR B
python3 ../../scripts/check_natascha_schema_sync.py  # muss grün bleiben (kein Schema-Change)
```
Tauri-Smoke: Dashboard-Karte mit Seed-Daten (`natascha_seed_testdaten`/„Testdaten laden" im Dev), Klick landet in Step 0 mit Fokus-Themen; KlassenView-Wirksamkeit mit ≥2 SAs; Tafel-Modus hell+dunkel, Tastatur komplett, keine Emojis.

---

## Copy-Paste-Prompts

### Prompt PR A (Codex — sofort)
```
Lies AGENTS.md und docs/PLAN-welle1-loop.md (PR A). Feature „Empfehlung des Tages":
1) lib/features.ts: natascha auf true.
2) lib/nataschaBridge.ts: KATEGORIE_LABEL (R/G/Z/A → Rechtschreibung/Grammatik/
   Zeichensetzung/Ausdruck) + buildPrefillFromHeatmap({klasse, aufgabe?, heatmap,
   ausgangstext?}) → NataschaPrefill|null. Verhalten exakt wie KlassenView.tsx
   handleGenerateUebung (Z. 164-188): anzahl>0, desc, Top 3, fokusThemen via Label
   (Fallback roher typ), Aufgabenarten dedupte Union aus KATEGORIE_TO_BLOCKTYPEN,
   fach 'deutsch'/stufe 'oberstufe' mit Kommentar „V1-Limitierung", null bei leer.
   KlassenView.tsx NICHT anfassen (parallele Arbeit!).
3) views/DashboardView.tsx: Prop onGenerateUebung?; im NATASCHA-Effect (Z. 71-100)
   Klasse mit jüngstem Trend-Datum → letzte Aufgabe → getHeatmap(klasse, aufgabe)
   ZWINGEND in try/catch (wirft, anders als listKlassen) → Top-Fehler-State.
   Karte „Empfehlung des Tages" über der Klassenübersicht: „<Klasse>: häufigster
   Fehler in <Aufgabe> war <Label> (<n>×)." + Zeile „Ein Klick, und LUKA baut dir
   ein passendes Übungsblatt." Button „Gezielte Übung erstellen" (lucide Wand2):
   quelltextGet in try/catch → buildPrefillFromHeatmap → onGenerateUebung.
   Karte verstecken, wenn keine Daten/kein Tauri. Anrede „du", keine Emojis.
4) App.tsx: onGenerateUebung={handleGenerateUebung} an BEIDE DashboardView-
   Instanzen (Z. 397 und 421).
5) lib/nataschaBridge.test.ts erweitern: Top-3+Dedup, leer→null, unbekannter
   typ 'X', ohne aufgabe/ausgangstext.
Verifikation: pnpm -r typecheck && pnpm -r test; Browser-Smoke: Dashboard ohne
Fehler, die 4 neu sichtbaren NATASCHA-Views zeigen saubere Empty-States.
CHANGELOG.md als LETZTER Schritt: frisch lesen, Eintrag oben, nur eigene Files stagen.
```

### Prompt PR B (Opus — parallel zu A)
```
Lies AGENTS.md und docs/PLAN-welle1-loop.md (PR B). Feature „Wirksamkeits-Ansicht".
KEIN Schema-Change (CI-Sync-Wächter!). Fasse DashboardView/App/nataschaBridge NICHT
an (parallele Arbeit) — deine Files: natascha_read.rs, main.rs, useNatascha.ts,
KlassenView.tsx.
1) src-tauri/src/commands/natascha_read.rs, nach db_get_klassen_trend: neuer Command
   db_get_fehler_trend(klasse) → Vec<FehlerTrendPunkt> (serde camelCase):
   {aufgabe, datum: Option<String>, nAbgaben: i64, fehler: BTreeMap<String,i64>,
   fehlerProAbgabe: BTreeMap<String,f64>}. Query 1: SELECT aufgabe, MIN(datum),
   COUNT(*) FROM abgabe WHERE klasse=?1 GROUP BY aufgabe (seedet auch fehlerfreie
   SAs). Query 2: SELECT a.aufgabe, f.typ, COUNT(*) FROM fehler_historie f JOIN
   abgabe a ON a.id=f.abgabe_id WHERE a.klasse=?1 GROUP BY a.aufgabe, f.typ.
   fehlerProAbgabe = count/nAbgaben (2 Dezimalen, nur bei nAbgaben>0). Sortierung
   wie Z. 738 (datum, dann aufgabe). typ NICHT filtern. Kommentar: datum =
   Import-Zeitpunkt, nicht Prüfungsdatum (gleiche Annahme wie klassen_trend).
2) main.rs: Command registrieren.
3) Rust-Tests (mod tests, setup()-Muster ab Z. 975): SA1 2026-01-10 (2 Abgaben,
   Fehler Z,Z,Z,Z,G), SA2 2026-03-01 (1 Abgabe, Z,G,X): Reihenfolge SA1→SA2,
   fehlerProAbgabe Z 2.0→1.0, Code 'X' überlebt, SA ohne Fehler = leere Maps,
   unbekannte Klasse = leerer Vec.
4) hooks/useNatascha.ts: getFehlerTrend + Interface FehlerTrendPunkt (Muster
   getKlassenTrend Z. 314-320, catch → []).
5) views/KlassenView.tsx, Statistik-Tab unter dem Noten-LineChart (Vorlage
   Z. 431-439): Sektion „Wirksamkeit über die Schularbeiten". LineChart, eine Line
   je R/G/Z/A (HEATMAP_COLORS/HEATMAP_LABELS Z. 78-81), Y „Fehler pro Abgabe".
   Gate: ≥2 SAs mit nAbgaben>0; bei genau 1 SA Hinweis: „Ab der zweiten Schularbeit
   siehst du hier, wie sich die Fehlerkategorien entwickeln." Delta-Kacheln letzte
   vs. vorletzte SA: Rückgang = TrendingDown + grün (gut), Anstieg = TrendingUp +
   rot; absolute pro-Abgabe-Werte NEBEN dem Prozentwert; prev==0&&last>0 → „neu".
   Caption: „Zeigt die Entwicklung, keinen Beweis: ob deine Übungen die Ursache
   sind, lässt sich daraus nicht sicher ablesen." Anrede „du", lucide, keine Emojis.
Verifikation: cd src-tauri && cargo test; pnpm -r typecheck;
python3 scripts/check_natascha_schema_sync.py (Repo-Root) muss grün sein.
CHANGELOG.md als LETZTER Schritt: frisch lesen, Eintrag oben, nur eigene Files stagen.
```

### Prompt PR D (Codex — ERST NACH PR A committen!)
```
Lies AGENTS.md und docs/PLAN-welle1-loop.md (PR D). Feature „Tafel-Modus"
(Vollbild-Beamer-Präsentation). Voraussetzung: PR A ist committet (beide ändern App.tsx).
1) lib/tafel.ts (neu): TafelSlide = {kind:'quelltext',quelltext}|{kind:'block',block};
   buildTafelSlides(bloecke, quelltexte?) — Quelltexte zuerst, leere überspringen;
   clampFontScale (0.85–1.6, Schritt 0.15). Dazu lib/tafel.test.ts (Reihenfolge,
   leere Quelltexte übersprungen, leere bloecke → [], Clamp-Grenzen).
2) components/TafelModus.tsx (neu): Props {meta, bloecke, quelltexte?, onClose}.
   Fixed inset:0, zIndex 2500, className „tafel-overlay". Header: meta.thema,
   „i / n", Schrift kleiner/größer (lucide Minus/Plus), „Lösung (L)" (Eye/EyeOff),
   „Beenden (Esc)" (X). Slide zentriert, maxWidth 900, overflowY auto,
   fontSize calc(1.25rem * scale). Block-Slide: <BlockPreview block={...}
   showSolution={showSolution} /> OHNE onUpdate (read-only, Reveal ist eingebaut).
   showSolution bei Slide-Wechsel auf false. Quelltext-Slide: Titel + Absätze.
   Keyboard (window-Listener, Muster App.tsx:197-209): →/Space/PageDown weiter
   (Space preventDefault), ←/PageUp zurück, L Lösung, +/- Schrift, Esc onClose mit
   stopPropagation. Body-Scroll-Lock (overflow hidden + Cleanup).
3) index.css: .tafel-overlay redefiniert die --color-*-Variablen lokal mit den
   Kreide-Werten aus :root[data-theme="dark"] (ab Z. 151) + background/color.
   An BEIDEN Stellen Kommentar: „Bei Dark-Theme-Änderungen auch .tafel-overlay
   anpassen (Tafel-Modus)." KEIN data-theme-Umschalten.
4) App.tsx: tafelOpen-State; Render nahe CommandPalette: bloecke =
   state.generiertesDokument?.bloecke ?? state.bloecke (analog quelltexte/meta),
   nur bei bloecke.length>0. onOpenTafel an Step4_Generate. In handleExecuteResult
   case 'tafel-modus': bei Dokument → setActiveView('wizard') + Step 'generate' +
   öffnen, sonst Toast „Noch kein Dokument da — generiere zuerst eine Unterlage."
5) components/Step4_Generate.tsx: optionale Prop onOpenTafel; Button „Tafel-Modus"
   (lucide Presentation) im Vorschau-Header (Z. 700-714), sichtbar bei
   bloecke.length>0, title „Vollbild für den Beamer — Pfeiltasten blättern,
   L zeigt die Lösung".
6) lib/commands.ts: Command id 'tafel-modus', Label „Tafel-Modus starten",
   Pattern /^(tafel(-?modus)?|beamer|pr(ä|ae)sentation)$/i, parse → null;
   components/CommandPalette.tsx: 'tafel-modus' in APP_HANDLED_COMMANDS
   (Routing wie 'new').
Verifikation: pnpm -r typecheck && pnpm -r test; manuell: Dokument mit Quelltext
generieren, Tafel via Step4-Button UND Palette („tafel") öffnen, Quelltext-Folie
zuerst, Pfeiltasten/L/±/Esc, Kreide-Look in hellem UND dunklem App-Theme identisch,
keine Emojis. CHANGELOG.md als LETZTER Schritt: frisch lesen, Eintrag oben, nur
eigene Files stagen.
```

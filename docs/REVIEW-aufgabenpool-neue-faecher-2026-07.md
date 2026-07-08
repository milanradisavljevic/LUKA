# Review: Aufgabenpool-Entwürfe „Medien und Demokratie" + „Informatik und KI" (2026-07-08)

Didaktik-/Produkt-Review von 17 echten LLM-Generierungsläufen (`scripts/generate-aufgabenpool-draft.mjs`,
Kompetenz-Modus) für die zwei neuen AHS-Pflichtfächer. Basis: `deepseek-draft.json` (12/12 Kombis, 14
PoolEntries) und `mistral-draft.json` (3/12 Kombis, 3 PoolEntries, Rest durch Mistral-Rate-Limit
abgebrochen — siehe A7). Rohdateien liegen ungetrackt unter `apps/lua/scripts/out/` (`.gitignore`),
dieser Bericht zitiert die relevanten Stellen direkt.

**Gesamturteil:** Beide neuen Fächer sind über die bestehende Pipeline (kein neuer Code, kein neuer
Blocktyp) technisch bespielbar — das ist die gute Nachricht. Die Qualität pro Einzelblock ist meist
solide bis gut (österreichische Fakten stimmen überwiegend, Fake/Fakt/Meinung-Items sind lehrreich,
Rollenspiel-Struktur ist didaktisch sauber). Der Bericht fand aber einen **strukturellen Pipeline-Bug**
(A1), der zwei von 14 DeepSeek-Einträgen faktisch unbrauchbar macht, und einen **Sprach-Leck-Bug** (A2),
der Fach-fremde Sprache (Englisch) in deutschsprachige Aufgaben für beide neuen Fächer und beide Provider
einschleust. „Konzepte zuerst ohne neuen Blocktyp" ist für informatikki mit einer Einschränkung tragfähig:
die Trace-Tabelle rutscht bereits jetzt spürbar in echte Code-Syntax (`print(a)`, `a = a + b`) — kein
Showstopper für V1, aber ein Warnsignal für die V2-Entscheidung. mediendemokratie ist inhaltlich näher an
„sofort einsatzbereit", weil es ausschließlich etablierte Blocktypen ohne Sonderfall nutzt — vorausgesetzt
A1 und A2 werden vor dem Seeding gefixt.

---

## Teil A — Generierung (Ergebnis)

- `pnpm -r build`: grün, alle Packages inkl. `apps/web` (kein dnd-kit/recharts-Fehlschlag wie erwartet —
  node_modules-Reparatur war erfolgreich).
- DeepSeek-Lauf: **12/12 Kombis erfolgreich, 14 PoolEntries** (2 Kombis liefern je 2 Blöcke).
- Mistral-Lauf: **3/12 Kombis erfolgreich** (zweimal probiert, identisches Muster: exakt 3 Erfolge, dann
  `429 Rate limit exceeded` für den Rest — siehe A7). Zusätzlich ein **struktureller Validierungsfehler**
  unabhängig vom Rate-Limit: `mediendemokratie · Politische Institution und ihre Funktion: - bloecke.0.config:
  Es muss mehr Optionen als Items geben` — Mistral hat bei `matching` nicht genug Distraktor-Optionen
  generiert und die Zod-Validierung (zu Recht) verworfen.
- Render-Test: 2 grenzwertige DeepSeek-Einträge (`tabelle` Trace-Tabelle, `roleplay` Datenschutz-Diskussion)
  echt zu DOCX gerendert (`packages/renderer`), beide Läufe crashfrei, Struktur augenscheinlich sauber
  (Tabelle mit Lücken-Unterstrichen, Rollenkarten mit Redemittel-Boxen). Dateien unter `apps/lua/scripts/out/`.

## Teil B — Funde

### A1 (K) — Kompetenz-Modus verwirft `quelltexte` komplett → 2/14 Einträge faktisch kaputt

Das Skript baut für die Kombi „Quellenkritik an einem Beispieltext" (mediendemokratie, Schulstufe 12)
bewusst einen festen Quelltext (fiktiver Social-Media-Post über ein „Steuer-Gerücht") und hängt ihn per
`quelleId: 'q1'` an `markieraufgabe` und `offeneVerstaendnisfrage`. Der generierte Output ignoriert diesen
Text jedoch komplett und erfindet einen völlig anderen Blogpost über Stadt-Kriminalität:

> Quelltext (Skript-Vorgabe): *„SKANDAL! Die Regierung plant angeblich neue Steuern für alle Familien —
> das steht so in keinem offiziellen Dokument, aber alle reden davon! [...] Ein Sprecher des
> Finanzministeriums wollte sich bis Redaktionsschluss nicht äußern."*
>
> Generierte `loesung.stellen` (markieraufgabe): *„Die Stadt ist total heruntergekommen – das sieht doch
> jeder!"*, *„Aber ich sage euch: Die Kriminalität steigt rasant."*, *„Mein Cousin wurde letztens
> überfallen."*

Die zweite Aufgabe (`offeneVerstaendnisfrage`) baut direkt darauf auf und zitiert sogar einen Satz, der in
keinem der beiden Texte vorkommt: *„Der Satz „Laut einer Umfrage der Stadt Wien vom Mai 2024 fühlen sich
62 % der Bewohner sicher" ist ein Fakt [...]"*.

**Root Cause gefunden** (kein Zufallstreffer des Modells): `packages/llm/src/prompt.ts` baut im
Kompetenz-Modus das User-Objekt explizit **ohne** `quelltexte`:

```js
const kompetenzUser = {
  meta: input.meta,
  stoffItems: input.stoffItems ?? [],
  angeforderteBloecke: input.bloecke,   // <- kein quelltexte-Feld
};
```

und sagt dem Modell sogar explizit: *„Jeder Block muss ein vollstaendiges Objekt [...] sein (quelleId
entfaellt im Kompetenz-Modus)."* (prompt.ts, Zeile ~846). Das Modell bekommt den echten Quelltext also
nie zu sehen und erfindet zwangsläufig einen eigenen — konsistent mit dem im System-Prompt dokumentierten
Vertrag „KOMPETENZ-MODUS: Es gibt KEINE Quelltexte. Du ERFINDEST die Inhalte selbst" (prompt.ts, Zeile
~665). `validate.ts` setzt den echten `quelltexte`-Wert danach zwar wieder ins fertige `DocumentV1` ein
(Zeile 92), aber Text und Lösung passen inhaltlich nicht mehr zusammen. Verschärfend: `PoolEntry`
(`apps/web/src/lib/pool.ts`) hat **kein `quelltexte`-Feld** — der Pool-Eintrag speichert nur `blockJson`,
der Quelltext geht beim Export also ohnehin verloren. Diese zwei Einträge sind damit doppelt kaputt: im
Draft schon inhaltlich inkonsistent, und selbst korrekt generiert könnten sie im Pool nicht funktionieren,
weil `quelleId: 'q1'` beim späteren Zusammenbau ins Leere zeigt.

**Fix (vor jedem Seeding zwingend):** `generate-aufgabenpool-draft.mjs` darf für Kombis mit `quelltext` NICHT
`modus: 'kompetenz'` verwenden — diese Kombination ist architektonisch nicht vorgesehen. Entweder (a) diese
eine Kombi im Text-Modus (`modus: 'text'`) generieren, oder (b) für den Pool grundsätzlich auf
quelltextgebundene Blocktypen bei „Kompetenz-Draft"-Kombis verzichten (dann `markieraufgabe`/
`offeneVerstaendnisfrage` für mediendemokratie durch einen anderen Blocktyp ersetzen). Unabhängig davon:
`PoolEntry`/`pool.ts` bräuchte ein `quelltexte`-Feld, falls Pool-Einträge mit Quellenbezug künftig
überhaupt vorgesehen sind — sonst sind quelleId-tragende Blocktypen im Pool grundsätzlich nicht seedbar.

### A2 (K) — Sprachleck: Rollenspiel/Debatte-Blöcke rutschen in Englisch, obwohl Zielsprache Deutsch ist

Zwei unabhängige Belege, zwei Provider, zwei Fächer:

**Mistral, mediendemokratie, `rollenkartenSet` (Nationalratsdebatte):**
```json
"sprachhinweis": "present simple (Fakten) · because · in order to · it is clear that"
```
```json
"sprachhinweis": "I disagree because · although · however · let me point out that"
```
Das ist die Grammatik-Metasprache und Redemittel-Sprache des Englischunterrichts, mitten in einer
deutschsprachigen Nationalratsdebatte-Simulation.

**DeepSeek, informatikki, `roleplay` (Diskussion: Datenschutz vs. Bequemlichkeit):** der komplette Block
ist auf Englisch — Rollenbeschreibungen, Redemittel, Musterdialog:
```json
"name": "Convenience Advocate",
"beschreibung": "You believe that modern life should be as easy and fast as possible. [...]",
"redemittel": ["I think convenience saves time and effort.", "For example, my smart speaker helps me
  with my daily schedule.", "I don't mind sharing data if it makes my life easier."]
```
Nur die Rahmen-Texte des Renderers („Deine Aufgabe:", „Nützliche Redemittel") bleiben Deutsch — im
gerenderten Schüler-DOCX (`scripts/out/pool-sample_informatikki_roleplay_schueler.docx`, Render-Test
verifiziert) steht ein sichtbar zweisprachiger Flickenteppich.

**Root Cause gefunden:** `packages/llm/src/prompt.ts` injiziert die einzige explizite
Sprach-Instruktion überhaupt (`spracheHinweis`, Zeile ~774) nur, wenn `istSprachfach(input.meta.fach)`
wahr ist:
```js
const spracheHinweis = istSprachfach(input.meta.fach)
  ? `SPRACHE: Dies ist eine ${...}-Unterlage. JEDER schuelerseitige Inhalt MUSS auf ${zielsprache} sein — ...`
  : '';
```
`mediendemokratie` und `informatikki` sind laut `FACH_META` (Phase A, korrekt) `sprachfach: false` — also
bekommt das Modell für beide Fächer **nie** die Instruktion „schreib auf Deutsch". Bei etablierten
Nicht-Sprachfächern (Deutsch, Geschichte, Biologie …) fällt das nie auf, weil deren Few-Shot-Beispiele im
Prompt durchgehend Deutsch sind. Aber das rollenkartenSet-Beispiel in `BLOCK_REGELN` (geteilt von Text- und
Kompetenz-Modus) ist selbst auf Englisch (`"rahmen": "Disaster Reports — live TV news"`, prompt.ts Zeile
~605) — ohne Gegen-Instruktion zieht das Modell für neue, ihm unbekannte Fächer diesen Sprach-Anker.

**Fix:** `spracheHinweis` (oder eine neue, sprachfach-unabhängige „STANDARDSPRACHE"-Regel) auch für
Nicht-Sprachfächer explizit setzen: „Sofern nicht ausdrücklich ein Fremdsprachenfach, MUSS jeder
schülerseitige Inhalt auf Deutsch sein." Betrifft `packages/llm/src/prompt.ts`, eine Zeile Scope-Erweiterung
— kein Blocktyp-/Schema-Eingriff nötig, sollte vor dem nächsten Bulk-Lauf für beide neuen Fächer gefixt
werden, sonst landet Englisch zufällig im Live-Pool.

### A3 (V) — Trace-Tabelle rutscht bereits in echte Code-Syntax

DeepSeeks Trace-Tabelle (informatikki, `tabelle`) sollte laut Plan „reine Werte ohne Syntax-Highlighting"
sein — die Zeilenbeschriftungen enthalten aber echte Zuweisungs- und Funktionsaufruf-Syntax:
```json
{ "text": "4 (a = a + b)" }, { "text": "5 (print(a))" }, { "text": "6 (print(b))" }
```
Das ist Python-artige Syntax (`print(x)`, Zuweisung mit `=`) — kein Blocktyp-Rendering-Problem (der
Render-Test zeigt eine saubere, funktionierende Tabelle, siehe unten), aber ein didaktisches Signal: selbst
mit expliziter „keine Syntax"-Vorgabe im Skript-Kommentar hat das Modell in der Aufgabenstellung selbst
Code-Syntax eingebaut, weil eine Trace-Tabelle ohne *irgendeine* Notation für den Programmablauf kaum
sinnvoll formulierbar ist. Für V1 unkritisch (Schüler:innen sehen nur Text in Klammern, keine echte
Code-Formatierung), aber ein reales Argument für die V2-Entscheidung „eigener Code-Blocktyp": der Bedarf
zeigt sich schon jetzt am Rand des bestehenden `tabelle`-Typs, nicht erst in Zukunft.

### A4 (V) — Politische Fakten teils veraltet/unpräzise formuliert (Mistral)

Mistrals `rollenkartenSet`-Szenario 4 („Verlängerung der Kernkraft-Moratoriums") suggeriert, Österreich
hätte aktuell laufende Kernkraftwerke unter einem befristeten Moratorium:
```json
"fakten": "Österreich · aktuell bis 2025 · Debatte über Verlängerung bis 2035 · Ziel: Versorgungssicherheit"
```
Tatsächlich hat Österreich seit dem Bundesverfassungsgesetz für ein atomfreies Österreich (1999) und dem
Atomsperrgesetz (1978) ein grundsätzliches, verfassungsrechtlich verankertes Verbot der Kernenergienutzung
— kein zeitlich befristetes „Moratorium", das 2025 ausläuft. Für eine Debattenübung ist ein fiktives
Szenario legitim, aber es sollte nicht wie ein reales, aktuell laufendes politisches Faktum wirken, das
Schüler:innen unreflektiert übernehmen könnten (Gefahr: „Info-Dot"-artige Verwechslung von Übungsszenario
und Realität). Gleiches Muster, weniger gravierend: die im EU-Vergleich zu pauschal formulierte
„Kategorisierung"-Aufgabe (siehe A5).

### A5 (V) — Fakt/Meinung/Fake-Grenzfälle uneinheitlich zwischen Providern gelöst

Beide Provider bauen einen strukturanalogen Satz ein („Alle X lügen/tun Y — das ist doch klar!"), lösen ihn
aber unterschiedlich:
- DeepSeek: *„Alle Politiker lügen – das ist doch klar!"* → Lösung: **Fake**
- Mistral: *„Alle Influencer lügen – das sieht man doch an ihren perfekten Fotos!"* → Lösung: **Meinung**

Beide Sätze sind strukturell identisch (überzogene, unbelegte Verallgemeinerung mit Meinungscharakter,
kein konkreter Falschfakt) — fachlich ist „Meinung" (bzw. „polemische/populistische Meinung") die
präzisere Kategorie, „Fake" impliziert eine konkrete, überprüfbar falsche Tatsachenbehauptung. Für einen
Fakt/Meinung/Fake-Baustein, dessen ganzer Witz die klare Abgrenzung dieser drei Kategorien ist, ist das
eine spürbare inhaltliche Unschärfe — genau der Grenzfall, den ein Reviewer vor dem Seeding händisch klären
sollte.

Kleinerer Nebenbefund im gleichen Block (DeepSeek, `informatikki`-Kategorisierung „Personenbezogene vs.
nicht-personenbezogene Daten"): *„Die IP-Adresse 192.168.1.1, die einem bestimmten Computer zugeordnet
ist"* wird als „Personenbezogene Daten" gewertet — 192.168.1.1 ist allerdings die Standard-Router-Adresse
in Millionen privater Heimnetzwerke (privater/lokaler Adressraum, nicht öffentlich routbar) und damit
gerade **kein** Beispiel, das eine Person im Internet identifizierbar macht. Fachlich nicht falsch
(private IPs sind im lokalen Kontext personenbeziehbar), aber ein didaktisch unglückliches Beispiel, weil
es die reale DSGVO-Debatte um öffentliche IP-Adressen verwässert.

### A6 (V) — `rollenkartenSet` für „Nationalratsdebatte" bleibt generisches Pro/Contra-Debattenformat

Frage aus dem Auftrag: trägt der Blocktyp echte parlamentarische Substanz, oder ist er zweckentfremdet?
Beide Provider liefern strukturell dasselbe Muster: zwei generische Rollen („Redner/in Pro" / „Redner/in
Contra" bei DeepSeek, „Abgeordnete:r der Regierungspartei" / „Oppositionspolitiker:in" bei Mistral — Mistral
ist hier einen Schritt näher an echter Parlamentslogik) und vier komplett austauschbare Debattenthemen
(Tempolimit, Plastikflaschenverbot, Handyverbot an Schulen, Sozialjahr bei DeepSeek). Keines der Szenarien
nutzt echte Nationalrats-Mechanik (Ausschusslogik, Klubzwang, Lesungen, Abstimmungsverfahren, Rolle
des/der Nationalratspräsident:in) — es ist im Kern ein generisches Pro/Contra-Rollenspiel mit
„Nationalrat"-Kulisse. Für den Kompetenzbereich „Politische Bildung & Demokratieverständnis" ist das
vertretbar (Debattenkompetenz ist ein legitimes Lernziel), deckt aber eher „Argumentation/Rhetorik" als
„Funktionsweise des Nationalrats" ab — ein Diskrepanz-Kandidat zwischen angefragter Kompetenzkategorie und
tatsächlichem Fokus des Outputs (Auftragspunkt 4). Kein Blocker, aber ein Punkt für den Review-Pass:
mindestens EIN Szenario sollte echte parlamentarische Verfahrensschritte einbauen, sonst bleibt der
Fach-Bezug zu „Nationalrat" nur ein Etikett.

### A7 (V) — Mistral: reproduzierbares Hard-Limit bei 3 Requests/Lauf, kein Retry/Backoff im Skript

Zwei unabhängige Läufe (auch nach 75s Pause) zeigen exakt dasselbe Muster: 3 erfolgreiche Requests, danach
`429 Rate limit exceeded` für den gesamten Rest — kein Zufallsartefakt, sondern eine harte
Mistral-Kontingentgrenze (vermutlich Free-/Trial-Tier, sehr niedriges RPM-Limit). `packages/llm` hat aktuell
keine Retry-mit-Backoff-Logik für 429-Antworten. Für einen 12-Kombi-Bulk-Lauf macht das Mistral in der
aktuellen Konfiguration **nicht praxistauglich als Pool-Default** — nicht wegen Contentqualität (die 3
erfolgreichen Einträge sind eher besser als DeepSeeks Pendants, siehe Fazit unten), sondern rein wegen
Kontingent. Fix wäre ein generischer 429-Backoff in `packages/llm` (exponentielles Retry mit Jitter,
z. B. 3 Versuche à 10/30/60s) — nutzt allen Bulk-Skripten, nicht nur diesem.

---

## Provider-Vergleich (Auftragspunkt 5)

| Kriterium | DeepSeek (12/12) | Mistral (3/12, rate-limited) |
|---|---|---|
| Vollständigkeit im Bulk-Lauf | vollständig | scheitert strukturell (A7) |
| Strukturkonformität (Zod) | 12/12 sauber | 1/12 hart fehlgeschlagen (`matching`: zu wenig Optionen) |
| Österreich-Fakten (die 3 vergleichbaren Blöcke) | korrekt, „Jänner" statt „Januar" verwendet | korrekt bis auf A4 (Kernkraft-Moratorium) |
| Sprachleck (A2) | 1 Block komplett Englisch | 1 Block mit englischen Grammatik-Fachbegriffen |
| Musterlösungs-/Erwartungshorizont-Tiefe | gut, 4 Dimensionen (Inhalt/Struktur/Ausdruck/Sprachrichtigkeit) | gleich gut, tendenziell etwas ausführlicher (Leserbrief-Musterlösung wirkt runder) |

**Empfehlung:** DeepSeek bleibt der praktikablere Pool-Default — nicht weil die Inhaltsqualität klar besser
wäre (bei den vergleichbaren 3 Kombis eher gleichauf, minimal zugunsten Mistral bei Detailtiefe), sondern
weil Mistral im aktuellen Setup schlicht nicht zuverlässig 12 Kombis am Stück liefert (A7). Sollte A7
gefixt werden (Backoff), lohnt sich ein erneuter Mistral-Vollvergleich — die Stichprobe deutet auf
mindestens gleichwertige Qualität hin.

## Rendering-Check (Auftragspunkt 7)

Beide Test-Renders (`tabelle`, `roleplay`) liefen crashfrei durch `renderDocument` und ergaben strukturell
saubere DOCX (Tabellenzellen mit korrekten Unterstrich-Lücken bzw. befüllten Lösungswerten im
Lösungsdokument, Rollenkarten mit sauber getrennten Redemittel-Bullet-Points). Keine Rendering-Bugs
gefunden — das bestätigt, dass A1–A6 reine Content-/Prompt-Fragen sind, kein Renderer-Problem.

## Was gut funktioniert hat (ehrlich benannt)

- Österreich-Bezug bei Fakten, die tatsächlich geprüft wurden (Wahlalter 16, passives Wahlrecht
  Bundespräsident 35 Jahre, Verhältniswahlrecht, Institutionen-Funktionen Nationalrat/Bundesregierung/
  Verfassungsgerichtshof/Rechnungshof/Landtag/Bundespräsident) ist **durchgehend korrekt** — keine
  bundesdeutschen Institutionen, kein „Bundestag" statt „Nationalrat".
- `matching`-Constraint „mehr Optionen als Items" wurde von DeepSeek in beiden Fällen korrekt eingehalten
  (6 Items/7 Optionen bzw. 5 Items/6 Optionen) — Mistrals einziger struktureller Fehlschlag zeigt, dass die
  Zod-Validierung genau das abfängt, wofür sie da ist.
- Cybersecurity-Begriffe (Phishing, Malware, Ransomware, Trojaner, HTTPS-Schloss-Symbol) sind fachlich
  präzise und schulgerecht erklärt, keine Fehlkonzepte gefunden.
- Der Entwurfscharakter drängt sich im generierten Content selbst nirgends vor — kein Block behauptet,
  „offizielle Prüfungsfrage" zu sein; die Ehrlichkeits-Markierung passiert korrekt auf PoolEntry-Ebene
  (`quelleHinweis: "LLM-Entwurf, ungeprüft"`), nicht im Blockinhalt.
- Rollenspiel-Struktur (Redemittel pro Rolle, Bewertungskriterien, Musterdialog) ist bei beiden Providern
  didaktisch stimmig aufgebaut, wenn man die Sprachfrage (A2) ausklammert.

---

## Nachtrag: A1 + A2 gefixt und live verifiziert (2026-07-08)

Commit `0ac7616` behebt A1 (`generate-aufgabenpool-draft.mjs`: `modus` dynamisch
nach `kombi.quelltext`) und A2 (`prompt.ts`: `spracheHinweis` auch für
Nicht-Sprachfächer). Validierungslauf `LLM_PROVIDER=deepseek node
scripts/generate-aufgabenpool-draft.mjs --only mediendemokratie` (6/6 Kombis):

- **A1 bestätigt behoben:** `markieraufgabe`/`offeneVerstaendnisfrage` der
  Quellenkritik-Kombi zitieren jetzt den echten Skript-Quelltext wortgleich
  ("SKANDAL!", "Teilt diesen Post, damit es alle wissen!") statt einen
  erfundenen Text über Stadt-Kriminalität.
- **A2 bestätigt behoben:** Die Nationalratsdebatte (`rollenkartenSet`) ist
  jetzt durchgehend Deutsch — `sprachhinweis` liefert deutsche Redeaufbau-
  Signalwörter ("meiner Meinung nach", "dafür spricht") statt englischer
  Grammatik-Fachbegriffe ("present simple", "because").

A3–A7 (Verbesserungen/Kür) bleiben offen für den menschlichen Review-Pass vor
dem produktiven `seed_pool`-Lauf.

## Finaler Regen mit Fixes (2026-07-08)

Voller 12-Kombi-Lauf nach A1+A2-Fix:
- **DeepSeek** (`scripts/out/deepseek-final.json`): **12/12 Kombis, 14 PoolEntries** —
  automatischer Sprachleck-Scan über alle 14 Einträge: **0 verdächtig** (A2-Fix
  hält über den vollen Lauf, nicht nur die Stichprobe).
- **Mistral** (`scripts/out/mistral-final.json`): **4/12**, Rest erneut hartes
  `429 Rate limit exceeded` (A7 reproduzierbar bestätigt, zweiter unabhängiger
  Lauf mit identischem Muster). Kein Blocker für V1 — DeepSeek bleibt Pool-Default.

**Status: bereit für den menschlichen Review-Pass.** Beide Dateien liegen unter
`apps/lua/scripts/out/` (gitignored, lokal reproduzierbar per obigen Befehlen).
Review-Checkliste für Milan/Kimi vor `seed_pool`: A4 (politische Fakten-Szenarien
gegenlesen), A5 (Fakt/Meinung/Fake-Grenzfälle vereinheitlichen), A6
(Nationalratsdebatte-Szenarien um echte Parlamentsmechanik ergänzen, optional).

## Priorisierte Aktionsliste

Schweregrade wie `docs/AUDIT-prompts-didaktik.md`: **K** = kritisch (vor Seeding fixen) · **V** =
Verbesserung · **Kür** = nice-to-have.

| # | Sev | Was | Datei(en) | Aufwand |
|---|---|---|---|---|
| 1 | K | Kompetenz-Modus + `quelltext`-Kombi nicht mischen — Quellenkritik-Kombi auf Text-Modus umstellen ODER Blocktyp tauschen (A1) | `apps/lua/scripts/generate-aufgabenpool-draft.mjs` | klein |
| 2 | K | `spracheHinweis` (oder neue Regel) auch für Nicht-Sprachfächer setzen: „Standardsprache Deutsch, sofern kein Fremdsprachenfach" (A2) | `apps/lua/packages/llm/src/prompt.ts` | klein |
| 3 | K | Vor jedem Seeding: alle Blöcke stichprobenartig auf Sprachleck + Quelltext-Konsistenz prüfen (Review-Pass-Checkliste), bis Fix #2 verifiziert ist | Review-Pass (Milan/Kimi) | — |
| 4 | V | 429-Backoff (exponentiell, 3 Versuche) für LLM-Provider-Calls ergänzen, damit Bulk-Läufe nicht an Rate-Limits reißen (A7) | `apps/lua/packages/llm/src/*.ts` (Provider-Layer) | mittel |
| 5 | V | Mistrals `matching`-Fehlschlag (zu wenig Optionen) ist bereits durch Zod abgefangen — kein Fix nötig, aber Review-Pass sollte bei Mistral-Retries gezielt auf `matching`-Blöcke achten | — | — |
| 6 | V | Fakt/Meinung/Fake-Grenzfälle (A5) und politische Szenario-Fakten (A4) im menschlichen Review-Pass gezielt gegenlesen, bevor `seed_pool` läuft | Review-Pass | — |
| 7 | V | `rollenkartenSet`-Kombi „Nationalratsdebatte" um mindestens 1 Szenario mit echter Parlamentsmechanik erweitern (Ausschuss/Lesung/Klubzwang), damit Fach-Bezug über reines Pro/Contra hinausgeht (A6) | `apps/lua/scripts/generate-aufgabenpool-draft.mjs` (Kombi-Definition) oder Prompt-Notiz | klein |
| 8 | Kür | `PoolEntry`/`pool.ts` um optionales `quelltexte`-Feld erweitern, falls quellengebundene Blocktypen im Pool grundsätzlich vorgesehen bleiben sollen (Folgefrage aus A1) | `apps/lua/apps/web/src/lib/pool.ts`, `src-tauri/src/commands/pool.rs`, `seed_pool.rs` (geplant) | mittel, eigener PR |
| 9 | Kür | V2-Entscheidung „eigener Code-Blocktyp" mit A3 als frühem Signal erneut aufrufen, sobald informatikki-Content-Volumen wächst | — | — |

---

## Verifikation dieses Reviews

```bash
cd apps/lua && pnpm -r build   # grün, alle Packages inkl. apps/web
LLM_PROVIDER=deepseek node scripts/generate-aufgabenpool-draft.mjs --out deepseek-draft.json   # 12/12, 14 Entries
LLM_PROVIDER=mistral  node scripts/generate-aufgabenpool-draft.mjs --out mistral-draft.json    # 3/12 (Rate-Limit, reproduzierbar)
node scripts/render-pool-draft-sample.mjs scripts/out/deepseek-draft.json b5f03b4b ac0f491b    # 2x DOCX, crashfrei
```
Rohdateien (`scripts/out/*.json`, `*.docx`) sind über `.gitignore` (`scripts/out/`) bewusst nicht
committet — Review-Pass-Verantwortliche können sie durch erneuten Lauf der obigen Befehle reproduzieren.

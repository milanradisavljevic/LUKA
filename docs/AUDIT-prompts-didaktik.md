# Prompt-Didaktik-Audit — Befunde (2026-07-03)

Vollaudit der LLM-Prompts beider Apps mit Doppel-Blick LLM-Technik × Didaktik.
Gelesen: `packages/llm/src/prompt.ts` (komplett, inkl. 17 Beispiel-JSONs),
`judge.ts`, `quality.ts`, `natascha_core.py` (Korrektur-Text + Vision + SRDP-Detail,
Profil/Briefing), `prompts/PROMPT_ERWARTUNGSHORIZONT.md`, Rubrik-Stichprobe
(srdp_deutsch_oberstufe, kommentar, deutsch_unterstufe).

**Gesamturteil:** Beide Prompt-Systeme sind überdurchschnittlich reif. LUA hat
Bloom-Steuerung, CEFR-Anker, 4-Punkte-Distraktor-Standard, Typ-Tausch-Verbot,
Coverage-Regel, Terminologie-Konservierung, Injection-Härtung und einen
Solve-then-Compare-Judge. NATASCHA hat rubrikgetriebene Kriterien-Schlüssel,
Erwartungshorizont-Injektion, Anti-KI-Floskel-Regeln und DSGVO-datenminimierte
Aggregat-Prompts. Die Befunde unten sind gezielte Lücken, keine Baustellen.

Schweregrade: **K** = didaktisch kritisch · **V** = Verbesserung · **Kür** = nice-to-have.

---

## LUA — Generierung (`packages/llm/src/prompt.ts`)

### A1 (V) Keine Operatoren-Didaktik außerhalb des Matura-Modus → Patch P1
Operatoren („fasse zusammen", „analysiere", „erörtere") kommen nur im
`maturaHinweis` vor (prompt.ts:763). Normale Schularbeiten/Übungen haben keine
Regel für operationalisierte Arbeitsanweisungen — die Beispiele zeigen sogar
Generisches („Beantworte die Fragen zum Text.", Z. 262/313). NATASCHAs
Erwartungshorizont-Template arbeitet dagegen operatorenbasiert → der Loop
spricht zwei Sprachen. **Fix:** Abschnitt „ARBEITSANWEISUNGEN (Operatoren)" in
BLOCK_REGELN: jede Anweisung nennt Operator + Gegenstand + ggf. Textbezug,
Anforderungsbereiche I–III an Bloom gekoppelt, Leerformeln verboten.

### A2 (V) Österreich-Register nur als Rollen-Etikett → Patch P1
„oesterreichisches AHS-Gymnasium" steht in der Rolle (Z. 8), aber es gibt keine
Regel zur österreichischen Standardvarietät. Risiko: bundesdeutsche Marker in
Unterlagen (Abitur statt Matura, Januar statt Jänner in erfundenen Beispielen
des Kompetenz-Modus). **Fix:** Abschnitt „ÖSTERREICHISCHES DEUTSCH" in
BLOCK_REGELN (gilt für beide Modi): österr. Standardvarietät ist Zielnorm bei
deutschsprachigen Inhalten; Schulterminologie (Matura, Schularbeit, 5. Klasse
AHS); keine bundesdeutschen Institutionen in erfundenen Szenarien.

### A3 (K) Textbezug bei Verständnisfragen nicht erzwungen → Patch P1
Die Coverage-Regel (Z. 46-49) verteilt Aufgaben über Absätze, verlangt aber
nicht, dass Fragen NUR aus dem Text beantwortbar sind. Genau hier entstehen
generische Allerwelts-Fragen („Was ist die Hauptaussage?"), die zu jedem Text
passen — häufigster KI-Schwachpunkt, Punkt 6 der Didaktik-Testliste. Der Judge
prüft zwar Beantwortbarkeit aus dem Text (judge.ts:26), aber erst nachgelagert
und nur als Warnung. **Fix:** Regel bei offeneVerstaendnisfrage: Frage muss
textspezifisch sein (ohne den Text nicht beantwortbar), bei nummerierten
Absätzen Absatzbezug in Frage oder Musterantwort; Negativbeispiel nennen.
Beispiel-JSON (Z. 318) bekommt einen Absatzbezug.

### A4 (Kür) Verstümmelte Überschrift im Live-Prompt → Patch P1
Z. 92: „2. LaeNGEN- ae HNLIChKEIT:" — kaputtes ASCII-Escaping mitten im
Distraktor-Abschnitt. Kostet Prompt-Klarheit. Fix: „LAENGEN-AEHNLICHKEIT".
Achtung: exakt so testgepinnt (prompt.test.ts:143) — Pin wird mitgezogen.

### A5 (V, Follow-up — nicht in dieser Serie) Judge-Lücke bei Musterlösungs-Typen
`RISIKO_TYPEN` = MC/matching/lueckentext/offeneVerstaendnisfrage (judge.ts:5-10).
`fehlerkorrektur` und `umformung` (fehleranfällige Musterlösungen!) haben im
Text-Modus keinen Judge — der Kompetenz-Judge (judge.ts:202) prüft sie nur im
Kompetenz-Modus. Empfehlung: Kompetenz-Judge auch im Text-Modus für diese zwei
Typen aktivieren. Eigener PR, da Judge-Architektur betroffen.

### A6 (Kür, P4 optional) Zeitbudget fehlt
`BLOCK_TYPE_DEFS`-Minutenschätzungen fließen nicht in den Prompt; Umfang wird
nicht gegen Unterlagentyp/Zeit kalibriert. Erst relevant, wenn Natascha Punkt 5
der Testliste (Zeitschätzung) als Problem meldet.

### Positiv (nicht anfassen)
Injection-Härtung zweischichtig (Regel Z. 12 + `sanitizeQuelltext`);
Typ-Tausch-Verbot mit Architektur-Begründung; Distraktor-Standard mit Positiv-/
Negativbeispielen (didaktisch vorbildlich); Wortbank-/Verbform-Trennung;
manuell-hybride Eingabe wortgleich geschützt; Beispiele decken alle 17 Typen.

---

## NATASCHA — Korrektur (`natascha_core.py`)

### N1 (K) Stille Fixture-Kopplung im Live-Prompt → Patch P2
`load_example_fixture()` (Z. 425-430) bettet die **alphabetisch erste** Datei
aus `tests/fixtures/` als BEISPIEL-JSON in jeden Korrektur-Prompt. Aktuell
`beispiel_deutsch_kommentar.json` — legt jemand `aaa_test.json` ab, ändert sich
das Modellverhalten aller Korrekturen still. **Fix:** explizit auf
`beispiel_deutsch_kommentar.json` pinnen, Fallback erste sortierte Datei.

### N2 (V) Drei Zahlenkonventionen ohne Ansage → Patch P2
Hauptprompt: „Punktzahl von 1 bis 5" (Z. 513). Rubriken: „Stufe 1–5"
(srdp_deutsch_oberstufe: 1 = nicht erfüllt … 5 = weit über das Wesentliche).
SRDP-Detail-Call: „Stufe (0-4)" (Z. 1192). Unterstufen-Rubrik mappt zusätzlich
Stufe→Note invertiert. Das Modell bekommt Raster (1–5) und Detail-Anforderung
(0–4) ohne Hinweis, dass das ZWEI Skalen sind → Verwechslungsrisiko genau an
der Notengrenze. **Fix (nur Ansage, keine Mathematik):** Hauptprompt sagt
„Stufen laut Raster (1–5)"; SRDP-Detail sagt explizit „0–4 nach offiziellem
SRDP-Beurteilungsraster — NICHT die 1–5-Stufen des Bewertungsrasters oben".

### N3 (V) A-Kategorie driftet über vier Stellen → Patch P2
„Ausdruck/Register" (Prompt Z. 532) · „Ausdruck" (feedback_schema.json:103) ·
„Ausdruck / Stil" (natascha_db.py FEHLER_TYP_LABELS) · „Ausdruck" (LUA
nataschaBridge.ts). **Fix:** Kanonisch „Ausdruck/Stil" in Prompt + Schema-
Description + DB-Kommentar mit Kreuzverweisen; LUA-Kurzlabel „Ausdruck" bleibt
(UI-Platz), bekommt Kommentar.

### N4 (K) Austriazismen nicht vor Falschmarkierung geschützt → Patch P2
Der Korrektur-Prompt verlangt vollständige Fehlerlisten, definiert aber nirgends,
dass österreichisches Standarddeutsch KEIN Fehler ist. LLMs mit bundesdeutschem
Trainingsschwerpunkt markieren „Jänner", „heuer", „bin gesessen" als R/G-Fehler
— falsche Fehler in der Heatmap vergiften den ganzen Loop (Empfehlung des
Tages, Wirksamkeits-Trend!). **Fix:** Klausel (nur bei Fach Deutsch):
österr. Standardvarietät explizit als korrekt deklarieren, mit Beispielen
(Jänner, heuer, Marille; Perfekt mit „sein" bei Positionsverben).

### N5 (V) Fehlersuch-Checkliste ist deutschspezifisch, läuft aber für alle Fächer → Patch P2
Die Nachsuch-Liste „Kommas vor dass/weil…, das/dass" (Z. 540-545) und die
Erwartung „15–30 Fehler normal" gelten unkonditioniert — auch bei Englisch-
Korrekturen (Rubriken englisch_a2/srdp_englisch existieren). Für Englisch ist
die Checkliste irreführend; die Pauschalzahl setzt bei kurzen/starken Texten
einen Überzähl-Anreiz. **Fix:** Fehler-Regeln als gemeinsamen Baustein
extrahieren (Text- + Vision-Prompt teilen ihn), Checkliste fach-konditioniert
(Deutsch: Kommata/das-dass/Substantivierung · Englisch: tenses, 3rd-person-s,
word order, false friends), Erwartungszahl an Wortanzahl gekoppelt
(Faustregel je ~30 Wörter statt Fixspanne).

### Positiv (nicht anfassen)
Kriterien-Schlüssel rubrikgetrieben (`extract_criteria_keys`) — Rubrik bleibt
SSOT; Erwartungshorizont-Template mit „akzeptable Verkürzungen"/„typische
Fehler" ist stark (Vorbild für LUA-P3); Anti-Floskel- und Umlaut-Regeln;
Profil-/Briefing-Prompts datenminimiert und testgepinnt; deterministische
Notenberechnung mit dokumentierten Sonderregeln.

---

## Patch-Serie (Umsetzung)

| Patch | Inhalt | Dateien | Tests |
|---|---|---|---|
| P1 | A1+A2+A3+A4 | packages/llm/src/prompt.ts | prompt.test.ts: 3 neue Pins; alle 122 llm-Tests grün |
| P2 | N1–N5 | natascha_core.py, feedback_schema.json (nur description), natascha_db.py (Kommentar) | test_llm_pipeline.py: +3 Tests; pytest grün |
| P3 | Erwartungshorizont-Tiefe LUA (nach Natascha-Feedback, Punkt 14) | schema/prompt/normalize/renderer | — |
| P4 | Zeitbudget (optional) | prompt.ts | — |
| Follow-up | A5 Judge für fehlerkorrektur/umformung im Text-Modus | judge.ts, quality.ts | eigener PR |

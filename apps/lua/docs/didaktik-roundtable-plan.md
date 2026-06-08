# Didaktik-Runde — Architektur-Entscheid (Claude)

> Master-Dokument. Konsolidiert zwei Pläne (Didaktik-Deep-Dive + Kimis "Das fehlende
> Etwas") plus Claudes Ergänzungen. Die Pro-Kollege-Handoffs liegen in
> `prompt-claude-didaktik.md`, `prompt-minimax-didaktik-qa.md`, `prompt-kimi-didaktik-fe.md`.
>
> Stand: 2026-06-07 · Phase 6

---

## Ausgangslage

Zwei Pläne lagen vor:

1. **Didaktik-Deep-Dive** — Code-Analyse der Pro-Aufgabe-Qualität (Prompt + `quality.ts`)
   mit 5 konkreten Verbesserungen. **Faktisch verifiziert** (Zeilen, Helfer-Funktionen,
   Judge-Stub stimmen).
2. **Kimi: "von Generator zu Lehrer-Assistent"** — drei Produktrichtungen
   (A Kompetenz/Textsorten, B Differenzierung 3 Niveaus, C Stunden-Architekt).

Die Pläne konkurrieren nicht — sie arbeiten auf verschiedenen Ebenen:
Didaktik = **Tiefe/Qualität** des Bestehenden, Kimi = **Breite/Scope**.

**Leitprinzip:** Erst das Fundament (jede Aufgabe gut), dann den Scope. Mehr Features
auf mittelmäßiger Pro-Aufgabe-Qualität = breitere, aber immer noch dünne App.

---

## Claudes Korrekturen & Ergänzungen

### A. Kimis Kern-Diagnose ist falsch (wichtigster Befund)
Behauptung: "Lehrer fängt jede Sitzung bei Null an." Stimmt nicht. Die App persistiert
bereits: `lib/storage.ts` (`SavedDocument`, **`HistoryEntry`/Verlauf**, `AppSettings`,
`snapshotFromState`), `useDocuments.ts`, `TemplateManager` (Vorlagen mit `meta`+`bloecke`).
→ Der "Assistenten-Charakter" fehlt nicht wegen fehlender Persistenz, sondern weil sie
**nicht proaktiv genutzt** wird. Billigster Win: Verlauf/Vorlagen/Defaults sichtbar machen.
Schlägt Kimi-C im ROI um Größenordnungen.

### B. Differenzierung ohne 3× Kosten (Antwort auf Kimi-B)
Nicht 3 LLM-Läufe. Stattdessen: B1 (mittel) = die Generierung; A2 (leicht) =
**deterministische Transformation ohne LLM** (Wortbank an, MC 4→3, Stichpunkte);
B2 (schwer) = **ein** gezielter Reroll nur der offenen Typen. ~1,3× statt 3× Kosten.

### C. Judge soll *lösen*, nicht *benoten*
Statt "rate 1–5": Judge bekommt nur Quelltext + Aufgabe (ohne Lösungsschlüssel), löst
selbst, vergleicht mit dem Schlüssel. Abweichung = mehrdeutig oder Schlüssel falsch.
Objektives Signal, ersetzt Didaktik #1/#3-Prüfung/#5-Prüfung. Billig (Haiku), nur auf
Risiko-Blocktypen.

### D. Coverage: Prävention statt Detektion
Didaktik #1 misst nachträglich per Token-Heuristik (fehleranfällig). Besser: Absatzstruktur
vorab in den Prompt geben und Verteilung verlangen. Prompt-Seite schlägt Quality-Seite.

### E. CEFR statt leicht/mittel/schwer (Englisch)
Natürliche Differenzierungsachse für die Sprachen-Matura ist A2/B1/B2. Kleines Mapping,
macht #2 (Bloom-Typ-Gating) sauberer begründbar.

---

## Bewertung der Didaktik-TOP-5

| # | Maßnahme | Urteil | Runde |
|---|----------|--------|-------|
| 3 | Thematische Distraktor-Regel | sofort, reiner Prompt, risikolos | 1 |
| 5a | Terminologie-Konservierung | sofort, reiner Prompt, zukunftssicher | 1 |
| 4 | Länge + Grounding Schreibaufgabe | gut, als **warning** | 1 |
| 2 | Bloom-kongruente Typ-Wahl | **umdesignen**: UI-Typ-Gating statt LLM-Swap (s. u.) | 1 |
| 5b | Lernziel-Coverage | gut, aber als **warning**, NICHT Export-`error` | 1 |
| 1 | Topic-Coverage-Check | durch Judge (C) + Prävention (D) abgedeckt → entfällt als Heuristik | — |

**#2-Konflikt (kritisch):** Der Original-Vorschlag lässt das LLM den Blocktyp still tauschen.
Das **kollidiert mit `buildSkelett`/`PROFILE`** (`packages/schema/src/index.ts:547+`): das
Skelett vergibt `punkteAnteil` pro Aufgabenart deterministisch — ein eigenmächtiger Typ-Tausch
desynchronisiert Punkte, Korrekturraster, Notenschlüssel. **Lösung:** Typen in der UI nach
Schwierigkeit gaten (schwer → kein MC anbieten), nicht nachträglich umentscheiden.

---

## Kimi A/B/C

- **A (Kompetenz/Textsorten):** Kleiner als gedacht. `packages/qa/src/korrekturraster/builder.ts`
  wählt **heute schon** Raster nach Block-Typ + Textsorte + Fach; `kataloge.ts` hat
  Erörterung/Stellungnahme etc.; `PROFILE.schularbeit` nennt Textsorte. → Runde 2, rescoped als
  "Vorhandenes im Wizard sichtbar machen", kein neuer Renderer.
- **B (Differenzierung):** Stärkste Idee. Baut auf vorhandenem Per-Block-`schwierigkeit`
  (`schema:28,525`). Abhängigkeit: braucht #2/#3 zuerst, sonst sind die Niveaus Kosmetik. →
  Runde 2, kostensmart (s. Ergänzung B).
- **C (Stunden-Architekt):** Eigenes Datenmodell (Phasen ≠ Aufgabenarten), passt nicht ins
  `PROFILE`/`buildSkelett`. Pädagogische Basis ist Behauptung, nicht Evidenz. → zurückgestellt,
  erst Nachfrage validieren.

---

## Runden-Schnitt

**Runde 1 — Fundament + billigster Assistenten-Win**
- Claude: Prompt-Chirurgie (#3, #5a, #2-Logik, #4-Coverage-Prävention) + Judge-Spike.
- Minimax: `quality.ts` #4 (warning), #5b (warning), Judge-Verdrahtung, Tests.
- Kimi: #2 UI-Typ-Gating + Kontinuität sichtbar (Verlauf/Vorlagen/Defaults).
- Qwen: nichts.

**Runde 2 — Scope (nach Fundament)**
- Differenzierung-B (kostensmart), Textsorten-A (rescoped).

**Zurückgestellt:** Stunden-Architekt C.

---

## Judge-Spezifikation (solve-then-compare)

Ersetzt den Stub `llmJudgeHook` (`packages/llm/src/quality.ts:293`).

1. Input pro Risiko-Block: Quelltext + Aufgabenstellung, **ohne** Lösungsschlüssel.
2. Judge (Haiku) löst die Aufgabe ausschließlich aus dem Quelltext.
3. Vergleich Judge-Lösung ↔ Schlüssel:
   - MC/Matching/Lückentext: exakter Key-/Wort-Vergleich.
   - Offene Typen: Semantik-Nähe (Judge urteilt selbst "deckt sich / weicht ab").
4. Abweichung → `QualityIssue` (severity `warning`) mit Begründung des Judge.
5. Nur auf Risiko-Typen (`multipleChoice`, `matching`, `lueckentext`, `offeneVerstaendnisfrage`),
   nicht auf reine Kreativ-Typen — Kostenkontrolle.

Risiko: zusätzliche Latenz/Kosten bei Generierung → nur optional zuschaltbar
(`AppSettings`), Default an für Test/Schularbeit, aus für Schulübung.

# Lehrplan-Maximalprinzip — Kompetenz-Kataloge für alle Fächer

_Stand 2026-06-23 · Repo: LUKA · Branch `main`_

## Ziel
Den Kompetenz-Modus von „nur Deutsch/Englisch, nur Grammatik" auf **alle 12 textbasierten
AHS-Fächer mit echten Lehrplan-Kompetenzbereichen** ausbauen. Die Pipeline (coverage,
Kompetenznachweis, Kompetenz-Prompt) konsumiert Deskriptoren bereits generisch — es fehlen
nur **Datenmodell-Aufbohrung + Daten**.

## Quelle (Entscheidung: Hybrid)
- **Kompetenzbereiche je Fach = EXAKT** (offiziell, stabil, gut dokumentiert).
- **Deskriptoren = kuratierter Entwurf**, `quelle` ehrlich markiert:
  `"Entwurf, angelehnt an BMBWF-Lehrplan AHS <Fach> <Stufe> — nicht offiziell zitiert"`.
- Kein erfundener Nachweis-Anspruch; UI zeigt Entwurfs-Vermerk.

## Reihenfolge (Wellen, Sprachfächer zuerst)
**W0 (Chief) → W1 (Kimi, dann Chief-Review) → W2 (Kimi, dann Chief-Review) → qa-Kataloge (Chief).**
W1/W2 für Kimi sind **erst startbar, wenn W0 gepusht ist** (liefert Struktur + Template).

---

## 🟦 Welle 0 — Engineering-Fundament — **CHIEF (Claude)**
1. `packages/schema/src/index.ts`: `StoffItem.kategorie` Enum → `z.string().min(1)`; neuer Export
   `KOMPETENZBEREICHE: Record<Fach, string[]>` mit den offiziellen Bereichen je Fach.
2. `apps/web/src/lib/stoffkatalog.ts` → Ordner `lib/stoffkatalog/` je Fach + `index.ts`;
   D/E-Bestand verlustfrei verschieben; Lookups unverändert. Eine Datei dient als **Template**.
3. `views/KompetenzView.tsx`: StoffItems nach Kompetenzbereich gruppieren.
4. Ehrlichkeits-Vermerk (Kompetenz-Modus + Kompetenznachweis-DOCX).
5. Tests: KOMPETENZBEREICHE deckt jedes Fach; Katalog-Integrität (deskriptorIds existieren;
   StoffItem.kategorie ∈ KOMPETENZBEREICHE[fach]).
**Ergebnis:** Struktur + Template stehen, alle Lookups generisch. → erst danach Kimi.

## 🟩 Welle 1 — Sprachfächer befüllen — **KIMI** (Chief reviewt didaktisch)
FR/ES/IT/Latein je Stufe + D/E über Grammatik hinaus (Lesen/Schreiben/Sprachreflexion/Wortschatz).

## 🟩 Welle 2 — Sachfächer befüllen — **KIMI** (Chief reviewt)
Geschichte/GW/Religion/Ethik/Psychologie/Philosophie je Stufe.

## 🟦 qa-Korrekturraster-Kataloge — **CHIEF**
`packages/qa/src/korrekturraster/`: fachgerechte Schreibaufgaben-/Textsorten-Kataloge
(Geschichte-Quellenanalyse, Erörterung/Stellungnahme …) + `builder.ts`-Auswahl nach Fach.

---

# Kimi-Prompts (copy-paste) — erst NACH Chief-Welle-0 (git pull!)

## ▶️ PROMPT 1 — Welle 1: Sprachfächer-Kataloge
```
Repo: LUKA (nicht lehr-suite). Branch main. ZUERST: git pull.
Voraussetzung: Der Chief-Commit "Welle 0" ist gemergt — es gibt jetzt
`apps/lua/apps/web/src/lib/stoffkatalog/` (eine Datei je Fach + index.ts) und in
`packages/schema/src/index.ts` den Export `KOMPETENZBEREICHE: Record<Fach,string[]>`.
Nimm `lib/stoffkatalog/deutsch.ts` als STRUKTUR-VORLAGE.

Aufgabe: Fülle die Kompetenz-Kataloge für die SPRACHFÄCHER. Lege je Fach eine Datei an
(`franzoesisch.ts`, `spanisch.ts`, `italienisch.ts`, `latein.ts`) und registriere sie in
`lib/stoffkatalog/index.ts`. Erweitere ausserdem `deutsch.ts` und `englisch.ts` über
"Grammatik" hinaus (Lesen, Schreiben, Sprachreflexion, Wortschatz).

Pro Fach × Stufe (oberstufe + unterstufe):
- Deskriptoren (Deskriptor-Objekte): je Kompetenzbereich aus KOMPETENZBEREICHE[fach]
  2–4 Deskriptoren. Feld `bereich` = der Bereichsname EXAKT aus KOMPETENZBEREICHE[fach].
  `text` = konkrete Kompetenz in „Die Schülerinnen können …"-Form. `code` = "".
  `quelle` = "Entwurf, angelehnt an BMBWF-Lehrplan AHS <Fach> <Stufe> — nicht offiziell zitiert".
  `rahmenwerk` = "at-lehrplan". `id` = `at-<fachkürzel>-<ob|un>-<bereichkürzel>-<n>`.
- StoffItems: je Bereich 1–3 konkrete Themen. `kategorie` = der Bereichsname (string).
  `deskriptorIds` referenzieren NUR existierende Deskriptoren. `defaultAufgabentypen` aus den
  echten Blocktypen wählen (z. B. multipleChoice, lueckentext, fehlerkorrektur, vokabeluebung,
  kategorisierung, offeneVerstaendnisfrage, offeneSchreibaufgabe, roleplay).
- Sprachfach-Inhalte gehören in die Zielsprache; bei Latein Schwerpunkt Formenlehre/Übersetzung
  (kein CEFR).

Pflicht: `cd apps/lua && pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test`
muss grün sein (inkl. Katalog-Integritätstest). Danach lokal committen (ein Commit). NICHT pushen.
Melde: welche Fächer/Bereiche/Anzahl Deskriptoren+StoffItems du angelegt hast.
```

## ▶️ PROMPT 2 — Welle 2: Sachfächer-Kataloge (erst nach Review von Welle 1)
```
Repo: LUKA. Branch main. ZUERST: git pull (Welle 1 muss gemergt sein).
Gleiches Vorgehen wie Welle 1, aber für die SACHFÄCHER:
geschichte, geographie, religion, ethik, psychologie, philosophie.
Je Fach eine Datei in `lib/stoffkatalog/`, in `index.ts` registrieren.
Inhalte DEUTSCHSPRACHIG. Bereiche EXAKT aus KOMPETENZBEREICHE[fach]
(z. B. Geschichte: Frage-/Methoden-/Orientierungs-/Sachkompetenz).
StoffItems mit passenden Aufgabentypen (offeneVerstaendnisfrage, offeneSchreibaufgabe,
multipleChoice, kategorisierung, markieraufgabe …). `quelle` ehrlich als Entwurf.
Verifikation wie gehabt grün, lokal committen, NICHT pushen. Melde die Abdeckung.
```

---

## Was wer macht (Kurz)
| Schritt | Wer | Status |
|---|---|---|
| W0 Fundament (Schema/Refactor/UI/Tests) | **Chief** | als Nächstes |
| W1 Sprachfächer-Daten | **Kimi** (Prompt 1) | nach W0 |
| W1 Review + Live-Smoke | **Chief** | — |
| W2 Sachfächer-Daten | **Kimi** (Prompt 2) | nach W1 |
| W2 Review | **Chief** | — |
| qa-Korrekturraster-Kataloge | **Chief** | nach W2 |

## Verifikation (je Welle)
- build/typecheck/test grün + Katalog-Integritätstest.
- Kompetenz-Modus: neues Fach → StoffItems nach Bereich gruppiert → Generierung stufen-/
  sprachgerecht; Kompetenznachweis-DOCX listet Deskriptoren.
- Live-Smoke je Fach (DeepSeek), Kompetenz-Pfad.

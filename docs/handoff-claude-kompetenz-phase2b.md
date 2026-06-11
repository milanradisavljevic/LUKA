# Handoff-Prompt für Claude — Kompetenz-Modus Phase 2b

## Kontext

Der Kompetenz-Modus für `apps/lua` ist in Phase 0 + 1 + 1b umgesetzt.

- **Phase 0 (Schema)** und **Phase 1 (2 neue Blocktypen)** sind deine bisherige Arbeit
  (`packages/llm/src/prompt.ts`, `validate.ts`, `quality.ts`, `judge.ts`).
- **Phase 1b (App-Wiring + Stoffkatalog + UI)** wurde gerade von Kimi erledigt.

Dieser Handoff beschreibt den aktuellen Stand und was als Nächstes von dir
(Phase 2b) kommen sollte: der **grammar-aware Judge** für Kompetenz-Übungen.

---

## Was Kimi gerade geliefert hat

### Neue / geänderte Dateien (Kimi-Lane)

| Datei | Zweck |
|-------|-------|
| `apps/web/src/views/KompetenzView.tsx` | 1-Screen-UI: Rahmenwerk · Fach · Stufe · Stoff-Item · Thema · Niveau · Aufgabentypen. Baut Skelett + ruft `generate()` auf. |
| `apps/web/src/lib/stoffkatalog.ts` | Proof-Slice: 8 englische Grammatik-Stoff-Items (Oberstufe, at-lehrplan) + Deskriptoren + Lookups. |
| `apps/web/src/lib/types.ts` | `ActiveView` um `'kompetenz'` erweitert. |
| `apps/web/src/components/Sidebar.tsx` | Neuer Menüpunkt „Kompetenz-Übung" mit `Target`-Icon. |
| `apps/web/src/components/Step0_Absicht.tsx` | Link „Aus Kompetenz erstellen". |
| `apps/web/src/App.tsx` | `KompetenzView` in `renderView()` eingebunden; Navigation weitergegeben. |
| `apps/web/src/hooks/useGenerate.ts` | Modus-abhängige Guards; `GenerateInput` mit `stoffItems` und leeren `quelltexte` im Kompetenz-Modus. |
| `CHANGELOG.md` | Eintrag „Kompetenz-Modus: Phase 0 + 1b" ergänzt. |

### Was im UI-Fluss passiert

1. Nutzer klickt in der Sidebar auf „Kompetenz-Übung" oder im Step0 auf
   „Aus Kompetenz erstellen".
2. `KompetenzView` zeigt den Proof-Slice-Katalog.
3. Nutzer wählt z. B. **Past Perfect** + **umformung** + Thema „Reisen".
4. View setzt `meta.modus = 'kompetenz'`, baut ein 1-Block-Skelett (`buildSkelett`)
   und ruft `useGenerate().generate(state)` auf.
5. Bei Erfolg springt die App zum Wizard-Step `generate` (Vorschau).

### Verifikation

- `cd apps/lua && pnpm -r build` ✅
- `cd apps/lua && pnpm -r test` ✅ (Schema 118, LLM 117, Renderer 31, Input 17, QA 96, Web 41)

---

## Was als Nächstes von dir kommt (Phase 2b)

### Ziel

Der Judge (`packages/llm/src/judge.ts` / `validate.ts` / `quality.ts`) soll
Kompetenz-Übungen inhaltlich bewerten können, **ohne Quelltext**.

Im Text-Modus prüft der Judge primär:
- Treue zum Quelltext
- Korrektheit der Lösungen
- Passende Schwierigkeit

Im Kompetenz-Modus entfällt der Quelltext-Bezug. Stattdessen muss der Judge:

1. **Grammatikalische/linguistische Korrektheit** der generierten Aufgaben prüfen
   (z. B. ist die Past-Perfect-Umformung tatsächlich korrekt, ist der
   Ausgangssatz valide, stimmt die Musterlösung).
2. **Passgenauigkeit zum Stoff-Item** bewerten — deckt die Aufgabe das gewählte
   Stoff-Item ab oder driftet sie zu einem anderen Thema ab?
3. **Niveau-Adäquatheit** prüfen — entspricht die Aufgabe dem gewählten Niveau
   (`basis` / `standard` / `erweitert`)?
4. **Konsistenz zwischen Aufgabe und Lösung** sicherstellen — Lösung passt zur
   Frage, keine widersprüchlichen Angaben.

### Daten, die dir zur Verfügung stehen

- `input.meta.modus` → `'kompetenz'`
- `input.meta.stoffItemIds` → Array von IDs
- `input.meta.kompetenzNiveau` → `'basis' | 'standard' | 'erweitert'`
- `input.meta.rahmenwerk` → `'at-lehrplan' | 'ib-dp'`
- `input.stoffItems` → Array von `StoffItem` (Titel, Kategorie, Deskriptor-IDs,
  defaultAufgabentypen)
- `input.bloecke` → `BlockRequest[]` (inkl. `umformung` und `fehlerkorrektur`)
- `input.quelltexte` → leer `[]` im Kompetenz-Modus

Lookups aus dem Stoffkatalog stehen in `apps/web/src/lib/stoffkatalog.ts`;
für den LLM-Core kannst du bei Bedarf eine Paket-interne Kopie oder Import
hinzufügen (am besten in `packages/llm`, damit es CLI-fähig bleibt).

### Empfohlene Vorgehensweise

1. `packages/llm/src/judge.ts` erweitern:
   - Wenn `meta.modus === 'kompetenz'`, verwende einen neuen
     `buildKompetenzJudgePrompt(input)` statt des quelltext-basierten Prompts.
   - Der Prompt sollte das Stoff-Item, den Niveau-Kontext und die generierten
     Blöcke erhalten.
   - Rückgabe: Liste von Fehlern/Warnungen mit Schweregrad + kurzer Begründung.

2. `packages/llm/src/validate.ts` anpassen:
   - Im Kompetenz-Modus keine Quelltext-Prüfung erzwingen.
   - Stattdessen `judge()` aufrufen und das Ergebnis in die Validierung
     einfließen lassen (z. B. als „weiche" Warnungen bei niedrigem Niveau,
     als harte Fehler bei inhaltlichem Murks).

3. `packages/llm/src/quality.ts` anpassen:
   - Kompetenz-spezifische Quality-Scores berechnen
     (z. B. `stoffItemCoverage`, `niveauMatch`, `linguisticCorrectness`).
   - Keine Quelltext-Scores im Kompetenz-Modus berechnen.

4. Tests ergänzen:
   - Mindestens ein Kompetenz-Judge-Test mit `umformung` (Past Perfect).
   - Ein Test, der eine offensichtlich falsche Musterlösung als Fehler erkennt.
   - Ein Test für `basis` vs. `erweitert` Niveau-Adäquatheit.

### Dateien, die du berühren wirst

- `packages/llm/src/judge.ts`
- `packages/llm/src/validate.ts`
- `packages/llm/src/quality.ts`
- `packages/llm/src/prompt.ts` (falls du Prompt-Helper hinzufügst)
- `packages/llm/src/judge.test.ts` (neu oder erweitern)
- `packages/llm/src/validate.test.ts` (erweitern)
- `CHANGELOG.md`

### Nicht berühren (Kimi-Lane)

- `apps/web/src/views/KompetenzView.tsx`
- `apps/web/src/lib/stoffkatalog.ts`
- `apps/web/src/hooks/useGenerate.ts`
- `apps/web/src/components/Sidebar.tsx`
- `apps/web/src/components/Step0_Absicht.tsx`
- `apps/web/src/App.tsx`

Solltest du dort Denkfehler finden, melde sie zurück — aber ändere sie nicht
selbst, um Merge-Konflikte zu vermeiden.

---

## Offene Fragen / Entscheidungshilfen

1. **Soll der Kompetenz-Judge ein eigenes LLM-Call sein oder im selben Call wie
   die Generierung mitlaufen?**
   - Empfehlung: separater Call nach der Generierung (wie bisheriger Judge),
     weil er auf dem vollständigen Dokument arbeitet.

2. **Wie streng soll der Judge sein?**
   - Vorschlag: harte Fehler bei inhaltlich falschen Lösungen; Warnungen bei
     Niveau-Drift oder unklarer Aufgabenstellung. Die Reparaturrunde sollte
     harte Fehler korrigieren.

3. **Sollen Stoff-Items und Deskriptoren in `packages/llm` dupliziert werden?**
   - Vorschlag: kleiner statischer Katalog in `packages/llm/src/stoffkatalog.ts`
     (oder Import aus `packages/schema`), damit Judge und zukünftige CLI
     unabhängig von `apps/web` funktionieren.

---

## Letzter bekannter grüner Stand

```bash
cd apps/lua
pnpm -r build   # ✅
pnpm -r test    # ✅
```

Wenn du Phase 2b abgeschlossen hast, bitte denselben Befehlssatz ausführen
und `CHANGELOG.md` im Abschnitt `[Unreleased]` ergänzen.

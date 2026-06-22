# Next Steps — Kimi-Aufgaben (Stand 2026-06-18, Runde 3)

Repo: **LUKA**. Branch `main`, **vor jeder Aufgabe `git pull`**.
Nach jeder Aufgabe muss grün sein:

```bash
cd apps/lua && pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test
```

Danach **lokal committen** (ein Commit je Aufgabe). Push macht der Chief beim Review.
Scoped, contentlastig, wenig Urteil — ideal für Kimi. Reihenfolge: K1 → K2 → K3.
(Frühere Runden F1/F3/R2 sind erledigt; Archiv: `docs/_archiv-next-steps-kimi-r1r2.md`.)

---

## K1 — Hilfe + Anleitung für neue Features ergänzen (reiner Content)
**Ziel:** Die seit Runde 1/2 gebauten Features sind in der In-App-Hilfe und der
Standalone-Anleitung noch nicht (vollständig) erklärt.

**Tun:**
- `apps/lua/apps/web/src/views/HelpView.tsx` (Array `SECTIONS`, akt. 15 Abschnitte):
  Inhalte ergänzen/erweitern für:
  1. **Differenzierung** (Step 4): „Differenzierung"-Akkordeon → leichtere/schwerere
     Variante zusätzlich zur Standardfassung; schwerer = KI erzeugt offene Aufgaben neu.
  2. **Manuelle/Hybrid-Eingabe** bei Kreuzworträtsel/Wortgitter/Vokabelübung/Fehlerkorrektur/
     Wörter-ordnen: Umschalter „KI-generiert ⇄ Selbst festlegen"; teils ausgefüllt = Hybrid.
  3. **Selbsteinschätzungsbogen** (Step 4 → „Weitere Exporte"): Bogen, den Schüler VOR der
     Abgabe ausfüllen.
  4. **Schnell ohne Quelltext** (Dashboard-Shortcuts / Step 0): Mini-Übungen ohne Quelltextzwang.
  5. **API-Key-Hinweis** in Schritt 4 (Modellauswahl): ohne hinterlegten Key Hinweis + Link
     zu den Einstellungen.
- `docs/ANLEITUNG.md`: dieselben 5 Punkte spiegeln (reiner Markdown-Fließtext, Tip → „> 💡 …").
**Akzeptanz:** alle 5 Themen in HelpView UND ANLEITUNG.md auffindbar, lesbar ohne App.
Keine Code-Logik. Build/Tests unberührt grün.

---

## K2 — Toten Export entfernen: `LogoChip`
**Befund:** `apps/lua/apps/web/src/components/BrandLogo.tsx` exportiert `LogoChip`
(`@deprecated`, ~Z. 88–Ende). **Nirgends mehr importiert** (verifiziert: `grep -rn LogoChip src`
nur in BrandLogo.tsx). `WORDMARK_STYLE` (Z. 7) bleibt — wird von der aktiven Marke genutzt, NICHT anfassen.
**Tun:** nur die `LogoChip`-Funktion + zugehörigen Kommentar löschen. Sonst nichts.
**Akzeptanz:** `grep -rn LogoChip apps/lua/apps/web/src` liefert 0 Treffer; build/typecheck/test grün.

---

## K3 — Empty-State-Politur (DocumentsView + FavoritesView)
**Befund:** `DocumentsView.tsx` und `FavoritesView.tsx` zeigen bei leerer Liste fast nichts.
`TemplatesView.tsx` hat einen guten freundlichen Leerzustand — **als Vorbild nehmen** (Stil/Struktur).
**Tun:** in beiden Views bei leerer Liste einen freundlichen Leerzustand zeigen: dezentes
Lucide-Icon + kurzer Satz („Noch keine gespeicherten Unterlagen." / „Noch keine Favoriten.")
+ optional ein Hinweis/CTA, wie man welche anlegt. Stil/Tokens wie TemplatesView, keine neue Logik.
**Akzeptanz:** leere Liste → freundlicher Zustand (nicht nackt); gefüllte Liste unverändert.
Build/typecheck/test grün.

---

## NICHT für Kimi (Chief-geführt — Urteil/Architektur/Cross-Cutting)
- **SRDP-Matura-Modus** — neues Renderer-Template + Format-Korrektheit + Synergie mit NATASCHA-
  SRDP-Kriterien. Urteilslastig.
- **Kompetenz-Dashboard-Ausbau** (#1: abgedeckt/fehlt-Übersicht) — Fundament (`coverage.ts`,
  `at-lehrplan`) da, aber Lehrplan-Modellierung + UX-Entscheidung.
- **`umformung`-Typ entfernen** — 26 Referenzen über schema/llm/web verwoben; sauberes Entfernen
  ist Mehrdatei-Sorgfalt, kein Quick-Cleanup.
- **In-App-Angabe-Erfassung** (Rust-Command-Arg + Analyse-UI) für den voll-automatischen Closed Loop.

## Offen beim Chief/User
- Kein-Key-Warnung (Step 3) live in der laufenden App sichtprüfen (Tauri-`invoke`, nicht headless testbar).
- GO-TO-MARKET (`docs/GO-TO-MARKET.md`) bewusst geparkt — noch nicht dran.

# Next Steps — Kimi-Aufgaben (Stand 2026-06-23, Runde 4)

Repo: **LUKA**. Branch `main`, **vor jeder Aufgabe `git pull`**.
Nach jeder Aufgabe muss grün sein:

```bash
cd apps/lua && pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test
```

Danach **lokal committen** (ein Commit je Aufgabe). Push macht der Chief beim Review.
(Runden F1/F3/R2/K1–K3 + Rollenspiel sind erledigt.)

## Kontext
Das **Fächer-Modell** wurde im Backend bereits erweitert (Commit `bb1a98f`): `FachSchema`
kennt jetzt 12 Fächer, und `@lehrunterlagen/schema` exportiert **`FACH_META`**,
**`istSprachfach(fach)`** und **`fachLabel(fach)`**. Prompt/Renderer/qa nutzen das schon.
**Nur die UI hängt noch an „Deutsch/Englisch" fest** — das ist diese Runde.

Fächer: deutsch, englisch, franzoesisch, spanisch, italienisch, latein, geschichte,
geographie, religion, ethik, psychologie, philosophie.

---

## K4 — Fach-Auswahl in Step 0 auf alle Fächer (Kern)
**Datei:** `apps/lua/apps/web/src/components/Step0_Absicht.tsx`
**Befund:** Die Fach-Auswahl rendert aktuell nur zwei Kacheln „Deutsch/Englisch"
(~Z. 533–539, `setFach(f)`; Label `f === 'deutsch' ? 'Deutsch' : 'Englisch'`).
**Tun:**
- Fach-Auswahl auf **alle Fächer aus `FACH_META`** umstellen. Bei 12 Fächern ist ein
  `<select>` mit zwei `<optgroup>` sinnvoll: „Sprachen" (`istSprachfach` true) und
  „Sachfächer" (false). Option-Label = `FACH_META[f].label`, value = der Fach-Key.
- `import { FACH_META, istSprachfach, fachLabel } from '@lehrunterlagen/schema'`.
- `fachLabel`-Konstante (~Z. 259) durch `fachLabel(fach)` ersetzen.
- `setFach` bleibt; `fach`-State-Typ ist schon `Auftrag['fach']` (= alle Fächer).
**Akzeptanz:** alle 12 Fächer wählbar; Auswahl landet in `meta.fach`; build/typecheck/test grün.

## K5 — Hartkodierte „Deutsch/Englisch"-Labels überall durch `fachLabel()` ersetzen
**Befund:** mehrere Stellen zeigen `fach === 'deutsch' ? 'Deutsch' : 'Englisch'` —
falsch für neue Fächer. Ersetzen durch `fachLabel(meta.fach)` (Import aus schema):
- `apps/lua/apps/web/src/components/PreviewTwoColumn.tsx` (Z. ~164 und ~429)
- `apps/lua/apps/web/src/components/Step1_Input.tsx` (Z. ~96)
- `apps/lua/apps/web/src/components/Step4_Generate.tsx` (Z. ~235, Zusammenfassung „Fach / Stufe")
- `apps/lua/apps/web/src/App.tsx` (Z. ~339, Kontext-Badge — hat schon Fallback, trotzdem auf `fachLabel`)
- `apps/lua/apps/web/src/views/HistoryView.tsx` (`FACH_LABEL`-Map → `fachLabel` nutzen)
- `apps/lua/apps/web/src/views/DashboardView.tsx` (Z. ~92, `meta.fach === 'englisch' ? … : null`)
**NICHT anfassen:** die „Schnell-ohne-Quelltext"-Shortcuts (DashboardView ~197–200, Step0 ~422/442)
bleiben fix auf `deutsch` — das sind bewusst deutsche Mini-Übungen.
**Akzeptanz:** kein hartes `'deutsch' ? … : 'Englisch'` mehr für Anzeige-Labels; ein generiertes
Französisch-/Geschichte-Dokument zeigt überall den korrekten Fachnamen. build/typecheck/test grün.

## K6 — Hilfe/ANLEITUNG: Fächer-Ausbau erwähnen (Content)
**Datei:** `apps/lua/apps/web/src/views/HelpView.tsx` + `docs/ANLEITUNG.md`
Kurzer Absatz: LUKA unterstützt jetzt neben Deutsch/Englisch auch Französisch, Spanisch,
Italienisch, Latein sowie Geschichte, Geographie, Religion, Ethik, Psychologie, Philosophie.
Bei Sprachfächern erstellt die KI die Inhalte in der Zielsprache; Sachfächer sind deutschsprachig.
**Akzeptanz:** in HelpView UND ANLEITUNG auffindbar.

---

## NICHT für Kimi (Chief)
- Fachspezifische Bewertungs-/Kompetenzkataloge für Sachfächer (Geschichte-Quellenanalyse,
  Religion/Ethik-Argumentation) — didaktisches Urteil, eigene Runde. v1 nutzt Deutsch-Kataloge.
- SRDP-Matura-Modus.
- Vokabel-Richtungs-Feinschliff je Sprachfach.

## Offen beim Chief/User
- Drag-&-Drop-Zone (Korrektur) live in der App sichtprüfen (Tauri, nicht headless testbar).
- `natascha-stable`-Branch ist der Snapshot für Natascha.

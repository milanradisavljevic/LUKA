# Plan Aufgaben 1–4 (Chief + Kimi) — 2026-06-24

Backlog aus `docs/NEXT-STEPS.md`. Entscheidungen: SRDP = **Deutsch + Englisch** zuerst;
Task 2 Quellen via Web-LLM (Recherche-Prompt unten). Befund: `natascha_analyze` akzeptiert
`ausgangstext` bereits (Rust fertig) → Task 4 ist UI-only.

## Wann übergibst DU? (Handoff-Zeitpunkte)
1. **JETZT → Kimi:** Task 3a (Empty-States). Prompt unten („PROMPT KIMI T3").
2. **JETZT → du selbst (Web-LLM mit Internet):** Task-2-Recherche-Prompt unten laufen lassen.
   Wenn das JSON da ist → **dann → Kimi** (Task 2 strukturieren).
3. **Chief (ich), kein Übergeben:** Task 4, Task 1 (SRDP), Quick-Übung-1-Screen, bedingter Entwurfs-Vermerk.

## Reihenfolge
T4 (klein, schließt Closed Loop) → T1 SRDP (Chief, groß) **parallel** zu Kimi T3 →
T2 sobald du die Web-LLM-Quellen lieferst.

| Task | Wer | Wann |
|---|---|---|
| 4 In-App-Angabe-Erfassung | Chief | sofort |
| 1 SRDP-Modus (DE+EN) | Chief | nach T4 |
| 3a Empty-States | **Kimi** | **jetzt übergeben** |
| 3b Quick-Übung 1-Screen | Chief | mit T1 |
| 2 Katalog-Quellen | du (Web-LLM) → Kimi | jetzt Prompt laufen lassen |

---

## 🟦 Task 1 — SRDP-Matura-Modus (Chief) · DE + EN
- schema: `UnterlagentypSchema` += `'matura'`; `PROFILE['matura']` mit SRDP-`strukturhinweis`
  (DE: Textbeilage + Operatoren + Arbeitsaufträge + Wortanzahl; EN: SRDP-Skills).
- renderer `template.ts`: neues `RenderTemplate 'srdp'` (nüchtern, formell) + Default bei matura.
- qa `kataloge.ts`/`builder.ts`: SRDP-Schreibkatalog DE (K1 Inhalt+Textstruktur / K3 Ausdruck+Sprachnormen)
  und EN; `waehleKatalog` → matura ⇒ SRDP.
- prompt: SRDP-Strukturhinweis je Fach bei matura.
- UI `Step0_Absicht.tsx`: Unterlagentyp-Kachel „Matura (SRDP)".
- Verify: Live-Smoke DE + EN; Tests schema/qa.

## 🟦 Task 4 — In-App-Angabe-Erfassung (Chief) · Closed Loop
Rust fertig. UI: `ausgangstext`-Textarea im Analyse-Dialog (`KorrekturView.tsx`); `useNatascha.analyze`
nimmt + reicht `ausgangstext` durch; sicherstellen, dass er über die Brücke in `NataschaPrefill`
(→ Step0 `ADD_QUELLTEXT`) landet. Verify: Analyse mit Text → Übung startet mit vorbefülltem Quelltext.

## 🟩 Task 3b — Quick-Übung 1-Screen (Chief, mit T1)
Eigener Mini-Screen (Thema + Aufgabentyp + Stufe → sofort generieren via `buildSkelett`-Defaults),
zusätzlich zu den bestehenden Dashboard-Shortcuts.

---

## ▶️ PROMPT KIMI — Task 3a (Empty-States) — JETZT an Kimi
```
Repo: LUKA. Branch main. ZUERST: git pull.
Aufgabe: Freundliche Empty-States für die verbleibenden Views, einheitlich mit dem bestehenden
Muster in `apps/lua/apps/web/src/views/_DocumentList.tsx` (Icon + Titel + Beschreibung + optional CTA)
bzw. `TemplatesView.tsx`.
Prüfe und ergänze, wo bei leerer Liste nur nackter/kein Zustand erscheint:
`apps/lua/apps/web/src/views/TrashView.tsx`, `HistoryView.tsx`, und falls dort dünn auch
`KlassenView.tsx` / `SchuelerView.tsx`. Wo bereits ein guter Leerzustand existiert: nicht anfassen.
Dezentes Lucide-Icon + kurzer Satz; CTA nur wo sinnvoll (z. B. History → „Neue erstellen").
Keine neue Logik, nur Darstellung des Leerzustands.
Pflicht: `cd apps/lua && pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test` grün.
Lokal committen (ein Commit), NICHT pushen. Melde, welche Views du angepasst hast.
```

## ▶️ PROMPT WEB-LLM — Task 2 (Lehrplan-Recherche) — JETZT du in einer Web-LLM mit Internet
Pro Fach + Stufe einzeln laufen lassen (sonst zu groß). `<FACH>`/`<STUFE>` ersetzen.
```
Du recherchierst den offiziellen österreichischen AHS-Lehrplan (BMBWF) für das Fach <FACH>,
Stufe <STUFE> (Unterstufe = Sek I / Oberstufe = Sek II). Nutze ausschließlich offizielle Quellen
(BMBWF, RIS, bmbwf.gv.at). Gib NUR gültiges JSON aus, exakt in diesem Schema:

{
  "fach": "<FACH-KEY>",            // einer von: deutsch, englisch, franzoesisch, spanisch, italienisch, latein, geschichte, geographie, religion, ethik, psychologie, philosophie
  "stufe": "<unterstufe|oberstufe>",
  "quelleUrl": "https://…",        // konkrete offizielle Lehrplan-URL
  "bereiche": [
    {
      "bereich": "<offizieller Kompetenzbereich, wortgleich zum Lehrplan>",
      "deskriptoren": [
        { "code": "<offizieller Code falls vorhanden, sonst ''>",
          "text": "Die Schülerinnen und Schüler können …" }
      ]
    }
  ]
}

Regeln: Bereiche = die echten Kompetenzbereiche des Lehrplans. 3–6 Deskriptoren je Bereich,
wörtlich oder eng am Lehrplan. Keine Erfindungen; wenn unsicher, weglassen. Nur das JSON, sonst nichts.
```
Wenn die JSONs da sind → an Kimi: „ersetze die Entwurfs-Deskriptoren in `lib/stoffkatalog/<fach>.ts`
durch diese gesourcten, setze `quelle`=quelleUrl und `code`; Integritätstest muss grün bleiben."
Chief macht dann den Entwurfs-Vermerk bedingt (nur zeigen, solange noch Entwürfe im Fach).

## Verifikation (je Task)
`pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test` grün;
bei T1/T4 zusätzlich Live-Smoke (DeepSeek).

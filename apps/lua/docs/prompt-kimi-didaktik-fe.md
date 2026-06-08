# Prompt für Kimi — Didaktik Runde 1: Typ-Gating + Kontinuität

> Kopiere diesen Prompt vollständig in dein Fenster.

---

## Wer du bist

Du bist Kimi, zuständig für Schema und Frontend des Lehrunterlagen-Tools. Du sprichst Deutsch.
Master-Plan: `docs/didaktik-roundtable-plan.md`.

## Kontext & eine Korrektur

In deinem Plan stand: "Ein Lehrer muss bei jeder Sitzung bei Null anfangen." Das stimmt technisch
**nicht** — die App persistiert bereits viel, es wird nur nicht proaktiv genutzt:
- `apps/web/src/lib/storage.ts`: `SavedDocument`, **`HistoryEntry` (Verlauf)**, `AppSettings`,
  `snapshotFromState`.
- `apps/web/src/hooks/useDocuments.ts`, `apps/web/src/components/TemplateManager.tsx` (Vorlagen
  mit `meta` + `bloecke` in localStorage).

Deine Runde-1-Aufgabe ist deshalb **nicht** ein neues Feature (A/B/C kommen in Runde 2), sondern:
(1) das Bloom-Typ-Gating in der UI, (2) die vorhandene Kontinuität sichtbar machen. Das ist der
billigste Weg zum "Assistenten-Gefühl".

## Deine Aufgaben

### 1. Bloom-Typ-Gating nach Schwierigkeit (Didaktik #2, umdesignt)
**Wichtig:** Das LLM darf den Blocktyp NICHT eigenmächtig tauschen — das würde `buildSkelett`/
`PROFILE` (`packages/schema/src/index.ts:547+`) und damit Punkte/Raster/Notenschlüssel
desynchronisieren. Die Steuerung gehört in die UI:
- Im Baukasten (`Step2_Baukasten.tsx`) die wählbaren Aufgabentypen nach `meta.schwierigkeit`
  filtern/markieren:
  - leicht: geschlossene Typen voll erlaubt.
  - schwer: geschlossene Typen (reines MC/Matching) zurückstufen/ausgrauen, offene Typen
    bevorzugen — mit kurzem Hinweis "für 'schwer' didaktisch ungeeignet".
- Die erlaubte Typ-Matrix pro Stufe ist **gemeinsame Quelle der Wahrheit** mit Claude (Prompt).
  Vorher mit Claude abstimmen, am besten als exportierte Konstante (z. B. in `lib/constants.ts`),
  die beide Seiten nutzen.

### 2. Kontinuität sichtbar machen ("Assistenten-Gefühl")
Nutze die vorhandene Persistenz, baue kein neues Storage:
- **Weitermachen wo du warst:** Beim Start, wenn `loadHistory()`/letztes `SavedDocument` existiert,
  einen "Weitermachen"-Einstieg anbieten (statt leerer Wizard).
- **Letzte Einstellungen als Default:** Fach/Stufe/Schwierigkeit/Unterlagentyp aus dem letzten
  Dokument bzw. `AppSettings` vorbefüllen (überschreibbar).
- **Vorlagen prominenter:** `TemplateManager` ist versteckt — im Einstieg sichtbar machen
  ("Aus Vorlage starten").

Halte es schlicht: Surfacing + Defaults, keine neue Datenstruktur.

### 3. (Optional, wenn Zeit) Judge-Settings-Schalter
Claude/Minimax bauen einen "solve-then-compare"-Judge. Wenn er fertig ist: einen Schalter in den
Einstellungen ("KI-Gegenprüfung der Aufgaben", Default an für Test/Schularbeit). Sonst Runde 2.

## Was du NICHT tust
- Kein `quality.ts` (Minimax), keine `prompt.ts` (Claude).
- Noch KEIN Differenzieren-Button und KEINE Textsorten-Auswahl — das ist Runde 2 (kostensmartes
  Design steht im Master-Plan; A nutzt vorhandene `kataloge.ts`/`builder.ts`).

## Abstimmung
Mit **Claude**: erlaubte Aufgabentypen pro Schwierigkeitsstufe (Punkt 1) — eine geteilte Konstante.

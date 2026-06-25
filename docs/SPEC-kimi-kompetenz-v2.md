# Spec — Kimi: Kompetenz-Modell v2 (Wellen B + C)

> Branch `main`, vorher `git pull`. **Jede Welle = eigener Commit.** Nach jeder Welle:
> `cd apps/lua && pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test` muss grün sein.
> **Alle neuen Schema-Felder MÜSSEN optional sein** (Abwärtskompatibilität — die 12 bestehenden
> Fach-Katalogdateien und alle Tests dürfen NICHT brechen; alte Daten ohne die neuen Felder müssen
> weiter parsen). Chief reviewt nach jeder Welle.

## Kontext
Kompetenz-Übung (`apps/lua/apps/web/src/views/KompetenzView.tsx`) braucht zwei Erweiterungen:
- **Welle B — Schulstufen-Granularität 5–12** statt nur grob Unter-/Oberstufe, MIT Fallback.
- **Welle C — Inhalts-Module** (Inhalt-Achse neben Kompetenz; zuerst Geschichte + Geographie).

Welle A (Multi-Kompetenz) ist bereits erledigt (`309acd8`): `stoffItemIds: string[]`, Checkbox-Kacheln.

Schulstufe-Zählung = **national 5–12** (Unterstufe 5–8, Oberstufe 9–12; AHS-Klasse = Schulstufe − 4;
DE-kompatibel). `stufe` (unter/ober) bleibt überall als grober Fallback erhalten.

---

## 🟦 WELLE B — Schulstufen-Granularität 5–12

### B1 — Schema (`apps/lua/packages/schema/src/index.ts`)
- Nach `StufeSchema` (Z.16-17) ergänzen:
  ```ts
  export const SCHULSTUFEN = [5, 6, 7, 8, 9, 10, 11, 12] as const;
  export function stufeFromSchulstufe(s: number): Stufe { return s <= 8 ? 'unterstufe' : 'oberstufe'; }
  ```
- `DeskriptorSchema` (Z.61): Feld `schulstufe: z.number().int().min(5).max(12).optional()` hinzufügen.
- `StoffItemSchema` (Z.76): dito `schulstufe: z.number().int().min(5).max(12).optional()`.
- `MetaSchema` (Z.110, z. B. nach `stoffItemIds`): `schulstufe: z.number().int().min(5).max(12).optional()`.
- `AuftragSchema` (Z.846, z. B. nach `stoffItemIds` Z.865): dito `schulstufe: …optional()`.
- `stufe` bleibt überall **required**. KEINE bestehende Katalogdatei ändern.

### B2 — Katalog-Lookups (`apps/lua/apps/web/src/lib/stoffkatalog/index.ts`)
- `listStoffItems` (Z.55) und `listDeskriptoren` (Z.114) um optionalen letzten Parameter
  `schulstufe?: number` erweitern. Filter-Bedingung pro Item/Deskriptor (Fallback, damit grob
  kuratierte Daten sichtbar bleiben):
  ```ts
  (schulstufe === undefined
    ? item.stufe === stufe
    : item.schulstufe === schulstufe || (item.schulstufe === undefined && item.stufe === stufe))
  ```
  (für `listDeskriptoren` analog mit `d.` statt `item.`). Die `fach`- und `rahmenwerk`-Bedingungen
  bleiben unverändert.

### B3 — UI (`apps/lua/apps/web/src/views/KompetenzView.tsx`)
- `stufe`-State behalten; zusätzlich `const [schulstufe, setSchulstufe] = useState<number | undefined>(undefined)`.
- Den 2-Knopf-Block „Oberstufe/Unterstufe" durch einen **Schulstufen-Wähler** ersetzen:
  Knopf-Reihe mit Optionen `5–12` PLUS einer Option „ganze Unter-/Oberstufe" (= `schulstufe=undefined`,
  damit das alte grobe Verhalten erhalten bleibt). Label „Schulstufe".
  - Beim Wählen einer Zahl `n`: `setSchulstufe(n); setStufe(stufeFromSchulstufe(n))`.
  - Bei „ganze Unterstufe"/„ganze Oberstufe": `setSchulstufe(undefined); setStufe('unterstufe'|'oberstufe')`.
  - `stufe` MUSS synchron bleiben (treibt `STUFE_RULES`/`erlaubteTypen` + Generierung).
- `stoffItems`-`useMemo` (Z.50): `listStoffItems(fach, stufe, rahmenwerk, schulstufe)`.
- `handleErstellen`: `schulstufe` in `meta` UND `auftrag` mitgeben.
- `stufeFromSchulstufe` aus `@lehrunterlagen/schema` importieren.

### B4 — Generierung altersgenau (`apps/lua/packages/llm/src/prompt.ts`)
- `zielgruppeHinweis` (Z.741-744): wenn `input.meta.schulstufe` gesetzt, die konkrete Stufe nennen
  statt nur „Oberstufe/Unterstufe":
  ```
  Zielgruppe: <schulstufe>. Schulstufe (<schulstufe-4>. Klasse AHS) — waehle Wortschatz, Komplexitaet und Beispiele altersgerecht.
  ```
  Wenn keine `schulstufe`, bleibt der bestehende `stufeLabel`-Hinweis.

### B5 — Tests
- `apps/lua/packages/schema/src/schema.test.ts`: Deskriptor/StoffItem **mit** `schulstufe:7` parst;
  **ohne** `schulstufe` parst weiter (Back-Compat). `stufeFromSchulstufe(8) === 'unterstufe'`,
  `stufeFromSchulstufe(9) === 'oberstufe'`.
- `stoffkatalog/stoffkatalog.test.ts` bleibt grün (Felder optional).

### B-Akzeptanz
Schulstufe 7 wählen → Katalog zeigt 7er-Items UND grobe Unterstufe-Items (ohne schulstufe);
Generierung nennt die Stufe altersgerecht. Keine bestehenden Tests brechen. **KEINE Daten-Neu-
Kuratierung pro Schulstufe in dieser Welle** — nur Modell + Selektor + Fallback.

---

## 🟦 WELLE C — Inhalts-Module (Inhalt × Kompetenz; zuerst Geschichte + Geographie)

### C1 — Schema (`apps/lua/packages/schema/src/index.ts`)
- Neues Entity (nach `StoffItemSchema`):
  ```ts
  export const InhaltsModulSchema = z.object({
    id: z.string().min(1),
    rahmenwerk: RahmenwerkSchema,
    fach: FachSchema,
    stufe: StufeSchema,
    schulstufe: z.number().int().min(5).max(12).optional(),
    titel: z.string().min(1),            // "Französische Revolution"
    beschreibung: z.string().default(''), // 1 Satz Kontext für den Prompt
    quelle: z.string(),
  });
  export type InhaltsModul = z.infer<typeof InhaltsModulSchema>;
  ```
- `MetaSchema` + `AuftragSchema`: `inhaltsModulId: z.string().optional()`.

### C2 — Inhalts-Katalog (neu, parallel zu `stoffkatalog/`)
- Neuer Ordner `apps/lua/apps/web/src/lib/inhaltskatalog/` mit:
  - `geschichte.ts`, `geographie.ts` — je ein `export const ...: InhaltsModul[]` mit **mehreren
    kuratierten BMBWF-Themenbereichen** je Schulstufe (z. B. Geschichte: „Französische Revolution"
    Schulstufe 11, „Industrialisierung", „Erster Weltkrieg" …; Geographie: „Klima- und
    Vegetationszonen", „Bevölkerung & Migration" …). `quelle` ehrlich: „Entwurf, angelehnt an
    BMBWF-Lehrplan AHS — nicht offiziell zitiert". `rahmenwerk: 'at-lehrplan'`.
  - `index.ts` — Aggregator + `listInhaltsModule(fach, stufe, rahmenwerk?, schulstufe?)`
    (gleiche Fallback-Filterregel wie B2) + `getInhaltsModul(id)`.
- Andere Fächer: keine Datei nötig (Aggregator liefert leeres Array → Selektor erscheint nicht).

### C3 — UI (`apps/lua/apps/web/src/views/KompetenzView.tsx`)
- Optionaler **Inhalts-Modul-Selektor** (eigene Section, NUR rendern wenn
  `listInhaltsModule(fach, stufe, rahmenwerk, schulstufe).length > 0`): Knopf-/Kachel-Liste oder
  `<select>` mit „— kein Inhalt —" + den Modulen. State `inhaltsModulId: string | undefined`.
  - Auswahl eines Moduls → wenn `thema.trim()===''`, `setThema(modul.titel)`; `inhaltsModulId` merken.
- `handleErstellen`: `inhaltsModulId` in `meta` UND `auftrag` mitgeben.
- Die Kompetenz-Mehrfachauswahl (Welle A) bleibt die Skill-Achse — Inhalt + Kompetenz zusammen.

### C4 — Generierung (`apps/lua/packages/llm/src/types.ts` + `prompt.ts` + `apps/web/src/hooks/useGenerate.ts`)
- `GenerateInput` (`packages/llm/src/types.ts`): optionales Feld
  `inhaltsModul?: { titel: string; beschreibung: string }`.
- `useGenerate.ts`: analog `buildStoffItems` ein `inhaltsModul` aus `meta.inhaltsModulId` via
  `getInhaltsModul(id)` bauen und in den `GenerateInput` (beide Aufrufstellen, wo `stoffItems`
  gesetzt wird) durchreichen.
- `prompt.ts`, Kompetenz-Zweig: wenn `input.inhaltsModul` gesetzt, in den User-Content aufnehmen:
  ```
  Inhaltlicher Rahmen: "<titel>" — <beschreibung>. Alle Beispiele/Szenarien muessen inhaltlich zu diesem Thema passen.
  ```

### C5 — Tests
- `schema.test.ts`: `InhaltsModulSchema` parst valide/invalide Fälle (fehlender titel → Fehler).
- Neuer Integritätstest `apps/lua/apps/web/src/lib/inhaltskatalog/inhaltskatalog.test.ts` analog
  `stoffkatalog.test.ts`: keine doppelten IDs; `fach` ∈ Fach-Enum; `stufe` gültig.

### C-Akzeptanz
Geschichte, Schulstufe 11, Inhalt „Französische Revolution" + Kompetenz „Historische
Methodenkompetenz" → generierte Übung arbeitet inhaltlich an der Französischen Revolution mit
Quellen-/Methodenfokus; Kompetenznachweis listet die Methoden-Deskriptoren. Andere Fächer ohne
Modul-Daten: Selektor erscheint nicht, alter Ablauf unverändert.

---

## Reihenfolge & Chief-Review
1. **Welle B** committen → Chief-Review (Optionalität/Back-Compat, Fallback-Filter exakt, Tests grün,
   altersgerechter Prompt). 2. **Welle C** committen → Chief-Review (additiv, Integritätstest, Selektor
   nur bei Daten). Nicht beide in einen Commit mischen.

## Risiko-Hinweise
- **Schema ist Kern.** Neue Felder optional → keine bestehende Datei/kein Test darf brechen.
- **Fallback-Filter B2/C2 exakt** übernehmen — sonst verschwinden grob kuratierte Items, sobald eine
  Schulstufe gewählt ist (für die Lehrkraft unsichtbarer, schlimmer Fehler).
- **Daten-Vollkuratierung** (alle Schulstufen-Deskriptoren, Module aller Fächer) ist NICHT Teil dieser
  Wellen — nur Modell + Selektoren + Fallback + ein paar Beispiel-Module Geschichte/Geographie.

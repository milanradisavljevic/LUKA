# Datenmodell-Erweiterung (Spezifikation fuer Claude Code)

Stand: 2026-06-01. Owner: Claude Code (Schema-Owner). Regel: nur additive Aenderungen,
die 108 bestehenden Tests gruen halten. Andere Module melden Wuensche ueber TASKS.md.

## 1. Unterlagentyp

```ts
export const UnterlagentypSchema = z.enum(['hausuebung', 'test', 'schularbeit']);
export type Unterlagentyp = z.infer<typeof UnterlagentypSchema>;
```

`meta` um `typ` erweitern. Zuerst optional mit Default `'schularbeit'`, damit alte
Fixtures gueltig bleiben. Spaeter, wenn alle Aufrufer es setzen, auf required ziehen.

## 2. Auftrag (Intent) — die Absicht der Lehrkraft

Das Eingabeobjekt des Primaerwegs. Daraus wird deterministisch das Skelett gebaut.

```ts
export const AuftragSchema = z.object({
  typ: UnterlagentypSchema,
  fach: FachSchema,            // bestehend: 'deutsch' | 'englisch'
  stufe: StufeSchema,          // bestehend: 'unterstufe' | 'oberstufe'
  thema: z.string(),
  datum: z.string(),           // YYYY-MM-DD
  klasse: z.string().optional(),
  quelltexte: z.array(QuellTextSchema).default([]),
  dauerMinuten: z.number().int().positive().optional(),
  schwierigkeit: z.enum(['leicht', 'mittel', 'schwer']).optional(),
  gewuenschteAufgabenarten: z.array(BlockTypSchema).optional(), // optionale Vorgabe
  gesamtpunkteZiel: z.number().int().positive().optional(),
  notizen: z.string().optional(),
});
export type Auftrag = z.infer<typeof AuftragSchema>;
```

`gewuenschteAufgabenarten`: wenn gesetzt, nimmt das Skelett genau diese. Wenn leer oder
nicht gesetzt, entscheidet das Typ-Profil.

## 3. Typ-Profil — liefert die Struktur deterministisch

```ts
export interface TypProfil {
  typ: Unterlagentyp;
  standardAufgabenarten: { typ: BlockTyp; punkteAnteil: number }[]; // Summe ~ 1.0
  rasterErzeugen: boolean;
  notenschluesselErzeugen: boolean;
  defaultDauerMinuten: number;
  defaultGesamtpunkte: number;
  strukturhinweis: string; // fuer den Prompt, z. B. Maturastruktur bei Schularbeit
}

export const PROFILE: Record<Unterlagentyp, TypProfil>;
```

Richtwerte (von Natascha im Gate bestaetigen lassen):
- hausuebung: 1 Lueckentext + 1-2 Verstaendnisfragen, kein Raster, kein Notenschluessel,
  ~15 Minuten, ~12 Punkte.
- test: 1 Multiple Choice + 1 Verstaendnisfrage + kurze Schreibaufgabe, leichtes Raster,
  einfacher Schluessel, ~25 Minuten, ~24 Punkte.
- schularbeit: Leseverstaendnis + offene Schreibaufgabe nach Maturastruktur, volles
  Raster, AHS-Notenschluessel, ~50 Minuten, ~48 Punkte.

## 4. Ableitung Skelett

```ts
// deterministisch, ohne LLM. config-Felder mit sinnvollen Defaults.
export function buildSkelett(auftrag: Auftrag): Block[];
```

Logik: Aufgabenarten = `auftrag.gewuenschteAufgabenarten` falls gesetzt, sonst
`PROFILE[auftrag.typ].standardAufgabenarten`. Punkte aus Anteil x Gesamtpunkte
(Ziel oder Profil-Default). Quelltext-Bezug setzen.

Gesamtfluss: `Auftrag -> buildSkelett -> LLM fuellt Inhalt+Loesung -> DocumentV1`
(mit `meta.typ`). Der Renderer und das Korrekturraster bleiben unveraendert nutzbar.

## 5. Vorausschauend fuer die Korrektur (nur Namespace anlegen)

Noch nicht ausbauen, nur die Typen reservieren, damit die Korrekturphase sauber andockt.
Bleibt lokal, keine Schueler-Klarnamen an ein LLM.

```ts
export interface Abgabe {
  dokumentId: string;
  schuelerRef: string;        // lokales Pseudonym, kein Klarname im Datenfluss
  // seiten/scan-Referenzen folgen in der Korrekturphase
}

export interface Bewertung {
  dokumentId: string;
  proBlock: { blockId: string; erreichtePunkte: number; anmerkung: string }[];
  gesamtPunkte: number;
  note: 1 | 2 | 3 | 4 | 5;
}
```

## Akzeptanzkriterien

- Alle neuen Schemata exportiert und in den Modulen importierbar.
- `buildSkelett` deterministisch, mit und ohne `gewuenschteAufgabenarten` getestet.
- `meta.typ` additiv, bestehende Fixtures und Tests bleiben gruen.
- Korrektur-Typen vorhanden, aber noch nicht verdrahtet.

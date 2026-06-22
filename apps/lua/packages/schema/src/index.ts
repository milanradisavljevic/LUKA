import { z } from 'zod';

// Deterministischer Gitter-Generator (Kreuzworträtsel) — von Renderer + Web genutzt.
export * from './grids.js';

// Heuristische Quelltext-Säuberung — von Renderer + Web + Input genutzt.
export * from './clean.js';

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

export const UnterlagentypSchema = z.enum(['hausuebung', 'test', 'schuluebung', 'schularbeit']);
export type Unterlagentyp = z.infer<typeof UnterlagentypSchema>;

export const StufeSchema = z.enum(['oberstufe', 'unterstufe']);
export type Stufe = z.infer<typeof StufeSchema>;

export const FachSchema = z.enum(['deutsch', 'englisch']);
export type Fach = z.infer<typeof FachSchema>;

export const ModusSchema = z.enum(['text', 'kompetenz']);
export type Modus = z.infer<typeof ModusSchema>;

export const RahmenwerkSchema = z.enum(['at-lehrplan', 'ib-dp']);
export type Rahmenwerk = z.infer<typeof RahmenwerkSchema>;

export const BewertungsschemaSchema = z.enum(['at-1-5', 'ib-1-7']);
export type Bewertungsschema = z.infer<typeof BewertungsschemaSchema>;

// Lehrplan-Deskriptor (Ebene 1: Nachweis/Coverage)
export const DeskriptorSchema = z.object({
  id: z.string().min(1),
  rahmenwerk: RahmenwerkSchema,
  fach: FachSchema,
  stufe: StufeSchema,
  bereich: z.string().min(1),
  code: z.string(),
  text: z.string().min(1),
  quelle: z.string(),
});
export type Deskriptor = z.infer<typeof DeskriptorSchema>;

// Stoff-Item (Ebene 2: konkrete Drill-Einheit, z. B. "Konjunktiv II")
// Hinweis: defaultAufgabentypen sind semantisch BlockTyp-Werte. Sie werden als
// string[] modelliert, um einen Vorwärtsverweis auf BlockTypSchema zu vermeiden.
export const StoffItemSchema = z.object({
  id: z.string().min(1),
  rahmenwerk: RahmenwerkSchema,
  titel: z.string().min(1),
  fach: FachSchema,
  stufe: StufeSchema,
  kategorie: z.enum(['grammatik', 'wortschatz', 'rechtschreibung', 'schreiben', 'sprachreflexion']),
  deskriptorIds: z.array(z.string().min(1)),
  defaultAufgabentypen: z.array(z.string()).optional(),
});
export type StoffItem = z.infer<typeof StoffItemSchema>;

export const MetaSchema = z.object({
  stufe: StufeSchema,
  fach: FachSchema,
  thema: z.string().min(1),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format YYYY-MM-DD sein'),
  // Klasse ist optional (nicht jedes Arbeitsblatt zielt auf eine bestimmte Klasse) → leer erlaubt.
  klasse: z.string(),
  notizen: z.string(),
  typ: UnterlagentypSchema.optional(),
  schwierigkeit: z.enum(['leicht', 'mittel', 'schwer']).optional(),
  lernziele: z.array(z.string().min(1)).optional(),
  // Fehlerschwerpunkte aus einer NATASCHA-Korrektur (z. B. ["Zeichensetzung", "Grammatik"]).
  // Speist einen gezielten Hinweis in den Generierungs-Prompt (siehe packages/llm buildMessages).
  fokusThemen: z.array(z.string().min(1)).optional(),
  // Kompetenz-Modus (opt-in; Default 'text' wird im Code angenommen).
  modus: ModusSchema.optional(),
  rahmenwerk: RahmenwerkSchema.optional(),
  stoffItemIds: z.array(z.string().min(1)).optional(),
  kompetenzNiveau: z.enum(['basis', 'standard', 'erweitert']).optional(),
  bewertungsschema: BewertungsschemaSchema.optional(),
  // Frei formulierte Kompetenz oder Thema (z. B. "Present Perfect vs Past Simple").
  // Ermöglicht Generierung ohne Pflicht-Katalog-Item; Lehrplan-Nachweis nur bei Katalog-Auswahl.
  freieKompetenz: z.string().optional(),
  // Punkte komplett ausblenden (kein "/ X", keine Punkte-Spalte) — für einfache Übungen.
  punkteAusblenden: z.boolean().optional(),
});

export type Meta = z.infer<typeof MetaSchema>;

// ---------------------------------------------------------------------------
// QuellText
// ---------------------------------------------------------------------------

export const QuellTextSchema = z.object({
  id: z.string().min(1),
  // Bei Direkteingabe oft leer — Renderer/Preview fallen auf "Text N" zurück.
  titel: z.string(),
  inhalt: z.string(),
  herkunft: z.object({
    // 'eingabe' = direkt eingegebener/eingefuegter Text (kein Datei-/URL-Bezug).
    typ: z.enum(['upload', 'url', 'drive', 'eingabe']),
    // Bei manueller Eingabe gibt es keine Quellreferenz → leer erlaubt.
    ref: z.string(),
  }),
});

export type QuellText = z.infer<typeof QuellTextSchema>;

// ---------------------------------------------------------------------------
// Shared block base fields
// ---------------------------------------------------------------------------

const BlockBaseSchema = z.object({
  id: z.string().min(1),
  punkte: z.number().int().min(0),
  quelleId: z.string().min(1).optional(),
  arbeitsanweisung: z.string().min(1),
  clue: z.string().optional(),
  // Welche meta.lernziele dieser Block abdeckt (vom LLM getaggt, exakte Strings
  // aus meta.lernziele). Optional + abwärtskompatibel; speist die Coverage-Ansicht.
  lernziele: z.array(z.string().min(1)).optional(),
  // Vorgemachtes Beispiel-Item ("0. ..."), das die Aufgabenstellung demonstriert.
  // Optional, primär im Kompetenz-Modus vom LLM geliefert.
  beispiel: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Block: lueckentext
// ---------------------------------------------------------------------------

export const LueckentextBlockSchema = BlockBaseSchema.extend({
  typ: z.literal('lueckentext'),
  text: z.string().min(1).optional(),
  config: z
    .object({
      anzahlLuecken: z.number().int().positive(),
      wortbank: z.boolean(),
      distraktoren: z.number().int().min(0),
      distraktorWoerter: z.array(z.string().min(1)).optional(),
    })
    .refine(
      (c) => !(c.wortbank && c.distraktoren < 1),
      { message: 'Wenn wortbank=true, muss distraktoren >= 1 sein' },
    ),
  loesung: z.object({
    luecken: z.array(
      z.object({ nr: z.number().int().positive(), wort: z.string().min(1) }),
    ),
  }),
});

export type LueckentextBlock = z.infer<typeof LueckentextBlockSchema>;

// ---------------------------------------------------------------------------
// Block: matching
// ---------------------------------------------------------------------------

export const MatchingBlockSchema = BlockBaseSchema.extend({
  typ: z.literal('matching'),
  config: z
    .object({
      items: z.array(z.object({ nr: z.number().int().positive(), prompt: z.string().min(1) })).min(1),
      optionen: z.array(z.object({ key: z.string().min(1), text: z.string().min(1) })),
    })
    .refine(
      (c) => c.optionen.length > c.items.length,
      { message: 'Es muss mehr Optionen als Items geben' },
    ),
  loesung: z.object({
    zuordnung: z.record(z.string(), z.string()),
  }),
});

export type MatchingBlock = z.infer<typeof MatchingBlockSchema>;

// ---------------------------------------------------------------------------
// Block: multipleChoice
// ---------------------------------------------------------------------------

export const MultipleChoiceBlockSchema = BlockBaseSchema.extend({
  typ: z.literal('multipleChoice'),
  config: z.object({
    fragen: z
      .array(
        z.object({
          nr: z.number().int().positive(),
          frage: z.string().min(1),
          optionen: z.array(z.object({ key: z.string().min(1), text: z.string().min(1) })).min(4),
          mehrfach: z.boolean(),
        }),
      )
      .min(1),
  }),
  loesung: z.object({
    antworten: z.record(z.string(), z.array(z.string().min(1))),
  }),
});

export type MultipleChoiceBlock = z.infer<typeof MultipleChoiceBlockSchema>;

// ---------------------------------------------------------------------------
// Block: offeneVerstaendnisfrage
// ---------------------------------------------------------------------------

export const OffeneVerstaendnisfrageBlockSchema = BlockBaseSchema.extend({
  typ: z.literal('offeneVerstaendnisfrage'),
  config: z.object({
    fragen: z
      .array(
        z.object({
          nr: z.number().int().positive(),
          frage: z.string().min(1),
          zeilen: z.number().int().positive(),
        }),
      )
      .min(1),
  }),
  loesung: z.object({
    antworten: z.record(z.string(), z.string().min(1)),
  }),
});

export type OffeneVerstaendnisfrageBlock = z.infer<typeof OffeneVerstaendnisfrageBlockSchema>;

// ---------------------------------------------------------------------------
// Block: offeneSchreibaufgabe
// ---------------------------------------------------------------------------

export const OffeneSchreibaufgabeBlockSchema = BlockBaseSchema.extend({
  typ: z.literal('offeneSchreibaufgabe'),
  config: z
    .object({
      situation: z.string().min(1),
      textsorte: z.string().min(1),
      umfangWorte: z.object({ min: z.number().int().positive(), max: z.number().int().positive() }),
      aspekte: z.array(z.string().min(1)).min(1),
    })
    .refine(
      (c) => c.umfangWorte.min <= c.umfangWorte.max,
      { message: 'umfangWorte.min darf nicht groesser als max sein' },
    ),
  loesung: z.object({
    musterloesung: z.string().min(1),
    erwartungshorizont: z.object({
      inhalt: z.string().min(1),
      struktur: z.string().min(1),
      ausdruck: z.string().min(1),
      sprachrichtigkeit: z.string().min(1),
    }),
  }),
});

export type OffeneSchreibaufgabeBlock = z.infer<typeof OffeneSchreibaufgabeBlockSchema>;

// ---------------------------------------------------------------------------
// Block: markieraufgabe
// ---------------------------------------------------------------------------

export const MarkieraufgabeBlockSchema = BlockBaseSchema.extend({
  typ: z.literal('markieraufgabe'),
  config: z.object({
    quelleId: z.string().min(1),
    anweisung: z.string().min(1),
  }),
  loesung: z.object({
    stellen: z.array(z.string().min(1)).min(1),
  }),
});

export type MarkieraufgabeBlock = z.infer<typeof MarkieraufgabeBlockSchema>;

// ---------------------------------------------------------------------------
// Block: wordScramble
// ---------------------------------------------------------------------------

// Mehrsatz: ein Block enthält 1..n Sätze. Pro Satz NUR der korrekte Satz (`wort`).
// Die durcheinandergebrachte Reihenfolge erzeugt der Renderer deterministisch
// (Seed = block.id + Satz-Index) — kein separates loesung/loesungsreihenfolge nötig.
export const WordScrambleSatzSchema = z.object({
  wort: z.string().min(1),
});

export const WordScrambleBlockSchema = BlockBaseSchema.extend({
  typ: z.literal('wordScramble'),
  config: z.object({
    eingabemodus: z.enum(['ki', 'manuell']).optional(),
    saetze: z.array(WordScrambleSatzSchema).min(1),
  }),
});

export type WordScrambleBlock = z.infer<typeof WordScrambleBlockSchema>;

// ---------------------------------------------------------------------------
// Block: kategorisierung
// ---------------------------------------------------------------------------

export const KategorisierungItemSchema = z.object({
  nr: z.number().int().positive(),
  text: z.string().min(1),
  optionen: z.array(z.string().min(1)),
});

export const KategorisierungBlockSchema = BlockBaseSchema.extend({
  typ: z.literal('kategorisierung'),
  config: z.object({
    items: z.array(KategorisierungItemSchema).min(2),
    kategorien: z.array(
      z.object({
        name: z.string().min(1),
        anzahlItems: z.number().int().positive(),
      }),
    ).min(2),
    // Kontextuelle Spaltentitel (vom LLM gefüllt), z. B. "Satz" / "Zeitform".
    // Renderer fällt auf "Begriff"/"Kategorie" zurück, wenn leer.
    spaltentitelBegriff: z.string().optional(),
    spaltentitelKategorie: z.string().optional(),
  }),
  loesung: z.object({
    // nr -> Kategorie(n). Array erlaubt Mehrfachzuordnung ("beide" / "Jack and Diane").
    zuordnung: z.record(z.string(), z.array(z.string().min(1)).min(1)),
  }),
});

export type KategorisierungBlock = z.infer<typeof KategorisierungBlockSchema>;

// ---------------------------------------------------------------------------
// Block: tabelle
// ---------------------------------------------------------------------------

export const TabelleZelleSchema = z.union([
  z.object({ text: z.string() }),
  z.object({ luecke: z.literal(true) }),
]);

export const TabelleBlockSchema = BlockBaseSchema.extend({
  typ: z.literal('tabelle'),
  config: z.object({
    spalten: z.array(
      z.object({
        titel: z.string().min(1),
        breiteProzent: z.number().int().min(1).max(100),
      }),
    ).min(2).max(5),
    zeilen: z.array(
      z.object({
        nr: z.number().int().positive(),
        // Eine Zelle je Spalte: entweder fester Text oder eine auszufüllende Lücke.
        zellen: z.array(TabelleZelleSchema).min(2),
      }),
    ).min(1),
  }).refine(
    (c) => c.zeilen.every((z) => z.zellen.length === c.spalten.length),
    { message: 'Jede Zeile muss genau so viele Zellen wie Spalten haben' },
  ),
  loesung: z.object({
    // Key "zeilenNr,spaltenIndex" (spaltenIndex 0-basiert) -> Wert der Lücke.
    zellen: z.record(z.string(), z.string().min(1)),
  }),
});

export type TabelleBlock = z.infer<typeof TabelleBlockSchema>;

// ---------------------------------------------------------------------------
// Block: stiluebung
// ---------------------------------------------------------------------------

export const StiluebungBlockSchema = BlockBaseSchema.extend({
  typ: z.literal('stiluebung'),
  config: z.object({
    ausgangstext: z.string().min(1),
    zielniveau: z.enum(['umgangssprachlich', 'standard', 'gehoben', 'fachsprachlich']),
    transformation: z.enum(['verdeutlichen', 'variieren', 'kuerzen', 'erweitern']),
  }),
  loesung: z.object({
    umformulierung: z.string().min(1),
    begruendung: z.string().min(1),
  }),
});

export type StiluebungBlock = z.infer<typeof StiluebungBlockSchema>;

// ---------------------------------------------------------------------------
// Block: songanalyse
// ---------------------------------------------------------------------------

export const SonganalyseBlockSchema = BlockBaseSchema.extend({
  typ: z.literal('songanalyse'),
  config: z.object({
    interpret: z.string().min(1),
    titel: z.string().min(1),
    medium: z.literal('song'),
    genre: z.string().optional(),
    lyrics: z.string().min(1),
    aufgabe: z.enum(['inhaltsangabe', 'wirkungsanalyse', 'sprachanalyse', 'vergleich']),
  }),
  loesung: z.object({
    ergebnis: z.string().min(1),
    zitate: z.array(z.string().min(1)),
    analysepunkte: z.array(
      z.object({
        aspekt: z.string().min(1),
        befund: z.string().min(1),
        zitat: z.string().optional(),
      }),
    ).min(1),
  }),
});

export type SonganalyseBlock = z.infer<typeof SonganalyseBlockSchema>;

// ---------------------------------------------------------------------------
// Block: kreuzwortraetsel
// ---------------------------------------------------------------------------
// LLM liefert nur Wort+Hinweis; das Gitter baut `baueKreuzwortgitter` (grids.ts)
// deterministisch. Keine separate loesung — die Wörter in config.eintraege SIND
// die Lösung (Renderer zeigt sie nur in der Lösungsfassung).

export const KreuzwortraetselBlockSchema = BlockBaseSchema.extend({
  typ: z.literal('kreuzwortraetsel'),
  config: z.object({
    // 'ki' (Default): KI zieht Wörter aus dem Quelltext. 'manuell': Lehrkraft gibt eintraege
    // selbst vor; teils befüllte Einträge = Hybrid (KI füllt die leeren bis anzahlWoerter).
    eingabemodus: z.enum(['ki', 'manuell']).optional(),
    anzahlWoerter: z.number().int().positive().optional(),
    eintraege: z.array(
      z.object({
        wort: z.string().min(2),   // ein einzelnes Wort, mind. 2 Buchstaben
        hinweis: z.string().min(1), // Definition/Frage, ohne das Wort zu nennen
      }),
    ).optional(),
  }),
});

export type KreuzwortraetselBlock = z.infer<typeof KreuzwortraetselBlockSchema>;

// ---------------------------------------------------------------------------
// Block: wortgitter (Wortsuchrätsel)
// ---------------------------------------------------------------------------
// LLM liefert nur die zu suchenden Wörter; das Buchstabengitter baut
// `baueWortgitter` (grids.ts) deterministisch. Keine separate loesung.

export const WortgitterBlockSchema = BlockBaseSchema.extend({
  typ: z.literal('wortgitter'),
  config: z.object({
    eingabemodus: z.enum(['ki', 'manuell']).optional(),
    anzahlWoerter: z.number().int().positive().optional(),
    woerter: z.array(z.string().min(2)).optional(),
  }),
});

export type WortgitterBlock = z.infer<typeof WortgitterBlockSchema>;

// ---------------------------------------------------------------------------
// Block: vokabeluebung
// ---------------------------------------------------------------------------

export const VokabeluebungBlockSchema = BlockBaseSchema.extend({
  typ: z.literal('vokabeluebung'),
  config: z.object({
    eingabemodus: z.enum(['ki', 'manuell']).optional(),
    richtung: z.enum(['de_fremd', 'fremd_de']),
    anzahlVokabeln: z.number().int().positive().optional(),
    vokabeln: z.array(
      z.object({
        deutsch: z.string().min(1),
        fremdsprache: z.string().min(1),
        kontextsatz: z.string().optional(),
      })
    ).optional(),
  }),
  loesung: z.object({
    antworten: z.record(z.string(), z.string()),
  }).optional(),
});

export type VokabeluebungBlock = z.infer<typeof VokabeluebungBlockSchema>;

// ---------------------------------------------------------------------------
// Block: umformung (Satztransformation)
// ---------------------------------------------------------------------------

export const UmformungBlockSchema = BlockBaseSchema.extend({
  typ: z.literal('umformung'),
  config: z.object({
    aufgaben: z.array(z.object({
      nr: z.number().int().positive(),
      ausgangssatz: z.string().min(1),
      anweisung: z.string().min(1),
      zielstruktur: z.string().min(1),
    })).min(1),
  }),
  loesung: z.object({
    loesungen: z.array(z.object({
      nr: z.number().int().positive(),
      umformulierung: z.string().min(1),
      erklaerung: z.string().optional(),
    })),
  }),
});

export type UmformungBlock = z.infer<typeof UmformungBlockSchema>;

// ---------------------------------------------------------------------------
// Block: fehlerkorrektur
// ---------------------------------------------------------------------------

export const FehlerkorrekturBlockSchema = BlockBaseSchema.extend({
  typ: z.literal('fehlerkorrektur'),
  config: z.object({
    eingabemodus: z.enum(['ki', 'manuell']).optional(),
    saetze: z.array(z.object({
      nr: z.number().int().positive(),
      satz: z.string().min(1),
      anzahlFehler: z.number().int().positive(),
    })).min(1),
  }),
  loesung: z.object({
    korrekturen: z.array(z.object({
      nr: z.number().int().positive(),
      korrigierterSatz: z.string().min(1),
      fehler: z.array(z.object({
        stelle: z.string().min(1),
        art: z.enum(['R', 'G', 'Z', 'A']),
        erklaerung: z.string().optional(),
      })),
    })),
  }),
});

export type FehlerkorrekturBlock = z.infer<typeof FehlerkorrekturBlockSchema>;

// ---------------------------------------------------------------------------
// Block: roleplay (Rollenspiel / kommunikative Sprechsituation)
// ---------------------------------------------------------------------------

export const RoleplayRolleSchema = z.object({
  name: z.string().min(1),
  beschreibung: z.string().min(1),
  aufgabe: z.string().min(1),
  redemittel: z.array(z.string().min(1)).default([]),
});

export const RoleplayBlockSchema = BlockBaseSchema.extend({
  typ: z.literal('roleplay'),
  config: z.object({
    eingabemodus: z.enum(['ki', 'manuell']).optional(),
    situation: z.string().min(1),
    setting: z.string().min(1),
    ziel: z.string().min(1),
    zeitMinuten: z.number().int().positive().default(5),
    redemittel: z.array(z.string().min(1)).default([]),
    rollen: z.array(RoleplayRolleSchema).min(2).max(4),
    bewertung: z.array(z.string().min(1)).default([]),
  }),
  loesung: z.object({
    musterdialog: z.string().min(1),
    hinweise: z.string().min(1),
  }),
});

export type RoleplayBlock = z.infer<typeof RoleplayBlockSchema>;

// ---------------------------------------------------------------------------
// Discriminated union of all block types
// ---------------------------------------------------------------------------

export const BlockSchema = z.discriminatedUnion('typ', [
  LueckentextBlockSchema,
  MatchingBlockSchema,
  MultipleChoiceBlockSchema,
  OffeneVerstaendnisfrageBlockSchema,
  OffeneSchreibaufgabeBlockSchema,
  MarkieraufgabeBlockSchema,
  WordScrambleBlockSchema,
  KategorisierungBlockSchema,
  TabelleBlockSchema,
  StiluebungBlockSchema,
  SonganalyseBlockSchema,
  KreuzwortraetselBlockSchema,
  WortgitterBlockSchema,
  VokabeluebungBlockSchema,
  UmformungBlockSchema,
  FehlerkorrekturBlockSchema,
  RoleplayBlockSchema,
]);

export type Block = z.infer<typeof BlockSchema>;

// ---------------------------------------------------------------------------
// Didaktischer Rahmen (optional, primär Kompetenz-Modus)
// ---------------------------------------------------------------------------
// Macht aus generierten Blöcken ein komponiertes Arbeitsblatt: sprechender Titel,
// Einleitung, Merkkasten (Regel + Signalwörter), Transfer-Schlussaufgabe.

export const DidaktikSchema = z.object({
  // Sprechender Arbeitsblatt-Titel (z. B. "Greetings from London!").
  arbeitsblattTitel: z.string().optional(),
  // 1-2 schülergerichtete Sätze, was in diesem Blatt geübt wird.
  einleitung: z.string().optional(),
  // Gerahmte Grammatik-/Merkbox: Regel + Signalwörter als Stichpunkte.
  merkkasten: z.object({
    titel: z.string(),
    // Legacy: Fließtext-Punkte (wird ignoriert, wenn items vorhanden ist).
    punkte: z.array(z.string().min(1)).optional(),
    // Neu: Strukturierte Grammatik-Items mit Form, Use, Signalwörtern und Beispiel.
    items: z.array(z.object({
      notion: z.string().min(1),
      form: z.string().optional(),
      use: z.array(z.string().min(1)).optional(),
      signalWords: z.array(z.string().min(1)).optional(),
      example: z.string().optional(),
      tip: z.string().optional(),
    })).min(1).optional(),
  }).refine(
    (m) => (m.punkte && m.punkte.length >= 1) || (m.items && m.items.length >= 1),
    { message: 'Merkkasten braucht entweder punkte oder items.' },
  ).optional(),
  // Kurze freie Produktionsaufgabe zum Abschluss (Transfer).
  transferaufgabe: z.string().optional(),
});

export type Didaktik = z.infer<typeof DidaktikSchema>;
export type Merkkasten = NonNullable<Didaktik['merkkasten']>;
export type MerkkastenItem = NonNullable<Merkkasten['items']>[number];

// ---------------------------------------------------------------------------
// Full Document
// ---------------------------------------------------------------------------

export const DocumentSchema = z.object({
  schemaVersion: z.literal('0.1.0'),
  meta: MetaSchema,
  quelltexte: z.array(QuellTextSchema).default([]),
  bloecke: z.array(BlockSchema).min(1),
  didaktik: DidaktikSchema.optional(),
});

export type DocumentV1 = z.infer<typeof DocumentSchema>;

// ---------------------------------------------------------------------------
// Schema-Versionierung + Migration
// ---------------------------------------------------------------------------

export const CURRENT_SCHEMA_VERSION = '0.1.0' as const;

/**
 * Bringt ein (möglicherweise altes) gespeichertes Dokument auf die aktuelle
 * Schema-Version und validiert es. Greift beim Laden von Vorlagen/Dokumenten
 * (Import), damit künftige Feldänderungen gespeicherte Daten nicht brechen.
 *
 * Aktuell existiert nur Version 0.1.0 — die Migrationskette ist daher leer.
 * Künftige Versionen erweitern den switch um schrittweise Transformationen
 * (0.1.0 → 0.2.0 → …), bevor am Ende gegen DocumentSchema validiert wird.
 */
export function migrateDocument(raw: unknown): DocumentV1 {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Kein gültiges Dokument-Objekt.');
  }
  const obj = { ...(raw as Record<string, unknown>) };
  let version = typeof obj.schemaVersion === 'string' ? obj.schemaVersion : '0.0.0';

  // Migrationskette (zukünftig): jede Stufe transformiert obj in-place und hebt version an.
  // switch (version) { case '0.0.0': /* … */ version = '0.1.0'; /* fallthrough */ }

  // Fehlende/abweichende Version auf aktuelle setzen (sobald die Kette durchlaufen ist).
  if (version !== CURRENT_SCHEMA_VERSION) {
    obj.schemaVersion = CURRENT_SCHEMA_VERSION;
    version = CURRENT_SCHEMA_VERSION;
  }

  const parsed = DocumentSchema.safeParse(obj);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
    throw new Error(`Dokument-Migration fehlgeschlagen: ${detail}`);
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// BlockTyp (fuer Auftrag und TypProfil)
// ---------------------------------------------------------------------------

export const BlockTypSchema = z.enum([
  'lueckentext',
  'matching',
  'multipleChoice',
  'offeneVerstaendnisfrage',
  'offeneSchreibaufgabe',
  'markieraufgabe',
  'wordScramble',
  'kategorisierung',
  'tabelle',
  'stiluebung',
  'songanalyse',
  'kreuzwortraetsel',
  'wortgitter',
  'vokabeluebung',
  'umformung',
  'fehlerkorrektur',
  'roleplay',
]);
export type BlockTyp = z.infer<typeof BlockTypSchema>;

// ---------------------------------------------------------------------------
// Bloom-Eignung von Aufgabentypen je Schwierigkeit
// ---------------------------------------------------------------------------
// EINZIGE QUELLE DER WAHRHEIT fuer UI-Typ-Gating (apps/web) UND Prompt-Steuerung
// (packages/llm). Beide Seiten muessen identisch entscheiden, welche Typen zu welchem
// kognitiven Niveau passen — sonst driften Baukasten und LLM auseinander.
//
// "abgeraten" = der Typ widerspricht dem kognitiven Niveau (z. B. geschlossenes Multiple
// Choice bei "schwer" = Bewerten/Erschaffen). NICHT verboten: die UI graut aus und warnt,
// der Prompt hebt die kognitive Tiefe innerhalb des Typs. Der Blocktyp wird NIEMALS
// eigenmaechtig vom LLM getauscht (das wuerde buildSkelett/PROFILE desynchronisieren).
// Diese Matrix ist bewusst justierbar — paedagogische Feinjustierung erwuenscht.

export type Schwierigkeit = 'leicht' | 'mittel' | 'schwer';
export type TypEignung = 'geeignet' | 'abgeraten';

export const BLOOM_TYP_ABGERATEN: Record<Schwierigkeit, { typ: BlockTyp; grund: string }[]> = {
  leicht: [
    { typ: 'offeneSchreibaufgabe', grund: 'Produktives Schreiben (Bloom 5–6) ueberfordert das Niveau "leicht".' },
    { typ: 'songanalyse', grund: 'Interpretation (Bloom 4–5) ist fuer "leicht" zu anspruchsvoll.' },
    { typ: 'stiluebung', grund: 'Umformulierung im Zielstil setzt Analyse/Synthese voraus.' },
  ],
  mittel: [],
  schwer: [
    { typ: 'lueckentext', grund: 'Geschlossener Reproduktionstyp (Bloom 1–2) — ungeeignet fuer Bewerten/Erschaffen.' },
    { typ: 'matching', grund: 'Geschlossener Zuordnungstyp — kein Urteil, keine Synthese moeglich.' },
    { typ: 'multipleChoice', grund: 'Geschlossener Typ; "schweres MC" bleibt faktisch Bloom 1–2. Besser offene Typen.' },
    { typ: 'wordScramble', grund: 'Reine Reproduktion.' },
    { typ: 'kreuzwortraetsel', grund: 'Reine Reproduktion/Spielform.' },
    { typ: 'wortgitter', grund: 'Reine Reproduktion/Spielform.' },
    { typ: 'vokabeluebung', grund: 'Reine Reproduktion.' },
  ],
};

export function getTypEignung(typ: BlockTyp, schwierigkeit: Schwierigkeit): TypEignung {
  return BLOOM_TYP_ABGERATEN[schwierigkeit].some((e) => e.typ === typ) ? 'abgeraten' : 'geeignet';
}

export function getAbratungsgrund(typ: BlockTyp, schwierigkeit: Schwierigkeit): string | undefined {
  return BLOOM_TYP_ABGERATEN[schwierigkeit].find((e) => e.typ === typ)?.grund;
}

// ---------------------------------------------------------------------------
// Auftrag — die Absicht der Lehrkraft (Primaerweg)
// ---------------------------------------------------------------------------

export const AuftragSchema = z.object({
  typ: UnterlagentypSchema,
  fach: FachSchema,
  stufe: StufeSchema,
  thema: z.string(),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format YYYY-MM-DD sein'),
  klasse: z.string().optional(),
  quelltexte: z.array(QuellTextSchema).default([]),
  dauerMinuten: z.number().int().positive().optional(),
  schwierigkeit: z.enum(['leicht', 'mittel', 'schwer']).optional(),
  gewuenschteAufgabenarten: z.array(BlockTypSchema).optional(),
  gesamtpunkteZiel: z.number().int().positive().optional(),
  notizen: z.string().optional(),
  lernziele: z.array(z.string().min(1)).optional(),
  // Fehlerschwerpunkte aus einer NATASCHA-Korrektur — wird in die Meta übernommen.
  fokusThemen: z.array(z.string().min(1)).optional(),
  // Kompetenz-Modus (opt-in; Default 'text' wird im Code angenommen).
  modus: ModusSchema.optional(),
  rahmenwerk: RahmenwerkSchema.optional(),
  stoffItemIds: z.array(z.string().min(1)).optional(),
  kompetenzNiveau: z.enum(['basis', 'standard', 'erweitert']).optional(),
  bewertungsschema: BewertungsschemaSchema.optional(),
  freieKompetenz: z.string().optional(),
});
export type Auftrag = z.infer<typeof AuftragSchema>;

// ---------------------------------------------------------------------------
// Typ-Profil — liefert die Struktur deterministisch
// ---------------------------------------------------------------------------

export interface TypProfil {
  typ: Unterlagentyp;
  standardAufgabenarten: { typ: BlockTyp; punkteAnteil: number }[]; // Summe ~ 1.0
  rasterErzeugen: boolean;
  notenschluesselErzeugen: boolean;
  defaultDauerMinuten: number;
  defaultGesamtpunkte: number;
  strukturhinweis: string; // fuer den Prompt, z. B. Maturastruktur bei Schularbeit
}

export const PROFILE: Record<Unterlagentyp, TypProfil> = {
  hausuebung: {
    typ: 'hausuebung',
    standardAufgabenarten: [
      { typ: 'lueckentext', punkteAnteil: 0.5 },
      { typ: 'offeneVerstaendnisfrage', punkteAnteil: 0.5 },
    ],
    rasterErzeugen: false,
    notenschluesselErzeugen: false,
    defaultDauerMinuten: 15,
    defaultGesamtpunkte: 12,
    strukturhinweis: 'Kurze Hausuebung, eine Lueckentext- und eine Verstaendnisaufgabe.',
  },
  test: {
    typ: 'test',
    standardAufgabenarten: [
      { typ: 'multipleChoice', punkteAnteil: 0.25 },
      { typ: 'offeneVerstaendnisfrage', punkteAnteil: 0.35 },
      { typ: 'offeneSchreibaufgabe', punkteAnteil: 0.4 },
    ],
    rasterErzeugen: true,
    notenschluesselErzeugen: true,
    defaultDauerMinuten: 25,
    defaultGesamtpunkte: 24,
    strukturhinweis: 'Test mit Multiple Choice, Verstaendnisfrage und kurzer Schreibaufgabe.',
  },
  schuluebung: {
    typ: 'schuluebung',
    standardAufgabenarten: [
      { typ: 'lueckentext', punkteAnteil: 0.3 },
      { typ: 'matching', punkteAnteil: 0.3 },
      { typ: 'multipleChoice', punkteAnteil: 0.4 },
    ],
    rasterErzeugen: false,
    notenschluesselErzeugen: false,
    defaultDauerMinuten: 20,
    defaultGesamtpunkte: 0,
    strukturhinweis: 'Schuluebung ohne Notenvergabe: Uebungsaufgaben wie Lueckentext, Matching und Multiple Choice. Keine Punkte, keine Noten.',
  },
  schularbeit: {
    typ: 'schularbeit',
    standardAufgabenarten: [
      { typ: 'offeneVerstaendnisfrage', punkteAnteil: 0.3 },
      { typ: 'offeneSchreibaufgabe', punkteAnteil: 0.7 },
    ],
    rasterErzeugen: true,
    notenschluesselErzeugen: true,
    defaultDauerMinuten: 50,
    defaultGesamtpunkte: 48,
    strukturhinweis: 'Schularbeit nach oesterreichischer Maturastruktur: Leseverstaendnis und offene Schreibaufgabe mit Situation, Textsorte, Umfang und Aspekten.',
  },
};

// ---------------------------------------------------------------------------
// Skelett-Builder — deterministisch, ohne LLM
// ---------------------------------------------------------------------------

export function buildSkelett(auftrag: Auftrag): Block[] {
  const profil = PROFILE[auftrag.typ];
  const aufgabenarten = auftrag.gewuenschteAufgabenarten ?? profil.standardAufgabenarten.map((a) => a.typ);
  const gesamtpunkte = auftrag.gesamtpunkteZiel ?? profil.defaultGesamtpunkte;

  // Normalisiere Anteile auf die tatsaechlich gewaehlten Aufgabenarten
  const gewaehlteAnteile = profil.standardAufgabenarten.filter((a) => aufgabenarten.includes(a.typ));
  const anteilSum = gewaehlteAnteile.reduce((sum, a) => sum + a.punkteAnteil, 0);

  const blocks: Block[] = aufgabenarten.map((typ, index) => {
    const anteil = gewaehlteAnteile.find((a) => a.typ === typ)?.punkteAnteil ?? (1 / aufgabenarten.length);
    const normierterAnteil = anteilSum > 0 ? anteil / anteilSum : 1 / aufgabenarten.length;
    const punkte = gesamtpunkte > 0 ? Math.max(1, Math.round(normierterAnteil * gesamtpunkte)) : 0;

    const base = {
      id: `b${index + 1}`,
      typ,
      punkte,
      arbeitsanweisung: '[Arbeitsanweisung]',
    };

    switch (typ) {
      case 'lueckentext':
        return {
          ...base,
          typ: 'lueckentext',
          config: { anzahlLuecken: Math.max(5, Math.round(punkte)), wortbank: auftrag.stufe === 'unterstufe', distraktoren: auftrag.stufe === 'unterstufe' ? 3 : 0 },
          loesung: { luecken: [] },
        };
      case 'matching':
        return {
          ...base,
          typ: 'matching',
          config: {
            items: Array.from({ length: 4 }, (_, i) => ({ nr: i + 1, prompt: `[Item ${i + 1}]` })),
            optionen: ['A', 'B', 'C', 'D', 'E'].map((key) => ({ key, text: `[Option ${key}]` })),
          },
          loesung: { zuordnung: {} },
        };
      case 'multipleChoice':
        return {
          ...base,
          typ: 'multipleChoice',
          config: {
            fragen: Array.from({ length: 4 }, (_, i) => ({
              nr: i + 1,
              frage: `[Frage ${i + 1}]`,
              optionen: [
                { key: 'A', text: '[Option A]' },
                { key: 'B', text: '[Option B]' },
                { key: 'C', text: '[Option C]' },
                { key: 'D', text: '[Option D]' },
              ],
              mehrfach: false,
            })),
          },
          loesung: { antworten: {} },
        };
      case 'offeneVerstaendnisfrage':
        return {
          ...base,
          typ: 'offeneVerstaendnisfrage',
          config: { fragen: Array.from({ length: 3 }, (_, i) => ({ nr: i + 1, frage: `[Frage ${i + 1}]`, zeilen: Math.max(3, Math.round(punkte / 2)) })) },
          loesung: { antworten: {} },
        };
      case 'offeneSchreibaufgabe': {
        const schwierigkeit = auftrag.schwierigkeit ?? 'mittel';
        const umfang = auftrag.stufe === 'oberstufe' ? { min: 270, max: 330 } : { min: 120, max: 180 };
        return {
          ...base,
          typ: 'offeneSchreibaufgabe',
          config: {
            situation: '[Situation]',
            textsorte: '[Textsorte]',
            umfangWorte: umfang,
            aspekte: schwierigkeit === 'leicht' ? ['Aspekt 1'] : ['Aspekt 1', 'Aspekt 2'],
          },
          loesung: { musterloesung: '[Musterloesung]', erwartungshorizont: { inhalt: '[Erwartung Inhalt]', struktur: '[Erwartung Struktur]', ausdruck: '[Erwartung Ausdruck]', sprachrichtigkeit: '[Erwartung Sprachrichtigkeit]' } },
        };
      }
      case 'markieraufgabe':
        return {
          ...base,
          typ: 'markieraufgabe',
          config: { quelleId: (auftrag.quelltexte ?? [])[0]?.id ?? 'q1', anweisung: '[Anweisung]' },
          loesung: { stellen: ['[Textstelle]'] },
        };
      case 'wordScramble':
        return {
          ...base,
          typ: 'wordScramble',
          config: { saetze: [{ wort: '[Satz]' }] },
        };
      case 'kategorisierung':
        return {
          ...base,
          typ: 'kategorisierung',
          config: {
            items: Array.from({ length: 6 }, (_, i) => ({ nr: i + 1, text: `[Item ${i + 1}]`, optionen: ['[Kategorie A]', '[Kategorie B]'] })),
            kategorien: [
              { name: '[Kategorie A]', anzahlItems: 3 },
              { name: '[Kategorie B]', anzahlItems: 3 },
            ],
          },
          loesung: { zuordnung: Object.fromEntries(Array.from({ length: 6 }, (_, i) => [String(i + 1), [i % 2 === 0 ? '[Kategorie A]' : '[Kategorie B]']])) },
        };
      case 'tabelle':
        return {
          ...base,
          typ: 'tabelle',
          config: {
            spalten: [
              { titel: '[Spalte 1]', breiteProzent: 50 },
              { titel: '[Spalte 2]', breiteProzent: 50 },
            ],
            zeilen: [{ nr: 1, zellen: [{ text: '[Zelle]' }, { luecke: true }] }],
          },
          loesung: { zellen: { '1,1': '[Loesung]' } },
        };
      case 'stiluebung':
        return {
          ...base,
          typ: 'stiluebung',
          config: { ausgangstext: '[Ausgangstext]', zielniveau: 'standard', transformation: 'variieren' },
          loesung: { umformulierung: '[Umformulierung]', begruendung: '[Begruendung]' },
        };
      case 'songanalyse':
        return {
          ...base,
          typ: 'songanalyse',
          config: { interpret: '[Interpret]', titel: '[Titel]', medium: 'song', lyrics: '[Lyrics]', aufgabe: 'inhaltsangabe' },
          loesung: { ergebnis: '[Ergebnis]', zitate: [], analysepunkte: [{ aspekt: '[Aspekt]', befund: '[Befund]' }] },
        };
      case 'kreuzwortraetsel':
        return {
          ...base,
          typ: 'kreuzwortraetsel',
          config: {
            eintraege: [
              { wort: '[WORT1]', hinweis: '[Hinweis 1]' },
              { wort: '[WORT2]', hinweis: '[Hinweis 2]' },
            ],
          },
        };
      case 'wortgitter':
        return {
          ...base,
          typ: 'wortgitter',
          config: { woerter: ['[WORT1]', '[WORT2]', '[WORT3]'] },
        };
      case 'umformung':
        return {
          ...base,
          typ: 'umformung',
          config: {
            aufgaben: Array.from({ length: 5 }, (_, i) => ({ nr: i + 1, ausgangssatz: '[Satz]', anweisung: '[Anweisung]', zielstruktur: '[Zielstruktur]' })),
          },
          loesung: { loesungen: [] },
        };
      case 'fehlerkorrektur':
        return {
          ...base,
          typ: 'fehlerkorrektur',
          config: {
            saetze: Array.from({ length: 5 }, (_, i) => ({ nr: i + 1, satz: '[Satz mit Fehlern]', anzahlFehler: 1 })),
          },
          loesung: { korrekturen: [] },
        };
      default:
        throw new Error(`Unbekannter Blocktyp: ${typ}`);
    }
  });

  // Punkte auf Gesamtpunkte normieren (Rundungsfehler ausgleichen) — nur wenn Gesamtpunkte > 0
  if (gesamtpunkte > 0) {
    const currentSum = blocks.reduce((sum, b) => sum + b.punkte, 0);
    const diff = gesamtpunkte - currentSum;
    const lastBlock = blocks[blocks.length - 1];
    if (diff !== 0 && lastBlock) {
      lastBlock.punkte = Math.max(1, lastBlock.punkte + diff);
    }
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Deterministische Layout-Utils
// ---------------------------------------------------------------------------

/** Einfacher seed-basierter PRNG (Mulberry32). */
function mulberry32(seed: string): () => number {
  let a = 0;
  for (let i = 0; i < seed.length; i++) {
    a = (a + seed.charCodeAt(i)) | 0;
  }
  a = a >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) | 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seed-stabiles Shuffle (Fisher-Yates). */
export function shuffle<T>(array: T[], seed: string): T[] {
  const rng = mulberry32(seed);
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Baut eine Wortbank aus Lösungswörtern + Distraktoren.
 * Seed-stabil: gleicher Seed ergibt gleiche Reihenfolge.
 */
export function baueWortbank(
  loesungen: string[],
  distraktoren: string[],
  seed: string,
): string[] {
  const alle = [...loesungen, ...distraktoren];
  return shuffle(alle, seed);
}

/**
 * Verwürfelt einen Text deterministisch (seed-stabil).
 * modus 'satz' = Wörter mischen, modus 'wort' = Buchstaben mischen.
 * Garantiert eine vom Original abweichende Reihenfolge (sofern überhaupt möglich).
 */
export function verwuerfle(text: string, modus: 'wort' | 'satz', seed: string): string {
  const teile = modus === 'satz' ? text.split(/\s+/).filter((w) => w.length > 0) : [...text];
  const sep = modus === 'satz' ? ' ' : '';
  if (teile.length < 2) return teile.join(sep);
  const original = teile.join(sep);
  // Bei Kollision mit dem Original Seed variieren, damit die Aufgabe lösbar bleibt.
  for (let versuch = 0; versuch < 5; versuch++) {
    const gemischt = shuffle(teile, `${seed}#${versuch}`).join(sep);
    if (gemischt !== original) return gemischt;
  }
  return shuffle(teile, seed).join(sep);
}

// ---------------------------------------------------------------------------
// Korrektur-Namespace (vorausschauend reserviert, noch nicht verdrahtet)
// ---------------------------------------------------------------------------

export interface Abgabe {
  dokumentId: string;
  schuelerRef: string; // lokales Pseudonym, kein Klarname im Datenfluss
}

export interface Bewertung {
  dokumentId: string;
  proBlock: { blockId: string; erreichtePunkte: number; anmerkung: string }[];
  gesamtPunkte: number;
  note: 1 | 2 | 3 | 4 | 5;
}

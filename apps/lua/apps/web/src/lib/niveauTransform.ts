import type { Block, DocumentV1 } from '@lehrunterlagen/schema';

/** Offene Blocktypen, die sich für Leicht/Schwer-Variationen eignen. */
const OFFENE_TYPEN = new Set<Block['typ']>([
  'offeneVerstaendnisfrage',
  'offeneSchreibaufgabe',
  'markieraufgabe',
]);

export function istOffenerBlock(block: Block): boolean {
  return OFFENE_TYPEN.has(block.typ);
}

/**
 * Transformiert ein Dokument in eine LEICHT-Version — ohne LLM.
 *
 * Offene Typen:
 *   - offeneVerstaendnisfrage: +2 Hilfszeilen pro Frage
 *   - offeneSchreibaufgabe: -30% Wortbereich (min. 50 Wörter)
 *   - markieraufgabe: unverändert (kein mechanischer Hebel)
 *
 * Geschlossene Typen:
 *   - lueckentext: max. 4 Lücken, max. 2 Distraktoren
 *   - multipleChoice: max. 3 Fragen, mehfach: false
 *   - matching: max. 3 Items, optionen = items + 1
 *   - kategorisierung: max. 4 Items, max. 2 Kategorien
 *   - tabelle: max. 3 Zeilen, ~50% Lücken gefüllt
 *   - vokabeluebung: max. 5 Vokabeln, Richtung de_fremd
 *   - fehlerkorrektur: max. 3 Sätze
 *   - wordScramble: max. 4 Sätze
 *   - kreuzwortraetsel: max. 5 Einträge
 *   - wortgitter: max. 5 Wörter
 */
export function transformiereLeicht(doc: DocumentV1): DocumentV1 {
  const bloecke = doc.bloecke.map((block) => {
    switch (block.typ) {
      // ── Offene Typen ──────────────────────────────────────────────
      case 'offeneVerstaendnisfrage':
        return {
          ...block,
          config: {
            ...block.config,
            fragen: block.config.fragen.map((f) => ({
              ...f,
              zeilen: f.zeilen + 2,
            })),
          },
        };

      case 'offeneSchreibaufgabe': {
        const min = Math.max(50, Math.round(block.config.umfangWorte.min * 0.7));
        const max = Math.max(min + 20, Math.round(block.config.umfangWorte.max * 0.7));
        return {
          ...block,
          config: { ...block.config, umfangWorte: { min, max } },
        };
      }

      // ── Geschlossene Typen ────────────────────────────────────────
      case 'lueckentext':
        return {
          ...block,
          config: {
            ...block.config,
            anzahlLuecken: Math.min(block.config.anzahlLuecken, 4),
            distraktoren: Math.min(block.config.distraktoren, 2),
          },
        };

      case 'multipleChoice':
        return {
          ...block,
          config: {
            ...block.config,
            fragen: block.config.fragen.slice(0, 3).map((f) => ({
              ...f,
              mehfach: false,
            })),
          },
        };

      case 'matching': {
        const maxItems = Math.min(block.config.items.length, 3);
        return {
          ...block,
          config: {
            ...block.config,
            items: block.config.items.slice(0, maxItems),
            optionen: block.config.optionen.slice(0, maxItems + 1),
          },
        };
      }

      case 'kategorisierung':
        return {
          ...block,
          config: {
            ...block.config,
            items: block.config.items.slice(0, 4),
            kategorien: block.config.kategorien.slice(0, 2),
          },
        };

      case 'tabelle': {
        const lueckeLoesung = (zelle: { text?: string; luecke?: boolean; lueckenId?: number },
                                loesung: { nr: number; wort: string }[]): string | null => {
          if (!zelle.luecke) return null;
          const match = loesung.find((l) => l.nr === zelle.lueckenId);
          return match?.wort ?? null;
        };
        const neueZeilen = block.config.zeilen.slice(0, 3).map((zeile) => ({
          ...zeile,
          zellen: zeile.zellen.map((zelle, idx) => {
            // ~50% der Lücken füllen (gerade Indizes)
            if ('luecke' in zelle && zelle.luecke && idx % 2 === 0) {
              const loesung = (block as any).loesung?.zellen ?? [];
              const ersatz = lueckeLoesung(zelle, loesung);
              if (ersatz) return { text: ersatz };
            }
            return zelle;
          }),
        }));
        return { ...block, config: { ...block.config, zeilen: neueZeilen } };
      }

      case 'vokabeluebung':
        return {
          ...block,
          config: {
            ...block.config,
            vokabeln: (block.config.vokabeln ?? []).slice(0, 5),
            anzahlVokabeln: Math.min(block.config.anzahlVokabeln ?? 8, 5),
            richtung: 'de_fremd' as const,
          },
        };

      case 'fehlerkorrektur':
        return {
          ...block,
          config: {
            ...block.config,
            anzahlSaetze: Math.min(block.config.anzahlSaetze ?? block.config.saetze.length, 3),
            saetze: block.config.saetze.slice(0, 3),
          },
        };

      case 'wordScramble':
        return {
          ...block,
          config: {
            ...block.config,
            saetze: block.config.saetze.slice(0, 4),
          },
        };

      case 'kreuzwortraetsel': {
        const eintraege = block.config.eintraege ?? [];
        return {
          ...block,
          config: {
            ...block.config,
            eintraege: eintraege.slice(0, 5),
            anzahlWoerter: Math.min(block.config.anzahlWoerter ?? eintraege.length, 5),
          },
        };
      }

      case 'wortgitter': {
        const woerter = block.config.woerter ?? [];
        return {
          ...block,
          config: {
            ...block.config,
            woerter: woerter.slice(0, 5),
            anzahlWoerter: Math.min(block.config.anzahlWoerter ?? woerter.length, 5),
          },
        };
      }

      default:
        return block;
    }
  });

  return { ...doc, bloecke };
}

/**
 * Liste der offenen Block-IDs in einem Dokument (für Schwer-Reroll).
 */
export function findeOffeneBlockIds(doc: DocumentV1): string[] {
  return doc.bloecke.filter(istOffenerBlock).map((b) => b.id);
}

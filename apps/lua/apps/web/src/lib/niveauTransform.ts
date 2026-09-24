import type { Block, DocumentV1, Meta } from '@lehrunterlagen/schema';

/** Gemeinsame Operatorenstufe für einen neu generierten Schwer-Reroll. */
export function metaFuerSchwereVariante(meta: Meta): Meta {
  return { ...meta, schwierigkeit: 'schwer', kompetenzNiveau: 'erweitert' };
}

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
        const items = block.config.items ?? [];
        const optionen = block.config.optionen ?? [];
        const maxItems = Math.min(items.length, 3);
        return {
          ...block,
          config: {
            ...block.config,
            items: items.slice(0, maxItems),
            optionen: optionen.slice(0, maxItems + 1),
          },
        };
      }

      case 'kategorisierung':
        return {
          ...block,
          config: {
            ...block.config,
            items: (block.config.items ?? []).slice(0, 4),
            kategorien: (block.config.kategorien ?? []).slice(0, 2),
          },
        };

      case 'tabelle': {
        const loesungen = block.loesung.zellen;
        let lueckenIndex = 0;
        const neueZeilen = block.config.zeilen.slice(0, 3).map((zeile) => ({
          ...zeile,
          zellen: zeile.zellen.map((zelle, idx) => {
            if ('luecke' in zelle && zelle.luecke) {
              // Jede zweite tatsächliche Lücke füllen, unabhängig von der
              // Spalte, in der die Lücken im Tabellenlayout liegen.
              const fuellen = lueckenIndex % 2 === 0;
              lueckenIndex += 1;
              if (fuellen) {
                const ersatz = loesungen[`${zeile.nr},${idx}`];
                if (ersatz) return { text: ersatz };
              }
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
            anzahlSaetze: Math.min(block.config.anzahlSaetze ?? block.config.saetze?.length ?? 1, 3),
            saetze: (block.config.saetze ?? []).slice(0, 3),
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
 * Erzeugt eine schwerere Fassung ohne neue Inhalte zu erfinden.
 *
 * Bei Lückentexten werden nur bereits nummerierte und gelöste Lücken genutzt;
 * eine Wortbank wird als Hilfestellung entfernt. Wo das nicht sicher möglich
 * ist, bleibt die Aufgabenstruktur unverändert.
 */
export function transformiereSchwer(doc: DocumentV1): DocumentV1 {
  const bloecke = doc.bloecke.map((block) => {
    switch (block.typ) {
      case 'offeneVerstaendnisfrage':
        return {
          ...block,
          config: {
            ...block.config,
            fragen: block.config.fragen.map((f) => ({ ...f, zeilen: Math.max(1, f.zeilen - 1) })),
          },
        };

      case 'offeneSchreibaufgabe': {
        // Auch kleine Wortbereiche muessen tatsaechlich steigen: Rundung auf
        // ganze Woerter machte z. B. aus 1–1 sonst erneut 1–1.
        const min = Math.max(
          block.config.umfangWorte.min + 1,
          Math.ceil(block.config.umfangWorte.min * 1.25),
        );
        const max = Math.max(
          block.config.umfangWorte.max + 1,
          Math.ceil(block.config.umfangWorte.max * 1.25),
          min,
        );
        return { ...block, config: { ...block.config, umfangWorte: { min, max } } };
      }

      case 'lueckentext': {
        const loesungsNrs = new Set((block.loesung?.luecken ?? []).map((l) => l.nr));
        let sichereLuecken = block.config.anzahlLuecken;

        if (block.text?.trim()) {
          // Im Cloze-Text steuern Marker die tatsächlich sichtbaren Lücken;
          // config.anzahlLuecken darf nur mit vollständig gelösten Markern folgen.
          const markerNrs = [...block.text.matchAll(/\((\d+)\)|\[(\d+)\]/g)]
            .map((match) => Number(match[1] ?? match[2]));
          const eindeutigeNrs = [...new Set(markerNrs)].sort((a, b) => a - b);
          const lueckenSindVollstaendig = eindeutigeNrs.length > 0
            && eindeutigeNrs.every((nr, index) => nr === index + 1 && loesungsNrs.has(nr));
          if (lueckenSindVollstaendig) sichereLuecken = eindeutigeNrs.length;
        } else {
          // Ohne Cloze-Text erzeugt der Renderer nummerierte Leerzeilen aus
          // config.anzahlLuecken; nur lückenlose Lösungsschlüssel zählen.
          let belegteLuecken = 0;
          while (loesungsNrs.has(belegteLuecken + 1)) belegteLuecken += 1;
          if (belegteLuecken >= block.config.anzahlLuecken) {
            sichereLuecken = Math.min(belegteLuecken, block.config.anzahlLuecken + 2);
          }
        }

        return {
          ...block,
          config: {
            ...block.config,
            anzahlLuecken: sichereLuecken,
            wortbank: false,
          },
        };
      }

      case 'tabelle': {
        const loesungen = block.loesung.zellen;
        let zusaetzlicheLuecken = 0;
        const zeilen = block.config.zeilen.map((zeile) => ({
          ...zeile,
          zellen: zeile.zellen.map((zelle, idx) => {
            const key = `${zeile.nr},${idx}`;
            if (
              zusaetzlicheLuecken < 2
              && 'text' in zelle
              && Boolean(loesungen[key])
            ) {
              zusaetzlicheLuecken += 1;
              return { luecke: true as const };
            }
            return zelle;
          }),
        }));
        return { ...block, config: { ...block.config, zeilen } };
      }

      default:
        return block;
    }
  });
  return { ...doc, bloecke };
}

/** Kennzeichnet, ob eine sichere Schwer-Transformation tatsächlich etwas ändert. */
export function erstelleSichereSchwereVariante(doc: DocumentV1): {
  dokument: DocumentV1;
  geaendert: boolean;
} {
  const dokument = transformiereSchwer(doc);
  return {
    dokument,
    geaendert: doc.bloecke.some((block, index) =>
      JSON.stringify(block) !== JSON.stringify(dokument.bloecke[index]),
    ),
  };
}

/**
 * Liste der offenen Block-IDs in einem Dokument (für Schwer-Reroll).
 */
export function findeOffeneBlockIds(doc: DocumentV1): string[] {
  return doc.bloecke.filter(istOffenerBlock).map((b) => b.id);
}

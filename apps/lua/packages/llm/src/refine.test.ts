import { describe, expect, it } from 'vitest';
import type { DocumentV1 } from '@lehrunterlagen/schema';
import { refineDocument } from './refine.js';

const source = {
  id: 'q1',
  titel: 'Medien',
  inhalt: 'Beispieltext ueber Medienkonsum bei Jugendlichen.',
  herkunft: { typ: 'upload' as const, ref: 'test.txt' },
};

const document: DocumentV1 = {
  schemaVersion: '0.1.0',
  meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'Medien', datum: '2026-07-12', klasse: '7A', notizen: '' },
  quelltexte: [source],
  bloecke: [{
    id: 'b1',
    typ: 'lueckentext',
    punkte: 8,
    quelleId: 'q1',
    arbeitsanweisung: 'Setze das passende Wort ein.',
    config: { anzahlLuecken: 1, wortbank: false, distraktoren: 0 },
    loesung: { luecken: [{ nr: 1, wort: 'Beispieltext' }] },
  }],
};

const refinedBlock = {
  ...document.bloecke[0],
  arbeitsanweisung: 'Setze das zentrale Wort aus dem ersten Satz ein und begründe danach kurz seine Bedeutung im Kontext.',
};

const cfg = { provider: 'anthropic' as const, model: 'test-model' };

describe('refineDocument', () => {
  it('validiert Wrapper, revidiert Inhalte und übernimmt Änderungsnotizen', async () => {
    const complete = async () => `\n\`\`\`json\n${JSON.stringify({
      bloecke: [refinedBlock],
      aenderungen: ['Die Arbeitsanweisung ist konkreter auf den Text bezogen.', 'Der Arbeitsauftrag macht die erwartete Handlung beobachtbar.'],
    })}\n\`\`\`\n`;

    const result = await refineDocument(document, cfg, complete);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.bloecke[0]!.id).toBe('b1');
    expect(result.document.bloecke[0]!.quelleId).toBe('q1');
    expect(result.aenderungen).toHaveLength(2);
    expect(result.document.bloecke[0]!.arbeitsanweisung).toContain('ersten Satz');
  });

  it('lehnt zu wenige Änderungsnotizen ab', async () => {
    const result = await refineDocument(document, cfg, async () => JSON.stringify({
      bloecke: [refinedBlock],
      aenderungen: ['Nur eine Änderung'],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fehler).toContain('zwei bis drei');
  });

  it('lehnt veränderte IDs und quelleIds ab', async () => {
    const result = await refineDocument(document, cfg, async () => JSON.stringify({
      bloecke: [{ ...refinedBlock, id: 'neu', quelleId: 'andere-quelle' }],
      aenderungen: ['Die Aufgabe wurde konkretisiert.', 'Der Textbezug wurde geschärft.'],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fehler).toMatch(/Block-ID|quelleId/);
  });

  it('lehnt schema-ungültige Revisionen ab', async () => {
    const result = await refineDocument(document, cfg, async () => JSON.stringify({
      bloecke: [{ ...refinedBlock, config: { anzahlLuecken: 0, wortbank: true, distraktoren: 0 } }],
      aenderungen: ['Die Aufgabe wurde konkretisiert.', 'Die Lösung wurde überprüft.'],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fehler).toContain('nicht gültig');
  });
});

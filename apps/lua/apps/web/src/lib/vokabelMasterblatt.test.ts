import { describe, expect, it } from 'vitest';
import { BlockSchema, type Meta } from '@lehrunterlagen/schema';
import { createVokabelMasterblattBlocks, VOCAB_MASTERBLATT_MARKER } from './vokabelMasterblatt';

const meta: Meta = {
  stufe: 'unterstufe',
  fach: 'englisch',
  thema: 'Vokabel-Masterblatt Englisch',
  datum: '2026-09-30',
  klasse: '',
  notizen: '',
  typ: 'schuluebung',
  punkteAusblenden: true,
};

describe('Vokabel-Masterblatt Englisch', () => {
  it('startet mit fünf passenden, editierbaren Aufgabenarten zu je zehn Einträgen', () => {
    const blocks = createVokabelMasterblattBlocks(meta);
    expect(blocks.map((block) => block.typ)).toEqual([
      'vokabeluebung', 'matching', 'lueckentext', 'kreuzwortraetsel', 'wortgitter',
    ]);
    expect(new Set(blocks.map((block) => block.id)).size).toBe(5);

    const vokabel = blocks.find((block) => block.typ === 'vokabeluebung');
    const matching = blocks.find((block) => block.typ === 'matching');
    const lueckentext = blocks.find((block) => block.typ === 'lueckentext');
    const kreuzwort = blocks.find((block) => block.typ === 'kreuzwortraetsel');
    const wortgitter = blocks.find((block) => block.typ === 'wortgitter');

    expect(vokabel?.typ === 'vokabeluebung' && vokabel.config.anzahlVokabeln).toBe(10);
    expect(vokabel?.typ === 'vokabeluebung' && vokabel.config.richtung).toBe('de_fremd');
    expect(vokabel?.hinweis).toContain(VOCAB_MASTERBLATT_MARKER);
    expect(matching?.typ === 'matching' && matching.config.items).toHaveLength(10);
    expect(matching?.typ === 'matching' && matching.config.optionen).toHaveLength(11);
    expect(lueckentext?.typ === 'lueckentext' && lueckentext.config.anzahlLuecken).toBe(10);
    expect(kreuzwort?.typ === 'kreuzwortraetsel' && kreuzwort.config.anzahlWoerter).toBe(10);
    expect(wortgitter?.typ === 'wortgitter' && wortgitter.config.anzahlWoerter).toBe(10);
  });

  it('führt durch das Schema, abgesehen von der app-weit leeren Arbeitsanweisung', () => {
    // `createDefaultBlock` lässt `arbeitsanweisung` bewusst leer — das füllt die
    // Generierung. Jeder andere Befund stammt aus dem Masterblatt und wäre ein Fehler.
    for (const block of createVokabelMasterblattBlocks(meta)) {
      const ergebnis = BlockSchema.safeParse(block);
      if (ergebnis.success) continue;
      const echteFehler = ergebnis.error.issues
        .filter((i) => i.path.join('.') !== 'arbeitsanweisung')
        .map((i) => `${i.path.join('.')}: ${i.message}`);
      if (echteFehler.length) throw new Error(`${block.typ} → ${echteFehler.join('; ')}`);
    }
  });

  it('lässt keine leere Zeile in Vokabeln, Matching und Rätseln stehen', () => {
    const bloecke = createVokabelMasterblattBlocks(meta);
    const vokabel = bloecke.find((b) => b.typ === 'vokabeluebung');
    const matching = bloecke.find((b) => b.typ === 'matching');
    const kreuzwort = bloecke.find((b) => b.typ === 'kreuzwortraetsel');
    const wortgitter = bloecke.find((b) => b.typ === 'wortgitter');

    if (vokabel?.typ !== 'vokabeluebung' || matching?.typ !== 'matching'
      || kreuzwort?.typ !== 'kreuzwortraetsel' || wortgitter?.typ !== 'wortgitter'
      || !vokabel.config.vokabeln || !matching.config.items) {
      throw new Error('Blocktypen oder Einträge fehlen');
    }
    const leer = [
      ...vokabel.config.vokabeln.flatMap((e) => [e.deutsch, e.fremdsprache]),
      ...matching.config.items.map((e) => e.prompt),
      ...matching.config.optionen.map((e) => e.text),
      ...(kreuzwort.config.eintraege ?? []).flatMap((e) => [e.wort, e.hinweis]),
      ...(wortgitter.config.woerter ?? []),
    ].filter((wert) => wert.trim() === '');
    expect(leer).toEqual([]);
  });

  it('trägt sichtbare Platzhalter statt Leerstrings', () => {
    const vokabel = createVokabelMasterblattBlocks(meta).find((block) => block.typ === 'vokabeluebung');
    if (vokabel?.typ !== 'vokabeluebung') throw new Error('Kein Vokabelblock');
    expect(vokabel.config.vokabeln?.[0]).toMatchObject({
      deutsch: '[Deutsch 1]', fremdsprache: '[English 1]',
    });
  });
});

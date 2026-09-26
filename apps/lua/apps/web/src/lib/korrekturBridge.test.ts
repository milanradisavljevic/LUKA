import { describe, expect, it, beforeEach } from 'vitest';
import { consumePendingUebung, setPendingPlanung, setPendingUebung } from './korrekturBridge';
import type { NataschaPrefill } from './nataschaBridge';

const KORREKTUR: NataschaPrefill = {
  thema: 'Erzählung', fach: 'deutsch', stufe: 'oberstufe',
  ausgangstext: 'Text', fokusThemen: ['Zeitformen'], gewuenschteAufgabenarten: [], notizen: '',
};
const PLANUNG: NataschaPrefill = {
  thema: 'Balladen', klasse: '6b', fach: 'deutsch',
  fokusThemen: [], gewuenschteAufgabenarten: ['lueckentext'], notizen: 'Aus dem Stundenplan',
};

describe('Prefill-Brücke', () => {
  beforeEach(() => { consumePendingUebung(); });

  it('ist leer, solange nichts gesetzt wurde', () => {
    expect(consumePendingUebung()).toBeNull();
  });

  it('liefert die Korrektur-Vorbefüllung mit ihrer Quelle', () => {
    setPendingUebung(KORREKTUR);
    const geholt = consumePendingUebung();
    expect(geholt?.quelle).toBe('korrektur');
    expect(geholt?.prefill.thema).toBe('Erzählung');
  });

  it('liefert die Planungs-Vorbefüllung mit ihrer Quelle', () => {
    // Der Unterschied entscheidet, ob Step0 an FEATURES.natascha hängt und ob
    // ein Ausgangstext erwartet wird.
    setPendingPlanung(PLANUNG);
    const geholt = consumePendingUebung();
    expect(geholt?.quelle).toBe('planung');
    expect(geholt?.prefill.klasse).toBe('6b');
  });

  it('verbraucht genau einmal', () => {
    setPendingPlanung(PLANUNG);
    expect(consumePendingUebung()).not.toBeNull();
    expect(consumePendingUebung()).toBeNull();
  });

  it('vergisst die Quelle nicht zwischen zwei Aufrufen', () => {
    // Sonst käme die zweite, aus der Planung gesetzte Vorbefüllung als
    // Korrektur daher und würde an FEATURES.natascha hängen.
    setPendingPlanung(PLANUNG);
    consumePendingUebung();
    setPendingUebung(KORREKTUR);
    expect(consumePendingUebung()?.quelle).toBe('korrektur');
    setPendingPlanung(PLANUNG);
    expect(consumePendingUebung()?.quelle).toBe('planung');
  });
});

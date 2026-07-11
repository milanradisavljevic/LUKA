import { describe, expect, it } from 'vitest';
import { isKuratiert, parsePoolTags } from './pool';

describe('Pool-Herkunft', () => {
  it('erkennt redaktionell kuratierte Fachpaket-Aufgaben am Tag', () => {
    expect(isKuratiert(['redaktionell-kuratiert', 'startpaket-v1'])).toBe(true);
    expect(isKuratiert(['fachpaket-medien-demokratie-v2', 'redaktionell-kuratiert'])).toBe(true);
  });

  it('markiert selbst gespeicherte Wizard-Aufgaben ohne das Tag nicht als kuratiert', () => {
    expect(isKuratiert([])).toBe(false);
    expect(isKuratiert(['irgendein-anderes-tag'])).toBe(false);
  });

  it('kombiniert sich mit parsePoolTags auf beliebigem tags-String', () => {
    expect(isKuratiert(parsePoolTags('["redaktionell-kuratiert"]'))).toBe(true);
    expect(isKuratiert(parsePoolTags(null))).toBe(false);
    expect(isKuratiert(parsePoolTags('kaputt-kein-json'))).toBe(false);
  });
});

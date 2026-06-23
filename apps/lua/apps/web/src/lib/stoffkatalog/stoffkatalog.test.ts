import { describe, it, expect } from 'vitest';
import { KOMPETENZBEREICHE } from '@lehrunterlagen/schema';
import { getAllStoffItems, getAllDeskriptoren } from './index';

describe('Stoffkatalog-Integrität', () => {
  const deskriptoren = getAllDeskriptoren();
  const stoffItems = getAllStoffItems();
  const deskriptorIds = new Set(deskriptoren.map((d) => d.id));

  it('jede deskriptorIds-Referenz eines StoffItems existiert', () => {
    for (const item of stoffItems) {
      for (const id of item.deskriptorIds) {
        expect(deskriptorIds.has(id), `StoffItem ${item.id} → fehlender Deskriptor ${id}`).toBe(true);
      }
    }
  });

  it('jede StoffItem.kategorie liegt in KOMPETENZBEREICHE[fach]', () => {
    for (const item of stoffItems) {
      const erlaubt = KOMPETENZBEREICHE[item.fach] ?? [];
      expect(erlaubt.includes(item.kategorie), `StoffItem ${item.id}: kategorie "${item.kategorie}" nicht in KOMPETENZBEREICHE[${item.fach}]`).toBe(true);
    }
  });

  it('jeder Deskriptor.bereich liegt in KOMPETENZBEREICHE[fach]', () => {
    for (const d of deskriptoren) {
      const erlaubt = KOMPETENZBEREICHE[d.fach] ?? [];
      expect(erlaubt.includes(d.bereich), `Deskriptor ${d.id}: bereich "${d.bereich}" nicht in KOMPETENZBEREICHE[${d.fach}]`).toBe(true);
    }
  });

  it('keine doppelten Deskriptor-/StoffItem-IDs', () => {
    expect(new Set(deskriptoren.map((d) => d.id)).size).toBe(deskriptoren.length);
    expect(new Set(stoffItems.map((s) => s.id)).size).toBe(stoffItems.length);
  });
});

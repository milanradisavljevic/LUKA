import { describe, it, expect } from 'vitest';
import { KOMPETENZBEREICHE } from '@lehrunterlagen/schema';
import { getAllStoffItems, getAllDeskriptoren, listStoffItems, fachHatEntwurf, istEntwurfsQuelle } from './index';

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

  it('registriert vollständige deutsche Kernkataloge', () => {
    for (const fach of ['deutsch', 'englisch', 'geschichte', 'geographie', 'ethik'] as const) {
      const fachDeskriptoren = deskriptoren.filter((d) => d.fach === fach && d.rahmenwerk === 'de-lehrplan');
      const fachItems = stoffItems.filter((s) => s.fach === fach && s.rahmenwerk === 'de-lehrplan');
      expect(fachDeskriptoren, `${fach}: erwartete 24 deutsche Deskriptoren`).toHaveLength(24);
      expect(fachItems, `${fach}: erwartete 6 deutsche StoffItems`).toHaveLength(6);
      expect(fachDeskriptoren.every((d) => d.id.startsWith('de-'))).toBe(true);
      expect(fachItems.every((s) => s.id.startsWith('de-'))).toBe(true);
      expect(listStoffItems(fach, 'unterstufe', 'de-lehrplan').length).toBeGreaterThan(0);
      expect(listStoffItems(fach, 'oberstufe', 'de-lehrplan').length).toBeGreaterThan(0);
    }
  });
});

describe('Entwurfs-Vermerk-Steuerung', () => {
  it('istEntwurfsQuelle erkennt nur Entwurfs-Quellen', () => {
    expect(istEntwurfsQuelle('Entwurf, angelehnt an BMBWF-Lehrplan')).toBe(true);
    expect(istEntwurfsQuelle('BMBWF-Lehrplan AHS Geschichte (Oberstufe) — RIS, Stand 2023')).toBe(false);
    expect(istEntwurfsQuelle('')).toBe(false);
    expect(istEntwurfsQuelle(undefined)).toBe(false);
  });

  it('voll gesourcte Fächer zeigen keinen Entwurfs-Vermerk', () => {
    // Sachfächer + Latein/Religion/Psychologie sind vollständig gesourct.
    for (const fach of ['geschichte', 'geographie', 'ethik', 'philosophie', 'latein', 'religion', 'psychologie'] as const) {
      expect(fachHatEntwurf(fach), `${fach} sollte voll gesourct sein`).toBe(false);
    }
  });

  it('alle Fächer sind nach der Stufen-Integration voll gesourct', () => {
    for (const fach of ['englisch', 'deutsch', 'franzoesisch', 'spanisch', 'italienisch'] as const) {
      expect(fachHatEntwurf(fach), `${fach} sollte keinen Entwurfs-Vermerk mehr zeigen`).toBe(false);
    }
  });
});

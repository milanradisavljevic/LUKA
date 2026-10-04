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

  it('deckt Mathematik und Biologie in den vorgesehenen österreichischen Schulstufen ab', () => {
    const unterstufeMathe = ['Zahlen und Maße', 'Variablen und Funktionen', 'Figuren und Körper', 'Daten und Zufall'];
    const oberstufeMathe = ['Algebra und Geometrie', 'Funktionale Abhängigkeiten', 'Analysis', 'Wahrscheinlichkeit und Statistik'];
    const bioUnterstufe = ['Wissen aneignen, anwenden und kommunizieren', 'Erkenntnisse gewinnen', 'Standpunkte begründen und reflektiert handeln'];
    const bioOberstufe = ['Fachwissen aneignen und kommunizieren', 'Erkenntnisse gewinnen', 'Standpunkte begründen und reflektiert handeln'];
    for (const fach of ['mathematik', 'biologie'] as const) {
      const fachDeskriptoren = deskriptoren.filter((d) => d.fach === fach && d.rahmenwerk === 'at-lehrplan');
      const fachItems = stoffItems.filter((item) => item.fach === fach && item.rahmenwerk === 'at-lehrplan');
      expect(fachDeskriptoren.length, fach + ': Deskriptoren vorhanden').toBeGreaterThan(0);
      expect(fachItems.length, fach + ': StoffItems vorhanden').toBeGreaterThan(0);
      for (let schulstufe = 5; schulstufe <= 12; schulstufe++) {
        const stufenDeskriptoren = fachDeskriptoren.filter((d) => d.schulstufe === schulstufe);
        const stufenItems = fachItems.filter((item) => item.schulstufe === schulstufe);
        expect(stufenDeskriptoren.length, fach + ' Schulstufe ' + schulstufe + ': Deskriptoren').toBeGreaterThan(0);
        expect(stufenItems.length, fach + ' Schulstufe ' + schulstufe + ': StoffItems').toBeGreaterThan(0);
        const erlaubteBereiche = fach === 'mathematik'
          ? schulstufe <= 8 ? unterstufeMathe : schulstufe === 9 ? oberstufeMathe.slice(0, 2) : oberstufeMathe
          : schulstufe <= 8 ? bioUnterstufe : bioOberstufe;
        expect(new Set(stufenDeskriptoren.map((d) => d.bereich))).toEqual(new Set(erlaubteBereiche));
        for (const descriptor of stufenDeskriptoren) {
          expect(descriptor.quelle, descriptor.id + ': RIS-Stelle, Fassung und Direktlink').toContain('Anlage 1');
          expect(descriptor.quelle).toContain('gültig ab 01.09.2026');
          expect(descriptor.quelle).toContain('https://www.ris.bka.gv.at/NormDokument.wxe?');
        }
        for (const item of stufenItems) {
          expect(item.deskriptorIds.length, item.id + ': Deskriptorverweis').toBeGreaterThan(0);
          for (const id of item.deskriptorIds) {
            expect(stufenDeskriptoren.some((d) => d.id === id && d.bereich === item.kategorie), item.id + ' → ' + id + ' muss derselben Stufe und demselben Kompetenzbereich angehören').toBe(true);
          }
        }
      }
    }
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

  it('registriert deutsche Restfachkataloge mit toleranterem Umfang', () => {
    const restfaecher = ['franzoesisch', 'spanisch', 'italienisch', 'latein', 'religion', 'psychologie', 'philosophie', 'mediendemokratie', 'informatikki'] as const;
    const oberstufenlastig = new Set(['latein', 'psychologie', 'philosophie']);

    for (const fach of restfaecher) {
      const fachDeskriptoren = deskriptoren.filter((d) => d.fach === fach && d.rahmenwerk === 'de-lehrplan');
      const fachItems = stoffItems.filter((s) => s.fach === fach && s.rahmenwerk === 'de-lehrplan');
      expect(fachDeskriptoren.length, `${fach}: mindestens 16 deutsche Deskriptoren`).toBeGreaterThanOrEqual(16);
      expect(fachItems.length, `${fach}: mindestens 4 deutsche StoffItems`).toBeGreaterThanOrEqual(4);
      expect(fachDeskriptoren.every((d) => d.id.startsWith('de-'))).toBe(true);
      expect(fachItems.every((s) => s.id.startsWith('de-'))).toBe(true);
      expect(fachDeskriptoren.some((d) => d.stufe === 'oberstufe')).toBe(true);
      if (!oberstufenlastig.has(fach)) {
        expect(fachDeskriptoren.some((d) => d.stufe === 'unterstufe')).toBe(true);
      }
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

  it('voll gesourcte Fächer zeigen im AT-Lehrplan keinen Entwurfs-Vermerk', () => {
    // Sachfächer + Latein/Religion/Psychologie sind vollständig gesourct.
    for (const fach of ['geschichte', 'geographie', 'ethik', 'philosophie', 'latein', 'religion', 'psychologie'] as const) {
      expect(fachHatEntwurf(fach, undefined, 'at-lehrplan'), `${fach} sollte voll gesourct sein`).toBe(false);
    }
  });

  it('alle Fächer sind im AT-Lehrplan nach der Stufen-Integration voll gesourct', () => {
    for (const fach of ['englisch', 'deutsch', 'franzoesisch', 'spanisch', 'italienisch'] as const) {
      expect(fachHatEntwurf(fach, undefined, 'at-lehrplan'), `${fach} sollte keinen Entwurfs-Vermerk mehr zeigen`).toBe(false);
    }
  });

  it('deutsche Kataloge sind ehrlich als Entwurf gekennzeichnet — nur für de-lehrplan', () => {
    // Seit Runde 2 haben ALLE Fächer einen DE-Katalog; alle sind kuratierte Entwürfe.
    const deutscheFaecher = ['deutsch', 'englisch', 'franzoesisch', 'spanisch', 'italienisch', 'latein', 'geschichte', 'geographie', 'religion', 'ethik', 'psychologie', 'philosophie', 'mediendemokratie', 'informatikki'] as const;
    for (const fach of deutscheFaecher) {
      expect(fachHatEntwurf(fach, undefined, 'de-lehrplan'), `${fach} (DE) sollte Entwurfs-Vermerk zeigen`).toBe(true);
    }
  });
});

import { describe, expect, it } from 'vitest';
import type { AppState } from './types';
import {
  TERMIN_BLOCKTYPEN, fehlendeAngaben, kontextAusStunde, themaAusTermin, unterlageAusTermin,
} from './unterlageBauen';
import type { GeplanteStunde } from './stundenMappen';

/** Genug von einem echten Wizard-Zustand, um `generate` nicht zu behindern. */
function basis(): AppState {
  return {
    step: 'absicht',
    auftrag: null,
    meta: { stufe: 'unterstufe', fach: 'deutsch', thema: 'etwas', klasse: '', notizen: '', datum: '2026-09-21' },
    quelltexte: [],
    bloecke: [],
    generiertesDokument: null,
    llmProvider: null,
    modelName: null,
    kreativitaet: null,
    ausgabeSprache: null,
    aktuelleDokumentId: null,
    renderTemplate: 'standard',
    renderLayout: 'standard',
  } as unknown as AppState;
}

const VOLL = { klasse: '6b', thema: 'Der Sturm auf den Barrikaden', fach: 'deutsch' as const, datum: '2026-09-21' };

describe('fehlendeAngaben', () => {
  it('meldet nichts, wenn Thema und Fach da sind', () => {
    expect(fehlendeAngaben(VOLL)).toEqual([]);
  });

  it('meldet ein fehlendes Thema', () => {
    expect(fehlendeAngaben({ ...VOLL, thema: '' })).toEqual(['thema']);
  });

  it('meldet ein fehlendes Fach - ohne geht es nicht', () => {
    // Ein Termin kennt sein Fach nicht; es steht in den Klassenmetadaten. Ohne
    // es zu raten, bekäme die Lehrkraft eine Lateinunterlage für Deutsch.
    expect(fehlendeAngaben({ ...VOLL, fach: undefined })).toEqual(['fach']);
  });

  it('meldet beides, wenn beides fehlt', () => {
    expect(fehlendeAngaben({ klasse: '6b' })).toEqual(['thema', 'fach']);
  });
});

describe('themaAusTermin', () => {
  it('schneidet Leerzeichen ab', () => {
    expect(themaAusTermin({ thema: '  Lyrik  ' })).toBe('Lyrik');
  });

  it('liefert ohne Thema einen leeren String, nicht undefined', () => {
    expect(themaAusTermin({})).toBe('');
    expect(themaAusTermin({ thema: '   ' })).toBe('');
  });
});

describe('unterlageAusTermin', () => {
  it('baut Meta, Auftrag und Blöcke aus dem Termin', () => {
    const bau = unterlageAusTermin(VOLL, basis());
    expect(bau.ok).toBe(true);
    if (!bau.ok) return;
    const { meta, auftrag, bloecke } = bau.auftrag;
    expect(meta.klasse).toBe('6b');
    expect(meta.thema).toBe('Der Sturm auf den Barrikaden');
    expect(meta.fach).toBe('deutsch');
    expect(meta.typ).toBe('schuluebung');
    expect(auftrag.thema).toBe('Der Sturm auf den Barrikaden');
    expect(auftrag.klasse).toBe('6b');
    expect(auftrag.gewuenschteAufgabenarten).toEqual(TERMIN_BLOCKTYPEN);
    expect(bloecke.length).toBeGreaterThan(0);
  });

  it('nimmt keine Fachraten vor', () => {
    // Ohne Fach wird nicht gebaut - lieber Assistent als Latein zu Deutsch.
    const bau = unterlageAusTermin({ klasse: '6b', thema: 'Brüche' }, basis());
    expect(bau.ok).toBe(false);
    if (bau.ok) return;
    expect(bau.fehlt).toEqual(['fach']);
  });

  it('baut ein Gerüst ohne Quelltext – und erfindet keinen', () => {
    // Ein Kalendereintrag hat keine Datei daneben. Das Gerüst geht deshalb
    // bewusst ohne Quelltext in den Assistenten, wo die Lehrkraft ihn
    // einträgt. Wichtig: `modus` bleibt ungesetzt – sonst fiele der Auftrag in
    // den Text-Modus, der zwingend Quelltexte verlangt und den Lauf abweisen
    // würde, bevor überhaupt ein Anbieter gefragt ist.
    const bau = unterlageAusTermin(VOLL, basis());
    expect(bau.ok).toBe(true);
    if (!bau.ok) return;
    expect(bau.auftrag.auftrag.quelltexte).toEqual([]);
    expect(bau.auftrag.state.quelltexte).toEqual([]);
    expect(bau.auftrag.state.meta.modus).toBeUndefined();
  });

  it('baut ohne Thema nicht', () => {
    const bau = unterlageAusTermin({ ...VOLL, thema: '' }, basis());
    expect(bau.ok).toBe(false);
  });

  it('leert ein altes generiertes Dokument', () => {
    // Sonst schickt der Aufrufer ein Dokument aus einem früheren Lauf mit und
    // `generate` prüft das alte statt des neuen.
    const alt = basis();
    alt.generiertesDokument = { version: 1, meta: {} } as never;
    const bau = unterlageAusTermin(VOLL, alt);
    expect(bau.ok).toBe(true);
    if (!bau.ok) return;
    expect(bau.auftrag.state.generiertesDokument).toBeNull();
  });

  it('übernimmt die Schuljahresstufe in die Stufe', () => {
    const bau = unterlageAusTermin({ ...VOLL, schulstufe: 11 }, basis());
    expect(bau.ok).toBe(true);
    if (!bau.ok) return;
    expect(bau.auftrag.meta.stufe).toBe('oberstufe');
    expect(bau.auftrag.auftrag.schulstufe).toBe(11);
  });

  it('rechnet die Stufe nach dem Land des Profils, nicht nach Österreich', () => {
    // `stufeFromSchulstufe` legt die Grenze fest: DE 10, AT 8. Eine deutsche
    // Klasse 9 ist also Unterstufe. Ohne `land` fiele sie auf den
    // österreichischen Wert zurück und die Unterlage wäre eine Oberstufen-
    // Unterlage mit österreichischem Lehrplan.
    const de = unterlageAusTermin({ ...VOLL, schulstufe: 9, land: 'DE' }, basis());
    expect(de.ok).toBe(true);
    if (!de.ok) return;
    expect(de.auftrag.meta.stufe).toBe('unterstufe');
    expect(de.auftrag.meta.land).toBe('DE');

    const at = unterlageAusTermin({ ...VOLL, schulstufe: 9, land: 'AT' }, basis());
    expect(at.ok).toBe(true);
    if (!at.ok) return;
    // Dieselbe Schulstufe, anderes Land, anderes Ergebnis.
    expect(at.auftrag.meta.stufe).toBe('oberstufe');
    expect(at.auftrag.meta.land).toBe('AT');
  });

  it('trägt das Land in den Auftrag, nicht nur in die Meta', () => {
    // Der Auftrag steuert Generator und Renderer; fehlt das Land dort, kommt
    // die Unterlage trotz richtiger Meta mit dem falschen Lehrplan heraus.
    const bau = unterlageAusTermin({ ...VOLL, schulstufe: 9, land: 'DE' }, basis());
    expect(bau.ok).toBe(true);
    if (!bau.ok) return;
    expect(bau.auftrag.auftrag.land).toBe('DE');
  });

  it('behält ohne Schuljahresstufe die Stufe aus dem laufenden Zustand', () => {
    const bau = unterlageAusTermin(VOLL, basis());
    expect(bau.ok).toBe(true);
    if (!bau.ok) return;
    expect(bau.auftrag.meta.stufe).toBe('unterstufe');
  });

  it('übernimmt Notiz und Datum, aber keine erfundenen Werte', () => {
    const bau = unterlageAusTermin({ ...VOLL, notiz: '  Doppelte Seite ' }, basis());
    expect(bau.ok).toBe(true);
    if (!bau.ok) return;
    expect(bau.auftrag.meta.notizen).toBe('Doppelte Seite');
    expect(bau.auftrag.meta.datum).toBe('2026-09-21');
    // Ohne Notiz wird das Feld geleert, nicht mit Text gefüllt.
    const ohne = unterlageAusTermin(VOLL, basis());
    if (ohne.ok) expect(ohne.auftrag.meta.notizen).toBe('');
  });
});

describe('kontextAusStunde', () => {
  it('nimmt Klasse, Thema, Notiz und Datum aus der Stunde', () => {
    const stunde: GeplanteStunde = {
      id: 's1', klasseId: 'k1', klasseName: '6b', datum: '2026-09-21',
      startZeit: '08:00', endeZeit: '08:45', titel: 'Balladen', status: 'geplant',
      einsatzArt: 'nur_geplant', rasterId: 'r1', notiz: 'KV 12', anzahlMaterialien: 0,
    };
    expect(kontextAusStunde(stunde, { land: 'AT', schulstufe: 9, fach: 'deutsch' })).toEqual({
      klasse: '6b', thema: 'Balladen', notiz: 'KV 12', datum: '2026-09-21',
      land: 'AT', schulstufe: 9, fach: 'deutsch',
    });
  });

  it('verlangt das Land – ohne es gäbe es die falsche Schulstufe', () => {
    // Die Zusage ist eine Compile-Zeit-Zusage: `@ts-expect-error` schlägt fehl,
    // sobald `land` wieder optional wird. Zur Laufzeit gibt es nichts zu
    // prüfen – der Typ erlaubt den Aufruf ohne Land gar nicht erst.
    const stunde = {
      id: 's3', klasseId: 'k1', klasseName: '9b', datum: '2026-09-21',
      startZeit: '08:00', endeZeit: '08:45', titel: '', status: 'geplant',
      einsatzArt: '', rasterId: null, notiz: '', anzahlMaterialien: 0,
    } as GeplanteStunde;
    const ohneLand = { schulstufe: 9, fach: 'deutsch' } as const;
    // @ts-expect-error `land` ist Pflicht – der Aufrufer darf es nicht vergessen.
    kontextAusStunde(stunde, ohneLand);
    expect(kontextAusStunde(stunde, { land: 'DE', ...ohneLand }).land).toBe('DE');
  });

  it('meldet eine Stunde ohne Klasse als klasse-los', () => {
    const stunde = {
      id: 's2', klasseId: null, klasseName: '', datum: '2026-09-21',
      startZeit: null, endeZeit: null, titel: '', status: 'geplant',
      einsatzArt: '', rasterId: null, notiz: '', anzahlMaterialien: 0,
    } as GeplanteStunde;
    expect(kontextAusStunde(stunde, { land: 'AT' }).klasse).toBeUndefined();
  });
});

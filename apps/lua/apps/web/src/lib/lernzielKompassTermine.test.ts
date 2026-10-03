import { describe, expect, it } from 'vitest';
import { ausgangsstundenOptions, spaetereCheckStunden, vorgeschlageneCheckStunde, type LernzielTermin } from './lernzielKompassTermine';

const stunden: LernzielTermin[] = [
  { id: 'held', status: 'eingesetzt', einsatzArt: '', geplantAm: '2026-10-01', eingesetztAm: '2026-10-02', titelSnapshot: 'Ausgangsstunde' },
  { id: 'woche-1', status: 'geplant', einsatzArt: '', geplantAm: '2026-10-08', eingesetztAm: null, titelSnapshot: 'Noch zu früh' },
  { id: 'woche-2', status: 'geplant', einsatzArt: '', geplantAm: '2026-10-16', eingesetztAm: null, titelSnapshot: 'Passender Abrufcheck' },
  { id: 'zu-spaet', status: 'geplant', einsatzArt: '', geplantAm: '2026-10-20', eingesetztAm: null, titelSnapshot: 'Später' },
  { id: 'vergangen', status: 'geplant', einsatzArt: '', geplantAm: '2026-10-02', eingesetztAm: null, titelSnapshot: 'Vergangen, nicht gehalten' },
  { id: 'entfallen', status: 'geplant', einsatzArt: 'ausgefallen' as never, geplantAm: '2026-10-16', eingesetztAm: null, titelSnapshot: 'Entfallen' },
];

describe('Lernziel-Kompass-Termine', () => {
  it('bietet gehaltene Stunden und nur gültige zukünftige Stunden als Ausgang an', () => {
    expect(ausgangsstundenOptions(stunden, '2026-10-03').map((lesson) => lesson.id)).toEqual(['zu-spaet', 'woche-2', 'woche-1', 'held']);
  });

  it('schließt vergangene, entfallene und vor der Grundlage liegende Checks aus', () => {
    expect(spaetereCheckStunden(stunden, '2026-10-03', '2026-10-03').map((lesson) => lesson.id)).toEqual(['woche-1', 'woche-2', 'zu-spaet']);
  });

  it('schlägt nur eine Klassenstunde sieben bis vierzehn Tage nach der Grundlage vor', () => {
    expect(vorgeschlageneCheckStunde(stunden, '2026-10-03', '2026-10-03')?.id).toBe('woche-2');
    expect(vorgeschlageneCheckStunde(stunden, '2026-10-03', '2026-10-18')).toBeUndefined();
  });
});

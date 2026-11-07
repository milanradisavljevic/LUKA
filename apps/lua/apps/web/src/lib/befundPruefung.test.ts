import { describe, expect, it } from 'vitest';
import { befundPruefstatus, befundGruppe, vorbereiteteBefunde, uebernehmeVorbereiteteBefunde } from './befundPruefung';

describe('fachliche Beanstandung und Ersetzung', () => {
  it('behandelt alte Revisionen ohne neue Prüfangaben unverändert', () => {
    expect(befundPruefstatus()).toEqual({ beanstandungVerworfen: false, ersetzungOffen: false });
  });
  it('zeigt einen bestätigten Befund mit unsicherem Ersatz weiterhin als prüfbedürftig', () => {
    expect(befundPruefstatus({ ki_pruefung: { status: 'bestaetigt' }, ersetzungspruefung: { status: 'ungeklaert' } }))
      .toEqual({ beanstandungVerworfen: false, ersetzungOffen: true });
  });
  it('unterscheidet eine falsche Beanstandung von einer Lehrkraftentscheidung', () => {
    const finding = { ki_pruefung: { status: 'verworfen' } };
    expect(befundPruefstatus(finding).beanstandungVerworfen).toBe(true);
    expect(befundPruefstatus(finding, 'uebernommen').beanstandungVerworfen).toBe(false);
    expect(befundPruefstatus(finding, 'geaendert').beanstandungVerworfen).toBe(false);
  });
});

it('bereitet nur fachlich und im Satz geprüfte eindeutige Hinweise vor', () => {
  const ready = {befundart:'normfehler',anker_status:'eindeutig',ki_pruefung:{status:'bestaetigt'},ersetzungspruefung:{status:'bestaetigt'},nur_kommentar:false};
  expect(befundGruppe(ready)).toBe('vorbereitet');
  expect(befundGruppe({...ready,ersetzungspruefung:{status:'ungeklaert'}})).toBe('entscheidung');
  expect(befundGruppe({...ready,befundart:'stilalternative'})).toBe('anregung');
  expect(befundGruppe({...ready,ki_pruefung:{status:'verworfen'}})).toBe('verworfen');
  const rows = [{id:1,befund:{...ready,textanker:{start:0,end:10}}},{id:2,befund:{...ready,textanker:{start:5,end:15}}},{id:3,befund:{...ready,textanker:{start:20,end:22}}}];
  expect(vorbereiteteBefunde(rows).map(row => row.id)).toEqual([3]);
});

it('schützt Einzelentscheidungen und bereits gespeicherte Änderungen bei der Sammelübernahme', () => {
  const befund = {befundart:'normfehler',anker_status:'eindeutig',ki_pruefung:{status:'bestaetigt'},ersetzungspruefung:{status:'bestaetigt'}};
  const previous = {1:{aktion:'geaendert',korrektur:'Eigene Formulierung'},2:{aktion:null}};
  const rows = [{id:1,befund},{id:2,befund},{id:3,befund,lehrkraftAktion:'verworfen'},{id:4,befund},{id:5,befund:{...befund,befundart:'ungeklaert'}}];
  expect(uebernehmeVorbereiteteBefunde(rows,previous)).toEqual({...previous,4:{aktion:'uebernommen'}});
  expect(previous).toEqual({1:{aktion:'geaendert',korrektur:'Eigene Formulierung'},2:{aktion:null}});
});

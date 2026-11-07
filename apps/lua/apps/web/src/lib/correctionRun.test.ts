import { describe, expect, it } from 'vitest';
import { createCorrectionRunSnapshot, correctionRunContextKey, shouldShowCorrectionRunError, confirmedBasisHashInput, correctionTextHash } from './correctionRun';

describe('CorrectionRunSnapshot', () => {
  it('friert ausgewählten Anbieter, Modell, Datenschutz und Grundlage ein', () => {
    const snapshot = createCorrectionRunSnapshot({
      provider: 'deepseek',
      model: 'deepseek-flash',
      pseudonymization: true,
      startedAt: '2026-09-23T10:00:00.000Z',
      basis: {
        klasse: 'TEST-6A',
        aufgabe: 'Kommentar',
        rubrik: 'synthetic-rubric',
        ausgangstext: '',
        unterrichtseinsatzId: null,
        materialId: null,
      },
    });
    expect(snapshot.provider).toBe('deepseek');
    expect(snapshot.model).toBe('deepseek-flash');
    expect(snapshot.reanalyzeExisting).toBe(false);
    expect(snapshot.privacyMode).toBe('pseudonymisiert');
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.basis)).toBe(true);
  });

  it('zeigt Analysefehler ausschließlich in Schritt 5', () => {
    expect([1, 2, 3, 4].some(shouldShowCorrectionRunError)).toBe(false);
    expect(shouldShowCorrectionRunError(5)).toBe(true);
  });

  it('hält die erneute Korrektur für den ganzen Auftrag fest', () => {
    const snapshot = createCorrectionRunSnapshot({ provider: 'deepseek', model: 'deepseek-flash',
      reanalyzeExisting: true, pseudonymization: true,
      basis: { klasse: 'TEST', aufgabe: 'Rede', rubrik: '', ausgangstext: '', unterrichtseinsatzId: null, materialId: null } });
    expect(snapshot.reanalyzeExisting).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });
});

it('setzt eine Stapelfortsetzung bei anderem Denkmodus oder anderem Quelleninhalt zurück', () => {
  const run = createCorrectionRunSnapshot({provider:'openai',model:'gpt-6-luna',reasoning:'high',pseudonymization:true,basis:{klasse:'TEST',aufgabe:'Rede',rubrik:'test',ausgangstext:'Quelle',unterrichtseinsatzId:null,materialId:null}});
  expect(correctionRunContextKey('context',run)).not.toBe(correctionRunContextKey('context',{...run,reasoning:'default'}));
  expect(correctionRunContextKey('context',run)).not.toBe(correctionRunContextKey('context',{...run,basis:{...run.basis,ausgangstext:'Geänderte Quelle'}}));
  expect(correctionRunContextKey('context',run)).toBe(correctionRunContextKey('context',{...run,startedAt:'anderer Zeitpunkt'}));
});


it('bindet die Bestätigung an alle Bewertungsinhalte und friert sie ein', async()=>{
  const g = {version:1 as const,pruefumfang:'vollstaendig' as const,aufgabenstellung:'Rede',ausgangstext:'Quelle',rubrik_inhalt:'Raster',erwartungshorizont:'',umfangsvorgabe:'400–500',quellenstatus:'bestaetigt'};
  expect(confirmedBasisHashInput(g)).toBe(JSON.stringify(['Rede','Quelle','Raster','','400–500','bestaetigt']));
  const hash=await correctionTextHash(confirmedBasisHashInput(g));
  expect(await correctionTextHash(confirmedBasisHashInput({...g,erwartungshorizont:'Neu'}))).not.toBe(hash);
  const run=createCorrectionRunSnapshot({provider:'deepseek',model:'deepseek-flash',pseudonymization:true,basis:{klasse:'TEST',aufgabe:'Rede',rubrik:'Raster',ausgangstext:'Quelle',unterrichtseinsatzId:null,materialId:null,grundlage:g}});
  g.aufgabenstellung='Verändert';
  expect(run.basis.grundlage?.aufgabenstellung).toBe('Rede');
  expect(Object.isFrozen(run.basis.grundlage)).toBe(true);
});

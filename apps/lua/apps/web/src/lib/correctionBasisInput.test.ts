import {describe,it,expect} from 'vitest';
import {inferCorrectionBasis,correctionBasisBlocker} from './correctionBasisInput';

const source = 'Artikel über einen Schulgarten.\nDer Artikeltext bleibt unverändert.\nVerfasse eine Meinungsrede:\nAA 1: Gib zentrale Aussagen wieder.\nAA 2: Diskutiere die Vorschläge.\nAA 3: Appelliere an dein Publikum.\nCa. 500-600 Wörter';
describe('Eine Unterrichtsdatei genügt',()=>{
 it('übernimmt den Arbeitsauftrag samt AA und Umfang aus derselben Datei',()=>{
  const result=inferCorrectionBasis(source);
  expect(result.task).toBe(source.slice(source.indexOf('Verfasse')));
  expect(result.wordChoices).toEqual(['500–600']);
  expect(result.ambiguousTask).toBe(false);
 });
 it('trennt eine vorangestellte Aufgabe von der gekennzeichneten Beilage',()=>{
  expect(inferCorrectionBasis('Aufgabenstellung\nVerfasse eine Rede mit 500 bis 600 Wörtern.\nTextbeilage:\nEin Beispiel mit 200 Wörter.').wordChoices).toEqual(['500–600']);
 });
 it('wählt keine Aufgabenalternative still aus',()=>{
  const result=inferCorrectionBasis('Aufgabe 1: Rede\nVerfasse eine Rede. 400–500 Wörter\nAufgabe 2: Kommentar\nVerfasse einen Kommentar. 600–700 Wörter');
  expect(result.task).toBe('');expect(result.ambiguousTask).toBe(true);expect(result.wordChoices).toEqual(['400–500','600–700']);
 });
 it('erfindet keinen Arbeitsauftrag und keine Wortzahl aus einem bloßen Artikel',()=>{
  expect(inferCorrectionBasis('Ein kurzer Artikel ohne Aufgabenstellung.')).toEqual({task:'',wordChoices:[],ambiguousTask:false});
 });
 it('behält widersprüchliche Umfangsvorgaben als Auswahl',()=>{
  expect(inferCorrectionBasis('Verfasse eine Rede. 400–500 Wörter. Umfang: 600–700 Wörter').wordChoices).toHaveLength(2);
 });
 it('macht aus einer Mindestvorgabe keine exakte Zielzahl',()=>{
  expect(inferCorrectionBasis('Verfasse eine Rede mit mindestens 500 Wörtern.').wordChoices).toEqual([]);
 });
 it('lässt den vorhandenen Auftrag nach einer Bestätigung passieren',()=>{
  const result=inferCorrectionBasis(source);
  const input={scope:'vollstaendig',loading:false,loaded:true,task:result.task,amount:result.wordChoices[0]!,confirmed:false};
  expect(correctionBasisBlocker(input)).toContain('bestätigen');
  expect(correctionBasisBlocker({...input,confirmed:true})).toBeNull();
 });
 it('verhindert die späte Startfehlermeldung und erlaubt Sprachfeedback',()=>{
  const input={scope:'vollstaendig',loading:false,loaded:false,task:'',amount:'',confirmed:false};
  expect(correctionBasisBlocker(input)).toContain('Schritt 3');
  expect(correctionBasisBlocker({...input,scope:'sprache'})).toBeNull();
 });
 it('unterscheidet eine fehlende Wortzahl von ausdrücklich keiner Vorgabe',()=>{
  const input={scope:'vollstaendig',loading:false,loaded:true,task:'Rede',amount:'',confirmed:true};
  expect(correctionBasisBlocker(input)).toContain('Wortzahl');
  expect(correctionBasisBlocker({...input,amount:'keine Vorgabe'})).toBeNull();
 });
});

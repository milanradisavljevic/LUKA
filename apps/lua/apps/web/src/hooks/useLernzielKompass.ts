import { useCallback } from 'react';

export interface LernzielEvidenz {
  fehlerTyp: string;
  antwortAnzahl: number;
  fehlerAnzahl: number;
  zeitraumVon: string | null;
  zeitraumBis: string | null;
}

export interface LernzielFokus {
  id: string;
  klasseId: string;
  klasseNameSnapshot: string;
  lernziel: string;
  fehlerTyp: string;
  aufgabeSnapshot: string;
  ausgangseinsatzId: string | null;
  ausgangsstundenTitelSnapshot: string | null;
  ausgangsdatumSnapshot: string | null;
  zeitraumVon: string | null;
  zeitraumBis: string | null;
  antwortAnzahl: number;
  fehlerAnzahl: number;
  bestaetigtAm: string;
}

export interface AbrufCheck {
  id: string;
  fokusId: string;
  lernziel: string;
  klasseId: string;
  klasseNameSnapshot: string;
  einsatzId: string;
  stundenTitel: string;
  faelligAm: string;
  terminGueltig: boolean;
  antwortmodus: 'offen' | 'auswahl';
  frage: string;
  optionenJson: string;
  loesung: string | null;
  vergleichsgrundlageBestaetigt: boolean;
  teilnahmelisteSnapshot: boolean;
  rosterAnzahl: number;
  anwesendAnzahl: number;
  abwesendAnzahl: number;
  teilnahmeOffenAnzahl: number;
  antwortAnzahl: number;
  richtigAnzahl: number;
  teilweiseAnzahl: number;
  nochNichtAnzahl: number;
}

export interface AbrufCheckTeilnahme {
  schuelerId: number;
  vorname: string;
  nachname: string | null;
  status: 'offen' | 'anwesend' | 'abwesend';
  antwort: string | null;
  ergebnis: 'richtig' | 'teilweise' | 'noch_nicht' | null;
  aenderungAnzahl: number;
}

export interface AbrufCheckErgebnisAenderung {
  id: number;
  geaendertAm: string;
  antwortGeaendert: boolean;
  ergebnisVorher: 'richtig' | 'teilweise' | 'noch_nicht';
  ergebnisNachher: 'richtig' | 'teilweise' | 'noch_nicht';
  ausgewertetVonVorher: 'lokal' | 'lehrkraft';
  ausgewertetVonNachher: 'lokal' | 'lehrkraft';
}

export interface LernzielFokusNeu {
  klasseId: string;
  klasseNameSnapshot: string;
  lernziel: string;
  fehlerTyp: string;
  aufgabeSnapshot: string;
  ausgangseinsatzId: string;
}

export interface AbrufCheckNeu {
  fokusId: string;
  einsatzId: string;
  antwortmodus: 'offen' | 'auswahl';
  frage: string;
  optionen: string[];
  loesung: string | null;
  vergleichsgrundlageBestaetigt: boolean;
}

export interface AbrufCheckErgebnisNeu {
  abrufcheckId: string;
  schuelerId: number;
  antwort: string;
  ergebnis: 'richtig' | 'teilweise' | 'noch_nicht' | null;
}

export interface AbrufCheckTeilnahmeNeu {
  abrufcheckId: string;
  schuelerId: number;
  status: AbrufCheckTeilnahme['status'];
}

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(command, args);
}

export function useLernzielKompass() {
  const evidenz = useCallback((klasseId: string, aufgabe: string) =>
    invoke<LernzielEvidenz[]>('lernziel_evidenz_list', { klasseId, aufgabe }), []);
  const listFokus = useCallback((klasseId: string) =>
    invoke<LernzielFokus[]>('lernziel_fokus_list', { klasseId }), []);
  const bestaetigen = useCallback((meta: LernzielFokusNeu) =>
    invoke<LernzielFokus>('lernziel_fokus_bestaetigen', { meta }), []);
  const ausgangsstundeVerbinden = useCallback((fokusId: string, ausgangseinsatzId: string) =>
    invoke<LernzielFokus>('lernziel_fokus_ausgangsstunde_verbinden', { fokusId, ausgangseinsatzId }), []);
  const listChecks = useCallback((klasseId: string) =>
    invoke<AbrufCheck[]>('abrufcheck_list', { klasseId }), []);
  const listTeilnahme = useCallback((abrufcheckId: string) =>
    invoke<AbrufCheckTeilnahme[]>('abrufcheck_teilnahme_list', { abrufcheckId }), []);
  const listErgebnisAenderungen = useCallback((abrufcheckId: string, schuelerId: number) =>
    invoke<AbrufCheckErgebnisAenderung[]>('abrufcheck_ergebnis_aenderungen_list', { abrufcheckId, schuelerId }), []);
  const teilnahmeSpeichern = useCallback((meta: AbrufCheckTeilnahmeNeu) =>
    invoke<void>('abrufcheck_teilnahme_speichern', { meta }), []);
  const erstellen = useCallback((meta: AbrufCheckNeu) =>
    invoke<AbrufCheck>('abrufcheck_erstellen', { meta }), []);
  const ergebnisSpeichern = useCallback((meta: AbrufCheckErgebnisNeu) =>
    invoke<string>('abrufcheck_ergebnis_speichern', { meta }), []);
  return { evidenz, listFokus, bestaetigen, ausgangsstundeVerbinden, listChecks, listTeilnahme, listErgebnisAenderungen, teilnahmeSpeichern, erstellen, ergebnisSpeichern };
}

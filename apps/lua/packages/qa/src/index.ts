export { default as lueckentext } from './fixtures/lueckentext.json';
export { default as matching } from './fixtures/matching.json';
export { default as multipleChoice } from './fixtures/multipleChoice.json';
export { default as offeneVerstaendnisfrage } from './fixtures/offeneVerstaendnisfrage.json';
export { default as offeneSchreibaufgabe } from './fixtures/offeneSchreibaufgabe.json';
export { default as markieraufgabe } from './fixtures/markieraufgabe.json';

export { buildRaster } from './korrekturraster/builder';
export { berechneNotenschluessel } from './korrekturraster/notenschluessel';
export type { KorrekturrasterDokument, RasterBlock, RasterKriterium, Notenstufe } from './korrekturraster/types';

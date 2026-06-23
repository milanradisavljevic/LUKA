import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';

// Philosophie — Lehrplan-Deskriptoren + Stoff-Items (Rahmenwerk at-lehrplan).
// `bereich`/`kategorie` verwenden die Namen aus KOMPETENZBEREICHE['philosophie'] wortgleich.
// Deskriptoren sind kuratierte Entwürfe (siehe `quelle`).

const Q = (stufe: string) =>
  `Entwurf, angelehnt an BMBWF-Lehrplan AHS Philosophie ${stufe} — nicht offiziell zitiert`;

export const philosophieDeskriptoren: Deskriptor[] = [
  // Begriffs- & Theoriekompetenz — Unterstufe
  { id: 'at-ph-un-begr-1', rahmenwerk: 'at-lehrplan', fach: 'philosophie', stufe: 'unterstufe', bereich: 'Begriffs- & Theoriekompetenz', code: '', text: 'Die Schülerinnen können zentrale philosophische Begriffe (z. B. Wahrheit, Gerechtigkeit, Freiheit) erklären.', quelle: Q('Unterstufe') },
  { id: 'at-ph-un-begr-2', rahmenwerk: 'at-lehrplan', fach: 'philosophie', stufe: 'unterstufe', bereich: 'Begriffs- & Theoriekompetenz', code: '', text: 'Die Schülerinnen können Grundpositionen bekannter Philosopherinnen und Philosophen wiedergeben.', quelle: Q('Unterstufe') },
  // Begriffs- & Theoriekompetenz — Oberstufe
  { id: 'at-ph-ob-begr-1', rahmenwerk: 'at-lehrplan', fach: 'philosophie', stufe: 'oberstufe', bereich: 'Begriffs- & Theoriekompetenz', code: '', text: 'Die Schülerinnen können philosophische Theorien und Begriffe differenziert erklären und in ihren historischen Kontext einordnen.', quelle: Q('Oberstufe') },
  { id: 'at-ph-ob-begr-2', rahmenwerk: 'at-lehrplan', fach: 'philosophie', stufe: 'oberstufe', bereich: 'Begriffs- & Theoriekompetenz', code: '', text: 'Die Schülerinnen können Theorien aus Ethik, Erkenntnistheorie, Anthropologie und politischer Philosophie vergleichen.', quelle: Q('Oberstufe') },

  // Argumentations- & Reflexionskompetenz — Unterstufe
  { id: 'at-ph-un-arg-1', rahmenwerk: 'at-lehrplan', fach: 'philosophie', stufe: 'unterstufe', bereich: 'Argumentations- & Reflexionskompetenz', code: '', text: 'Die Schülerinnen können philosophische Argumente nachvollziehen und eigene Beispiele anführen.', quelle: Q('Unterstufe') },
  { id: 'at-ph-un-arg-2', rahmenwerk: 'at-lehrplan', fach: 'philosophie', stufe: 'unterstufe', bereich: 'Argumentations- & Reflexionskompetenz', code: '', text: 'Die Schülerinnen können eigene Standpunkte zu philosophischen Fragen begründen und gegen Einwände verteidigen.', quelle: Q('Unterstufe') },
  // Argumentations- & Reflexionskompetenz — Oberstufe
  { id: 'at-ph-ob-arg-1', rahmenwerk: 'at-lehrplan', fach: 'philosophie', stufe: 'oberstufe', bereich: 'Argumentations- & Reflexionskompetenz', code: '', text: 'Die Schülerinnen können philosophische Argumentationen präzise rekonstruieren, formalisieren und kritisch prüfen.', quelle: Q('Oberstufe') },
  { id: 'at-ph-ob-arg-2', rahmenwerk: 'at-lehrplan', fach: 'philosophie', stufe: 'oberstufe', bereich: 'Argumentations- & Reflexionskompetenz', code: '', text: 'Die Schülerinnen können systematisch reflektieren, Voraussetzungen offenlegen und paradoxe oder aporetische Strukturen ertragen.', quelle: Q('Oberstufe') },

  // Anwendung & Transfer — Unterstufe
  { id: 'at-ph-un-trans-1', rahmenwerk: 'at-lehrplan', fach: 'philosophie', stufe: 'unterstufe', bereich: 'Anwendung & Transfer', code: '', text: 'Die Schülerinnen können philosophische Fragestellungen auf alltägliche und gesellschaftliche Situationen beziehen.', quelle: Q('Unterstufe') },
  { id: 'at-ph-un-trans-2', rahmenwerk: 'at-lehrplan', fach: 'philosophie', stufe: 'unterstufe', bereich: 'Anwendung & Transfer', code: '', text: 'Die Schülerinnen können philosophische Konzepte zur Klärung eigener Werte und Entscheidungen nutzen.', quelle: Q('Unterstufe') },
  // Anwendung & Transfer — Oberstufe
  { id: 'at-ph-ob-trans-1', rahmenwerk: 'at-lehrplan', fach: 'philosophie', stufe: 'oberstufe', bereich: 'Anwendung & Transfer', code: '', text: 'Die Schülerinnen können philosophische Theorien auf aktuelle gesellschaftliche, wissenschaftliche und ethische Herausforderungen anwenden.', quelle: Q('Oberstufe') },
  { id: 'at-ph-ob-trans-2', rahmenwerk: 'at-lehrplan', fach: 'philosophie', stufe: 'oberstufe', bereich: 'Anwendung & Transfer', code: '', text: 'Die Schülerinnen können philosophische Beratung und Klärungshilfe für konkrete Lebens- und Gesellschaftsfragen leisten.', quelle: Q('Oberstufe') },
];

export const philosophieStoffItems: StoffItem[] = [
  // Begriffs- & Theoriekompetenz
  { id: 'ph-grundbegriffe-un', rahmenwerk: 'at-lehrplan', titel: 'Zentrale philosophische Begriffe und Positionen', fach: 'philosophie', stufe: 'unterstufe', kategorie: 'Begriffs- & Theoriekompetenz', deskriptorIds: ['at-ph-un-begr-1', 'at-ph-un-begr-2'], defaultAufgabentypen: ['multipleChoice', 'offeneVerstaendnisfrage'] },
  { id: 'ph-theorien-ob', rahmenwerk: 'at-lehrplan', titel: 'Theorien historisch einordnen und vergleichen', fach: 'philosophie', stufe: 'oberstufe', kategorie: 'Begriffs- & Theoriekompetenz', deskriptorIds: ['at-ph-ob-begr-1', 'at-ph-ob-begr-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
  // Argumentations- & Reflexionskompetenz
  { id: 'ph-argumentieren-un', rahmenwerk: 'at-lehrplan', titel: 'Philosophisch argumentieren und eigene Standpunkte vertreten', fach: 'philosophie', stufe: 'unterstufe', kategorie: 'Argumentations- & Reflexionskompetenz', deskriptorIds: ['at-ph-un-arg-1', 'at-ph-un-arg-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'roleplay'] },
  { id: 'ph-reflexion-ob', rahmenwerk: 'at-lehrplan', titel: 'Argumentation rekonstruieren und kritisch prüfen', fach: 'philosophie', stufe: 'oberstufe', kategorie: 'Argumentations- & Reflexionskompetenz', deskriptorIds: ['at-ph-ob-arg-1', 'at-ph-ob-arg-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
  // Anwendung & Transfer
  { id: 'ph-alltag-un', rahmenwerk: 'at-lehrplan', titel: 'Philosophie im Alltag und in der Gesellschaft', fach: 'philosophie', stufe: 'unterstufe', kategorie: 'Anwendung & Transfer', deskriptorIds: ['at-ph-un-trans-1', 'at-ph-un-trans-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'multipleChoice'] },
  { id: 'ph-aktuelles-ob', rahmenwerk: 'at-lehrplan', titel: 'Philosophische Theorien auf aktuelle Herausforderungen anwenden', fach: 'philosophie', stufe: 'oberstufe', kategorie: 'Anwendung & Transfer', deskriptorIds: ['at-ph-ob-trans-1', 'at-ph-ob-trans-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
];

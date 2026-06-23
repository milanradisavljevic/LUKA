import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';

// Religion — Lehrplan-Deskriptoren + Stoff-Items (Rahmenwerk at-lehrplan).
// `bereich`/`kategorie` verwenden die Namen aus KOMPETENZBEREICHE['religion'] wortgleich.
// Deskriptoren sind kuratierte Entwürfe (siehe `quelle`).

const Q = (stufe: string) =>
  `Entwurf, angelehnt an BMBWF-Lehrplan AHS Religion ${stufe} — nicht offiziell zitiert`;

export const religionDeskriptoren: Deskriptor[] = [
  // Wahrnehmen & Verstehen — Unterstufe
  { id: 'at-re-un-wahr-1', rahmenwerk: 'at-lehrplan', fach: 'religion', stufe: 'unterstufe', bereich: 'Wahrnehmen & Verstehen', code: '', text: 'Die Schülerinnen können religiöse Phänomene, Symbole und Texte wahrnehmen und beschreiben.', quelle: Q('Unterstufe') },
  { id: 'at-re-un-wahr-2', rahmenwerk: 'at-lehrplan', fach: 'religion', stufe: 'unterstufe', bereich: 'Wahrnehmen & Verstehen', code: '', text: 'Die Schülerinnen können Grundinhalte biblischer und anderer religiöser Texte wiedergeben.', quelle: Q('Unterstufe') },
  // Wahrnehmen & Verstehen — Oberstufe
  { id: 'at-re-ob-wahr-1', rahmenwerk: 'at-lehrplan', fach: 'religion', stufe: 'oberstufe', bereich: 'Wahrnehmen & Verstehen', code: '', text: 'Die Schülerinnen können religiöse Traditionen, Rituale und Lehren in ihrem kulturellen Kontext verstehen.', quelle: Q('Oberstufe') },
  { id: 'at-re-ob-wahr-2', rahmenwerk: 'at-lehrplan', fach: 'religion', stufe: 'oberstufe', bereich: 'Wahrnehmen & Verstehen', code: '', text: 'Die Schülerinnen können unterschiedliche religiöse Wahrnehmungsweisen und Deutungsangebote vergleichen.', quelle: Q('Oberstufe') },

  // Deuten & Urteilen — Unterstufe
  { id: 'at-re-un-deut-1', rahmenwerk: 'at-lehrplan', fach: 'religion', stufe: 'unterstufe', bereich: 'Deuten & Urteilen', code: '', text: 'Die Schülerinnen können religiöse Texte und Erzählungen auf ihre Bedeutung für das eigene Leben befragen.', quelle: Q('Unterstufe') },
  { id: 'at-re-un-deut-2', rahmenwerk: 'at-lehrplan', fach: 'religion', stufe: 'unterstufe', bereich: 'Deuten & Urteilen', code: '', text: 'Die Schülerinnen können einfache ethische Fragestellungen aus religiöser Perspektive betrachten.', quelle: Q('Unterstufe') },
  // Deuten & Urteilen — Oberstufe
  { id: 'at-re-ob-deut-1', rahmenwerk: 'at-lehrplan', fach: 'religion', stufe: 'oberstufe', bereich: 'Deuten & Urteilen', code: '', text: 'Die Schülerinnen können religiöse und ethische Positionen analysieren und begründet bewerten.', quelle: Q('Oberstufe') },
  { id: 'at-re-ob-deut-2', rahmenwerk: 'at-lehrplan', fach: 'religion', stufe: 'oberstufe', bereich: 'Deuten & Urteilen', code: '', text: 'Die Schülerinnen können Spannungsfelder zwischen religiösen Überzeugungen und gesellschaftlichen Entwicklungen erkennen.', quelle: Q('Oberstufe') },

  // Reflektieren & Kommunizieren — Unterstufe
  { id: 'at-re-un-refl-1', rahmenwerk: 'at-lehrplan', fach: 'religion', stufe: 'unterstufe', bereich: 'Reflektieren & Kommunizieren', code: '', text: 'Die Schülerinnen können eigene Fragen, Erfahrungen und Vorstellungen zum Thema Religion äußern.', quelle: Q('Unterstufe') },
  { id: 'at-re-un-refl-2', rahmenwerk: 'at-lehrplan', fach: 'religion', stufe: 'unterstufe', bereich: 'Reflektieren & Kommunizieren', code: '', text: 'Die Schülerinnen können im Klassengespräch unterschiedliche Meinungen zu religiösen Themen respektvoll einbringen.', quelle: Q('Unterstufe') },
  // Reflektieren & Kommunizieren — Oberstufe
  { id: 'at-re-ob-refl-1', rahmenwerk: 'at-lehrplan', fach: 'religion', stufe: 'oberstufe', bereich: 'Reflektieren & Kommunizieren', code: '', text: 'Die Schülerinnen können ihre eigene religiöse und weltanschauliche Position reflektieren und argumentativ vertreten.', quelle: Q('Oberstufe') },
  { id: 'at-re-ob-refl-2', rahmenwerk: 'at-lehrplan', fach: 'religion', stufe: 'oberstufe', bereich: 'Reflektieren & Kommunizieren', code: '', text: 'Die Schülerinnen können kontroverse religiöse und ethische Fragen diskursiv und respektvoll bearbeiten.', quelle: Q('Oberstufe') },

  // Gestalten & Handeln — Unterstufe
  { id: 'at-re-un-gest-1', rahmenwerk: 'at-lehrplan', fach: 'religion', stufe: 'unterstufe', bereich: 'Gestalten & Handeln', code: '', text: 'Die Schülerinnen können religiöse Feste, Rituale und Gebete kennen und mitgestalten.', quelle: Q('Unterstufe') },
  { id: 'at-re-un-gest-2', rahmenwerk: 'at-lehrplan', fach: 'religion', stufe: 'unterstufe', bereich: 'Gestalten & Handeln', code: '', text: 'Die Schülerinnen können christliche Werte wie Nächstenliebe und Solidarität im Alltag erleben.', quelle: Q('Unterstufe') },
  // Gestalten & Handeln — Oberstufe
  { id: 'at-re-ob-gest-1', rahmenwerk: 'at-lehrplan', fach: 'religion', stufe: 'oberstufe', bereich: 'Gestalten & Handeln', code: '', text: 'Die Schülerinnen können religiöse Impulse für eigenes verantwortliches Handeln und gesellschaftliches Engagement gewinnen.', quelle: Q('Oberstufe') },
  { id: 'at-re-ob-gest-2', rahmenwerk: 'at-lehrplan', fach: 'religion', stufe: 'oberstufe', bereich: 'Gestalten & Handeln', code: '', text: 'Die Schülerinnen können Projekte zur Förderung von Toleranz, Dialog und Gerechtigkeit planen und umsetzen.', quelle: Q('Oberstufe') },
];

export const religionStoffItems: StoffItem[] = [
  // Wahrnehmen & Verstehen
  { id: 're-symbole-un', rahmenwerk: 'at-lehrplan', titel: 'Religiöse Symbole und Texte', fach: 'religion', stufe: 'unterstufe', kategorie: 'Wahrnehmen & Verstehen', deskriptorIds: ['at-re-un-wahr-1', 'at-re-un-wahr-2'], defaultAufgabentypen: ['multipleChoice', 'offeneVerstaendnisfrage'] },
  { id: 're-traditionen-ob', rahmenwerk: 'at-lehrplan', titel: 'Religiöse Traditionen und Kultur', fach: 'religion', stufe: 'oberstufe', kategorie: 'Wahrnehmen & Verstehen', deskriptorIds: ['at-re-ob-wahr-1', 'at-re-ob-wahr-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'offeneSchreibaufgabe'] },
  // Deuten & Urteilen
  { id: 're-bedeutung-un', rahmenwerk: 'at-lehrplan', titel: 'Biblische Texte deuten', fach: 'religion', stufe: 'unterstufe', kategorie: 'Deuten & Urteilen', deskriptorIds: ['at-re-un-deut-1', 'at-re-un-deut-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'multipleChoice'] },
  { id: 're-ethik-ob', rahmenwerk: 'at-lehrplan', titel: 'Religiöse und ethische Positionen', fach: 'religion', stufe: 'oberstufe', kategorie: 'Deuten & Urteilen', deskriptorIds: ['at-re-ob-deut-1', 'at-re-ob-deut-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
  // Reflektieren & Kommunizieren
  { id: 're-eigene-fragen-un', rahmenwerk: 'at-lehrplan', titel: 'Eigene Fragen zur Religion', fach: 'religion', stufe: 'unterstufe', kategorie: 'Reflektieren & Kommunizieren', deskriptorIds: ['at-re-un-refl-1', 'at-re-un-refl-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'roleplay'] },
  { id: 're-diskurs-ob', rahmenwerk: 'at-lehrplan', titel: 'Kontroverse Fragen diskursiv bearbeiten', fach: 'religion', stufe: 'oberstufe', kategorie: 'Reflektieren & Kommunizieren', deskriptorIds: ['at-re-ob-refl-1', 'at-re-ob-refl-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'roleplay'] },
  // Gestalten & Handeln
  { id: 're-rituale-un', rahmenwerk: 'at-lehrplan', titel: 'Feste, Rituale, Gebete', fach: 'religion', stufe: 'unterstufe', kategorie: 'Gestalten & Handeln', deskriptorIds: ['at-re-un-gest-1', 'at-re-un-gest-2'], defaultAufgabentypen: ['multipleChoice', 'offeneSchreibaufgabe'] },
  { id: 're-engagement-ob', rahmenwerk: 'at-lehrplan', titel: 'Religiös inspiriertes gesellschaftliches Engagement', fach: 'religion', stufe: 'oberstufe', kategorie: 'Gestalten & Handeln', deskriptorIds: ['at-re-ob-gest-1', 'at-re-ob-gest-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
];

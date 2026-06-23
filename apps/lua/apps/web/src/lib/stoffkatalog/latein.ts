import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';

// Latein — Lehrplan-Deskriptoren + Stoff-Items (Rahmenwerk at-lehrplan).
// `bereich`/`kategorie` verwenden die Namen aus KOMPETENZBEREICHE['latein'] wortgleich.
// Deskriptoren sind kuratierte Entwürfe (siehe `quelle`).

const Q = (stufe: string) =>
  `Entwurf, angelehnt an BMBWF-Lehrplan AHS Latein ${stufe} — nicht offiziell zitiert`;

export const lateinDeskriptoren: Deskriptor[] = [
  // Sprachkompetenz — Unterstufe
  { id: 'at-la-un-sprach-1', rahmenwerk: 'at-lehrplan', fach: 'latein', stufe: 'unterstufe', bereich: 'Sprachkompetenz', code: '', text: 'Die Schülerinnen können die lateinischen Deklinationen (a-, o-, konsonantische, i-Deklination) sicher unterscheiden und anwenden.', quelle: Q('Unterstufe') },
  { id: 'at-la-un-sprach-2', rahmenwerk: 'at-lehrplan', fach: 'latein', stufe: 'unterstufe', bereich: 'Sprachkompetenz', code: '', text: 'Die Schülerinnen können die wichtigsten lateinischen Konjugationen in den Grundtempora bilden und erkennen.', quelle: Q('Unterstufe') },
  { id: 'at-la-un-sprach-3', rahmenwerk: 'at-lehrplan', fach: 'latein', stufe: 'unterstufe', bereich: 'Sprachkompetenz', code: '', text: 'Die Schülerinnen können einfache Satzstrukturen (Subjekt, Prädikat, Akkusativ-/Ablativobjekt) im Lateinischen erkennen.', quelle: Q('Unterstufe') },
  // Sprachkompetenz — Oberstufe
  { id: 'at-la-ob-sprach-1', rahmenwerk: 'at-lehrplan', fach: 'latein', stufe: 'oberstufe', bereich: 'Sprachkompetenz', code: '', text: 'Die Schülerinnen können komplexe lateinische Satzgefüge (Nebensätze, ACI, Gerundium, Supinum) analysieren und übersetzen.', quelle: Q('Oberstufe') },
  { id: 'at-la-ob-sprach-2', rahmenwerk: 'at-lehrplan', fach: 'latein', stufe: 'oberstufe', bereich: 'Sprachkompetenz', code: '', text: 'Die Schülerinnen können Tempus und Modus (Indikativ, Konjunktiv, Imperativ) in ihren Funktionen unterscheiden.', quelle: Q('Oberstufe') },
  { id: 'at-la-ob-sprach-3', rahmenwerk: 'at-lehrplan', fach: 'latein', stufe: 'oberstufe', bereich: 'Sprachkompetenz', code: '', text: 'Die Schülerinnen können die Wortstellung und Satzgliedstellung im Lateinischen erklären und anwenden.', quelle: Q('Oberstufe') },

  // Textkompetenz — Unterstufe
  { id: 'at-la-un-text-1', rahmenwerk: 'at-lehrplan', fach: 'latein', stufe: 'unterstufe', bereich: 'Textkompetenz', code: '', text: 'Die Schülerinnen können einfache lateinische Texte Wort für Wort erschließen und inhaltlich erfassen.', quelle: Q('Unterstufe') },
  { id: 'at-la-un-text-2', rahmenwerk: 'at-lehrplan', fach: 'latein', stufe: 'unterstufe', bereich: 'Textkompetenz', code: '', text: 'Die Schülerinnen können wichtige Informationen aus einem lateinischen Text entnehmen und wiedergeben.', quelle: Q('Unterstufe') },
  // Textkompetenz — Oberstufe
  { id: 'at-la-ob-text-1', rahmenwerk: 'at-lehrplan', fach: 'latein', stufe: 'oberstufe', bereich: 'Textkompetenz', code: '', text: 'Die Schülerinnen können literarische und sachliche lateinische Texte übersetzen und inhaltlich erschließen.', quelle: Q('Oberstufe') },
  { id: 'at-la-ob-text-2', rahmenwerk: 'at-lehrplan', fach: 'latein', stufe: 'oberstufe', bereich: 'Textkompetenz', code: '', text: 'Die Schülerinnen können Textsorte, Intention und Stilmittel lateinischer Texte erkennen und erklären.', quelle: Q('Oberstufe') },
  { id: 'at-la-ob-text-3', rahmenwerk: 'at-lehrplan', fach: 'latein', stufe: 'oberstufe', bereich: 'Textkompetenz', code: '', text: 'Die Schülerinnen können lateinische Texte in angemessenes Deutsch übertragen und dabei Sprachebenen beachten.', quelle: Q('Oberstufe') },

  // Kulturkompetenz — Unterstufe
  { id: 'at-la-un-kult-1', rahmenwerk: 'at-lehrplan', fach: 'latein', stufe: 'unterstufe', bereich: 'Kulturkompetenz', code: '', text: 'Die Schülerinnen können grundlegende Aspekte des römischen Alltags, Staatswesens und Glaubens benennen.', quelle: Q('Unterstufe') },
  { id: 'at-la-un-kult-2', rahmenwerk: 'at-lehrplan', fach: 'latein', stufe: 'unterstufe', bereich: 'Kulturkompetenz', code: '', text: 'Die Schülerinnen können lateinische Begriffe und Lehnwörter in modernen Sprachen erkennen.', quelle: Q('Unterstufe') },
  // Kulturkompetenz — Oberstufe
  { id: 'at-la-ob-kult-1', rahmenwerk: 'at-lehrplan', fach: 'latein', stufe: 'oberstufe', bereich: 'Kulturkompetenz', code: '', text: 'Die Schülerinnen können antike Texte in ihren historischen, kulturellen und gesellschaftlichen Kontext einordnen.', quelle: Q('Oberstufe') },
  { id: 'at-la-ob-kult-2', rahmenwerk: 'at-lehrplan', fach: 'latein', stufe: 'oberstufe', bereich: 'Kulturkompetenz', code: '', text: 'Die Schülerinnen können Rezeption und Wirkung der römischen Antike in der europäischen Kultur nachweisen.', quelle: Q('Oberstufe') },
  { id: 'at-la-ob-kult-3', rahmenwerk: 'at-lehrplan', fach: 'latein', stufe: 'oberstufe', bereich: 'Kulturkompetenz', code: '', text: 'Die Schülerinnen können Zusammenhänge zwischen antiker und moderner Rechtssprache, Terminologie und Lebenswelt herstellen.', quelle: Q('Oberstufe') },
];

export const lateinStoffItems: StoffItem[] = [
  // Sprachkompetenz
  { id: 'la-deklinationen-un', rahmenwerk: 'at-lehrplan', titel: 'Deklinationen', fach: 'latein', stufe: 'unterstufe', kategorie: 'Sprachkompetenz', deskriptorIds: ['at-la-un-sprach-1', 'at-la-un-sprach-2'], defaultAufgabentypen: ['lueckentext', 'multipleChoice', 'kategorisierung'] },
  { id: 'la-konjugationen-un', rahmenwerk: 'at-lehrplan', titel: 'Konjugationen', fach: 'latein', stufe: 'unterstufe', kategorie: 'Sprachkompetenz', deskriptorIds: ['at-la-un-sprach-2', 'at-la-un-sprach-3'], defaultAufgabentypen: ['lueckentext', 'multipleChoice'] },
  { id: 'la-satzgefuege-ob', rahmenwerk: 'at-lehrplan', titel: 'Satzgefüge, ACI, Gerundium, Supinum', fach: 'latein', stufe: 'oberstufe', kategorie: 'Sprachkompetenz', deskriptorIds: ['at-la-ob-sprach-1', 'at-la-ob-sprach-2', 'at-la-ob-sprach-3'], defaultAufgabentypen: ['lueckentext', 'multipleChoice', 'kategorisierung'] },
  { id: 'la-modus-tempus-ob', rahmenwerk: 'at-lehrplan', titel: 'Modus- und Tempuslehre', fach: 'latein', stufe: 'oberstufe', kategorie: 'Sprachkompetenz', deskriptorIds: ['at-la-ob-sprach-2', 'at-la-ob-sprach-3'], defaultAufgabentypen: ['multipleChoice', 'lueckentext'] },
  // Textkompetenz
  { id: 'la-textlektuere-un', rahmenwerk: 'at-lehrplan', titel: 'Einfache Textlektüre', fach: 'latein', stufe: 'unterstufe', kategorie: 'Textkompetenz', deskriptorIds: ['at-la-un-text-1', 'at-la-un-text-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'multipleChoice'] },
  { id: 'la-literarische-texte-ob', rahmenwerk: 'at-lehrplan', titel: 'Literarische und sachliche Texte', fach: 'latein', stufe: 'oberstufe', kategorie: 'Textkompetenz', deskriptorIds: ['at-la-ob-text-1', 'at-la-ob-text-2', 'at-la-ob-text-3'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'offeneSchreibaufgabe'] },
  { id: 'la-stilmittel-ob', rahmenwerk: 'at-lehrplan', titel: 'Stilmittel und Übersetzung', fach: 'latein', stufe: 'oberstufe', kategorie: 'Textkompetenz', deskriptorIds: ['at-la-ob-text-2', 'at-la-ob-text-3'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'multipleChoice'] },
  // Kulturkompetenz
  { id: 'la-roemischer-alltag-un', rahmenwerk: 'at-lehrplan', titel: 'Römischer Alltag, Staat, Religion', fach: 'latein', stufe: 'unterstufe', kategorie: 'Kulturkompetenz', deskriptorIds: ['at-la-un-kult-1', 'at-la-un-kult-2'], defaultAufgabentypen: ['multipleChoice', 'kategorisierung'] },
  { id: 'la-antike-rezeption-ob', rahmenwerk: 'at-lehrplan', titel: 'Antike Rezeption und europäische Kultur', fach: 'latein', stufe: 'oberstufe', kategorie: 'Kulturkompetenz', deskriptorIds: ['at-la-ob-kult-1', 'at-la-ob-kult-2', 'at-la-ob-kult-3'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage', 'multipleChoice'] },
];

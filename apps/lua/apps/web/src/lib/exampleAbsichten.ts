import type { Auftrag } from '@lehrunterlagen/schema';
import type { LucideIcon } from 'lucide-react';
import { GraduationCap, Languages, FileText, BookOpen, Clock } from 'lucide-react';

export interface ExampleAbsicht {
  id: string;
  label: string;
  beschreibung: string;
  Icon: LucideIcon;
  auftrag: Omit<Auftrag, 'quelltexte'>;
}

export const EXAMPLE_ABSICHTEN: ExampleAbsicht[] = [
  {
    id: 'matura-deutsch',
    label: 'Matura Deutsch',
    beschreibung: 'Oberstufe · Schularbeit · Faust / Medienkritik',
    Icon: GraduationCap,
    auftrag: {
      typ: 'schularbeit',
      fach: 'deutsch',
      stufe: 'oberstufe',
      thema: 'Medienkonsum und seine Folgen für Jugendliche',
      datum: new Date().toISOString().slice(0, 10),
      dauerMinuten: 50,
      schwierigkeit: 'mittel',
      lernziele: ['Textverständnis', 'Argumentationsanalyse', 'Stilmittel erkennen', 'Textproduktion'],
      notizen: 'Matura-Niveau, AHS-Standard. Quelltext: Zeitungsartikel zum Thema Social Media und Konzentration.',
    },
  },
  {
    id: 'test-englisch',
    label: 'Test Englisch',
    beschreibung: 'Oberstufe · Test · American Dream',
    Icon: Languages,
    auftrag: {
      typ: 'test',
      fach: 'englisch',
      stufe: 'oberstufe',
      thema: 'The American Dream — Reality or Illusion?',
      datum: new Date().toISOString().slice(0, 10),
      dauerMinuten: 25,
      schwierigkeit: 'mittel',
      lernziele: ['Reading comprehension', 'Text analysis', 'Vocabulary in context'],
      notizen: 'Quelltext: Extract from a speech or article about social mobility in the US.',
    },
  },
  {
    id: 'hausuebung-stilmittel',
    label: 'Hausübung Stilmittel',
    beschreibung: 'Unterstufe · Hausübung · Lyrik',
    Icon: FileText,
    auftrag: {
      typ: 'hausuebung',
      fach: 'deutsch',
      stufe: 'unterstufe',
      thema: 'Stilmittel in der Lyrik — Erkennen und Benennen',
      datum: new Date().toISOString().slice(0, 10),
      dauerMinuten: 15,
      schwierigkeit: 'leicht',
      lernziele: ['Stilmittel erkennen', 'Bedeutung erklären', 'Wirkung beschreiben'],
      notizen: 'Kurze Gedichte, max. 12 Zeilen. Fokus auf Metapher, Vergleich, Personifikation.',
    },
  },
  {
    id: 'klassenarbeit-lesen',
    label: 'Klassenarbeit Lesen',
    beschreibung: 'Unterstufe · Klassenarbeit · Sachtext',
    Icon: BookOpen,
    auftrag: {
      typ: 'schularbeit',
      fach: 'deutsch',
      stufe: 'unterstufe',
      thema: 'Lesekompetenz — Sach- und Gebrauchstexte verstehen',
      datum: new Date().toISOString().slice(0, 10),
      dauerMinuten: 35,
      schwierigkeit: 'leicht',
      lernziele: ['Hauptgedanke erfassen', 'Detailinformationen finden', 'Textstruktur erkennen'],
      notizen: 'Sachtext zum Thema Umwelt oder Gesundheit. Lückentext und Verständnisfragen.',
    },
  },
  {
    id: 'test-englisch-unterstufe',
    label: 'Test Englisch Unterstufe',
    beschreibung: 'Unterstufe · Test · Daily Routines',
    Icon: Clock,
    auftrag: {
      typ: 'test',
      fach: 'englisch',
      stufe: 'unterstufe',
      thema: 'Daily Routines and Healthy Habits',
      datum: new Date().toISOString().slice(0, 10),
      dauerMinuten: 20,
      schwierigkeit: 'leicht',
      lernziele: ['Present Simple', 'Time expressions', 'Reading comprehension'],
      notizen: 'Short text about a teenager\'s daily routine. Focus on present simple and vocabulary.',
    },
  },
];

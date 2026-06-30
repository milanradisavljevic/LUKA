/**
 * Einzelne Quelle der Navigationsziele (Views) — genutzt vom Such-Index-Builder
 * in App.tsx. Labels stimmen mit VIEW_TITLES/Sidebar überein. NATASCHA-Views
 * werden ausgeblendet, solange das Feature-Flag OFF ist (wie Sidebar).
 */
import type { ActiveView } from './types';
import { FEATURES } from './features';

export interface NavTarget {
  view: ActiveView;
  label: string;
  description: string;
}

/** Views, die erst mit NATASCHA-Integration sichtbar werden. */
const NATASCHA_VIEWS: ActiveView[] = ['klassen', 'korrektur', 'schueler', 'erwartungshorizont'];

export const NAV_TARGETS: NavTarget[] = [
  { view: 'dashboard', label: 'Übersicht', description: 'Klassen, Korrekturstand und Weiterarbeiten' },
  { view: 'wizard', label: 'Assistent', description: 'Zum Aktuellen Dokument zurück' },
  { view: 'kompetenz', label: 'Kompetenz-Übung', description: 'Übung ohne Quelltext aus Lehrplan-Kompetenzen' },
  { view: 'quick', label: 'Schnell-Übung', description: 'Thema + Aufgabentyp → sofort Baukasten' },
  { view: 'documents', label: 'Meine Unterlagen', description: 'Gespeicherte Dokumente durchsuchen' },
  { view: 'pool', label: 'Aufgaben-Pool', description: 'Wiederverwendbare Aufgaben-Blöcke' },
  { view: 'templates', label: 'Vorlagen', description: 'Gespeicherte Aufgaben-Vorlagen laden' },
  { view: 'klassen', label: 'Meine Klassen', description: 'Klassenübersicht mit Notenverteilung' },
  { view: 'korrektur', label: 'Korrektur (NATASCHA)', description: 'Korrektur-Exporte einsehen' },
  { view: 'schueler', label: 'Schüler', description: 'Einzelne Schüler/innen und deren Ergebnisse' },
  { view: 'erwartungshorizont', label: 'Erwartungshorizont', description: 'Lösungserwartungen und Bewertungsraster' },
  { view: 'history', label: 'Verlauf', description: 'Bisherige Generierungen und Exporte' },
  { view: 'favorites', label: 'Favoriten', description: 'Markierte Dokumente' },
  { view: 'trash', label: 'Papierkorb', description: 'Gelöschte Dokumente wiederherstellen' },
  { view: 'settings', label: 'Einstellungen', description: 'API-Keys, Provider und App-Einstellungen' },
  { view: 'help', label: 'Hilfe', description: 'Handbuch und Kurzanleitung' },
];

/** Navigationsziele, passend zum Feature-Stand (NATASCHA ggf. ausgeblendet). */
export function visibleNavTargets(): NavTarget[] {
  return NAV_TARGETS.filter((t) => FEATURES.natascha || !NATASCHA_VIEWS.includes(t.view));
}

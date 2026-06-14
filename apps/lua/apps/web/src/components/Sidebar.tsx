import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Plus, FolderOpen, Files, Clock, Star, Trash2, Settings, HelpCircle,
  ChevronLeft, ChevronRight, SpellCheck, GraduationCap, Users, ClipboardCheck, LayoutDashboard,
  Target,
} from 'lucide-react';
import type { ActiveView } from '../lib/types';
import { NibMark, BrandSignature } from './BrandLogo';

interface Props {
  currentView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  /** „Neue erstellen": frisches Dokument (mit Rückfrage bei ungespeicherter Arbeit). */
  onNewDocument: () => void;
}

interface NavItem {
  id: string;
  label: string;
  Icon: LucideIcon;
  /** view = navigiert zu einer Ansicht; 'new' = neues Dokument starten. */
  view?: ActiveView;
  action?: 'new';
  tooltip?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Übersicht', Icon: LayoutDashboard, view: 'dashboard', tooltip: 'Klassen, Korrekturstand und Weiterarbeiten' },
  { id: 'new', label: 'Neue erstellen', Icon: Plus, action: 'new', tooltip: 'Neues Arbeitsblatt erstellen' },
  { id: 'kompetenz', label: 'Kompetenz-Übung', Icon: Target, view: 'kompetenz', tooltip: 'Übung ohne Quelltext aus Lehrplan-Kompetenzen' },
  { id: 'documents', label: 'Meine Unterlagen', Icon: FolderOpen, view: 'documents', tooltip: 'Gespeicherte Dokumente durchsuchen' },
  { id: 'klassen', label: 'Meine Klassen', Icon: GraduationCap, view: 'klassen', tooltip: 'Klassenübersicht mit Notenverteilung' },
  { id: 'korrektur', label: 'Korrektur (NATASCHA)', Icon: SpellCheck, view: 'korrektur', tooltip: 'Korrektur-Exporte aus NATASCHA einsehen' },
  { id: 'schueler', label: 'Schüler', Icon: Users, view: 'schueler', tooltip: 'Einzelne Schüler/innen und deren Ergebnisse' },
  { id: 'erwartungshorizont', label: 'Erwartungshorizont', Icon: ClipboardCheck, view: 'erwartungshorizont', tooltip: 'Lösungserwartungen und Bewertungsraster' },
  { id: 'templates', label: 'Vorlagen', Icon: Files, view: 'templates', tooltip: 'Gespeicherte Aufgaben-Vorlagen laden' },
  { id: 'history', label: 'Verlauf', Icon: Clock, view: 'history', tooltip: 'Bisherige Generierungen und Exporte' },
  { id: 'favorites', label: 'Favoriten', Icon: Star, view: 'favorites', tooltip: 'Markierte Dokumente' },
  { id: 'trash', label: 'Papierkorb', Icon: Trash2, view: 'trash', tooltip: 'Gelöschte Dokumente wiederherstellen' },
];

const SETTINGS_ITEMS: NavItem[] = [
  { id: 'settings', label: 'Einstellungen', Icon: Settings, view: 'settings', tooltip: 'API-Keys, Provider und App-Einstellungen' },
  { id: 'help', label: 'Hilfe', Icon: HelpCircle, view: 'help', tooltip: 'Handbuch und Kurzanleitung' },
];

export function Sidebar({ currentView, onViewChange, onNewDocument }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const handleItemClick = (item: NavItem) => {
    if (item.action === 'new') {
      onNewDocument();
    } else if (item.view) {
      onViewChange(item.view);
    }
  };

  const renderNavItem = (item: NavItem) => {
    const isCurrent = item.view !== undefined && item.view === currentView;

    return (
      <button
        key={item.id}
        onClick={() => handleItemClick(item)}
        aria-current={isCurrent ? 'page' : undefined}
        aria-label={item.label}
        title={item.tooltip ?? item.label}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          width: '100%',
          padding: collapsed ? '0.625rem 0' : '0.625rem 1rem',
          background: isCurrent ? 'var(--color-bg-selected)' : 'none',
          border: 'none',
          borderLeft: isCurrent ? '3px solid var(--sidebar-accent)' : '3px solid transparent',
          color: isCurrent ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
          fontSize: '0.875rem',
          fontWeight: isCurrent ? 700 : 400,
          cursor: 'pointer',
          justifyContent: collapsed ? 'center' : 'flex-start',
          transition: 'background 0.15s, color 0.15s',
          position: 'relative',
        }}
      >
        <item.Icon size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
        {!collapsed && <span>{item.label}</span>}
      </button>
    );
  };

  return (
    <aside
      aria-label="Hauptnavigation"
      style={{
        width: collapsed ? 60 : 240,
        minWidth: collapsed ? 60 : 240,
        background: 'var(--sidebar-bg)',
        color: 'var(--sidebar-text)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Marke */}
      <div style={{
        padding: '1.25rem 1rem', borderBottom: '1px solid var(--sidebar-border)',
        display: 'flex', alignItems: 'center', gap: collapsed ? 0 : '0.625rem',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        {collapsed ? <NibMark size={34} /> : <BrandSignature size={38} />}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto' }}>
        {NAV_ITEMS.map(renderNavItem)}

        {/* Trennlinie */}
        <div style={{ margin: '0.75rem 1rem', height: 1, background: 'var(--sidebar-border)' }} />

        {SETTINGS_ITEMS.map(renderNavItem)}
      </nav>

      {/* Collapse-Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen'}
        aria-expanded={!collapsed}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          background: 'none',
          border: 'none',
          color: 'var(--sidebar-text)',
          padding: '0.75rem',
          cursor: 'pointer',
          fontSize: '0.75rem',
        }}
      >
        {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> einklappen</>}
      </button>

      {/* Version */}
      <div style={{ padding: '0.5rem 1rem', fontSize: '0.6875rem', color: 'var(--sidebar-text)', textAlign: collapsed ? 'center' : 'left' }}>
        {collapsed ? 'v1' : 'v1.0.0-beta'}
      </div>
    </aside>
  );
}

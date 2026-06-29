import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Plus, FolderOpen, Files, Clock, Star, Trash2, Settings, HelpCircle,
  ChevronLeft, ChevronRight, SpellCheck, GraduationCap, Users, ClipboardCheck, LayoutDashboard,
  Target, Zap, Database,
} from 'lucide-react';
import type { ActiveView } from '../lib/types';
import { FEATURES } from '../lib/features';
import { BrandMark, BrandSignature } from './BrandLogo';

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
  gruppe?: 'Übersicht' | 'Unterrichten' | 'Korrigieren';
}

const NATASCHA_NAV_IDS = ['klassen', 'korrektur', 'schueler', 'erwartungshorizont'];

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Übersicht', Icon: LayoutDashboard, view: 'dashboard', gruppe: 'Übersicht', tooltip: 'Klassen, Korrekturstand und Weiterarbeiten' },
  { id: 'new', label: 'Neue erstellen', Icon: Plus, action: 'new', gruppe: 'Unterrichten', tooltip: 'Neues Arbeitsblatt erstellen' },
  { id: 'kompetenz', label: 'Kompetenz-Übung', Icon: Target, view: 'kompetenz', gruppe: 'Unterrichten', tooltip: 'Übung ohne Quelltext aus Lehrplan-Kompetenzen' },
  { id: 'quick', label: 'Schnell-Übung', Icon: Zap, view: 'quick', gruppe: 'Unterrichten', tooltip: 'Thema + Aufgabentyp → sofort Baukasten' },
  { id: 'documents', label: 'Meine Unterlagen', Icon: FolderOpen, view: 'documents', gruppe: 'Unterrichten', tooltip: 'Gespeicherte Dokumente durchsuchen' },
  { id: 'pool', label: 'Aufgaben-Pool', Icon: Database, view: 'pool', gruppe: 'Unterrichten', tooltip: 'Wiederverwendbare Aufgaben-Blöcke' },
  { id: 'templates', label: 'Vorlagen', Icon: Files, view: 'templates', gruppe: 'Unterrichten', tooltip: 'Gespeicherte Aufgaben-Vorlagen laden' },
  { id: 'klassen', label: 'Meine Klassen', Icon: GraduationCap, view: 'klassen', gruppe: 'Korrigieren', tooltip: 'Klassenübersicht mit Notenverteilung' },
  { id: 'korrektur', label: 'Korrektur (NATASCHA)', Icon: SpellCheck, view: 'korrektur', gruppe: 'Korrigieren', tooltip: 'Korrektur-Exporte aus NATASCHA einsehen' },
  { id: 'schueler', label: 'Schüler', Icon: Users, view: 'schueler', gruppe: 'Korrigieren', tooltip: 'Einzelne Schüler/innen und deren Ergebnisse' },
  { id: 'erwartungshorizont', label: 'Erwartungshorizont', Icon: ClipboardCheck, view: 'erwartungshorizont', gruppe: 'Korrigieren', tooltip: 'Lösungserwartungen und Bewertungsraster' },
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

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => FEATURES.natascha || !NATASCHA_NAV_IDS.includes(item.id),
  );

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
        {collapsed ? <BrandMark size={34} /> : <BrandSignature size={38} />}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto' }}>
        {(() => {
          const byGroup = new Map<string | undefined, NavItem[]>();
          for (const item of visibleNavItems) {
            const key = item.gruppe;
            let arr = byGroup.get(key);
            if (!arr) {
              arr = [];
              byGroup.set(key, arr);
            }
            arr.push(item);
          }

          const groupOrder = ['Übersicht', 'Unterrichten', 'Korrigieren'];
          const result = [];

          for (const group of groupOrder) {
            const items = byGroup.get(group);
            if (!items || items.length === 0) continue;
            if (!collapsed) {
              result.push(
                <div
                  key={`h-${group}`}
                  style={{
                    padding: '0.5rem 1rem 0.25rem',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--sidebar-text)',
                    opacity: 0.7,
                  }}
                >
                  {group}
                </div>,
              );
            }
            result.push(...items.map(renderNavItem));
          }

          const ungrouped = byGroup.get(undefined);
          if (ungrouped && ungrouped.length > 0) {
            if (result.length > 0) {
              result.push(
                <div
                  key="ungrouped-spacer"
                  style={{ margin: '0.5rem 1rem', height: 1, background: 'var(--sidebar-border)' }}
                />,
              );
            }
            result.push(...ungrouped.map(renderNavItem));
          }

          return result;
        })()}

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

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Mic, X, Command, FileText, Files, Database, GraduationCap, Compass, CornerDownLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppAction } from '../lib/types';
import { useCommandParser } from '../hooks/useCommandParser';
import { useVoiceCommand } from '../hooks/useVoiceCommand';
import type { SearchIndex, SearchResult, SearchSection } from '../lib/search';
import { searchIndex, groupResults } from '../lib/search';

interface Props {
  open: boolean;
  onClose: () => void;
  onActions: (actions: AppAction | AppAction[]) => void;
  onNavigate: (direction: 'next' | 'back') => void;
  onExport: () => void;
  blockCount: number;
  /** Such-Index (aus App: Dokumente/Vorlagen/Pool/Klassen/Navigation/Befehle). */
  index: SearchIndex;
  /** Führt ein Inhalts-/Navigations-Ergebnis aus (Befehle laufen weiter intern). */
  onExecuteResult: (result: SearchResult) => void;
}

/** Icon je Ergebnis-Art. */
const KIND_ICON: Record<SearchResult['kind'], LucideIcon> = {
  command: Command,
  document: FileText,
  template: Files,
  pool: Database,
  klasse: GraduationCap,
  navigation: Compass,
};

/**
 * Nicht-parametrisierte Befehle werden direkt ausgeführt, indem ihr kanonischer
 * Trigger-Text an die Legacy-Logik geht. Parametrisierte Befehle (thema:, …)
 * nutzen den aktuellen Eingabe-Text (Legacy-Fallback). App-seitig gelöste
 * Befehle (z. B. „Neue erstellen") gehen an onExecuteResult.
 */
const NON_PARAMETRIC_TRIGGER: Record<string, string> = {
  'nav-back': 'zurück',
  'nav-next': 'weiter',
  export: 'export',
  'block-delete': 'block löschen',
};

const APP_HANDLED_COMMANDS = new Set(['new', 'tafel-modus']);

export function CommandPalette({ open, onClose, onActions, onNavigate, onExport, blockCount, index, onExecuteResult }: Props) {
  const [input, setInput] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { parse } = useCommandParser();

  const handleVoiceResult = useCallback((text: string) => {
    setInput(text.trim());
    activate(null, text.trim());
  }, []);

  const voice = useVoiceCommand(handleVoiceResult);

  useEffect(() => {
    if (open) {
      setInput('');
      setActiveIndex(-1);
      setFeedback(null);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 2500);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Live-Ergebnisse + Gruppierung + flache Zeilenliste für Tastatur-Navigation.
  const sections: SearchSection[] = useMemo(() => groupResults(searchIndex(index, input)), [index, input]);
  const flatRows: SearchResult[] = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const idToFlat = useMemo(() => {
    const m = new Map<string, number>();
    flatRows.forEach((r, i) => m.set(r.id, i));
    return m;
  }, [flatRows]);

  // Eingabeänderung → Auswahl zurücksetzen.
  useEffect(() => {
    setActiveIndex(-1);
  }, [input]);

  // Aktivzeile im sichtbaren Bereich halten.
  useEffect(() => {
    if (activeIndex < 0) return;
    const el = listRef.current?.querySelector('[aria-selected="true"]') as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // --- Legacy-Befehlsausführung (unverändert, für Fallback + parametrisierte Befehle) ---
  const executeCommand = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (/^(zurück|back|zurueck)$/i.test(trimmed)) {
      onNavigate('back');
      setFeedback({ type: 'success', text: 'Zurück' });
      onClose();
      return;
    }

    if (/^(weiter|next|vor)$/i.test(trimmed)) {
      onNavigate('next');
      setFeedback({ type: 'success', text: 'Weiter' });
      onClose();
      return;
    }

    if (/^(export(ieren)?|generieren|dokumente?\s+erstellen|download)$/i.test(trimmed)) {
      onExport();
      setFeedback({ type: 'success', text: 'Exportiere Dokumente…' });
      onClose();
      return;
    }

    if (/^(block\s+)?(löschen|loeschen|entfernen|delete|letzten\s+löschen)$/i.test(trimmed)) {
      if (blockCount > 0) {
        onActions({ type: 'REMOVE_BLOCK', id: '__last__' });
        setFeedback({ type: 'success', text: 'Letzten Block entfernt' });
      } else {
        setFeedback({ type: 'error', text: 'Keine Blöcke vorhanden' });
      }
      onClose();
      return;
    }

    if (/^(vorlage|template)\s+speichern\s+als\s+(.+)$/i.test(trimmed)) {
      const match = trimmed.match(/^(vorlage|template)\s+speichern\s+als\s+(.+)$/i);
      const name = match?.[2]?.trim();
      if (name) {
        try {
          const raw = localStorage.getItem('lehrunterlagen-templates');
          const templates = raw ? JSON.parse(raw) : [];
          const tpl = { name, meta: {}, bloecke: [], savedAt: new Date().toISOString() };
          templates.push(tpl);
          localStorage.setItem('lehrunterlagen-templates', JSON.stringify(templates));
        } catch { /* ignore */ }
      }
      setFeedback({ type: 'success', text: `Vorlage "${name}" gespeichert (via localStorage)` });
      onClose();
      return;
    }

    if (/^(vorlage|template)\s+laden\s*:?\s*(.+)$/i.test(trimmed)) {
      const match = trimmed.match(/^(vorlage|template)\s+laden\s*:?\s*(.+)$/i);
      const name = match?.[2]?.trim();
      setFeedback({ type: 'success', text: `"${name}" – bitte Vorlagen-Modal öffnen` });
      onClose();
      return;
    }

    const result = parse(trimmed);
    if (result.commandId && APP_HANDLED_COMMANDS.has(result.commandId)) {
      onExecuteResult({
        id: `command:${result.commandId}`,
        kind: 'command',
        title: result.label,
        keywords: [trimmed],
        score: 0,
        action: { type: 'paletteCommand', commandId: result.commandId },
      });
      setFeedback({ type: 'success', text: result.label });
      onClose();
      return;
    }
    if (result.action) {
      onActions(result.action);
      setFeedback({ type: 'success', text: result.label });
      onClose();
    } else {
      setFeedback({
        type: 'error',
        text: 'Befehl nicht erkannt. Tippe z. B. „Thema: …" oder wähle einen Treffer.',
      });
    }
  }, [blockCount, onActions, onNavigate, onExport, onExecuteResult, onClose, parse]);

  // --- Ausführung eines ausgewählten Ergebnisses (Klick oder Enter auf Zeile) ---
  const executeCommandResult = useCallback((sr: SearchResult) => {
    if (sr.action.type === 'actions') {
      onActions(sr.action.actions);
      setFeedback({ type: 'success', text: sr.title });
      onClose();
      return;
    }
    if (sr.action.type === 'paletteCommand') {
      const cid = sr.action.commandId;
      if (APP_HANDLED_COMMANDS.has(cid)) {
        onExecuteResult(sr);
        onClose();
        return;
      }
      const trigger = NON_PARAMETRIC_TRIGGER[cid];
      // Nicht-parametrisch → kanonischer Trigger; parametrisch → aktueller Text.
      executeCommand(trigger ?? input);
      return;
    }
    // Sollte bei command-kind nicht vorkommen; sicherheitshalber delegieren.
    onExecuteResult(sr);
    onClose();
  }, [executeCommand, input, onActions, onExecuteResult, onClose]);

  /** Aktiviert ein Ergebnis (null = Legacy-Fallback auf den rohen Eingabe-Text). */
  const activate = useCallback((sr: SearchResult | null, overrideText?: string) => {
    if (!sr) {
      executeCommand(overrideText ?? input);
      return;
    }
    if (sr.kind === 'command') {
      executeCommandResult(sr);
    } else {
      onExecuteResult(sr);
      onClose();
    }
  }, [executeCommand, executeCommandResult, onExecuteResult, onClose, input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i < flatRows.length - 1 ? i + 1 : i));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i > -1 ? i - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sr = activeIndex >= 0 ? flatRows[activeIndex] ?? null : null;
      activate(sr);
    }
  };

  if (!open) return null;

  const hasInput = input.trim().length > 0;

  return (
    <div
      className="palette-overlay"
      onClick={onClose}
    >
      <div
        className="card palette-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Eingabezeile */}
        <div className="palette-input-row">
          <Compass size={16} className="palette-input-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Suchen oder Befehl eingeben (z. B. Thema: …)"
            className="palette-input"
            aria-label="Such- und Befehlseingabe"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="palette-input-actions">
            {voice.supported && (
              <button
                onClick={(e) => { e.stopPropagation(); voice.toggleListening(); }}
                title="Spracheingabe (deutsch)"
                className={voice.listening ? 'palette-mic palette-mic-active' : 'palette-mic'}
                aria-label={voice.listening ? 'Spracheingabe stoppen' : 'Spracheingabe starten'}
              >
                <Mic size={16} />
              </button>
            )}
            <button onClick={onClose} aria-label="Schließen" className="palette-mic">
              <X size={16} />
            </button>
          </div>
        </div>

        {voice.listening && (
          <div className="palette-voice-banner">
            <Mic size={14} /> Höre zu…{voice.interimTranscript && ` (${voice.interimTranscript})`}
          </div>
        )}

        {feedback && (
          <div className={feedback.type === 'success' ? 'palette-feedback palette-feedback-ok' : 'palette-feedback palette-feedback-err'}>
            {feedback.text}
          </div>
        )}

        {/* Ergebnisse */}
        <div className="palette-results" ref={listRef}>
          {sections.length === 0 ? (
            hasInput && (
              <div className="palette-empty">Keine Treffer — z. B. „Exportieren“ oder „Thema: …“ eingeben.</div>
            )
          ) : (
            sections.map((section) => (
              <div key={section.kind} className="palette-section">
                <div className="palette-section-header">{section.label}</div>
                {section.items.map((item) => {
                  const flatIdx = idToFlat.get(item.id) ?? -1;
                  const isActive = flatIdx === activeIndex;
                  const Icon = KIND_ICON[item.kind];
                  return (
                    <button
                      key={item.id}
                      className="palette-row"
                      aria-selected={isActive}
                      onClick={() => activate(item)}
                      onMouseMove={(e) => {
                        // Maus über Zeile → als aktiv markieren (kein Hover-Style-Hack).
                        if (flatIdx !== activeIndex) setActiveIndex(flatIdx);
                        e.currentTarget.focus();
                      }}
                    >
                      <Icon size={15} className="palette-row-icon" aria-hidden="true" />
                      <span className="palette-row-text">
                        <span className="palette-row-title">{item.title}</span>
                        {item.subtitle && <span className="palette-row-sub">{item.subtitle}</span>}
                      </span>
                      {isActive && <CornerDownLeft size={13} className="palette-row-enter" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Fußzeile / Tastaturhinweis */}
        <div className="palette-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> wählen</span>
          <span><kbd>Enter</kbd> öffnen / ausführen</span>
          <span><kbd>Esc</kbd> schließen</span>
        </div>
      </div>
    </div>
  );
}

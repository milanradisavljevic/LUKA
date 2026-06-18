import { useState, useEffect, useRef } from 'react';
import { Files, X } from 'lucide-react';
import type { Meta, Block } from '@lehrunterlagen/schema';

const STORAGE_KEY = 'lehrunterlagen-templates';

interface StoredTemplate {
  name: string;
  meta: Meta;
  bloecke: Pick<Block, 'typ' | 'punkte' | 'arbeitsanweisung' | 'clue' | 'config'>[];
  savedAt: string;
}

function loadTemplates(): StoredTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredTemplate[]) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: StoredTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

interface Props {
  meta: Meta;
  bloecke: Block[];
  onLoad: (meta: Meta, bloecke: Block[]) => void;
}

export function TemplateManager({ meta, bloecke, onLoad }: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<StoredTemplate[]>(loadTemplates);
  const [templateName, setTemplateName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  const refresh = () => setTemplates(loadTemplates());

  const handleSave = () => {
    if (!templateName.trim() || bloecke.length === 0) return;
    const tpl: StoredTemplate = {
      name: templateName.trim(),
      meta,
      bloecke: bloecke.map((b) => ({
        typ: b.typ,
        punkte: b.punkte,
        arbeitsanweisung: b.arbeitsanweisung,
        clue: b.clue,
        config: b.config,
      })),
      savedAt: new Date().toISOString(),
    };
    const all = [...templates.filter((t) => t.name !== tpl.name), tpl];
    saveTemplates(all);
    setTemplates(all);
    setTemplateName('');
  };

  const handleLoad = (tpl: StoredTemplate) => {
    const restoredBlocks = tpl.bloecke.map((b, i) => {
      const loesung = getEmptyLoesung(b.typ);
      return { ...b, id: `b${i + 1}`, loesung } as Block;
    });
    onLoad(tpl.meta, restoredBlocks);
    setOpen(false);
  };

  const handleDelete = (name: string) => {
    const all = templates.filter((t) => t.name !== name);
    saveTemplates(all);
    setTemplates(all);
  };

  const handleExport = () => {
    const json = JSON.stringify(templates, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lehrunterlagen-vorlagen.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string) as StoredTemplate[];
        if (Array.isArray(imported)) {
          const merged = [...templates];
          for (const t of imported) {
            if (!merged.find((m) => m.name === t.name)) merged.push(t);
          }
          saveTemplates(merged);
          setTemplates(merged);
        }
      } catch {
        /* ignore invalid JSON */
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!open) {
    return (
      <button className="btn-secondary" onClick={() => setOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
        <Files size={14} /> Vorlagen
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--color-overlay)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }} onClick={() => setOpen(false)}>
      <div style={{
        background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius)', boxShadow: '0 4px 24px var(--color-shadow)',
        padding: '1.5rem', width: 480, maxHeight: '80vh', overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', color: 'var(--color-text-primary)' }}>Vorlagen verwalten</h2>
          <button className="btn-secondary" onClick={() => setOpen(false)}
            aria-label="Schließen"
            style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.4rem' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input type="text" value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Vorlagenname"
            style={{ flex: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
          <button className="btn-primary" onClick={handleSave}
            disabled={!templateName.trim() || bloecke.length === 0}
            style={{ whiteSpace: 'nowrap' }}>
            Speichern
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button className="btn-secondary" onClick={handleExport}
            style={{ fontSize: '0.75rem' }}>
            Exportieren
          </button>
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}
            style={{ fontSize: '0.75rem' }}>
            Importieren
          </button>
          <input ref={fileInputRef} type="file" accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }} />
        </div>

        {templates.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '1rem', fontSize: '0.8125rem' }}>
            Noch keine Vorlagen gespeichert.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {templates.map((tpl) => (
              <div key={tpl.name} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.625rem', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
              }}>
                <div style={{ flex: 1, fontSize: '0.8125rem' }}>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{tpl.name}</strong>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                    {tpl.meta.fach} &middot; {tpl.meta.stufe} &middot; {tpl.bloecke.length} Block{tpl.bloecke.length !== 1 ? 's' : ''}
                    &nbsp;&middot; {new Date(tpl.savedAt).toLocaleDateString()}
                  </p>
                </div>
                <button className="btn-primary" onClick={() => handleLoad(tpl)}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                  Laden
                </button>
                <button className="btn-danger" onClick={() => handleDelete(tpl.name)}
                  aria-label="Vorlage löschen"
                  style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.4rem' }}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function getEmptyLoesung(typ: string): Record<string, unknown> {
  switch (typ) {
    case 'lueckentext': return { luecken: [] };
    case 'matching': return { zuordnung: {} };
    case 'multipleChoice': return { antworten: {} };
    case 'offeneVerstaendnisfrage': return { antworten: {} };
    case 'offeneSchreibaufgabe': return { musterloesung: '', erwartungshorizont: { inhalt: '', struktur: '', ausdruck: '', sprachrichtigkeit: '' } };
    case 'markieraufgabe': return { stellen: [] };
    case 'wordScramble': return {}; // kein loesung-Objekt mehr — Lösung = die Sätze selbst
    case 'kategorisierung': return { zuordnung: {} };
    case 'tabelle': return { zellen: {} };
    case 'stiluebung': return { umformulierung: '', begruendung: '' };
    case 'songanalyse': return { ergebnis: '', zitate: [], analysepunkte: [] };
    case 'vokabeluebung': return { antworten: {} };
    default: return {};
  }
}

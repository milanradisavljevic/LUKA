import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { fachLabel } from '@lehrunterlagen/schema';
import type { Meta, Block } from '@lehrunterlagen/schema';
import { getEmptyLoesung } from '../components/TemplateManager';
import { ViewShell } from './_ViewShell';

const STORAGE_KEY = 'lehrunterlagen-templates';
const STUFE_LABEL: Record<string, string> = { oberstufe: 'Oberstufe', unterstufe: 'Unterstufe' };

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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    /* ignore */
  }
}

interface Props {
  meta: Meta;
  bloecke: Block[];
  onLoad: (meta: Meta, bloecke: Block[]) => void;
}

export function TemplatesView({ meta, bloecke, onLoad }: Props) {
  const [templates, setTemplates] = useState<StoredTemplate[]>(loadTemplates);
  const [templateName, setTemplateName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

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
  };

  const handleDelete = (name: string) => {
    if (!window.confirm(`Vorlage „${name}“ löschen?`)) return;
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

  return (
    <ViewShell
      title="Vorlagen"
      description="Wiederverwendbare Block-Konfigurationen. Laden ersetzt Angaben und Blöcke im Assistenten."
      action={
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={handleExport} style={{ fontSize: '0.8125rem' }}>
            Exportieren
          </button>
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ fontSize: '0.8125rem' }}>
            Importieren
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </div>
      }
    >
      {/* Aktuelle Konfiguration speichern */}
      <div style={{
        display: 'flex', gap: '0.5rem', marginBottom: '1.25rem',
        padding: '0.875rem 1rem', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)',
      }}>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder={bloecke.length === 0 ? 'Erst Blöcke im Assistenten anlegen …' : 'Aktuelle Konfiguration als Vorlage speichern'}
          style={{ flex: 1 }}
          disabled={bloecke.length === 0}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={!templateName.trim() || bloecke.length === 0}
          style={{ whiteSpace: 'nowrap' }}
        >
          Speichern
        </button>
      </div>

      {templates.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem 1rem', fontSize: '0.875rem' }}>
          Noch keine Vorlagen gespeichert.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
          {templates.map((tpl) => (
            <div
              key={tpl.name}
              style={{
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
                padding: '0.875rem 1rem', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)',
              }}
            >
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '0.9375rem' }}>{tpl.name}</strong>
                <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>
                  {fachLabel(tpl.meta.fach)} · {STUFE_LABEL[tpl.meta.stufe] ?? tpl.meta.stufe}
                  {' · '}{tpl.bloecke.length} Block{tpl.bloecke.length !== 1 ? 'e' : ''}
                </p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', margin: '0.125rem 0 0' }}>
                  {new Date(tpl.savedAt).toLocaleDateString('de-DE')}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <button className="btn-primary" onClick={() => handleLoad(tpl)}
                  style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', flex: 1 }}>
                  Laden
                </button>
                <button className="btn-danger" onClick={() => handleDelete(tpl.name)}
                  aria-label="Vorlage löschen"
                  style={{ display: 'inline-flex', alignItems: 'center', padding: '0.375rem 0.5rem' }}>
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </ViewShell>
  );
}

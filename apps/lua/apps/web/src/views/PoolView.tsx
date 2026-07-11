import { useState, useMemo, useEffect } from 'react';
import { X, Search, Filter, Database, Upload, Download, Star, BadgeCheck } from 'lucide-react';
import { fachLabel, FACH_META } from '@lehrunterlagen/schema';
import type { Block, Fach, Stufe, BlockTyp } from '@lehrunterlagen/schema';
import { useAufgabenPool } from '../hooks/useAufgabenPool';
import { parsePoolBlock, parsePoolTags, isKuratiert } from '../lib/pool';
import { importPoolPaket, exportPoolPaket } from '../lib/poolTransfer';
import { loadTeacherProfile } from '../lib/profile';
import { Toast, type ToastMessage } from '../components/Toast';
import { ViewShell } from './_ViewShell';
import { EmptyState } from './_EmptyState';
import { BLOCK_TYPE_DEFS } from '../lib/constants';

const STUFE_LABEL: Record<string, string> = { oberstufe: 'Oberstufe', unterstufe: 'Unterstufe' };

interface Props {
  onInsertBlock?: (block: Block) => void;
}

export function PoolView({ onInsertBlock }: Props) {
  const { entries, loading, error, refresh, remove } = useAufgabenPool();
  const [search, setSearch] = useState('');
  const [filterFach, setFilterFach] = useState<string>('');
  const [filterStufe, setFilterStufe] = useState<string>('');
  const [filterTyp, setFilterTyp] = useState<string>('');
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [transferLaeuft, setTransferLaeuft] = useState(false);
  const [profilFaecher, setProfilFaecher] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    loadTeacherProfile().then((profil) => {
      if (active && profil) setProfilFaecher(profil.faecher);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const handleImport = async () => {
    setTransferLaeuft(true);
    try {
      const { abgebrochen, report } = await importPoolPaket();
      if (!abgebrochen && report) {
        await refresh();
        const teile = [`${report.eingefuegt} neu`];
        if (report.ersetzt > 0) teile.push(`${report.ersetzt} ersetzt`);
        if (report.uebersprungen > 0) teile.push(`${report.uebersprungen} übersprungen`);
        setToast({ id: Date.now(), kind: 'info', text: `Fachpaket importiert: ${teile.join(', ')}.` });
      }
    } catch (e) {
      setToast({ id: Date.now(), kind: 'error', text: `Import fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setTransferLaeuft(false);
    }
  };

  const handleExport = async () => {
    setTransferLaeuft(true);
    try {
      const ergebnis = await exportPoolPaket();
      if (ergebnis !== null) {
        setToast({ id: Date.now(), kind: 'info', text: `${ergebnis.anzahl} Aufgabe(n) als Fachpaket exportiert: ${ergebnis.pfad}` });
      }
    } catch (e) {
      setToast({ id: Date.now(), kind: 'error', text: `Export fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setTransferLaeuft(false);
    }
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filterFach && entry.fach !== filterFach) return false;
      if (filterStufe && entry.stufe !== filterStufe) return false;
      if (filterTyp && entry.aufgabentyp !== filterTyp) return false;
      if (search) {
        const s = search.toLowerCase();
        const tags = parsePoolTags(entry.tags).join(' ').toLowerCase();
        const thema = (entry.thema ?? '').toLowerCase();
        if (!thema.includes(s) && !tags.includes(s) && !entry.aufgabentyp.toLowerCase().includes(s)) {
          return false;
        }
      }
      return true;
    });
  }, [entries, search, filterFach, filterStufe, filterTyp]);

  const handleDelete = async (id: string, thema: string | null) => {
    if (!window.confirm(`Aufgabe „${thema ?? 'Ohne Titel'}" löschen?`)) return;
    await remove(id);
  };

  const handleInsert = (entry: typeof entries[0]) => {
    const block = parsePoolBlock(entry);
    if (block && onInsertBlock) {
      onInsertBlock(block);
    }
  };

  const blockTypeLabel = (typ: string): string => {
    const def = BLOCK_TYPE_DEFS.find((d) => d.id === typ);
    return def?.label ?? typ;
  };

  return (
    <ViewShell
      title="Aufgaben-Pool"
      description="Wiederverwendbare Aufgaben-Blöcke. Speichere einzelne Blöcke aus der Vorschau und füge sie hier wieder ein."
      action={
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button
            className="btn-secondary"
            onClick={handleImport}
            disabled={transferLaeuft}
            title="Fachpaket (JSON-Datei) in den lokalen Pool importieren — mit Vorschau vor dem Import"
            style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Upload size={13} /> Importieren
          </button>
          <button
            className="btn-secondary"
            onClick={handleExport}
            disabled={transferLaeuft || entries.length === 0}
            title="Gesamten Pool als teilbare Fachpaket-Datei (JSON) exportieren"
            style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Download size={13} /> Exportieren
          </button>
        </div>
      }
    >
      {/* Filter */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem',
        padding: '0.75rem 1rem', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flex: '1 1 200px' }}>
          <Search size={14} style={{ color: 'var(--color-text-secondary)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen (Thema, Tags, Typ)..."
            style={{ flex: 1, fontSize: '0.8125rem' }}
          />
        </div>
        <select
          value={filterFach}
          onChange={(e) => setFilterFach(e.target.value)}
          style={{ fontSize: '0.8125rem', minWidth: '120px' }}
        >
          <option value="">Alle Fächer</option>
          {Object.entries(FACH_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>
        <select
          value={filterStufe}
          onChange={(e) => setFilterStufe(e.target.value)}
          style={{ fontSize: '0.8125rem', minWidth: '110px' }}
        >
          <option value="">Alle Stufen</option>
          <option value="unterstufe">Unterstufe</option>
          <option value="oberstufe">Oberstufe</option>
        </select>
        <select
          value={filterTyp}
          onChange={(e) => setFilterTyp(e.target.value)}
          style={{ fontSize: '0.8125rem', minWidth: '140px' }}
        >
          <option value="">Alle Typen</option>
          {BLOCK_TYPE_DEFS.map((def) => (
            <option key={def.id} value={def.id}>{def.label}</option>
          ))}
        </select>
        {(filterFach || filterStufe || filterTyp || search) && (
          <button
            className="btn-secondary"
            onClick={() => { setFilterFach(''); setFilterStufe(''); setFilterTyp(''); setSearch(''); }}
            style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <X size={12} /> Filter löschen
          </button>
        )}
      </div>

      {loading && (
        <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '1rem' }}>
          Laden...
        </p>
      )}

      {error && (
        <p style={{ color: 'var(--color-error)', textAlign: 'center', padding: '1rem' }}>
          Fehler: {error}
        </p>
      )}

      {!loading && !error && filteredEntries.length === 0 && (
        <EmptyState
          icon={Database}
          title={entries.length === 0 ? 'Aufgaben-Pool ist leer' : 'Keine passenden Aufgaben'}
          description={
            entries.length === 0
              ? 'Hier erscheinen wiederverwendbare Aufgaben-Blöcke, die du aus der Vorschau speicherst.'
              : 'Passe die Filter oder die Suche an, um passende Aufgaben zu finden.'
          }
        />
      )}

      {filteredEntries.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {filteredEntries.map((entry) => {
            const tags = parsePoolTags(entry.tags);
            const kuratiert = isKuratiert(tags);
            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex', flexDirection: 'column', gap: '0.5rem',
                  padding: '0.875rem 1rem', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.9375rem' }}>
                    {entry.thema || 'Ohne Titel'}
                  </strong>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' }}>
                    <span>
                      {fachLabel(entry.fach as Fach)} · {STUFE_LABEL[entry.stufe] ?? entry.stufe}
                      {' · '}{blockTypeLabel(entry.aufgabentyp)}
                    </span>
                    {profilFaecher.includes(entry.fach) && (
                      <span className="badge badge-context" title="Fach aus deinem Profil">
                        <Star size={10} /> Dein Fach
                      </span>
                    )}
                    {kuratiert && (
                      <span
                        className="badge badge-info"
                        title={entry.quelleHinweis ?? 'Redaktionell kuratierte Fachpaket-Aufgabe'}
                      >
                        <BadgeCheck size={10} /> Kuratiert
                      </span>
                    )}
                  </p>
                  {entry.quelleHinweis && (
                    <p
                      title={entry.quelleHinweis}
                      style={{
                        fontSize: '0.6875rem',
                        color: 'var(--color-text-secondary)',
                        margin: '0.25rem 0 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {entry.quelleHinweis}
                    </p>
                  )}
                  {tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.375rem' }}>
                      {tags.map((tag, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '0.625rem',
                            padding: '0.125rem 0.375rem',
                            background: 'var(--color-bg-elevated)',
                            borderRadius: '3px',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', margin: '0.375rem 0 0' }}>
                    {new Date(entry.createdAt).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  {onInsertBlock && (
                    <button
                      className="btn-primary"
                      onClick={() => handleInsert(entry)}
                      style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', flex: 1 }}
                    >
                      Einfügen
                    </button>
                  )}
                  <button
                    className="btn-danger"
                    onClick={() => handleDelete(entry.id, entry.thema)}
                    aria-label="Aufgabe löschen"
                    style={{ display: 'inline-flex', alignItems: 'center', padding: '0.375rem 0.5rem' }}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </ViewShell>
  );
}

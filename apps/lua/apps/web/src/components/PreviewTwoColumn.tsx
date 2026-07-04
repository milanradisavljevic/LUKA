import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Check, Circle, Pencil, RefreshCw, FileText, KeyRound, Database, Lightbulb } from 'lucide-react';
import { istSprachfach, fachLabel } from '@lehrunterlagen/schema';
import type { Block } from '@lehrunterlagen/schema';
import type { AppState, AppAction } from '../lib/types';
import { BlockPreview } from './BlockPreview';
import { BLOCK_TYPE_DEFS } from '../lib/constants';
import { useGenerate } from '../hooks/useGenerate';
import { useAufgabenPool } from '../hooks/useAufgabenPool';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  judge?: { issuesByBlock: Record<string, string[]>; gepruefteIds: string[] };
}

const BLOCK_LABELS: Record<string, string> = Object.fromEntries(
  BLOCK_TYPE_DEFS.map((d) => [d.id, d.label]),
);

// YYYY-MM-DD → DD.MM.YYYY (wie im DOCX); andere Eingaben unverändert.
function formatDatum(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

function useWindowWidth() {
  const [width, setWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
}

/* ── Konstanten für Papier-Look ── */
const PAPER_BG = '#ffffff';
const PAPER_TEXT = '#000000';
const PAPER_MUTED = '#333333';
const PAPER_BORDER = '#000000';
const PAPER_SECONDARY = '#555555';

export function PreviewTwoColumn({ state, dispatch, judge }: Props) {
  const [activeTab, setActiveTab] = useState<'schueler' | 'loesung'>('schueler');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [regenId, setRegenId] = useState<string | null>(null);
  const [editierteIds, setEditierteIds] = useState<Set<string>>(new Set());
  const [poolDialogBlock, setPoolDialogBlock] = useState<Block | null>(null);
  const [poolTags, setPoolTags] = useState('');
  const [poolQuelle, setPoolQuelle] = useState('');
  const windowWidth = useWindowWidth();
  const isNarrow = windowWidth < 768;
  const { regenerateBlock, generating, stage } = useGenerate(dispatch);
  const { add: addToPool } = useAufgabenPool();

  const JudgeBadge = ({ blockId }: { blockId: string }) => {
    if (!judge?.gepruefteIds.includes(blockId)) return null;
    const issues = judge.issuesByBlock[blockId];
    if (issues && issues.length > 0) {
      return (
        <span title={issues.join(' · ')} style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: 600,
        }}>
          <AlertTriangle size={12} /> bitte prüfen
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600,
      }}>
        <CheckCircle2 size={12} /> Lösung geprüft
      </span>
    );
  };

  // Zeige generiertes Dokument wenn vorhanden, sonst Skelett
  const doc = state.generiertesDokument;
  const bloecke = doc ? doc.bloecke : state.bloecke;
  const quelltexte = doc ? doc.quelltexte : state.quelltexte;
  const meta = doc ? doc.meta : state.meta;

  const handleUpdate = (id: string, field: string, value: unknown) => {
    setEditierteIds((prev) => new Set(prev).add(id));
    if (doc) {
      dispatch({ type: 'UPDATE_GENERIERTER_BLOCK', id, block: { [field]: value } as Partial<Block> });
    } else {
      dispatch({ type: 'UPDATE_BLOCK', id, block: { [field]: value } as Partial<Block> });
    }
  };

  const resolveQuelleTitel = (id?: string) => {
    if (!id) return undefined;
    const qt = quelltexte.find((q) => q.id === id);
    return qt?.titel || id;
  };

  const gesamtPunkte = bloecke.reduce((sum, b) => sum + b.punkte, 0);
  // Punkte in der Vorschau nur zeigen, wenn nicht ausgeblendet — deckungsgleich mit
  // dem Export (Renderer: meta.punkteAusblenden). Sonst verwirrt Vorschau ≠ DOCX.
  const zeigePunkte = meta.punkteAusblenden !== true && gesamtPunkte > 0;

  // Schülerkopf (Name/Klasse/Datum) + Aufgabenübersicht — spiegelt das DOCX-Layout.
  // Beschriftungen folgen der Fachsprache, damit Vorschau = fremdsprachiger Export ist.
  const isEnglish = istSprachfach(meta.fach);
  const L = isEnglish
    ? { klasse: 'Class:', datum: 'Date:', uebersicht: 'Overview', nr: 'No.', aufgabe: 'Exercise', punkte: 'Points', gesamt: 'TOTAL', note: 'Grade:', unterschrift: 'Signature:' }
    : { klasse: 'Klasse:', datum: 'Datum:', uebersicht: 'Aufgabenübersicht', nr: 'Nr.', aufgabe: 'Aufgabe', punkte: 'Punkte', gesamt: 'GESAMT', note: 'Note:', unterschrift: 'Unterschrift:' };
  const renderKopf = () => (
    <>
      <div style={{
        border: `1px solid ${PAPER_BORDER}`, padding: '0.4rem 0.6rem', fontSize: '10pt',
        marginBottom: '0.75rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap',
        color: PAPER_TEXT,
      }}>
        <span><strong>Name:</strong> <span style={{ borderBottom: `1px solid ${PAPER_BORDER}`, display: 'inline-block', minWidth: '8rem' }}>&nbsp;</span></span>
        <span><strong>{L.klasse}</strong> {meta.klasse || '—'}</span>
        <span><strong>{L.datum}</strong> {meta.datum ? formatDatum(meta.datum) : '—'}</span>
      </div>
      {bloecke.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontWeight: 600, fontSize: '11pt', marginBottom: '0.25rem', color: PAPER_TEXT }}>{L.uebersicht}</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
            <thead>
              <tr style={{ background: '#e8e8e8' }}>
                <th style={{ border: `1px solid ${PAPER_BORDER}`, padding: '2px 6px', textAlign: 'left', width: '10%' }}>{L.nr}</th>
                <th style={{ border: `1px solid ${PAPER_BORDER}`, padding: '2px 6px', textAlign: 'left' }}>{L.aufgabe}</th>
                {zeigePunkte && <th style={{ border: `1px solid ${PAPER_BORDER}`, padding: '2px 6px', textAlign: 'right', width: '22%' }}>{L.punkte}</th>}
              </tr>
            </thead>
            <tbody>
              {bloecke.map((b, i) => (
                <tr key={b.id}>
                  <td style={{ border: `1px solid ${PAPER_BORDER}`, padding: '2px 6px' }}>{i + 1}</td>
                  <td style={{ border: `1px solid ${PAPER_BORDER}`, padding: '2px 6px' }}>{BLOCK_LABELS[b.typ] ?? b.typ}</td>
                  {zeigePunkte && <td style={{ border: `1px solid ${PAPER_BORDER}`, padding: '2px 6px', textAlign: 'right' }}>____ / {b.punkte}</td>}
                </tr>
              ))}
              {zeigePunkte && (
                <tr style={{ background: '#f0f0f0', fontWeight: 700 }}>
                  <td style={{ border: `1px solid ${PAPER_BORDER}`, padding: '2px 6px' }}></td>
                  <td style={{ border: `1px solid ${PAPER_BORDER}`, padding: '2px 6px' }}>{L.gesamt}</td>
                  <td style={{ border: `1px solid ${PAPER_BORDER}`, padding: '2px 6px', textAlign: 'right' }}>____ / {gesamtPunkte}</td>
                </tr>
              )}
            </tbody>
          </table>
          {zeigePunkte && (
            <p style={{ fontSize: '10pt', marginTop: '0.4rem', color: PAPER_TEXT }}>
              <strong>{L.note}</strong> ________   <strong>{L.unterschrift}</strong> ____________
            </p>
          )}
        </div>
      )}
    </>
  );

  const didaktik = doc?.didaktik;
  const sprechenderTitel = didaktik?.arbeitsblattTitel?.trim();

  const renderDidaktischerRahmen = (mode: 'schueler' | 'loesung') => (
    <>
      <h2 style={{ fontSize: '14pt', fontWeight: 700, marginBottom: '0.25rem', color: PAPER_TEXT }}>
        {sprechenderTitel ? `${sprechenderTitel}${mode === 'loesung' ? ' – Lösungsfassung' : ''}` : `${meta.thema || '(Thema)'}${mode === 'loesung' ? ' – Lösungsfassung' : ''}`}
      </h2>
      <p style={{ fontSize: '9pt', color: PAPER_SECONDARY, marginBottom: didaktik?.einleitung?.trim() ? '0.5rem' : '0.75rem' }}>
        {sprechenderTitel && <span>{fachLabel(meta.fach)} · {meta.thema || '(Thema)'} · </span>}
        {meta.stufe === 'oberstufe' ? 'Oberstufe' : 'Unterstufe'}
        {meta.schwierigkeit ? ` · ${meta.schwierigkeit.charAt(0).toUpperCase() + meta.schwierigkeit.slice(1)}` : ''}
      </p>
      {didaktik?.einleitung?.trim() && (
        <p style={{ fontSize: '10pt', fontStyle: 'italic', color: PAPER_TEXT, marginBottom: '0.75rem', lineHeight: 1.5 }}>
          {didaktik.einleitung.trim()}
        </p>
      )}
    </>
  );

  const renderMerkkasten = () => {
    if (!didaktik?.merkkasten) return null;
    const { merkkasten } = didaktik;
    return (
      <div style={{
        marginBottom: '1rem',
        border: `1px solid ${PAPER_BORDER}`,
        background: '#f2f2f2',
        padding: '0.6rem 0.8rem',
        borderRadius: 2,
      }}>
        <p style={{ fontWeight: 700, fontSize: '10pt', margin: '0 0 0.4rem', color: PAPER_TEXT }}>
          {merkkasten.titel}
        </p>
        {merkkasten.items && merkkasten.items.length > 0 ? (
          <table style={{ width: '100%', fontSize: '10pt', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.2rem', borderBottom: `1px solid ${PAPER_BORDER}` }}>Structure</th>
                <th style={{ textAlign: 'left', padding: '0.2rem', borderBottom: `1px solid ${PAPER_BORDER}` }}>How to use it</th>
              </tr>
            </thead>
            <tbody>
              {merkkasten.items.map((item, i) => (
                <tr key={i}>
                  <td style={{ padding: '0.2rem', verticalAlign: 'top', fontWeight: 700 }}>{item.notion}</td>
                  <td style={{ padding: '0.2rem', verticalAlign: 'top' }}>
                    {item.form && <div><em>{item.form}</em></div>}
                    {item.use && item.use.map((u, j) => <div key={j}>{u}</div>)}
                    {item.signalWords && item.signalWords.length > 0 && <div><strong>Signal words:</strong> <em>{item.signalWords.join(', ')}</em></div>}
                    {item.example && <div><strong>Example:</strong> <em>{item.example}</em></div>}
                    {item.tip && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Lightbulb size={12} aria-hidden="true" />
                        <strong>Tipp:</strong> {item.tip}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '10pt', color: PAPER_TEXT, lineHeight: 1.5 }}>
            {(merkkasten.punkte ?? []).map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderTransferaufgabe = () => {
    if (!didaktik?.transferaufgabe?.trim()) return null;
    const isEnglish = istSprachfach(meta.fach);
    const title = isEnglish ? 'Your turn:' : 'Zum Schluss – jetzt du!';
    const text = didaktik.transferaufgabe.trim().replace(/^Your turn:\s*/i, '').replace(/^Zum Schluss – jetzt du!\s*/i, '');
    return (
      <div style={{ marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: `1px solid ${PAPER_BORDER}` }}>
        <h3 style={{ fontSize: '12pt', fontWeight: 700, marginBottom: '0.5rem', color: PAPER_TEXT }}>
          {title}
        </h3>
        <p style={{ fontSize: '10pt', color: PAPER_TEXT, marginBottom: '0.75rem', lineHeight: 1.5 }}>
          {text}
        </p>
        <div style={{ borderBottom: `1px solid ${PAPER_BORDER}`, height: '1.5rem', marginBottom: '0.4rem' }} />
        <div style={{ borderBottom: `1px solid ${PAPER_BORDER}`, height: '1.5rem', marginBottom: '0.4rem' }} />
        <div style={{ borderBottom: `1px solid ${PAPER_BORDER}`, height: '1.5rem' }} />
      </div>
    );
  };

  // Wie zeigePunkte: Vorschau muss dem DOCX entsprechen (Renderer:
  // meta.quelltextAusblenden lässt die Quelltext-Sektion weg).
  const renderQuelltexte = () =>
    quelltexte.length > 0 && meta.quelltextAusblenden !== true ? (
      <div style={{ marginBottom: '1.5rem' }}>
        <strong style={{ fontSize: '12pt', color: PAPER_TEXT }}>Quelltext{quelltexte.length > 1 ? 'e' : ''}</strong>
        {quelltexte.map((qt, i) => (
          <div key={qt.id} style={{ marginTop: '0.5rem' }}>
            <p style={{ fontWeight: 600, fontSize: '11pt', color: PAPER_TEXT }}>Text {i + 1}: {qt.titel || `Quelltext ${i + 1}`}</p>
            {qt.herkunft?.ref && (
              <p style={{ fontSize: '9pt', fontStyle: 'italic', color: PAPER_SECONDARY, margin: '0.1rem 0' }}>nach: {qt.herkunft.ref}</p>
            )}
            <div style={{
              fontSize: '10pt', lineHeight: 1.5, marginTop: '0.25rem',
              borderLeft: '3px solid #cccccc', paddingLeft: '0.6rem',
              color: PAPER_TEXT, fontFamily: 'var(--font)',
            }}>
              {qt.inhalt.split('\n').map((zeile, zi) => (
                <div key={zi} style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{
                    minWidth: '1.5rem', textAlign: 'right', color: '#888888',
                    fontSize: '9pt', userSelect: 'none', fontFamily: 'monospace',
                  }}>{zi + 1}</span>
                  <span>{zeile || '\u00A0'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ) : null;

  // Lernziel-Coverage berechnen
  const gewuenschteLernziele = meta.lernziele ?? [];
  const abgedeckteLernziele = new Set<string>();
  const lernzielProBlock = new Map<string, string[]>();
  for (const block of bloecke) {
    const blockLzs = block.lernziele ?? [];
    lernzielProBlock.set(block.id, blockLzs);
    for (const lz of blockLzs) abgedeckteLernziele.add(lz);
  }
  const fehlendeLernziele = gewuenschteLernziele.filter((lz) => !abgedeckteLernziele.has(lz));
  const zeigeCoverage = gewuenschteLernziele.length > 0 && doc; // Nur bei generiertem Dokument + vorhandenen Lernzielen

  // ── Schülerfassung ──
  const renderSchuelerFassung = () => (
    <div style={{ fontFamily: 'var(--font)', fontSize: '11pt', color: PAPER_TEXT }}>
      {renderDidaktischerRahmen('schueler')}
      {meta.lernziele && meta.lernziele.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          {meta.lernziele.map((lz) => (
            <span key={lz} style={{
              fontSize: '8pt',
              background: '#f3e5f5',
              color: '#6a1b9a',
              padding: '0.125rem 0.5rem',
              borderRadius: 'var(--radius)',
              border: '1px solid #ce93d8',
            }}>
              {lz}
            </span>
          ))}
        </div>
      )}
      {renderKopf()}
      {renderQuelltexte()}
      {renderMerkkasten()}
      {bloecke.map((block) => (
        <div key={block.id}
          style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid #cccccc', cursor: 'pointer' }}
          onClick={() => setEditingId(editingId === block.id ? null : block.id)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '9pt', color: PAPER_SECONDARY }}>
            {zeigePunkte && <span>{block.punkte} Punkte</span>}
            {block.quelleId && <span>Quelle: {resolveQuelleTitel(block.quelleId)}</span>}
            {editingId === block.id && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#6a1b9a' }}><Pencil size={12} /> Bearbeitung</span>}
            {judge && <JudgeBadge blockId={block.id} />}
          </div>
          {block.beispiel?.trim() && (
            <p style={{ fontSize: '10pt', fontStyle: 'italic', color: PAPER_SECONDARY, margin: '0 0 0.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid #cccccc' }}>
              <strong>Beispiel:</strong> {block.beispiel.trim()}
            </p>
          )}
          <BlockPreview block={block} showSolution={false}
            onUpdate={editingId === block.id ? handleUpdate : undefined} />
          {/* Block-Regenerieren — nur bei generiertem Dokument */}
          {doc && (
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {generating && regenId === block.id ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-accent)' }}>
                  <RefreshCw size={13} className="spin" /> Wird regeneriert… {stage}
                </span>
              ) : (
                <>
                  <button
                    onClick={() => setRegenId(regenId === block.id ? null : block.id)}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius)',
                      border: '1px solid #cccccc',
                      background: '#ffffff',
                      cursor: 'pointer',
                      color: PAPER_SECONDARY,
                      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                    }}
                  >
                    <RefreshCw size={13} /> Neu generieren
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPoolDialogBlock(block);
                      setPoolTags('');
                      setPoolQuelle('');
                    }}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius)',
                      border: '1px solid #cccccc',
                      background: '#ffffff',
                      cursor: 'pointer',
                      color: PAPER_SECONDARY,
                      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                    }}
                    title="In Aufgaben-Pool speichern"
                  >
                    <Database size={13} /> In Pool
                  </button>
                  {regenId === block.id && (
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {['Kürzer', 'Schwieriger', 'Andere Formulierung'].map((hint) => (
                        <button
                          key={hint}
                          onClick={async () => {
                            if (editierteIds.has(block.id)) {
                              const ok = window.confirm('Diese Aufgabe wurde manuell bearbeitet. Beim Neu-Generieren gehen deine Änderungen verloren. Fortfahren?');
                              if (!ok) return;
                            }
                            setRegenId(null);
                            const neu = await regenerateBlock(state, block.id, hint);
                            if (neu) {
                              setEditierteIds((prev) => {
                                const next = new Set(prev);
                                next.delete(block.id);
                                return next;
                              });
                            }
                          }}
                          style={{
                            fontSize: '0.6875rem',
                            padding: '0.15rem 0.4rem',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--color-accent)',
                            background: 'var(--color-bg-selected)',
                            cursor: 'pointer',
                            color: 'var(--color-accent)',
                          }}
                        >
                          {hint}
                        </button>
                      ))}
                      <button
                        onClick={async () => {
                          if (editierteIds.has(block.id)) {
                            const ok = window.confirm('Diese Aufgabe wurde manuell bearbeitet. Beim Neu-Generieren gehen deine Änderungen verloren. Fortfahren?');
                            if (!ok) return;
                          }
                          setRegenId(null);
                          const neu = await regenerateBlock(state, block.id);
                          if (neu) {
                            setEditierteIds((prev) => {
                              const next = new Set(prev);
                              next.delete(block.id);
                              return next;
                            });
                          }
                        }}
                        style={{
                          fontSize: '0.6875rem',
                          padding: '0.15rem 0.4rem',
                          borderRadius: 'var(--radius)',
                          border: '1px solid #cccccc',
                          background: '#ffffff',
                          cursor: 'pointer',
                          color: PAPER_SECONDARY,
                        }}
                      >
                        Standard
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ))}
      {renderTransferaufgabe()}
    </div>
  );

  // ── Lösungsfassung ──
  const renderLoesungsFassung = () => (
    <div style={{ fontFamily: 'var(--font)', fontSize: '11pt', color: PAPER_TEXT }}>
      {renderDidaktischerRahmen('loesung')}
      <p style={{ fontSize: '9pt', color: PAPER_SECONDARY, marginBottom: '0.5rem' }}>
        {fachLabel(meta.fach)} ·{' '}
        {meta.stufe === 'oberstufe' ? 'Oberstufe' : 'Unterstufe'} · Lösung
        {meta.schwierigkeit ? ` · ${meta.schwierigkeit.charAt(0).toUpperCase() + meta.schwierigkeit.slice(1)}` : ''}
      </p>
      {meta.lernziele && meta.lernziele.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          {meta.lernziele.map((lz) => (
            <span key={lz} style={{
              fontSize: '8pt',
              background: '#f3e5f5',
              color: '#6a1b9a',
              padding: '0.125rem 0.5rem',
              borderRadius: 'var(--radius)',
              border: '1px solid #ce93d8',
            }}>
              {lz}
            </span>
          ))}
        </div>
      )}
      {renderKopf()}
      {renderQuelltexte()}
      {renderMerkkasten()}
      {bloecke.map((block) => (
        <div key={block.id}
          style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid #cccccc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '9pt', color: PAPER_SECONDARY }}>
            {zeigePunkte && <span>{block.punkte} Punkte</span>}
            {block.quelleId && <span>Quelle: {resolveQuelleTitel(block.quelleId)}</span>}
            {judge && <JudgeBadge blockId={block.id} />}
          </div>
          {block.beispiel?.trim() && (
            <p style={{ fontSize: '10pt', fontStyle: 'italic', color: PAPER_SECONDARY, margin: '0 0 0.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid #cccccc' }}>
              <strong>Beispiel:</strong> {block.beispiel.trim()}
            </p>
          )}
          <BlockPreview block={block} showSolution={true} />
        </div>
      ))}
      {renderTransferaufgabe()}
    </div>
  );

  return (
    <div>
      {!doc && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
          Skelett-Vorschau — nach dem Generieren erscheint hier der vollständige Inhalt.
        </p>
      )}

      {/* Lernziel-Coverage-Checkliste */}
      {zeigeCoverage && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          background: fehlendeLernziele.length > 0 ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
          borderRadius: 'var(--radius)',
          border: `1px solid ${fehlendeLernziele.length > 0 ? 'var(--color-warning)' : 'var(--color-success)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {fehlendeLernziele.length > 0
              ? <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />
              : <CheckCircle2 size={16} color="var(--color-success)" />}
            <strong style={{ fontSize: '0.875rem' }}>
              Lernziel-Abdeckung
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              ({abgedeckteLernziele.size}/{gewuenschteLernziele.length} abgedeckt)
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {gewuenschteLernziele.map((lz) => {
              const istAbgedeckt = abgedeckteLernziele.has(lz);
              const deckendeBloecke = bloecke
                .filter((b) => (b.lernziele ?? []).includes(lz))
                .map((b) => BLOCK_LABELS[b.typ] ?? b.typ);
              return (
                <span
                  key={lz}
                  title={deckendeBloecke.length > 0 ? `Abgedeckt in: ${deckendeBloecke.join(', ')}` : 'Nicht abgedeckt'}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius)',
                    background: istAbgedeckt ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                    color: istAbgedeckt ? 'var(--color-success)' : 'var(--color-error)',
                    border: `1px solid ${istAbgedeckt ? 'var(--color-success)' : 'var(--color-error)'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  {istAbgedeckt ? <Check size={12} /> : <Circle size={12} />} {lz}
                </span>
              );
            })}
          </div>

          {fehlendeLernziele.length > 0 && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-warning)', margin: '0.5rem 0 0 0' }}>
              Nicht abgedeckt: {fehlendeLernziele.join(', ')} — Überprüfe die Aufgaben oder passe die Lernziele an.
            </p>
          )}
        </div>
      )}

      {/* Tab-Bar */}
      <div
        role="tablist"
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
      >
        <button
          role="tab"
          aria-selected={activeTab === 'schueler'}
          onClick={() => setActiveTab('schueler')}
          className={activeTab === 'schueler' ? 'btn-primary' : 'btn-secondary'}
          style={{ flex: 1, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <FileText size={16} /> Schülerfassung
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'loesung'}
          onClick={() => setActiveTab('loesung')}
          className={activeTab === 'loesung' ? 'btn-primary' : 'btn-secondary'}
          style={{ flex: 1, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <KeyRound size={16} /> Lösungsfassung
        </button>
      </div>

      {/* Papier-Container */}
      <div
        role="tabpanel"
        style={{
          maxWidth: 800,
          margin: '0 auto',
          background: PAPER_BG,
          padding: '2rem',
          borderRadius: 2,
          boxShadow: '0 2px 12px var(--color-shadow)',
          color: PAPER_TEXT,
        }}
      >
        {activeTab === 'schueler' ? renderSchuelerFassung() : renderLoesungsFassung()}
      </div>

      {/* Pool-Speichern Dialog */}
      {poolDialogBlock && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setPoolDialogBlock(null)}
        >
          <div
            style={{
              background: 'var(--color-bg-surface)',
              borderRadius: 'var(--radius)',
              padding: '1.5rem',
              maxWidth: 400,
              width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>In Aufgaben-Pool speichern</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Block: {BLOCK_TYPE_DEFS.find((d) => d.id === poolDialogBlock.typ)?.label ?? poolDialogBlock.typ}
            </p>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--color-text-secondary)' }}>
                Tags (optional, kommagetrennt)
              </label>
              <input
                type="text"
                value={poolTags}
                onChange={(e) => setPoolTags(e.target.value)}
                placeholder="z.B. Grammatik, Prüfungsvorbereitung"
                style={{ width: '100%', fontSize: '0.875rem' }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--color-text-secondary)' }}>
                Quelle/Hinweis (optional)
              </label>
              <input
                type="text"
                value={poolQuelle}
                onChange={(e) => setPoolQuelle(e.target.value)}
                placeholder="z.B. Aus Schularbeit 2024"
                style={{ width: '100%', fontSize: '0.875rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary"
                onClick={() => setPoolDialogBlock(null)}
              >
                Abbrechen
              </button>
              <button
                className="btn-primary"
                onClick={async () => {
                  const tagsArray = poolTags.split(',').map((t) => t.trim()).filter(Boolean);
                  const success = await addToPool({
                    id: crypto.randomUUID(),
                    fach: state.meta.fach,
                    stufe: state.meta.stufe,
                    schulstufe: state.meta.schulstufe ?? null,
                    thema: state.meta.thema || null,
                    aufgabentyp: poolDialogBlock.typ,
                    tags: tagsArray.length > 0 ? JSON.stringify(tagsArray) : null,
                    block: poolDialogBlock,
                    quelleHinweis: poolQuelle || null,
                  });
                  if (success) {
                    setPoolDialogBlock(null);
                  }
                }}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

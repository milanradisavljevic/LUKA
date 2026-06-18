import { useState } from 'react';
import {
  Loader2, Sparkles, FileDown, ClipboardList, FileType, CheckCircle2,
  AlertTriangle, Timer, Bot, X, Palette, BookOpen, Target, ShieldCheck,
  ChevronRight, ChevronDown, Layers, Wrench,
} from 'lucide-react';
import type { AppState, AppAction } from '../lib/types';
import type { Block } from '@lehrunterlagen/schema';
import { getBlockLabel } from '../lib/blockDefaults';
import { PreviewTwoColumn } from './PreviewTwoColumn';
import { useGenerate } from '../hooks/useGenerate';
import { useExport } from '../hooks/useExport';
import { usePdfExport } from '../hooks/usePdfExport';
import { computeCoverage } from '../lib/coverage';
import { checkLernzielCoverage, checkSchreibaufgabe } from '@lehrunterlagen/llm';
import { RENDER_TEMPLATES } from '@lehrunterlagen/renderer';
import { transformiereLeicht, findeOffeneBlockIds } from '../lib/niveauTransform';


function isTauri(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
}

interface Props {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

export function Step4_Generate({ state, dispatch }: Props) {
  const { generate, regenerateBlock, pruefeLoesungen, cancel, generating, pruefend, stage, elapsedMs, aktiverProvider, error: generateError } = useGenerate(dispatch);
  const { exportDocx, exportDocxOverride, exportKorrekturraster, exportKompetenzraster, exportSelbstlern, exporting, error: exportError, warnung: exportWarnung, lastSavedPaths } = useExport();
  const pdfExport = usePdfExport();
  const isKompetenz = state.meta.modus === 'kompetenz';
  const isFrei = isKompetenz && !!state.generiertesDokument?.meta.freieKompetenz?.trim()
    && (state.generiertesDokument?.meta.stoffItemIds?.length ?? 0) === 0;
  const coverage = isKompetenz && state.generiertesDokument && !isFrei
    ? computeCoverage(state.generiertesDokument.meta)
    : null;
  const [showPdfHint, setShowPdfHint] = useState(false);
  const [pendingExportIssues, setPendingExportIssues] = useState<string[] | null>(null);
  const [niveauExportLabel, setNiveauExportLabel] = useState<string | null>(null);
  const [judge, setJudge] = useState<{ issuesByBlock: Record<string, string[]>; gepruefteIds: string[] } | null>(null);
  // Aktions-Spalte: zwei Akkordeons + Niveau-Auswahl (Mittel = Haupt-Export, hier nur leichter/schwerer).
  const [showDiff, setShowDiff] = useState(false);
  const [showWeitere, setShowWeitere] = useState(false);
  const [niveauLeicht, setNiveauLeicht] = useState(false);
  const [niveauSchwer, setNiveauSchwer] = useState(false);

  // Fortschritts-Anzeige je Stage
  const stageMeta: Record<string, { label: string; step: number }> = {
    idle:    { label: 'Bereit', step: 0 },
    sende:   { label: 'KI formuliert Aufgaben …', step: 1 },
    validiere: { label: 'Struktur und Lösungen werden geprüft …', step: 2 },
    korrigiere: { label: 'KI bessert Beanstandungen nach …', step: 3 },
    fertig:  { label: 'Fertig!', step: 4 },
    fehler:  { label: 'Fehler', step: 0 },
  };
  const currentStage = stageMeta[stage] ?? { label: 'Bereit', step: 0 };
  const totalSteps = 3; // sende → validiere → (optional korrigiere) → fertig

  // Timer formatieren
  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const canGenerate = state.bloecke.length > 0 && !!state.llmProvider
    && (isKompetenz || state.quelltexte.length > 0);
  const canExport = !!state.generiertesDokument;
  const error = generateError ?? exportError ?? pdfExport.error;

  const totalPunkte = state.bloecke.reduce((s, b) => s + b.punkte, 0);

  const runExportWithQualityGate = async () => {
    if (!state.generiertesDokument) return;
    const issues = [
      ...checkLernzielCoverage(state.generiertesDokument, state.generiertesDokument.meta),
      ...checkSchreibaufgabe(state.generiertesDokument, state.quelltexte),
    ].map((issue) => issue.message);
    if (issues.length > 0) {
      setPendingExportIssues(issues);
      return;
    }
    await exportDocx(state);
  };
  const confirmExport = async () => {
    setPendingExportIssues(null);
    await exportDocx(state);
  };

  // Exportiert nur die angehakten Zusatz-Niveaus (Mittel = Haupt-Export „Beide Dokumente").
  // Leicht = reine Transformation (kein LLM). Schwer = Reroll der offenen Blöcke (LLM-Calls),
  // sequentiell mit kleiner Pause, um Provider-Rate-Limits (429) zu vermeiden.
  const exportDifferenzierung = async () => {
    const basis = state.generiertesDokument;
    if (!basis || (!niveauLeicht && !niveauSchwer)) return;

    if (niveauLeicht) {
      setNiveauExportLabel('Leichtere Fassung …');
      await exportDocxOverride(state, transformiereLeicht(basis), 'leicht');
    }

    if (niveauSchwer) {
      setNiveauExportLabel('Schwerere Fassung wird erzeugt …');
      const offeneIds = findeOffeneBlockIds(basis);
      // regenerateBlock liefert den neuen Block zurück; die schwere Fassung wird daraus
      // zusammengesetzt (NICHT aus dem async aktualisierten globalen State → wäre hier stale).
      const originalBloecke = new Map<string, Block>(
        offeneIds.map((id) => [id, basis.bloecke.find((b) => b.id === id)!])
      );
      const regeneriert = new Map<string, Block>();
      for (let i = 0; i < offeneIds.length; i++) {
        const id = offeneIds[i]!;
        const neu = await regenerateBlock(state, id, 'Anspruchsvoller, höheres Bloom-Niveau — präzisere Analyse, komplexere Verknüpfungen, weniger Hilfestellung.');
        if (neu) regeneriert.set(id, neu);
        // Kleine Pause zwischen den Calls gegen 429 (Free-Tier-Rate-Limits).
        if (i < offeneIds.length - 1) await new Promise((r) => setTimeout(r, 800));
      }
      const schwer = { ...basis, bloecke: basis.bloecke.map((b) => regeneriert.get(b.id) ?? b) };
      await exportDocxOverride(state, schwer, 'schwer');

      // Vorschau wieder auf die Original-Fassung zurücksetzen.
      for (const [id, block] of originalBloecke) {
        dispatch({ type: 'UPDATE_GENERIERTER_BLOCK', id, block });
      }
    }
    setNiveauExportLabel(null);
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.25rem' }}>Generieren &amp; Export</h2>

      {/* Quality-Gate Bestätigungsdialog */}
      {pendingExportIssues && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          border: '1px solid var(--color-warning)',
          borderRadius: 'var(--radius)',
          background: 'var(--color-warning-bg)',
        }}>
          <h3 style={{ fontSize: '0.9375rem', marginBottom: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-warning)' }}>
            <AlertTriangle size={16} /> Mögliche Probleme vor dem Export
          </h3>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Nur Hinweise — kein Fehler. Du kannst die Unterlage zurückgehen und anpassen oder trotzdem exportieren.
          </p>
          <ul style={{ margin: '0 0 0.75rem 1.25rem', padding: 0, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
            {pendingExportIssues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn-secondary"
              onClick={() => setPendingExportIssues(null)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              Abbrechen & anpassen
            </button>
            <button
              className="btn-primary"
              onClick={confirmExport}
              disabled={exporting}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              Trotzdem exportieren
            </button>
          </div>
        </div>
      )}

      {/* Formatvorlage */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          <Palette size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} />
          Formatvorlage
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
          {Object.values(RENDER_TEMPLATES).map((tpl) => {
            const aktiv = state.renderTemplate === tpl.id;
            return (
              <button
                key={tpl.id}
                className="tile"
                aria-pressed={aktiv}
                onClick={() => dispatch({ type: 'SET_RENDER_TEMPLATE', template: tpl.id })}
                style={{ fontSize: '0.8125rem' }}
              >
                <strong style={{ fontSize: '0.875rem' }}>{tpl.label}</strong>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                  {tpl.description}
                </span>
                <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--color-accent)', marginTop: '0.25rem' }}>
                  {tpl.font} · {tpl.color.accent !== '000000' ? 'Akzentfarbe' : 'Schwarz-Weiß'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Export-Transparenz */}
      <div className="card" style={{ padding: '0.875rem 1rem', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.8125rem', margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          Beim Export entstehen:{' '}
          <span className="badge badge-info">Schülerfassung (DOCX)</span>{' '}
          <span className="badge badge-info">Lösung (DOCX)</span>{' '}
          <span className="badge badge-info">Korrekturraster</span>
          {isKompetenz && !isFrei && (
            <>{' '}<span className="badge badge-info">Kompetenznachweis</span></>
          )}{' '}
          <span className="badge badge-info">optional PDF</span>
        </p>
      </div>

      {/* Zusammenfassung + Aktionen */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '1rem', marginBottom: '1.5rem',
      }}>
        {/* Zusammenfassung */}
        <div style={{
          padding: '1rem', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
        }}>
          <h3 style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>Zusammenfassung</h3>
          <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Thema', state.meta.thema || '—'],
                ['Fach / Stufe', `${state.meta.fach === 'deutsch' ? 'Deutsch' : 'Englisch'} · ${state.meta.stufe === 'oberstufe' ? 'Oberstufe' : 'Unterstufe'}`],
                ['Blöcke', state.bloecke.map((b) => getBlockLabel(b.typ)).join(', ') || '—'],
                ['Gesamtpunkte', String(totalPunkte)],
                ['KI-Modell', state.llmProvider ? `${state.llmProvider} (${state.modelName})` : '—'],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td style={{ padding: '0.25rem 0.5rem', color: 'var(--color-text-secondary)', width: 110 }}>{label}</td>
                  <td style={{ padding: '0.25rem 0.5rem' }}><strong>{value}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Aktionen */}
        <div style={{
          padding: '1rem', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)', display: 'flex',
          flexDirection: 'column', gap: '0.75rem', justifyContent: 'center',
        }}>
          {/* Schritt 1: Generieren */}
          <button
            className="btn-primary"
            onClick={() => generate(state)}
            disabled={!canGenerate || generating || exporting}
            aria-label={generating ? 'Inhalt wird generiert' : 'Inhalt generieren'}
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.9375rem',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            {generating
              ? <><Loader2 size={16} className="spin" /> Inhalt wird generiert…</>
              : <><Sparkles size={16} /> Inhalt generieren</>}
          </button>

          {/* Schritt 2: Exportieren */}
          <button
            className="btn-secondary"
            onClick={runExportWithQualityGate}
            disabled={!canExport || exporting || generating}
            aria-label="Schülerfassung und Lösung als DOCX exportieren"
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.9375rem',
              opacity: canExport ? 1 : 0.45,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            {exporting
              ? <><Loader2 size={16} className="spin" /> Exportiere…</>
              : <><FileDown size={16} /> Beide Dokumente exportieren</>}
          </button>

          {/* — Differenzierung (Akkordeon) — Mittel ist der Haupt-Export oben — */}
          {canExport && (
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setShowDiff((v) => !v)}
                aria-expanded={showDiff}
                style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '0.6rem 0.85rem', fontSize: '0.875rem', color: 'var(--color-text-primary)',
                  display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {showDiff ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                <Layers size={15} /> Differenzierung
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>leichter · schwerer</span>
              </button>
              {showDiff && (
                <div style={{ padding: '0 0.85rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Mittel ist die Standardfassung („Beide Dokumente" oben). Hier zusätzliche Niveaus erzeugen:
                  </p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={niveauLeicht} onChange={(e) => setNiveauLeicht(e.target.checked)} />
                    Leichtere Fassung <span style={{ color: 'var(--color-text-secondary)' }}>· ohne KI, sofort</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={niveauSchwer} onChange={(e) => setNiveauSchwer(e.target.checked)} />
                    Schwerere Fassung <span style={{ color: 'var(--color-text-secondary)' }}>· erzeugt offene Aufgaben neu (KI, dauert kurz)</span>
                  </label>
                  <button
                    className="btn-secondary"
                    onClick={exportDifferenzierung}
                    disabled={exporting || generating || (!niveauLeicht && !niveauSchwer) || !!niveauExportLabel}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', borderStyle: 'dashed',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    {niveauExportLabel
                      ? <><Loader2 size={15} className="spin" /> {niveauExportLabel}</>
                      : <><FileDown size={15} /> Erzeugen & exportieren</>}
                  </button>
                  {!niveauLeicht && !niveauSchwer && (
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', margin: 0 }}>Mindestens eine Fassung wählen.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* — Weitere Exporte & Werkzeuge (Akkordeon) — */}
          {canExport && (
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setShowWeitere((v) => !v)}
                aria-expanded={showWeitere}
                style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '0.6rem 0.85rem', fontSize: '0.875rem', color: 'var(--color-text-primary)',
                  display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {showWeitere ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                <Wrench size={15} /> Weitere Exporte & Werkzeuge
              </button>
              {showWeitere && (
                <div style={{ padding: '0 0.85rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    className="btn-secondary"
                    onClick={async () => { const r = await pruefeLoesungen(state); setJudge(r); }}
                    disabled={exporting || generating || pruefend}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', borderStyle: 'dashed',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    {pruefend
                      ? <><Loader2 size={15} className="spin" /> Prüfe Lösungen …</>
                      : <><ShieldCheck size={15} /> Lösungen prüfen</>}
                  </button>
                  {judge && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', textAlign: 'center', margin: 0 }}>
                      {judge.gepruefteIds.length} geprüft · {Object.keys(judge.issuesByBlock).length} auffällig
                    </p>
                  )}
                  <button
                    className="btn-secondary"
                    onClick={() => exportKorrekturraster(state)}
                    disabled={exporting || generating}
                    aria-label="Korrekturraster als DOCX exportieren"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', borderStyle: 'dashed',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <ClipboardList size={15} /> Korrekturraster exportieren
                  </button>
                  {isKompetenz && !isFrei && (
                    <button
                      className="btn-secondary"
                      onClick={() => exportKompetenzraster(state)}
                      disabled={exporting || generating}
                      aria-label="Kompetenznachweis als DOCX exportieren"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', borderStyle: 'dashed',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                    >
                      <Target size={15} /> Kompetenznachweis exportieren
                    </button>
                  )}
                  <button
                    className="btn-secondary"
                    onClick={() => { if (isTauri()) pdfExport.startPdfExport(); else setShowPdfHint(true); }}
                    disabled={pdfExport.converting}
                    aria-label="Dokument als PDF speichern"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', borderStyle: 'dotted',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    {pdfExport.converting
                      ? <><Loader2 size={15} className="spin" /> PDF wird erstellt…</>
                      : <><FileType size={15} /> Als PDF speichern</>}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => exportSelbstlern(state)}
                    disabled={exporting || generating}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', borderStyle: 'dashed',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <FileDown size={15} /> Übung mit Lösungsteil
                  </button>
                </div>
              )}
            </div>
          )}

          {lastSavedPaths && (
            <div style={{
              padding: '0.5rem 0.75rem',
              background: 'var(--color-success-bg)',
              borderRadius: 'var(--radius)',
              fontSize: '0.75rem',
              lineHeight: 1.5,
            }}>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                <CheckCircle2 size={14} color="var(--color-success)" /> Dateien heruntergeladen:
              </strong>
              <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0 }}>
                {lastSavedPaths.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0' }}>
                Suchen Sie im Ordner "Downloads" Ihres Computers.
              </p>
            </div>
          )}

          {canExport && !lastSavedPaths && (
            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textAlign: 'center', margin: 0 }}>
              Schülerfassung + Lösung als DOCX · weitere unter „Weitere Exporte"
            </p>
          )}

          {error && (
            <p style={{ color: 'var(--color-error)', fontSize: '0.75rem', margin: 0 }}>{error}</p>
          )}

          {exportWarnung && (
            <p style={{
              color: 'var(--color-warning)', background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning)',
              borderRadius: 'var(--radius)', padding: '0.5rem 0.625rem', fontSize: '0.75rem', margin: 0,
              display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {exportWarnung}
            </p>
          )}

          {!canGenerate && (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textAlign: 'center', margin: 0 }}>
              {isKompetenz
                ? 'Aufgabenblöcke und KI-Modell erforderlich (kein Quelltext nötig).'
                : 'Quelltexte, Aufgabenblöcke und KI-Modell erforderlich.'}
            </p>
          )}

        </div>
      </div>

      {/* Frei definierte Kompetenz/Thema (kein formaler Nachweis) */}
      {isFrei && state.generiertesDokument && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          background: 'var(--color-bg-surface)',
        }}>
          <h3 style={{ fontSize: '0.9375rem', marginBottom: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            <BookOpen size={16} /> Frei definierte Kompetenz / Thema
          </h3>
          <p style={{ fontSize: '0.8125rem', margin: 0, color: 'var(--color-text-secondary)' }}>
            „{state.generiertesDokument.meta.freieKompetenz}"
          </p>
          <p style={{ fontSize: '0.75rem', margin: '0.5rem 0 0', color: 'var(--color-text-secondary)' }}>
            Ohne Katalog-Item ist kein formaler Lehrplan-Nachweis verfügbar.
          </p>
        </div>
      )}

      {/* Kompetenzabdeckung (nur Kompetenz-Modus nach Generierung) */}
      {coverage && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          background: 'var(--color-bg-surface)',
        }}>
          <h3 style={{ fontSize: '0.9375rem', marginBottom: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            <BookOpen size={16} /> Kompetenzabdeckung
          </h3>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-success)' }}>
              <CheckCircle2 size={14} /> {coverage.abgedeckt.length} abgedeckt
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-text-secondary)' }}>
              <X size={14} /> {coverage.fehlend.length} fehlend
            </span>
          </div>

          <div style={{ maxHeight: 240, overflow: 'auto', fontSize: '0.75rem' }}>
            {coverage.items.map((item) => (
              <div key={item.id} style={{ marginBottom: '0.75rem' }}>
                <strong style={{ fontSize: '0.8125rem' }}>{item.titel}</strong>
                <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0, color: 'var(--color-success)' }}>
                  {item.deskriptoren.map((d) => (
                    <li key={d.id}>{d.code ? `${d.code} — ` : ''}{d.text}</li>
                  ))}
                </ul>
              </div>
            ))}
            {coverage.fehlend.length > 0 && (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                <strong style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Noch nicht abgedeckte Deskriptoren</strong>
                <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0, color: 'var(--color-text-secondary)' }}>
                  {coverage.fehlend.map((d) => (
                    <li key={d.id}>{d.code ? `${d.code} — ` : ''}{d.text}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wartebildschirm */}
      {generating && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--color-bg-backdrop)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          {/* Spinner */}
          <div style={{
            width: 48, height: 48,
            border: '4px solid var(--color-bg-base)',
            borderTop: '4px solid var(--color-accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1.5rem',
          }} />
          <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>

          {/* Status-Text */}
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem' }}>
            {currentStage.label}
          </h3>

          {/* Fortschrittsbalken */}
          <div style={{
            width: 280, height: 6,
            background: 'var(--color-bg-base)',
            borderRadius: 3,
            marginBottom: '1rem',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.min(100, (currentStage.step / totalSteps) * 100)}%`,
              height: '100%',
              background: 'var(--color-accent)',
              borderRadius: 3,
              transition: 'width 0.4s ease',
            }} />
          </div>

          {/* Timer + Provider */}
          <div style={{
            display: 'flex', gap: '1rem',
            fontSize: '0.8125rem', color: 'var(--color-text-secondary)',
            marginBottom: '1.5rem',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              <Timer size={14} /> {formatTime(elapsedMs)}
            </span>
            {aktiverProvider && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                <Bot size={14} /> {aktiverProvider}
              </span>
            )}
          </div>

          {/* Hinweis */}
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', maxWidth: 360, textAlign: 'center', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            Das Generieren der Inhalte kann bis zu 2 Minuten dauern, je nach Modell und Komplexität.
          </p>

          {/* Abbrechen-Button */}
          <button
            className="btn-secondary"
            onClick={cancel}
            style={{ fontSize: '0.8125rem', padding: '0.4rem 1rem',
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <X size={14} /> Abbrechen
          </button>
        </div>
      )}

      {/* PDF-Wartebildschirm (separat, einfacher) */}
      {pdfExport.converting && !generating && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--color-bg-backdrop)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <div style={{
            width: 48, height: 48,
            border: '4px solid var(--color-bg-base)',
            borderTop: '4px solid var(--color-accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1.5rem',
          }} />
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem' }}>
            PDF wird erstellt…
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', maxWidth: 360, textAlign: 'center', lineHeight: 1.5 }}>
            LibreOffice konvertiert das Dokument. Dies dauert in der Regel wenige Sekunden.
          </p>
        </div>
      )}

      {/* Zweispaltige Vorschau */}
      {state.bloecke.length > 0 && (
        <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: '1rem' }}>
          <h3 style={{ fontSize: '0.9375rem', marginBottom: '0.75rem' }}>
            Vorschau
            {state.generiertesDokument && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)',
                marginLeft: '0.75rem', fontWeight: 400,
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle2 size={13} /> mit generiertem Inhalt
              </span>
            )}
          </h3>
          <PreviewTwoColumn state={state} dispatch={dispatch} judge={judge ?? undefined} />
        </div>
      )}

      {/* PDF-Hinweis Modal (Browser-Dev) */}
      {showPdfHint && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--color-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setShowPdfHint(false)}>
          <div style={{
            background: 'var(--color-bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius)',
            maxWidth: 420, width: '90%', boxShadow: '0 8px 32px var(--color-shadow)',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '0.75rem' }}>PDF erstellen</h3>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
              Die Web-App exportiert <strong>DOCX</strong>-Dateien (Word-Format).
              Um eine PDF zu erhalten:
            </p>
            <ol style={{ fontSize: '0.875rem', lineHeight: 1.6, paddingLeft: '1.25rem', marginBottom: '1.25rem' }}>
              <li>Laden Sie die DOCX-Datei herunter.</li>
              <li>Öffnen Sie sie in <strong>Microsoft Word</strong> oder <strong>LibreOffice Writer</strong>.</li>
              <li>Wählen Sie <em>Datei &rsaquo; Als PDF exportieren</em> (oder Drucken &rsaquo; Als PDF speichern).</li>
            </ol>
            <button
              className="btn-primary"
              onClick={() => setShowPdfHint(false)}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              Verstanden
            </button>
          </div>
        </div>
      )}

      {/* PDF-Pfad-Input Modal (Tauri) */}
      {pdfExport.showPathInput && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--color-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={pdfExport.closePathInput}>
          <div style={{
            background: 'var(--color-bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius)',
            maxWidth: 520, width: '90%', boxShadow: '0 8px 32px var(--color-shadow)',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '0.5rem' }}>PDF aus DOCX erstellen</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Geben Sie den vollständigen Pfad zur DOCX-Datei ein.
              Beispiel: <code style={{ background: 'var(--color-bg-base)', padding: '0.125rem 0.25rem', borderRadius: '4px' }}>C:\Users\…\Downloads\Datei.docx</code>
            </p>

            <input
              type="text"
              value={pdfExport.docxPath}
              onChange={(e) => pdfExport.setDocxPath(e.target.value)}
              placeholder="Pfad zur DOCX-Datei…"
              autoFocus
              style={{ marginBottom: '0.75rem' }}
            />

            {pdfExport.pdfPath && (
              <div style={{
                padding: '0.75rem', background: 'var(--color-success-bg)', borderRadius: 'var(--radius)',
                marginBottom: '0.75rem', fontSize: '0.8125rem',
              }}>
                <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  <CheckCircle2 size={14} color="var(--color-success)" /> PDF erstellt:
                </strong><br />
                <code style={{ wordBreak: 'break-all' }}>{pdfExport.pdfPath}</code>
              </div>
            )}

            {pdfExport.error && (
              <div style={{
                padding: '0.75rem', background: 'var(--color-error-bg)', borderRadius: 'var(--radius)',
                marginBottom: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-error)',
              }}>
                {pdfExport.error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn-primary"
                onClick={pdfExport.convertToPdf}
                disabled={pdfExport.converting}
                style={{ flex: 1, padding: '0.5rem',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                {pdfExport.converting
                  ? <><Loader2 size={15} className="spin" /> Erstelle PDF…</>
                  : 'PDF erstellen'}
              </button>
              <button
                className="btn-secondary"
                onClick={pdfExport.closePathInput}
                style={{ padding: '0.5rem 1rem' }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

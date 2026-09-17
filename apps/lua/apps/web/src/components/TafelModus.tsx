import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Minus, Plus, X } from 'lucide-react';
import type { Block, Meta, QuellText } from '@lehrunterlagen/schema';
import { BlockPreview } from './BlockPreview';
import { buildTafelSlides, clampFontScale, countSolutions } from '../lib/tafel';

interface Props {
  meta: Meta;
  bloecke: Block[];
  quelltexte?: QuellText[];
  onClose: () => void;
}

function splitAbsatz(text: string): string[] {
  return text
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function TafelModus({ meta, bloecke, quelltexte, onClose }: Props) {
  const slides = useMemo(() => buildTafelSlides(bloecke, quelltexte), [bloecke, quelltexte]);
  const [index, setIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [solutionStep, setSolutionStep] = useState(0);
  const [scale, setScale] = useState(1);
  const current = slides[index];

  const totalSteps = useMemo(() => {
    if (!current || current.kind !== 'block') return 0;
    return countSolutions(current.block);
  }, [current]);

  const hasStepwise = totalSteps > 1;

  const go = useCallback((delta: number) => {
    setIndex((prev) => Math.min(slides.length - 1, Math.max(0, prev + delta)));
  }, [slides.length]);

  const changeScale = useCallback((delta: number) => {
    setScale((prev) => clampFontScale(prev + delta));
  }, []);

  const advanceSolution = useCallback(() => {
    if (!hasStepwise) {
      setShowSolution((v) => !v);
      return;
    }
    setSolutionStep((prev) => {
      if (prev >= totalSteps) return 0;
      return prev + 1;
    });
    if (!showSolution) setShowSolution(true);
  }, [hasStepwise, totalSteps, showSolution]);

  useEffect(() => {
    setShowSolution(false);
    setSolutionStep(0);
  }, [index]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        if (event.key === ' ') event.preventDefault();
        go(1);
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        go(-1);
        return;
      }
      if (event.key.toLowerCase() === 'l') {
        advanceSolution();
        return;
      }
      if (event.key === '+' || event.key === '=') {
        changeScale(0.15);
        return;
      }
      if (event.key === '-' || event.key === '_') {
        changeScale(-0.15);
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [advanceSolution, changeScale, go, onClose]);

  if (!current) return null;

  const title = meta.thema?.trim() || 'Tafel-Modus';

  const solutionLabel = hasStepwise
    ? `Lösung ${solutionStep > 0 ? `${Math.min(solutionStep, totalSteps)}/${totalSteps}` : '0/' + totalSteps}`
    : 'Lösung (L)';

  const solutionIcon = hasStepwise
    ? solutionStep > 0
      ? <Eye size={17} />
      : <EyeOff size={17} />
    : showSolution
      ? <EyeOff size={17} />
      : <Eye size={17} />;

  return (
    <div
      className="tafel-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Tafel-Modus"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2500,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header className="tafel-header">
        <div className="tafel-header-title">
          <strong>{title}</strong>
          <span>{index + 1} / {slides.length}</span>
        </div>
        <div className="tafel-header-actions">
          <button type="button" className="btn-secondary" onClick={() => go(-1)} disabled={index === 0} title="Vorherige Folie">
            <ChevronLeft size={17} />
          </button>
          <button type="button" className="btn-secondary" onClick={() => go(1)} disabled={index === slides.length - 1} title="Nächste Folie">
            <ChevronRight size={17} />
          </button>
          <button type="button" className="btn-secondary" onClick={() => changeScale(-0.15)} title="Schrift kleiner">
            <Minus size={17} />
          </button>
          <button type="button" className="btn-secondary" onClick={() => changeScale(0.15)} title="Schrift größer">
            <Plus size={17} />
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={advanceSolution}
            aria-pressed={hasStepwise ? solutionStep > 0 : showSolution}
            title={hasStepwise ? 'Nächste Lösung aufdecken (L)' : 'Lösung ein- oder ausblenden (L)'}
          >
            {solutionIcon}
            {solutionLabel}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose} title="Beenden (Esc)">
            <X size={17} />
            Beenden (Esc)
          </button>
        </div>
      </header>

      <main className="tafel-stage">
        <section
          className="tafel-slide"
          style={{ fontSize: `calc(1.25rem * ${scale})` }}
        >
          {current.kind === 'quelltext' ? (
            <article className="tafel-quelltext">
              <p className="tafel-kicker">Quelltext</p>
              <h2>{current.quelltext.titel.trim() || 'Text'}</h2>
              {splitAbsatz(current.quelltext.inhalt).map((absatz, i) => (
                <p key={i}>{absatz}</p>
              ))}
            </article>
          ) : (
            <div className="tafel-block">
              <BlockPreview
                block={current.block}
                showSolution={hasStepwise ? solutionStep > 0 : showSolution}
                solutionStep={hasStepwise ? solutionStep : undefined}
              />
              {current.block.hinweis && (
                <div style={{
                  marginTop: '0.75rem', padding: '0.5rem 0.75rem',
                  background: 'rgba(255,255,255,0.08)', borderRadius: 4,
                  fontSize: '0.85em', fontStyle: 'italic',
                  borderLeft: '3px solid rgba(255,255,255,0.3)',
                }}>
                  <strong>Hinweis:</strong> {current.block.hinweis}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

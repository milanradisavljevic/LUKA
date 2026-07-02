import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Minus, Plus, X } from 'lucide-react';
import type { Block, Meta, QuellText } from '@lehrunterlagen/schema';
import { BlockPreview } from './BlockPreview';
import { buildTafelSlides, clampFontScale } from '../lib/tafel';

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
  const [scale, setScale] = useState(1);
  const current = slides[index];

  const go = useCallback((delta: number) => {
    setIndex((prev) => Math.min(slides.length - 1, Math.max(0, prev + delta)));
  }, [slides.length]);

  const changeScale = useCallback((delta: number) => {
    setScale((prev) => clampFontScale(prev + delta));
  }, []);

  useEffect(() => {
    setShowSolution(false);
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
        setShowSolution((value) => !value);
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
  }, [changeScale, go, onClose]);

  if (!current) return null;

  const title = meta.thema?.trim() || 'Tafel-Modus';

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
            onClick={() => setShowSolution((value) => !value)}
            aria-pressed={showSolution}
            title="Lösung ein- oder ausblenden"
          >
            {showSolution ? <EyeOff size={17} /> : <Eye size={17} />}
            Lösung (L)
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
              <BlockPreview block={current.block} showSolution={showSolution} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

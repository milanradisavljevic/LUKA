import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

/**
 * Kleines Info-„i" neben Feldern/Labels: Hover ODER Tastatur-Fokus zeigt eine
 * Erklärblase. Bewusst kein natives title-Attribut (Anzeige-Delay, kein
 * Fokus-Support) und keine Dauer-Animation (WSLg-Render-Limits).
 */
export function InfoDot({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<CSSProperties>({});
  const updatePosition = useCallback(() => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ position: 'fixed', left: Math.max(12, Math.min(rect.left - 140, window.innerWidth - 292)),
      // Die unbenutzte Kante ausdrücklich zurücksetzen: undefined würde die
      // alte CSS-bottom-Regel aktiv lassen und die Blasenhöhe kollabieren.
      top: rect.top < 160 ? rect.bottom + 8 : 'auto',
      bottom: rect.top >= 160 ? window.innerHeight - rect.top + 8 : 'auto',
      transform: 'none', zIndex: 20000, maxWidth: 'min(280px, calc(100vw - 24px))' });
  }, []);
  const show = () => { updatePosition(); setOpen(true); };
  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => { window.removeEventListener('resize', updatePosition); window.removeEventListener('scroll', updatePosition, true); };
  }, [open, updatePosition]);
  return (
    <span
      ref={trigger}
      className="info-dot"
      tabIndex={0}
      role="button"
      aria-label={text}
      aria-expanded={open}
      aria-describedby={open ? id : undefined}
      onMouseEnter={show}
      onMouseLeave={() => { if (document.activeElement !== trigger.current) setOpen(false); }}
      onFocus={show}
      onBlur={() => setOpen(false)}
      onClick={event => { event.preventDefault(); event.stopPropagation(); show(); }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); }
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); show(); }
      }}
    >
      <Info size={13} aria-hidden="true" />
      {open && createPortal(<span id={id} role="tooltip" className="info-dot-bubble" style={position}>{text}</span>, document.body)}
    </span>
  );
}

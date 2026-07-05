import { useState } from 'react';
import { Info } from 'lucide-react';

/**
 * Kleines Info-„i" neben Feldern/Labels: Hover ODER Tastatur-Fokus zeigt eine
 * Erklärblase. Bewusst kein natives title-Attribut (Anzeige-Delay, kein
 * Fokus-Support) und keine Dauer-Animation (WSLg-Render-Limits).
 */
export function InfoDot({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="info-dot"
      tabIndex={0}
      role="note"
      aria-label={text}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
    >
      <Info size={13} aria-hidden="true" />
      {open && <span className="info-dot-bubble">{text}</span>}
    </span>
  );
}

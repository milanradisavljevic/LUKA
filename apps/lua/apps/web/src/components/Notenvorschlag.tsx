/** Eine KI-Empfehlung behält ihren Prüfstatus an jeder sichtbaren Notenstelle. */
export function notenvorschlagText(note: number | null | undefined, vorlaeufig = false): string {
  const value = note != null && Number.isFinite(note) ? `KI-Notenvorschlag ${note}` : 'Feedback vorhanden';
  return value + (vorlaeufig ? ' – vorläufig, Prüfung erforderlich' : '');
}

export function Notenvorschlag({ note, vorlaeufig = false }: { note: number | null; vorlaeufig?: boolean }) {
  const hasGrade = note !== null && Number.isFinite(note);
  return <span aria-label={notenvorschlagText(note, vorlaeufig)}>
    {hasGrade ? note.toFixed(1) : '—'}
    {hasGrade && vorlaeufig && <span style={{ display: 'block', fontSize: '.72rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>vorläufig – Prüfung erforderlich</span>}
  </span>;
}

/** Prüft, ob ein Quelltext aus einem Korrektur-Prefill den Text-Modus trägt. */
export function bewertePrefillQuelle(ausgangstext: string | undefined): 'ok' | 'fehlt' | 'zu_kurz' {
  const text = ausgangstext?.trim() ?? '';
  if (!text) return 'fehlt';

  const woerter = text.split(/\s+/).length;
  return woerter < 80 ? 'zu_kurz' : 'ok';
}

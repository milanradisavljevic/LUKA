// Lesbare Titel aus URLs ableiten, wenn der Import keinen echten Seitentitel liefert.

// Erkennt URL-artige „Titel" (z. B. wenn fetch_url die URL als Titel zurückgab).
export function istUrlArtig(s: string): boolean {
  const t = s.trim();
  return /^https?:\/\//i.test(t) || (!/\s/.test(t) && /\.[a-z]{2,}\//i.test(t));
}

// Baut aus einer URL einen lesbaren Titel: Hostname + (falls vorhanden) letzter
// Pfad-Slug in Worten. Fallback: Hostname bzw. gekappte URL.
export function titelAusUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, '');
    const seg = u.pathname.split('/').filter(Boolean).pop() ?? '';
    const slug = seg
      .replace(/\.[a-z0-9]+$/i, '') // Dateiendung entfernen
      .replace(/[-_]+/g, ' ') // Trenner → Leerzeichen
      .replace(/\b\d{3,}\b/g, '') // lange Zahlen-IDs entfernen
      .replace(/\s+/g, ' ')
      .trim();
    return (slug ? `${host} – ${slug}` : host).slice(0, 120);
  } catch {
    return url.replace(/^https?:\/\//i, '').slice(0, 120);
  }
}

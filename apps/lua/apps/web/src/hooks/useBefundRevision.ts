import { useEffect, useState } from 'react';

/** Bereits geöffnete Auswertungen nach gespeicherten Lehrkraftentscheidungen laden. */
export function useBefundRevision(): number {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const changed = () => setRevision(value => value + 1);
    window.addEventListener('luka:befunde-geaendert', changed);
    return () => window.removeEventListener('luka:befunde-geaendert', changed);
  }, []);
  return revision;
}

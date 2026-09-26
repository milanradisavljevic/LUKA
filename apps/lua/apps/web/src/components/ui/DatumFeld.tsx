import { useEffect, useId, useState } from 'react';
import { formatiereDatumDE, parseDatumDE } from '../../lib/zeitFeld';
import type { IsoDatum } from '../../lib/lokalDatum';

/**
 * Datumseingabe im deutschen Format `TT.MM.JJJJ`.
 *
 *  Ersetzt `<input type="date">`, das je nach WebView `09/21/2026` anzeigt und
 *  damit Monat und Tag vertauscht. Hier ist die Schreibweise fest, und es wird
 *  nur bei einem **realen** Kalendertag gemeldet - der 31. Februar kann nicht
 *  gespeichert werden.
 *
 *  Der Wert wird erst nach gültiger Eingabe weitergegeben, damit ein halb
 *  getippter Text nicht schon das Datum verschiebt.
 */
export function DatumFeld({
  wert, onChange, label, id, min, max, disabled, fehlerText = 'Bitte als TT.MM.JJJJ eingeben.',
}: {
  wert: IsoDatum | null | undefined;
  onChange: (wert: IsoDatum) => void;
  label: string;
  id?: string;
  min?: IsoDatum;
  max?: IsoDatum;
  disabled?: boolean;
  fehlerText?: string;
}) {
  const autoId = useId();
  const feldId = id ?? autoId;
  const [text, setText] = useState(() => formatiereDatumDE(wert));
  const [fehler, setFehler] = useState<string | null>(null);

  // Von außen geänderte Werte übernehmen (z. B. nach dem Speichern).
  useEffect(() => {
    setText(formatiereDatumDE(wert));
    setFehler(null);
  }, [wert]);

  const pruefen = (roherText: string) => {
    const iso = parseDatumDE(roherText);
    if (!iso) { setFehler(fehlerText); return; }
    if (min && iso < min) { setFehler(`Das Datum liegt vor dem Schuljahresbeginn (${formatiereDatumDE(min)}).`); return; }
    if (max && iso > max) { setFehler(`Das Datum liegt nach dem Schuljahresende (${formatiereDatumDE(max)}).`); return; }
    setFehler(null);
    onChange(iso);
  };

  return (
    <span className="datumfeld">
      <label htmlFor={feldId}>{label}</label>
      <input
        id={feldId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="TT.MM.JJJJ"
        value={text}
        disabled={disabled}
        aria-invalid={fehler ? 'true' : undefined}
        aria-describedby={fehler ? `${feldId}-fehler` : undefined}
        onChange={(e) => {
          setText(e.target.value);
          if (fehler) setFehler(null);
        }}
        onBlur={(e) => pruefen(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); pruefen((e.target as HTMLInputElement).value); }
        }}
      />
      {fehler && <span className="datumfeld-fehler" id={`${feldId}-fehler`}>{fehler}</span>}
    </span>
  );
}

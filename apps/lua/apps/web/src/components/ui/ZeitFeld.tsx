import { useId } from 'react';
import { zeitOptionen } from '../../lib/zeitFeld';

/**
 * Uhrzeitauswahl in **24 Stunden**, unabhängig von der Locale der WebView.
 *
 *  Ersetzt `<input type="time">`, das je nach System „12:30 PM" anzeigt. Der
 *  Wert ist `HH:MM` oder leer für „keine Uhrzeit".
 */
export function ZeitFeld({
  wert, onChange, label, id, disabled, allowEmpty = true, leerText = 'keine Uhrzeit',
}: {
  wert: string | null | undefined;
  onChange: (wert: string) => void;
  label: string;
  id?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  leerText?: string;
}) {
  const autoId = useId();
  const feldId = id ?? autoId;
  const optionen = zeitOptionen(wert);
  return (
    <span className="zeitfeld">
      <label htmlFor={feldId}>{label}</label>
      <select
        id={feldId}
        value={wert ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {allowEmpty && <option value="">{leerText}</option>}
        {optionen.map((z) => <option key={z} value={z}>{z}</option>)}
      </select>
    </span>
  );
}

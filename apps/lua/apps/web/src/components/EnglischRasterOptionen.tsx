import { englischRasterOptionen, type EnglischRasterEntwurf } from '../lib/englischRaster';

export function EnglischRasterOptionen({ value, onChange }: {
  value: EnglischRasterEntwurf;
  onChange: (value: EnglischRasterEntwurf) => void;
}) {
  let fehler = '';
  try { englischRasterOptionen(value); } catch (e) { fehler = (e as Error).message; }
  return <fieldset style={{ marginTop: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.75rem' }}>
    <legend>Englisch-SRDP: Rasterpunkte und Notenschlüssel</legend>
    <p style={{ fontSize: '0.8125rem' }}>Vier Kriterien mit jeweils 0–10 Punkten. Fachliche Lehrkraftabnahme des Profils steht noch aus. Ohne bestätigten Schlüssel entsteht keine automatische Notenempfehlung.</p>
    <label>Vorgegebene Wortanzahl <input type="number" min={1} max={10000} step={1}
      value={value.wortanzahl} onChange={e => onChange({ ...value, wortanzahl: e.target.value, bestaetigt: false })} /></label>
    <p style={{ fontSize: '0.75rem' }}>Individueller Notenschlüssel: Mindestprozente je Note. Die App gibt keinen amtlichen Standardschlüssel vor.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {value.grenzen.map((grenze, i) => <label key={i} style={{ fontSize: '0.8125rem' }}>
        Note {i + 1} ab (%) <input type="number" min={0} max={100} step="any" value={grenze}
          aria-label={`Mindestprozente Note ${i + 1}`} disabled={i === 4} style={{ width: 75 }}
          onChange={e => onChange({ ...value, grenzen: value.grenzen.map((g, j) => j === i ? e.target.value : g), bestaetigt: false })} />
      </label>)}
    </div>
    <label style={{ display: 'block', marginTop: '0.75rem', fontSize: '0.8125rem' }}>
      <input type="checkbox" checked={value.bestaetigt}
        onChange={e => onChange({ ...value, bestaetigt: e.target.checked })} /> Diesen individuellen Notenschlüssel für den gewählten Auftrag bestätigen.
    </label>
    {fehler && <p role="alert">{fehler}</p>}
  </fieldset>;
}

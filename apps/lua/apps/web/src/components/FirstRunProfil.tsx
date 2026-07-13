import { useState } from 'react';
import {
  DEFAULT_LEHRER_PROFIL,
  clearTeacherProfileCache,
  saveTeacherProfile,
  type LehrerProfil,
  type ProfileLand,
} from '../lib/profile';
import { REGION_AT, REGION_DE, SCHULFORMEN_AT, SCHULFORMEN_DE } from '../lib/profileOptions';
import { FACH_META, schulstufeLabel, schulstufenFuerLand } from '@lehrunterlagen/schema';

interface FirstRunProfilProps {
  /** Wird nach erfolgreichem Speichern ODER Überspringen aufgerufen — beides zählt als „gesehen". */
  onContinue: () => void;
}

/**
 * Kompakter First-Run-Schritt: einmal beim ersten Start der Desktop-App, damit die
 * persönliche Begrüßung im Dashboard ab Minute 1 greift. Auch „Später" speichert eine
 * (unveränderte) Standard-Profil-Zeile — das ist der „schon gesehen"-Marker, damit der
 * Schritt nie wieder erscheint.
 */
export function FirstRunProfil({ onContinue }: FirstRunProfilProps) {
  const [profile, setProfile] = useState<LehrerProfil>({ ...DEFAULT_LEHRER_PROFIL });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<LehrerProfil>) => {
    setProfile((current) => ({ ...current, ...patch }));
    setError(null);
  };
  const toggle = (key: 'faecher' | 'schulstufen', value: string | number) => {
    const values = profile[key] as Array<string | number>;
    const next = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
    update({ [key]: next } as Partial<LehrerProfil>);
  };

  const persist = async (toSave: LehrerProfil) => {
    setSaving(true);
    setError(null);
    try {
      await saveTeacherProfile(toSave);
      clearTeacherProfileCache();
      onContinue();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  const handleSave = () => { void persist(profile); };
  const handleSkip = () => { void persist({ ...DEFAULT_LEHRER_PROFIL }); };

  const labelStyle = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' } as const;
  const groupStyle = { display: 'flex', flexWrap: 'wrap', gap: '0.375rem 0.75rem', padding: '0.625rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' } as const;
  const checkLabel = { display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', cursor: 'pointer' } as const;

  return (
    <div>
      <h2 id="first-run-profile-title" style={{ marginBottom: '0.5rem' }}>Kurz zu dir</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
        Das dauert eine Minute und bleibt lokal auf diesem Gerät. Es steuert Vorbelegungen für
        neue Unterlagen und die persönliche Begrüßung im Dashboard.
      </p>
      <fieldset disabled={saving} style={{ display: 'grid', gap: '1rem', border: 0, padding: 0, margin: 0 }}>
        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div>
            <label style={labelStyle}>Anzeigename</label>
            <input
              value={profile.displayName}
              onChange={(e) => update({ displayName: e.target.value })}
              placeholder="z. B. Frau M."
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Land</label>
            <select value={profile.land} onChange={(e) => update({ land: e.target.value as ProfileLand })} style={{ width: '100%' }}>
              <option value="AT">Österreich</option>
              <option value="CH">Schweiz</option>
              <option value="DE">Deutschland</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Schulform</label>
            <select value={profile.schulform} onChange={(e) => update({ schulform: e.target.value })} style={{ width: '100%' }}>
              <option value="">— auswählen —</option>
              {(profile.land === 'DE' ? SCHULFORMEN_DE : SCHULFORMEN_AT).map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          {profile.land === 'AT' && (
            <div>
              <label style={labelStyle}>Bundesland</label>
              <select value={profile.regionAt} onChange={(e) => update({ regionAt: e.target.value })} style={{ width: '100%' }}>
                <option value="">— nicht angegeben —</option>
                {REGION_AT.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
            </div>
          )}
          {profile.land === 'DE' && (
            <div>
              <label style={labelStyle}>Bundesland</label>
              <select value={profile.regionDe} onChange={(e) => update({ regionDe: e.target.value })} style={{ width: '100%' }}>
                <option value="">— nicht angegeben —</option>
                {REGION_DE.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
            </div>
          )}
          {profile.land === 'CH' && (
            <div>
              <label style={labelStyle}>Kanton (optional)</label>
              <input
                value={profile.regionCh}
                onChange={(e) => update({ regionCh: e.target.value })}
                placeholder="optional"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle}>Meine Fächer</label>
          <div style={groupStyle}>
            {Object.entries(FACH_META).map(([fach, meta]) => (
              <label key={fach} style={checkLabel}>
                <input type="checkbox" checked={profile.faecher.includes(fach)} onChange={() => toggle('faecher', fach)} />
                {meta.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Meine Schulstufen</label>
          <div style={groupStyle}>
            {schulstufenFuerLand(profile.land).map((stufe) => (
              <label key={stufe} style={checkLabel}>
                <input type="checkbox" checked={profile.schulstufen.includes(stufe)} onChange={() => toggle('schulstufen', stufe)} />
                {schulstufeLabel(stufe, profile.land)}
              </label>
            ))}
          </div>
        </div>

        {error && <p style={{ color: 'var(--color-error)', fontSize: '0.8125rem', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Speichere …' : 'Profil speichern'}
          </button>
          <button className="btn-secondary" onClick={handleSkip} disabled={saving}>
            Später in den Einstellungen
          </button>
        </div>
      </fieldset>
    </div>
  );
}

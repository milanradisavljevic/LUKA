import { useState } from 'react';
import { Check, Database, Download } from 'lucide-react';
import type { AppSettings, LlmProvider } from '../lib/types';
import { LLM_PROVIDERS } from '../lib/constants';
import { FEATURES } from '../lib/features';
import { CREATIVITY_PRESETS } from '../lib/creativity';
import { loadSettings, saveSettings, getDbPath } from '../lib/storage';
import { SettingsPanel } from '../components/SettingsPanel';
import { ViewShell } from './_ViewShell';

function DbPath() {
  const path = getDbPath();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Database size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
      <code style={{ fontSize: '0.8125rem', wordBreak: 'break-all' }}>{path || '—'}</code>
    </div>
  );
}

const LANGUAGES: { value: string; label: string }[] = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'Englisch' },
];

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0' }}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        style={{
          position: 'relative',
          width: 44,
          height: 24,
          borderRadius: 12,
          border: 'none',
          background: checked ? 'var(--color-accent)' : 'var(--color-border)',
          cursor: 'pointer',
          transition: 'background 0.2s ease',
          flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'white',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
        <strong style={{ color: 'var(--color-text-primary)' }}>{label}</strong>
        {' — '}
        {description}
      </span>
    </div>
  );
}

export function SettingsView() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [savedHint, setSavedHint] = useState(false);

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    setSavedHint(true);
    window.setTimeout(() => setSavedHint(false), 1500);
  };

  const handleProviderChange = (provider: LlmProvider) => {
    const def = LLM_PROVIDERS.find((p) => p.id === provider);
    const models = def?.models ?? [];
    const model = models.includes(settings.defaultModel) ? settings.defaultModel : (models[0] ?? '');
    update({ defaultProvider: provider, defaultModel: model });
  };

  const [seedBusy, setSeedBusy] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  const handleSeed = async () => {
    setSeedBusy(true); setSeedMsg(null);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke<string>('natascha_seed_testdaten', {
        dir: settings.nataschaDir ?? '', python: settings.pythonCommand ?? '',
      });
      setSeedMsg('✓ Testdaten geladen. „Meine Klassen"/„Schüler" erneut öffnen.');
    } catch (e) {
      setSeedMsg(typeof e === 'string' ? e : e instanceof Error ? e.message : 'Seed fehlgeschlagen.');
    } finally { setSeedBusy(false); }
  };

  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const handleBackup = async () => {
    setBackupMsg(null);
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      const stamp = new Date().toISOString().slice(0, 10);
      const target = await save({
        title: 'Datensicherung speichern',
        defaultPath: `lehr-suite-backup-${stamp}.db`,
        filters: [{ name: 'SQLite-Datenbank', extensions: ['db'] }],
      });
      if (!target) return;
      await invoke('db_backup', { targetPath: target });
      setBackupMsg(`✓ Sicherung gespeichert: ${target}`);
    } catch (e) {
      setBackupMsg(typeof e === 'string' ? e : e instanceof Error ? e.message : 'Backup fehlgeschlagen.');
    }
  };

  const currentProvider = LLM_PROVIDERS.find((p) => p.id === settings.defaultProvider);
  const labelStyle = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' } as const;

  return (
    <ViewShell
      title="Einstellungen"
      description="API-Schlüssel und die Standard-Vorgaben für neue Dokumente."
    >
      {/* Abschnitt 1: Standard-Vorgaben */}
      <section style={{
        padding: '1.25rem', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)', marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', margin: 0 }}>Standard-Vorgaben</h3>
          {savedHint && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-success)' }}>
              <Check size={14} /> Gespeichert
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
          Diese Werte belegen ein <strong>neues</strong> Dokument vor. Bestehende Dokumente bleiben unverändert.
        </p>

        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div>
            <label style={labelStyle}>Standard-Anbieter</label>
            <select
              value={settings.defaultProvider}
              onChange={(e) => handleProviderChange(e.target.value as LlmProvider)}
            >
              {LLM_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Standard-Modell</label>
            <select
              value={settings.defaultModel}
              onChange={(e) => update({ defaultModel: e.target.value })}
            >
              {(currentProvider?.models ?? []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Ausgabesprache</label>
            <select
              value={settings.defaultAusgabeSprache}
              onChange={(e) => update({ defaultAusgabeSprache: e.target.value })}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <label style={labelStyle}>Standard-Kreativität</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {CREATIVITY_PRESETS.map((preset) => {
              const active = Math.abs(preset.value - settings.defaultKreativitaet) < 0.001;
              return (
                <button
                  key={preset.id}
                  onClick={() => update({ defaultKreativitaet: preset.value })}
                  title={preset.description}
                  style={{
                    flex: 1, minWidth: 140, textAlign: 'left',
                    padding: '0.625rem 0.75rem',
                    border: active ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                    background: active ? 'var(--color-highlight-bg)' : 'var(--color-bg-surface)',
                    borderRadius: 'var(--radius)', cursor: 'pointer',
                  }}
                >
                  <strong style={{ fontSize: '0.8125rem' }}>{preset.label}</strong>
                  <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <label style={labelStyle}>KI-Gegenprüfung der Aufgaben</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => update({ judgeEnabled: !settings.judgeEnabled })}
              style={{
                position: 'relative',
                width: 44,
                height: 24,
                borderRadius: 12,
                border: 'none',
                background: settings.judgeEnabled ? 'var(--color-accent)' : 'var(--color-border)',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
            >
              <span style={{
                position: 'absolute',
                top: 2,
                left: settings.judgeEnabled ? 22 : 2,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              {settings.judgeEnabled ? 'Aktiviert' : 'Deaktiviert'}
              {' — '}
              Prüft generierte Aufgaben per KI auf Mehrdeutigkeiten. Erhöht Generierungszeit leicht.
            </span>
          </div>
        </div>
      </section>

      {/* Abschnitt 2: Darstellung (nur sichtbar, solange Murals aktiv sind) */}
      {FEATURES.murals && (
      <section style={{
        padding: '1.25rem', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)', marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <h3 style={{ fontSize: '1rem', margin: 0 }}>Darstellung</h3>
          {savedHint && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-success)' }}>
              <Check size={14} /> Gespeichert
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
          Steuert die fachbezogene Atmosphäre im Hintergrund der Arbeitsfläche.
        </p>
        <ToggleRow
          label="Ambient-Murals aktivieren"
          description={settings.ambientMuralsEnabled ? 'Fachbezogene Hintergrundillustrationen sind sichtbar.' : 'Die App nutzt nur den ruhigen Papierhintergrund.'}
          checked={settings.ambientMuralsEnabled}
          onChange={() => update({ ambientMuralsEnabled: !settings.ambientMuralsEnabled })}
        />
        <ToggleRow
          label="Bewegung reduzieren"
          description="Stoppt subtile Parallax- und Driftbewegungen."
          checked={settings.reduceMotion}
          onChange={() => update({ reduceMotion: !settings.reduceMotion })}
        />
        <ToggleRow
          label="Hintergrundeffekte reduzieren"
          description="Reduziert Bilddetails und lässt nur eine sehr leichte Papierwaschung stehen."
          checked={settings.reduceBackgroundEffects}
          onChange={() => update({ reduceBackgroundEffects: !settings.reduceBackgroundEffects })}
        />
      </section>
      )}

      {/* Abschnitt 3: NATASCHA-Brücke */}
      <section style={{
        padding: '1.25rem', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)', marginBottom: '1.5rem',
      }}>
        <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem' }}>NATASCHA</h3>
        <label style={labelStyle}>Inbox-Ordner für Korrektur-Exporte</label>
        <input
          type="text"
          value={settings.nataschaInboxDir ?? ''}
          placeholder="Leer = Standard (~/lehr-suite-bridge/inbox)"
          onChange={(e) => update({ nataschaInboxDir: e.target.value })}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', marginBottom: '1rem' }}>
          Hier sucht „Aus NATASCHA-Korrektur" (Schritt 1) nach Exporten. Muss mit dem
          in NATASCHA eingestellten <code>[bridge] inbox_dir</code> übereinstimmen.
        </p>

        <label style={labelStyle}>NATASCHA-Ordner (enthält natascha.py)</label>
        <input
          type="text"
          value={settings.nataschaDir ?? ''}
          placeholder="Leer = Auto-Erkennung (apps/natascha)"
          onChange={(e) => update({ nataschaDir: e.target.value })}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        <label style={{ ...labelStyle, marginTop: '1rem' }}>Python-Befehl</label>
        <input
          type="text"
          value={settings.pythonCommand ?? ''}
          placeholder="Leer = OS-Standard (python / python3)"
          onChange={(e) => update({ pythonCommand: e.target.value })}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', marginBottom: '1rem' }}>
          Steuert den Start über <strong>Korrektur (NATASCHA)</strong> in der Seitenleiste.
        </p>

        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          <label style={labelStyle}>Gemeinsame Datenbank</label>
          <DbPath />
          <button
            onClick={handleSeed}
            disabled={seedBusy}
            style={{
              marginTop: '0.75rem', fontSize: '0.8125rem', padding: '0.4rem 0.75rem',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
              background: 'var(--color-bg-base)', cursor: seedBusy ? 'wait' : 'pointer',
            }}
          >
            {seedBusy ? 'Lädt …' : 'Testdaten laden (Dev)'}
          </button>
          {seedMsg && (
            <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', marginBottom: 0, color: 'var(--color-text-secondary)' }}>{seedMsg}</p>
          )}
        </div>
      </section>

      {/* Abschnitt 4: Datenbank */}
      <section style={{
        padding: '1.25rem', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)', marginBottom: '1.5rem',
      }}>
        <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem' }}>Datenbank</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 0, marginBottom: '0.75rem' }}>
          Die gemeinsame SQLite-Datenbank speichert Dokumente, Verlauf und Einstellungen.
          Wenn NATASCHA korrigiert hat, liest LUA die Klassen und Abgaben aus derselben Datei.
        </p>
        <DbPath />
        <div style={{ marginTop: '0.875rem' }}>
          <button
            className="btn-secondary"
            onClick={handleBackup}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Download size={14} /> Datensicherung exportieren
          </button>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.5rem 0 0' }}>
            {backupMsg ?? 'Schreibt eine kompakte Kopie der Datenbank an einen Ort deiner Wahl.'}
          </p>
        </div>
      </section>

      {/* Abschnitt 5: API-Schluessel */}
      <section style={{
        padding: '1.25rem', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)',
      }}>
        <SettingsPanel />
      </section>
    </ViewShell>
  );
}

import { useMemo } from 'react';
import { X } from 'lucide-react';
import type { Block, Meta } from '@lehrunterlagen/schema';
import { isWortbankEnabled } from '../lib/constants';

interface Props {
  block: Block;
  stufe: Meta['stufe'];
  onConfigChange: (config: Record<string, unknown>) => void;
}

function ConfigField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label>{label}</label>
      {children}
      {error && <p style={{ color: 'var(--color-error)', fontSize: '0.6875rem', marginTop: '0.125rem' }}>{error}</p>}
    </div>
  );
}

export function BlockConfigPanel({ block, stufe, onConfigChange }: Props) {
  const config = block.config as Record<string, unknown>;
  const set = (key: string, value: unknown) => {
    onConfigChange({ ...config, [key]: value });
  };

  if (block.typ === 'lueckentext') {
    const wortbank = !!config.wortbank;
    const distraktoren = (config.distraktoren as number) ?? 0;
    const wortbankAllowed = isWortbankEnabled(stufe);
    const errors = useMemo(() => {
      const e: Record<string, string> = {};
      if (wortbank && distraktoren < 1) e.distraktoren = 'Wenn Wortbank aktiv ist, muss es mindestens 1 Distraktor geben.';
      return e;
    }, [wortbank, distraktoren]);

    return (
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>Lückentext-Konfiguration</h3>
        <ConfigField label="Anzahl Lücken">
          <input type="number" min={1} value={config.anzahlLuecken as number ?? 6}
            onChange={(e) => set('anzahlLuecken', parseInt(e.target.value) || 1)} />
        </ConfigField>
        <ConfigField label="Wortbank">
          <select value={wortbank ? 'true' : 'false'}
            disabled={!wortbankAllowed}
            onChange={(e) => {
              const wb = e.target.value === 'true';
              set('wortbank', wb);
              if (!wb) set('distraktoren', 0);
            }}
            style={{ opacity: !wortbankAllowed ? 0.5 : 1 }}>
            <option value="false">Aus</option>
            <option value="true">An</option>
          </select>
          {!wortbankAllowed && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {' '}(nur in der Unterstufe)
            </span>
          )}
        </ConfigField>
        {wortbank && (
          <>
            <ConfigField label="Distraktoren (Anzahl)" error={errors.distraktoren}>
              <input type="number" min={0} value={distraktoren}
                onChange={(e) => set('distraktoren', parseInt(e.target.value) || 0)} />
            </ConfigField>
            <ConfigField label="Distraktor-Wörter (kommagetrennt, optional)">
              <input type="text"
                value={(config.distraktorWoerter as string[] ?? []).join(', ')}
                placeholder="z. B. falsch, auch falsch, noch einer"
                onChange={(e) => {
                  const woerter = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                  set('distraktorWoerter', woerter.length > 0 ? woerter : undefined);
                }}
              />
            </ConfigField>
          </>
        )}
      </div>
    );
  }

  if (block.typ === 'matching') {
    const items = (config.items as Array<{ nr: number; prompt: string }>) ?? [];
    const optionen = (config.optionen as Array<{ key: string; text: string }>) ?? [];
    const errors = useMemo(() => {
      const e: Record<string, string> = {};
      if (optionen.length <= items.length) {
        e.optionen = `Es muss mehr Optionen als Items geben (${items.length} Items, ${optionen.length} Optionen).`;
      }
      return e;
    }, [items.length, optionen.length]);

    return (
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>Matching-Konfiguration</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label>Items (links)</label>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ lineHeight: '36px', fontSize: '0.75rem', minWidth: 20 }}>{item.nr}.</span>
                <input type="text" value={item.prompt} placeholder="Begriff"
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[i] = { ...item, prompt: e.target.value };
                    set('items', newItems);
                  }} />
              </div>
            ))}
            <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              onClick={() => set('items', [...items, { nr: items.length + 1, prompt: '' }])}>
              + Item
            </button>
          </div>
          <div>
            <label>Optionen (rechts)</label>
            {optionen.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ lineHeight: '36px', fontSize: '0.75rem', minWidth: 20 }}>{opt.key}</span>
                <input type="text" value={opt.text} placeholder="Definition"
                  onChange={(e) => {
                    const newOpts = [...optionen];
                    newOpts[i] = { ...opt, text: e.target.value };
                    set('optionen', newOpts);
                  }} />
              </div>
            ))}
            <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              onClick={() => {
                const nextKey = String.fromCharCode(65 + optionen.length);
                set('optionen', [...optionen, { key: nextKey, text: '' }]);
              }}>
              + Option
            </button>
          </div>
        </div>
        {errors.optionen && (
          <p style={{ color: 'var(--color-error)', fontSize: '0.6875rem', marginTop: '0.25rem' }}>{errors.optionen}</p>
        )}
      </div>
    );
  }

  if (block.typ === 'multipleChoice') {
    const fragen = (config.fragen as Array<{
      nr: number; frage: string;
      optionen: Array<{ key: string; text: string }>;
      mehrfach: boolean;
    }>) ?? [];

    return (
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>Multiple-Choice-Konfiguration</h3>
        {fragen.map((frage, fi) => (
          <div key={fi} style={{
            padding: '0.75rem', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)', marginBottom: '0.75rem',
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.75rem' }}>Frage {frage.nr}</strong>
              <label style={{ margin: 0, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input type="checkbox" checked={frage.mehrfach}
                  onChange={(e) => {
                    const newFragen = [...fragen];
                    newFragen[fi] = { ...frage, mehrfach: e.target.checked };
                    set('fragen', newFragen);
                  }} />
                Mehrfachauswahl
              </label>
            </div>
            <input type="text" value={frage.frage} placeholder="Frage"
              onChange={(e) => {
                const newFragen = [...fragen];
                newFragen[fi] = { ...frage, frage: e.target.value };
                set('fragen', newFragen);
              }}
              style={{ marginBottom: '0.5rem' }} />
            {frage.optionen.map((opt, oi) => (
              <div key={oi} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.375rem' }}>
                <span style={{ lineHeight: '32px', fontSize: '0.75rem', minWidth: 20 }}>{opt.key}</span>
                <input type="text" value={opt.text} placeholder="Antwortmöglichkeit"
                  onChange={(e) => {
                    const newFragen = [...fragen];
                    const newOpts = [...frage.optionen];
                    newOpts[oi] = { ...opt, text: e.target.value };
                    newFragen[fi] = { ...frage, optionen: newOpts };
                    set('fragen', newFragen);
                  }} />
              </div>
            ))}
            {fi < fragen.length - 1 && (
              <button className="btn-danger" style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem', marginTop: '0.25rem' }}
                onClick={() => set('fragen', fragen.filter((_: unknown, j: number) => j !== fi))}>
                Frage entfernen
              </button>
            )}
          </div>
        ))}
        <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
          onClick={() => set('fragen', [...fragen, { nr: fragen.length + 1, frage: '', optionen: [{ key: 'A', text: '' }, { key: 'B', text: '' }, { key: 'C', text: '' }, { key: 'D', text: '' }], mehrfach: false }])}>
          + Frage
        </button>
      </div>
    );
  }

  if (block.typ === 'offeneVerstaendnisfrage') {
    const fragen = (config.fragen as Array<{ nr: number; frage: string; zeilen: number }>) ?? [];

    return (
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>Verständnisfragen</h3>
        {fragen.map((frage, fi) => (
          <div key={fi} style={{
            padding: '0.75rem', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)', marginBottom: '0.75rem',
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <input type="text" value={frage.frage} placeholder="Frage"
                  onChange={(e) => {
                    const newFragen = [...fragen];
                    newFragen[fi] = { ...frage, frage: e.target.value };
                    set('fragen', newFragen);
                  }} />
              </div>
              <div style={{ width: 80 }}>
                <label style={{ fontSize: '0.6875rem' }}>Zeilen</label>
                <input type="number" min={1} value={frage.zeilen}
                  onChange={(e) => {
                    const newFragen = [...fragen];
                    newFragen[fi] = { ...frage, zeilen: parseInt(e.target.value) || 4 };
                    set('fragen', newFragen);
                  }} />
              </div>
            </div>
            {fi < fragen.length - 1 && (
              <button className="btn-danger" style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem', marginTop: '0.25rem' }}
                onClick={() => set('fragen', fragen.filter((_: unknown, j: number) => j !== fi))}>
                Frage entfernen
              </button>
            )}
          </div>
        ))}
        <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
          onClick={() => set('fragen', [...fragen, { nr: fragen.length + 1, frage: '', zeilen: 4 }])}>
          + Frage
        </button>
      </div>
    );
  }

  if (block.typ === 'offeneSchreibaufgabe') {
    const umfang = config.umfangWorte as { min: number; max: number } ?? { min: 200, max: 300 };
    const aspekte = (config.aspekte as string[]) ?? [];
    const errors = useMemo(() => {
      const e: Record<string, string> = {};
      if (umfang.min > umfang.max) e.umfang = 'Min darf nicht größer als Max sein.';
      return e;
    }, [umfang.min, umfang.max]);

    return (
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>Schreibaufgabe-Konfiguration</h3>
        <ConfigField label="Situation">
          <textarea rows={2} value={config.situation as string ?? ''} placeholder="Ausgangssituation beschreiben"
            onChange={(e) => set('situation', e.target.value)} />
        </ConfigField>
        <ConfigField label="Textsorte">
          <input type="text" value={config.textsorte as string ?? ''} placeholder="z. B. Kommentar, Erörterung"
            onChange={(e) => set('textsorte', e.target.value)} />
        </ConfigField>
        <ConfigField label="Umfang (Wörter)" error={errors.umfang}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="number" min={1} value={umfang.min} placeholder="Min"
              onChange={(e) => set('umfangWorte', { ...umfang, min: parseInt(e.target.value) || 1 })} />
            <span style={{ lineHeight: '36px' }}>–</span>
            <input type="number" min={1} value={umfang.max} placeholder="Max"
              onChange={(e) => set('umfangWorte', { ...umfang, max: parseInt(e.target.value) || 1 })} />
          </div>
        </ConfigField>
        <ConfigField label="Aspekte">
          {aspekte.map((asp, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.375rem' }}>
              <input type="text" value={asp} placeholder={`Aspekt ${i + 1}`}
                onChange={(e) => {
                  const newAsp = [...aspekte];
                  newAsp[i] = e.target.value;
                  set('aspekte', newAsp);
                }} />
              {aspekte.length > 1 && (
                <button className="btn-danger" style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem' }}
                  onClick={() => set('aspekte', aspekte.filter((_: unknown, j: number) => j !== i))}>
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
          <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', marginTop: '0.25rem' }}
            onClick={() => set('aspekte', [...aspekte, ''])}>
            + Aspekt
          </button>
        </ConfigField>
      </div>
    );
  }

  if (block.typ === 'markieraufgabe') {
    return (
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>Markieraufgabe</h3>
        <ConfigField label="Anweisung zum Markieren">
          <textarea rows={2} value={config.anweisung as string ?? ''}
            placeholder="z. B. Markiere alle Stilmittel im Gedicht."
            onChange={(e) => set('anweisung', e.target.value)} />
        </ConfigField>
      </div>
    );
  }

  if (block.typ === 'wordScramble') {
    return (
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>Wörter ordnen</h3>
        <ConfigField label="Ausgangswort/Satz (Leerzeichen-getrennt)">
          <textarea rows={2} value={config.wort as string ?? ''}
            placeholder="z. B. Der Hund läuft im Park"
            onChange={(e) => set('wort', e.target.value)} />
        </ConfigField>
      </div>
    );
  }

  if (block.typ === 'kategorisierung') {
    const kategorien = (config.kategorien as Array<{ name: string; anzahlItems: number }>) ?? [];
    const items = (config.items as Array<{ nr: number; text: string; optionen: string[] }>) ?? [];

    return (
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>Kategorisierung</h3>

        {/* Kategorien */}
        <ConfigField label="Kategorien">
          {kategorien.map((kat, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.375rem', alignItems: 'center' }}>
              <input
                type="text"
                value={kat.name}
                placeholder={`Kategorie ${i + 1}`}
                onChange={(e) => {
                  const newKat = [...kategorien];
                  newKat[i] = { ...kat, name: e.target.value };
                  set('kategorien', newKat);
                }}
                style={{ flex: 1 }}
              />
              {kategorien.length > 2 && (
                <button
                  className="btn-danger"
                  style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem' }}
                  onClick={() => set('kategorien', kategorien.filter((_: unknown, j: number) => j !== i))}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
          <button
            className="btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', marginTop: '0.25rem' }}
            onClick={() => set('kategorien', [...kategorien, { name: '', anzahlItems: 1 }])}
          >
            + Kategorie
          </button>
        </ConfigField>

        {/* Items */}
        <ConfigField label="Items">
          {items.map((item, i) => (
            <div key={i} style={{
              padding: '0.5rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              marginBottom: '0.5rem',
            }}>
              <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.375rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: 20 }}>{item.nr}.</span>
                <input
                  type="text"
                  value={item.text}
                  placeholder="Aussage / Text"
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[i] = { ...item, text: e.target.value };
                    set('items', newItems);
                  }}
                  style={{ flex: 1 }}
                />
                {items.length > 2 && (
                  <button
                    className="btn-danger"
                    style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem' }}
                    onClick={() => set('items', items.filter((_: unknown, j: number) => j !== i))}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {item.optionen.map((opt, oi) => (
                  <span key={oi} style={{
                    fontSize: '0.75rem',
                    padding: '0.125rem 0.375rem',
                    background: 'var(--color-bg-selected)',
                    borderRadius: '3px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}>
                    {opt}
                    <button
                      onClick={() => {
                        const newItems = [...items];
                        newItems[i] = { ...item, optionen: item.optionen.filter((_: unknown, j: number) => j !== oi) };
                        set('items', newItems);
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.625rem', color: 'var(--color-text-muted)' }}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
                {/* Option hinzufügen (aus vorhandenen Kategorien) */}
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const newItems = [...items];
                    newItems[i] = { ...item, optionen: [...item.optionen, e.target.value] };
                    set('items', newItems);
                    e.target.value = '';
                  }}
                  style={{ fontSize: '0.75rem', padding: '0.125rem 0.25rem' }}
                >
                  <option value="">+ Option</option>
                  {kategorien.filter((k) => k.name && !item.optionen.includes(k.name)).map((k) => (
                    <option key={k.name} value={k.name}>{k.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          <button
            className="btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', marginTop: '0.25rem' }}
            onClick={() => set('items', [...items, { nr: items.length + 1, text: '', optionen: [] }])}
          >
            + Item
          </button>
        </ConfigField>
      </div>
    );
  }

  if (block.typ === 'tabelle') {
    const spalten = (config.spalten as Array<{ titel: string; breiteProzent: number }>) ?? [];
    const zeilen = (config.zeilen as Array<{ nr: number; zellen: Array<{ text?: string; luecke?: true }> }>) ?? [];

    return (
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>Tabelle</h3>

        {/* Spalten */}
        <ConfigField label="Spalten">
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {spalten.map((sp, i) => (
              <div key={i} style={{ flex: 1, minWidth: 80 }}>
                <input
                  type="text"
                  value={sp.titel}
                  placeholder={`Spalte ${i + 1}`}
                  onChange={(e) => {
                    const newSpalten = [...spalten];
                    newSpalten[i] = { ...sp, titel: e.target.value };
                    set('spalten', newSpalten);
                  }}
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                />
              </div>
            ))}
            {spalten.length < 5 && (
              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', whiteSpace: 'nowrap' }}
                onClick={() => {
                  const newSpalten = [...spalten, { titel: '', breiteProzent: Math.floor(100 / (spalten.length + 1)) }];
                  // Jede Zeile bekommt eine neue Zelle
                  const newZeilen = zeilen.map((z) => ({
                    ...z,
                    zellen: [...z.zellen, { text: '' }],
                  }));
                  set('spalten', newSpalten);
                  set('zeilen', newZeilen);
                }}
              >
                + Spalte
              </button>
            )}
            {spalten.length > 2 && (
              <button
                className="btn-danger"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', whiteSpace: 'nowrap' }}
                onClick={() => {
                  const newSpalten = spalten.slice(0, -1);
                  const newZeilen = zeilen.map((z) => ({
                    ...z,
                    zellen: z.zellen.slice(0, -1),
                  }));
                  set('spalten', newSpalten);
                  set('zeilen', newZeilen);
                }}
              >
                <X size={13} /> Spalte
              </button>
            )}
          </div>
        </ConfigField>

        {/* Zeilen */}
        <ConfigField label="Zeilen">
          {zeilen.map((zeile, zi) => (
            <div key={zi} style={{
              display: 'flex',
              gap: '0.375rem',
              marginBottom: '0.375rem',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: 20 }}>{zeile.nr}.</span>
              {zeile.zellen.map((zelle, ci) => {
                const isLuecke = 'luecke' in zelle;
                return (
                  <div key={ci} style={{ flex: 1, position: 'relative' }}>
                    {!isLuecke ? (
                      <input
                        type="text"
                        value={zelle.text ?? ''}
                        placeholder="Text"
                        onChange={(e) => {
                          const newZeilen = [...zeilen];
                          const newZellen = [...zeile.zellen];
                          newZellen[ci] = { text: e.target.value };
                          newZeilen[zi] = { ...zeile, zellen: newZellen };
                          set('zeilen', newZeilen);
                        }}
                        style={{ width: '100%', fontSize: '0.8125rem' }}
                      />
                    ) : (
                      <div style={{
                        padding: '0.375rem 0.5rem',
                        background: 'var(--color-warning-bg)',
                        border: '1px dashed var(--color-warning)',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.75rem',
                        color: 'var(--color-warning)',
                        textAlign: 'center',
                      }}>
                        Lücke
                      </div>
                    )}
                    {/* Toggle Text/Lücke */}
                    <button
                      onClick={() => {
                        const newZeilen = [...zeilen];
                        const newZellen = [...zeile.zellen];
                        newZellen[ci] = isLuecke ? { text: '' } : { luecke: true };
                        newZeilen[zi] = { ...zeile, zellen: newZellen };
                        set('zeilen', newZeilen);
                      }}
                      style={{
                        position: 'absolute',
                        right: 2,
                        top: 2,
                        fontSize: '0.625rem',
                        padding: '0 3px',
                        background: 'var(--color-bg-surface)',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                      }}
                      title={isLuecke ? 'Zu Text umwandeln' : 'Zu Lücke umwandeln'}
                    >
                      {isLuecke ? 'T' : 'L'}
                    </button>
                  </div>
                );
              })}
              {zeilen.length > 1 && (
                <button
                  className="btn-danger"
                  style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem' }}
                  onClick={() => set('zeilen', zeilen.filter((_: unknown, j: number) => j !== zi))}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
          <button
            className="btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', marginTop: '0.25rem' }}
            onClick={() => set('zeilen', [...zeilen, { nr: zeilen.length + 1, zellen: spalten.map(() => ({ text: '' })) }])}
          >
            + Zeile
          </button>
        </ConfigField>
      </div>
    );
  }

  if (block.typ === 'stiluebung') {
    return (
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>Stilübung</h3>
        <ConfigField label="Zielniveau">
          <select value={config.zielniveau as string} onChange={(e) => set('zielniveau', e.target.value)}>
            <option value="umgangssprachlich">Umgangssprachlich</option>
            <option value="standard">Standard</option>
            <option value="gehoben">Gehoben</option>
            <option value="fachsprachlich">Fachsprachlich</option>
          </select>
        </ConfigField>
        <ConfigField label="Transformation">
          <select value={config.transformation as string} onChange={(e) => set('transformation', e.target.value)}>
            <option value="verdeutlichen">Verdeutlichen</option>
            <option value="variieren">Variieren</option>
            <option value="kuerzen">Kürzen</option>
            <option value="erweitern">Erweitern</option>
          </select>
        </ConfigField>
      </div>
    );
  }

  if (block.typ === 'songanalyse') {
    return (
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>Songanalyse</h3>

        <ConfigField label="Interpret">
          <input
            type="text"
            value={config.interpret as string ?? ''}
            placeholder="z. B. The Beatles"
            onChange={(e) => set('interpret', e.target.value)}
          />
        </ConfigField>

        <ConfigField label="Titel">
          <input
            type="text"
            value={config.titel as string ?? ''}
            placeholder="z. B. Hey Jude"
            onChange={(e) => set('titel', e.target.value)}
          />
        </ConfigField>

        <ConfigField label="Genre (optional)">
          <input
            type="text"
            value={config.genre as string ?? ''}
            placeholder="z. B. Pop, Rock, Hip-Hop"
            onChange={(e) => set('genre', e.target.value || undefined)}
          />
        </ConfigField>

        <ConfigField label="Aufgabentyp">
          <select
            value={config.aufgabe as string ?? 'inhaltsangabe'}
            onChange={(e) => set('aufgabe', e.target.value)}
          >
            <option value="inhaltsangabe">Inhaltsangabe</option>
            <option value="wirkungsanalyse">Wirkungsanalyse</option>
            <option value="sprachanalyse">Sprachanalyse</option>
            <option value="vergleich">Vergleich</option>
          </select>
        </ConfigField>

        <ConfigField label="Songtext (Lyrics)">
          <textarea
            rows={6}
            value={config.lyrics as string ?? ''}
            placeholder="Füge hier den Songtext ein..."
            onChange={(e) => set('lyrics', e.target.value)}
          />
        </ConfigField>
      </div>
    );
  }

  if (block.typ === 'kreuzwortraetsel') {
    const anzahl = (config.anzahlWoerter as number) ?? 6;
    const syncArray = (n: number) => {
      const current = (config.eintraege as { wort: string; hinweis: string }[] | undefined) ?? [];
      if (n > current.length) {
        set('eintraege', [...current, ...Array.from({ length: n - current.length }, () => ({ wort: '', hinweis: '' }))]);
      } else if (n < current.length) {
        set('eintraege', current.slice(0, n));
      }
    };

    return (
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>Kreuzworträtsel</h3>
        <ConfigField label="Anzahl Wörter">
          <input type="number" min={3} max={20} value={anzahl}
            onChange={(e) => {
              const n = Math.max(3, Math.min(20, parseInt(e.target.value) || 6));
              set('anzahlWoerter', n);
              syncArray(n);
            }} />
        </ConfigField>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
          Beim Generieren zieht die KI {anzahl} Wörter + Hinweise automatisch aus dem Quelltext.
        </p>
      </div>
    );
  }

  if (block.typ === 'wortgitter') {
    const anzahl = (config.anzahlWoerter as number) ?? 6;
    const syncArray = (n: number) => {
      const current = (config.woerter as string[] | undefined) ?? [];
      if (n > current.length) {
        set('woerter', [...current, ...Array.from({ length: n - current.length }, () => '')]);
      } else if (n < current.length) {
        set('woerter', current.slice(0, n));
      }
    };

    return (
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>Wortgitter</h3>
        <ConfigField label="Anzahl Wörter">
          <input type="number" min={3} max={20} value={anzahl}
            onChange={(e) => {
              const n = Math.max(3, Math.min(20, parseInt(e.target.value) || 6));
              set('anzahlWoerter', n);
              syncArray(n);
            }} />
        </ConfigField>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
          Beim Generieren zieht die KI {anzahl} Wörter automatisch aus dem Quelltext.
        </p>
      </div>
    );
  }

  if (block.typ === 'vokabeluebung') {
    const richtung = (config.richtung as 'de_fremd' | 'fremd_de') ?? 'de_fremd';
    const anzahl = (config.anzahlVokabeln as number) ?? 6;
    const syncArray = (n: number) => {
      const current = (config.vokabeln as Array<{ deutsch: string; fremdsprache: string; kontextsatz?: string }> | undefined) ?? [];
      if (n > current.length) {
        set('vokabeln', [...current, ...Array.from({ length: n - current.length }, () => ({ deutsch: '', fremdsprache: '' }))]);
      } else if (n < current.length) {
        set('vokabeln', current.slice(0, n));
      }
    };

    return (
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>Vokabelübung</h3>

        <ConfigField label="Richtung">
          <select value={richtung} onChange={(e) => set('richtung', e.target.value)}>
            <option value="de_fremd">Deutsch → Fremdsprache</option>
            <option value="fremd_de">Fremdsprache → Deutsch</option>
          </select>
        </ConfigField>

        <ConfigField label="Anzahl Vokabeln">
          <input type="number" min={3} max={20} value={anzahl}
            onChange={(e) => {
              const n = Math.max(3, Math.min(20, parseInt(e.target.value) || 6));
              set('anzahlVokabeln', n);
              syncArray(n);
            }} />
        </ConfigField>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
          Beim Generieren zieht die KI {anzahl} Vokabeln automatisch aus dem Quelltext.
        </p>
      </div>
    );
  }

  if (block.typ === 'fehlerkorrektur') {
    const anzahl = (config.anzahlSaetze as number) ?? 1;
    const syncArray = (n: number) => {
      const current = (config.saetze as Array<{ nr: number; satz: string; anzahlFehler: number }> | undefined) ?? [];
      if (n > current.length) {
        set('saetze', [...current, ...Array.from({ length: n - current.length }, (_, i) => ({ nr: current.length + i + 1, satz: '', anzahlFehler: 1 }))]);
      } else if (n < current.length) {
        set('saetze', current.slice(0, n).map((s, i) => ({ ...s, nr: i + 1 })));
      }
    };

    return (
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>Fehlerkorrektur</h3>
        <ConfigField label="Anzahl Sätze">
          <input type="number" min={1} max={12} value={anzahl}
            onChange={(e) => {
              const n = Math.max(1, Math.min(12, parseInt(e.target.value) || 1));
              set('anzahlSaetze', n);
              syncArray(n);
            }} />
        </ConfigField>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
          Beim Generieren erstellt die KI {anzahl} Sätze mit eingebauten Fehlern.
        </p>
      </div>
    );
  }

  return null;
}

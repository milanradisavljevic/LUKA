import { useState, useEffect, useCallback } from 'react';
import { Users, TrendingUp, AlertTriangle, Loader2, BarChart3, ChevronRight, Trash2, UserPlus, Sparkles, Wand2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, CartesianGrid } from 'recharts';
import { useNatascha } from '../hooks/useNatascha';
import type { KlasseInfo } from '../lib/storage';
import type { SchuelerProfilRow } from '../hooks/useNatascha';
import { KATEGORIE_TO_BLOCKTYPEN, type NataschaPrefill } from '../lib/nataschaBridge';
import type { BlockTyp } from '@lehrunterlagen/schema';
import { ViewShell } from './_ViewShell';

const FEHLER_LABELS: Record<string, string> = { R: 'Rechtschreibung', G: 'Grammatik', Z: 'Zeichensetzung', A: 'Ausdruck' };

interface SchuelerViewProps {
  /** Cross-Nav-Vorauswahl (aus der Korrektur). */
  preselect?: { klasse: string; id: number } | null;
  /** Wird aufgerufen, sobald die Vorauswahl konsumiert wurde. */
  onConsumePreselect?: () => void;
  /** Closed Loop pro Schüler: Übungsblatt zu seinen Schwächen im Generator starten. */
  onGenerateUebung?: (prefill: NataschaPrefill) => void;
}

export function SchuelerView({ preselect, onConsumePreselect, onGenerateUebung }: SchuelerViewProps = {}) {
  const { listKlassen, listSchueler, insertSchueler, deleteSchueler, addKlasse, addAufgabe, listRubrics, getSchuelerLaengsschnitt, generateSchuelerProfil, getSchuelerProfil } = useNatascha();

  const [klassen, setKlassen] = useState<KlasseInfo[]>([]);
  const [selectedKlasse, setSelectedKlasse] = useState<string | null>(null);
  const [schueler, setSchueler] = useState<{ id: number; vorname: string; nachname: string | null; klasse: string }[]>([]);
  const [selectedSchuelerId, setSelectedSchuelerId] = useState<number | null>(null);
  const [laengsschnitt, setLaengsschnitt] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [neuKlasse, setNeuKlasse] = useState('');
  const [neuVorname, setNeuVorname] = useState('');
  const [neuNachname, setNeuNachname] = useState('');
  const [adding, setAdding] = useState(false);
  // Aufgabe-anlegen (Welle 4)
  const [aufLabel, setAufLabel] = useState('');
  const [aufFach, setAufFach] = useState('Deutsch');
  const [aufStufe, setAufStufe] = useState('Oberstufe');
  const [aufRubric, setAufRubric] = useState('');
  const [rubrics, setRubrics] = useState<string[]>([]);
  const [aufBusy, setAufBusy] = useState(false);
  const [aufMsg, setAufMsg] = useState<string | null>(null);
  const [profil, setProfil] = useState<SchuelerProfilRow | null>(null);
  const [profilBusy, setProfilBusy] = useState(false);
  const [profilError, setProfilError] = useState<string | null>(null);

  useEffect(() => { listKlassen().then(setKlassen); }, [listKlassen]);

  useEffect(() => {
    listRubrics(aufFach, aufStufe).then((r) => { setRubrics(r); setAufRubric(r[0] ?? ''); });
  }, [listRubrics, aufFach, aufStufe]);

  const handleAddAufgabe = useCallback(async () => {
    const klasse = (neuKlasse || selectedKlasse || '').trim();
    if (!klasse || !aufLabel.trim()) { setAufMsg('Klasse und Bezeichnung erforderlich.'); return; }
    setAufBusy(true); setAufMsg(null);
    try {
      try { await addKlasse(klasse); } catch { /* Klasse existiert evtl. schon — ok */ }
      const res = await addAufgabe(klasse, aufLabel.trim(), { fach: aufFach, schulstufe: aufStufe, rubric: aufRubric });
      setAufMsg(`✓ Aufgabe „${res.aufgabe}" in ${klasse} angelegt (Rubrik: ${res.rubric || '—'}).`);
      setAufLabel('');
      await listKlassen().then(setKlassen);
    } catch (e) {
      setAufMsg(typeof e === 'string' ? e : e instanceof Error ? e.message : 'Anlegen fehlgeschlagen.');
    } finally { setAufBusy(false); }
  }, [neuKlasse, selectedKlasse, aufLabel, aufFach, aufStufe, aufRubric, addKlasse, addAufgabe, listKlassen]);

  const loadSchueler = useCallback(async (klasse: string) => {
    setSelectedKlasse(klasse);
    setSelectedSchuelerId(null);
    setLaengsschnitt(null);
    setLoading(true);
    try {
      const result = await listSchueler(klasse);
      setSchueler(result);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [listSchueler]);

  const loadLaengsschnitt = useCallback(async (schuelerId: number) => {
    setSelectedSchuelerId(schuelerId);
    setProfil(null);
    setProfilError(null);
    setLoading(true);
    getSchuelerProfil(schuelerId).then(setProfil);
    try {
      const result = await getSchuelerLaengsschnitt(schuelerId);
      setLaengsschnitt(result);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [getSchuelerLaengsschnitt, getSchuelerProfil]);

  // Cross-Nav: Vorauswahl aus der Korrektur einmalig anwenden.
  useEffect(() => {
    if (!preselect) return;
    let cancelled = false;
    (async () => {
      await loadSchueler(preselect.klasse);
      if (cancelled) return;
      await loadLaengsschnitt(preselect.id);
      onConsumePreselect?.();
    })();
    return () => { cancelled = true; };
  }, [preselect, loadSchueler, loadLaengsschnitt, onConsumePreselect]);

  // Closed Loop pro Schüler: aus den Fehlerschwerpunkten ein Übungsblatt erzeugen.
  const handleGenerateUebung = useCallback(() => {
    if (!laengsschnitt || !onGenerateUebung) return;
    const top = [...(laengsschnitt.fehlerschwerpunkte ?? [])]
      .filter((f: any) => f.anzahl > 0)
      .sort((a: any, b: any) => b.anzahl - a.anzahl)
      .slice(0, 3);
    if (top.length === 0) return;
    const fokusThemen = top.map((f: any) => FEHLER_LABELS[f.typ] ?? f.typ);
    const arten: BlockTyp[] = [];
    for (const f of top) {
      for (const t of (KATEGORIE_TO_BLOCKTYPEN[f.typ as 'R' | 'G' | 'Z' | 'A'] ?? [])) {
        if (!arten.includes(t)) arten.push(t);
      }
    }
    const s = laengsschnitt.schueler;
    const name = [s.vorname, s.nachname].filter(Boolean).join(' ') || 'Schüler';
    const prefill: NataschaPrefill = {
      thema: `Übung zu Schwächen – ${name}`,
      fach: 'deutsch',
      stufe: 'oberstufe',
      fokusThemen,
      gewuenschteAufgabenarten: arten,
      notizen: `Automatisch aus dem Längsschnitt von ${name} (${laengsschnitt.schueler.klasse}) erzeugt. Schwerpunkte: ${fokusThemen.join(', ')}.`,
    };
    onGenerateUebung(prefill);
  }, [laengsschnitt, onGenerateUebung]);

  const handleGenerateProfil = useCallback(async () => {
    if (!selectedSchuelerId) return;
    setProfilBusy(true); setProfilError(null);
    try {
      const result = await generateSchuelerProfil(selectedSchuelerId);
      setProfil({ id: result.id, schuelerId: result.schueler_id, text: result.text, modell: result.modell, erstelltAm: '' });
    } catch (e) {
      setProfilError(typeof e === 'string' ? e : e instanceof Error ? e.message : 'Profil-Generierung fehlgeschlagen');
    } finally { setProfilBusy(false); }
  }, [selectedSchuelerId, generateSchuelerProfil]);

  const handleAddSchueler = useCallback(async () => {
    const klasse = (neuKlasse || selectedKlasse || '').trim();
    if (!klasse || !neuVorname.trim()) { setError('Klasse und Vorname sind erforderlich.'); return; }
    setAdding(true); setError(null);
    try {
      await insertSchueler(klasse, neuVorname.trim(), neuNachname.trim() || null);
      setNeuVorname(''); setNeuNachname(''); setNeuKlasse('');
      await listKlassen().then(setKlassen);
      await loadSchueler(klasse);
    } catch (e) {
      setError(typeof e === 'string' ? e : e instanceof Error ? e.message : 'Anlegen fehlgeschlagen.');
    } finally { setAdding(false); }
  }, [neuKlasse, selectedKlasse, neuVorname, neuNachname, insertSchueler, listKlassen, loadSchueler]);

  const handleDeleteSchueler = useCallback(async (id: number, name: string) => {
    if (!window.confirm(`Schüler „${name}" löschen? (Abgaben bleiben erhalten.)`)) return;
    setError(null);
    try {
      await deleteSchueler(id);
      if (selectedSchuelerId === id) { setSelectedSchuelerId(null); setLaengsschnitt(null); }
      if (selectedKlasse) await loadSchueler(selectedKlasse);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Löschen fehlgeschlagen.');
    }
  }, [deleteSchueler, selectedKlasse, selectedSchuelerId, loadSchueler]);

  const cardStyle = {
    padding: '1.25rem', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)',
  } as const;

  const schuelerName = (s: { vorname: string; nachname: string | null }) =>
    [s.vorname, s.nachname].filter(Boolean).join(' ') || '—';

  const trendIcon = (r: string) => r === 'steigt' ? '↑' : r === 'faellt' ? '↓' : '→';

  return (
    <ViewShell title="Schüler" description="Schülerprofil und Längsschnitt.">
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.25rem' }}>
        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem', fontWeight: 700 }}>
            <Users size={16} style={{ verticalAlign: -2, marginRight: 6 }} /> Klasse & Schüler
          </h3>

          {klassen.map((k) => (
            <div key={k.klasse}>
              <button
                onClick={() => loadSchueler(k.klasse)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '0.4rem 0.6rem', marginBottom: '0.125rem', fontSize: '0.8125rem',
                  background: selectedKlasse === k.klasse ? 'var(--color-highlight-bg)' : 'none',
                  border: selectedKlasse === k.klasse ? '2px solid var(--color-accent)' : '1px solid transparent',
                  borderRadius: 'var(--radius)', cursor: 'pointer',
                }}
              >
                {k.klasse} <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>({k.anzahlAbgaben})</span>
              </button>
              {selectedKlasse === k.klasse && schueler.length > 0 && (
                <div style={{ paddingLeft: '0.75rem', marginBottom: '0.5rem' }}>
                  {schueler.map((s) => (
                    <div key={s.id} style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.125rem' }}>
                      <button
                        onClick={() => loadLaengsschnitt(s.id)}
                        style={{
                          flex: 1, display: 'flex', textAlign: 'left', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.25rem 0.5rem', fontSize: '0.75rem',
                          background: selectedSchuelerId === s.id ? 'var(--color-accent)' : 'none',
                          color: selectedSchuelerId === s.id ? '#fff' : 'var(--color-text-primary)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius)', cursor: 'pointer',
                        }}
                      >
                        <span>{schuelerName(s)}</span>
                        <ChevronRight size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteSchueler(s.id, schuelerName(s))}
                        title="Schüler löschen"
                        style={{
                          padding: '0.25rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                          background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', lineHeight: 0,
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <UserPlus size={14} /> Schüler anlegen
            </div>
            <input value={neuKlasse || selectedKlasse || ''} onChange={(e) => setNeuKlasse(e.target.value)} placeholder="Klasse (z.B. 7a)"
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 4, fontSize: '0.75rem', padding: '0.25rem 0.4rem' }} />
            <input value={neuVorname} onChange={(e) => setNeuVorname(e.target.value)} placeholder="Vorname"
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 4, fontSize: '0.75rem', padding: '0.25rem 0.4rem' }} />
            <input value={neuNachname} onChange={(e) => setNeuNachname(e.target.value)} placeholder="Nachname (optional)"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddSchueler(); }}
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 6, fontSize: '0.75rem', padding: '0.25rem 0.4rem' }} />
            <button className="btn-primary" disabled={adding} onClick={handleAddSchueler}
              style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <UserPlus size={13} /> {adding ? 'Anlegen …' : 'Hinzufügen'}
            </button>
          </div>

          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Aufgabe anlegen (Rubrik)</div>
            <input value={aufLabel} onChange={(e) => setAufLabel(e.target.value)} placeholder="Bezeichnung (z.B. Schularbeit 2)"
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 4, fontSize: '0.75rem', padding: '0.25rem 0.4rem' }} />
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <select value={aufFach} onChange={(e) => setAufFach(e.target.value)} style={{ flex: 1, fontSize: '0.7rem' }}>
                <option>Deutsch</option><option>Englisch</option>
              </select>
              <select value={aufStufe} onChange={(e) => setAufStufe(e.target.value)} style={{ flex: 1, fontSize: '0.7rem' }}>
                <option>Oberstufe</option><option>Unterstufe</option>
              </select>
            </div>
            <select value={aufRubric} onChange={(e) => setAufRubric(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 6, fontSize: '0.7rem' }}>
              {rubrics.length === 0 && <option value="">(keine Rubriken gefunden)</option>}
              {rubrics.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button className="btn-primary" disabled={aufBusy} onClick={handleAddAufgabe}
              style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem' }}>
              {aufBusy ? 'Anlegen …' : 'Aufgabe + Rubrik anlegen'}
            </button>
            {aufMsg && <p style={{ fontSize: '0.7rem', marginTop: 4, marginBottom: 0, color: 'var(--color-text-secondary)' }}>{aufMsg}</p>}
          </div>
        </div>

        <div>
          {error && <div style={{ ...cardStyle, borderColor: 'var(--color-danger, #c0392b)', marginBottom: '1rem' }}>
            <AlertTriangle size={16} style={{ color: 'var(--color-danger, #c0392b)', verticalAlign: -2, marginRight: 6 }} />
            <span style={{ fontSize: '0.875rem' }}>{error}</span>
          </div>}

          {loading && <div style={cardStyle}><Loader2 size={18} className="spin" style={{ verticalAlign: -2, marginRight: 6 }} /> Laden …</div>}

          {!loading && laengsschnitt && (
            <>
              <div style={{ ...cardStyle, marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.9375rem', margin: '0 0 0.75rem' }}>
                  {schuelerName(laengsschnitt.schueler)} — {laengsschnitt.schueler.klasse}
                </h4>
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Abgaben</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{laengsschnitt.anzahlAbgaben}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Kalibrierung</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600 }}>{laengsschnitt.kalibrierung.tendenz}</div>
                    {laengsschnitt.kalibrierung.mittlereAbweichung !== null && (
                      <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                        Ø Abweichung: {laengsschnitt.kalibrierung.mittlereAbweichung.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Trend summary */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {Object.entries(laengsschnitt.trend as Record<string, { start: number | null; ende: number | null; richtung: string }>).map(([key, t]) => (
                    <div key={key} style={{ padding: '0.375rem 0.75rem', background: 'var(--color-bg-base)', borderRadius: 'var(--radius)', fontSize: '0.8125rem' }}>
                      <span style={{ fontWeight: 600 }}>{key === 'noteApp' ? 'KI-Note' : key === 'noteLehrer' ? 'Lehrernote' : key}</span>{' '}
                      {trendIcon(t.richtung)}{' '}
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                        {t.start !== null ? t.start.toFixed(1) : '—'} → {t.ende !== null ? t.ende.toFixed(1) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notenverlauf Chart */}
              {laengsschnitt.verlauf.length > 1 && (
                <div style={{ ...cardStyle, marginBottom: '1rem' }}>
                  <h5 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
                    <BarChart3 size={16} style={{ verticalAlign: -2, marginRight: 6 }} /> Notenverlauf
                  </h5>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={laengsschnitt.verlauf} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="aufgabe" tick={{ fontSize: 12 }} />
                      <YAxis domain={[1, 5]} tick={{ fontSize: 12 }} reversed />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="noteApp" name="KI-Note" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                      <Line type="monotone" dataKey="noteLehrer" name="Lehrernote" stroke="#e74c3c" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                      <Line type="monotone" dataKey="k1" name="K1" stroke="#27ae60" strokeDasharray="4 2" dot={false} connectNulls />
                      <Line type="monotone" dataKey="k3" name="K3" stroke="#3498db" strokeDasharray="4 2" dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Fehlerschwerpunkte */}
              {laengsschnitt.fehlerschwerpunkte.length > 0 && (
                <div style={{ ...cardStyle, marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h5 style={{ fontSize: '0.875rem', margin: 0 }}>
                      <AlertTriangle size={16} style={{ verticalAlign: -2, marginRight: 6 }} /> Fehlerschwerpunkte
                    </h5>
                    {onGenerateUebung && (
                      <button
                        className="btn-primary"
                        onClick={handleGenerateUebung}
                        title="Erzeugt ein Übungsblatt zu den häufigsten Fehlern dieses Schülers"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                      >
                        <Wand2 size={14} /> Übungsblatt zu Schwächen
                      </button>
                    )}
                  </div>
                  {laengsschnitt.fehlerschwerpunkte.map((f: any) => (
                    <div key={f.typ} style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        {FEHLER_LABELS[f.typ] ?? f.typ} ({f.anzahl})
                      </div>
                      {f.beispiele.length > 0 && (
                        <div style={{ marginLeft: '1rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          {f.beispiele.slice(0, 3).map((b: any, i: number) => (
                            <div key={i}>{b.zitat && <span>"{b.zitat}"</span>}{b.korrektur && <span> → {b.korrektur}</span>}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Abgaben-Tabelle */}
              <div style={cardStyle}>
                <h5 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}>Abgaben im Detail</h5>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                        <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem' }}>Aufgabe</th>
                        <th style={{ textAlign: 'center', padding: '0.375rem 0.5rem' }}>KI</th>
                        <th style={{ textAlign: 'center', padding: '0.375rem 0.5rem' }}>Lehrer</th>
                        <th style={{ textAlign: 'center', padding: '0.375rem 0.5rem' }}>K1</th>
                        <th style={{ textAlign: 'center', padding: '0.375rem 0.5rem' }}>K3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {laengsschnitt.verlauf.map((v: any) => (
                        <tr key={v.abgabeId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.375rem 0.5rem' }}>{v.aufgabe}</td>
                          <td style={{ textAlign: 'center', padding: '0.375rem 0.5rem' }}>{v.noteApp !== null ? v.noteApp.toFixed(1) : '—'}</td>
                          <td style={{ textAlign: 'center', padding: '0.375rem 0.5rem' }}>{v.noteLehrer !== null ? v.noteLehrer.toFixed(1) : '—'}</td>
                          <td style={{ textAlign: 'center', padding: '0.375rem 0.5rem' }}>{v.k1 !== null ? v.k1.toFixed(1) : '—'}</td>
                          <td style={{ textAlign: 'center', padding: '0.375rem 0.5rem' }}>{v.k3 !== null ? v.k3.toFixed(1) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!loading && selectedSchuelerId && (
            <div style={{ ...cardStyle, marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '0.875rem', margin: 0 }}>
                  <Sparkles size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--color-accent)' }} />
                  KI-Schüler-Profil
                </h4>
                <button
                  className="btn-primary"
                  onClick={handleGenerateProfil}
                  disabled={profilBusy}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                  title="Generiert ein KI-Profil auf Basis des Längsschnitts (Fehlerschwerpunkte, Trend, Kalibrierung)"
                >
                  {profilBusy ? <><Loader2 size={13} className="spin" /> Generiere …</> : <><Sparkles size={13} /> Profil generieren</>}
                </button>
              </div>
              {profilError && <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger, #c0392b)', margin: '0.25rem 0' }}>{profilError}</p>}
              {profil ? (
                <>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem' }}>
                    {profil.erstelltAm && `${profil.erstelltAm} · `}{profil.modell || 'Modell unbekannt'}
                  </p>
                  <div style={{ maxHeight: '40vh', overflowY: 'auto', fontSize: '0.8125rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'var(--color-bg-base)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                    {profil.text}
                  </div>
                </>
              ) : (
                !profilBusy && <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>Noch kein Profil — Button klicken zum Generieren.</p>
              )}
            </div>
          )}

          {!loading && selectedKlasse && schueler.length === 0 && (
            <div style={cardStyle}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', margin: 0 }}>
                Keine Schüler in dieser Klasse.
              </p>
            </div>
          )}

          {!loading && !selectedKlasse && (
            <div style={cardStyle}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', margin: 0 }}>
                Wähle eine Klasse und einen Schüler, um den Längsschnitt zu sehen.
              </p>
            </div>
          )}
        </div>
      </div>
    </ViewShell>
  );
}
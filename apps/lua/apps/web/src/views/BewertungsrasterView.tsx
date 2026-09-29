import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, FileText, Save, Check, Plus, ShieldCheck } from 'lucide-react';
import { useNatascha, type RubrikBefund } from '../hooks/useNatascha';
import { ViewShell } from './_ViewShell';
import { InfoDot } from '../components/ui/InfoDot';
import { gruppiereRubriken, rubrikLabel, rubrikMetaZeile, type RubrikOption } from '../lib/rubrikAuswahl';
import { textsortenLabel } from '../lib/textsortenAuswahl';
import {
  dateinameVorschlag, mitRubrikEndung, pruefeRubrikName, rubrikMitTitel, titelAusRubrik,
} from '../lib/rubrikAnlegen';

/**
 * Bewertungsraster ansehen und bearbeiten.
 *
 * Eigener Reiter neben dem Erwartungshorizont, weil die beiden etwas
 * Verschiedenes sind: ein Erwartungshorizont gilt für *eine* Aufgabe und wird
 * bei jeder Änderung neu erzeugt, ein Bewertungsraster gilt für *viele*
 * Aufgaben und wird gepflegt. Der Gültigkeitsbereich ist der Unterschied —
 * beide im selben Reiter zu führen hieß, dass beim Wechseln das Gefühl
 * entsteht, es gäbe nur ein Objekt.
 *
 * Der Erwartungshorizont wird beim Bearbeiten eines Rasters nicht verändert.
 * Eine Änderung wirkt ab dem nächsten Korrekturauftrag mit diesem Raster;
 * bereits erzeugte Analysen enthalten die alte Bewertung.
 */
export function BewertungsrasterView() {
  const { listRubrics, readRubric, saveRubric, checkRubric } = useNatascha();

  const [rubriken, setRubriken] = useState<RubrikOption[]>([]);
  const [rubricName, setRubricName] = useState('');
  const [rubricContent, setRubricContent] = useState('');
  const [rubricLoading, setRubricLoading] = useState(false);
  const [rubricSaving, setRubricSaving] = useState(false);
  const [rubricMsg, setRubricMsg] = useState<string | null>(null);
  const [befund, setBefund] = useState<RubrikBefund | null>(null);
  const [befundPrueft, setBefundPrueft] = useState(false);

  // Neues Raster aus einer Vorlage anlegen
  const [neuOffen, setNeuOffen] = useState(false);
  const [neuQuelle, setNeuQuelle] = useState('');
  const [neuTitel, setNeuTitel] = useState('');
  const [neuDateiname, setNeuDateiname] = useState('');
  const [neuFehler, setNeuFehler] = useState<string | null>(null);
  const [neuBusy, setNeuBusy] = useState(false);

  // Ohne Filter: alle Raster, nach Fach gruppiert. Die Liste im Korrekturdialog
  // filtert nach Klasse — hier geht es darum, ALLES zu sehen und zu pflegen.
  const gruppen = useMemo(() => gruppiereRubriken(rubriken), [rubriken]);
  const gewaehlt = useMemo(
    () => rubriken.find((r) => r.filename === rubricName),
    [rubriken, rubricName],
  );

  useEffect(() => {
    // Fehler werden bewusst nicht geschluckt: eine leere Auswahlliste sieht aus
    // wie "alle Raster weg" und ist die schlechteste Diagnose, die es gibt.
    listRubrics()
      .then((liste) => setRubriken(liste.rubrics))
      .catch((e: unknown) => {
        setRubricMsg(`Raster konnten nicht geladen werden: ${e instanceof Error ? e.message : String(e)}`);
      });
  }, [listRubrics]);

  const loadRubric = useCallback(async (name: string) => {
    setRubricName(name);
    setRubricContent('');
    setRubricMsg(null);
    setBefund(null);
    if (!name) return;
    setRubricLoading(true);
    try {
      const inhalt = await readRubric(name);
      setRubricContent(inhalt);
      // Beim Laden mitprüfen: bei den mitgelieferten Rastern ist das der
      // Normalfall, und die Lehrkraft sieht so sofort, ob etwas nicht
      // zusammenpasst, ohne vorher etwas zu tun.
      setBefundPrueft(true);
      checkRubric(name, inhalt).then(setBefund).finally(() => setBefundPrueft(false));
    } catch (e) {
      setRubricMsg(typeof e === 'string' ? e : e instanceof Error ? e.message : 'Laden fehlgeschlagen.');
    } finally {
      setRubricLoading(false);
    }
  }, [readRubric, checkRubric]);

  const handleSaveRubric = useCallback(async () => {
    if (!rubricName) return;
    setRubricSaving(true); setRubricMsg(null);
    try {
      const r = await saveRubric(rubricName, rubricContent);
      setRubricMsg(`Gespeichert (${rubrikLabel(gewaehlt ?? { filename: r.name })}, ${r.bytes} Bytes).`);
      await listRubrics().then((liste) => setRubriken(liste.rubrics));
      // Nach dem Speichern ist genau der Stand geprüft, der jetzt auf der
      // Platte liegt — nicht der von davor.
      setBefundPrueft(true);
      checkRubric(rubricName, rubricContent).then(setBefund).finally(() => setBefundPrueft(false));
    } catch (e) {
      setRubricMsg(typeof e === 'string' ? e : e instanceof Error ? e.message : 'Speichern fehlgeschlagen.');
    } finally {
      setRubricSaving(false);
    }
  }, [rubricName, rubricContent, gewaehlt, saveRubric, listRubrics, checkRubric]);

  /** Prüft den aktuellen Text, ohne zu speichern. */
  const pruefeJetzt = useCallback(() => {
    if (!rubricName || befundPrueft) return;
    setBefundPrueft(true);
    checkRubric(rubricName, rubricContent).then(setBefund).finally(() => setBefundPrueft(false));
  }, [rubricName, rubricContent, checkRubric, befundPrueft]);

  /** Vorlage wählen: Titel und Vorschlag für den Dateinamen vorbelegen. */
  const waehleVorlage = useCallback(async (quelle: string) => {
    setNeuQuelle(quelle);
    if (!quelle) { setNeuTitel(''); return; }
    try {
      const inhalt = await readRubric(quelle);
      const titel = titelAusRubrik(inhalt) || rubrikLabel({ filename: quelle });
      setNeuTitel(titel);
      setNeuDateiname(dateinameVorschlag(titel));
      setNeuFehler(null);
    } catch (e) {
      setNeuFehler(e instanceof Error ? e.message : String(e));
    }
  }, [readRubric]);

  const dateiName = mitRubrikEndung(neuDateiname);
  const namePruefung = pruefeRubrikName(dateiName);
  const nameVorhanden = rubriken.some((r) => r.filename === dateiName);
  const kannAnlegen = neuQuelle !== '' && neuTitel.trim() !== '' && namePruefung.ok;

  const legeAn = useCallback(async () => {
    if (!kannAnlegen) return;
    // Überschreiben ist der gefährlichste Moment in diesem Reiter: `save-rubric`
    // schreibt bedingungslos. Ein Tippfehler im Namen würde ein mitgeliefertes
    // Raster zerstören, ohne dass etwas sichtbar würde.
    if (nameVorhanden) {
      const treffer = rubriken.find((r) => r.filename === dateiName);
      const ok = window.confirm(
        `Es gibt bereits ein Raster mit dem Namen „${dateiName}"${treffer ? ` („${rubrikLabel(treffer)}")` : ''}.\n\n`
        + 'Beim Anlegen wird es vollständig ersetzt. Der bisherige Stand geht verloren.\n\n'
        + 'Trotzdem fortfahren?',
      );
      if (!ok) return;
    }
    setNeuBusy(true); setNeuFehler(null);
    try {
      const inhalt = await readRubric(neuQuelle);
      const kopie = rubrikMitTitel(inhalt, neuTitel.trim());
      await saveRubric(dateiName, kopie);
      await listRubrics().then((liste) => setRubriken(liste.rubrics));
      setNeuOffen(false);
      setNeuQuelle(''); setNeuTitel(''); setNeuDateiname('');
      await loadRubric(dateiName);
      setRubricMsg('Neues Raster angelegt. Prüfe es und passe Kriterien und Gewichtung an.');
    } catch (e) {
      setNeuFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setNeuBusy(false);
    }
  }, [kannAnlegen, nameVorhanden, dateiName, rubriken, neuTitel, neuQuelle, readRubric, saveRubric, listRubrics, loadRubric]);

  return (
    <ViewShell
      title="Bewertungsraster"
      description="Woran LUKA eine Klassenleistung misst. Änderungen wirken ab dem nächsten Korrekturauftrag mit diesem Raster."
      maxWidth={1000}
    >
      <section style={cardStyle}>
        <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <FileText size={16} /> Raster bearbeiten
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', flexWrap: 'wrap' }}>
          <div>
            <label style={labelStyle}>
              Bewertungsraster
              <InfoDot text="Angezeigt wird der Name aus dem Raster-Kopf, nach Fach sortiert. Der Dateiname spielt keine Rolle — entscheidend ist der Inhalt darunter." />
            </label>
            <select
              value={rubricName}
              onChange={(e) => loadRubric(e.target.value)}
              aria-label="Bewertungsraster wählen"
              style={{ minWidth: 260 }}
            >
              <option value="">— wählen —</option>
              {gruppen.map((gruppe) => (
                <optgroup key={gruppe.fach || 'ohne'} label={gruppe.label}>
                  {gruppe.rubriken.map((r) => (
                    <option key={r.filename} value={r.filename}>{rubrikLabel(r)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {rubricLoading && <Loader2 size={16} className="spin" style={{ marginBottom: 8 }} />}
          <button
            type="button"
            onClick={() => { setNeuOffen(!neuOffen); setNeuFehler(null); }}
            style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', padding: '0.35rem 0.8rem' }}
          >
            <Plus size={14} /> {neuOffen ? 'Abbrechen' : 'Neues Raster'}
          </button>
        </div>

        {neuOffen && (
          <div style={panelStyle}>
            <p style={hinweisStyle}>
              Ein neues Raster entsteht aus einer Vorlage. Das ist Absicht: Ein Raster
              besteht aus Kriterien-Schlüsseln, Gewichtung und fünf Stufen je Kriterium —
              wer das leer anlegt, bekommt eine Note, die nichts aussagt. Mit einer Vorlage
              ist die Struktur schon richtig, und du änderst nur, was abweichen soll.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>
                  Vorlage
                  <InfoDot text="Wird vollständig übernommen: Kriterien, Gewichtung, Stufen. Danach änderst du nur, was abweichen soll." />
                </label>
                <select
                  value={neuQuelle}
                  onChange={(e) => waehleVorlage(e.target.value)}
                  aria-label="Vorlage wählen"
                  style={{ width: '100%' }}
                >
                  <option value="">— wählen —</option>
                  {gruppen.map((gruppe) => (
                    <optgroup key={gruppe.fach || 'ohne'} label={gruppe.label}>
                      {gruppe.rubriken.map((r) => (
                        <option key={r.filename} value={r.filename}>{rubrikLabel(r)}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>
                  Name im Auswahlfeld
                  <InfoDot text="Das ist der Text, den du später in den Listen siehst. Er steht im Raster-Kopf und kann jederzeit geändert werden." />
                </label>
                <input
                  value={neuTitel}
                  onChange={(e) => {
                    const titel = e.target.value;
                    setNeuTitel(titel);
                    // Dateiname nur vorschlagen, solange die Lehrkraft ihn nicht
                    // selbst überschrieben hat. `neuTitel` ist hier noch der
                    // Wert VOR dieser Änderung - genau der, aus dem der bisherige
                    // Vorschlag stammt.
                    if (!neuDateiname || neuDateiname === dateinameVorschlag(neuTitel)) {
                      setNeuDateiname(dateinameVorschlag(titel));
                    }
                  }}
                  placeholder="z. B. Leseverständnis Unterstufe"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Dateiname im Ordner
                  <InfoDot text="Technisch, aber harmlos: Der Dateiname entscheidet nichts. Fach und Schulstufe stehen im Raster-Kopf." />
                </label>
                <input
                  value={neuDateiname}
                  onChange={(e) => setNeuDateiname(e.target.value)}
                  placeholder="leseverstaendnis_unterstufe.md"
                  style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
                />
              </div>
            </div>

            {!namePruefung.ok && dateiName && (
              <p style={{ ...hinweisStyle, color: 'var(--color-danger, #c0392b)' }}>{namePruefung.grund}</p>
            )}
            {namePruefung.ok && nameVorhanden && (
              <p style={{ ...hinweisStyle, color: 'var(--color-warning, #b8860b)' }}>
                Achtung: Unter diesem Namen gibt es bereits ein Raster. Beim Anlegen wird
                es ersetzt — der bisherige Stand geht verloren.
              </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={legeAn}
                disabled={!kannAnlegen || neuBusy}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', padding: '0.35rem 0.8rem' }}
              >
                <Plus size={14} /> {neuBusy ? 'Lege an …' : 'Raster anlegen'}
              </button>
              {!kannAnlegen && !neuBusy && (
                <span style={hinweisStyle}>Vorlage und Name wählen, dann kann angelegt werden.</span>
              )}
              {neuFehler && (
                <span style={{ ...hinweisStyle, color: 'var(--color-danger, #c0392b)' }}>{neuFehler}</span>
              )}
            </div>
          </div>
        )}

        {gewaehlt && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.5rem 0 0' }}>
            {[
              rubrikMetaZeile(gewaehlt),
              // Nur nennen, wenn es etwas einschränkt — "alle" wäre Füllwort.
              textsortenLabel(gewaehlt.textsorte)
                ? `Textsorte: ${textsortenLabel(gewaehlt.textsorte)}`
                : '',
            ].filter(Boolean).join(' · ')}
          </p>
        )}

        {rubricName && !rubricLoading && (
          <>
            {befund && (befund.fehler.length > 0 || befund.hinweise.length > 0) && (
              <div style={befundStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                  <strong style={{ fontSize: '0.75rem' }}>Prüfung</strong>
                  {befund.fehler.length > 0 ? (
                    <span style={{ fontSize: '0.6875rem', padding: '0.1rem 0.4rem', borderRadius: 999, color: '#fff', background: 'var(--color-danger, #c0392b)' }}>
                      {befund.fehler.length} {befund.fehler.length === 1 ? 'Hinweis' : 'Hinweise'} zum Nachsehen
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.6875rem', padding: '0.1rem 0.4rem', borderRadius: 999, color: '#fff', background: 'var(--color-warning, #b8860b)' }}>
                      gut, mit {befund.hinweise.length} {befund.hinweise.length === 1 ? 'Anmerkung' : 'Anmerkungen'}
                    </span>
                  )}
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                    — das Speichern ist trotzdem möglich
                  </span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.75rem', lineHeight: 1.5 }}>
                  {[...befund.fehler, ...befund.hinweise].map((meldung) => (
                    <li key={meldung}>{meldung}</li>
                  ))}
                </ul>
              </div>
            )}

            <textarea
              value={rubricContent}
              onChange={(e) => setRubricContent(e.target.value)}
              spellCheck={false}
              aria-label="Inhalt des Bewertungsrasters"
              style={{
                width: '100%', boxSizing: 'border-box', minHeight: '40vh', maxHeight: '60vh',
                marginTop: '0.75rem',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.8125rem', lineHeight: 1.5, resize: 'vertical',
                background: 'var(--color-bg-base)', padding: '1rem', borderRadius: 'var(--radius)',
                border: '1px solid var(--color-border)', color: 'var(--color-text-primary)',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                className="btn-primary"
                onClick={handleSaveRubric}
                disabled={rubricSaving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', padding: '0.35rem 0.8rem' }}
              >
                <Save size={14} /> {rubricSaving ? 'Speichere …' : 'Speichern'}
              </button>
              <button
                type="button"
                onClick={pruefeJetzt}
                disabled={befundPrueft}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', padding: '0.35rem 0.8rem' }}
              >
                {befundPrueft ? <Loader2 size={14} className="spin" /> : <ShieldCheck size={14} />}
                {befundPrueft ? 'Prüfe …' : 'Prüfen'}
              </button>
              {rubricMsg && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  {rubricMsg.startsWith('Gespeichert') && <Check size={13} aria-hidden="true" style={{ color: 'var(--color-success)' }} />}
                  {rubricMsg}
                </span>
              )}
            </div>
          </>
        )}
        {!rubricName && rubricMsg && (
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', marginBottom: 0, color: 'var(--color-danger, #c0392b)' }}>{rubricMsg}</p>
        )}
      </section>
    </ViewShell>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.25rem',
  marginBottom: '1.5rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  marginBottom: '0.25rem',
  color: 'var(--color-text-secondary)',
};

const panelStyle: React.CSSProperties = {
  marginTop: '0.75rem',
  padding: '0.875rem',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)',
  background: 'var(--color-bg-base)',
};

const befundStyle: React.CSSProperties = {
  marginTop: '0.75rem',
  padding: '0.625rem 0.75rem',
  border: '1px solid var(--color-border)',
  borderLeft: '3px solid var(--color-warning, #b8860b)',
  borderRadius: 'var(--radius)',
  background: 'var(--color-bg-base)',
};

const hinweisStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--color-text-secondary)',
  margin: '0.5rem 0 0',
};

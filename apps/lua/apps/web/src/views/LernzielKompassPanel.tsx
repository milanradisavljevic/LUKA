import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Loader2, Plus, Save } from 'lucide-react';
import type { KlasseMeta } from '../hooks/useKlassenMeta';
import { useNatascha, type SchuelerInfo } from '../hooks/useNatascha';
import { useEinsatz, type EinsatzRecord } from '../hooks/useEinsatz';
import { useLernzielKompass, type AbrufCheck, type AbrufCheckErgebnisAenderung, type AbrufCheckTeilnahme, type LernzielEvidenz, type LernzielFokus } from '../hooks/useLernzielKompass';
import { vorbereiteteAbrufcheckAntworten } from '../lib/abrufcheckBatch';
import { ausgangsstundenOptions, isoDatum, spaetereCheckStunden, vorgeschlageneCheckStunde } from '../lib/lernzielKompassTermine';
import { heuteIso } from '../lib/lokalDatum';

interface Props {
  klasse: KlasseMeta | undefined;
  klasseName: string | null;
  aufgabe: string | null;
}

const FEHLER_LABELS: Record<string, string> = { R: 'Rechtschreibung', G: 'Grammatik', Z: 'Zeichensetzung', A: 'Ausdruck' };
const MIN_DIAGNOSTIC_RESPONSES = 3;
const CARD: React.CSSProperties = {
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
  background: 'var(--color-bg-surface)', padding: '1rem',
};

function dateOnly(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function readableDate(value: string | null | undefined): string {
  const date = dateOnly(value);
  if (!date) return 'Datum offen';
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('de-DE');
}

function readableTimestamp(value: string): string {
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

const ERGEBNIS_LABELS: Record<AbrufCheckErgebnisAenderung['ergebnisVorher'], string> = {
  richtig: 'Ziel erreicht', teilweise: 'Teilweise gezeigt', noch_nicht: 'Noch nicht gezeigt',
};

function formatPeriod(from: string | null, to: string | null): string {
  if (!from && !to) return 'Zeitraum unbekannt';
  if (from && to && dateOnly(from) !== dateOnly(to)) return `${readableDate(from)} bis ${readableDate(to)}`;
  return readableDate(from ?? to);
}

function studentName(student: Pick<SchuelerInfo, 'vorname' | 'nachname'> | Pick<AbrufCheckTeilnahme, 'vorname' | 'nachname'>): string {
  return [student.vorname, student.nachname].filter(Boolean).join(' ');
}

function optionen(check: AbrufCheck): string[] {
  try {
    const value: unknown = JSON.parse(check.optionenJson);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch { return []; }
}

export function LernzielKompassPanel({ klasse, klasseName, aufgabe, abrufcheckId }: Props & { abrufcheckId?: string | null }) {
  const { listSchueler } = useNatascha();
  const { list: listEinsaetze } = useEinsatz();
  const { evidenz, listFokus, bestaetigen, ausgangsstundeVerbinden, listChecks, listTeilnahme, listErgebnisAenderungen, teilnahmeSpeichern, erstellen, ergebnisSpeichern, ergebnisseBatchSpeichern } = useLernzielKompass();
  const [evidenzZeilen, setEvidenzZeilen] = useState<LernzielEvidenz[]>([]);
  const [fokus, setFokus] = useState<LernzielFokus[]>([]);
  const [checks, setChecks] = useState<AbrufCheck[]>([]);
  const [lessons, setLessons] = useState<EinsatzRecord[]>([]);
  const [students, setStudents] = useState<SchuelerInfo[]>([]);
  const [teilnahmen, setTeilnahmen] = useState<AbrufCheckTeilnahme[]>([]);
  const [ziele, setZiele] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [checkFokus, setCheckFokus] = useState<LernzielFokus | null>(null);
  const [ausgangsstundenId, setAusgangsstundenId] = useState('');
  const [legacyStundenIds, setLegacyStundenIds] = useState<Record<string, string>>({});
  const [lessonId, setLessonId] = useState('');
  const [mode, setMode] = useState<'offen' | 'auswahl'>('offen');
  const [frage, setFrage] = useState('');
  const [optionLines, setOptionLines] = useState('');
  const [solution, setSolution] = useState('');
  const [basisBestaetigt, setBasisBestaetigt] = useState(false);
  const [selectedCheckId, setSelectedCheckId] = useState('');
  const [antwortEntwuerfe, setAntwortEntwuerfe] = useState<Record<number, string>>({});
  const [auswertungen, setAuswertungen] = useState<Record<number, 'richtig' | 'teilweise' | 'noch_nicht'>>({});
  const [teilnahmeBusyId, setTeilnahmeBusyId] = useState<number | null>(null);
  const [ergebnisAenderungen, setErgebnisAenderungen] = useState<Record<string, AbrufCheckErgebnisAenderung[]>>({});
  const [offenerVerlauf, setOffenerVerlauf] = useState<string | null>(null);
  const [verlaufBusy, setVerlaufBusy] = useState<string | null>(null);

  useEffect(() => { setAusgangsstundenId(''); setLegacyStundenIds({}); }, [klasse?.id]);

  const reload = async () => {
    if (!klasse?.id || !klasseName) return;
    const [goals, retrievals, studentRows, lessonRows] = await Promise.all([
      listFokus(klasse.id), listChecks(klasse.id), listSchueler(klasseName, klasse.id), listEinsaetze({ klasseId: klasse.id }),
    ]);
    setFokus(goals);
    setChecks(retrievals);
    setStudents(studentRows.filter((student) => !student.zuordnungPruefen));
    setLessons(lessonRows);
  };

  useEffect(() => {
    let active = true;
    if (!klasse?.id || !klasseName) {
      setEvidenzZeilen([]); setFokus([]); setChecks([]); setLessons([]); setStudents([]); setTeilnahmen([]);
      return;
    }
    setLoading(true); setError(null); setMessage(null);
    Promise.all([
      listFokus(klasse.id), listChecks(klasse.id), listSchueler(klasseName, klasse.id), listEinsaetze({ klasseId: klasse.id }),
      aufgabe ? evidenz(klasse.id, aufgabe) : Promise.resolve([]),
    ]).then(([goals, retrievals, studentRows, lessonRows, sources]) => {
      if (!active) return;
      setFokus(goals); setChecks(retrievals); setStudents(studentRows.filter((student) => !student.zuordnungPruefen)); setLessons(lessonRows); setEvidenzZeilen(sources);
      setSelectedCheckId((current) => abrufcheckId && retrievals.some((item) => item.id === abrufcheckId)
        ? abrufcheckId : retrievals.some((item) => item.id === current) ? current : retrievals[0]?.id ?? '');
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : String(cause));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [klasse?.id, klasseName, aufgabe, abrufcheckId, evidenz, listFokus, listChecks, listSchueler, listEinsaetze]);

  const selectedCheck = checks.find((item) => item.id === selectedCheckId) ?? null;
  useEffect(() => {
    let active = true;
    if (!selectedCheckId) { setTeilnahmen([]); return; }
    void listTeilnahme(selectedCheckId).then((rows) => {
      if (!active) return;
      setTeilnahmen(rows);
      setAntwortEntwuerfe(Object.fromEntries(rows.map((row) => [row.schuelerId, row.antwort ?? ''])));
      setAuswertungen(Object.fromEntries(rows.filter((row) => row.ergebnis != null)
        .map((row) => [row.schuelerId, row.ergebnis as 'richtig' | 'teilweise' | 'noch_nicht'])));
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : String(cause));
    });
    return () => { active = false; };
  }, [selectedCheckId, listTeilnahme]);
  const today = heuteIso();
  const validOriginLessons = useMemo(() => ausgangsstundenOptions(lessons, today), [lessons, today]);
  const latestCheckBasis = checkFokus
    ? [isoDatum(checkFokus.ausgangsdatumSnapshot), isoDatum(checkFokus.zeitraumBis)].filter((value): value is string => !!value).sort().at(-1) ?? null
    : null;
  const futureLessons = useMemo(() => checkFokus
    ? spaetereCheckStunden(lessons, latestCheckBasis, today)
    : [], [checkFokus, lessons, latestCheckBasis, today]);

  const startCheck = (target: LernzielFokus) => {
    if (!target.ausgangseinsatzId || !target.ausgangsdatumSnapshot) {
      setError('Bitte verbinde zuerst eine Ausgangsstunde mit diesem Lernziel.'); return;
    }
    setCheckFokus(target);
    const basis = [isoDatum(target.ausgangsdatumSnapshot), isoDatum(target.zeitraumBis)].filter((value): value is string => !!value).sort().at(-1) ?? null;
    const suggestion = vorgeschlageneCheckStunde(lessons, basis, today);
    setLessonId(suggestion?.id ?? '');
    setMode('offen'); setFrage(`Zeige an einem eigenen Beispiel: ${target.lernziel.toLowerCase()}.`);
    setOptionLines(''); setSolution(''); setBasisBestaetigt(false); setError(null); setMessage(null);
  };

  const saveGoal = async (source: LernzielEvidenz) => {
    const lernziel = (ziele[source.fehlerTyp] ?? '').trim();
    if (!klasse?.id || !klasseName || !aufgabe || !lernziel || !ausgangsstundenId) {
      setError('Bitte ein konkretes Lernziel und die zugehörige Ausgangsstunde auswählen.'); return;
    }
    setBusy(true); setError(null); setMessage(null);
    try {
      const saved = await bestaetigen({ klasseId: klasse.id, klasseNameSnapshot: klasseName, lernziel,
        fehlerTyp: source.fehlerTyp, aufgabeSnapshot: aufgabe, ausgangseinsatzId: ausgangsstundenId });
      setFokus((current) => [saved, ...current]);
      setZiele((current) => ({ ...current, [source.fehlerTyp]: '' }));
      setMessage('Lernziel und Korrekturquelle wurden bestätigt.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setBusy(false); }
  };

  const linkLegacyGoal = async (goal: LernzielFokus) => {
    const lessonId = legacyStundenIds[goal.id];
    if (!lessonId) { setError('Bitte eine Ausgangsstunde auswählen.'); return; }
    setBusy(true); setError(null); setMessage(null);
    try {
      const updated = await ausgangsstundeVerbinden(goal.id, lessonId);
      setFokus((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage('Ausgangsstunde wurde mit dem Lernziel verbunden.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setBusy(false); }
  };

  const saveCheck = async () => {
    if (!checkFokus || !lessonId || !frage.trim()) { setError('Bitte eine passende spätere Stunde und eine kurze Frage wählen.'); return; }
    const options = optionLines.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    setBusy(true); setError(null); setMessage(null);
    try {
      const created = await erstellen({ fokusId: checkFokus.id, einsatzId: lessonId, antwortmodus: mode, frage,
        optionen: options, loesung: mode === 'auswahl' ? solution : null,
        vergleichsgrundlageBestaetigt: mode === 'offen' && basisBestaetigt });
      setChecks((current) => [created, ...current]);
      setSelectedCheckId(created.id); setCheckFokus(null); setMessage('Abrufcheck wurde mit der geplanten Stunde verknüpft.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setBusy(false); }
  };

  const saveAnswer = async (targetStudentId: number, answerText: string, savedRating: 'richtig' | 'teilweise' | 'noch_nicht' | null) => {
    if (!selectedCheck || !answerText.trim()) { setError('Bitte eine Antwort eintragen.'); return; }
    const rating = auswertungen[targetStudentId] ?? savedRating;
    if (selectedCheck.antwortmodus === 'offen' && !rating) { setError('Bitte zuerst die Lehrkraftauswertung auswählen.'); return; }
    setBusy(true); setError(null); setMessage(null);
    try {
      const result = await ergebnisSpeichern({ abrufcheckId: selectedCheck.id, schuelerId: targetStudentId,
        antwort: answerText, ergebnis: selectedCheck.antwortmodus === 'offen' ? rating! : null });
      await reload();
      setTeilnahmen(await listTeilnahme(selectedCheck.id));
      setErgebnisAenderungen((current) => {
        const next = { ...current };
        delete next[`${selectedCheck.id}:${targetStudentId}`];
        return next;
      });
      setMessage(selectedCheck.antwortmodus === 'auswahl'
        ? `Antwort lokal als „${result === 'richtig' ? 'richtig' : 'noch nicht richtig'}“ geprüft.`
        : 'Antwort und Lehrkraftauswertung gespeichert.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setBusy(false); }
  };

  const toggleErgebnisVerlauf = async (student: AbrufCheckTeilnahme) => {
    if (!selectedCheck || student.aenderungAnzahl === 0) return;
    const key = `${selectedCheck.id}:${student.schuelerId}`;
    if (offenerVerlauf === key) { setOffenerVerlauf(null); return; }
    setOffenerVerlauf(key);
    if (Object.prototype.hasOwnProperty.call(ergebnisAenderungen, key)) return;
    setVerlaufBusy(key); setError(null);
    try {
      const rows = await listErgebnisAenderungen(selectedCheck.id, student.schuelerId);
      setErgebnisAenderungen((current) => ({ ...current, [key]: rows }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setVerlaufBusy(null); }
  };

  const saveAttendance = async (student: AbrufCheckTeilnahme, status: AbrufCheckTeilnahme['status']) => {
    if (!selectedCheck || !klasse?.id) return;
    setTeilnahmeBusyId(student.schuelerId); setError(null); setMessage(null);
    try {
      await teilnahmeSpeichern({ abrufcheckId: selectedCheck.id, schuelerId: student.schuelerId, status });
      const [rows, refreshedChecks] = await Promise.all([listTeilnahme(selectedCheck.id), listChecks(klasse.id)]);
      setTeilnahmen(rows); setChecks(refreshedChecks);
      setMessage(status === 'abwesend' ? 'Nichtteilnahme gespeichert.' : status === 'anwesend' ? 'Teilnahme gespeichert; eine Antwort kann noch fehlen.' : 'Teilnahmestatus wieder geöffnet.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setTeilnahmeBusyId(null); }
  };

  const lessonSuggestion = checkFokus ? vorgeschlageneCheckStunde(lessons, latestCheckBasis, today) : undefined;
  const responseOptions = selectedCheck ? optionen(selectedCheck) : [];
  const selectedFocus = selectedCheck ? fokus.find((item) => item.id === selectedCheck.fokusId) : undefined;
  const hasDiagnosticObservations = !!selectedFocus && selectedCheck != null;
  const visibleParticipation = useMemo(() => {
    if (!selectedCheck) return [];
    if (selectedCheck.teilnahmelisteSnapshot) return teilnahmen;
    const recorded = new Map(teilnahmen.map((row) => [row.schuelerId, row]));
    const currentIds = new Set(students.filter((student) => !student.zuordnungPruefen).map((student) => student.id));
    const currentRoster = students.filter((student) => !student.zuordnungPruefen).map((student) => recorded.get(student.id) ?? ({
      schuelerId: student.id, vorname: student.vorname, nachname: student.nachname,
      status: 'offen' as const, antwort: null, ergebnis: null, aenderungAnzahl: 0,
    }));
    return [...currentRoster, ...teilnahmen.filter((row) => !currentIds.has(row.schuelerId))];
  }, [selectedCheck, students, teilnahmen]);
  const vorbereiteteAntworten = useMemo(() => selectedCheck
    ? vorbereiteteAbrufcheckAntworten(selectedCheck.antwortmodus, visibleParticipation, antwortEntwuerfe, auswertungen)
    : [], [selectedCheck, visibleParticipation, antwortEntwuerfe, auswertungen]);

  const savePreparedAnswers = async () => {
    if (!selectedCheck || !klasse?.id || vorbereiteteAntworten.length === 0) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const savedCount = await ergebnisseBatchSpeichern({ abrufcheckId: selectedCheck.id, eintraege: vorbereiteteAntworten });
      const [rows, refreshedChecks] = await Promise.all([listTeilnahme(selectedCheck.id), listChecks(klasse.id)]);
      setTeilnahmen(rows); setChecks(refreshedChecks);
      setMessage(`${savedCount} vorbereitete Antworten wurden gespeichert.`);
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause);
      setError(`Keine der vorbereiteten Antworten wurde gespeichert: ${detail}`);
    } finally { setBusy(false); }
  };

  if (!klasse?.id) {
    return <div style={CARD}><strong>Lernziel-Kompass</strong><p style={{ marginBottom: 0, color: 'var(--color-text-secondary)' }}>
      Für diesen Klassenkontext fehlt noch eine stabile Klassenidentität. Bitte lege die Klasse zuerst im Bereich „Klassen“ mit Schuljahr an.
    </p></div>;
  }

  return <div style={{ display: 'grid', gap: '1rem' }}>
    {klasse.pruefungNoetig && <div style={{ ...CARD, borderColor: 'var(--color-warning, #d99a25)' }}>
      <strong>Altdaten prüfen</strong><p style={{ margin: '0.35rem 0 0', color: 'var(--color-text-secondary)' }}>
        Für diese Klasse ist das Schuljahr oder der Kurskontext noch nicht bestätigt. Die angezeigten Korrekturbelege bleiben sichtbar; bestätige die Stammdaten, bevor du sie mit späteren Kursen vergleichst.
      </p></div>}

    <section style={CARD}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={18} /><h3 style={{ margin: 0 }}>Lernziel-Kompass</h3></div>
      <p style={{ color: 'var(--color-text-secondary)', margin: '0.5rem 0 1rem' }}>
        Korrekturmuster werden erst nach deiner Bestätigung mit einem Lernziel verknüpft. Geplante Materialien zählen nicht als Lernergebnis.
      </p>
      {!aufgabe && <p>Wähle links eine Aufgabe mit vorliegenden Korrekturen, um belastbare Fehlermuster zu sehen.</p>}
      {aufgabe && evidenzZeilen.length === 0 && !loading && <p>Für „{aufgabe}“ liegen noch keine passenden, auswertbaren Korrekturen vor.</p>}
      {evidenzZeilen.length > 0 && <label style={{ display: 'block', margin: '0.75rem 0', fontSize: '0.82rem' }}>
        Ausgangsstunde für dieses Lernziel
        <select value={ausgangsstundenId} onChange={(event) => setAusgangsstundenId(event.target.value)} style={{ display: 'block', width: '100%', marginTop: 4 }}>
          <option value="">Stunde auswählen …</option>
          {validOriginLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>
            {readableDate(lesson.status === 'eingesetzt' ? lesson.eingesetztAm ?? lesson.geplantAm : lesson.geplantAm)} · {lesson.titelSnapshot || 'Stunde ohne Titel'} · {lesson.status === 'eingesetzt' ? 'gehalten' : 'geplant'}
          </option>)}
        </select>
        <span style={{ display: 'block', color: 'var(--color-text-secondary)', marginTop: 3 }}>
          Die Stunde wird zusammen mit Korrekturquelle und Zeitraum gespeichert.
        </span>
      </label>}
      {evidenzZeilen.length > 0 && validOriginLessons.length === 0 && <p role="status">Lege zuerst eine datierte Klassenstunde an oder markiere eine vergangene Stunde als gehalten.</p>}
      {loading && <p><Loader2 size={15} className="spin" style={{ verticalAlign: -3, marginRight: 5 }} />Evidenz wird geladen …</p>}
      {evidenzZeilen.map((source) => <div key={source.fehlerTyp} style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
          <div><strong>{FEHLER_LABELS[source.fehlerTyp] ?? source.fehlerTyp}</strong>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginTop: 3 }}>
              Quelle: {aufgabe} · {source.fehlerAnzahl} von {source.antwortAnzahl} Abgaben mit diesem Fehlermuster · {formatPeriod(source.zeitraumVon, source.zeitraumBis)}
            </div></div>
          <button className="btn-secondary" disabled={busy || !ausgangsstundenId || !source.antwortAnzahl || !source.fehlerAnzahl}
            onClick={() => void saveGoal(source)} style={{ whiteSpace: 'nowrap' }}><CheckCircle2 size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Lernziel bestätigen</button>
        </div>
        <label style={{ display: 'block', marginTop: '0.55rem', fontSize: '0.8rem' }}>Passendes Lernziel
          <input value={ziele[source.fehlerTyp] ?? ''} onChange={(event) => setZiele((current) => ({ ...current, [source.fehlerTyp]: event.target.value }))}
            placeholder="z. B. Nebensätze sicher mit Komma abgrenzen" style={{ width: '100%', marginTop: 4 }} />
        </label>
      </div>)}
    </section>

    {error && <div role="alert" style={{ ...CARD, color: 'var(--color-danger, #a93226)' }}>{error}</div>}
    {message && <div role="status" style={{ ...CARD, color: 'var(--color-success, #247a4b)' }}>{message}</div>}

    <section style={CARD}>
      <h3 style={{ margin: '0 0 0.75rem' }}>Bestätigte Lernziele</h3>
      {fokus.length === 0 && <p style={{ color: 'var(--color-text-secondary)' }}>Noch keine Lernziele bestätigt.</p>}
      <div style={{ display: 'grid', gap: '0.6rem' }}>
        {fokus.map((item) => <article key={item.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.75rem' }}>
          <strong>{item.lernziel}</strong>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', margin: '0.25rem 0 0.55rem' }}>
            {FEHLER_LABELS[item.fehlerTyp] ?? item.fehlerTyp} · Quelle „{item.aufgabeSnapshot}“ · {item.fehlerAnzahl}/{item.antwortAnzahl} Abgaben mit Muster · {formatPeriod(item.zeitraumVon, item.zeitraumBis)}
          </div>
          {item.ausgangseinsatzId ? <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', marginBottom: '0.55rem' }}>
            Ausgangsstunde: {item.ausgangsstundenTitelSnapshot || 'Stunde'} · {readableDate(item.ausgangsdatumSnapshot)}
          </div> : <div style={{ display: 'flex', alignItems: 'end', gap: 8, flexWrap: 'wrap', marginBottom: '0.55rem' }}>
            <label style={{ flex: '1 1 260px', fontSize: '0.8rem' }}>Ausgangsstunde ergänzen
              <select value={legacyStundenIds[item.id] ?? ''} onChange={(event) => setLegacyStundenIds((current) => ({ ...current, [item.id]: event.target.value }))} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                <option value="">Stunde auswählen …</option>
                {validOriginLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>
                  {readableDate(lesson.status === 'eingesetzt' ? lesson.eingesetztAm ?? lesson.geplantAm : lesson.geplantAm)} · {lesson.titelSnapshot || 'Stunde ohne Titel'}
                </option>)}
              </select>
            </label>
            <button className="btn-secondary" disabled={busy || !legacyStundenIds[item.id]} onClick={() => void linkLegacyGoal(item)}>Stunde verbinden</button>
          </div>}
          <button className="btn-secondary" disabled={!item.ausgangseinsatzId} onClick={() => startCheck(item)}><Plus size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Späteren Abrufcheck erstellen</button>
          {!item.ausgangseinsatzId && <span style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginTop: 4 }}>Verbinde zuerst die Ausgangsstunde.</span>}
        </article>)}
      </div>
    </section>

    {checkFokus && <section style={{ ...CARD, borderColor: 'var(--color-accent)' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Check für „{checkFokus.lernziel}“</h3>
      <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 0.75rem' }}>
        {lessonSuggestion ? `Vorschlag (7–14 Tage nach Ausgangsstunde und Korrektur): ${readableDate(lessonSuggestion.geplantAm)} · ${lessonSuggestion.titelSnapshot}.` : 'Für die nächsten 7–14 Tage ist keine passende Klassenstunde geplant. Wähle einen der späteren Termine oder plane zuerst eine Klassenstunde unter Unterricht.'}
        {' '}Der Termin ist über die Stundenauswahl änderbar.
      </p>
      {futureLessons.length > 0 && <>
        <label style={{ display: 'block', fontSize: '0.82rem' }}>Spätere Klassenstunde
          <select value={lessonId} onChange={(event) => setLessonId(event.target.value)} style={{ display: 'block', width: '100%', marginTop: 4 }}>
            {futureLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{readableDate(lesson.geplantAm)} · {lesson.titelSnapshot}</option>)}
          </select>
        </label>
        <label style={{ display: 'block', fontSize: '0.82rem', marginTop: '0.6rem' }}>Antwortformat
          <select value={mode} onChange={(event) => { setMode(event.target.value as 'offen' | 'auswahl'); setBasisBestaetigt(false); }} style={{ display: 'block', marginTop: 4 }}>
            <option value="offen">Offene Antwort · Lehrkraft wertet aus</option>
            <option value="auswahl">Auswahlfrage · lokal prüfen</option>
          </select>
        </label>
        <label style={{ display: 'block', fontSize: '0.82rem', marginTop: '0.6rem' }}>Kurze Checkfrage
          <textarea value={frage} onChange={(event) => setFrage(event.target.value)} rows={3} style={{ display: 'block', width: '100%', marginTop: 4 }} />
        </label>
        {mode === 'auswahl' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          <label style={{ fontSize: '0.82rem' }}>Antwortoptionen · eine pro Zeile
            <textarea value={optionLines} onChange={(event) => setOptionLines(event.target.value)} rows={4} style={{ display: 'block', width: '100%', marginTop: 4 }} />
          </label>
          <label style={{ fontSize: '0.82rem' }}>Richtige Antwort
            <select value={solution} onChange={(event) => setSolution(event.target.value)} style={{ display: 'block', width: '100%', marginTop: 4 }}>
              <option value="">Antwort festlegen</option>
              {optionLines.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => <option key={`${index}-${line}`} value={line}>{line}</option>)}
            </select>
          </label>
        </div>}
        {mode === 'offen' && <label style={{ display: 'flex', gap: 8, alignItems: 'start', marginTop: 10, fontSize: '0.8rem' }}>
          <input type="checkbox" checked={basisBestaetigt} onChange={(event) => setBasisBestaetigt(event.target.checked)} />
          <span>Ich bestätige, dass die Frage gezielt dieses Lernziel prüft. LUKA stellt die Beobachtungen getrennt dar und leitet daraus keinen Fortschritt ab.</span>
        </label>}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="btn-primary" disabled={busy || !lessonId || !frage.trim()} onClick={() => void saveCheck()}><Save size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Check speichern</button>
          <button className="btn-secondary" onClick={() => setCheckFokus(null)}>Abbrechen</button>
        </div>
      </>}
    </section>}

    <section style={CARD}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}><ClipboardCheck size={18} /><h3 style={{ margin: 0 }}>Zeitversetzte Checks und Ergebnisse</h3></div>
      {checks.length === 0 && <p style={{ color: 'var(--color-text-secondary)' }}>Noch kein Abrufcheck angelegt.</p>}
      {checks.length > 0 && <label style={{ display: 'block', fontSize: '0.82rem' }}>Check
        <select value={selectedCheckId} onChange={(event) => setSelectedCheckId(event.target.value)} style={{ display: 'block', width: '100%', marginTop: 4 }}>
          {checks.map((check) => <option key={check.id} value={check.id}>{readableDate(check.faelligAm)} · {check.lernziel} · {check.stundenTitel}</option>)}
        </select>
      </label>}
      {selectedCheck && <div style={{ marginTop: '0.75rem' }}>
        {!selectedCheck.terminGueltig && <p role="alert" style={{ color: 'var(--color-danger, #a93226)' }}>
          Der Stundenplan liegt inzwischen vor der Ausgangsstunde oder Korrekturgrundlage beziehungsweise der Termin ist entfallen. Prüfe die verknüpfte Stunde, bevor du weitere Antworten erfasst.
        </p>}
        <div style={{ background: 'var(--color-bg-base)', borderRadius: 'var(--radius)', padding: '0.75rem' }}>
          <strong>{selectedCheck.frage}</strong><div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginTop: 3 }}>
            {readableDate(selectedCheck.faelligAm)} · {selectedCheck.stundenTitel} · {selectedCheck.antwortmodus === 'offen' ? 'offen' : 'lokale Auswahlfrage'}
          </div>
          {selectedCheck.antwortmodus === 'auswahl' && <ol style={{ marginBottom: 0 }}>{responseOptions.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ol>}
        </div>
        {!selectedCheck.teilnahmelisteSnapshot && <p role="note" style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', margin: '0.7rem 0' }}>
          Für diesen älteren Check wurde keine damalige Klassenliste gespeichert. Die heutige Liste hilft beim Erfassen; Abwesenheit oder fehlende Antworten aus der Vergangenheit werden daraus nicht abgeleitet.
        </p>}
        {visibleParticipation.length === 0 ? <p style={{ color: 'var(--color-text-secondary)' }}>Dieser Check hat keine gespeicherte Schülerliste. Prüfe die Klassenzuordnung oder lege einen neuen Check an.</p> : <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>
              {vorbereiteteAntworten.length > 0
                ? `${vorbereiteteAntworten.length} vollständige Antwort${vorbereiteteAntworten.length === 1 ? '' : 'en'} bereit`
                : 'Keine vollständigen, neuen Antworten bereit'}
            </span>
            <button className="btn-primary" disabled={busy || !selectedCheck.terminGueltig || vorbereiteteAntworten.length === 0} onClick={() => void savePreparedAnswers()}>
              <Save size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Alle vorbereiteten Antworten speichern
            </button>
          </div>
          {visibleParticipation.map((student) => {
            const answerDraft = antwortEntwuerfe[student.schuelerId] ?? student.antwort ?? '';
            const hasSavedAnswer = student.ergebnis !== null;
            const historyKey = `${selectedCheck.id}:${student.schuelerId}`;
            const historyOpen = offenerVerlauf === historyKey;
            return <div key={student.schuelerId} style={{ display: 'grid', gap: 5 }}>
            <article style={{ display: 'grid', gridTemplateColumns: 'minmax(145px, .7fr) minmax(140px, .6fr) minmax(210px, 1.4fr) auto', gap: 8, alignItems: 'end', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '.6rem' }}>
              <strong style={{ alignSelf: 'center' }}>{studentName(student)}</strong>
              <label style={{ fontSize: '0.78rem' }}>Teilnahme
                <select value={student.status} disabled={busy || teilnahmeBusyId === student.schuelerId || !selectedCheck.terminGueltig}
                  onChange={(event) => void saveAttendance(student, event.target.value as AbrufCheckTeilnahme['status'])} style={{ display: 'block', width: '100%', marginTop: 3 }}>
                  <option value="offen">Noch offen</option>
                  <option value="anwesend">Teilgenommen</option>
                  <option value="abwesend" disabled={hasSavedAnswer}>Nicht teilgenommen</option>
                </select>
              </label>
              {student.status === 'abwesend' ? <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem' }}>Keine Antwort erwartet.</span> : <div style={{ display: 'grid', gridTemplateColumns: selectedCheck.antwortmodus === 'offen' ? 'minmax(160px,1fr) minmax(128px,.7fr)' : '1fr', gap: 6 }}>
                {selectedCheck.antwortmodus === 'auswahl' ? <label style={{ fontSize: '0.78rem' }}>Antwort
                  <select value={answerDraft} disabled={busy} onChange={(event) => setAntwortEntwuerfe((current) => ({ ...current, [student.schuelerId]: event.target.value }))} style={{ display: 'block', width: '100%', marginTop: 3 }}>
                    <option value="">Antwort eintragen</option>{responseOptions.map((item, index) => <option key={`${index}-${item}`} value={item}>{item}</option>)}
                  </select>
                </label> : <>
                  <label style={{ fontSize: '0.78rem' }}>Antwort
                    <input value={answerDraft} disabled={busy} onChange={(event) => setAntwortEntwuerfe((current) => ({ ...current, [student.schuelerId]: event.target.value }))} style={{ display: 'block', width: '100%', marginTop: 3 }} />
                  </label>
                  <label style={{ fontSize: '0.78rem' }}>Lehrkraftauswertung
                    <select value={auswertungen[student.schuelerId] ?? student.ergebnis ?? ''} disabled={busy} onChange={(event) => setAuswertungen((current) => ({ ...current, [student.schuelerId]: event.target.value as 'richtig' | 'teilweise' | 'noch_nicht' }))} style={{ display: 'block', width: '100%', marginTop: 3 }}>
                      <option value="">Auswertung auswählen …</option>
                      <option value="richtig">Ziel erreicht</option><option value="teilweise">Teilweise gezeigt</option><option value="noch_nicht">Noch nicht gezeigt</option>
                    </select>
                  </label>
                </>}
              </div>}
              <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {student.status !== 'abwesend' && <button className="btn-secondary" disabled={busy || !selectedCheck.terminGueltig || !answerDraft.trim() || (selectedCheck.antwortmodus === 'offen' && !auswertungen[student.schuelerId] && !student.ergebnis)} onClick={() => void saveAnswer(student.schuelerId, answerDraft, student.ergebnis)}>
                  <Save size={14} style={{ verticalAlign: -2, marginRight: 4 }} />{hasSavedAnswer ? 'Antwort aktualisieren' : 'Antwort speichern'}
                </button>}
                {student.aenderungAnzahl > 0 && <button className="btn-secondary" aria-expanded={historyOpen} onClick={() => void toggleErgebnisVerlauf(student)}>
                  {verlaufBusy === historyKey ? 'Verlauf lädt …' : `${historyOpen ? 'Verlauf schließen' : 'Änderungen'} (${student.aenderungAnzahl})`}
                </button>}
              </div>
            </article>
            {historyOpen && <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '.6rem .75rem', fontSize: '.78rem', color: 'var(--color-text-secondary)' }}>
              <strong style={{ color: 'var(--color-text)' }}>Änderungsverlauf</strong>
              {ergebnisAenderungen[historyKey]?.length ? <ol style={{ margin: '.35rem 0 0', paddingLeft: '1.2rem' }}>
                {ergebnisAenderungen[historyKey].map((change) => <li key={change.id}>
                  {readableTimestamp(change.geaendertAm)} · Einstufung: „{ERGEBNIS_LABELS[change.ergebnisVorher]}“ → „{ERGEBNIS_LABELS[change.ergebnisNachher]}“
                  {change.antwortGeaendert ? ' · Antwort geändert; der frühere Antworttext wird nicht gespeichert.' : ''}
                </li>)}
              </ol> : <p style={{ margin: '.3rem 0 0' }}>{verlaufBusy === historyKey ? 'Änderungen werden geladen …' : 'Keine Änderungen vorhanden.'}</p>}
            </div>}
            </div>;
          })}
        </div>}
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', fontSize: '0.82rem' }}>
          <span>{selectedCheck.antwortAnzahl} Antworten</span><span>{selectedCheck.richtigAnzahl} richtig</span>
          <span>{selectedCheck.teilweiseAnzahl} teilweise</span><span>{selectedCheck.nochNichtAnzahl} noch nicht gezeigt</span>
          {selectedCheck.teilnahmelisteSnapshot && <>
            <span>{selectedCheck.rosterAnzahl} Schüler/innen im gespeicherten Klassenstand</span>
            <span>{selectedCheck.anwesendAnzahl} teilgenommen</span><span>{selectedCheck.abwesendAnzahl} nicht teilgenommen</span>
            <span>{selectedCheck.teilnahmeOffenAnzahl} Teilnahme offen</span>
            <span>{Math.max(0, selectedCheck.anwesendAnzahl - selectedCheck.antwortAnzahl)} anwesend ohne Antwort</span>
          </>}
        </div>
        {hasDiagnosticObservations && <div style={{ marginTop: 10, padding: '0.75rem', background: 'var(--color-bg-base)', borderRadius: 'var(--radius)', fontSize: '0.82rem' }}>
          <strong>Beobachtungen getrennt ausgewiesen</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginTop: 7 }}>
            <div><strong>Ausgangskorrektur</strong><br />„{selectedFocus?.aufgabeSnapshot}“ · {selectedFocus?.fehlerAnzahl} von {selectedFocus?.antwortAnzahl} Abgaben mit dem Muster · {formatPeriod(selectedFocus?.zeitraumVon ?? null, selectedFocus?.zeitraumBis ?? null)}</div>
            <div><strong>Späterer Check</strong><br />{readableDate(selectedCheck.faelligAm)} · {selectedCheck.richtigAnzahl} erreicht · {selectedCheck.teilweiseAnzahl} teilweise · {selectedCheck.nochNichtAnzahl} noch nicht gezeigt · {selectedCheck.antwortAnzahl} Antworten</div>
          </div>
          <p style={{ margin: '0.6rem 0 0' }}>Die Ausgangszahl zählt Abgaben mit markiertem Fehlertyp; der Check zählt Antworten zu einer konkreten Frage. LUKA verrechnet diese unterschiedlichen Erhebungen nicht zu Prozenten oder einer Fortschrittszahl. Die pädagogische Einordnung bleibt bei der Lehrkraft.</p>
          {(selectedFocus?.antwortAnzahl ?? 0) < MIN_DIAGNOSTIC_RESPONSES || selectedCheck.antwortAnzahl < MIN_DIAGNOSTIC_RESPONSES
            ? <p style={{ margin: '0.4rem 0 0', color: 'var(--color-text-secondary)' }}>Die Antwortbasis ist noch klein; die Zahlen dienen nur als Einzelfallhinweis.</p>
            : null}
          {!selectedCheck.vergleichsgrundlageBestaetigt && <p style={{ margin: '0.4rem 0 0', color: 'var(--color-text-secondary)' }}>Die Lehrkraft hat die Passung der Checkfrage zum Lernziel noch nicht bestätigt.</p>}
        </div>}
      </div>}
    </section>
  </div>;
}

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, GraduationCap, Plus, Trash2 } from 'lucide-react';
import type { IBExamSession, IBLiteratureWork } from '@lehrunterlagen/schema';
import type { AppAction, AppState } from '../lib/types';
import {
  createIbLiteratureDraft,
  ibAssessmentCriteria,
  IB_LITERATURE_REQUIREMENTS,
  ibComponentLabel,
  ibComponentMinutes,
  ibComponentRawMarks,
  type IbLiteratureComponent,
  type IbLiteratureLevel,
  type IbPracticeMode,
  type IbProgrammeYear,
} from '../lib/ibPilot';
import { heuteIso } from '../lib/lokalDatum';
import { loadSettings, saveSettings } from '../lib/storage';
import { ViewShell } from './_ViewShell';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  onDone: () => void;
}

type LiteratureForm = IBLiteratureWork['literaryForm'];
type LiteratureCategory = IBLiteratureWork['selectionCategory'];
type Reservation = NonNullable<IBLiteratureWork['reservedFor']>;
type LiteraryForm = IBLiteratureWork['literaryForm'];

const fieldStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '0.625rem 0.75rem',
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
  background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)', fontSize: '0.875rem',
};
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.375rem', fontSize: '0.8125rem', fontWeight: 650 };
const panelStyle: React.CSSProperties = { padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)' };

const FORM_LABEL: Record<LiteratureForm, string> = {
  'prose-fiction': 'Epik / Prosa',
  'prose-nonfiction': 'Literarische Sachprosa',
  poetry: 'Lyrik',
  drama: 'Drama',
  other: 'Andere literarische Form',
};

const LITERARY_FORM_OPTIONS = Object.entries(FORM_LABEL) as [LiteraryForm, string][];
const isGerman = (language: string) => ['de', 'deu', 'ger', 'german', 'deutsch'].includes(language.trim().toLowerCase());
const CATEGORY_LABEL: Record<LiteratureCategory, string> = {
  'translated-prl': 'Übersetzung · Prescribed reading list',
  'original-prl': 'Ursprünglich Deutsch · Prescribed reading list',
  'free-choice': 'Frei gewählt',
};
const RESERVATION_LABEL: Record<Reservation, string> = {
  paper2: 'Paper 2',
  'individual-oral': 'Individual Oral',
  'hl-essay': 'HL Essay',
};

function validForComponent(work: IBLiteratureWork, component: IbLiteratureComponent): boolean {
  return !work.reservedFor || work.reservedFor === component;
}

export function IbDiplomaView({ state, dispatch, onDone }: Props) {
  const current = state.meta.ibAssessment;
  const [level, setLevel] = useState<IbLiteratureLevel>(current?.course === 'german-a-literature' ? current.level : 'sl');
  const [programmeYear, setProgrammeYear] = useState<IbProgrammeYear>(current?.programmeYear ?? 'coursewide');
  const [examSession, setExamSession] = useState(() => current?.examSession ? `${current.examSession.session}-${current.examSession.year}` : '');
  const [component, setComponent] = useState<IbLiteratureComponent>(current?.course === 'german-a-literature' ? current.assessmentComponent : 'paper1');
  const [practiceMode, setPracticeMode] = useState<IbPracticeMode>(current?.practiceMode ?? 'standard');
  const [guidingQuestionMode, setGuidingQuestionMode] = useState<'automatic' | 'teacher'>(current?.guidingQuestion ? 'teacher' : 'automatic');
  const [guidingQuestion, setGuidingQuestion] = useState(current?.guidingQuestion ?? '');
  const [paper1Forms, setPaper1Forms] = useState<[LiteratureForm, LiteratureForm]>(current?.paper1LiteraryForms ?? ['prose-fiction', 'poetry']);
  const [globalIssue, setGlobalIssue] = useState(current?.globalIssue ?? '');
  const [lineOfInquiry, setLineOfInquiry] = useState(current?.lineOfInquiry ?? '');
  const [works, setWorks] = useState<IBLiteratureWork[]>(() => loadSettings().ibLiteratureWorks ?? []);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => current?.selectedWorks?.map((work) => work.id) ?? []);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [literaryForm, setLiteraryForm] = useState<LiteratureForm>('prose-fiction');
  const [originalLanguage, setOriginalLanguage] = useState('de');
  const [selectionCategory, setSelectionCategory] = useState<LiteratureCategory>('original-prl');
  const [reservedFor, setReservedFor] = useState<'' | Reservation>('');
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    if (level === 'sl' && component === 'hl-essay') setComponent('paper1');
  }, [level, component]);

  const selectedWorks = useMemo(
    () => selectedIds.map((id) => works.find((work) => work.id === id))
      .filter((work): work is IBLiteratureWork => !!work && validForComponent(work, component)),
    [selectedIds, works, component],
  );
  const requirement = IB_LITERATURE_REQUIREMENTS[level];
  const counts = useMemo(() => {
    const seen = new Set<string>();
    const uniqueWorks = works.filter((work) => {
      const key = `${work.title.trim().toLocaleLowerCase()}|${work.author.trim().toLocaleLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return {
      translated: uniqueWorks.filter((work) => work.selectionCategory === 'translated-prl').length,
      original: uniqueWorks.filter((work) => work.selectionCategory === 'original-prl').length,
      free: uniqueWorks.filter((work) => work.selectionCategory === 'free-choice').length,
      total: uniqueWorks.length,
    };
  }, [works]);
  const marks = ibComponentRawMarks(level, component);
  const criteria = ibAssessmentCriteria(level, component);
  const minutes = ibComponentMinutes(level, component);
  const visibleWorks = works.filter((work) => validForComponent(work, component));

  const updateWorks = (next: IBLiteratureWork[]) => {
    setWorks(next);
    saveSettings({ ...loadSettings(), ibLiteratureWorks: next });
  };

  const addWork = () => {
    if (!title.trim() || !author.trim() || !originalLanguage.trim()) {
      setFehler('Bitte Titel, Autor:in und Originalsprache ergänzen.');
      return;
    }
    if (works.some((work) => work.title.trim().toLocaleLowerCase() === title.trim().toLocaleLowerCase()
      && work.author.trim().toLocaleLowerCase() === author.trim().toLocaleLowerCase())) {
      setFehler('Dieses Werk ist mit dieser Autor:in bereits im Kursbestand.');
      return;
    }
    const germanOriginal = isGerman(originalLanguage);
    if ((selectionCategory === 'original-prl' && !germanOriginal)
      || (selectionCategory === 'translated-prl' && germanOriginal)) {
      setFehler('Die Auswahlkategorie passt nicht zur Originalsprache. Deutschsprachige Originale gehören zu „Ursprünglich Deutsch“, Werke in Übersetzung zu „Übersetzung“.');
      return;
    }
    const work: IBLiteratureWork = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `ib-work-${Date.now()}`,
      title: title.trim(),
      author: author.trim(),
      literaryForm,
      originalLanguage: originalLanguage.trim().toLowerCase(),
      selectionCategory,
      ...(reservedFor ? { reservedFor } : {}),
    };
    updateWorks([...works, work]);
    setTitle('');
    setAuthor('');
    setFehler(null);
  };

  const toggleWork = (id: string) => {
    setSelectedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
    setFehler(null);
  };

  const requiredSelectionCount = component === 'paper2' || component === 'individual-oral' ? 2 : component === 'hl-essay' ? 1 : 0;
  const sourceWorksValid = component !== 'individual-oral'
    || (selectedWorks.some((work) => isGerman(work.originalLanguage)) && selectedWorks.some((work) => !isGerman(work.originalLanguage)));
  const distinctAuthors = component !== 'paper2' || new Set(selectedWorks.map((work) => work.author.toLocaleLowerCase())).size === 2;

  const startAssessment = () => {
    setFehler(null);
    if (component === 'paper1' && guidingQuestionMode === 'teacher' && !guidingQuestion.trim()) {
      setFehler('Bitte gib eine Leitfrage ein oder wähle „Automatisch erstellen“.');
      return;
    }
    if (requiredSelectionCount > 0 && selectedWorks.length !== requiredSelectionCount) {
      setFehler(component === 'hl-essay' ? 'Bitte wähle ein behandeltes Werk.' : `Bitte wähle genau ${requiredSelectionCount} passende Werke aus dem Kursbestand.`);
      return;
    }
    if (component === 'paper1' && paper1Forms[0] === paper1Forms[1]) {
      setFehler('Für Paper 1 müssen die beiden Texte unterschiedliche literarische Formen haben.');
      return;
    }
    if (!distinctAuthors) {
      setFehler('Für Paper 2 müssen die beiden Werke von unterschiedlichen Autor:innen stammen.');
      return;
    }
    if (!sourceWorksValid) {
      setFehler('Für das Individual Oral brauchst du ein ursprünglich auf Deutsch verfasstes Werk und ein Werk in Übersetzung.');
      return;
    }
    if (component === 'individual-oral' && !globalIssue.trim()) {
      setFehler('Bitte formuliere ein Global Issue für das Individual Oral.');
      return;
    }
    if (component === 'hl-essay' && !lineOfInquiry.trim()) {
      setFehler('Bitte gib eine vorläufige Line of Inquiry ein.');
      return;
    }

    const orderedWorks = component === 'individual-oral'
      ? [...selectedWorks].sort((left, right) => Number(isGerman(right.originalLanguage)) - Number(isGerman(left.originalLanguage)))
      : selectedWorks;
    const draft = createIbLiteratureDraft({
      level,
      programmeYear,
      ...(examSession ? {
        examSession: {
          session: examSession.startsWith('may-') ? 'may' : 'november',
          year: Number(examSession.split('-')[1]),
        } as IBExamSession,
      } : {}),
      assessmentComponent: component,
      practiceMode,
      guidingQuestion: component === 'paper1' && guidingQuestionMode === 'teacher' ? guidingQuestion : undefined,
      selectedWorks: requiredSelectionCount > 0 ? orderedWorks : undefined,
      paper1LiteraryForms: component === 'paper1' ? paper1Forms : undefined,
      globalIssue: component === 'individual-oral' ? globalIssue : undefined,
      lineOfInquiry: component === 'hl-essay' ? lineOfInquiry : undefined,
      land: state.meta.land,
      datum: heuteIso(),
    });

    dispatch({ type: 'RESET_STATE' });
    dispatch({ type: 'SET_AUFTRAG', auftrag: draft.auftrag });
    dispatch({ type: 'SET_META', meta: draft.meta });
    for (const block of draft.bloecke) dispatch({ type: 'ADD_BLOCK', block });
    dispatch({ type: 'SET_STEP', step: 'input' });
    onDone();
  };

  const setReservation = (id: string, reservation: '' | Reservation) => {
    updateWorks(works.map((work) => work.id === id
      ? { ...work, reservedFor: reservation || undefined }
      : work));
  };

  return (
    <ViewShell
      title="IB Diploma · German A: Literature"
      description="Literaturkurs für SL und HL. Wähle die Prüfungskomponente und arbeite mit den Werken deiner Klasse."
      maxWidth={850}
    >
      <div style={{ display: 'grid', gap: '1rem' }}>
        <section style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <GraduationCap size={22} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
            <div>
              <strong>Language A: Literature · Deutsch · Erstsprüfung 2026</strong>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                SL und HL verwenden dieselben Komponenten mit niveauabhängigem Paper 1; HL ergänzt den HL Essay. LUKA gibt keine automatische IB-Gesamtnote aus.
              </p>
              <p role="note" style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                <strong>Pilotbereich:</strong> Bitte Aufgaben und Kriterien vor dem Einsatz im Unterricht mit den aktuellen IB-Unterlagen und deiner Fachkenntnis abgleichen. LUKA ist nicht mit dem IB verbunden.
              </p>
            </div>
          </div>
        </section>

        <section style={panelStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.875rem' }}>
            <div>
              <label style={labelStyle}>Niveau</label>
              <select style={fieldStyle} value={level} onChange={(event) => setLevel(event.target.value as IbLiteratureLevel)}>
                <option value="sl">Standard Level (SL)</option>
                <option value="hl">Higher Level (HL)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Kursphase</label>
              <select style={fieldStyle} value={programmeYear} onChange={(event) => setProgrammeYear(event.target.value as IbProgrammeYear)}>
                <option value="coursewide">DP1 und DP2</option>
                <option value="dp1">DP1</option>
                <option value="dp2">DP2</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>IB-Prüfungssession</label>
              <select style={fieldStyle} value={examSession} onChange={(event) => setExamSession(event.target.value)}>
                <option value="">Noch nicht festgelegt</option>
                {Array.from({ length: 15 }, (_, index) => 2026 + index).flatMap((year) => [
                  <option key={`may-${year}`} value={`may-${year}`}>Mai {year}</option>,
                  <option key={`november-${year}`} value={`november-${year}`}>November {year}</option>,
                ])}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Assessment-Komponente</label>
              <select style={fieldStyle} value={component} onChange={(event) => { setComponent(event.target.value as IbLiteratureComponent); setFehler(null); }}>
                <option value="paper1">Paper 1 · Guided literary analysis</option>
                <option value="paper2">Paper 2 · Comparative essay</option>
                <option value="individual-oral">Individual Oral</option>
                {level === 'hl' && <option value="hl-essay">HL Essay</option>}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Übungsform</label>
              <select style={fieldStyle} value={practiceMode} onChange={(event) => setPracticeMode(event.target.value as IbPracticeMode)}>
                <option value="guided">Angeleitet · mit Analysehinweisen</option>
                <option value="standard">Standard · fokussierte Aufgabe</option>
                <option value="timed">Prüfungsnah · Zeittraining</option>
              </select>
            </div>
          </div>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            {ibComponentLabel(component)} · {minutes ? `${minutes} Minuten` : 'überarbeitungsbegleitendes Coursework'} · maximal {marks} Rohpunkte
          </p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
            Kriterien: {criteria.map((criterion) => `${criterion.id} ${criterion.label} (${criterion.maxMarks})`).join(' · ')}. Feedback ist kriterienspezifisch; LUKA setzt keine IB-Gesamtnote.
          </p>
        </section>

        {component === 'paper1' && (
          <section style={panelStyle}>
            <strong>Leitfrage</strong>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.6rem 0' }}>
              <button type="button" className={guidingQuestionMode === 'automatic' ? 'btn-primary' : 'btn-secondary'} onClick={() => setGuidingQuestionMode('automatic')}>Automatisch erstellen</button>
              <button type="button" className={guidingQuestionMode === 'teacher' ? 'btn-primary' : 'btn-secondary'} onClick={() => setGuidingQuestionMode('teacher')}>Selbst vorgeben</button>
            </div>
            {guidingQuestionMode === 'teacher' && (
              <textarea value={guidingQuestion} onChange={(event) => setGuidingQuestion(event.target.value)} rows={2} placeholder="z. B. Wie erzeugt die Erzählperspektive eine Spannung zwischen ...?" style={{ ...fieldStyle, resize: 'vertical' }} />
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
              {[0, 1].map((index) => (
                <div key={index}>
                  <label style={labelStyle}>Literarische Form · Text {index + 1}</label>
                  <select
                    style={fieldStyle}
                    value={paper1Forms[index]}
                    onChange={(event) => setPaper1Forms((forms) => {
                      const next: [LiteraryForm, LiteraryForm] = [...forms];
                      next[index] = event.target.value as LiteraryForm;
                      return next;
                    })}
                  >
                    {LITERARY_FORM_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
              Im nächsten Schritt fügt die Lehrkraft zwei unveröffentlichte literarische Texte unterschiedlicher Formen ein. SL bearbeitet einen Text nach Wahl; HL bearbeitet beide.
            </p>
          </section>
        )}

        {(component === 'paper2' || component === 'individual-oral' || component === 'hl-essay') && (
          <section style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <BookOpen size={18} style={{ color: 'var(--color-accent)' }} />
              <strong>Kursbestand und Werkauswahl</strong>
            </div>
            <p style={{ margin: '0 0 0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
              Werkdaten werden lokal in den App-Einstellungen gespeichert. Keine vollständigen Buchtexte eintragen.
            </p>
            {visibleWorks.length === 0 ? <p style={{ fontSize: '0.875rem' }}>Noch keine passenden Werke. Füge unten die im Kurs behandelten Werke hinzu.</p> : (
              <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
                {visibleWorks.map((work) => (
                  <label key={work.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.65rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedIds.includes(work.id)} onChange={() => toggleWork(work.id)} />
                    <span style={{ flex: 1, fontSize: '0.85rem' }}><strong>{work.title}</strong> · {work.author}<br /><span style={{ color: 'var(--color-text-secondary)' }}>{FORM_LABEL[work.literaryForm]} · Originalsprache: {work.originalLanguage} · {CATEGORY_LABEL[work.selectionCategory]}</span></span>
                    <select aria-label={`Assessment-Reservierung für ${work.title}`} value={work.reservedFor ?? ''} onChange={(event) => setReservation(work.id, event.target.value as '' | Reservation)} style={{ ...fieldStyle, width: 150, padding: '0.35rem' }}>
                      <option value="">Nicht reserviert</option>
                      {Object.entries(RESERVATION_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <button type="button" className="btn-secondary" aria-label={`${work.title} entfernen`} onClick={() => { updateWorks(works.filter((item) => item.id !== work.id)); setSelectedIds(selectedIds.filter((id) => id !== work.id)); }}><Trash2 size={15} /></button>
                  </label>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.625rem' }}>
              <div><label style={labelStyle}>Werktitel</label><input value={title} onChange={(event) => setTitle(event.target.value)} style={fieldStyle} /></div>
              <div><label style={labelStyle}>Autor:in</label><input value={author} onChange={(event) => setAuthor(event.target.value)} style={fieldStyle} /></div>
              <div><label style={labelStyle}>Literarische Form</label><select value={literaryForm} onChange={(event) => setLiteraryForm(event.target.value as LiteratureForm)} style={fieldStyle}>{Object.entries(FORM_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div><label style={labelStyle}>Originalsprache</label><input value={originalLanguage} onChange={(event) => setOriginalLanguage(event.target.value)} placeholder="de, en, fr …" style={fieldStyle} /></div>
              <div><label style={labelStyle}>Auswahlkategorie</label><select value={selectionCategory} onChange={(event) => setSelectionCategory(event.target.value as LiteratureCategory)} style={fieldStyle}>{Object.entries(CATEGORY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div><label style={labelStyle}>Reservierung</label><select value={reservedFor} onChange={(event) => setReservedFor(event.target.value as '' | Reservation)} style={fieldStyle}><option value="">Keine</option>{Object.entries(RESERVATION_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            </div>
            <button type="button" className="btn-secondary" onClick={addWork} style={{ marginTop: '0.625rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><Plus size={15} /> Werk hinzufügen</button>
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Kursbestand: {counts.total}/{requirement.total} Werke · Übersetzt/PRL {counts.translated}/{requirement.translatedPrl} · Deutsch/PRL {counts.original}/{requirement.originalPrl} · frei gewählt {counts.free}/{requirement.freeChoice}
            </p>
            {component === 'paper2' && <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem' }}>Wähle zwei Werke unterschiedlicher Autor:innen; verwendete Werke sollten nicht bereits für eine andere Prüfungskomponente reserviert sein.</p>}
            {component === 'individual-oral' && <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem' }}>Wähle ein ursprünglich deutschsprachiges Werk und ein Werk in Übersetzung; anschließend fügt die Lehrkraft zuerst den deutschen, dann den übersetzten Auszug sowie ein Global Issue hinzu.</p>}
          </section>
        )}

        {component === 'individual-oral' && (
          <section style={panelStyle}>
            <label style={labelStyle}>Global Issue</label>
            <textarea value={globalIssue} onChange={(event) => setGlobalIssue(event.target.value)} rows={2} placeholder="Ein spezifisches transnationales Thema mit Bedeutung im Alltag" style={{ ...fieldStyle, resize: 'vertical' }} />
            <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Die Übung strukturiert einen 10-minütigen Vortrag und anschließende 5-minütige Lehrkraftfragen. Der Vortrag soll die Darstellung des Global Issue untersuchen, keine Werke miteinander vergleichen.</p>
          </section>
        )}

        {component === 'hl-essay' && (
          <section style={panelStyle}>
            <label style={labelStyle}>Vorläufige Line of Inquiry</label>
            <textarea value={lineOfInquiry} onChange={(event) => setLineOfInquiry(event.target.value)} rows={2} placeholder="Eine literarische Untersuchungsfrage zum Werk als Ganzem" style={{ ...fieldStyle, resize: 'vertical' }} />
            <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Der HL Essay umfasst 1.200–1.500 Wörter. LUKA unterstützt Planung und Überarbeitung, schreibt aber keinen einzureichenden Essay. Einen Schülerentwurf kann die Lehrkraft im nächsten Schritt optional für kriterienbezogenes Feedback einfügen.</p>
          </section>
        )}

        {fehler && <p role="alert" style={{ margin: 0, color: 'var(--color-danger, #c0392b)', fontSize: '0.875rem' }}>{fehler}</p>}
        <button type="button" className="btn-primary" onClick={startAssessment} style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.8rem' }}>
          {component === 'hl-essay' ? 'HL-Essay-Coaching vorbereiten' : `${ibComponentLabel(component)} vorbereiten`} <ArrowRight size={17} />
        </button>
      </div>
    </ViewShell>
  );
}

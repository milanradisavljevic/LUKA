import { useState, useEffect, useCallback, useMemo } from 'react';
import { GraduationCap, Users, BarChart3, AlertTriangle, TrendingUp, TrendingDown, Download, Wand2, Sparkles, Loader2, School, Plus, Archive, ArchiveRestore, Pencil, Trash2, X, User, ExternalLink } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from './_EmptyState';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { loadDocuments, type KlasseInfo } from '../lib/storage';
import { useNatascha } from '../hooks/useNatascha';
import type { KlassenBriefingRow, FehlerTrendPunkt, LoopUebungRow } from '../hooks/useNatascha';
import { folgeuebungWirkung } from '../lib/loopWirkung';
import { useKlassenMeta, type KlasseMeta, type KlassenLoeschvorschau } from '../hooks/useKlassenMeta';
import { KATEGORIE_TO_BLOCKTYPEN, fehlerkorrekturZuerst, type NataschaPrefill } from '../lib/nataschaBridge';
import { FACH_META, schulstufenFuerLand, stufeFromSchulstufe, type Fach, type Land, type Stufe } from '@lehrunterlagen/schema';
import type { BlockTyp } from '@lehrunterlagen/schema';
import { loadTeacherProfile } from '../lib/profile';
import { ViewShell } from './_ViewShell';
import { KiTextBlock } from '../components/KiTextBlock';
import { anzeigeName } from '../lib/anzeigeName';
import { InfoDot } from '../components/ui/InfoDot';
import { useEinsatz, type EinsatzRecord } from '../hooks/useEinsatz';
import { einsatzAnzeigeDatum, formatEinsatzDatum, labelEinsatzArt, labelRueckblickStatus, sortEinsaetze } from '../lib/einsatz';
import { ermittleNiveaugruppen, neuesteBestaetigteNoten, type Niveaugruppe } from '../lib/niveauGruppen';
import { aggregiereFehlerCluster, baueFehlerClusterTrend, type FehlerClusterSummary } from '../lib/fehlerCluster';

interface Props {
  /** Closed Loop: aus der Heatmap ein Übungsblatt im LUA-Generator starten. */
  onGenerateUebung?: (prefill: NataschaPrefill) => void;
  /** Cross-Nav (L1): Klick auf eine Abgabe → Korrektur dieser Arbeit öffnen. */
  onOpenKorrektur?: (ziel: { abgabeId: number; klasse: string; aufgabe: string }) => void;
  /** Cross-Nav: Klick auf das Profil-Icon → Schüler-Ansicht (Längsschnitt). */
  onOpenSchueler?: (klasse: string, schuelerId: number) => void;
  /** Cross-Nav (L1): Folgeübung im Loop-Wirkung-Panel → Unterlage öffnen. */
  onOpenUnterlage?: (documentId: string) => void;
}

interface AbgabeInfo {
  id: number;
  schuelerId: number | null;
  unterrichtseinsatzId: string | null;
  materialId: string | null;
  klasse: string;
  aufgabe: string;
  dateiname: string;
  datum: string | null;
  vorname: string | null;
  nachname: string | null;
  note: number | null;
  gesamtstufe: number | null;
  wortanzahl: number | null;
  fach: string | null;
  schulstufe: string | null;
  textsorte: string | null;
  hatLehrerFeedback: boolean;
  noteFinal: number | null;
}

interface HeatmapEntry {
  typ: string;
  anzahl: number;
  prozent: number;
}

interface Notenverteilung {
  noten: Record<string, number>;
  durchschnitt: number | null;
}

interface KlassenStatistik {
  anzahlAbgaben: number;
  notenverteilung: Notenverteilung;
  kriterien: { name: string; durchschnitt: number; anzahl: number }[];
}

interface TrendPoint {
  aufgabe: string;
  datum: string | null;
  n: number;
  avgNoteApp: number | null;
  avgNoteLehrer: number | null;
  nMitFeedback: number;
}

interface KalibrierungResult {
  appAvg: number | null;
  lehrerAvg: number | null;
  diff: number | null;
  nMitFeedback: number;
  nGesamt: number;
  tendenz: string;
  /** L2: KI vs. Lehrer je Textsorte (nur Textsorten mit ≥ 2 Paaren). */
  nachTextsorte?: { textsorte: string; paare: number; mittlereAbweichung: number | null; tendenz: string }[];
}

interface FehlerDetailRow {
  zitat: string | null;
  korrektur: string | null;
  erklaerung: string | null;
  clusterId?: string | null;
  regelMuster?: string | null;
  haeufigkeit: number;
  vorname: string | null;
  dateiname: string;
}

const HEATMAP_COLORS: Record<string, string> = { R: '#e74c3c', G: '#27ae60', Z: '#3498db', A: '#f39c12' };
const HEATMAP_LABELS: Record<string, string> = { R: 'Rechtschreibung', G: 'Grammatik', Z: 'Zeichensetzung', A: 'Ausdruck' };
const FEHLER_LABELS = HEATMAP_LABELS;
const FEHLER_COLORS: Record<string, string> = { R: '#e74c3c', G: '#27ae60', Z: '#3498db', A: '#f39c12' };

type Tab = 'uebersicht' | 'statistik';

const WIRKSAMKEIT_TYPEN = ['R', 'G', 'Z', 'A'] as const;
const CLUSTER_TREND_FARBEN = ['#6c5ce7', '#00a8a8', '#d35400', '#8e44ad', '#2c3e50', '#16a085'];

interface WirksamkeitDelta {
  typ: string;
  label: string;
  prev: number;
  last: number;
  /** null = Kategorie ist neu (vorher 0) */
  prozent: number | null;
}

function buildWirksamkeit(punkte: FehlerTrendPunkt[]) {
  const relevant = punkte.filter((p) => p.nAbgaben > 0);
  const chartData = relevant.map((p) => ({
    aufgabe: p.aufgabe,
    R: p.fehlerProAbgabe.R ?? 0,
    G: p.fehlerProAbgabe.G ?? 0,
    Z: p.fehlerProAbgabe.Z ?? 0,
    A: p.fehlerProAbgabe.A ?? 0,
  }));
  const deltas: WirksamkeitDelta[] = [];
  const vorletzte = relevant[relevant.length - 2];
  const letzte = relevant[relevant.length - 1];
  if (vorletzte && letzte) {
    for (const typ of WIRKSAMKEIT_TYPEN) {
      const prev = vorletzte.fehlerProAbgabe[typ] ?? 0;
      const last = letzte.fehlerProAbgabe[typ] ?? 0;
      if (prev === 0 && last === 0) continue;
      deltas.push({
        typ,
        label: HEATMAP_LABELS[typ] ?? typ,
        prev,
        last,
        prozent: prev === 0 ? null : Math.round(((last - prev) / prev) * 100),
      });
    }
  }
  return { relevant, chartData, deltas };
}

export function KlassenView({ onGenerateUebung, onOpenKorrektur, onOpenSchueler, onOpenUnterlage }: Props) {
  const { listKlassen, listAufgaben, getAbgaben, getHeatmap, getKlassenStatistik, getKlassenTrend, getFehlerTrend, getLoopUebungen, getKlassenKalibrierung, getFehlerDetail, exportNotenCsv, generateKlassenBriefing, getKlassenBriefing, quelltextGet } = useNatascha();
  const {
    klassen: klassenMeta,
    upsert: upsertKlasseMeta,
    remove: removeKlasseMeta,
    archive: archiveKlasse,
    deletePreview: getKlassenLoeschvorschau,
    deleteKlasse,
  } = useKlassenMeta();
  const { list: listEinsaetze } = useEinsatz();

  const [tab, setTab] = useState<Tab>('uebersicht');
  const [klassen, setKlassen] = useState<KlasseInfo[]>([]);
  const [selectedKlasse, setSelectedKlasse] = useState<string | null>(null);
  const [aufgaben, setAufgaben] = useState<string[]>([]);
  const [selectedAufgabe, setSelectedAufgabe] = useState<string | null>(null);
  const [abgaben, setAbgaben] = useState<AbgabeInfo[]>([]);
  const [niveauVorschauGruppeId, setNiveauVorschauGruppeId] = useState<Niveaugruppe['id'] | null>(null);
  const [niveauZuweisung, setNiveauZuweisung] = useState<Record<number, Niveaugruppe['id'] | ''>>({});
  const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([]);
  const [clusterSummary, setClusterSummary] = useState<FehlerClusterSummary[]>([]);
  const [statistik, setStatistik] = useState<KlassenStatistik | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [fehlerTrend, setFehlerTrend] = useState<FehlerTrendPunkt[]>([]);
  const [loopUebungen, setLoopUebungen] = useState<LoopUebungRow[]>([]);
  const [kalibrierung, setKalibrierung] = useState<KalibrierungResult | null>(null);
  const [fehlerDetail, setFehlerDetail] = useState<{ typ: string; rows: FehlerDetailRow[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<KlassenBriefingRow | null>(null);
  const [briefingBusy, setBriefingBusy] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [chronik, setChronik] = useState<EinsatzRecord[]>([]);

  // Klasse anlegen/bearbeiten — LUA-eigene Metadaten (Fach/Land/Schulstufe/Schuljahr)
  // zusätzlich zum reinen Klasse-String, den NATASCHA verwendet.
  const [zeigeKlasseForm, setZeigeKlasseForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formFach, setFormFach] = useState('');
  const [formLand, setFormLand] = useState<Land | ''>('');
  const [formSchulstufe, setFormSchulstufe] = useState<number | undefined>(undefined);
  const [formSchuljahr, setFormSchuljahr] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formNameLocked, setFormNameLocked] = useState(false);
  const [zeigeArchivierte, setZeigeArchivierte] = useState(false);
  const [klasseLoeschvorschau, setKlasseLoeschvorschau] = useState<KlassenLoeschvorschau | null>(null);
  const [klasseLoeschBusy, setKlasseLoeschBusy] = useState(false);
  const [land, setLand] = useState<Land | undefined>();
  const selectedKlasseMeta = useMemo(
    () => klassenMeta.find((meta) => meta.name === selectedKlasse),
    [klassenMeta, selectedKlasse],
  );
  const niveaugruppenLand = selectedKlasseMeta?.land ?? land;
  const niveauNoten = useMemo(
    () => neuesteBestaetigteNoten(abgaben
      .filter((abgabe) => abgabe.schuelerId != null && abgabe.noteFinal != null)
      .map((abgabe) => ({
        ...abgabe,
        schuelerId: abgabe.schuelerId!,
        datum: abgabe.datum,
        abgabeId: abgabe.id,
      }))),
    [abgaben],
  );
  const niveaugruppen = useMemo(
    () => ermittleNiveaugruppen(niveauNoten, niveaugruppenLand),
    [niveauNoten, niveaugruppenLand],
  );
  const niveaugruppenVorschau = useMemo(() => niveaugruppen.map((gruppe) => {
    const mitglieder = niveauNoten.filter((abgabe) => niveauZuweisung[abgabe.schuelerId] === gruppe.id);
    const noten = mitglieder.map((abgabe) => abgabe.noteFinal!).filter(Number.isFinite);
    return {
      ...gruppe,
      schuelerIds: mitglieder.map((abgabe) => abgabe.schuelerId),
      notenbereich: noten.length > 0
        ? { min: Math.min(...noten), max: Math.max(...noten) }
        : { min: 0, max: 0 },
    };
  }), [niveaugruppen, niveauNoten, niveauZuweisung]);
  const aktiveNiveaugruppe = niveaugruppenVorschau.find((gruppe) => gruppe.id === niveauVorschauGruppeId);
  // Land aus dem Profil: steuert die angebotenen Schulstufen (DE: Klassen 5–13).
  useEffect(() => {
    let active = true;
    loadTeacherProfile()
      .then((profile) => { if (active && profile?.land) setLand(profile.land); })
      .catch(() => { /* Profil ist optional. */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    listKlassen().then(setKlassen).catch(() => {
      setError('Datenbank nicht erreichbar.');
    });
  }, [listKlassen]);

  useEffect(() => {
    if (!selectedKlasse) {
      setChronik([]);
      return;
    }
    let active = true;
    const filter = selectedKlasseMeta?.id ? { klasseId: selectedKlasseMeta.id } : undefined;
    listEinsaetze(filter).then((entries) => {
      if (!active) return;
      setChronik(sortEinsaetze(entries.filter((entry) =>
        entry.klasseNameSnapshot === selectedKlasse || !selectedKlasseMeta?.id || entry.klasseId === selectedKlasseMeta.id,
      )));
    });
    return () => { active = false; };
  }, [listEinsaetze, selectedKlasse, selectedKlasseMeta?.id]);

  // Merge: NATASCHA-Klassen (haben Abgaben) ∪ LUA-Metadaten (auch ganz neue,
  // noch abgabenlose Klassen sollen im Wizard bereits nutzbar sein).
  const klassenListe = useMemo(() => {
    const metaByName = new Map(klassenMeta.map((m) => [m.name, m]));
    const namen = new Set<string>([...klassen.map((k) => k.klasse), ...klassenMeta.map((m) => m.name)]);
    const liste = [...namen].map((name) => ({
      name,
      anzahlAbgaben: klassen.find((k) => k.klasse === name)?.anzahlAbgaben ?? 0,
      meta: metaByName.get(name),
    }));
    liste.sort((a, b) => {
      const aArch = a.meta?.archiviert ?? false;
      const bArch = b.meta?.archiviert ?? false;
      if (aArch !== bArch) return aArch ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    return zeigeArchivierte ? liste : liste.filter((k) => !(k.meta?.archiviert ?? false));
  }, [klassen, klassenMeta, zeigeArchivierte]);

  const archivierteAnzahl = klassenMeta.filter((m) => m.archiviert).length;

  const oeffneKlasseForm = useCallback((vorhandene?: KlasseMeta, nameFest?: boolean) => {
    setFormError(null);
    setFormName(vorhandene?.name ?? '');
    setFormFach(vorhandene?.fach ?? '');
    setFormLand(vorhandene?.land ?? '');
    setFormSchulstufe(vorhandene?.schulstufe ?? undefined);
    setFormSchuljahr(vorhandene?.schuljahr ?? '');
    setFormNameLocked(!!nameFest);
    setZeigeKlasseForm(true);
  }, []);

  const handleSaveKlasseMeta = useCallback(async () => {
    const name = formName.trim();
    if (!name) { setFormError('Bitte einen Klassennamen eingeben.'); return; }
    setFormBusy(true);
    setFormError(null);
    const bestehende = klassenMeta.find((m) => m.name === name);
    const ok = await upsertKlasseMeta({
      name,
      fach: formFach || null,
      stufe: formSchulstufe
        ? stufeFromSchulstufe(formSchulstufe, formLand || land)
        : (bestehende?.stufe ?? null),
      schulstufe: formSchulstufe ?? null,
      land: formLand || null,
      schuljahr: formSchuljahr.trim() || null,
      notizen: bestehende?.notizen ?? null,
      archiviert: bestehende?.archiviert ?? false,
      createdAt: '',
    });
    setFormBusy(false);
    if (ok) { setZeigeKlasseForm(false); } else { setFormError('Speichern fehlgeschlagen.'); }
  }, [formName, formFach, formLand, formSchulstufe, formSchuljahr, klassenMeta, upsertKlasseMeta, land]);

  const handleToggleArchiv = useCallback(async (name: string, meta?: KlasseMeta) => {
    const ok = meta
      ? await archiveKlasse(name, !meta.archiviert)
      : await archiveKlasse(name, true);
    if (ok) await listKlassen().then(setKlassen);
  }, [archiveKlasse, listKlassen]);

  const handleKlasseLoeschvorschau = useCallback(async (name: string) => {
    setKlasseLoeschBusy(true);
    const preview = await getKlassenLoeschvorschau(name);
    setKlasseLoeschvorschau(preview);
    setKlasseLoeschBusy(false);
  }, [getKlassenLoeschvorschau]);

  const handleKlasseLoeschen = useCallback(async () => {
    if (!klasseLoeschvorschau) return;
    const { klasse, schueler, abgaben, materialien, briefings, quelltexte, einsaetze } = klasseLoeschvorschau;
    const bestaetigt = window.confirm(
      `Klasse „${klasse}" und alle zugehörigen Daten endgültig löschen?\n\n` +
      `${schueler} Schüler, ${abgaben} Abgaben, ${materialien} Materialien, ` +
      `${briefings} Briefings, ${quelltexte} Quelltexte und ${einsaetze} Unterrichtseinsätze werden entfernt. ` +
      `Dieser Vorgang kann nicht rückgängig gemacht werden.`,
    );
    if (!bestaetigt) return;
    const eingegeben = window.prompt(`Zur Bestätigung exakt „${klasse}" eingeben:`);
    if (eingegeben?.trim() !== klasse) return;

    setKlasseLoeschBusy(true);
    const report = await deleteKlasse(klasse);
    if (report) {
      setKlasseLoeschvorschau(null);
      if (selectedKlasse === klasse) {
        setSelectedKlasse(null);
        setSelectedAufgabe(null);
        setAufgaben([]);
        setAbgaben([]);
        setHeatmap([]);
        setClusterSummary([]);
        setStatistik(null);
        setTrend([]);
        setFehlerTrend([]);
        setKalibrierung(null);
        setFehlerDetail(null);
        setBriefing(null);
        setBriefingError(null);
      }
      await listKlassen().then(setKlassen);
    }
    setKlasseLoeschBusy(false);
  }, [klasseLoeschvorschau, deleteKlasse, listKlassen, selectedKlasse]);

  const loadKlasse = useCallback(async (klasse: string) => {
    setSelectedKlasse(klasse);
    setSelectedAufgabe(null);
    setNiveauVorschauGruppeId(null);
    setNiveauZuweisung({});
    setFehlerDetail(null);
    setFehlerTrend([]);
    setBriefing(null);
    setBriefingError(null);
    setLoading(true);
    setError(null);
    getKlassenBriefing(klasse).then(setBriefing);
    try {
      const af = await listAufgaben(klasse);
      setAufgaben(af);
      if (af.length > 0) {
        const first: string | null = af[0] ?? null;
        setSelectedAufgabe(first);
        if (first) await loadData(klasse, first);
      } else {
      setAbgaben([]); setHeatmap([]); setClusterSummary([]); setStatistik(null);
      }
      const [t, ft, k, lu] = await Promise.all([getKlassenTrend(klasse), getFehlerTrend(klasse), getKlassenKalibrierung(klasse), getLoopUebungen(klasse)]);
      setTrend(t as TrendPoint[]);
      setFehlerTrend(ft);
      setKalibrierung(k as KalibrierungResult | null);
      setLoopUebungen(lu);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [listAufgaben, getKlassenTrend, getFehlerTrend, getKlassenKalibrierung, getLoopUebungen]);

  const loadData = useCallback(async (klasse: string, aufgabe: string) => {
    setLoading(true);
    try {
      const [abs, hm, stat, clusterRows] = await Promise.all([
        getAbgaben(klasse, aufgabe) as Promise<AbgabeInfo[]>,
        getHeatmap(klasse, aufgabe),
        getKlassenStatistik(klasse, aufgabe),
        Promise.all(['R', 'G', 'Z', 'A'].map((typ) => getFehlerDetail(klasse, typ, aufgabe, 500)
          .then((rows) => rows.map((row) => ({ ...row, typ }))))).then((groups) => groups.flat()),
      ]);
      setAbgaben(abs);
      setHeatmap(hm as HeatmapEntry[]);
      setStatistik(stat as KlassenStatistik);
      setClusterSummary(aggregiereFehlerCluster(clusterRows));
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [getAbgaben, getHeatmap, getKlassenStatistik, getFehlerDetail]);

  useEffect(() => {
    if (selectedKlasse && selectedAufgabe) {
      loadData(selectedKlasse, selectedAufgabe);
    }
  }, [selectedAufgabe]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleHeatmapClick = useCallback(async (typ: string) => {
    if (!selectedKlasse) return;
    const rows = await getFehlerDetail(selectedKlasse, typ, selectedAufgabe ?? undefined, 30);
    setFehlerDetail({ typ, rows: rows as FehlerDetailRow[] });
  }, [selectedKlasse, selectedAufgabe, getFehlerDetail]);

  const handleGenerateUebung = useCallback(async (niveaugruppe?: Niveaugruppe) => {
    if (!selectedKlasse || heatmap.length === 0) return;
    const top = [...heatmap].filter((h) => h.anzahl > 0).sort((a, b) => b.anzahl - a.anzahl).slice(0, 3);
    const fokusThemen = top.map((h) => HEATMAP_LABELS[h.typ] ?? h.typ);
    const arten: BlockTyp[] = [];
    for (const h of top) {
      for (const t of (KATEGORIE_TO_BLOCKTYPEN[h.typ as 'R' | 'G' | 'Z' | 'A'] ?? [])) {
        if (!arten.includes(t)) arten.push(t);
      }
    }
    let ausgangstext = '';
    const materialId = abgaben.find((a) => a.materialId)?.materialId;
    if (materialId) {
      const doc = loadDocuments().find((d) => d.id === materialId);
      ausgangstext = doc?.snapshot.quelltexte?.map((q) => q.inhalt).filter(Boolean).join('\n\n') ?? '';
    }
    if (!ausgangstext && selectedKlasse && selectedAufgabe) {
      ausgangstext = await quelltextGet(selectedKlasse, selectedAufgabe);
    }
    // Echte Klassenfehler der Schwerpunkte nachladen → fehlerkorrektur-Block daraus.
    const fehler: NataschaPrefill['fehler'] = [];
    const gesehene = new Set<string>();
    for (const h of top) {
      const rows = await getFehlerDetail(selectedKlasse, h.typ, selectedAufgabe ?? undefined, 8);
      for (const r of rows) {
        const zitat = (r.zitat ?? '').trim();
        const korrektur = (r.korrektur ?? '').trim();
        if (!zitat || !korrektur || zitat === korrektur) continue;
        const schluessel = `${zitat}→${korrektur}`;
        if (gesehene.has(schluessel)) continue;
        gesehene.add(schluessel);
        fehler.push({ typ: h.typ as 'R' | 'G' | 'Z' | 'A', zitat, korrektur, erklaerung: r.erklaerung ?? undefined, haeufigkeit: r.haeufigkeit, clusterId: r.clusterId ?? undefined, regelMuster: r.regelMuster ?? undefined });
        if (fehler.length >= 12) break;
      }
      if (fehler.length >= 12) break;
    }
    const prefill: NataschaPrefill = {
      thema: `Übung zu Fehlerschwerpunkten – ${selectedKlasse}${selectedAufgabe ? ' · ' + selectedAufgabe : ''}`,
      // Der Closed Loop übernimmt den Kontext der Klasse bzw. der jüngsten
      // Abgabe. Fehlen alte Metadaten, lässt Step 0 seine normalen Profilwerte.
      land: selectedKlasseMeta?.land ?? land,
      fach: (klassenMeta.find((m) => m.name === selectedKlasse)?.fach
        ?? abgaben.find((a) => a.fach)?.fach) as Fach | undefined,
      stufe: (klassenMeta.find((m) => m.name === selectedKlasse)?.stufe
        ?? (() => {
          const raw = abgaben.find((a) => a.schulstufe)?.schulstufe;
          const n = raw ? Number(raw) : NaN;
          return Number.isFinite(n) ? stufeFromSchulstufe(n, land) : undefined;
        })()) as Stufe | undefined,
      schulstufe: (() => {
        const configured = klassenMeta.find((m) => m.name === selectedKlasse)?.schulstufe;
        if (configured != null) return configured;
        const raw = abgaben.find((a) => a.schulstufe)?.schulstufe;
        const n = raw ? Number(raw) : NaN;
        return Number.isFinite(n) ? n : undefined;
      })(),
      textsorte: abgaben.find((a) => a.textsorte)?.textsorte ?? undefined,
      fokusThemen,
      gewuenschteAufgabenarten: fehlerkorrekturZuerst(arten),
      notizen: `Automatisch aus der Korrektur-Heatmap der Klasse ${selectedKlasse} erzeugt. Schwerpunkte: ${fokusThemen.join(', ')}.`,
      ausgangstext: ausgangstext || undefined,
      fehler: fehler.length > 0 ? fehler : undefined,
      niveaugruppe,
      loopQuelle: { klasse: selectedKlasse, aufgabe: selectedAufgabe ?? undefined },
    };
    onGenerateUebung?.(prefill);
  }, [selectedKlasse, selectedAufgabe, heatmap, abgaben, klassenMeta, land, onGenerateUebung, quelltextGet, getFehlerDetail]);

  const oeffneNiveauVorschau = (gruppe: Niveaugruppe) => {
    const zuordnung: Record<number, Niveaugruppe['id'] | ''> = {};
    for (const automatischeGruppe of niveaugruppen) {
      for (const schuelerId of automatischeGruppe.schuelerIds) zuordnung[schuelerId] = automatischeGruppe.id;
    }
    setNiveauZuweisung(zuordnung);
    setNiveauVorschauGruppeId(gruppe.id);
  };

  const handleGenerateNiveauVorschau = () => {
    if (!aktiveNiveaugruppe || aktiveNiveaugruppe.schuelerIds.length === 0) return;
    void handleGenerateUebung(aktiveNiveaugruppe);
    setNiveauVorschauGruppeId(null);
  };

  const handleGenerateBriefing = useCallback(async () => {
    if (!selectedKlasse) return;
    setBriefingBusy(true);
    setBriefingError(null);
    try {
      const result = await generateKlassenBriefing(selectedKlasse, selectedAufgabe ?? undefined);
      setBriefing({ id: result.id, klasse: result.klasse, aufgabe: result.aufgabe ?? '', text: result.text, modell: result.modell, erstelltAm: '' });
    } catch (e) {
      setBriefingError(typeof e === 'string' ? e : e instanceof Error ? e.message : 'Briefing fehlgeschlagen');
    } finally {
      setBriefingBusy(false);
    }
  }, [selectedKlasse, selectedAufgabe, generateKlassenBriefing]);

  const handleExportCsv = useCallback(async () => {
    if (!selectedKlasse) return;
    const csv = await exportNotenCsv(selectedKlasse, selectedAufgabe ?? undefined);
    if (csv) {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `noten_${selectedKlasse}${selectedAufgabe ? '_' + selectedAufgabe : ''}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [selectedKlasse, selectedAufgabe, exportNotenCsv]);

  const cardStyle = {
    padding: '1.25rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    background: 'var(--color-bg-surface)',
  } as const;

  const noteLabel = (n: number | null) => n === null ? '—' : n.toFixed(1);

  return (
    <ViewShell title="Meine Klassen" description="Klassen, Abgaben und Statistiken.">
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button className={tab === 'uebersicht' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('uebersicht')} style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}>
          Übersicht
        </button>
        <button className={tab === 'statistik' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('statistik')} style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}>
          <BarChart3 size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Statistik
        </button>
        {selectedKlasse && (
          <button className="btn-secondary" onClick={handleExportCsv} style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', marginLeft: 'auto' }}>
            <Download size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> CSV-Export
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.25rem' }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.875rem', margin: 0, fontWeight: 700 }}>
              <GraduationCap size={16} style={{ verticalAlign: -2, marginRight: 6 }} /> Klassen
            </h3>
            <button
              onClick={() => oeffneKlasseForm()}
              title="Klasse anlegen"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', display: 'flex' }}
            >
              <Plus size={18} />
            </button>
          </div>

          {zeigeKlasseForm && (
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.625rem', marginBottom: '0.75rem', background: 'var(--color-bg-base)' }}>
              <input
                type="text"
                placeholder="Klassenname (z. B. 7A)"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={formNameLocked}
                style={{ width: '100%', boxSizing: 'border-box', marginBottom: '0.4rem', fontSize: '0.8125rem' }}
              />
              <select value={formFach} onChange={(e) => setFormFach(e.target.value)} style={{ width: '100%', marginBottom: '0.4rem', fontSize: '0.8125rem' }}>
                <option value="">Aus Aufgabe/Profil ableiten</option>
                {Object.entries(FACH_META).map(([f, m]) => <option key={f} value={f}>{m.label}</option>)}
              </select>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.72rem' }}>
                Land/Schulsystem
                <select value={formLand} onChange={(e) => setFormLand(e.target.value as Land | '')} style={{ display: 'block', width: '100%', marginTop: '0.2rem', fontSize: '0.8125rem' }}>
                  <option value="">Profilstandard{land ? ` (${land})` : ''}</option>
                  <option value="AT">Österreich</option>
                  <option value="DE">Deutschland</option>
                  <option value="CH">Schweiz</option>
                </select>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.4rem' }}>
                {schulstufenFuerLand(formLand || land).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormSchulstufe(s)}
                    style={{
                      padding: '0.2rem 0.4rem', fontSize: '0.7rem', borderRadius: 'var(--radius)',
                      border: formSchulstufe === s ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                      background: 'var(--color-bg-surface)', cursor: 'pointer',
                    }}
                  >
                    {s}.
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Schuljahr (z. B. 2026/27)"
                value={formSchuljahr}
                onChange={(e) => setFormSchuljahr(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', marginBottom: '0.5rem', fontSize: '0.8125rem' }}
              />
              {formError && <p style={{ color: 'var(--color-danger, #c0392b)', fontSize: '0.75rem', margin: '0 0 0.4rem' }}>{formError}</p>}
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="btn-primary" onClick={handleSaveKlasseMeta} disabled={formBusy} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                  Speichern
                </button>
                <button className="btn-secondary" onClick={() => setZeigeKlasseForm(false)} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {klasseLoeschvorschau && (
            <section
              aria-label="Vorschau Klassenlöschung"
              style={{
                border: '1px solid var(--color-danger, #c0392b)', borderRadius: 'var(--radius)',
                padding: '0.625rem', marginBottom: '0.75rem', background: 'var(--color-bg-base)',
              }}
            >
              <strong style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                Endgültige Löschung: {klasseLoeschvorschau.klasse}
              </strong>
              <p style={{ fontSize: '0.7rem', lineHeight: 1.4, margin: '0 0 0.45rem', color: 'var(--color-text-secondary)' }}>
                Betroffen sind {klasseLoeschvorschau.schueler} Schüler, {klasseLoeschvorschau.abgaben} Abgaben,
                {` ${klasseLoeschvorschau.materialien} Materialien, ${klasseLoeschvorschau.briefings} Briefings, ${klasseLoeschvorschau.quelltexte} Quelltexte und ${klasseLoeschvorschau.einsaetze} Unterrichtseinsätze`}.
                Abhängige Korrekturhistorien werden mitgelöscht.
              </p>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                <button
                  className="btn-danger"
                  onClick={handleKlasseLoeschen}
                  disabled={klasseLoeschBusy}
                  style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem' }}
                >
                  {klasseLoeschBusy ? 'Lösche …' : 'Endgültig löschen'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setKlasseLoeschvorschau(null)}
                  disabled={klasseLoeschBusy}
                  style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem' }}
                >
                  Abbrechen
                </button>
              </div>
            </section>
          )}

          {klassenListe.length === 0 && !error && !zeigeKlasseForm && (
            <EmptyState
              icon={School}
              title="Noch keine Klassen"
              description="Lege eine Klasse an oder warte, bis Schüler/Korrekturen erste Daten liefern."
              bordered={false}
            />
          )}
          {klassenListe.map((k) => (
            <div key={k.name} style={{ marginBottom: '0.25rem' }}>
              <button onClick={() => loadKlasse(k.name)} style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem',
                background: selectedKlasse === k.name ? 'var(--color-highlight-bg)' : 'none',
                border: selectedKlasse === k.name ? '2px solid var(--color-accent)' : '1px solid transparent',
                borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '0.8125rem',
                opacity: k.meta?.archiviert ? 0.55 : 1,
              }}>
                {k.name} <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>({k.anzahlAbgaben})</span>
                {k.meta && (
                  <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                    {[FACH_META[k.meta.fach as keyof typeof FACH_META]?.label ?? k.meta.fach, k.meta.schulstufe ? `${k.meta.schulstufe}. Klasse` : null, k.meta.schuljahr]
                      .filter(Boolean).join(' · ')}
                  </span>
                )}
              </button>
              <div style={{ display: 'flex', gap: '0.3rem', paddingLeft: '0.75rem' }}>
                <button
                  onClick={() => oeffneKlasseForm(k.meta ?? { name: k.name, archiviert: false, createdAt: '' }, true)}
                  title="Metadaten bearbeiten"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 2 }}
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => handleToggleArchiv(k.name, k.meta)}
                  title={k.meta?.archiviert ? 'Aus Archiv holen' : 'Archivieren'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 2 }}
                >
                  {k.meta?.archiviert ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                </button>
                {k.meta && (
                  <button
                    onClick={() => { if (window.confirm(`Metadaten zu „${k.name}" entfernen? (Nur Fach/Stufe/Schuljahr — Abgaben/Schüler bleiben unberührt.)`)) removeKlasseMeta(k.name); }}
                    title="Metadaten entfernen"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 2 }}
                  >
                    <X size={12} />
                  </button>
                )}
                <button
                  onClick={() => handleKlasseLoeschvorschau(k.name)}
                  title="Klasse endgültig löschen"
                  disabled={klasseLoeschBusy}
                  style={{ background: 'none', border: 'none', cursor: klasseLoeschBusy ? 'default' : 'pointer', color: 'var(--color-danger, #c0392b)', padding: 2 }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}

          {archivierteAnzahl > 0 && (
            <button
              onClick={() => setZeigeArchivierte((v) => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '0.7rem', padding: '0.25rem 0', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {zeigeArchivierte ? <X size={12} /> : <Archive size={12} />}
              {zeigeArchivierte ? 'Archivierte ausblenden' : `${archivierteAnzahl} archiviert anzeigen`}
            </button>
          )}

          {aufgaben.length > 0 && (
            <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, margin: '0 0 0.375rem' }}>Aufgaben</p>
              {aufgaben.map((af) => (
                <button key={af} onClick={() => setSelectedAufgabe(af)} style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '0.25rem 0.5rem', fontSize: '0.75rem',
                  background: selectedAufgabe === af ? 'var(--color-accent)' : 'none',
                  color: selectedAufgabe === af ? '#fff' : 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', cursor: 'pointer', marginBottom: '0.125rem',
                }}>
                  {af}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {error && <div style={{ ...cardStyle, borderColor: 'var(--color-danger, #c0392b)', marginBottom: '1rem' }}>
            <AlertTriangle size={18} style={{ color: 'var(--color-danger, #c0392b)', verticalAlign: -3, marginRight: 6 }} />
            <span style={{ fontSize: '0.875rem' }}>{error}</span>
          </div>}

          {loading && <LoadingSpinner />}

          {selectedKlasse && (
            <section style={{ ...cardStyle, marginBottom: '1rem' }} aria-labelledby="klassen-chronik">
              <h4 id="klassen-chronik" style={{ fontSize: '0.875rem', margin: '0 0 0.5rem' }}>Chronik</h4>
              {chronik.length === 0 ? (
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Hier erscheinen Unterlagen, sobald du ihren Einsatz in einer Klasse vermerkst.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {chronik.map((einsatz) => (
                    <div key={einsatz.id} style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.45rem' }}>
                      <strong style={{ fontSize: '0.78rem' }}>{einsatz.titelSnapshot || 'Unbenannte Unterlage'}</strong>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {formatEinsatzDatum(einsatzAnzeigeDatum(einsatz))} · {labelEinsatzArt(einsatz.einsatzArt)} · Rückblick: {labelRueckblickStatus(einsatz.rueckblick?.status ?? 'offen')}
                      </div>
                      {einsatz.notiz && <div style={{ fontSize: '0.72rem', marginTop: 2, whiteSpace: 'pre-wrap' }}>{einsatz.notiz}</div>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {!loading && !selectedKlasse && (
            <EmptyState
              icon={GraduationCap}
              title="Wähle eine Klasse"
              description="Wähle links eine Klasse und Aufgabe, um Notenverteilung, Fehler-Heatmap und Abgaben zu sehen."
              bordered={false}
            />
          )}

          {tab === 'uebersicht' && statistik && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={cardStyle}>
                  <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}><BarChart3 size={16} style={{ verticalAlign: -2, marginRight: 6 }} /> Notenverteilung</h4>
                  {Object.keys(statistik.notenverteilung.noten).length === 0 ? (
                    <EmptyState
                      icon={BarChart3}
                      title="Keine Noten"
                      description="Für die gewählte Aufgabe liegen noch keine Noten vor."
                      bordered={false}
                    />
                  ) : (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={Object.entries(statistik.notenverteilung.noten).map(([n, c]) => ({ note: n, anzahl: c }))} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="note" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="anzahl" fill="var(--color-accent)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  {statistik.notenverteilung.durchschnitt !== null && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', marginBottom: 0 }}>
                      Durchschnitt: <strong>{statistik.notenverteilung.durchschnitt.toFixed(2)}</strong> · {statistik.anzahlAbgaben} Abgabe{statistik.anzahlAbgaben !== 1 ? 'n' : ''}
                    </p>
                  )}
                </div>

                <div style={cardStyle}>
                  <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
                    <AlertTriangle size={16} style={{ verticalAlign: -2, marginRight: 6 }} /> Fehler-Heatmap
                    <InfoDot text="Häufigkeit der Fehlerkategorien (Rechtschreibung/Grammatik/Zeichensetzung/Ausdruck) über alle Abgaben. Klick auf eine Kategorie zeigt Beispielstellen." />
                  </h4>
                  {heatmap.length === 0 ? (
                    <EmptyState
                      icon={AlertTriangle}
                      title="Keine Fehlerdaten"
                      description="Noch keine analysierten Fehler für diese Aufgabe."
                      bordered={false}
                    />
                  ) : (
                    heatmap.map((h) => (
                      <div key={h.typ} style={{ marginBottom: '0.5rem', cursor: 'pointer' }} onClick={() => handleHeatmapClick(h.typ)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                          <span>
                            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: HEATMAP_COLORS[h.typ] ?? '#999', marginRight: 6, verticalAlign: 0 }} />
                            {HEATMAP_LABELS[h.typ] ?? h.typ}
                          </span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{h.anzahl} ({h.prozent.toFixed(0)}%)</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--color-bg-base)', marginTop: 2 }}>
                          <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(h.prozent, 100)}%`, background: HEATMAP_COLORS[h.typ] ?? '#999' }} />
                        </div>
                      </div>
                    ))
                  )}
                  {clusterSummary.length > 0 && (
                    <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Strukturierte Fehler-Cluster
                        <InfoDot text="Zusätzliche Ansicht aus tatsächlich gespeicherten Regelmustern. Alte R/G/Z/A-Fehler ohne Cluster bleiben in der Heatmap sichtbar." />
                      </div>
                      {clusterSummary.slice(0, 8).map((cluster) => (
                        <div key={`${cluster.typ}-${cluster.clusterId}`} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.3rem', fontSize: '0.75rem' }}>
                          <span style={{ color: HEATMAP_COLORS[cluster.typ] ?? 'var(--color-accent)', fontWeight: 700, minWidth: 18 }}>{cluster.typ}</span>
                          <span style={{ flex: 1 }}>{cluster.label}</span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{cluster.anzahl}×</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {heatmap.length > 0 && onGenerateUebung && (
                    <button
                      className="btn-primary"
                      onClick={() => handleGenerateUebung()}
                      style={{ marginTop: '0.75rem', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
                      title="Erzeugt ein Übungsblatt zu den häufigsten Fehlern dieser Klasse"
                    >
                      <Wand2 size={15} /> Übungsblatt zu Top-Fehlern generieren
                    </button>
                  )}
                  {niveaugruppen.length > 0 && onGenerateUebung && (
                    <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.6rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>Niveaugruppen aus bestätigten Lehrernoten</div>
                      {niveaugruppenLand === 'CH' && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
                          Schweizer Notenrichtung: 6 ist stärker, 1 ist schwächer.
                        </div>
                      )}
                      <div style={{ display: 'grid', gap: '0.3rem' }}>
                        {niveaugruppen.map((gruppe) => (
                          <button key={gruppe.id} type="button" className="btn-secondary" onClick={() => oeffneNiveauVorschau(gruppe)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}>
                            <span>{gruppe.label} · {gruppe.schwierigkeit}</span>
                            <span>{gruppe.schuelerIds.length} Schüler · Noten {gruppe.notenbereich.min}–{gruppe.notenbereich.max}</span>
                          </button>
                        ))}
                      </div>
                      {aktiveNiveaugruppe && (
                        <div role="region" aria-label="Niveaugruppen-Vorschau" style={{ marginTop: '0.65rem', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <strong style={{ fontSize: '0.78rem' }}>Einteilung prüfen und ändern</strong>
                            <button type="button" className="btn-secondary" aria-label="Niveaugruppen-Vorschau schließen" onClick={() => setNiveauVorschauGruppeId(null)} style={{ padding: '0.2rem' }}><X size={14} /></button>
                          </div>
                          <label style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                            Übungsniveau
                            <select value={aktiveNiveaugruppe.id} onChange={(event) => setNiveauVorschauGruppeId(event.target.value as Niveaugruppe['id'])} style={{ display: 'block', width: '100%', marginTop: '0.2rem', padding: '0.35rem' }}>
                              {niveaugruppenVorschau.map((gruppe) => <option key={gruppe.id} value={gruppe.id}>{gruppe.label} · {gruppe.schwierigkeit} ({gruppe.schuelerIds.length})</option>)}
                            </select>
                          </label>
                          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', margin: '0.45rem 0' }}>
                            Die Einteilung beruht auf der jeweils neuesten bestätigten Lehrkraftnote dieser Aufgabe. Du kannst Schüler/innen neu zuordnen oder aus der Übung herausnehmen.
                          </p>
                          <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                            {niveauNoten.map((abgabe) => {
                              const id = abgabe.schuelerId;
                              const name = [abgabe.vorname, abgabe.nachname].filter(Boolean).join(' ') || anzeigeName(abgabe);
                              return (
                                <label key={id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', alignItems: 'center', gap: 8, padding: '0.3rem 0', borderTop: '1px solid var(--color-border)', fontSize: '0.73rem' }}>
                                  <span>{name}</span>
                                  <span>Note {abgabe.noteFinal}</span>
                                  <select aria-label={`Niveaugruppe für ${name}`} value={niveauZuweisung[id] ?? ''} onChange={(event) => setNiveauZuweisung((current) => ({ ...current, [id]: event.target.value as Niveaugruppe['id'] | '' }))} style={{ padding: '0.25rem' }}>
                                    <option value="">Keine</option>
                                    {niveaugruppen.map((gruppe) => <option key={gruppe.id} value={gruppe.id}>{gruppe.label}</option>)}
                                  </select>
                                </label>
                              );
                            })}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: '0.55rem' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                              {aktiveNiveaugruppe.schuelerIds.length} Schüler/innen · Noten {aktiveNiveaugruppe.notenbereich.min}–{aktiveNiveaugruppe.notenbereich.max}
                            </span>
                            <button type="button" className="btn-primary" disabled={aktiveNiveaugruppe.schuelerIds.length === 0} onClick={handleGenerateNiveauVorschau} style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}>
                              Übung vorbereiten
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {fehlerDetail && (
                <div style={{ ...cardStyle, marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.5rem' }}>
                    {FEHLER_LABELS[fehlerDetail.typ] ?? fehlerDetail.typ} — Details ({fehlerDetail.rows.length})
                  </h4>
                  <div style={{ maxHeight: 300, overflow: 'auto' }}>
                    {fehlerDetail.rows.map((f, i) => (
                      <div key={i} style={{ padding: '0.375rem 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.8125rem' }}>
                        {f.zitat && <span style={{ fontStyle: 'italic' }}>"{f.zitat}"</span>}
                        {f.korrektur && <span> → {f.korrektur}</span>}
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginLeft: '0.5rem' }} title={f.dateiname}>
                          {anzeigeName(f)}
                        </span>
                        {f.erklaerung && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{f.erklaerung}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {abgaben.length > 0 && (
                <div style={cardStyle}>
                  <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
                    <Users size={16} style={{ verticalAlign: -2, marginRight: 6 }} /> Abgaben ({abgaben.length})
                  </h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                          <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem' }}>Schüler/in</th>
                          <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem' }}>Note</th>
                          <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem' }}>Lehrernote</th>
                          <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem' }}>Textsorte</th>
                          <th style={{ textAlign: 'right', padding: '0.375rem 0.5rem' }}>Wörter</th>
                        </tr>
                      </thead>
                      <tbody>
                        {abgaben.map((a) => (
                          <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '0.375rem 0.5rem' }} title={a.dateiname}>
                              <button
                                type="button"
                                onClick={() => onOpenKorrektur?.({ abgabeId: a.id, klasse: a.klasse, aufgabe: a.aufgabe })}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: onOpenKorrektur ? 'pointer' : 'default', color: 'var(--color-accent)', font: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}
                                title="Korrektur dieser Arbeit öffnen"
                              >
                                {anzeigeName(a)}
                              </button>
                              {a.schuelerId != null && onOpenSchueler && (
                                <button
                                  type="button"
                                  aria-label={`Schüler-Ansicht von ${anzeigeName(a)} öffnen`}
                                  onClick={() => onOpenSchueler(a.klasse, a.schuelerId!)}
                                  style={{ background: 'none', border: 'none', padding: '0 0 0 0.375rem', cursor: 'pointer', color: 'var(--color-text-secondary)', verticalAlign: '-2px' }}
                                  title="Schüler-Ansicht (Längsschnitt) öffnen"
                                >
                                  <User size={14} />
                                </button>
                              )}
                            </td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{noteLabel(a.note)}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{a.hatLehrerFeedback ? <strong>{noteLabel(a.noteFinal)}</strong> : '—'}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{a.textsorte ?? '—'}</td>
                            <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right' }}>{a.wortanzahl ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'statistik' && selectedKlasse && (() => {
            const wirksamkeit = buildWirksamkeit(fehlerTrend);
            const clusterTrend = baueFehlerClusterTrend(fehlerTrend);
            const loopWirkung = folgeuebungWirkung(fehlerTrend, loopUebungen);
            return (
            <>
              {trend.length > 1 && (
                <div style={{ ...cardStyle, marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
                    <TrendingUp size={16} style={{ verticalAlign: -2, marginRight: 6 }} /> Noten-Trend
                  </h4>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="aufgabe" tick={{ fontSize: 12 }} />
                      <YAxis domain={[1, 5]} tick={{ fontSize: 12 }} reversed />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="avgNoteApp" name="KI-Note" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                      <Line type="monotone" dataKey="avgNoteLehrer" name="Lehrernote" stroke="#e74c3c" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {wirksamkeit.relevant.length >= 2 && (
                <div style={{ ...cardStyle, marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
                    <TrendingDown size={16} style={{ verticalAlign: -2, marginRight: 6 }} /> Wirksamkeit über die Schularbeiten
                    <InfoDot text="Fehler pro Abgabe je Kategorie über die Schularbeiten hinweg. Sinkt eine Linie nach gezielter Übung, war sie vermutlich wirksam." />
                  </h4>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={wirksamkeit.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="aufgabe" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} label={{ value: 'Fehler pro Abgabe', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                      <Tooltip />
                      <Legend />
                      {WIRKSAMKEIT_TYPEN.map((typ) => (
                        <Line key={typ} type="monotone" dataKey={typ} name={HEATMAP_LABELS[typ]} stroke={HEATMAP_COLORS[typ]} strokeWidth={2} dot={{ r: 4 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  {clusterTrend.serien.length > 0 && (
                    <div style={{ marginTop: '0.9rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Wiederkehrende strukturierte Fehler-Cluster
                        <InfoDot text="Zusatzansicht nur für Regelmuster, die in mindestens zwei Aufgabenläufen vorkommen. Nicht strukturierte Alteinträge werden als Datenlücke gezeigt und nicht als null Fehler gewertet." />
                      </div>
                      <ResponsiveContainer width="100%" height={210}>
                        <LineChart data={clusterTrend.punkte} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                          <XAxis dataKey="aufgabe" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} label={{ value: 'Clusterfehler pro Abgabe', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                          <Tooltip />
                          <Legend />
                          {clusterTrend.serien.map((serie, index) => (
                            <Line
                              key={serie.id}
                              type="monotone"
                              dataKey={serie.id}
                              name={serie.label}
                              stroke={CLUSTER_TREND_FARBEN[index % CLUSTER_TREND_FARBEN.length]}
                              strokeWidth={2}
                              dot={{ r: 3 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {wirksamkeit.deltas.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                      {wirksamkeit.deltas.map((d) => {
                        const besser = d.last < d.prev;
                        const gleich = d.last === d.prev;
                        const farbe = gleich ? 'var(--color-text-secondary)' : besser ? 'var(--color-success, #27ae60)' : 'var(--color-danger, #c0392b)';
                        const Icon = besser ? TrendingDown : TrendingUp;
                        return (
                          <div key={d.typ} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.5rem 0.75rem', minWidth: 150 }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{d.label}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '1.125rem', fontWeight: 700, color: farbe }}>
                              {!gleich && <Icon size={16} />}
                              {d.prozent === null ? 'neu' : `${d.prozent > 0 ? '+' : ''}${d.prozent} %`}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                              {d.prev.toFixed(2)} → {d.last.toFixed(2)} pro Abgabe
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', margin: '0.75rem 0 0' }}>
                    Zeigt die Entwicklung, keinen Beweis: ob deine Übungen die Ursache sind, lässt sich daraus nicht sicher ablesen.
                  </p>
                </div>
              )}

              {loopWirkung.length > 0 && !loading && (
                <div style={{ ...cardStyle, marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
                    <ExternalLink size={16} style={{ verticalAlign: -2, marginRight: 6 }} /> Folgeübungen (aus Korrekturen erzeugt)
                    <InfoDot text="Vergleicht den Korrekturlauf vor der Übung mit dem ersten danach (Fehler pro Abgabe). Strukturierte Regelmuster erscheinen zusätzlich, wenn beide Läufe Cluster-Daten enthalten. Läufe am selben Tag bleiben bewusst unberücksichtigt." />
                  </h4>
                  {loopWirkung.map((l) => (
                    <div key={l.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{l.titel}</span>
                        {onOpenUnterlage && (
                          <button
                            type="button"
                            aria-label={`Übung „${l.titel}" im Unterricht öffnen`}
                            onClick={() => onOpenUnterlage(l.id)}
                            style={{ background: 'none', border: 'none', padding: '0.125rem', cursor: 'pointer', color: 'var(--color-accent)', display: 'inline-flex' }}
                            title="Übung im Unterricht öffnen"
                          >
                            <ExternalLink size={14} />
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                        Übung erstellt {l.erstelltAm || '—'}
                        {l.vor ? ` · davor: ${l.vor.aufgabe}` : ' · keine Schularbeit davor'}
                        {l.nach ? ` · danach: ${l.nach.aufgabe}` : ' · noch keine Schularbeit danach'}
                      </div>
                      {l.deltas.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {l.deltas.map((d) => {
                            const besser = d.delta < 0;
                            const gleich = d.delta === 0;
                            const farbe = gleich ? 'var(--color-text-secondary)' : besser ? 'var(--color-success, #27ae60)' : 'var(--color-danger, #c0392b)';
                            return (
                              <span key={d.typ} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.15rem 0.5rem', fontSize: '0.75rem', color: farbe }}>
                                {HEATMAP_LABELS[d.typ] ?? d.typ}: {d.vor.toFixed(1)} → {d.nach.toFixed(1)}
                                {!gleich && (d.delta < 0 ? ' ↓' : ' ↑')}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {l.deltas.length === 0 && l.clusterDeltas.length === 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          {l.vor && l.nach ? 'Keine vergleichbaren Fehlerkategorien.' : 'Vergleich möglich, sobald danach eine Schularbeit korrigiert wurde.'}
                        </div>
                      )}
                      {l.clusterDeltas.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                          {l.clusterDeltas.map((delta) => (
                            <span key={delta.clusterId} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.15rem 0.5rem', fontSize: '0.72rem', color: delta.delta < 0 ? 'var(--color-success, #27ae60)' : delta.delta > 0 ? 'var(--color-danger, #c0392b)' : 'var(--color-text-secondary)' }}>
                              {delta.label}: {delta.vor.toFixed(1)} → {delta.nach.toFixed(1)}
                              {delta.delta < 0 ? ' ↓' : delta.delta > 0 ? ' ↑' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {wirksamkeit.relevant.length === 1 && !loading && (
                <div style={{ ...cardStyle, marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', margin: 0 }}>
                    Ab der zweiten Schularbeit siehst du hier, wie sich die Fehlerkategorien entwickeln.
                  </p>
                </div>
              )}

              {kalibrierung && (
                <div style={{ ...cardStyle, marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
                    Kalibrierung (KI vs. Lehrer)
                    <InfoDot text="Vergleicht die KI-Note mit deiner tatsächlich vergebenen Note bei Abgaben, die du überschrieben hast. Zeigt, ob die KI im Schnitt strenger oder milder benotet als du." />
                  </h4>
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>KI-Durchschnitt</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                        {kalibrierung.appAvg !== null ? kalibrierung.appAvg.toFixed(2) : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Lehrer-Durchschnitt</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        {kalibrierung.lehrerAvg !== null ? kalibrierung.lehrerAvg.toFixed(2) : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Tendenz</div>
                      <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                        {kalibrierung.tendenz === 'app strenger' ? 'KI strenger' :
                         kalibrierung.tendenz === 'app milder' ? 'KI milder' :
                         kalibrierung.tendenz === 'deckungsgleich' ? 'Deckungsgleich' : 'n/a'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Paare</div>
                      <div style={{ fontSize: '1.125rem' }}>{kalibrierung.nMitFeedback} / {kalibrierung.nGesamt}</div>
                    </div>
                  </div>
                  {kalibrierung.nachTextsorte && kalibrierung.nachTextsorte.length > 0 && (
                    <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
                      {kalibrierung.nachTextsorte.map((t) => (
                        <div key={t.textsorte} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.75rem', padding: '0.15rem 0' }}>
                          <span>{t.textsorte} <span style={{ color: 'var(--color-text-secondary)' }}>({t.paare})</span></span>
                          <span style={{ color: 'var(--color-text-secondary)' }} title="Mittlere Abweichung KI-Note vs. Lehrernote">
                            {t.mittlereAbweichung !== null ? `± ${t.mittlereAbweichung.toFixed(2)} Noten` : '—'}
                            {t.tendenz === 'app strenger' ? ' · KI strenger' : t.tendenz === 'app milder' ? ' · KI milder' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {trend.length <= 1 && !loading && (
                <div style={cardStyle}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', margin: 0 }}>
                    Mindestens zwei Aufgaben mit Noten benötigt für den Trend.
                  </p>
                </div>
              )}

              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', margin: 0 }}>
                    <Sparkles size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--color-accent)' }} />
                    KI-Klassen-Briefing
                    <InfoDot text="Fasst Notenverteilung, Fehler-Heatmap und Trend aggregiert zusammen — ohne Schülernamen oder Textzitate." />
                  </h4>
                  <button
                    className="btn-primary"
                    onClick={handleGenerateBriefing}
                    disabled={briefingBusy}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                    title="Generiert ein KI-Briefing zur aktuellen Klassensituation (Fehlerschwerpunkte, Notenverteilung, Trend)"
                  >
                    {briefingBusy ? <><Loader2 size={13} className="spin" /> Generiere …</> : <><Sparkles size={13} /> Briefing generieren</>}
                  </button>
                </div>
                {briefingError && <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger, #c0392b)', margin: '0.25rem 0' }}>{briefingError}</p>}
                {briefing ? (
                  <>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem' }}>
                      {briefing.erstelltAm && `${briefing.erstelltAm} · `}{briefing.modell || 'Modell unbekannt'}
                    </p>
                    <div style={{ maxHeight: '40vh', overflowY: 'auto', fontSize: '0.8125rem', lineHeight: 1.6, background: 'var(--color-bg-base)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                      <KiTextBlock text={briefing.text} />
                    </div>
                  </>
                ) : (
                  !briefingBusy && <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>Noch kein Briefing — Button klicken zum Generieren.</p>
                )}
              </div>
            </>
            );
          })()}

          {!selectedKlasse && !error && tab === 'uebersicht' && (
            <div style={cardStyle}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0, textAlign: 'center' }}>
                Wähle eine Klasse aus der Liste.
              </p>
            </div>
          )}
        </div>
      </div>
    </ViewShell>
  );
}

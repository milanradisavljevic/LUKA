import { useState, useCallback, useMemo, useEffect } from 'react';
import { ArrowRight, Clock, FolderOpen, BookOpen, ClipboardCheck, Target, Grid3X3, Languages, Pencil, AlertTriangle } from 'lucide-react';
import type { AppState, AppAction } from '../lib/types';
import { BLOCK_TYPE_DEFS, SCHWIERIGKEIT_RULES, UNTERLAGENTYP_MINUTEN } from '../lib/constants';
import { buildSkelett, FACH_META, fachLabel, istSprachfach, SCHULSTUFEN, stufeFromSchulstufe, type Auftrag, type Fach } from '@lehrunterlagen/schema';
import { EXAMPLE_ABSICHTEN } from '../lib/exampleAbsichten';
import { loadDocuments, loadSettings } from '../lib/storage';
import { FEATURES } from '../lib/features';
import { consumePendingUebung } from '../lib/korrekturBridge';
import { getDefaultTemplate } from '@lehrunterlagen/renderer';
import { useKlassenMeta } from '../hooks/useKlassenMeta';
import { Tile } from './ui/Tile';
import { SectionLabel } from './ui/SectionLabel';
import { InfoDot } from './ui/InfoDot';
import { FehlerKuration, fehlerNotiz, type KurierterFehler } from './FehlerKuration';
import {
  parseBridgeExport,
  mapBridgeToPrefill,
  TYP_FARBE,
  type BridgeExportMeta,
} from '../lib/nataschaBridge';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  firstRunHint?: boolean;
  onDismissFirstRunHint?: () => void;
  onNavigateToTemplates?: () => void;
  onNavigateToKompetenz?: () => void;
}

const UNTERLAGENTYPEN = [
  { id: 'hausuebung' as const, label: 'Hausübung', beschreibung: 'Kurz, niedrige Stakes, ~15 Min, ~12 Pkte' },
  { id: 'test' as const, label: 'Test / Stundenwiederholung', beschreibung: 'Mittel, Punkte + einfacher Schlüssel, ~25 Min, ~24 Pkte' },
  { id: 'schuluebung' as const, label: 'Schulübung', beschreibung: 'Übungsaufgaben ohne Punkte/Noten, ~20 Min' },
  { id: 'schularbeit' as const, label: 'Schularbeit / Klassenarbeit', beschreibung: 'Lang, hohe Stakes, Maturastruktur, ~50 Min, ~48 Pkte' },
  { id: 'matura' as const, label: 'Matura (SRDP)', beschreibung: 'Standardisierte Reifeprüfung, BMBWF-Format, K1/K3-Raster, ~270 Min' },
];

const SCHWIERIGKEITEN = [
  { id: 'leicht' as const, label: 'Leicht' },
  { id: 'mittel' as const, label: 'Mittel' },
  { id: 'schwer' as const, label: 'Schwer' },
];

function getLastDocumentDefaults() {
  const docs = loadDocuments();
  if (docs.length === 0) return null;
  const last = docs.reduce((a, b) =>
    new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b
  );
  return last;
}

export function Step0_Absicht({
  state,
  dispatch,
  firstRunHint = false,
  onDismissFirstRunHint,
  onNavigateToTemplates,
  onNavigateToKompetenz,
}: Props) {
  const lastDoc = useMemo(() => getLastDocumentDefaults(), []);
  const lastMeta = lastDoc?.snapshot.meta;

  const [typ, setTyp] = useState<NonNullable<Auftrag['typ']>>(lastMeta?.typ ?? 'schularbeit');
  const [fach, setFach] = useState<NonNullable<Auftrag['fach']>>(lastMeta?.fach ?? 'deutsch');
  const [stufe, setStufe] = useState<NonNullable<Auftrag['stufe']>>(lastMeta?.stufe ?? 'oberstufe');
  const [schulstufe, setSchulstufe] = useState<number | undefined>(lastMeta?.schulstufe);
  const [thema, setThema] = useState(lastMeta?.thema ?? '');
  const [datum, setDatum] = useState(lastMeta?.datum ?? new Date().toISOString().slice(0, 10));
  const [klasse, setKlasse] = useState(lastMeta?.klasse ?? '');
  const [dauerMinuten, setDauerMinuten] = useState<number | ''>('');
  const [schwierigkeit, setSchwierigkeit] = useState<NonNullable<Auftrag['schwierigkeit']>>(lastMeta?.schwierigkeit ?? 'mittel');
  const [gewuenschteAufgabenarten, setGewuenschteAufgabenarten] = useState<string[]>([]);
  const [gesamtpunkteZiel, setGesamtpunkteZiel] = useState<number | ''>('');
  const [notizen, setNotizen] = useState(lastMeta?.notizen ?? '');
  const [lernzieleRaw, setLernzieleRaw] = useState(lastMeta?.lernziele?.join(', ') ?? '');
  const [fokusThemen, setFokusThemen] = useState<string[]>(lastMeta?.fokusThemen ?? []);
  const [fehler, setFehler] = useState<string | null>(null);
  const [schnellOhneQuelltext, setSchnellOhneQuelltext] = useState(false);
  // Punkte vergeben? Schulübung standardmäßig ohne Punkte, sonst mit.
  const [punkteVergeben, setPunkteVergeben] = useState<boolean>((lastMeta?.typ ?? 'schularbeit') !== 'schuluebung');
  // Sinnvoller Default je Unterlagentyp; manuell überschreibbar.
  useEffect(() => { setPunkteVergeben(typ !== 'schuluebung'); }, [typ]);

  // Klassen-Verwaltung: bekannte Klassen als Datalist; bei exaktem Namenstreffer
  // Fach/Schulstufe automatisch übernehmen (Lehrkraft kann danach überschreiben).
  const { klassen: bekannteKlassen } = useKlassenMeta();
  const [klasseAutoHinweis, setKlasseAutoHinweis] = useState<string | null>(null);
  const handleKlasseChange = useCallback((wert: string) => {
    setKlasse(wert);
    const treffer = bekannteKlassen.find((k) => k.name === wert.trim());
    if (treffer && (treffer.fach || treffer.schulstufe)) {
      if (treffer.fach) setFach(treffer.fach as Fach);
      if (treffer.schulstufe) {
        setSchulstufe(treffer.schulstufe);
        const neueStufe = stufeFromSchulstufe(treffer.schulstufe);
        setStufe(neueStufe);
        dispatch({ type: 'SET_RENDER_TEMPLATE', template: getDefaultTemplate(neueStufe).id });
      } else if (treffer.stufe) {
        setStufe(treffer.stufe as NonNullable<Auftrag['stufe']>);
      }
      setKlasseAutoHinweis(`Fach/Stufe von „${wert}" übernommen`);
    } else {
      setKlasseAutoHinweis(null);
    }
  }, [bekannteKlassen, dispatch]);
  // Matura (SRDP) → nüchternes SRDP-Template vorwählen.
  useEffect(() => { if (typ === 'matura') dispatch({ type: 'SET_RENDER_TEMPLATE', template: 'srdp' }); }, [typ, dispatch]);

  // NATASCHA-Datei-Brücke (Phase 1)
  const [nataschaExports, setNataschaExports] = useState<BridgeExportMeta[] | null>(null);
  const [nataschaBusy, setNataschaBusy] = useState(false);
  const [nataschaInfo, setNataschaInfo] = useState<string | null>(null);
  const [nataschaInboxPfad, setNataschaInboxPfad] = useState<string | null>(null);
  const nataschaInboxDir = useMemo(() => loadSettings().nataschaInboxDir ?? '', []);

  // Aus der Korrektur übernommene, kuratierbare Schülerfehler (Brücke v2).
  const [nataschaFehler, setNataschaFehler] = useState<KurierterFehler[]>([]);

  /** Übernimmt Ausgangstext (→ Quelltext) + Fehler (→ Kuration) aus einer Brücken-Vorbefüllung. */
  const uebernehmeAusgangstextUndFehler = useCallback(
    (ausgangstext?: string, fehlerListe?: { typ: 'R' | 'G' | 'Z' | 'A'; zitat: string; korrektur: string; erklaerung?: string }[]) => {
      if (ausgangstext?.trim()) {
        dispatch({
          type: 'ADD_QUELLTEXT',
          quelltext: {
            id: `q-natascha-${Date.now()}`,
            titel: 'Ausgangstext (aus Korrektur)',
            inhalt: ausgangstext.trim(),
            herkunft: { typ: 'eingabe', ref: '' },
          },
        });
      }
      setNataschaFehler((fehlerListe ?? []).map((f) => ({ ...f, aktiv: true })));
    },
    [dispatch],
  );

  // Closed Loop: Übungs-Vorbefüllung aus der Korrektur-Heatmap übernehmen (einmalig beim Mounten).
  useEffect(() => {
    if (!FEATURES.natascha) return;
    const p = consumePendingUebung();
    if (!p) return;
    setTyp('schuluebung');
    setFach(p.fach);
    setStufe(p.stufe);
    dispatch({ type: 'SET_RENDER_TEMPLATE', template: getDefaultTemplate(p.stufe).id });
    setThema(p.thema);
    setNotizen(p.notizen);
    setFokusThemen(p.fokusThemen);
    setGewuenschteAufgabenarten(p.gewuenschteAufgabenarten);
    uebernehmeAusgangstextUndFehler(p.ausgangstext, p.fehler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinueLast = useCallback(() => {
    if (!lastDoc) return;
    dispatch({ type: 'LOAD_SNAPSHOT', snapshot: lastDoc.snapshot, documentId: lastDoc.id });
  }, [lastDoc, dispatch]);

  const toggleAufgabenart = useCallback((id: string) => {
    setGewuenschteAufgabenarten((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const ladeNataschaExporte = useCallback(async () => {
    setNataschaInfo(null);
    setNataschaBusy(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const [list, pfad] = await Promise.all([
        invoke<BridgeExportMeta[]>('list_bridge_exports', { dir: nataschaInboxDir }),
        invoke<string>('resolve_bridge_inbox', { dir: nataschaInboxDir }).catch(() => null),
      ]);
      setNataschaInboxPfad(pfad);
      setNataschaExports(list);
      if (list.length === 0) {
        setNataschaInfo(
          `Keine Korrektur-Exporte gefunden${pfad ? ` in ${pfad}` : ''}. ` +
            'Exportiere in NATASCHA im Heatmap-Tab über „Für Übungs-Tool". ' +
            'Den Ordner kannst du in den Einstellungen ändern.',
        );
      }
    } catch (err) {
      setNataschaInfo(
        err instanceof Error
          ? `Exporte konnten nicht geladen werden: ${err.message}`
          : 'Exporte konnten nicht geladen werden — die NATASCHA-Brücke ist nur in der Desktop-App (Tauri) verfügbar.',
      );
    } finally {
      setNataschaBusy(false);
    }
  }, [nataschaInboxDir]);

  const uebernehmeNataschaExport = useCallback(
    async (meta: BridgeExportMeta) => {
      setNataschaInfo(null);
      setNataschaBusy(true);
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const raw = await invoke<string>('read_bridge_export', { path: meta.pfad, dir: nataschaInboxDir });
        const ex = parseBridgeExport(raw);
        const p = mapBridgeToPrefill(ex);
        setTyp('schuluebung');
        setFach(p.fach);
        setStufe(p.stufe);
        dispatch({ type: 'SET_RENDER_TEMPLATE', template: getDefaultTemplate(p.stufe).id });
        setThema(p.thema);
        setKlasse(ex.klasse);
        setNotizen(p.notizen);
        setFokusThemen(p.fokusThemen);
        setGewuenschteAufgabenarten(p.gewuenschteAufgabenarten);
        uebernehmeAusgangstextUndFehler(p.ausgangstext, p.fehler);
        setNataschaExports(null);
        setNataschaInfo(
          p.ausgangstext
            ? `Übernommen: ${ex.klasse} · ${ex.aufgabe}. Ausgangstext als Quelltext vorbefüllt, Fehler unten kuratierbar.`
            : `Übernommen: ${ex.klasse} · ${ex.aufgabe}. Du kannst alles unten anpassen, dann „Erstellen".`,
        );
      } catch (err) {
        setNataschaInfo(
          err instanceof Error ? err.message : 'Export konnte nicht übernommen werden.',
        );
      } finally {
        setNataschaBusy(false);
      }
    },
    [dispatch, uebernehmeAusgangstextUndFehler],
  );

  const handleErstellen = useCallback(() => {
    setFehler(null);

    if (!thema.trim()) {
      setFehler('Bitte gib ein Thema ein.');
      return;
    }

    // Kuratierte Korrektur-Fehler in die Notizen einweben (steuert den Prompt).
    const notizenFinal = [notizen.trim(), fehlerNotiz(nataschaFehler)].filter(Boolean).join(' ');

    const auftrag: Auftrag = {
      typ,
      fach,
      stufe,
      schulstufe,
      thema: thema.trim(),
      datum,
      klasse: klasse.trim() || undefined,
      quelltexte: state.quelltexte,
      dauerMinuten: dauerMinuten !== '' ? Number(dauerMinuten) : undefined,
      schwierigkeit,
      gewuenschteAufgabenarten: gewuenschteAufgabenarten.length > 0 ? gewuenschteAufgabenarten as Auftrag['gewuenschteAufgabenarten'] : undefined,
      // „Ohne Punkte": 0 (nicht undefined) erzwingt punktlose Blöcke; sonst würde
      // buildSkelett auf den Profil-Default (z. B. Schularbeit 48) zurückfallen.
      gesamtpunkteZiel: !punkteVergeben ? 0 : (gesamtpunkteZiel !== '' ? Number(gesamtpunkteZiel) : undefined),
      notizen: notizenFinal || undefined,
      lernziele: lernzieleRaw.split(',').map((s) => s.trim()).filter(Boolean) || undefined,
      fokusThemen: fokusThemen.length > 0 ? fokusThemen : undefined,
    };

    try {
      const bloecke = buildSkelett(auftrag);
      dispatch({ type: 'SET_AUFTRAG', auftrag });
      // Ersetze vorhandene Blöcke durch das Skelett
      for (const b of [...state.bloecke]) {
        dispatch({ type: 'REMOVE_BLOCK', id: b.id });
      }
      for (const b of bloecke) {
        dispatch({ type: 'ADD_BLOCK', block: b });
      }
      // Meta synchronisieren
      dispatch({
        type: 'SET_META',
        meta: {
          stufe,
          schulstufe,
          fach,
          thema: thema.trim(),
          datum,
          klasse: klasse.trim(),
          notizen: notizenFinal,
          typ,
          // Schulübung ist per Definition punktlos ("keine Punkte, keine Noten") →
          // app-weit Punkte ausblenden; neue Baukasten-Blöcke kommen dann mit punkte:0.
          punkteAusblenden: !punkteVergeben,
          schwierigkeit,
          lernziele: lernzieleRaw.split(',').map((s) => s.trim()).filter(Boolean) || undefined,
          fokusThemen: fokusThemen.length > 0 ? fokusThemen : undefined,
        },
      });
      onDismissFirstRunHint?.();
      dispatch({ type: 'SET_STEP', step: schnellOhneQuelltext ? 'baukasten' : 'input' });
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Fehler beim Erstellen des Skeletts.');
    }
  }, [typ, fach, stufe, thema, datum, klasse, dauerMinuten, schwierigkeit, gewuenschteAufgabenarten, gesamtpunkteZiel, punkteVergeben, notizen, lernzieleRaw, fokusThemen, nataschaFehler, state.quelltexte, state.bloecke, dispatch, onDismissFirstRunHint]);

  const fachLabelCurrent = fachLabel(fach);
  const stufeLabel = stufe === 'oberstufe' ? 'Oberstufe' : 'Unterstufe';

  return (
    <div>
      <h2 style={{ margin: '0 0 0.5rem' }}>Neue Unterlage — Absicht erfassen</h2>
      <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 1.25rem', fontSize: '0.875rem' }}>
        Beschreibe, was du brauchst. Die App baut daraus automatisch das passende Skelett.
      </p>

      {firstRunHint && (
        <section
          style={{
            marginBottom: '1.25rem',
            padding: '0.95rem 1rem',
            border: '1px solid color-mix(in srgb, var(--color-success) 38%, var(--color-border))',
            borderRadius: 'var(--radius)',
            background: 'color-mix(in srgb, var(--color-success-bg) 55%, var(--color-bg-surface))',
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0, 1fr) auto',
            gap: '0.85rem',
            alignItems: 'start',
          }}
        >
          <BookOpen size={20} style={{ color: 'var(--color-success)', marginTop: '0.1rem' }} />
          <div>
            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
              Bereit für die erste Unterlage
            </strong>
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              Starte schlank: Thema eintragen, Fach und Schulstufe prüfen, dann mit „Weiter" Quelltext oder eigenes Material ergänzen.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              <span className="badge">1 · Thema</span>
              <span className="badge">2 · Fach/Stufe</span>
              <span className="badge">3 · Material</span>
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={onDismissFirstRunHint}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
          >
            Ausblenden
          </button>
        </section>
      )}

      {/* Kontinuität — Weitermachen, Vorlagen & Kompetenz */}
      {(lastDoc || onNavigateToTemplates || onNavigateToKompetenz) && (
        <section style={{ marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
          {lastDoc && (
            <Tile
              selected
              onClick={handleContinueLast}
              icon={<Clock size={16} />}
              title="Weitermachen"
              ariaLabel={`Weitermachen an ${lastDoc.title}`}
            >
              <span style={{ fontWeight: 600 }}>{lastDoc.title}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                {fachLabel(lastDoc.snapshot.meta.fach)} · {lastDoc.snapshot.meta.stufe === 'oberstufe' ? 'Oberstufe' : 'Unterstufe'} · zuletzt {new Date(lastDoc.updatedAt).toLocaleDateString('de-AT')}
              </span>
            </Tile>
          )}
          {onNavigateToTemplates && (
            <Tile
              onClick={onNavigateToTemplates}
              icon={<FolderOpen size={16} />}
              title="Aus Vorlage starten"
              subtitle="Wähle aus deinen gespeicherten Konfigurationen."
            />
          )}
          {onNavigateToKompetenz && (
            <Tile
              onClick={onNavigateToKompetenz}
              icon={<Target size={16} />}
              title="Übung ohne Quelltext"
              subtitle="Frei eingeben oder Lehrplan-Kompetenz wählen — ohne Quelltext."
            />
          )}
        </section>
      )}

      {/* NATASCHA-Korrektur → gezielte Übungen (Datei-Brücke Phase 1) */}
      {FEATURES.natascha && (
      <section style={{ marginBottom: '1.25rem' }}>
        <SectionLabel>Aus NATASCHA-Korrektur</SectionLabel>
        {nataschaExports && nataschaExports.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
            {nataschaExports.map((ex) => (
              <button
                key={ex.pfad}
                className="tile"
                disabled={nataschaBusy}
                onClick={() => uebernehmeNataschaExport(ex)}
                style={{ fontSize: '0.8125rem', cursor: nataschaBusy ? 'wait' : 'pointer' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                  <ClipboardCheck size={16} /> {ex.klasse} · {ex.aufgabe}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  {ex.anzahlAbgaben > 0 ? `${ex.anzahlAbgaben} Abgaben · ` : ''}
                  {ex.gesamtFehler} Fehler · {ex.heatmap.length}{' '}
                  {ex.heatmap.length === 1 ? 'Kategorie' : 'Kategorien'} · {ex.datum}
                </span>
                {ex.heatmap.length > 0 && (
                  <>
                    <span style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: '0.125rem', background: 'var(--color-border)' }}>
                      {ex.heatmap.map((h) => (
                        <span
                          key={h.typ}
                          title={`${h.kategorie}: ${h.anzahl} (${(h.prozent ?? 0).toFixed(0)}%)`}
                          style={{ flex: `0 0 ${h.prozent ?? 0}%`, background: TYP_FARBE[h.typ] ?? 'var(--color-border)' }}
                        />
                      ))}
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                      {ex.heatmap.slice(0, 3).map((h) => `${h.kategorie} ${(h.prozent ?? 0).toFixed(0)}%`).join(' · ')}
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            className="tile"
            disabled={nataschaBusy}
            onClick={ladeNataschaExporte}
            style={{ fontSize: '0.8125rem', cursor: nataschaBusy ? 'wait' : 'pointer', maxWidth: '420px' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-accent)', fontWeight: 600 }}>
              <ClipboardCheck size={16} /> {nataschaBusy ? 'Lädt …' : 'Aus NATASCHA-Korrektur generieren'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              Erzeugt Übungen zu den Fehlerschwerpunkten einer korrigierten Klasse.
            </span>
          </button>
        )}
        {nataschaInfo && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            {nataschaInfo}
          </p>
        )}
      </section>
      )}

      {/* Kuratierbare Fehler aus der NATASCHA-Korrektur (Brücke v2) */}
      {FEATURES.natascha && <FehlerKuration fehler={nataschaFehler} onChange={setNataschaFehler} />}

      {/* Schnellstart — Beispiel-Absichten */}
      <section style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          Schnellstart
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
          {EXAMPLE_ABSICHTEN.map((ex) => (
            <button
              key={ex.id}
              onClick={() => {
                setTyp(ex.auftrag.typ);
                setFach(ex.auftrag.fach);
                setStufe(ex.auftrag.stufe);
                dispatch({ type: 'SET_RENDER_TEMPLATE', template: getDefaultTemplate(ex.auftrag.stufe).id });
                setThema(ex.auftrag.thema);
                setDauerMinuten(ex.auftrag.dauerMinuten ?? '');
                setSchwierigkeit(ex.auftrag.schwierigkeit ?? 'mittel');
                setLernzieleRaw(ex.auftrag.lernziele?.join(', ') ?? '');
                setNotizen(ex.auftrag.notizen ?? '');
                setSchnellOhneQuelltext(false);
                // Optional: gleich Skelett erstellen
                // handleErstellen();
              }}
              className="tile"
              style={{ fontSize: '0.8125rem' }}
            >
              <span style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--color-accent)' }}>
                <ex.Icon size={22} />
              </span>
              <strong style={{ fontSize: '0.875rem' }}>{ex.label}</strong>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                {ex.beschreibung}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Schnellstart ohne Quelltext */}
      <section style={{ marginBottom: '1.25rem' }}>
        <SectionLabel>Schnell ohne Quelltext</SectionLabel>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem' }}>
          Für kleine Übungen mit eigenen Inhalten brauchst du keine Textgrundlage.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
          {[
            {
              id: 'schnell-kreuzwort',
              label: 'Kreuzworträtsel',
              beschreibung: 'Mit eigenen Begriffen und Hinweisen.',
              Icon: Grid3X3,
              fach: 'deutsch' as const,
              stufe: 'unterstufe' as const,
              typ: 'kreuzwortraetsel' as const,
              thema: 'Kreuzworträtsel — Thema anpassen',
            },
            {
              id: 'schnell-vokabeln',
              label: 'Vokabeltest',
              beschreibung: 'Mit eigener Wortliste.',
              Icon: Languages,
              fach: 'englisch' as const,
              stufe: 'unterstufe' as const,
              typ: 'vokabeluebung' as const,
              thema: 'Vokabeltest — Thema anpassen',
            },
            {
              id: 'schnell-fehler',
              label: 'Fehlerkorrektur',
              beschreibung: 'Mit eigenen Sätzen.',
              Icon: Pencil,
              fach: 'deutsch' as const,
              stufe: 'oberstufe' as const,
              typ: 'fehlerkorrektur' as const,
              thema: 'Fehlerkorrektur — Thema anpassen',
            },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setTyp('schuluebung');
                setFach(s.fach);
                setStufe(s.stufe);
                dispatch({ type: 'SET_RENDER_TEMPLATE', template: getDefaultTemplate(s.stufe).id });
                setThema(s.thema);
                setDauerMinuten(15);
                setSchwierigkeit('mittel');
                setLernzieleRaw('');
                setNotizen('');
                setGewuenschteAufgabenarten([s.typ]);
                setPunkteVergeben(false);
                setSchnellOhneQuelltext(true);
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
              }}
              className="tile"
              aria-pressed={schnellOhneQuelltext && gewuenschteAufgabenarten.includes(s.typ) && thema === s.thema}
              style={{ fontSize: '0.8125rem' }}
            >
              <span style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--color-accent)' }}>
                <s.Icon size={22} />
              </span>
              <strong style={{ fontSize: '0.875rem' }}>{s.label}</strong>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                {s.beschreibung}
              </span>
            </button>
          ))}
        </div>
      </section>

      {fehler && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'var(--color-error-bg)',
          color: 'var(--color-error)',
          borderRadius: 'var(--radius)',
          marginBottom: '1rem',
          fontSize: '0.875rem',
        }}>
          {fehler}
        </div>
      )}

      {/* Fach & Schulstufe — die Grundentscheidung, daher zuerst und hervorgehoben:
          steuert Zielsprache, Aufgabentypen-Filter, Kompetenzkataloge und Fachatmosphäre. */}
      <section
        style={{
          marginBottom: '1.25rem',
          padding: '1rem 1.15rem',
          border: '1px solid color-mix(in srgb, var(--color-accent) 45%, var(--color-border))',
          borderRadius: 'var(--radius)',
          background: 'color-mix(in srgb, var(--color-info-bg) 45%, var(--color-bg-surface))',
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 1fr) 1.6fr',
          gap: '1rem',
        }}
      >
        <div>
          <SectionLabel>
            Fach
            <InfoDot text="Die Grundentscheidung: bestimmt die Zielsprache der Aufgaben, die verfügbaren Aufgabentypen und die Kompetenzkataloge." />
          </SectionLabel>
          <select
            value={fach}
            onChange={(e) => setFach(e.target.value as Fach)}
            style={{ width: '100%', padding: '0.625rem 0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-bg-base)', fontSize: '0.9375rem', fontWeight: 600 }}
          >
            {/* Deutsch gehört in der Anzeige zu den Sprachfächern; das Schema-Flag
                `sprachfach` bleibt false, weil es die Zielsprachen-Generierung steuert. */}
            <optgroup label="Sprachfächer">
              {Object.entries(FACH_META)
                .filter(([f, m]) => m.sprachfach || f === 'deutsch')
                .map(([f, m]) => (
                  <option key={f} value={f}>{m.label}</option>
                ))}
            </optgroup>
            <optgroup label="Sachfächer">
              {Object.entries(FACH_META)
                .filter(([f, m]) => !m.sprachfach && f !== 'deutsch')
                .map(([f, m]) => (
                  <option key={f} value={f}>{m.label}</option>
                ))}
            </optgroup>
          </select>
        </div>
        <div>
          <SectionLabel>
            Schulstufe
            <InfoDot text="Steuert Wortschatz, Satzkomplexität und Beispiele. Eine konkrete Schulstufe (z. B. 7) ist präziser als ganze Unter-/Oberstufe." />
          </SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {SCHULSTUFEN.map((s) => {
              const aktiv = schulstufe === s;
              return (
                <button
                  key={s}
                  className="tile"
                  aria-pressed={aktiv}
                  onClick={() => {
                    setSchulstufe(s);
                    const neueStufe = stufeFromSchulstufe(s);
                    setStufe(neueStufe);
                    dispatch({ type: 'SET_RENDER_TEMPLATE', template: getDefaultTemplate(neueStufe).id });
                  }}
                  style={{ padding: '0.45rem 0.7rem', alignItems: 'center', fontSize: '0.875rem', minWidth: 40, justifyContent: 'center' }}
                >
                  {s}.
                </button>
              );
            })}
            {(['unterstufe', 'oberstufe'] as const).map((s) => (
              <button
                key={s}
                className="tile"
                aria-pressed={schulstufe === undefined && stufe === s}
                onClick={() => {
                  setSchulstufe(undefined);
                  setStufe(s);
                  dispatch({ type: 'SET_RENDER_TEMPLATE', template: getDefaultTemplate(s).id });
                }}
                style={{ padding: '0.45rem 0.7rem', alignItems: 'center', fontSize: '0.8125rem', justifyContent: 'center' }}
              >
                ganze {s === 'oberstufe' ? 'Oberstufe' : 'Unterstufe'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Typ */}
      <section style={{ marginBottom: '1.25rem' }}>
        <SectionLabel>Unterlagentyp</SectionLabel>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {UNTERLAGENTYPEN.map((u) => {
            const min = UNTERLAGENTYP_MINUTEN[u.id];
            return (
              <button
                key={u.id}
                className="tile"
                aria-pressed={typ === u.id}
                onClick={() => { setTyp(u.id); setSchnellOhneQuelltext(false); }}
                style={{ fontSize: '0.875rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <strong>{u.label}</strong>
                  {min && (
                    <span className="badge badge-info" style={{ flexShrink: 0, marginLeft: '0.5rem' }}>
                      <Clock size={11} /> ~{min[0]}–{min[1]} Min
                    </span>
                  )}
                </div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                  {u.beschreibung}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Thema */}
      <section style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          Thema <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <input
          type="text"
          value={thema}
          onChange={(e) => setThema(e.target.value)}
          placeholder="z. B. Medienkonsum und Jugendliche"
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            fontSize: '0.875rem',
          }}
        />
      </section>

      {/* Datum & Klasse */}
      <section style={{ marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Datum</label>
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Klasse (optional)
            <InfoDot text={FEATURES.natascha
              ? 'Ordnet die Unterlage einer Klasse zu — nützlich für Heatmap und Empfehlungen im Korrektur-Kreislauf.'
              : 'Ordnet und benennt die Unterlage für deine spätere Ablage.'} />
          </label>
          <input
            type="text"
            list="klasse-optionen"
            value={klasse}
            onChange={(e) => handleKlasseChange(e.target.value)}
            placeholder="z. B. 7A"
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
            }}
          />
          <datalist id="klasse-optionen">
            {bekannteKlassen.map((k) => <option key={k.name} value={k.name} />)}
          </datalist>
          {klasseAutoHinweis && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-accent)', margin: '0.25rem 0 0' }}>{klasseAutoHinweis}</p>
          )}
        </div>
      </section>

      {/* Bewertung — Punkte an/aus */}
      <section style={{ marginBottom: '1.25rem' }}>
        <SectionLabel>Bewertung</SectionLabel>
        <button
          type="button"
          onClick={() => setPunkteVergeben((v) => !v)}
          aria-pressed={punkteVergeben}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 0.875rem', borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)', background: 'var(--color-bg-surface)',
            cursor: 'pointer', fontSize: '0.875rem',
          }}
        >
          <span style={{
            width: '2rem', height: '1.125rem', borderRadius: '999px',
            background: punkteVergeben ? 'var(--color-accent)' : 'var(--color-border)',
            position: 'relative', transition: 'background 0.15s ease',
          }}>
            <span style={{
              position: 'absolute', top: 2,
              left: punkteVergeben ? 'calc(100% - 1rem - 2px)' : 2,
              width: '0.875rem', height: '0.875rem', borderRadius: '50%',
              background: 'white', transition: 'left 0.15s ease',
            }} />
          </span>
          {punkteVergeben ? 'Punkte vergeben' : 'Ohne Punkte'}
        </button>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.375rem 0 0' }}>
          Aus = einfache Übung ohne Punkteangaben (z. B. Schulübung), wie aus dem Schulbuch.
        </p>
      </section>

      {/* Dauer & Schwierigkeit & Punkte */}
      <section style={{ marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Dauer (Min, opt.)</label>
          <input
            type="number"
            min={1}
            value={dauerMinuten}
            onChange={(e) => setDauerMinuten(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="~50"
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Schwierigkeit
            <InfoDot text="Steuert das Denkniveau innerhalb der Aufgabentypen: leicht = Wiedergeben/Verstehen, mittel = Anwenden/Analysieren, schwer = Bewerten/eigene Texte. In Fremdsprachen: ≈ A2 / B1 / B2." />
          </label>
          <select
            value={schwierigkeit}
            onChange={(e) => setSchwierigkeit(e.target.value as NonNullable<Auftrag['schwierigkeit']>)}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
              background: 'var(--color-bg-surface)',
            }}
          >
            {SCHWIERIGKEITEN.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div style={{ opacity: punkteVergeben ? 1 : 0.45 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Punkte (opt.)</label>
          <input
            type="number"
            min={1}
            value={punkteVergeben ? gesamtpunkteZiel : ''}
            disabled={!punkteVergeben}
            onChange={(e) => setGesamtpunkteZiel(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={punkteVergeben ? '~48' : 'ohne Punkte'}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
            }}
          />
        </div>
      </section>

      {/* Optionale Aufgabenarten */}
      <section style={{ marginBottom: '1.25rem' }}>
        <SectionLabel hint="Wenn du nichts auswählst, entscheidet die App anhand des Typ-Profils.">
          Gewünschte Aufgabenarten (optional)
        </SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {BLOCK_TYPE_DEFS.map((bt) => {
            const aktiv = gewuenschteAufgabenarten.includes(bt.id);
            const isDiscouraged = (SCHWIERIGKEIT_RULES[schwierigkeit].discouraged as readonly string[]).includes(bt.id);
            return (
              <button
                key={bt.id}
                className="tile"
                aria-pressed={aktiv}
                onClick={() => toggleAufgabenart(bt.id)}
                title={isDiscouraged ? SCHWIERIGKEIT_RULES[schwierigkeit].hinweis : undefined}
                style={{
                  width: 'auto',
                  padding: '0.375rem 0.75rem',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.8125rem',
                  opacity: isDiscouraged && !aktiv ? 0.6 : 1,
                  ...(isDiscouraged && !aktiv ? { borderStyle: 'dashed', borderColor: 'var(--color-text-secondary)' } : {}),
                }}
              >
                <bt.Icon size={15} style={{ color: bt.color, opacity: isDiscouraged && !aktiv ? 0.5 : 1 }} />
                <span>{bt.label}</span>
                {isDiscouraged && !aktiv && (
                  <AlertTriangle size={13} aria-label="Hinweis" style={{ color: 'var(--color-warning, #f59e0b)' }} />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Lernziele */}
      <section style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          Lernziele (optional)
        </label>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem' }}>
          Kommagetrennt, z. B. "Hauptgedanke erfassen, Stilmittel erkennen"
        </p>
        <input
          type="text"
          value={lernzieleRaw}
          onChange={(e) => setLernzieleRaw(e.target.value)}
          placeholder="Hauptgedanke erfassen, Stilmittel erkennen ..."
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            fontSize: '0.875rem',
          }}
        />
      </section>

      {/* Notizen */}
      <section style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Notizen (optional)</label>
        <textarea
          value={notizen}
          onChange={(e) => setNotizen(e.target.value)}
          placeholder="Besondere Wünsche, Hinweise, Schwerpunkte ..."
          rows={3}
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            fontSize: '0.875rem',
            resize: 'vertical',
          }}
        />
      </section>

      {/* Zusammenfassung */}
      <div style={{
        padding: '1rem',
        background: 'var(--color-bg-hover)',
        borderRadius: 'var(--radius)',
        marginBottom: '1.25rem',
        fontSize: '0.875rem',
      }}>
        <strong>Vorschau:</strong>{' '}
        {UNTERLAGENTYPEN.find((u) => u.id === typ)?.label} · {fachLabelCurrent} · {stufeLabel}
        {thema ? ` · „${thema}"` : ''}
        {klasse ? ` · ${klasse}` : ''}
      </div>

      {/* Haupt-Aktion */}
      <button
        onClick={handleErstellen}
        style={{
          width: '100%',
          padding: '0.875rem',
          borderRadius: 'var(--radius)',
          border: 'none',
          background: 'var(--color-accent)',
          color: 'white',
          fontWeight: 700,
          fontSize: '1rem',
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
        }}
      >
        Skelett erstellen und fortfahren <ArrowRight size={17} />
      </button>
    </div>
  );
}

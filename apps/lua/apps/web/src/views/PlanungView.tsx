import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, CalendarCheck, CalendarPlus, Check, ChevronLeft, ChevronRight, FileText,
  FolderOpen, Info, Link2, Package, Paperclip, Pencil, Plus, Repeat, Sparkles, Trash2, Unlink, X,
} from 'lucide-react';
import { ViewShell } from './_ViewShell';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  usePlanung, type EinsatzInput, type EinplanErgebnis, type FerienEintrag, type PauseEintrag,
  type RasterSlotInput, type StundenMaterialRecord,
} from '../hooks/usePlanung';
import { useKlassenMeta } from '../hooks/useKlassenMeta';
import { loadTeacherProfile, type ProfileLand } from '../lib/profile';
import {
  fachPruefen, fehlendeAngaben, kontextAusStunde, type TerminKontext,
} from '../lib/unterlageBauen';
import {
  bundeslandName, ferienBestandVorschlag, ferienWarnung, schuljahrFuer, schuljahrLabel,
} from '../lib/ferien';
import { ferienTerminQuelle } from '../lib/ferienTermine';
import {
  datumNumerisch, heuteIso, istIsoDatum, istWochenende, plusTage, wochenStart, WOCHENTAGE_KURZ, WOCHENTAGE_LANG,
  type IsoDatum,
} from '../lib/lokalDatum';
import {
  gruppiereNachTag, istDieseWoche, monatLabel, naechsteStunden,
  relativTagesueberschrift, schuljahrVorkommen, schuljahrZeitraum, sortiereStunden,
  stundenInZeitraum, tageImZeitraum, zeitSpanne, zeitraumBeschriftung, zeitraumNormalisieren,
  zeitraumVerschieben, rasterVorkommen,
  type GeplanteStunde, type KalenderRahmen, type RasterSlot, type Tageszelle, type ZeitraumModus,
} from '../lib/stundenMappen';
import { farbListeAusKlassen, klasseFarbStil } from '../lib/klassenFarben';
import { alsRasterSlots, alsStunden } from '../lib/planungAdapter';
import { ZeitFeld } from '../components/ui/ZeitFeld';
import { DatumFeld } from '../components/ui/DatumFeld';

const MATERIAL_LABEL: Record<string, string> = {
  ablage: 'In LUA abgelegt',
  material: 'Unterlage aus LUA',
  verweis: 'Verweis',
};

/** Was die drei Anlagearten tauglich machen – für den Hinweis unter der Liste. */
const ART_HINWEIS: Record<string, string> = {
  ablage: 'Datei: LUA legt eine Kopie im eigenen Ordner ab – sie ist auch dann da, wenn du das Original verschiebst.',
  material: 'Unterlage: öffnet sich in LUA. Zum Drucken oder Weitergeben trotzdem exportieren.',
  verweis: 'Verweis: nur ein Pfad oder eine Adresse. Verschiebt sich die Datei, findet LUA sie nicht mehr.',
};

const STAATUS: Array<{ wert: string; label: string }> = [
  { wert: 'geplant', label: 'Geplant' },
  { wert: 'vorbereitet', label: 'Vorbereitet' },
  { wert: 'eingesetzt', label: 'Gehalten' },
];

/** Was `woche_einplanen` und `schuljahr_einplanen` in Rust anlegen bzw. was der
 *  Rust-Upsert akzeptiert. „Entfallen" ist bewusst eine Einsatzart und kein
 *  Status – ein Status "verworfen" existiert in der Datenbank nicht. */
const ART_ENTFALLEN = 'ausgefallen';
const ART_GEPLANT = 'nur_geplant';

/** Formularwerte für eine einmalige Stunde. */
interface EinzelStunde {
  datum: string;
  klasseId: string;
  startZeit: string;
  endeZeit: string;
  thema: string;
}

/** Schuljahre rund um das jetzige – Vorjahr, aktuelles, zwei voraus. */
const SCHULJAHR_SPANNE = 3;

export function PlanungView({
  onGenerateUnterlage,
  startTag,
}: {
  /** Baut aus der gewählten Stunde eine Unterlage, speichert sie und hängt sie
   *  an den Termin. Fehlt dem Termin das Thema oder das Fach der Klasse, öffnet
   *  `App.tsx` stattdessen den Assistenten mit Vorbefüllung. */
  onGenerateUnterlage?: (kontext: TerminKontext, einsatzId: string, onFertig?: (meldung: string) => void) => Promise<void>;
  /** Tag, auf den beim Öffnen gesprungen werden soll – von der Startseite aus
   *  angeklickt. Springt in die Woche dieses Tages und wählt die Tageskarte. */
  startTag?: string | null;
} = {}) {
  const planung = usePlanung();
  const { klassen, upsert: klasseSpeichern } = useKlassenMeta();

  const [land, setLand] = useState<ProfileLand>('AT');
  const [region, setRegion] = useState<string>('');
  const [modus, setModus] = useState<ZeitraumModus>('woche');
  const [anker, setAnker] = useState<IsoDatum>(() => wochenStart(heuteIso()));
  const [gewaehltId, setGewaehltId] = useState<string | null>(null);
  const [anlagen, setAnlagen] = useState<StundenMaterialRecord[]>([]);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [rasterOffen, setRasterOffen] = useState(false);
  const [neuerSlot, setNeuerSlot] = useState<RasterSlotInput | null>(null);
  const [verweis, setVerweis] = useState('');
  const [ferienOffen, setFerienOffen] = useState(false);
  const [jahresplanungOffen, setJahresplanungOffen] = useState(false);
  const [freiUeberspringen, setFreiUeberspringen] = useState(true);
  /** Formular für eine einmalige Stunde (Vertretung, Einzelsehre). */
  const [einzelOffen, setEinzelOffen] = useState(false);
  const [einzel, setEinzel] = useState<EinzelStunde>({
    datum: heuteIso(), klasseId: '', startZeit: '08:00', endeZeit: '08:45', thema: '',
  });

  /** Legt genau eine Stunde an – ohne Rasterzeile, für einen bestimmten Tag.
   *
   *  Für die Vertretung: Die Lehrkraft übernimmt an einem Tag eine Klasse, für
   *  die es keine feste Rasterzeile gibt. `rasterId` bleibt `null`, damit die
   *  Stunde nicht beim nächsten Einplanen erneut materialisiert wird und
   *  sichtbar als einzelne bleibt. */
  const einzelAnlegen = useCallback(async () => {
    const klasse = klassen.find(k => k.id === einzel.klasseId);
    if (!klasse?.id) { setMeldung('Bitte wähle eine Klasse.'); return; }
    if (!einzel.datum) { setMeldung('Bitte wähle ein Datum.'); return; }
    const gespeichert = await planung.speichereStunde({
      klasseId: klasse.id,
      klasseNameSnapshot: klasse.name,
      titelSnapshot: einzel.thema.trim(),
      geplantAm: einzel.datum,
      startZeit: einzel.startZeit || null,
      endeZeit: einzel.endeZeit || null,
      rasterId: null,
      status: 'geplant',
      einsatzArt: 'nur_geplant',
    });
    if (!gespeichert) return;
    // In der Woche des Termins anzeigen – sonst legt die Lehrkraft die Stunde
    // an und sieht sie nicht.
    setModus('woche');
    setAnker(wochenStart(einzel.datum));
    setGewaehltId(gespeichert.id);
    setEinzel({ ...einzel, thema: '' });
    setEinzelOffen(false);
    setMeldung(`Stunde für ${klasse.name} am ${datumNumerisch(einzel.datum)} angelegt.`);
  }, [einzel, klassen, planung.speichereStunde]);

  const schuljahr = planung.schuljahr;
  /** Das Schuljahr, in dem wir gerade stehen – nicht das gerade betrachtete. */
  const aktuellesSchuljahr = useMemo(() => schuljahrFuer(heuteIso()), []);
  const slots = useMemo(() => alsRasterSlots(planung.raster), [planung.raster]);
  const stunden = useMemo(() => alsStunden(planung.stunden), [planung.stunden]);
  /** Nur die Slots des betrachteten Schuljahres.
   *
   *  Slots **ohne** Schuljahr sind Altbestand aus der Zeit vor dem
   *  Schuljahresbezug. Sie erscheinen nur im laufenden Schuljahr und nicht in
   *  jedem – sonst tauchen sie beim Blättern durch die Jahre mehrfach auf und
   *  man kann sie keinem Jahr zuordnen. */
  const slotsDesJahres = useMemo(
    () => slots.filter(s => s.schuljahr === schuljahr
      || (s.schuljahr === null && schuljahr === aktuellesSchuljahr)),
    [slots, schuljahr, aktuellesSchuljahr],
  );

  const rahmen: KalenderRahmen = useMemo(
    () => ({ land, region, ferien: planung.ferien, pausen: planung.pausen }),
    [land, region, planung.ferien, planung.pausen],
  );

  useEffect(() => {
    void loadTeacherProfile().then(p => {
      if (!p) return;
      setLand(p.land);
      setRegion(p.land === 'AT' ? p.regionAt : p.land === 'DE' ? p.regionDe : p.regionCh);
    });
  }, []);


  /** Name → Farbslot, damit Klassen ohne hinterlegte Farbe trotzdem farblich
   *  stabil bleiben und nicht bei jedem Neuladen wechseln. */
  const farbListe = useMemo(() => farbListeAusKlassen(klassen), [klassen]);

  const klasseStil = useCallback(
    (name: string) => klasseFarbStil(
      klassen.find(k => k.name === name)?.farbe, name, farbListe,
    ),
    [klassen, farbListe],
  );

  // Auswahl halten: nach dem Neuladen auf die erste anstehende Stunde, sonst auf
  // die erste der gerade betrachteten Woche.
  useEffect(() => {
    if (gewaehltId && stunden.some(s => s.id === gewaehltId)) return;
    setGewaehltId(
      naechsteStunden(stunden, heuteIso(), 1)[0]?.id
      ?? stunden.find(s => s.datum === wochenStart(anker))?.id
      ?? null,
    );
  }, [stunden, gewaehltId, anker]);

  const gewaehlt = useMemo(() => stunden.find(s => s.id === gewaehltId) ?? null, [stunden, gewaehltId]);

  /** Sprung von der Startseite: zeigt die Woche des angeklickten Tages.
   *
   *  Bewusst ein Sprung pro Tag: die Stunden kommen asynchron nach, das Merkmal
   *  verhindert, dass jeder neue Ladevorgang den Anker erneut setzt und die
   *  Lehrkraft aus ihrer Auswahl wirft. */
  const gesprungenerTag = useRef<string | null>(null);
  useEffect(() => {
    if (!startTag || !istIsoDatum(startTag)) return;
    if (gesprungenerTag.current === startTag) return;
    gesprungenerTag.current = startTag;
    setModus('woche');
    setAnker(wochenStart(startTag));
    // Hat der Tag Stunden, die erste davon auswählen – sonst bleibt die
    // Auswahl, die schon offen war.
    const amTag = stunden.find(s => s.datum === startTag);
    if (amTag) setGewaehltId(amTag.id);
  }, [startTag, stunden]);

  useEffect(() => {
    if (!gewaehltId) { setAnlagen([]); return; }
    let aktiv = true;
    void planung.materialien(gewaehltId).then(liste => { if (aktiv) setAnlagen(liste); });
    return () => { aktiv = false; };
  }, [gewaehltId, planung.materialien, planung.stunden]);

  const tage: Tageszelle[] = useMemo(
    () => tageImZeitraum(modus, anker, slotsDesJahres, stunden, rahmen, schuljahr),
    [modus, anker, slotsDesJahres, stunden, rahmen, schuljahr],
  );
  const stundenImZeitraum = useMemo(() => sortiereStunden(tage.flatMap(t => t.stunden)), [tage]);
  const anzahlImZeitraum = useMemo(() => stundenInZeitraum(tage), [tage]);
  const anstehende = useMemo(() => naechsteStunden(stunden, heuteIso(), 12), [stunden]);
  const gruppen = useMemo(() => gruppiereNachTag(anstehende, rahmen), [anstehende, rahmen]);
  const ohneUnterlagen = useMemo(
    () => anstehende.filter(s => s.anzahlMaterialien === 0).length, [anstehende],
  );
  /** Ein einziger Ferienhinweis. `ferienWarnung` unterscheidet danach, ob LUA
   *  amtliche Termine anbietet (gelber Balken) oder ob für das Schuljahr gar
   *  keine vorliegen bzw. das Land keine führt (stille Zeile). */
  const ferienHinweis = useMemo(
    () => ferienWarnung(schuljahr, land, region, planung.ferien),
    [schuljahr, land, region, planung.ferien],
  );

  // ── Aktionen ───────────────────────────────────────────────────────────────

  const zeitraumWechseln = useCallback((richtung: -1 | 1) => {
    setAnker(a => zeitraumVerschieben(modus, a, richtung));
  }, [modus]);

  const zeitraumZuruecksetzen = useCallback(() => {
    setAnker(a => zeitraumNormalisieren(modus, a));
  }, [modus]);

  const modusWechseln = useCallback((neu: ZeitraumModus) => {
    setModus(neu);
    setAnker(a => zeitraumNormalisieren(neu, a));
  }, []);

  const schuljahrWechseln = useCallback((jahr: number) => {
    planung.wechsleSchuljahr(jahr);
    const zeitraum = schuljahrZeitraum(jahr);
    // Mitten im Schuljahr starten wir sonst im September, nicht dort, wo der
    // Betrachter gerade hinschaut.
    setAnker(a => (a >= zeitraum.von && a <= zeitraum.bis ? a : heuteIso()));
  }, [planung]);

  /** Ein Klick auf einen Tag im Monatsraster: in die Woche dieses Tages wechseln
   *  und den Tag auswählen. Ohne die Auswahl landet man in der richtigen Woche,
   *  aber weiterhin bei einer Stunde aus einer ganz anderen Woche. */
  const tagOeffnen = useCallback((datum: IsoDatum, stundenDesTages: GeplanteStunde[]) => {
    setModus('woche');
    setAnker(wochenStart(datum));
    const erste = sortiereStunden(stundenDesTages)[0];
    if (erste) setGewaehltId(erste.id);
    setMeldung(null);
  }, []);

  const planText = useCallback((
    vorkommen: Array<{ schulfrei: { bezeichnung: string } | null }>,
    ergebnis: EinplanErgebnis | null,
  ) => {
    if (!ergebnis) return;
    const teile = [`${ergebnis.angelegt.length} ${ergebnis.angelegt.length === 1 ? 'Stunde' : 'Stunden'} angelegt.`];
    if (ergebnis.uebersprungen.length > 0) {
      teile.push(`${ergebnis.uebersprungen.length} war${ergebnis.uebersprungen.length === 1 ? '' : 'en'} schon geplant.`);
    }
    const frei = vorkommen.filter(v => v.schulfrei).length;
    if (frei > 0) {
      teile.push(freiUeberspringen
        ? `${frei} in Ferien oder auf einem Feiertag wurden ausgelassen.`
        : `${frei} liegen in Ferien oder auf einem Feiertag.`);
    }
    if (ergebnis.ohneKlasse > 0) {
      // Rust entscheidet das, nicht die Oberfläche: eine Rasterzeile ohne Klasse
      // bleibt im Raster, erzeugt aber keine Stunde. Sonst stünde „ohne Klasse"
      // im Kalender.
      teile.push(
        `${ergebnis.ohneKlasse} Raster${ergebnis.ohneKlasse === 1 ? 'zeile' : 'zeilen'} ohne Klasse `
        + 'wurde nicht eingeplant.',
      );
    }
    setMeldung(teile.join(' '));
  }, [freiUeberspringen]);

  const wocheEinplanen = useCallback(async () => {
    const vorkommen = rasterVorkommen(slotsDesJahres, wochenStart(anker), rahmen, schuljahr);
    if (vorkommen.length === 0) {
      setMeldung('Für diese Woche gibt es im Raster nichts zu planen.');
      return;
    }
    const gewaehltVorkommen = freiUeberspringen
      ? vorkommen.filter(v => !v.schulfrei)
      : vorkommen;
    if (gewaehltVorkommen.length === 0) {
      setMeldung('Diese Woche liegt ganz in Ferien.');
      return;
    }
    const ergebnis = await planung.plane(
      gewaehltVorkommen.map(v => ({ rasterId: v.slot.id, datum: v.datum })),
    );
    planText(vorkommen, ergebnis);
  }, [slotsDesJahres, anker, rahmen, schuljahr, freiUeberspringen, planung, planText]);

  const zeitraumEinplanen = useCallback(async () => {
    const von = modus === 'woche' ? wochenStart(anker) : `${anker.slice(0, 7)}-01`;
    const bis = modus === 'woche' ? plusTage(von, 6) : plusTage(`${anker.slice(0, 4)}-${String(Number(anker.slice(5, 7)) + 1).padStart(2, '0')}-01`, -1);
    const vorkommen = schuljahrVorkommen(slotsDesJahres, von, bis, rahmen, schuljahr);
    if (vorkommen.length === 0) {
      setMeldung('Für diesen Zeitraum gibt es im Raster nichts zu planen.');
      return;
    }
    const gewaehltVorkommen = freiUeberspringen ? vorkommen.filter(v => !v.schulfrei) : vorkommen;
    if (gewaehltVorkommen.length === 0) {
      setMeldung('Dieser Zeitraum liegt ganz in Ferien.');
      return;
    }
    const ergebnis = await planung.plane(
      gewaehltVorkommen.map(v => ({ rasterId: v.slot.id, datum: v.datum })),
    );
    planText(vorkommen, ergebnis);
  }, [modus, anker, slotsDesJahres, rahmen, schuljahr, freiUeberspringen, planung, planText]);

  const schuljahrEinplanen = useCallback(async () => {
    const zeitraum = schuljahrZeitraum(schuljahr);
    const vorkommen = schuljahrVorkommen(slotsDesJahres, zeitraum.von, zeitraum.bis, rahmen, schuljahr);
    if (vorkommen.length === 0) {
      setMeldung('Im Raster gibt es für dieses Schuljahr nichts zu planen.');
      return;
    }
    const gewaehltVorkommen = freiUeberspringen ? vorkommen.filter(v => !v.schulfrei) : vorkommen;
    if (!window.confirm(
      `Das plant ${gewaehltVorkommen.length} Stunden für das ganze Schuljahr ${schuljahrLabel(schuljahr)}. `
      + 'Bereits geplante Stunden bleiben unangetastet. Fortfahren?',
    )) return;
    const ergebnis = await planung.plane(
      gewaehltVorkommen.map(v => ({ rasterId: v.slot.id, datum: v.datum })),
    );
    planText(vorkommen, ergebnis);
  }, [slotsDesJahres, schuljahr, rahmen, freiUeberspringen, planung, planText]);

  const rasterAusVorjahr = useCallback(async () => {
    const anzahl = await planung.uebernehmeRaster(schuljahr - 1, schuljahr);
    if (anzahl === null) return;
    setMeldung(anzahl === 0
      ? `Im Schuljahr ${schuljahrLabel(schuljahr - 1)} gibt es kein Raster zum Übernehmen.`
      : `${anzahl} Stunden aus ${schuljahrLabel(schuljahr - 1)} übernommen – die Klassen prüfen.`);
  }, [planung, schuljahr]);


  const klasseFarbeSetzen = useCallback(async (name: string, slot: number | null) => {
    const klasse = klassen.find(k => k.name === name);
    if (!klasse) return;
    await klasseSpeichern({ ...klasse, farbe: slot === null ? null : String(slot) });
  }, [klassen, klasseSpeichern]);

  /** Speichert die Stunde, ohne die übrigen Felder zu verlieren: Rust macht beim
   *  Upsert ein vollständiges SET, deshalb schicken wir alles mit. */
  const stundeAendern = useCallback((aenderung: EinsatzInput) => {
    if (!gewaehlt) return;
    void planung.speichereStunde({
      id: gewaehlt.id,
      klasseId: gewaehlt.klasseId,
      klasseNameSnapshot: gewaehlt.klasseName,
      titelSnapshot: gewaehlt.titel,
      notiz: gewaehlt.notiz,
      geplantAm: gewaehlt.datum,
      startZeit: gewaehlt.startZeit,
      endeZeit: gewaehlt.endeZeit,
      rasterId: gewaehlt.rasterId,
      ...aenderung,
    });
  }, [gewaehlt, planung]);

  /** Vertretung: die Stunde wandert auf einen anderen Tag. */
  const stundeVerschieben = useCallback((zielDatum: IsoDatum) => {
    if (!gewaehlt) return;
    stundeAendern({ geplantAm: zielDatum });
    setMeldung(`Verschoben auf ${relativTagesueberschrift(zielDatum)}.`);
  }, [gewaehlt, stundeAendern]);

  const dateiAblegen = useCallback(async () => {
    if (!gewaehlt) return;
    const { open } = await import('@tauri-apps/plugin-dialog');
    const pfad = await open({ multiple: false, title: 'Unterlage für diese Stunde auswählen' });
    if (typeof pfad !== 'string') return;
    const neu = await planung.fuegeAnlageHinzu({ einsatzId: gewaehlt.id, art: 'ablage', quellePfad: pfad });
    if (neu) setMeldung(`„${neu.label}" liegt jetzt in der Ablage von LUA.`);
  }, [gewaehlt, planung]);

  /** Aus der Stunde eine volle Unterlage bauen. Ersetzt die frühere Auswahl
   *  „bestehende Unterlage aus LUA" + „Anlegen": dort musste man erst eine
   *  Unterlage suchen, die dann verknüpft wurde - jetzt entsteht sie aus dem
   *  Termin heraus. Fehlt dem Termin das Thema oder das Fach der Klasse, öffnet
   *  `App.tsx` den Assistenten mit Vorbefüllung. */
  const unterlageErzeugen = useCallback(async () => {
    if (!gewaehlt || !onGenerateUnterlage) return;
    const klasse = klassen.find(k => k.name === gewaehlt.klasseName);
    const kontext = kontextAusStunde(gewaehlt, {
      schulstufe: klasse?.schulstufe ?? undefined,
      // `lua_klassen.fach` ist freier Text; erst das Schema macht daraus ein Fach.
      fach: fachPruefen(klasse?.fach),
      // Aus dem Lehrerprofil, nicht aus der Klasse: `lua_klassen.land` ist bei
      // älteren Datensätzen leer. Ohne Land fiele die Unterstufen-/Oberstufen-
      // Grenze auf den österreichischen Wert zurück.
      land,
    });
    const fehlt = fehlendeAngaben(kontext);
    if (fehlt.length > 0) {
      const was = fehlt.map(f => f === 'thema' ? 'ein Thema' : 'das Fach der Klasse').join(' und ');
      if (!window.confirm(
        `Für die Stunde fehlt ${was}. LUA öffnet den Assistenten, damit du es einträgst – `
        + 'die Unterlage wird dann nicht automatisch gespeichert. Fortfahren?'
      )) return;
    }
    setMeldung('Unterlage wird erstellt … das kann einen Moment dauern.');
    await onGenerateUnterlage(kontext, gewaehlt.id, setMeldung);
  }, [gewaehlt, klassen, land, onGenerateUnterlage]);

  const verweisAnlegen = useCallback(async () => {
    if (!gewaehlt || !verweis.trim()) return;
    const neu = await planung.fuegeAnlageHinzu({ einsatzId: gewaehlt.id, art: 'verweis', ziel: verweis.trim() });
    if (neu) { setVerweis(''); setMeldung(null); }
  }, [gewaehlt, verweis, planung]);

  const anlageOeffnen = useCallback(async (anlage: StundenMaterialRecord) => {
    const ziel = anlage.ablagePfad ?? anlage.ziel;
    if (!ziel) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('show_in_folder', { path: ziel });
    } catch {
      setMeldung('Der Ordner konnte nicht geöffnet werden.');
    }
  }, []);

  const ablageOeffnen = useCallback(async () => {
    const p = await planung.ablageOrdner();
    if (!p) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('show_in_folder', { path: p });
    } catch { setMeldung('Der Ablage-Ordner konnte nicht geöffnet werden.'); }
  }, [planung]);

  const ferienListe = useMemo(
    () => planung.ferien
      .filter(f => f.schuljahr === null || f.schuljahr === schuljahr)
      .filter(f => !region || !f.region || f.region === region)
      .sort((a, b) => a.von.localeCompare(b.von)),
    [planung.ferien, schuljahr, region],
  );

  const pauseListe = useMemo(
    () => planung.pausen
      .filter(p => p.schuljahr === null || p.schuljahr === schuljahr)
      .sort((a, b) => a.datum.localeCompare(b.datum)),
    [planung.pausen, schuljahr],
  );

  /** Klassen für die Pausenzuweisung: aus der Klassenverwaltung, ergänzt um die
   *  Namen, die im Raster oder in geplanten Stunden vorkommen. */
  const klassenNamen = useMemo(() => {
    const namen = new Set<string>();
    for (const k of klassen) if (!k.archiviert) namen.add(k.name);
    for (const s of slots) if (s.klasseName) namen.add(s.klasseName);
    for (const s of stunden) if (s.klasseName) namen.add(s.klasseName);
    return [...namen].sort();
  }, [klassen, slots, stunden]);

  const jahre = useMemo(() => {
    const jetzt = planung.schuljahr;
    const liste: number[] = [];
    for (let j = jetzt - 1; j <= jetzt + SCHULJAHR_SPANNE; j++) liste.push(j);
    return liste;
  }, [planung.schuljahr]);

  // ── Oberfläche ──────────────────────────────────────────────────────────────

  const stundenKachel = (s: GeplanteStunde, zellen: Tageszelle[]) => {
    const aktiv = s.id === gewaehltId;
    const zelle = zellen.find(z => z.datum === s.datum);
    const entfallen = s.einsatzArt === ART_ENTFALLEN;
    return (
      <button
        key={s.id}
        type="button"
        className={`stunde${aktiv ? ' stunde-ist-aktiv' : ''}${zelle?.schulfrei ? ' stunde-ist-frei' : ''}${entfallen ? ' stunde-ist-ausgefallen' : ''}`}
        style={{ ...(s.klasseName ? klasseStil(s.klasseName) : undefined) }}
        onClick={() => { setGewaehltId(s.id); setMeldung(null); }}
        aria-current={aktiv ? 'true' : undefined}
      >
        <span className="stunde-zeile">
          <span className="stunde-zeit">{zeitSpanne(s.startZeit, s.endeZeit)}</span>
          <span className="stunde-klasse">{s.klasseName || 'ohne Klasse'}</span>
          {s.status === 'vorbereitet' && <span className="stunde-abzeichen"><Check size={11} /> vorbereitet</span>}
          {s.status === 'eingesetzt' && <span className="stunde-abzeichen">gehalten</span>}
          {entfallen && <span className="stunde-abzeichen stunde-abzeichen-warnung">entfällt</span>}
        </span>
        <span className="stunde-titel">{s.titel || 'Unterricht'}</span>
        <span className="stunde-hinweis">
          {/* Nur noch ein Symbol statt des ausgeschriebenen Textes. Stand der
              Hinweis auf elf von zwölf Karten, war er Normalzustand und damit
              blind. Die Zahl steht in der Zeile über der Liste. */}
          {s.anzahlMaterialien > 0
            ? <span className="stunde-anlage" title={`${s.anzahlMaterialien} ${s.anzahlMaterialien === 1 ? 'Unterlage' : 'Unterlagen'}`}><Paperclip size={12} /> {s.anzahlMaterialien}</span>
            : <span className="stunde-anlage stunde-anlage-fehlt" title="Noch keine Unterlage"><AlertTriangle size={12} /></span>}
        </span>
      </button>
    );
  };

  return (
    <ViewShell
      title="Unterrichtsplanung"
      description="Deine Wochenstunden und alles, was du für die nächste Stunde brauchst."
      maxWidth={1200}
      action={planung.loading ? <LoadingSpinner text="Lade Planung …" /> : undefined}
    >
      {planung.error && (
        <p role="alert" style={{ margin: '0 0 1rem', padding: '.5rem .75rem', fontSize: '.8125rem', color: 'var(--color-error)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius)' }}>
          {planung.error}
        </p>
      )}

      <div className="planung-werkzeugleiste">
        <button className="btn-secondary" onClick={() => zeitraumWechseln(-1)} title={modus === 'woche' ? 'Vorherige Woche' : 'Vorheriger Monat'} aria-label="Zurück" style={{ padding: '.3rem .45rem' }}>
          <ChevronLeft size={14} />
        </button>
        <strong style={{ fontSize: '.8125rem', minWidth: '13rem' }}>{zeitraumBeschriftung(modus, anker)}</strong>
        <button className="btn-secondary" onClick={() => zeitraumWechseln(1)} title={modus === 'woche' ? 'Nächste Woche' : 'Nächster Monat'} aria-label="Weiter" style={{ padding: '.3rem .45rem' }}>
          <ChevronRight size={14} />
        </button>
        <div role="group" aria-label="Ansicht" className="planung-umschalter">
          <button
            className={modus === 'woche' ? 'planung-umschalter-ist-an' : ''}
            onClick={() => modusWechseln('woche')}
            aria-pressed={modus === 'woche'}
            style={{ fontSize: '.75rem' }}
          >
            Woche
          </button>
          <button
            className={modus === 'monat' ? 'planung-umschalter-ist-an' : ''}
            onClick={() => modusWechseln('monat')}
            aria-pressed={modus === 'monat'}
            style={{ fontSize: '.75rem' }}
          >
            Monat
          </button>
        </div>
        <label className="planung-jahreswahl">
          <span>Schuljahr</span>
          <select value={schuljahr} onChange={e => schuljahrWechseln(Number(e.target.value))}>
            {jahre.map(j => <option key={j} value={j}>{schuljahrLabel(j)}</option>)}
          </select>
        </label>
        {(modus === 'woche' ? !istDieseWoche(anker, heuteIso()) : anker.slice(0, 7) !== heuteIso().slice(0, 7)) && (
          <button className="btn-secondary" onClick={zeitraumZuruecksetzen} style={{ fontSize: '.75rem' }}>
            {modus === 'woche' ? 'Diese Woche' : 'Dieser Monat'}
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button
          className="btn-secondary"
          onClick={() => setEinzelOffen(v => !v)}
          aria-expanded={einzelOffen}
          title="Eine einzelne Stunde für einen Tag anlegen – zum Beispiel wenn du eine Klasse vertrittst"
          style={{ fontSize: '.75rem', display: 'inline-flex', alignItems: 'center', gap: '.375rem' }}
        >
          <Plus size={14} /> Stunde hinzufügen
        </button>
        {/* Steht beim Knopf, auf den es sich auswirkt. Vorher lag die Option
            unter der Liste aller Stunden, wer tausend Pixel weiter unten. */}
        <label className="planung-auslassen">
          <input
            type="checkbox"
            checked={freiUeberspringen}
            onChange={e => setFreiUeberspringen(e.target.checked)}
          />
          Ferien auslassen
        </label>
        <button
          className="btn-primary"
          onClick={() => void (modus === 'woche' ? wocheEinplanen() : zeitraumEinplanen())}
          style={{ fontSize: '.75rem', display: 'inline-flex', alignItems: 'center', gap: '.375rem' }}
        >
          <CalendarPlus size={14} /> {modus === 'woche' ? 'Woche einplanen' : 'Monat einplanen'}
        </button>
      </div>

      {einzelOffen && (
        <div className="planung-abschnitt" style={{ marginTop: '.5rem' }}>
          <strong style={{ fontSize: '.8125rem' }}>Einzelne Stunde anlegen</strong>
          <p style={{ fontSize: '.6875rem', color: 'var(--color-text-secondary)', margin: '.25rem 0 .5rem', lineHeight: 1.5 }}>
            Für einen bestimmten Tag, ohne eigene Zeile im Wochenraster – etwa wenn du
            eine Klasse vertrittst. Beim nächsten Einplanen bleibt sie unberührt.
          </p>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <DatumFeld
              label="Datum"
              wert={einzel.datum || null}
              onChange={(iso) => setEinzel({ ...einzel, datum: iso ?? '' })}
            />
            <label className="planung-feld" style={{ flex: '1 1 8rem' }}>
              Klasse
              <select
                value={einzel.klasseId}
                onChange={e => setEinzel({ ...einzel, klasseId: e.target.value })}
              >
                <option value="">— Klasse wählen —</option>
                {klassen.filter(k => !k.archiviert && k.id)
                  .map(k => <option key={k.id!} value={k.id!}>{k.name}</option>)}
              </select>
            </label>
            <ZeitFeld
              label="von"
              wert={einzel.startZeit}
              allowEmpty={false}
              onChange={(wert) => setEinzel({ ...einzel, startZeit: wert })}
            />
            <ZeitFeld
              label="bis"
              wert={einzel.endeZeit}
              allowEmpty={false}
              onChange={(wert) => setEinzel({ ...einzel, endeZeit: wert })}
            />
            <label className="planung-feld" style={{ flex: '2 1 12rem' }}>
              Thema (optional)
              <input
                value={einzel.thema}
                placeholder="Worum geht es?"
                onChange={e => setEinzel({ ...einzel, thema: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') void einzelAnlegen(); }}
              />
            </label>
            <button
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
              onClick={() => void einzelAnlegen()}
            >
              <Plus size={13} /> Anlegen
            </button>
            <button
              className="btn-secondary"
              onClick={() => setEinzelOffen(false)}
              aria-label="Formular schließen"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {ferienHinweis && (
        ferienHinweis.art === 'warnung' ? (
          <p className="planung-hinweis">
            <AlertTriangle size={13} />
            {ferienHinweis.text}
            <button className="btn-secondary" onClick={() => setFerienOffen(true)} style={{ fontSize: '.6875rem' }}>
              Jetzt erfassen
            </button>
          </p>
        ) : (
          // Kein Alarm: LUA kann hier nichts anbieten. Eine gelbe Warnung würde
          // eine Schuld suggerieren, die es nicht gibt.
          <p className="planung-notiz">
            <Info size={13} />
            {ferienHinweis.text}
            <button className="btn-secondary" onClick={() => setFerienOffen(true)} style={{ fontSize: '.6875rem' }}>
              Ferien eintragen
            </button>
          </p>
        )
      )}

      {modus === 'woche' ? (
        /* Die Wochenkarte zeigt ausschließlich das Raster - also die feste Form
           der Woche. Die geplanten Stunden stehen in der Liste darunter; sie hier
           noch einmal zu zeigen war doppelt und machte die beiden Dinge schwer
           unterscheidbar. Die Zahl rechts oben sagt, ob an dem Tag schon etwas
           eingeplant ist. */
        <div className="wochenstreifen">
          {tage.map(zelle => {
            const heute = zelle.datum === heuteIso();
            const klassenDesTages = [...new Map(
              zelle.slots.map(s => [s.klasseName || 'ohne Klasse', s.klasseName]),
            ).entries()];
            return (
              <div
                key={zelle.datum}
                className={`wochentag${heute ? ' wochentag-ist-heute' : ''}${zelle.schulfrei ? ' wochentag-ist-frei' : ''}${istWochenende(zelle.datum) ? ' wochentag-ist-wochenende' : ''}`}
                title={`${WOCHENTAGE_LANG[zelle.wochentag - 1]}, ${datumNumerisch(zelle.datum)}${zelle.schulfrei ? ` · ${zelle.schulfrei.bezeichnung}` : istWochenende(zelle.datum) ? ' · Wochenende' : ''}`}
              >
                <div className="wochentag-head">
                  <span>{WOCHENTAGE_KURZ[zelle.wochentag - 1]}</span>
                  {zelle.stunden.length > 0 && (
                    <span
                      className="wochentag-geplantzahl"
                      title={`${zelle.stunden.length} ${zelle.stunden.length === 1 ? 'Stunde' : 'Stunden'} eingeplant`}
                    >
                      {zelle.stunden.length}
                    </span>
                  )}
                </div>
                <div className="wochentag-tag">{datumNumerisch(zelle.datum).slice(0, 2)}</div>
                <div className="wochentag-slots">
                  {klassenDesTages.length === 0 ? (
                    <span className="wochentag-leer">–</span>
                  ) : klassenDesTages.map(([label, name]) => (
                    <span
                      key={label}
                      className="wochentag-slot"
                      style={name ? klasseStil(name) : undefined}
                      title={zelle.slots
                        .filter(s => (s.klasseName || 'ohne Klasse') === label)
                        .map(s => `${s.startZeit || 'offen'}–${s.endeZeit || 'offen'}${s.bezeichnung ? ` · ${s.bezeichnung}` : ''}`)
                        .join('\n')}
                    >
                      {label}
                    </span>
                  ))}
                </div>
                {zelle.schulfrei && <div className="wochentag-frei-text">{zelle.schulfrei.bezeichnung}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="monatsraster">
          <div className="monatsraster-kopf">
            {WOCHENTAGE_KURZ.map((t, i) => (
              <div key={`${t}-${i}`} className="monatsraster-wochentag">{WOCHENTAGE_LANG[i]}</div>
            ))}
          </div>
          <div className="monatsraster-gitter">
            {tage.map(zelle => {
              const heute = zelle.datum === heuteIso();
              return (
                <div
                  key={zelle.datum}
                  className={`monatszelle${heute ? ' monatszelle-ist-heute' : ''}${!zelle.imZeitraum ? ' monatszelle-ist-rand' : ''}${zelle.schulfrei ? ' monatszelle-ist-frei' : ''}${istWochenende(zelle.datum) ? ' monatszelle-ist-wochenende' : ''}`}
                >
                  {/* Der Tag ist die Schaltfläche. Randtage aus dem Nachbarmonat
                      bleiben grau und führen nicht weiter - sonst springt man beim
                      Klicken aus dem gerade betrachteten Monat heraus. */}
                  <button
                    type="button"
                    className="monatszelle-kopf"
                    disabled={!zelle.imZeitraum}
                    onClick={() => tagOeffnen(zelle.datum, zelle.stunden)}
                    aria-current={heute ? 'date' : undefined}
                    aria-label={`${WOCHENTAGE_LANG[zelle.wochentag - 1]}, ${datumNumerisch(zelle.datum)}${zelle.schulfrei ? `, ${zelle.schulfrei.bezeichnung}` : ''} – zur Woche wechseln`}
                    title={zelle.schulfrei ? zelle.schulfrei.bezeichnung : 'Diese Woche anzeigen'}
                  >
                    <span className="monatszelle-tag">{datumNumerisch(zelle.datum).slice(0, 2)}</span>
                    {zelle.slots.length > 0 && (
                      <span className="monatszelle-rasterzahl" title={`${zelle.slots.length} Rasterstunden`}>{zelle.slots.length}</span>
                    )}
                  </button>
                  <div className="monatszelle-liste">
                    {zelle.stunden.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        className={`monatsstunde${s.id === gewaehltId ? ' monatsstunde-ist-aktiv' : ''}`}
                        style={{ ...(s.klasseName ? klasseStil(s.klasseName) : undefined) }}
                        onClick={() => { setGewaehltId(s.id); setMeldung(null); }}
                        title={`${s.klasseName} · ${zeitSpanne(s.startZeit, s.endeZeit)} · ${s.titel || 'Unterricht'}`}
                      >
                        <span className="monatsstunde-zeit">{s.startZeit?.slice(0, 5) ?? '–'}</span>
                        <span className="monatsstunde-klasse">{s.klasseName || 'ohne Klasse'}</span>
                      </button>
                    ))}
                    {zelle.slots.length > 0 && zelle.stunden.length === 0 && (
                      <span className="monatszelle-nur-raster" title="Im Raster, aber noch nicht eingeplant">
                        {zelle.slots.map(slot => slot.startZeit.slice(0, 5)).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="planung-grid">
        <section aria-labelledby="planung-anstehend">
          <h2 id="planung-anstehend" style={{ fontSize: '1rem', margin: '0 0 .5rem' }}>
            {modus === 'woche' ? 'Nächste Stunden' : 'Stunden in diesem Zeitraum'}
          </h2>
          <p style={{ fontSize: '.75rem', color: 'var(--color-text-secondary)', margin: '0 0 .75rem' }}>
            {modus === 'woche'
              ? (anstehende.length === 0
                ? 'Ab heute ist nichts mehr geplant.'
                : `${anstehende.length} geplant${ohneUnterlagen > 0 ? ` · ${ohneUnterlagen} ohne Unterlage` : ''}`)
              : `${anzahlImZeitraum} ${anzahlImZeitraum === 1 ? 'Stunde' : 'Stunden'} im ${modus === 'monat' ? monatLabel(Number(anker.slice(0, 4)), Number(anker.slice(5, 7))) : 'Zeitraum'}.`}
          </p>

          {modus === 'monat' ? (
            (() => {
              const mitStunden = tage.filter(z => z.imZeitraum && z.stunden.length > 0);
              if (mitStunden.length === 0) {
                return (
                  <div className="planung-leer">
                    In diesem Monat ist noch nichts eingeplant.<br />
                    <strong>{modus === 'monat' ? 'Monat einplanen' : 'Woche einplanen'}</strong> macht
                    aus dem Raster einzelne Stunden.
                  </div>
                );
              }
              return mitStunden.map(zelle => (
                <div key={zelle.datum}>
                  <div className="planung-tag">
                    <span className="planung-tag-datum">{relativTagesueberschrift(zelle.datum)}</span>
                    {zelle.schulfrei && <span className="planung-tag-hinweis">{zelle.schulfrei.bezeichnung}</span>}
                  </div>
                  {sortiereStunden(zelle.stunden).map(s => stundenKachel(s, tage))}
                </div>
              ));
            })()
          ) : gruppen.length === 0 ? (
            <div className="planung-leer">
              Noch keine Stunden geplant.<br />
              Trag unten dein Wochenraster ein und klicke oben auf <strong>Woche einplanen</strong>.
            </div>
          ) : (
            <>
              {gruppen.map(gruppe => (
                <div key={gruppe.datum}>
                  <div className="planung-tag">
                    <span className="planung-tag-datum">{gruppe.ueberschrift}</span>
                    {gruppe.schulfrei && <span className="planung-tag-hinweis">{gruppe.schulfrei.bezeichnung}</span>}
                  </div>
                  {gruppe.stunden.map(s => stundenKachel(s, tage))}
                </div>
              ))}
            </>
          )}
        </section>

        <section aria-labelledby="planung-detail">
          {!gewaehlt ? (
            <div className="planung-leer">Wähle links eine Stunde aus.</div>
          ) : (
            <>
              <h2 id="planung-detail" style={{ fontSize: '1rem', margin: '0 0 .75rem' }}>
                <span style={{ ...klasseStil(gewaehlt.klasseName) }}>{gewaehlt.klasseName || 'Stunde'}</span>
                {' · '}{relativTagesueberschrift(gewaehlt.datum)}
              </h2>

              <div className="planung-abschnitt">
                <div className="planung-feld">
                  <label htmlFor="stunde-thema">Thema</label>
                  <input
                    id="stunde-thema"
                    key={`t-${gewaehlt.id}`}
                    defaultValue={gewaehlt.titel}
                    placeholder="Worum geht es in dieser Stunde?"
                    onBlur={e => {
                      const wert = e.target.value.trim();
                      if (wert !== gewaehlt.titel) stundeAendern({ titelSnapshot: wert });
                    }}
                  />
                </div>
                <div className="planung-feld">
                  <span className="planung-feld-label">Uhrzeit</span>
                  <div style={{ display: 'flex', gap: '.375rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <ZeitFeld
                      label="von"
                      wert={gewaehlt.startZeit}
                      onChange={(wert) => stundeAendern({ startZeit: wert || null })}
                    />
                    <ZeitFeld
                      label="bis"
                      wert={gewaehlt.endeZeit}
                      onChange={(wert) => stundeAendern({ endeZeit: wert || null })}
                    />
                  </div>
                </div>
              </div>

              <div className="planung-abschnitt">
                <h5><Repeat size={14} /> Zustand</h5>
                <div className="planung-feld">
                  <label htmlFor="stunde-status">Status</label>
                  <select
                    id="stunde-status" key={`st-${gewaehlt.id}`}
                    defaultValue={gewaehlt.status} style={{ width: '12rem' }}
                    onChange={e => stundeAendern({ status: e.target.value })}
                  >
                    {STAATUS.map(s => <option key={s.wert} value={s.wert}>{s.label}</option>)}
                  </select>
                </div>
                <div className="planung-feld">
                  <label htmlFor="stunde-notiz">Notiz</label>
                  <textarea
                    id="stunde-notiz" key={`n-${gewaehlt.id}`} rows={2}
                    defaultValue={gewaehlt.notiz} placeholder="Hinweise für dich"
                    onBlur={e => {
                      const wert = e.target.value;
                      if (wert !== gewaehlt.notiz) stundeAendern({ notiz: wert });
                    }}
                  />
                </div>
                <div className="planung-umstellen">
                  <DatumFeld
                    label="Auf einen anderen Tag legen"
                    wert={gewaehlt.datum}
                    min={schuljahrZeitraum(schuljahr).von}
                    max={schuljahrZeitraum(schuljahr).bis}
                    onChange={stundeVerschieben}
                  />
                  <button
                    className="btn-secondary"
                    style={{ fontSize: '.75rem', alignSelf: 'flex-end' }}
                    onClick={() => {
                      stundeAendern({ einsatzArt: ART_ENTFALLEN });
                      setMeldung('Als entfallen markiert – bleibt im Kalender stehen, zählt aber nicht mehr als Unterricht.');
                    }}
                  >
                    <X size={13} /> Entfällt
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: '.75rem', alignSelf: 'flex-end' }}
                    onClick={() => {
                      stundeAendern({ einsatzArt: ART_GEPLANT });
                      setMeldung('Wieder als reguläre Stunde geplant.');
                    }}
                  >
                    <Check size={13} /> Findet doch statt
                  </button>
                </div>
              </div>

              <div className="planung-abschnitt">
                <h5>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.375rem' }}>
                    <Package size={14} /> Unterlagen für diese Stunde
                  </span>
                </h5>

                {anlagen.length === 0 ? (
                  <div className="planung-leer">
                    Noch nichts dabei.<br />
                    <strong>Unterlage vorbereiten</strong> öffnet den Assistenten mit dem Thema
                    dieser Stunde – Quelltext und Aufgaben ergänzt du selbst, und LUA hängt die
                    fertige Unterlage an den Termin; <strong>Datei ablegen</strong> legt eine Kopie im Ordner
                    von LUA ab – dann findest du sie, ohne am PC zu suchen.
                  </div>
                ) : anlagen.map(anlage => (
                  <div key={anlage.id} className={`anlage${anlage.art === 'verweis' ? ' anlage-ist-verweis' : ''}`}>
                    <span className="anlage-art" title={MATERIAL_LABEL[anlage.art]}>
                      {anlage.art === 'ablage' ? <FolderOpen size={13} />
                        : anlage.art === 'material' ? <FileText size={13} />
                        : <Link2 size={13} />}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="anlage-titel">{anlage.label || anlage.dateiname}</div>
                      <div className="anlage-ziel">
                        {MATERIAL_LABEL[anlage.art]}
                        {anlage.art === 'verweis' && anlage.ziel ? ` · ${anlage.ziel}` : ''}
                      </div>
                      {anlage.art === 'ablage' && !anlage.dateiVorhanden && (
                        <div className="anlage-fehlt"><Unlink size={12} /> Datei nicht gefunden – bitte neu ablegen.</div>
                      )}
                    </div>
                    {anlage.art !== 'material' && (
                      <button className="btn-secondary" onClick={() => void anlageOeffnen(anlage)} title="Im Ordner anzeigen" aria-label={`${anlage.label} im Ordner anzeigen`} style={{ padding: '.3rem .4rem' }}>
                        <FolderOpen size={13} />
                      </button>
                    )}
                    <button
                      className="btn-danger"
                      onClick={() => void planung.entferneAnlage(anlage.id)}
                      title="Anlage entfernen" aria-label={`${anlage.label} entfernen`} style={{ padding: '.3rem .4rem' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                {/* Zwei Wege, klar benannt: eine Unterlage entsteht neu im
                    Assistenten, eine Datei kommt von der Festplatte. Der
                    dritte Weg - eine bereits bestehende Unterlage aus der
                    Bibliothek auswählen - ist entfallen. */}
                <div style={{ display: 'flex', gap: '.375rem', flexWrap: 'wrap', marginTop: '.75rem' }}>
                  <button
                    className="btn-primary"
                    onClick={() => void unterlageErzeugen()}
                    disabled={!onGenerateUnterlage}
                    title={
                      gewaehlt.titel
                        ? `Öffnet den Assistenten mit dem Thema „${gewaehlt.titel}" und hängt `
                          + 'die fertige Unterlage an diese Stunde.'
                        : 'Ohne Thema öffnet sich der Assistent, damit du es einträgst.'
                    }
                    style={{ fontSize: '.6875rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                  >
                    <Sparkles size={12} /> Unterlage vorbereiten
                  </button>
                  <button className="btn-secondary" onClick={() => void dateiAblegen()} style={{ fontSize: '.6875rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <FolderOpen size={12} /> Datei ablegen
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '.375rem', marginTop: '.5rem' }}>
                  <input
                    aria-label="Pfad oder Adresse für den Verweis" value={verweis}
                    onChange={e => setVerweis(e.target.value)} placeholder="Pfad oder Adresse für einen Verweis …"
                    style={{ flex: 1, fontSize: '.75rem', minHeight: 28 }}
                  />
                  <button className="btn-secondary" onClick={() => void verweisAnlegen()} disabled={!verweis.trim()} style={{ fontSize: '.6875rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Link2 size={12} /> Verweis
                  </button>
                </div>
                <p style={{ fontSize: '.6875rem', color: 'var(--color-text-muted)', margin: '.5rem 0 0', lineHeight: 1.5 }}>
                  {ART_HINWEIS.ablage}<br />{ART_HINWEIS.verweis}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  className="btn-secondary" style={{ fontSize: '.75rem', display: 'inline-flex', alignItems: 'center', gap: '.375rem' }}
                  onClick={() => void ablageOeffnen()}
                >
                  <FolderOpen size={13} /> Ablage-Ordner
                </button>
                <span style={{ flex: 1 }} />
                <button
                  className="btn-danger" style={{ fontSize: '.75rem', display: 'inline-flex', alignItems: 'center', gap: '.375rem' }}
                  onClick={() => {
                    if (!window.confirm(`Stunde „${gewaehlt.titel || gewaehlt.klasseName}" löschen? Die abgelegten Dateien bleiben im Ablage-Ordner.`)) return;
                    void planung.loescheStunde(gewaehlt.id);
                  }}
                >
                  <Trash2 size={13} /> Stunde löschen
                </button>
              </div>
            </>
          )}

          {meldung && (
            <p role="status" style={{ marginTop: '.75rem', fontSize: '.75rem', color: 'var(--color-text-secondary)' }}>{meldung}</p>
          )}
        </section>
      </div>

      <section className="planung-abschnitt" style={{ marginTop: '1.75rem' }}>
        <h5>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.375rem' }}>
            <CalendarCheck size={14} /> Mein Wochenraster · {schuljahrLabel(schuljahr)}
          </span>
          <span style={{ display: 'flex', gap: '.375rem', marginLeft: 'auto' }}>
            <button
              className="btn-secondary" style={{ fontSize: '.6875rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}
              onClick={() => setJahresplanungOffen(v => !v)}
              aria-expanded={jahresplanungOffen}
            >
              {jahresplanungOffen ? <><X size={12} /> Schließen</> : <><CalendarPlus size={12} /> Schuljahr planen</>}
            </button>
            <button
              className="btn-secondary" style={{ fontSize: '.6875rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}
              onClick={() => setRasterOffen(v => !v)}
              aria-expanded={rasterOffen}
            >
              {rasterOffen ? <><X size={12} /> Schließen</> : <><Pencil size={12} /> Bearbeiten</>}
            </button>
          </span>
        </h5>
        <p style={{ fontSize: '.75rem', color: 'var(--color-text-secondary)', margin: '0 0 .75rem', lineHeight: 1.55 }}>
          Die feste Form deiner Woche – einmal für das Schuljahr. <strong>Einplanen</strong> macht daraus
          einzelne Stunden; jede davon kann danach ausfallen, verschoben oder mit Unterlagen versehen werden.
        </p>

        {jahresplanungOffen && (
          <div className="planung-jahresplanung">
            <div>
              <strong style={{ fontSize: '.8125rem' }}>Ganzes Schuljahr einplanen</strong>
              <p style={{ fontSize: '.6875rem', color: 'var(--color-text-secondary)', margin: '.25rem 0 .5rem', lineHeight: 1.5 }}>
                Macht aus jeder Rasterstunde eine einzelne Stunde – {freiUeberspringen ? 'Ferien, Feiertage und Pausen bleiben leer' : 'Ferien und Pausen werden mit eingeplant'}.
                Vorher kommt eine Rückfrage, es entsteht eine Menge Einzelstunden.
              </p>
              <label className="planung-feld" style={{ marginBottom: '.5rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.375rem', fontSize: '.75rem' }}>
                  <input type="checkbox" checked={freiUeberspringen} onChange={e => setFreiUeberspringen(e.target.checked)} />
                  Ferien, Feiertage und Pausen auslassen
                </span>
              </label>
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                <button className="btn-primary" style={{ fontSize: '.75rem', display: 'inline-flex', alignItems: 'center', gap: 3 }} onClick={() => void schuljahrEinplanen()}>
                  <CalendarPlus size={13} /> Schuljahr einplanen
                </button>
                <button className="btn-secondary" style={{ fontSize: '.75rem', display: 'inline-flex', alignItems: 'center', gap: 3 }} onClick={() => void rasterAusVorjahr()}>
                  <Repeat size={13} /> Raster aus {schuljahrLabel(schuljahr - 1)} übernehmen
                </button>
              </div>
            </div>
          </div>
        )}

        {slotsDesJahres.length === 0 ? (
          <div className="planung-leer">
            Für {schuljahrLabel(schuljahr)} noch keine festen Stunden.<br />
            Trag unten ein, wann du welches Fach in welcher Klasse hast.
          </div>
        ) : (
          <div>
            {[...slotsDesJahres]
              .sort((a, b) => a.wochentag - b.wochentag || a.startZeit.localeCompare(b.startZeit))
              .map(slot => (
              <div key={slot.id} className={`raster-slot${slot.aktiv ? '' : ' raster-inaktiv'}`} style={{ ...klasseStil(slot.klasseName) }}>
                <span className="raster-wochentag">{WOCHENTAGE_KURZ[slot.wochentag - 1]}</span>
                <span style={{ fontSize: '.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong>{slot.klasseName || '—'}</strong>
                  {slot.bezeichnung ? ` · ${slot.bezeichnung}` : ''}
                </span>
                <span className="raster-zeit" style={{ textAlign: 'right' }}>{zeitSpanne(slot.startZeit, slot.endeZeit)}</span>
                {rasterOffen && (
                  <span className="raster-slot-loeschen" style={{ display: 'flex', gap: '.25rem' }}>
                    <button
                      className="btn-secondary" style={{ padding: '.2rem .35rem' }}
                      title={slot.aktiv ? 'Deaktivieren' : 'Aktivieren'}
                      aria-label={`${slot.klasseName} am ${WOCHENTAGE_LANG[slot.wochentag - 1]} ${slot.aktiv ? 'deaktivieren' : 'aktivieren'}`}
                      onClick={() => void planung.speichereRaster({
                        id: slot.id, klasseId: slot.klasseId, klasseNameSnapshot: slot.klasseName,
                        wochentag: slot.wochentag, startZeit: slot.startZeit, endeZeit: slot.endeZeit,
                        bezeichnung: slot.bezeichnung, schuljahr: schuljahr, aktiv: slot.aktiv ? 0 : 1,
                      })}
                    >
                      {slot.aktiv ? <Check size={12} /> : <X size={12} />}
                    </button>
                    <button
                      className="btn-danger" style={{ padding: '.2rem .35rem' }}
                      title="Aus dem Raster löschen" aria-label={`${slot.klasseName} am ${WOCHENTAGE_LANG[slot.wochentag - 1]} löschen`}
                      onClick={() => void planung.loescheRaster(slot.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '.5rem', flexWrap: 'wrap', marginTop: '.75rem' }}>
          <label style={{ fontSize: '.75rem', display: 'grid', gap: '.25rem' }}>
            Tag
            <select value={neuerSlot?.wochentag ?? 1} onChange={e => setNeuerSlot({ ...(neuerSlot ?? {}), wochentag: Number(e.target.value) })}>
              {WOCHENTAGE_LANG.map((tag, i) => <option key={tag} value={i + 1}>{tag}</option>)}
            </select>
          </label>
          <label style={{ fontSize: '.75rem', display: 'grid', gap: '.25rem' }}>
            Klasse
            <select
              value={neuerSlot?.klasseId ?? ''}
              onChange={e => {
                const kid = e.target.value || null;
                setNeuerSlot({
                  ...(neuerSlot ?? { wochentag: 1 }),
                  klasseId: kid,
                  klasseNameSnapshot: klassen.find(k => k.id === kid)?.name ?? '',
                });
              }}
            >
              <option value="">— keine —</option>
              {klassen.filter(k => !k.archiviert && k.id).map(k => <option key={k.id!} value={k.id!}>{k.name}</option>)}
            </select>
          </label>
          <ZeitFeld
            label="von"
            wert={neuerSlot?.startZeit ?? '08:00'}
            allowEmpty={false}
            onChange={(wert) => setNeuerSlot({ ...(neuerSlot ?? { wochentag: 1 }), startZeit: wert })}
          />
          <ZeitFeld
            label="bis"
            wert={neuerSlot?.endeZeit ?? '08:45'}
            allowEmpty={false}
            onChange={(wert) => setNeuerSlot({ ...(neuerSlot ?? { wochentag: 1 }), endeZeit: wert })}
          />
          <label style={{ fontSize: '.75rem', display: 'grid', gap: '.25rem', flex: 1, minWidth: '7rem' }}>
            Fach
            <input value={neuerSlot?.bezeichnung ?? ''} placeholder="Deutsch" onChange={e => setNeuerSlot({ ...(neuerSlot ?? { wochentag: 1 }), bezeichnung: e.target.value })} />
          </label>
          <button
            className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
            onClick={() => {
              if (!neuerSlot) return;
              void planung.speichereRaster({ ...neuerSlot, schuljahr, aktiv: 1 });
              setNeuerSlot(null);
            }}
          >
            <Plus size={13} /> Hinzufügen
          </button>
        </div>
      </section>

      <FerienBereich
        offen={ferienOffen}
        setOffen={setFerienOffen}
        schuljahr={schuljahr}
        land={land}
        region={region}
        ferien={ferienListe}
        pausen={pauseListe}
        klassenNamen={klassenNamen}
        planung={planung}
      />

      <p style={{ fontSize: '.6875rem', color: 'var(--color-text-muted)', marginTop: '1.5rem' }}>
        {bundeslandName(region) ? `Ferien nach ${bundeslandName(region)}` : 'Kein Bundesland im Profil – Ferien werden nicht angezeigt'}.
        {' '}Gesetzliche Feiertage rechnet LUA für Österreich, Deutschland und die Schweiz selbst.
        {stundenImZeitraum.length > 0 && ` Geladen: ${stundenImZeitraum.length} Stunden im ${zeitraumBeschriftung(modus, anker)}.`}
      </p>
    </ViewShell>
  );
}

/** Ferien und schulinterne Pausen: getrennt editierbar, beide schuljahresbezogen.
 *  Steht bewusst unten – die Lehrkraft pflegt sie einmal im Jahr, nicht wöchentlich. */
function FerienBereich({
  offen, setOffen, schuljahr, land, region, ferien, pausen, klassenNamen, planung,
}: {
  offen: boolean;
  setOffen: (v: boolean) => void;
  schuljahr: number;
  land: string;
  region: string;
  ferien: FerienEintrag[];
  pausen: PauseEintrag[];
  klassenNamen: string[];
  planung: ReturnType<typeof usePlanung>;
}) {
  const [neueFerien, setNeueFerien] = useState({ bezeichnung: '', von: '', bis: '' });
  const [neuePause, setNeuePause] = useState({ bezeichnung: '', datum: '', klasseName: '', notiz: '' });
  const [meldung, setMeldung] = useState<string | null>(null);
  const vorschlag = useMemo(
    () => (region ? ferienBestandVorschlag(region, schuljahr, land) : []),
    [region, schuljahr, land],
  );
  const bereitsDa = useMemo(
    () => new Set(ferien.map(f => f.von)),
    [ferien],
  );
  const fehlend = vorschlag.filter(v => !bereitsDa.has(v.von));
  const quelle = useMemo(
    () => (fehlend.length > 0 ? ferienTerminQuelle(schuljahr, land) : null),
    [fehlend.length, schuljahr, land],
  );

  const ferienUebernehmen = useCallback(async () => {
    if (fehlend.length === 0) return;
    if (!window.confirm(
      `${fehlend.length} Ferienblöcke für ${bundeslandName(region) ?? region} übernehmen? `
      + 'Bitte danach mit der Schulferienverordnung deines Bundeslandes abgleichen.',
    )) return;
    const ok = await planung.seedFerien(region, schuljahr, fehlend);
    setMeldung(ok ? 'Vorschlag übernommen – bitte mit der Verordnung abgleichen.' : null);
  }, [fehlend, region, schuljahr, planung]);

  return (
    <section className="planung-abschnitt" style={{ marginTop: '1.75rem' }}>
      <h5>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.375rem' }}>
          <CalendarCheck size={14} /> Ferien und Pausen · {schuljahrLabel(schuljahr)}
        </span>
        <button
          className="btn-secondary" style={{ fontSize: '.6875rem', display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}
          onClick={() => setOffen(!offen)}
          aria-expanded={offen}
        >
          {offen ? <><X size={12} /> Schließen</> : <><Pencil size={12} /> Bearbeiten</>}
        </button>
      </h5>
      <p style={{ fontSize: '.75rem', color: 'var(--color-text-secondary)', margin: '0 0 .75rem', lineHeight: 1.55 }}>
        An diesen Tagen plant LUA nichts ein. Gesetzliche Feiertage sind automatisch richtig;
        Ferien und schulinterne Pausen pflegst du hier.
      </p>

      <div className="ferienliste">
        {ferien.length === 0 ? (
          <div className="planung-leer">
            Für dieses Schuljahr sind noch keine Ferien erfasst.
            {region ? '' : ' Wähle zuerst ein Bundesland im Profil.'}
          </div>
        ) : ferien.map(f => (
          <div key={f.id} className="ferienzeile">
            <span className="ferienzeile-name">{f.bezeichnung}</span>
            <span className="ferienzeile-zeit">{datumNumerisch(f.von)} – {datumNumerisch(f.bis)}</span>
            {offen && (
              <button
                className="btn-danger" style={{ padding: '.2rem .35rem' }}
                aria-label={`${f.bezeichnung} löschen`} title="Ferienblock löschen"
                onClick={() => void planung.loescheFerien(f.id)}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {pausen.length > 0 && (
        <>
          <h6 style={{ fontSize: '.75rem', margin: '.875rem 0 .375rem', color: 'var(--color-text-secondary)' }}>
            Schulinterne Pausen
          </h6>
          <div className="ferienliste">
            {pausen.map(p => (
              <div key={p.id} className="ferienzeile">
                <span className="ferienzeile-name">{p.bezeichnung}</span>
                <span className="ferienzeile-zeit">
                  {datumNumerisch(p.datum)}{p.klasseName ? ` · ${p.klasseName}` : ' · ganze Schule'}
                </span>
                {offen && (
                  <button
                    className="btn-danger" style={{ padding: '.2rem .35rem' }}
                    aria-label={`${p.bezeichnung} löschen`} title="Pause löschen"
                    onClick={() => void planung.loeschePause(p.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {offen && (
        <div className="planung-jahresplanung" style={{ marginTop: '.75rem' }}>
          <div>
            <strong style={{ fontSize: '.8125rem' }}>Ferienblock eintragen</strong>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '.5rem' }}>
              <label className="planung-feld" style={{ flex: '1 1 8rem' }}>
                Bezeichnung
                <input value={neueFerien.bezeichnung} onChange={e => setNeueFerien({ ...neueFerien, bezeichnung: e.target.value })} placeholder="Herbstferien" />
              </label>
              <DatumFeld
                label="von"
                wert={neueFerien.von || null}
                onChange={(iso) => setNeueFerien({ ...neueFerien, von: iso })}
              />
              <DatumFeld
                label="bis"
                wert={neueFerien.bis || null}
                onChange={(iso) => setNeueFerien({ ...neueFerien, bis: iso })}
              />
              <button
                className="btn-primary" style={{ fontSize: '.75rem' }}
                disabled={!neueFerien.bezeichnung.trim() || !neueFerien.von || !neueFerien.bis}
                onClick={() => {
                  void planung.speichereFerien({
                    bezeichnung: neueFerien.bezeichnung.trim(), von: neueFerien.von, bis: neueFerien.bis,
                    region: region || null, schuljahr,
                  }).then(ok => { if (ok) setNeueFerien({ bezeichnung: '', von: '', bis: '' }); });
                }}
              >
                <Plus size={13} /> Eintragen
              </button>
            </div>
          </div>

          {fehlend.length > 0 && (
            <div>
              <strong style={{ fontSize: '.8125rem' }}>Vorschlag aus der Ferienordnung</strong>
              <p style={{ fontSize: '.6875rem', color: 'var(--color-text-secondary)', margin: '.25rem 0 .5rem', lineHeight: 1.5 }}>
                {bundeslandName(region) ?? region}: {fehlend.map(v => `${v.bezeichnung} ${datumNumerisch(v.von)}–${datumNumerisch(v.bis)}`).join(' · ')}.
                Regelbetreuungstage und verschobene Feiertage stehen bewusst nicht darin.
              </p>
              <button className="btn-secondary" style={{ fontSize: '.75rem' }} onClick={() => void ferienUebernehmen()}>
                <Plus size={13} /> {fehlend.length} Blöcke übernehmen
              </button>
              {quelle && (
                // Die Lehrkraft soll dem Vorschlag trauen können – also steht die
                // Quelle mit Abrufdatum daneben, nicht in einem versteckten Modul.
                <p className="ferien-quelle" style={{ fontSize: '.6875rem', color: 'var(--color-text-secondary)', margin: '.5rem 0 0', lineHeight: 1.5 }}>
                  Quelle: {quelle.quelle} (abgerufen am {datumNumerisch(quelle.abgerufen)})
                </p>
              )}
            </div>
          )}

          <div>
            <strong style={{ fontSize: '.8125rem' }}>Pause eintragen</strong>
            <p style={{ fontSize: '.6875rem', color: 'var(--color-text-secondary)', margin: '.25rem 0 .5rem' }}>
              MuT, Fortbildung, Elternabend – schulweit oder nur für eine Klasse.
            </p>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label className="planung-feld" style={{ flex: '1 1 8rem' }}>
                Bezeichnung
                <input value={neuePause.bezeichnung} onChange={e => setNeuePause({ ...neuePause, bezeichnung: e.target.value })} placeholder="Fortbildung" />
              </label>
              <DatumFeld
                label="Datum"
                wert={neuePause.datum || null}
                onChange={(iso) => setNeuePause({ ...neuePause, datum: iso })}
              />
              <label className="planung-feld">
                Klasse
                <select value={neuePause.klasseName} onChange={e => setNeuePause({ ...neuePause, klasseName: e.target.value })}>
                  <option value="">ganze Schule</option>
                  {klassenNamen.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </label>
              <button
                className="btn-primary" style={{ fontSize: '.75rem' }}
                disabled={!neuePause.bezeichnung.trim() || !neuePause.datum}
                onClick={() => {
                  void planung.speicherePause({
                    bezeichnung: neuePause.bezeichnung.trim(), datum: neuePause.datum,
                    klasseName: neuePause.klasseName || null, notiz: neuePause.notiz || null, schuljahr,
                  }).then(ok => { if (ok) setNeuePause({ bezeichnung: '', datum: '', klasseName: '', notiz: '' }); });
                }}
              >
                <Plus size={13} /> Eintragen
              </button>
            </div>
          </div>

          {meldung && <p role="status" className="planung-hinweis">{meldung}</p>}
        </div>
      )}
    </section>
  );
}

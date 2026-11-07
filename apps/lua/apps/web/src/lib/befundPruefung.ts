export interface BefundPruefung {
  befundart?: string;
  anker_status?: string;
  textanker?: { start: number; end: number };
  ki_pruefung?: { status: string; begruendung?: string };
  ersetzungspruefung?: { status: string; begruendung?: string };
  nur_kommentar?: boolean;
}

export interface BewertungsPruefung {
  version: number;
  status: 'offen' | 'vollstaendig';
  detail_erforderlich?: boolean;
  kriterien: Record<string, {status: string; stufe?: number; begruendung?: string; belege?: (string | {stelle: string; zitat: string})[]}>;
  belegdiagnosen?: {kriterium: string; beleg: unknown; grund: string}[];
  aussagen?: Record<string, string>;
  aufgaben: {pruefart?: string; id: string; kriterium: string; beschreibung: string; stufe?: number | null; notenrelevant: boolean}[];
}
export type KriterienEntscheidungen = Record<string, {stufe: number; begruendung?: string}>;

export function befundGruppe(befund?: BefundPruefung): 'vorbereitet' | 'entscheidung' | 'anregung' | 'verworfen' {
  if (befund?.ki_pruefung?.status === 'verworfen') return 'verworfen';
  if (befund?.befundart === 'stilalternative') return 'anregung';
  if (befund?.anker_status === 'eindeutig' && ['bestaetigt', 'korrigiert'].includes(befund.ki_pruefung?.status ?? '')
    && befund.ersetzungspruefung?.status === 'bestaetigt' && !befund.nur_kommentar
    && ['normfehler', 'ausdrucksproblem'].includes(befund.befundart ?? '')) return 'vorbereitet';
  return 'entscheidung';
}

export function vorbereiteteBefunde<T extends {id: number; befund?: BefundPruefung | null}>(rows: T[]): T[] {
  const candidates = rows.filter(row => befundGruppe(row.befund ?? undefined) === 'vorbereitet');
  return candidates.filter(row => !candidates.some(other => {
    const a = row.befund?.textanker, b = other.befund?.textanker;
    return row.id !== other.id && a && b && a.start < b.end && b.start < a.end;
  }));
}

export function uebernehmeVorbereiteteBefunde<T extends {id: number; befund?: BefundPruefung | null; lehrkraftAktion?: string | null}>(
  rows: T[], previous: Record<number, {aktion: string | null; korrektur?: string}>,
): Record<number, {aktion: string | null; korrektur?: string}> {
  const next = {...previous};
  for (const finding of vorbereiteteBefunde(rows)) {
    if (!(finding.id in previous) && !finding.lehrkraftAktion) next[finding.id] = {aktion: 'uebernommen'};
  }
  return next;
}

/** Fachliche Zurückweisung und unsicherer Ersatz sind getrennte Zustände. */
export function befundPruefstatus(befund?: BefundPruefung, lehrkraftAktion?: string | null) {
  const lehrkraftBestaetigt = lehrkraftAktion === 'uebernommen' || lehrkraftAktion === 'geaendert';
  return {
    beanstandungVerworfen: befund?.ki_pruefung?.status === 'verworfen' && !lehrkraftBestaetigt,
    ersetzungOffen: !!befund?.ersetzungspruefung && befund.ersetzungspruefung.status !== 'bestaetigt',
  };
}

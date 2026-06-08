// Deterministischer Kreuzworträtsel-Generator.
//
// Leitprinzip: Das LLM liefert nur INHALT (Wort + Hinweis). Das LAYOUT (Gitter,
// Platzierung, Nummerierung) baut dieser Code — rein deterministisch aus der
// Wortliste (keine Zufallsquelle), damit Renderer (DOCX) und Web-Vorschau
// garantiert dasselbe Gitter zeigen.

export type Richtung = 'waagrecht' | 'senkrecht';

export interface KreuzwortEintrag {
  wort: string;
  hinweis: string;
}

export interface KreuzwortPlatzierung {
  nr: number;
  wort: string;
  hinweis: string;
  richtung: Richtung;
  zeile: number; // 0-basiert, normalisiert
  spalte: number;
}

export interface Kreuzwortgitter {
  zeilen: number;
  spalten: number;
  /** belegung[r][c] = Großbuchstabe oder null (Blockfeld). */
  belegung: (string | null)[][];
  /** nummern[r][c] = Startnummer eines Eintrags an dieser Zelle, sonst null. */
  nummern: (number | null)[][];
  /** Alle platzierten Einträge, sortiert nach nr (waagrecht vor senkrecht). */
  platzierungen: KreuzwortPlatzierung[];
}

interface Dir { dr: number; dc: number; richtung: Richtung; }
const WAAG: Dir = { dr: 0, dc: 1, richtung: 'waagrecht' };
const SENK: Dir = { dr: 1, dc: 0, richtung: 'senkrecht' };

interface Placed { wort: string; hinweis: string; r: number; c: number; dir: Dir; }

/** Nur Buchstaben, Großschreibung; deutsche Umlaute/ß bleiben erhalten. */
export function normalisiereWort(w: string): string {
  return w.toUpperCase().replace(/[^A-ZÄÖÜß]/g, '');
}

// Eine einzelne greedy Platzierung für eine gegebene Wort-Reihenfolge.
// Startwort waagrecht bei (0,0); jedes weitere Wort kreuzt ein bereits platziertes.
function platziereGitter(order: KreuzwortEintrag[]): Placed[] {
  const grid = new Map<string, string>();
  const key = (r: number, c: number) => `${r},${c}`;
  const at = (r: number, c: number) => grid.get(key(r, c));
  const placed: Placed[] = [];

  function canPlace(wort: string, r: number, c: number, dir: Dir): { ok: boolean; crossings: number } {
    const { dr, dc } = dir;
    // Zelle direkt vor dem Start und nach dem Ende muss frei sein (kein Zusammenkleben).
    if (at(r - dr, c - dc) !== undefined) return { ok: false, crossings: 0 };
    if (at(r + dr * wort.length, c + dc * wort.length) !== undefined) return { ok: false, crossings: 0 };
    const pr = dir === WAAG ? 1 : 0; // senkrecht zur Laufrichtung
    const pc = dir === WAAG ? 0 : 1;
    let crossings = 0;
    for (let k = 0; k < wort.length; k++) {
      const rr = r + dr * k, cc = c + dc * k;
      const cur = at(rr, cc);
      if (cur !== undefined) {
        if (cur !== wort[k]) return { ok: false, crossings: 0 };
        crossings++; // gültige Kreuzung
      } else {
        // Neue Zelle: senkrechte Nachbarn müssen frei sein (kein paralleles Ankleben).
        if (at(rr - pr, cc - pc) !== undefined) return { ok: false, crossings: 0 };
        if (at(rr + pr, cc + pc) !== undefined) return { ok: false, crossings: 0 };
      }
    }
    return { ok: true, crossings };
  }

  function doPlace(wort: string, hinweis: string, r: number, c: number, dir: Dir) {
    for (let k = 0; k < wort.length; k++) grid.set(key(r + dir.dr * k, c + dir.dc * k), wort[k]!);
    placed.push({ wort, hinweis, r, c, dir });
  }

  doPlace(order[0]!.wort, order[0]!.hinweis, 0, 0, WAAG);

  for (let i = 1; i < order.length; i++) {
    const { wort, hinweis } = order[i]!;
    const kandidaten: { r: number; c: number; dir: Dir; crossings: number }[] = [];
    for (const p of placed) {
      for (let pk = 0; pk < p.wort.length; pk++) {
        const pr = p.r + p.dir.dr * pk;
        const pc = p.c + p.dir.dc * pk;
        const letter = p.wort[pk]!;
        const dir = p.dir === WAAG ? SENK : WAAG;
        for (let k = 0; k < wort.length; k++) {
          if (wort[k] !== letter) continue;
          const r = pr - dir.dr * k;
          const c = pc - dir.dc * k;
          const res = canPlace(wort, r, c, dir);
          if (res.ok && res.crossings >= 1) {
            kandidaten.push({ r, c, dir, crossings: res.crossings });
          }
        }
      }
    }
    if (kandidaten.length > 0) {
      // Bounding-Box des bisherigen Gitters für den Kompaktheits-Tie-Break.
      let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
      for (const k of grid.keys()) {
        const [r, c] = k.split(',').map(Number) as [number, number];
        minR = Math.min(minR, r); minC = Math.min(minC, c);
        maxR = Math.max(maxR, r); maxC = Math.max(maxC, c);
      }
      // Mehr Kreuzungen zuerst; bei Gleichstand kompakter (kleinere resultierende
      // Fläche); dann deterministisch nach Position/Richtung.
      kandidaten.sort((a, b) => {
        if (b.crossings !== a.crossings) return b.crossings - a.crossings;
        const fa = flaecheNachPlatzierung(a, wort.length, minR, minC, maxR, maxC);
        const fb = flaecheNachPlatzierung(b, wort.length, minR, minC, maxR, maxC);
        if (fa !== fb) return fa - fb;
        if (a.r !== b.r) return a.r - b.r;
        if (a.c !== b.c) return a.c - b.c;
        return a.dir === b.dir ? 0 : a.dir === WAAG ? -1 : 1;
      });
      const best = kandidaten[0]!;
      doPlace(wort, hinweis, best.r, best.c, best.dir);
    } else {
      // Kein Kreuz möglich → unterhalb von allem separat platzieren (Wort geht nicht verloren).
      let maxR = -Infinity;
      for (const k of grid.keys()) maxR = Math.max(maxR, Number(k.split(',')[0]));
      doPlace(wort, hinweis, maxR + 2, 0, WAAG);
    }
  }

  return placed;
}

// Resultierende Bounding-Box-Fläche, wenn ein Kandidat platziert würde (Kompaktheit).
function flaecheNachPlatzierung(
  cand: { r: number; c: number; dir: Dir },
  laenge: number,
  minR: number, minC: number, maxR: number, maxC: number,
): number {
  const endR = cand.r + cand.dir.dr * (laenge - 1);
  const endC = cand.c + cand.dir.dc * (laenge - 1);
  const nMinR = Math.min(minR, cand.r, endR);
  const nMinC = Math.min(minC, cand.c, endC);
  const nMaxR = Math.max(maxR, cand.r, endR);
  const nMaxC = Math.max(maxC, cand.c, endC);
  return (nMaxR - nMinR + 1) * (nMaxC - nMinC + 1);
}

// Dichte-Score: primär Anzahl Kreuzungszellen (von ≥2 Wörtern belegt), sekundär kompakt.
function bewerteDichte(placed: Placed[]): number {
  const count = new Map<string, number>();
  let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
  for (const p of placed) {
    for (let k = 0; k < p.wort.length; k++) {
      const r = p.r + p.dir.dr * k, c = p.c + p.dir.dc * k;
      const kk = `${r},${c}`;
      count.set(kk, (count.get(kk) ?? 0) + 1);
      minR = Math.min(minR, r); minC = Math.min(minC, c);
      maxR = Math.max(maxR, r); maxC = Math.max(maxC, c);
    }
  }
  let kreuzungen = 0;
  for (const v of count.values()) if (v >= 2) kreuzungen++;
  const flaeche = (maxR - minR + 1) * (maxC - minC + 1);
  return kreuzungen * 10000 - flaeche;
}

export function baueKreuzwortgitter(eintraege: KreuzwortEintrag[]): Kreuzwortgitter {
  // 1. normalisieren, zu kurze entfernen, Dubletten raus (deterministisch erste behalten)
  const seen = new Set<string>();
  const uniq: KreuzwortEintrag[] = [];
  for (const e of eintraege) {
    const wort = normalisiereWort(e.wort);
    if (wort.length < 2 || seen.has(wort)) continue;
    seen.add(wort);
    uniq.push({ wort, hinweis: e.hinweis });
  }
  if (uniq.length === 0) {
    return { zeilen: 0, spalten: 0, belegung: [], nummern: [], platzierungen: [] };
  }

  // 2. deterministische Basis-Reihenfolge: längste zuerst, dann alphabetisch
  const base = [...uniq].sort(
    (a, b) => b.wort.length - a.wort.length || (a.wort < b.wort ? -1 : a.wort > b.wort ? 1 : 0),
  );

  // 3. Best-of-N: jede Reihenfolge mit anderem Startwort durchprobieren und das
  //    dichteste Ergebnis behalten. Wortzahl ist klein (≤ ~12) → billig, deterministisch.
  const N = Math.min(base.length, 8);
  let placed: Placed[] = [];
  let bestScore = -Infinity;
  for (let s = 0; s < N; s++) {
    const order = [base[s]!, ...base.filter((_, idx) => idx !== s)];
    const versuch = platziereGitter(order);
    const score = bewerteDichte(versuch);
    if (score > bestScore) {
      bestScore = score;
      placed = versuch;
    }
  }

  // 4. Gitter aus der besten Platzierung rekonstruieren
  const grid = new Map<string, string>();
  const key = (r: number, c: number) => `${r},${c}`;
  for (const p of placed) {
    for (let k = 0; k < p.wort.length; k++) {
      grid.set(key(p.r + p.dir.dr * k, p.c + p.dir.dc * k), p.wort[k]!);
    }
  }

  // Koordinaten auf 0-basiert normalisieren.
  let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
  for (const k of grid.keys()) {
    const [r, c] = k.split(',').map(Number) as [number, number];
    minR = Math.min(minR, r); minC = Math.min(minC, c);
    maxR = Math.max(maxR, r); maxC = Math.max(maxC, c);
  }
  const zeilen = maxR - minR + 1;
  const spalten = maxC - minC + 1;
  const belegung: (string | null)[][] = Array.from({ length: zeilen }, () => Array<string | null>(spalten).fill(null));
  for (const [k, v] of grid.entries()) {
    const [r, c] = k.split(',').map(Number) as [number, number];
    belegung[r - minR]![c - minC] = v;
  }

  // Nummerierung (Standard-Kreuzwort): Zelle bekommt Nummer, wenn dort ein
  // waagrechter und/oder senkrechter Eintrag beginnt.
  const occ = (r: number, c: number) => r >= 0 && r < zeilen && c >= 0 && c < spalten && belegung[r]![c] !== null;
  const nummern: (number | null)[][] = Array.from({ length: zeilen }, () => Array<number | null>(spalten).fill(null));
  const startNr = new Map<string, number>();
  let nr = 0;
  for (let r = 0; r < zeilen; r++) {
    for (let c = 0; c < spalten; c++) {
      if (!occ(r, c)) continue;
      const startWaag = !occ(r, c - 1) && occ(r, c + 1);
      const startSenk = !occ(r - 1, c) && occ(r + 1, c);
      if (startWaag || startSenk) {
        nr++;
        nummern[r]![c] = nr;
        startNr.set(`${r},${c}`, nr);
      }
    }
  }

  const platzierungen: KreuzwortPlatzierung[] = placed
    .map((p) => {
      const zeile = p.r - minR;
      const spalte = p.c - minC;
      return {
        nr: startNr.get(`${zeile},${spalte}`) ?? 0,
        wort: p.wort, hinweis: p.hinweis, richtung: p.dir.richtung, zeile, spalte,
      };
    })
    .sort((a, b) => a.nr - b.nr || (a.richtung === b.richtung ? 0 : a.richtung === 'waagrecht' ? -1 : 1));

  return { zeilen, spalten, belegung, nummern, platzierungen };
}

// ===========================================================================
// Wortgitter (Wortsuchrätsel)
// ===========================================================================

export type WortgitterRichtung = 'waagrecht' | 'senkrecht' | 'diagonal';

export interface WortgitterPlatzierung {
  wort: string;
  richtung: WortgitterRichtung;
  zeile: number;
  spalte: number;
}

export interface Wortgitter {
  zeilen: number;
  spalten: number;
  /** belegung[r][c] = Großbuchstabe (immer gefüllt — auch Füllbuchstaben). */
  belegung: string[][];
  /** Zu suchende Wörter (normalisiert). */
  woerter: string[];
  platzierungen: WortgitterPlatzierung[];
}

// Kleiner seed-stabiler PRNG (lokal, kein Import aus index → kein Zyklus).
function rngFromSeed(seed: string): () => number {
  let a = 0;
  for (let i = 0; i < seed.length; i++) a = (a + seed.charCodeAt(i)) | 0;
  a = a >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) | 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WG_DIRS: { dr: number; dc: number; richtung: WortgitterRichtung }[] = [
  { dr: 0, dc: 1, richtung: 'waagrecht' },
  { dr: 1, dc: 0, richtung: 'senkrecht' },
  { dr: 1, dc: 1, richtung: 'diagonal' },
];
const FUELL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function baueWortgitter(woerterRoh: string[]): Wortgitter {
  // 1. normalisieren, zu kurze entfernen, Dubletten raus
  const seen = new Set<string>();
  const woerter: string[] = [];
  for (const w of woerterRoh) {
    const n = normalisiereWort(w);
    if (n.length < 2 || seen.has(n)) continue;
    seen.add(n);
    woerter.push(n);
  }
  if (woerter.length === 0) {
    return { zeilen: 0, spalten: 0, belegung: [], woerter: [], platzierungen: [] };
  }
  // längste zuerst (deterministisch), dann alphabetisch
  woerter.sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0));

  const seed = woerter.join('|');
  const longest = woerter[0]!.length;
  const sumLen = woerter.reduce((s, w) => s + w.length, 0);
  const startSize = Math.max(longest, Math.ceil(Math.sqrt(sumLen) * 1.5));

  // Bei Misserfolg Gitter vergrößern (bis Obergrenze), damit kein Wort verloren geht.
  for (let size = startSize; size <= longest * 2 + 6; size++) {
    const ergebnis = versuchePlatzierung(woerter, size, seed);
    if (ergebnis) return ergebnis;
  }
  // Fallback (sollte praktisch nie eintreten): größtmögliches Gitter.
  return versuchePlatzierung(woerter, longest * 2 + 6, seed)
    ?? { zeilen: 0, spalten: 0, belegung: [], woerter, platzierungen: [] };
}

function versuchePlatzierung(woerter: string[], size: number, seed: string): Wortgitter | null {
  const rng = rngFromSeed(`${seed}#${size}`);
  const grid: (string | null)[][] = Array.from({ length: size }, () => Array<string | null>(size).fill(null));
  const platzierungen: WortgitterPlatzierung[] = [];

  for (const wort of woerter) {
    // alle gültigen (dir, r, c) sammeln, deterministisch mischen, erste passende nehmen
    const kandidaten: { dr: number; dc: number; richtung: WortgitterRichtung; r: number; c: number }[] = [];
    for (const d of WG_DIRS) {
      const maxR = d.dr === 0 ? size - 1 : size - wort.length;
      const maxC = d.dc === 0 ? size - 1 : size - wort.length;
      for (let r = 0; r <= maxR; r++) {
        for (let c = 0; c <= maxC; c++) kandidaten.push({ ...d, r, c });
      }
    }
    // Fisher-Yates mit seed-RNG
    for (let i = kandidaten.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = kandidaten[i]!; kandidaten[i] = kandidaten[j]!; kandidaten[j] = tmp;
    }
    let platziert = false;
    for (const k of kandidaten) {
      let ok = true;
      for (let n = 0; n < wort.length; n++) {
        const cur = grid[k.r + k.dr * n]![k.c + k.dc * n];
        if (cur !== null && cur !== wort[n]) { ok = false; break; }
      }
      if (!ok) continue;
      for (let n = 0; n < wort.length; n++) grid[k.r + k.dr * n]![k.c + k.dc * n] = wort[n]!;
      platzierungen.push({ wort, richtung: k.richtung, zeile: k.r, spalte: k.c });
      platziert = true;
      break;
    }
    if (!platziert) return null; // Gitter zu klein → Aufrufer vergrößert
  }

  // Leere Zellen mit Füllbuchstaben füllen (deterministisch).
  const belegung: string[][] = grid.map((row) =>
    row.map((cell) => cell ?? FUELL_ALPHABET[Math.floor(rng() * FUELL_ALPHABET.length)]!),
  );
  return { zeilen: size, spalten: size, belegung, woerter, platzierungen };
}

import type { LlmProvider } from './types';
import type { PoolEntry } from './pool';

export type ProfileLand = 'AT' | 'CH' | 'DE';

export interface LehrerProfil {
  displayName: string;
  land: ProfileLand;
  regionAt: string;
  regionCh: string;
  regionDe: string;
  schulform: string;
  faecher: string[];
  schulstufen: number[];
  aufgabenformate: string[];
  standardProvider: LlmProvider | string;
  standardModel: string;
  standardKreativitaet: number;
  exportDocx: boolean;
  exportPdf: boolean;
  exportLoesung: boolean;
  exportErwartungshorizont: boolean;
  updatedAt: string;
}

export const DEFAULT_LEHRER_PROFIL: LehrerProfil = {
  displayName: '',
  land: 'AT',
  regionAt: '',
  regionCh: '',
  regionDe: '',
  schulform: '',
  faecher: [],
  schulstufen: [],
  aufgabenformate: [],
  standardProvider: 'mistral',
  standardModel: 'Mistral Medium 3.5',
  standardKreativitaet: 0.4,
  exportDocx: true,
  exportPdf: false,
  exportLoesung: true,
  exportErwartungshorizont: false,
  updatedAt: '',
};

let cachedProfile: LehrerProfil | null | undefined;

function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
}

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(command, args);
}

export async function loadTeacherProfile(force = false): Promise<LehrerProfil | null> {
  if (!isTauri()) return null;
  if (!force && cachedProfile !== undefined) return cachedProfile;
  cachedProfile = await invoke<LehrerProfil | null>('profil_get');
  return cachedProfile;
}

export async function saveTeacherProfile(profile: LehrerProfil): Promise<void> {
  if (!isTauri()) throw new Error('Profile können nur in der Desktop-App gespeichert werden.');
  await invoke('profil_save', { profile });
  cachedProfile = profile;
}

export function clearTeacherProfileCache(): void {
  cachedProfile = undefined;
}

/** Stable Sortierung: Profilfächer zuerst, bestehende Reihenfolge sonst unverändert. */
export function sortPoolByProfileSubjects(entries: PoolEntry[], subjects: string[]): PoolEntry[] {
  if (subjects.length === 0) return entries;
  const preferred = new Set(subjects);
  return entries
    .map((entry, index) => ({ entry, index, preferred: preferred.has(entry.fach) }))
    .sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.index - b.index)
    .map(({ entry }) => entry);
}

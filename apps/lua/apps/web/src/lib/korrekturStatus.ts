export type KorrekturStatusCode =
  | 'ready_bundled'
  | 'ready_python'
  | 'sidecar_missing'
  | 'sidecar_unstartable';

export interface KorrekturStatus {
  available: boolean;
  mode: 'bundled' | 'python' | 'unavailable';
  code: KorrekturStatusCode;
  label: string;
  diagnostic?: string;
}

export function isKorrekturReady(status: KorrekturStatus | null): boolean {
  return status?.available === true && (status.code === 'ready_bundled' || status.code === 'ready_python');
}

export function korrekturStatusTone(status: KorrekturStatus | null): 'pending' | 'success' | 'error' {
  if (!status) return 'pending';
  return isKorrekturReady(status) ? 'success' : 'error';
}


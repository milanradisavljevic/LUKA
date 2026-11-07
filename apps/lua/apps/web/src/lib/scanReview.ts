export interface ScanReviewIssue {
  id: string; page: number; old: string; box: number[] | null;
  candidates: string[]; status: 'matched' | 'corrected' | 'open' | 'resolved' | 'unreadable';
  replacement?: string; decision?: boolean;
}
export interface ScanReviewSummary { openCount: number; numericBlocked: boolean; issues: ScanReviewIssue[] }
export interface ScanReviewSession {
  id: string; source: string; sourceHash: string; revision: number;
  state: 'preparing' | 'dirty' | 'ready'; pages: {seite:number;text:string}[];
  issues: ScanReviewIssue[];
  analysis: {zusammenfassung?:string; fehler?:{zitat:string;korrektur:string;typ:string}[]; scan_review?:ScanReviewSummary};
}

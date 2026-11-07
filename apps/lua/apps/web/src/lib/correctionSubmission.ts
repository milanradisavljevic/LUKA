export type SubmissionCheck = { visionModus: boolean; visionFaehig: boolean };

export function isSubmissionReady(check: SubmissionCheck | null | undefined): boolean {
  return Boolean(check && !check.visionModus && check.visionFaehig);
}

/** Dieselbe Freigabe fuer Uebersicht, Navigation und Korrekturstart. */
export function correctionSubmissionBlocker(input: {
  files: readonly string[];
  checks: Record<string, SubmissionCheck | null | undefined>;
  readingScan: boolean;
  reviewingScan: boolean;
  checkingFiles: boolean;
}): string | null {
  if (input.readingScan) return 'Der Scan wird noch verarbeitet. Bitte kurz warten.';
  if (input.reviewingScan) return 'Die ausgelesene Abschrift ist noch nicht bestätigt. Bitte in Schritt 4 prüfen und „Geprüfte Abschrift verwenden“ wählen.';
  if (input.checkingFiles) return 'Die Dateiprüfung läuft noch. Bitte kurz warten.';
  if (!input.files.length) return 'Bitte mindestens eine Abgabe auswählen.';
  if (input.files.some(file => !input.checks[file])) return 'Die Dateiprüfung ist noch nicht abgeschlossen. Bitte die Abgaben in Schritt 4 prüfen.';
  if (input.files.some(file => input.checks[file]?.visionModus)) return 'Mindestens eine Scan-Abschrift ist noch nicht bestätigt. Bitte den Scan in Schritt 4 auslesen, prüfen und „Geprüfte Abschrift verwenden“ wählen.';
  if (input.files.some(file => !isSubmissionReady(input.checks[file]))) return 'Mindestens eine Abgabe kann mit dem gewählten Anbieter nicht verarbeitet werden. Bitte die Abgaben in Schritt 4 prüfen.';
  return null;
}

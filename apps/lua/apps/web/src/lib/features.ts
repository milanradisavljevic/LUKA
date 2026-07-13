// Feature-Flags für die schrittweise Rollout-Phasen.
// Korrektur-Modul aktiv; benötigt gebündeltes Sidecar oder lokale
// Python-Installation — ohne beides zeigen die Views „Nicht verfügbar“.
export const FEATURES = {
  natascha: true,
  // Fachbezogene Atmosphäre: codebasierte Rand-Glyphen + Linienflüsse je Fach.
  // Vor Release weiter im echten Windows-Build (WebView2+GPU) sichtprüfen.
  murals: true,
} as const;

// Feature-Flags für die schrittweise Rollout-Phasen.
// Phase 0 = Generator-only (kein NATASCHA).
export const FEATURES = {
  natascha: true,
  // Fachbezogene Atmosphäre: codebasierte Rand-Glyphen + Linienflüsse je Fach.
  // Vor Release weiter im echten Windows-Build (WebView2+GPU) sichtprüfen.
  murals: true,
} as const;

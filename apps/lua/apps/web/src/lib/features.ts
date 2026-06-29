// Feature-Flags für die schrittweise Rollout-Phasen.
// Phase 0 = Generator-only (kein NATASCHA).
export const FEATURES = {
  natascha: false,
  // Fachbezogene Ambient-Murals. AUS, bis echte Bilder je Fach vorliegen und im
  // echten Windows-Build (WebView2+GPU) geprüft sind. In der WSLg-Dev-WebView
  // (Software-Render) erzeugt der vollflächige Hintergrund Geisterbilder.
  murals: false,
} as const;

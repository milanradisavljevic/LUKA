# LUKA — Next Steps (Stand 2026-06-24)

## Status: Lehrplan-Maximalprinzip ✅ KOMPLETT
- **Welle 0** (Fundament): `KOMPETENZBEREICHE` je Fach, `stoffkatalog/`-Ordnerstruktur,
  KompetenzView-Gruppierung, Ehrlichkeits-Vermerk, Integritätstests. (`637d211`)
- **Welle 1** (Sprachfächer FR/ES/IT/Latein + D/E erweitert), Chief-reviewt + FR-Kompetenz-Smoke. (`a714d21`, `fd580f0`)
- **qa-Korrekturraster** für Sachfächer (Quellenanalyse / Materialinterpretation / Sacherörterung). (`6656268`)
- **Welle 2** (6 Sachfächer-Kataloge), Chief-reviewt + Geschichte-Kompetenz-Smoke. (`73fafd1`, `ee14e6f`)
- Alles grün: Schema 127 · LLM 126 · Renderer 38 · Input 17 · QA 101 · Web 64. Live-verifiziert (FR + Geschichte Kompetenzpfad, DeepSeek).
- Kataloge sind **kuratierte Entwürfe** (`quelle` ehrlich; UI + DOCX tragen den Vermerk).

## Offen beim User — App-Sichtprüfung (Tauri, nicht headless testbar)
- Neue Fächer im Dropdown (Schritt „Absicht" + Kompetenz-Modus), gruppiert Sprach-/Sachfächer.
- Kompetenz-Modus pro Sachfach: StoffItems nach Bereich gruppiert, Generierung + Kompetenznachweis.
- Drag-&-Drop-Korrektur-Upload, Differenzierung-Akkordeon, Selbsteinschätzungsbogen, Kein-Key-Warnung.
- `natascha-stable`-Branch = eingefrorener Snapshot für Natascha.

## Next (priorisiert)
1. **🟦 SRDP-Matura-Modus** (Chief, groß) — Oberstufen-Killer. Neues Renderer-Template im
   BMBWF-Format, SRDP-Aufgabenstruktur, Synergie mit NATASCHAs 15 SRDP-Subkriterien.
2. **Kataloge: Entwurf → echte BMBWF-Quelle** (optional, Genauigkeit) — Kimi strukturiert,
   sobald du echte Lehrplan-Texte/PDFs lieferst; dann `quelle`/`code` echt setzen + Vermerk entfernen.
3. **🟩 UX-Politur-Reste** (Kimi) — Empty-States übrige Views; Quick-Übung als echter 1-Screen-Modus.
4. **🟦 In-App-Angabe-Erfassung** (Chief, Rust+UI) — voll-automatischer In-App-Closed-Loop
   (Ausgangstext bei der In-App-Analyse erfassen).
5. **GO-TO-MARKET** (`docs/GO-TO-MARKET.md`, geparkt) — wenn Funktionsumfang reif: Signing,
   Auto-Updater, Landing, Rechtstexte.

## Empfehlung
SRDP als nächster Chief-Brocken (höchster Oberstufen-Mehrwert, nutzt vorhandene NATASCHA-Kriterien).
UX-Politur parallel an Kimi. Katalog-Verfeinerung nur mit echten Lehrplan-Quellen sinnvoll.

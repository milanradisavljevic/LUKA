# Fahrplan und Zustaendigkeiten

Stand: 2026-06-01. Dieser Plan loest den alten Iterationsplan ab. Bezugsdokumente:
`produktvision.md`, `tauri-architektur.md`, `datenmodell-erweiterung.md`.

## Coding-Agents

- Claude Code: Rust- und Tauri-Kern, Schema, Renderer, PDF, Raster-Konsolidierung,
  spaeter Korrektur-Kern. Die harte, ownership-kritische Arbeit.
- Kimi: Frontend-Abläufe (Absicht-Eingabe, Vorschau, Baukasten als Werkstatt, Vorlagen).
- OpenCode #1: die direkten Anbieter-Adapter (soweit in TS/Tests verbleibend).
- OpenCode mit DeepSeek/MiMo (Lane fuer einfache Arbeiten des Nutzers): klar
  abgegrenzte, risikoarme Tasks mit fertiger Spezifikation. Siehe Lane unten.

## Phasen

### Phase A — Tauri-Fundament (Owner: Claude Code)
- Tauri 2 ins Repo scaffolden, Vite-Frontend andocken.
- Rust-Kommando `llm_complete` mit direkten Adaptern, sichere Schluesselablage,
  Erststart-Maske fuer Schluessel.
- `useGenerate` ruft `invoke` statt `fetch`. Der "process is not defined"-Fehler ist weg.
- Ergebnis: `npm run tauri dev` laeuft, echte Generierung funktioniert.
- Gate Natascha: erster echter Lauf am Desktop.

### Phase B — Absicht zuerst (Owner: Kimi Frontend, Claude Code Schema)
- Schema-Erweiterung nach `datenmodell-erweiterung.md` (Claude Code).
- Absicht-Eingabemaske vorne; Typ-Profil liefert das Skelett deterministisch;
  optionale Aufgabenarten-Auswahl ueberschreibt; sonst entscheidet die App.
- Baukasten wird zur Werkstatt hinter dem Entwurf. Vorlagen je Typ.
- Gate Natascha: sie erzeugt eine Schularbeit allein ueber die Absicht.

### Phase C — Anbieter, Korrektheit, Feinschliff (Owner: gemischt)
- Direkte Adapter fuer alle sechs Anbieter (OpenCode #1 / Claude Code in Rust).
- Die vier Korrekturen aus der Qwen-Review abarbeiten: Option B bewusst (eigenes
  Feld generiertesDokument, bereits erledigt), PDF ueber die Rust-Seite statt Browser,
  Raster-Duplikat aufloesen, erfundene Preise durch verifizierte ersetzen.
- Eingabe: Datei-Upload und URL ueber die Parser bzw. Rust.
- Lane-Tasks (DeepSeek/MiMo): siehe unten.

### Phase D — PDF und Korrekturraster sauber (Owner: Claude Code)
- PDF ueber das Rust-Kommando (LibreOffice), Fallback-Hinweis.
- Raster-Logik aus `packages/qa/src/korrekturraster/` nach `renderer` oder ein
  gemeinsames Paket konsolidieren, kein Duplikat, an die App anbinden.
- Gate Natascha: Dreierpaket Schueler, Loesung, Raster, plus PDF.

### Phase E — Nordstern: Korrektur-Lebenszyklus (Owner: Claude Code, Kimi)
- Scan und Texterkennung lokal, Auto-Abgleich geschlossener Aufgaben gegen die Loesung,
  KI-gestuetzte Bewertung offener Aufgaben gegen das Raster (lokal bzw. EU-Anbieter,
  ohne Schueleridentitaet), Notenschluessel, Feedback, Klassenauswertung.
- Schuelerdaten bleiben lokal. Eigene Datenschutzpruefung.
- Anschluss an das bestehende Natascha-Korrekturtool ueber das gemeinsame Datenmodell.

### Parallel/spaeter — Distribution
- Windows-Installer (MSI/NSIS), Code-Signing, Auto-Update. LibreOffice mitliefern
  oder PDF optional.

## Abhaengigkeiten

- Phase A ist der kritische Pfad und kommt zuerst (ohne lokale Rust-Seite laeuft nichts).
- Phase B braucht die Schema-Erweiterung.
- Phase C laeuft grossteils parallel zu B.
- Phase D braucht das generierte DocumentV1 (Phase A/B).
- Phase E ist die naechste Hauptphase nach der Uebergabe.

## Lane fuer einfache Arbeiten (OpenCode mit DeepSeek/MiMo)

Klar abgegrenzt, geringe Architektur-Risiken, fertige Spezifikation vorhanden:
- Modell-Info und Kosten in `models.ts` gegen die offiziellen Preisseiten verifizieren.
- Offizielle Anbieter-Logos statt der selbst gezeichneten einsetzen.
- Navigationsleiste aufraeumen: aktiven Punkt zeigen, Platzhalter als "bald verfuegbar"
  kennzeichnen statt nur ausgrauen.
- Arbeitsanweisungs-Platzhalter pro Blocktyp passend machen.
- Leerzustaende und kleine UI-Politur, Tippfehler.
- Zusaetzliche Tests fuer bestehende Pakete schreiben.

Nicht in dieser Lane: Rust/Tauri-Kern, Schema, Renderer, Korrektur-Kern.

# Changelog

Alle nennenswerten Änderungen an **lehr-suite** (NATASCHA × LUA Integration).
Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/).
Neueste Einträge oben. Bitte bei jeder substanziellen Änderung hier ergänzen
(auch andere Coding-Agents) — siehe `AGENTS.md`.

## [Unreleased]

### Changed — PDF-Export mit Speicher-Dialog statt Pfad-Tippfeld
- Der PDF-Export fragt den Zielort jetzt über den nativen Speichern-Dialog ab
  (Vorschlag aus Dokumenttitel und Datum) — kein Pfad-Eintippen mehr. Bestätigt
  die Lehrkraft im Dialog das Überschreiben, wird die vorhandene Datei ersetzt.
- Fehlt LibreOffice für die Konvertierung, erscheint eine verständliche
  Meldung mit Installationshinweis statt eines technischen Fehlers.

### Added — Qualitätspass: „Qualität schärfen" nach der Generierung
- Neuer Button in Schritt 4: Das Modell prüft das eigene Dokument als strenger
  Fachkollege (konkrete Schreibsituation? echter Textbeilagen-Bezug?
  beobachtbarer Erwartungshorizont statt Floskeln?) und liefert eine
  verbesserte Fassung samt 2–3 Änderungsnotizen, die angezeigt werden.
  Ein bewusst ausgelöster zusätzlicher Aufruf beim eigenen KI-Anbieter,
  einmal je Generierung.
- Die verbesserte Fassung durchläuft dieselbe Validierung wie die
  Erst-Generierung; Struktur, Block-Typen, ids und Textbeilagen-Verweise
  sind unveränderlich — der Pass darf nur Inhalte schärfen.

### Added — Fünftes Fachpaket „Englisch Oberstufe (CEFR)"
- `samples/fachpakete/luka-fachpaket-englisch-cefr-v1.json`: 6 Aufgaben —
  drei englische Schreibaufgaben (article, email, blog comment mit
  B1/B2-Niveau, fiktiver Textgrundlage und vierdimensionalem
  Erwartungshorizont) plus linking-words-Matching, Register-Kategorisierung
  und Lesestrategien-MC.

### Added — Startpaket an Bord: 29 Aufgaben per Klick in den Pool
- Die vier kuratierten Fachpakete reisen jetzt in der App mit (zur Build-Zeit
  eingebettet, Quelle bleibt `samples/fachpakete/`). Ist der Aufgaben-Pool
  leer, bietet er die Übernahme an: „29 geprüfte Aufgaben zum Start" — ein
  Klick, Erfolgsmeldung mit Anzahl, fertig.
- Kein Auto-Import, kein wiederkehrender Hinweis: Das Angebot erscheint nur
  bei leerem Pool; vorhandene Aufgaben werden nie überschrieben
  (INSERT OR IGNORE über den bestehenden, validierenden Import-Pfad).

### Changed — Hilfe und Anleitung auf aktuellen Feature-Stand (2026-07-12)
- Die Hilfe erklärt jetzt das Matura-Training im SRDP-Format für Deutsch/Oberstufe.
- Aufgaben-Pool-Organisation mit Favoriten, Qualitätsstatus, Herkunft, Filtern und Sortierung ist dokumentiert.
- Fachpaket-Import und -Export inklusive Validierung, Vorschau und Duplikatentscheidung sind in Hilfe und Anleitung nachvollziehbar beschrieben.

### Added — Viertes Fachpaket „Deutsch — Textsorten-Training Oberstufe"
- `samples/fachpakete/luka-fachpaket-deutsch-textsorten-v1.json`: 8 kuratierte
  Aufgaben — sechs Schreibaufgaben zu den SRDP-Textsorten (Erörterung,
  Kommentar, Leserbrief, Textanalyse, Textinterpretation, Zusammenfassung,
  jeweils mit fiktiver Textbeilage in der Angabe und vierdimensionalem
  Erwartungshorizont) plus Matching und Planungs-Tabelle über alle acht
  Textsorten. Ergänzt das Matura-Training auf der Content-Seite.

### Added — Matura-Training (SRDP-Format) für Deutsch/Oberstufe
- Neuer Einstieg in Step 0 (nur bei Deutsch + Oberstufe sichtbar): erzeugt
  eine textgebundene Einzelaufgabe im SRDP-Format — eine der acht gängigen
  Textsorten, 405–495 Wörter, Schreibsituation mit Bezug auf genau eine
  Textbeilage. Übungsformat, kein amtliches Prüfungsmaterial (steht so in
  der UI).
- Der Erwartungshorizont füllt die vier SRDP-Dimensionen strukturiert mit
  den 15 NATASCHA-Subkriterien; der Export nutzt das bestehende
  K1/K3-Korrekturraster. Die Generierung wird hart validiert (genau ein
  Schreibblock, Textsorten-Whitelist, exakter Wortumfang, Pflicht-Verweis
  auf die Textbeilage).
- Smoke-Test `scripts/srdp-smoke.mjs` deckt den Durchstich für Deutsch und
  den unveränderten Englisch-Matura-Pfad ab.

### Added — Neutraler Start-Hintergrund vor der Fachwahl
- Der Wizard startet jetzt mit dem neutralen Schreibtisch-Motiv und einer
  eigenen „LUKA-Start"-Farbpalette statt sofort das Deutsch-Mural (Schiller)
  zu zeigen. Das Fach-Mural erscheint erst, wenn ein Fach aktiv gewählt wird
  oder ein Dokument mit Kontext geladen ist (Auftrag, Blöcke, Quelltexte).
- Die Start-Grafik hat jetzt ihre eigene Deckkraft/Filterstufe in
  `murals.css` — sie war seit 1.0.3 wegen der fehlenden CSS-Klasse fast
  unsichtbar.

### Fixed — Update-Fenster: Formatierung der Release-Notes
- Das Update-Fenster zeigte rohes Markdown (`### `-Überschriften, Backticks)
  und brach lange Aufzählungspunkte an den CHANGELOG-Zeilenumbrüchen ab.
- Die Release-Notes-Extraktion liefert jetzt nur noch den „Das ist neu"-Block
  an Lehrkräfte (technische `### `-Abschnitte bleiben im CHANGELOG, Hinweis
  ersetzt sie); die doppelte „Das ist neu"-Zeile unter dem Dialog-Titel
  entfällt.
- `miniMarkdown` kann zur Absicherung jetzt auch `### `-Überschriften
  (fette Zeile), Inline-Code und eingerückte Fortsetzungszeilen von
  Listenpunkten; der Dialog rendert Inline-Code dezent als Code-Schnipsel.

## Version 1.0.4 — 2026-07-12

**Das ist neu:**

- **LUKA für den Mac ist da:** Das in Version 1.0.3 angekündigte
  macOS-Paket (Intel und Apple Silicon) wird jetzt wirklich mitgeliefert —
  der Mac-Build schlug in 1.0.3 noch fehl. Installationshinweise stehen im
  README und in der Anleitung. Für Windows ändert sich nichts.

### Fixed — macOS-Bundling scheiterte an Dev-Binaries
- `tauri build --target universal-apple-darwin` brach beim Bundling ab:
  Die Dev-Werkzeuge `seed_pool`, `import_keys` und `test_providers` lagen
  als `src/bin/`-Targets im Cargo-Manifest und wurden vom Tauri-Bundler in
  die App gepackt — beim Universal-Build wird aber nur das Haupt-Binary
  für beide Architekturen gebaut, die Zusatz-Binaries fehlten im
  universal-Ordner (`Failed to copy binary … test_providers`).
- Alle drei nach `src-tauri/examples/` verschoben (Aufruf jetzt
  `cargo run --example seed_pool` usw.) — Examples bundelt Tauri nie mit.
  Nebeneffekt: Auch der Windows-Installer liefert die Dev-Werkzeuge nicht
  mehr an Lehrkräfte aus.
- App-Version auf 1.0.4 (tauri.conf.json, Cargo.toml, Cargo.lock).

## Version 1.0.3 — 2026-07-12

**Das ist neu:**

- **Mein Profil** (Einstellungen): Gib einmal deine Fächer, Schulstufen und
  bevorzugten Einstellungen an — neue Unterlagen, das KI-Modell und der
  Aufgaben-Pool richten sich danach. Alles bleibt auf deinem Rechner.
- **Drei Fachpakete zum Importieren:** Startpaket plus zwei Ausbaupakete
  (Medien & Demokratie, Informatik & KI) — zusammen 21 kuratierte
  Oberstufen-Aufgaben. Der Import prüft Pakete jetzt vollständig, bevor
  sie deinen Pool verändern.
- **Aufgaben-Pool aufgeräumt:** Favoriten, eigener Qualitätsstatus
  (getestet/empfohlen), „Kuratiert"-Kennzeichnung mit Herkunft, dazu
  Filtern und Sortieren nach Herkunft, Status und letzter Verwendung.
- **Neues Update-Fenster:** Updates erscheinen jetzt im LUKA-Design und
  zeigen — so wie hier — was neu ist.
- **LUKA gibt es jetzt auch für den Mac** (Intel und Apple Silicon).
  Installationshinweise stehen im README und in der Anleitung.

### Added — Lokale Organisation im Aufgaben-Pool
- Der Aufgaben-Pool kann jetzt nach Herkunft und Qualitätsstatus gefiltert
  sowie nach Neuigkeit, letzter Verwendung oder Empfehlung sortiert werden.
- Aufgaben lassen sich lokal als Favorit markieren, als getestet/empfohlen
  kennzeichnen und beim Einfügen als zuletzt verwendet speichern.
- Diese Organisationsdaten bleiben lokal und werden nicht in das teilbare
  Pool-JSON exportiert. Beim Ersetzen eines Duplikats bleiben sie erhalten.

### Fixed — Pool-Karten bei schmalen Fenstern
- Die Aktionsleiste einer Pool-Karte bricht bei kleinen Fensterbreiten um; das
  rote Löschen-X bleibt dadurch innerhalb der Karte sichtbar.

### Added — Drittes Fachpaket und robuster Fachpaket-Import
- Das neue Fachpaket „Informatik & KI — Ausbaupaket" ergänzt sieben Aufgaben
  zu Passwörtern, Bias, Algorithmen, Datenspuren, Promptkritik und KI-Inhalten.
- Fachpaket-Dateien werden vor dem Import vollständig geprüft. Fehler werden
  verständlich angezeigt; ungültige Pakete verändern den lokalen Pool nicht.
- Der Export zeigt jetzt Anzahl und Speicherpfad an und bleibt mit dem
  bestehenden Pool-JSON-Format kompatibel.

### Added — Zweites Fachpaket „Medien & Demokratie" (v2)
- `samples/fachpakete/luka-fachpaket-medien-demokratie-v2.json`: 6 kuratierte
  Oberstufen-Aufgaben (Stufe 9–12) — personalisierte Feeds, Quellencheck,
  Medienformate, politische Online-Werbung, Redaktionskonferenz
  (Rollenkarten) und demokratische Beteiligung. Import wie gehabt über
  „Fachpaket importieren".

### Added — Herkunft im Aufgaben-Pool sichtbar
- Kuratierte Fachpaket-Aufgaben tragen in der Pool-Ansicht ein „Kuratiert"-
  Badge (Tag `redaktionell-kuratiert`); der Herkunftsvermerk (`quelleHinweis`)
  erscheint als zweizeilige Herkunftszeile auf der Karte, voller Text per
  Tooltip. Selbst gespeicherte Aufgaben bleiben unverändert.

### Added — Fachpaket-Validator (Tooling + CI)
- `scripts/validate-fachpakete.mjs` prüft `samples/fachpakete/*.json` gegen
  das Block-Schema (Pflichtfelder, doppelte ids, tags/blockJson-Parse mit
  Escaping-Hinweis, `typ`-Abgleich) und warnt bei ratbaren Antwortmustern.
  Läuft pfad-gefiltert in CI (`ci.yml`); AGENTS.md Goldene Regel 7 verlangt
  den Lauf vor jedem Fachpaket-Commit.

### Fixed — Fachpaket-Qualität
- Antwortmuster in beiden Paketen durchmischt (Multiple-Choice-Lösungen
  waren teils durchgängig „A", Matching-Zuordnungen liefen 1→A…6→F der
  Reihe nach — für Schüler:innen ratbar).
- v2-Paket: Musterlösung der Schreibaufgabe war wegen falsch escapter
  Zeilenumbrüche nicht ladbar; Rollenkarten-Set auf das Schema-Maximum von
  3 Rollen reduziert („Publikum" in die Chefredaktion gefaltet).

### Added — macOS-Build (unsigniert) in der Release-Pipeline
- `release.yml` baut jetzt per Matrix zusätzlich ein universelles
  macOS-Bundle (Intel + Apple Silicon, `--target universal-apple-darwin`)
  und veröffentlicht es im selben GitHub-Release; tauri-action merged die
  Plattform-Einträge in der `latest.json`. Windows-Build unverändert.
- Bewusst ohne Apple-Signing/Notarization (99 €/Jahr erst bei mehr
  Mac-Nachfrage); Updater-Artefakte bleiben minisign-signiert.
- README und `docs/ANLEITUNG.md`: neuer Installations-Abschnitt mit
  Gatekeeper-Anleitung (macOS 15: Systemeinstellungen → Datenschutz &
  Sicherheit → „Dennoch öffnen").
- Die Windows- und macOS-Builds aktualisieren das gemeinsame Release nun
  nacheinander, damit beide Plattformen zuverlässig veröffentlicht werden.

### Added — NATASCHA-Sidecar vorbereitet (im Pilot inaktiv)
- NATASCHA erhält einen dokumentierten Headless-CLI-/Sidecar-Build
  (PyInstaller, `build_sidecar.ps1`, `SIDECAR_BUILD.md`) mit synthetischem
  E2E-Test; der normale Generator-Build bleibt davon unberührt
  (`FEATURES.natascha` bleibt aus, externalBin nur über separate Config).
- Der CLI-Zugriff nutzt die gemeinsame Rust-definierte Datenbank, behebt
  `srdp-detail` per Abgabe-ID und bereitet Fortschritt, Timeout und Abbruch
  für die spätere NATASCHA-Aktivierung vor.

### Fixed — Neutrale Übersichts-Grafik (kein Fach gewählt) freigestellt
- Das Schreibtisch-Stillleben für „kein Fach ausgewählt" war ein JPG mit
  eingebackenem Papierhintergrund — sichtbare Rechteckkante, verwaschen,
  im Dark Mode ein invertierter Kasten. Jetzt freigestelltes transparentes
  WebP (Luminanz→Alpha, schwarze Tinte wie die Fach-Assets, Papierkorn per
  Rauschschwelle entfernt, auf das Motiv beschnitten), unten rechts verankert
  statt mittig schwebend. Sepia/Dark-Mode-Behandlung kommt unverändert aus
  `murals.css`.

### Added — Lokales Lehrerprofil (Phase 1)
- Neues lokal gespeichertes Lehrerprofil in der LUA-SQLite-Datenbank:
  Anzeigename/Kürzel, Land/Region, Schulform, Fächer, Schulstufen,
  Aufgabenformate, Standard-Provider/-Modell/-Kreativität und Exportvorgaben.
  Die Angaben bleiben auf dem Gerät; es gibt keinen Opt-in-Rückkanal und keine
  Community-Übertragung. Einstellungen haben dafür einen Abschnitt „Mein
  Profil", Wizard/Provider/Export übernehmen Profilwerte nur als Defaults für
  neue Unterlagen, und der Aufgaben-Pool sortiert Profilfächer stabil nach vorn.
- Sichtbarkeit der Profil-Wirkung nachgezogen: Dashboard-Begrüßung nennt den
  Anzeigenamen, Step 0 zeigt einen dezenten Hinweis, wenn Fach/Stufe vom
  Profil übernommen wurden, der Aufgaben-Pool markiert Einträge aus den
  Profil-Fächern mit „Dein Fach", und der Profil-Abschnitt in den
  Einstellungen erklärt kurz, was das Profil bewirkt.

### Added — Eigener Update-Dialog + Release-Notes im Updater
- Native `ask()`/`message()`-Dialoge beim Auto-Update ersetzt durch
  `UpdateDialog` im App-Design („Tinte & Papier"): zeigt Version, Release-
  Notes (`update.body`, kleines eigenes Markdown-Subset — Absätze,
  `- `-Listen, `**fett**` — kein npm-Paket), Fortschrittsbalken beim
  Herunterladen (`downloadAndInstall`-Events Started/Progress/Finished) und
  danach „Jetzt neu starten?" oder „Beim nächsten Start". Update-Logik jetzt
  als State-Maschine in `hooks/useUpdater.ts` (ersetzt `lib/updater.ts`);
  App.tsx rendert nur noch `<UpdateDialog updater={updater} />`.
  Update-Check-Fehler bleiben wie bisher bewusst stumm (nur console.warn) —
  ein fehlgeschlagener Check darf den Unterricht nie stören. Fehler beim
  aktiven Download werden dagegen im Dialog angezeigt (kurz, deutsch, mit
  Schließen-Option).
- Release-Workflow (`.github/workflows/release.yml`) extrahiert vor der
  `tauri-action` den obersten CHANGELOG-Abschnitt
  (`.github/scripts/extract-release-notes.mjs`) und übergibt ihn als
  `releaseBody`; tauri-action schreibt ihn als `notes` in `latest.json`, der
  Updater liefert das als `update.body` an den neuen Dialog. Fallback bei
  leerem/fehlendem Abschnitt: „Details im CHANGELOG."

## Version 1.0.2 — 2026-07-10

### Changed — Generator-only-Pilot (Version 1.0.2)
- `FEATURES.natascha` auf `false`: Sidebar, Dashboard-Karten, Befehlspalette,
  Hilfe-Kapitel und Einstellungen blenden die NATASCHA-Bereiche (Klassen,
  Korrektur, Schüler, Erwartungshorizont) für den Pilot aus; direkte Navigation
  auf verborgene Views fällt auf eine verfügbare Ansicht zurück.
  `visibleNavTargets()` ist jetzt parametrisierbar und per Test abgesichert
  (Flag aus → keine NATASCHA-Ziele, Flag an → wieder vollständig). Der
  Python-Korrekturport bleibt vollständig erhalten und wird später reaktiviert.
- `docs/ANLEITUNG.md` auf den Generator-Pilot umgeschrieben: kein Versprechen
  einer integrierten Korrektur mehr (nur ehrlicher „in Entwicklung"-Ausblick),
  Erste Schritte folgen dem neuen First-Run-Dialog, Startpaket- und
  Fachpaket-Import/Export dokumentiert, Datenschutz-Hinweis auf den
  Generierungs-Datenfluss angepasst.
- App-Version auf `1.0.2` (tauri.conf.json, Cargo.toml, Cargo.lock) für den
  nächsten Release-Tag `v1.0.2`; `.pnpm-store/` gitignored.

### Changed — README neu geschnitten + aktuelle Screenshots
- `README.md` auf den Generator-Pilot ausgerichtet: Installer-Download von den
  GitHub-Releases inkl. ehrlichem SmartScreen-Hinweis (kein Zertifikat im
  Pilot), Auto-Update erklärt, Highlights/Architektur/Datenschutz auf den
  Generierungs-Datenfluss aktualisiert; Korrektur-Assistent nur noch als
  „in Entwicklung"-Ausblick. Neue Screenshot-Galerie (7 Aufnahmen der
  aktuellen UI, `screenshots/`), Bildliste in `screenshots/README.md` gepflegt.

### Added — Kuratiertes Startpaket „Medien & Demokratie / Informatik & KI"
- `samples/fachpakete/luka-startpaket-medien-demokratie-informatik-ki-v1.json`:
  8 redaktionell geprüfte Aufgaben (5× Informatik und KI, 3× Medien und
  Demokratie) im `PoolEntry`-Format, direkt über „Aufgaben-Pool → Importieren"
  einspielbar. Herkunftsvermerk ehrlich als überarbeiteter KI-Entwurf
  deklariert, keine amtliche Lehrplankonformität behauptet.

### Fixed — Deutsch im Fach-Dropdown als Sprachfach gruppiert
- „Mit Quelltext" (Schritt Absicht) und Kompetenz-Übung zeigten Deutsch unter
  „Sachfächer". Deutsch steht jetzt in beiden Dropdowns unter „Sprachfächer";
  das Schema-Flag `sprachfach` bleibt bewusst `false`, weil es die
  Zielsprachen-Generierung (Prompts, Korrekturraster) steuert und Deutsch dort
  wie bisher deutschsprachig behandelt wird.

### Added — Fachpaket-Import/Export im Aufgaben-Pool (Roadmap: Pilot-Verteilung)
- Aufgaben-Pool hat jetzt „Importieren"/„Exportieren"-Buttons: Fachpakete
  (JSON, gleiches Format wie `seed_pool`/Generator-Skripte) lassen sich ohne
  Terminal einspielen und teilen. Import zeigt VOR dem Schreiben eine Vorschau
  (Anzahl, Fächer, Herkunftsvermerke, Duplikate); bei Duplikaten wählt die
  Lehrkraft explizit „Ersetzen" oder „Behalten".
- Neue Tauri-Commands `pool_import_preview`/`pool_import`/`pool_export`
  (`commands/pool.rs`), Kernlogik als testbare Funktionen — 5 neue Rust-Tests
  (Vorschau-Zählung, Duplikat-Verhalten beide Modi, Datei-Roundtrip,
  Fehlertext bei kaputter Datei). Frontend: `lib/poolTransfer.ts` + PoolView.

### Added — First-Run-Onboarding mit API-Key-Provider-Test
- First-Run-Gate in LUA führt jetzt durch API-Key-Eingabe plus echten
  Provider-Verbindungstest; das Gate schließt erst nach erfolgreichem Test und
  startet fail-closed. Der Test läuft über den neuen dedizierten Command
  `test_provider_connection` (20-Sekunden-Timeout, 16-Token-Budget) und prüft
  den eingegebenen Key, **bevor** er gespeichert wird — ein Tippfehler
  überschreibt keinen gültigen Key mehr; Verifikation gilt pro Provider. Die
  Einstellungen trennen „Gespeicherten Key anzeigen" und „Verbindung testen"
  klarer.
- Provider-Key-Mapping vereinheitlicht: Claude speichert/testet runtime-seitig
  unter `anthropic`; alte unter `claude` gespeicherte Keys werden beim Setup
  bzw. im LLM-Schritt still auf die neue ID migriert.
- First-Run-Flow pilot-tauglicher gemacht: Mistral wird als EU-Startanbieter
  empfohlen, jede Provider-Karte verlinkt zur Key-Erstellung, der Test nutzt
  explizite Testmodelle und unterscheidet Key-, Netzwerk-, Rate-Limit/Guthaben-
  und Modellfehler. Nach erfolgreichem Test erscheint ein „LUKA ist bereit"-
  Abschluss statt eines abrupten Schließens.
- Der Abschluss führt jetzt direkt in den Wizard „Neue Unterlage" und zeigt dort
  eine kurze Erststart-Orientierung für Thema, Fach/Stufe und Material, statt
  die Lehrkraft nach dem Key-Setup in der Übersicht stehenzulassen.

### Changed — Version 1.0.1 für Updater-Test
- App-Version in `tauri.conf.json`, `Cargo.toml` und `Cargo.lock` auf `1.0.1`
  erhöht, damit GitHub Release/Updater-Artefakte per Tag `v1.0.1` gebaut
  werden können.

### Fixed — CI: Tauri-cargo-check baut Frontend-Dist vor Rust-Check
- `.github/workflows/ci.yml`: Der Rust-Job installiert jetzt Node/pnpm und baut
  `@lehrunterlagen/web`, bevor `cargo check` startet. Tauri
  `tauri::generate_context!()` validiert `frontendDist`
  (`apps/lua/apps/web/dist`) bereits beim Kompilieren; ein nackter frischer
  Checkout ohne Web-Build bricht deshalb mit
  "`frontendDist` ... but this path doesn't exist" ab.

### Changed — docs-Hygiene: interne Dokumente nicht mehr im öffentlichen Repo
- `docs/*` ist jetzt gitignored (Whitelist: `ANLEITUNG.md`, `DATENSCHUTZ.md`,
  `invarianten.md`, `szenarien.md`, `lehrplan-quellen/`) — Pläne, Strategien,
  Reviews und Handoffs bleiben lokal, das Repo ist öffentlich. 31 bisher
  versionierte Arbeitsdokumente wurden aus dem Index entfernt (Dateien bleiben
  lokal erhalten; Historie enthält sie weiterhin). Regel: `AGENTS.md`,
  Goldene Regel 5. Neue Produktwellen-Pläne (Masterplan Profile/Community/
  CH/DE/IB, Stand 2026-07-09) liegen entsprechend nur noch lokal in `docs/`.

### Changed — App-Name trägt jetzt die Marke
- `productName`: „Lehrunterlagen-Tool" → **„LUKA - Lehrunterlagen-Tool"**
  (Windows-Appliste/Startmenü/Installer). `identifier` bleibt unverändert
  (`com.lehrunterlagen.tool`) → App-Daten/DB-Pfad bleiben erhalten.
  Alte „Lehrunterlagen-Tool"-Installation (0.1.0) bitte manuell deinstallieren.

### Added — Auto-Updater + Release-Pipeline (Roadmap-Punkt 1, Lean-Strategie)
- In-App-Updater (`tauri-plugin-updater` + `tauri-plugin-process`): App prüft
  5 s nach Start still auf neue GitHub-Releases (signiert, Pubkey in
  `tauri.conf.json`), fragt auf Deutsch nach, installiert, bietet Neustart an.
  Fehler (offline etc.) werden bewusst verschluckt (`apps/web/src/lib/updater.ts`).
- Release-Workflow `.github/workflows/release.yml`: Versions-Tag (`v*`) pushen →
  Windows-NSIS-Installer wird gebaut, Update-Artefakte signiert
  (Secret `TAURI_SIGNING_PRIVATE_KEY`), GitHub Release + `latest.json`
  veröffentlicht. Bewusst nur NSIS (MSI kann nicht in-place updaten).
- Version vereinheitlicht auf **1.0.0** (`tauri.conf.json` + `Cargo.toml` waren
  0.1.0, Sidebar zeigte hartkodiert „v1.0.0-beta") — Sidebar liest die Version
  jetzt live via `getVersion()` aus Tauri, Fallback „dev" im Browser.

### Fixed — A7 Mistral-Rate-Limit-Backoff
- `packages/llm/src/provider-openai-compat.ts`: OpenAI-kompatible Provider
  (Mistral/DeepSeek/Qwen) retryen HTTP 429 und 5xx jetzt mit maximal drei
  Wiederholungen, exponentiellem Backoff (2s/4s/8s) und `Retry-After`-Respekt.
  Fehlertexte nach ausgeschöpften Versuchen bleiben unverändert. Siehe
  `docs/REVIEW-aufgabenpool-neue-faecher-2026-07.md` Fund A7.

### Changed — A6 Nationalratsdebatte mit Parlamentsmechanik
- `scripts/generate-aufgabenpool-draft.mjs`: Die Kombi
  `Nationalratsdebatte-Simulation` fordert jetzt echte Nationalratsmechanik ein
  (Lesungen, Ausschuss, Redeordnung/Redezeit, Präsident:in, Klubs/Klubzwang,
  Abstimmung), statt nur eine generische Pro/Contra-Debatte zu rahmen. Siehe
  `docs/REVIEW-aufgabenpool-neue-faecher-2026-07.md` Fund A6.

### Added — Strategie-Beschluss Lean-Nebenerwerb + erster Windows-Build
- `docs/STRATEGIE-lean-nebenerwerb-2026-07.md`: beschlossene Leitplanken
  (App gratis+BYOK+lokal, Monetarisierung über Content-Fachpakete via
  Merchant-of-Record, SaaS/Pool-API verworfen), Roadmap 1–6 mit Arbeitsteilung,
  fertiger Codex-Prompt für A6/A7 (Mistral-429-Backoff, Parlamentsmechanik
  in der Debatten-Kombi).
- Erster erfolgreicher Windows-Build: NSIS-Setup + MSI via WSL→Windows-Interop
  (`powershell.exe`), VS Build Tools per winget nachinstalliert. Echtes
  App-Icon (kursives L, Playwrite AT) hatte 1×1-Platzhalter ersetzt,
  `bundle.icon`-Array in `tauri.conf.json` ergänzt (Commit `3e3c3a3`).

### Fixed — Review-Funde A1+A2 aus docs/REVIEW-aufgabenpool-neue-faecher-2026-07.md
- **A1 (kritisch):** `scripts/generate-aufgabenpool-draft.mjs` setzte für ALLE Kombis
  `modus: 'kompetenz'`, auch für die eine Kombi mit vorgegebenem Quelltext
  ("Quellenkritik an einem Beispieltext", mediendemokratie). Kompetenz-Modus
  verwirft `quelltexte` architektonisch (`packages/llm/src/prompt.ts`: „Es gibt
  KEINE Quelltexte, du ERFINDEST die Inhalte selbst") — das Modell ignorierte den
  vorgegebenen Text komplett und erfand einen anderen. Fix: `modus` jetzt dynamisch
  (`kombi.quelltext ? 'text' : 'kompetenz'`).
- **A2 (kritisch):** `packages/llm/src/prompt.ts` — `spracheHinweis` griff nur bei
  `istSprachfach(fach)`. Für Nicht-Sprachfächer (alle Sachfächer inkl. der zwei
  neuen) gab es NIE eine explizite „Schreib auf Deutsch"-Instruktion; das englische
  Beispiel in `BLOCK_REGELN` (rollenkartenSet) wirkte ohne Gegenanweisung als
  Sprach-Anker. Folge im Live-Test: ein kompletter englischsprachiger
  `roleplay`-Block (informatikki) und englische Redemittel in einer
  Nationalratsdebatte (mediendemokratie). Fix: expliziter Deutsch-Hinweis auch für
  Nicht-Sprachfächer (bislang stillschweigend auf German-by-default verlassen —
  betrifft potenziell auch bestehende Sachfächer bei fachfremd/englisch-kodierten
  Themen, nicht nur die zwei neuen Fächer).
- Verifiziert: llm-Paket build + 132/132 Tests grün (keine gepinnte Assertion
  betroffen), Generator-Dry-Run weiterhin 12/12 Kombis strukturell sauber.

### Added — Aufgabenpool-Draft-Review für Medien/Demokratie und Informatik/KI (Phase C, Review)
- Bulk-Pipeline (`scripts/generate-aufgabenpool-draft.mjs`) real gegen beide
  LLM-Provider gefahren: DeepSeek 12/12 Kombis (14 PoolEntries), Mistral nur
  3/12 (reproduzierbares Hard-Rate-Limit nach exakt 3 Requests, siehe Review).
  Rohdateien bewusst nicht committet (`scripts/out/` via `.gitignore`).
- Kritischer Review-Bericht: **`docs/REVIEW-aufgabenpool-neue-faecher-2026-07.md`**.
  Zwei strukturelle Funde vor dem nächsten Seeding-Lauf zu fixen: (1)
  Kompetenz-Modus verwirft `quelltexte` komplett (`prompt.ts` `kompetenzUser`
  hat kein `quelltexte`-Feld) → quelltextgebundene Kombis (`markieraufgabe`/
  `offeneVerstaendnisfrage`) erzeugen inhaltlich inkonsistente Blöcke; (2)
  `spracheHinweis` greift nur bei `istSprachfach(fach) === true` → für die
  neuen Nicht-Sprachfächer fehlt jede „schreib auf Deutsch"-Instruktion, was
  bei `rollenkartenSet`/`roleplay` zu Englisch-Leck führt (Beleg bei beiden
  Providern). Fachliche Trace-Tabelle bei informatikki rutscht bereits jetzt
  in echte Code-Syntax (`print(a)`, `a = a + b`) — frühes Signal für die
  V2-Entscheidung „eigener Code-Blocktyp". Renderer selbst fehlerfrei
  (2 Test-DOCX über `scripts/render-pool-draft-sample.mjs`, neu, crashfrei).

### Added — Fachatmosphäre für Medien/Demokratie und Informatik/KI
- Neue Lineart-Cluster-Assets für `mediendemokratie` und `informatikki`
  ergänzt und in `SubjectAtmosphere` verdrahtet. Die Motive bleiben im
  bestehenden ruhigen Mural-Stil: Medien/Demokratie als Quellenprüfung,
  Öffentlichkeit und demokratische Debatte; Informatik/KI als Algorithmik,
  Datenstrukturen, KI-Netz und Datenschutz.
- `subjectThemes.json` um eigene gedämpfte Fachpaletten erweitert, damit beide
  neuen Fächer nicht mehr nur das generische Feldlinien-Fallback verwenden.

### Added — Recherche-Content für Medien/Demokratie und Informatik/KI (Codex)
- `docs/lehrplan-quellen/{mediendemokratie,informatikki}_stufen.json` ergänzt:
  schulstufengenaue Arbeitsentwürfe für die AHS-Oberstufe (9.–12. Schulstufe)
  mit den bindenden Kompetenzbereich-Namen aus dem Schema. Alle Deskriptoren
  sind bewusst als nicht-amtlicher LUKA-Arbeitsentwurf markiert, da die
  Lehrplan-Verordnung bei Erstellung noch ausstand (07/2026).
- Stoffkataloge für beide Fächer aus den Recherche-Dateien generiert und im
  Kompetenz-Modus registriert; keine `*_oberstufe.json`-Duplikate und keine
  Aufgabenpool-Seeding-Schritte in dieser Phase.

### Added — Fundament für zwei neue AHS-Pflichtfächer 2026/27 (Phase A + C, Sonnet)
- Kontext: Nationalrat hat am 07.07.2026 die Pflichtfächer **„Medien und
  Demokratie"** (`mediendemokratie`) und **„Informatik und Künstliche
  Intelligenz"** (`informatikki`) beschlossen (Start Schuljahr 2026/27);
  Lehrplan-Verordnung existiert noch nicht. Details/Aufteilung:
  `docs/PLAN-neue-faecher-2026-07.md`. Diese Änderung ist **Phase A + C**
  (Architektur/Fundament + Bulk-Pool-Pipeline); Phase B (Recherche-Content)
  folgt separat durch Codex und referenziert die hier festgelegten
  Kompetenzbereich-Namen wortgleich.
- `packages/schema/src/index.ts`: `FachSchema` um beide Fächer erweitert,
  `FACH_META`-Einträge (`sprachfach: false`, `zielsprache: 'Deutsch'`).
  **Bindende** `KOMPETENZBEREICHE`-Namen (nicht mehr ändern, Codex referenziert
  sie wortgleich):
  - `mediendemokratie`: „Medienkompetenz & Quellenkritik", „Politische Bildung
    & Demokratieverständnis", „Kommunikation & Meinungsbildung"
  - `informatikki`: „Algorithmisches Denken", „KI-Grundlagen & Ethik",
    „Datenschutz & Cybersecurity"
- `packages/qa/src/korrekturraster/{kataloge.ts,builder.ts}`: neuer Katalog
  `MEDIENQUELLENANALYSE` (Wortlaut-Adaption von `QUELLENANALYSE`: „Quelle" →
  „Medienquelle/Post", „Autor/in" → „Urheber/Plattform") für
  `fach === 'mediendemokratie'` bei `offeneSchreibaufgabe`. `informatikki`
  nutzt bewusst den bestehenden generischen Fallback (kein eigener Zweig).
- `scripts/generate-stoffkatalog-from-research.mjs`: `FACH_CODE`-Map um `md`
  (mediendemokratie) und `ik` (informatikki) erweitert. Hinweis (vorbestehend,
  nicht durch diese Änderung verursacht): der Skript-Default für `--input`
  löst auf das Repo-Root auf, nicht auf `docs/lehrplan-quellen/` — Aufruf
  ohne `--input ../../docs/lehrplan-quellen` findet aktuell **keine**
  Recherche-Dateien (auch nicht die 12 bestehenden). Mit explizitem
  `--input`-Flag laufen alle 12 bestehenden Fächer unverändert durch
  (Regeneration ist byte-identisch zum committeten Stand); die zwei neuen
  Fächer werden mangels JSON-Datei einfach übersprungen (kein Crash,
  kein Datenverlust — Codex liefert die Recherche-JSONs separat nach).
- `apps/web/src/components/SubjectAtmosphere.tsx`: minimale Pflicht-Einträge
  für beide neuen Fächer im exhaustiven `Record<Fach, SubjectAtmosphereSpec>`
  ergänzt (nur Feld-Linienmuster `archive`/`logic`, keine Assets — es existiert
  noch keine eigene Lineart-Illustration). War nötig, damit `apps/web` weiter
  typechecked/baut.
- Neu: `scripts/generate-aufgabenpool-draft.mjs` — Bulk-Pipeline (Muster:
  `scripts/llm-smoke.mjs` für Env/Key-Loading). Ruft `generateDocument` im
  Kompetenz-Modus (kein Quelltext-Pflicht, ein synthetisches StoffItem statt
  Katalog-Referenz) für 12 kuratierte Fach/Schulstufe/Thema/Aufgabentyp-Kombis
  auf (6 je neuem Fach, aus Plan-Phase B) und schreibt die erzeugten Blöcke als
  `PoolEntry`-JSON-Array (`quelleHinweis: "LLM-Entwurf, ungeprüft"`) nach
  `scripts/out/aufgabenpool-draft.json`. Provider/Modell per Env
  (`LLM_PROVIDER`/`LLM_MODEL`, Default `deepseek`); `--dry-run` prüft alle
  Kombis ohne API-Calls, `--only <fach>` filtert. Verifiziert per `--dry-run`
  und eigenständigem `buildMessages()`-Check (alle 12 Kombis erzeugen gültige
  Prompts) — noch **nicht** live mit echten API-Calls gelaufen (kostet Geld,
  nicht Teil der Pflicht-Verifikation); Review-Pass folgt vor dem Seeding.
- Neu: `src-tauri/src/bin/seed_pool.rs` — eigenständiges Rust-Binary (Muster:
  `src/bin/import_keys.rs`), liest einen reviewten PoolEntry-JSON-Pfad aus
  argv, öffnet die DB via `db::open_db()` (optional `--db-path` zum Testen/
  Sidecar-Aufruf) und INSERT OR REPLACE je Eintrag in `aufgabe_pool`. Manuell
  gegen eine isolierte Test-DB verifiziert (2 Test-Einträge korrekt inseriert,
  inkl. NULL-Felder). `cargo build` + `cargo test` grün (43 Tests, 2 ignoriert
  wie zuvor).
- Verifikation: Schema 145 Tests, Web 126 Tests, QA 103 Tests grün. Rust:
  `cargo build` + `cargo test` grün. `check_natascha_schema_sync.py` grün
  (nur LUA-eigenes `aufgabe_pool`/Schema berührt, NATASCHA-Schema unangetastet).

### Added — Klassen-Verwaltung: Fach/Schulstufe/Schuljahr je Klasse (U3)
- Bislang war „Klasse" nur ein freier Textstring, den NATASCHA in
  `abgabe.klasse`/`schueler.klasse` verwendet — keine Metadaten, keine
  Wiederverwendung im Wizard. Neue **LUA-eigene** Tabelle `lua_klassen`
  (`lua_schema.sql`) ergänzt Fach/Stufe/Schulstufe/Schuljahr/Archiviert-Flag
  zu jedem Klassennamen. Bewusst **kein Fremdschlüssel** auf die
  NATASCHA-Tabellen — die gehören NATASCHA, der Schema-Sync-Wächter
  (`scripts/check_natascha_schema_sync.py`) prüft nur deren Tabellen und
  bleibt unberührt. Umbenennen/Löschen der Metadaten ändert nichts an
  bestehenden Abgaben/Schülern.
- Neue Rust-Commands `commands/klassen.rs`: `klassen_meta_list`,
  `klassen_meta_upsert` (Insert-or-Update über Primärschlüssel `name`),
  `klassen_meta_delete`. 4 neue Rust-Tests.
- Neuer Hook `hooks/useKlassenMeta.ts` (Muster: `useAufgabenPool.ts`).
- **KlassenView:** „Klasse anlegen"-Panel in der Sidebar (Fach-Dropdown,
  Schulstufen-Chips, Schuljahr-Feld); Klassenliste zeigt jetzt eine
  Meta-Zeile („Deutsch · 7. Klasse · 2026/27"); Archivieren/Wiederherstellen
  und Metadaten-Löschen (mit Bestätigung, betrifft nur die Metadaten) je
  Klasse; archivierte Klassen standardmäßig ausgeblendet, per Klick einblendbar.
  Auch Klassen ohne NATASCHA-Abgaben (frisch angelegt) erscheinen bereits.
- **Wizard (Step0_Absicht):** Klasse-Feld ist jetzt eine Datalist über
  bekannte Klassen; bei exaktem Namenstreffer werden Fach und Schulstufe
  automatisch übernommen (weiterhin überschreibbar), mit kurzem Hinweistext.
- **SchuelerView „Schüler anlegen":** Klasse-Feld nutzt dieselbe Datalist
  (NATASCHA-Klassen ∪ LUA-Metadaten) statt reinem Freitext.
- Rust: 43 Tests grün (4 neu). Web: Typecheck + 126 Tests grün.
  Schema-Sync-Wächter grün (nur LUA-Schema erweitert).

### Added — InfoDot-Tooltips in der Korrektur-Suite (U2)
- `InfoDot` (bereits in Step0_Absicht eingeführt) an 8 erklärungsbedürftigen
  Stellen ergänzt: KlassenView (Fehler-Heatmap, Wirksamkeit, Kalibrierung,
  KI-Klassen-Briefing), KorrekturView (KI-Note-Spalte, Gesamtstufe vs.
  Schulnote), ErwartungshorizontView (Generieren-Erklärung, Rubrik-
  Dateiname-Kontext), SchuelerView (K1/K3-Legende am Notenverlauf-Chart).
  Bewusst NICHT gesetzt bei Retro-Import- und Übungsblatt-Button — die haben
  bereits ein erklärendes `title`-Attribut, ein InfoDot wäre dort Redundanz.
- Web: Typecheck grün, 126 Tests grün (unverändert, reine UI-Ergänzung).

### Fixed — Korrektur-Suite: Roh-JSON, Lösch-Dialog, sinnlose Trend-Chips, Wizard-Badge, Dateinamen (U1)
- **KI-Text-Rendering:** Neue Komponente `components/KiTextBlock.tsx` ersetzt
  das rohe `whiteSpace:pre-wrap`-JSON in `SchuelerView.tsx` (KI-Schüler-Profil)
  und `KlassenView.tsx` (KI-Klassen-Briefing). Root Cause: `natascha_cli.py`
  speichert die vom Prompt geforderte JSON-Antwort unverändert als
  `{"text": <JSON-String>}`; das Frontend zeigte diesen String 1:1 an.
  `KiTextBlock` parst `text` und rendert strukturiert (kurzbild, Stärken,
  Förderbereiche/Schwerpunkte, Unterrichtsempfehlungen, Matura-Bezug);
  Prosa/kaputtes JSON fällt unverändert auf die alte pre-wrap-Darstellung
  zurück (Alt-Daten bleiben lesbar). Frontend-only, kein Schema-/CLI-Touch.
  6 neue Tests (`KiTextBlock.test.ts`).
- **FK-Verhalten verifiziert:** `PRAGMA foreign_keys=ON` war in `db.rs:38`
  bereits gesetzt — neuer Rust-Test belegt jetzt explizit, dass Schüler-Löschen
  `schueler_profil` per CASCADE entfernt, `abgabe.schueler_id` aber per SET
  NULL nur entkoppelt (Abgabe bleibt anonymisiert erhalten). Test-`setup()`
  in `natascha_read.rs` spiegelt jetzt denselben PRAGMA-Haushalt wie
  `db::open_db()` (vorher liefen alle FK-Tests ohne Constraint-Durchsetzung).
- **Lösch-Dialog präzisiert:** `SchuelerView.tsx` — der Dialog nennt jetzt die
  echte Konsequenz (KI-Profil weg, N Abgaben anonymisiert erhalten, Hinweis
  auf Einstellungen→Datensicherung) statt der pauschalen Beruhigung
  „Abgaben bleiben erhalten".
- **Trend-Chips-Gate:** „Entwicklung über 1 Arbeit" mit sinnlosen
  „3.0 → 3.0"-Chips ersetzt durch Hinweistext bei nur einer Abgabe
  (Muster: bestehendes Chart-Gate).
- **Wizard-Badge kontextualisiert:** Der Header-Badge „Fach · Stufe · Klasse"
  (Wizard-Meta) blendet sich jetzt in den 4 NATASCHA-Views aus — dort gilt
  eine andere Klassen-Auswahl, das Badge zeigte bislang irreführend den
  Wizard-Kontext. `NATASCHA_VIEWS` aus `lib/navigation.ts` exportiert und
  App.tsx-Duplikat darauf umgestellt.
- **Anzeigename statt Rohdateiname:** neuer Helper `lib/anzeigeName.ts` —
  zeigt `vorname nachname`, wenn die Abgabe mit einem Schüler verknüpft ist,
  sonst einen bereinigten Dateinamen (Endung weg, `_`/`-` → Leerzeichen)
  statt z. B. „Neuer_Booktok_trend-TamaraEbner.docx". Eingesetzt in
  `KorrekturView.tsx` und `KlassenView.tsx`; Original-Dateiname bleibt als
  `title`-Tooltip abrufbar. 8 neue Tests (`anzeigeName.test.ts`).
- Web: Typecheck grün, 126 Tests grün (14 neu). Rust: 40 Tests grün (1 neu).

### Changed — Schritt „Absicht": Fach & Schulstufe zuerst, Info-Tooltips
- `apps/lua/apps/web/src/components/Step0_Absicht.tsx`: **Fach & Schulstufe**
  stehen jetzt VOR dem Unterlagentyp in einer akzentuierten Karte — die
  Grundentscheidung (steuert Zielsprache, Aufgabentypen, Kataloge) kommt
  zuerst statt unter der Falz.
- **Konkrete Schulstufe (5.–12.)** wählbar wie im Kompetenz-Modus
  (Chips + „ganze Unterstufe/Oberstufe" als Fallback, `SCHULSTUFEN`/
  `stufeFromSchulstufe` aus dem Schema wiederverwendet). `meta.schulstufe`
  fließt damit erstmals aus dem Haupt-Wizard in den Prompt (altersgerechte
  Wortwahl: „(schulstufe−4). Klasse AHS" existierte dort schon ungenutzt).
- Neu: `components/ui/InfoDot.tsx` — kleines Info-„i" mit Hover-/Fokus-
  Erklärblase (tastaturbedienbar, keine Dauer-Animation). Eingesetzt bei
  Fach, Schulstufe, Schwierigkeit (Bloom/CEFR-Erklärung) und Klasse
  (Korrektur-Kreislauf-Hinweis). Web-Typecheck + 112 Tests grün.

### Added — Audit-Abschluss A5 + P4: Judge im Text-Modus, Zeitbudget im Prompt
- **A5:** `umformung`/`fehlerkorrektur` tragen KI-erfundene Musterlösungen, die
  das Quelltext-Grounding im Text-Modus nicht prüft. Der Kompetenz-Judge läuft
  jetzt auch dort (`packages/llm/src/quality.ts`), advisory (nur Warnungen,
  blockiert nie). Kosten-Guard bleibt: `useGenerate` aktiviert den Judge im
  Text-Modus nur, wenn solche Blöcke angefordert sind — sonst weiterhin kein
  zusätzlicher LLM-Call pro Schularbeit. 2 neue Tests (Befund wird Warnung;
  ohne Risiko-Typen null Judge-Calls).
- **P4:** neuer Prompt-Abschnitt **ZEITBUDGET** (`packages/llm/src/prompt.ts`):
  Richtwerte je `meta.typ` (Schulübung ~10–20 min … Matura 270 min), Umfang
  wird über Länge/Komplexität gesteuert, config-Vorgaben bleiben verbindlich.
  1 neuer Test-Pin. llm-Suite: 132 Tests grün.

### Changed — Übersicht-Startkarten: Asset-basierte Lineart
- Die drei Dashboard-Einstiege verwenden keine handgebauten Inline-SVGs mehr,
  sondern neue transparente Lineart-Assets im Stil der Fachatmosphären.
- `StartActionIllustration` rendert Bildassets für Quelltext, Kompetenz und
  Schnell-Übung; CSS-Layout, Light-/Dark-Filter und responsive Größen wurden
  auf stabile Kartenflächen umgestellt.
- Visueller Smoke: Desktop hell/dunkel und Mobile geprüft; alle Assets laden
  und bleiben innerhalb ihrer Karten.

### Added — Export-Einstellungen + Quelltext-Abdruck-Toggle
- `apps/lua/apps/web/src/views/SettingsView.tsx`: neue Sektion **Export** —
  Zielordner per Ordner-Dialog wählbar (`exportDir`, bisher ohne UI!), Anzeige
  „Downloads-Ordner (Standard)" bei leerem Feld, Zurücksetzen-Button, Toggle
  „Vor jedem Export fragen" (`exportAskEachTime`).
- **Quelltext-Abdruck-Toggle** (analog `punkteAusblenden`): neues optionales
  Meta-Feld `quelltextAusblenden` (`packages/schema`), Renderer lässt die
  Quelltext-Sektion im DOCX weg (`packages/renderer`, +1 Struktur-Test),
  Vorschau bleibt deckungsgleich (`PreviewTwoColumn`), Schalter in Schritt 4
  unter der Layout-Wahl („Quelltext im Arbeitsblatt abdrucken") — wirkt auch
  nachträglich auf ein bereits generiertes Dokument.
- Tests: Renderer 109, Web 112, Schema 145 — alle grün.

### Changed — Prompt-Didaktik P2b/P2c: Live-Eval-Härtung der Fehlerliste
- Live-Eval mit DeepSeek + Mistral (echter Schülertext mit 8 geplanteten Fehlern
  und 7 Austriazismen) zeigte: Mistral befolgt die Prompt-Regeln sauber,
  DeepSeek liefert weiter Einträge ohne sichtbare Korrektur und listet
  Austriazismen; Mistral halluzinierte dafür Satzzeichen-Fehler, die im Text
  gar nicht vorhanden sind.
- **P2b (Prompt):** `_fehler_anweisungen` verbietet Austriazismen-Einträge jeder
  Art (auch als Ausdruck/Stil ohne Änderung) und verlangt sichtbare Korrekturen
  (zitat ≠ korrektur; Satzzeichen gehören INS Zitat-Fenster).
- **P2c (deterministisch, modellunabhängig):** neuer Filter
  `drop_unbrauchbare_fehler` (zitat == korrektur → raus, läuft auch im
  Vision-Modus) und `verify_fehler_against_text` verschärft: der
  satzzeichen-tolerante Fallback gilt nicht mehr für typ=Z — ein
  Zeichensetzungs-Zitat, das nur ohne Satzzeichen matcht, ist eine
  Halluzination. 3 neue Tests; pytest 128 grün.

### Fixed — Export-Freeze: Deadlock im Speichern-Dialog
- `apps/lua/src-tauri/src/commands/export.rs`: `export_docx` war ein synchroner
  Command — synchrone Tauri-Commands laufen auf dem Main-Thread, und
  `blocking_save_file()` deadlockt dort den Event-Loop. Folge: Klick auf
  „Beide Dokumente exportieren" fror die ganze App ein, sobald der Dialog-Zweig
  lief (Export-Ordner leer oder „jedes Mal fragen"). Betraf ALLE Plattformen,
  auch die Windows-EXE. Fix: Command ist jetzt `async` (Threadpool) + Warnkommentar.
- Neu: Bei `ask=false` ohne konfigurierten Export-Ordner wird direkt in den
  **Downloads-Ordner** geschrieben statt einen Dialog zu erzwingen (konsistent
  mit Browser-Fallback und Erfolgsmeldung). `downloads_dir()` + Test.
- Headless-Gegenprobe: Renderer über 13 Fixtures × 5 Templates × 4 Layouts
  (+ undefined-Layout) ohne Hänger — Ursache lag eindeutig im Command-Threading.

### Changed — Prompt-Didaktik P2: NATASCHA-Korrektur-Prompt gehärtet
- `apps/natascha/natascha_core.py` (Audit `docs/AUDIT-prompts-didaktik.md`):
  - **Fixture-Pin (N1):** `load_example_fixture()` lädt jetzt explizit
    `beispiel_deutsch_kommentar.json` — neue Fixture-Dateien können das
    Live-Prompt-Beispiel nicht mehr still verändern.
  - **Skalen-Klarheit (N2):** SRDP-Detail-Prompt grenzt seine 0–4-Subkriterien-
    Skala explizit von den 1–5-Rubrikstufen der Hauptanalyse ab.
  - **A-Label kanonisch (N3):** „A=Ausdruck/Stil" in Prompt + Schema-Description
    (feedback_schema.json) mit Kreuzverweis.
  - **Austriazismen-Schutz (N4):** österreichisches Standarddeutsch (Jänner,
    heuer, „bin gesessen", Marille) darf nicht als R/G/A-Fehler markiert werden
    — falsche Fehler würden Heatmap, Empfehlung des Tages und Wirksamkeits-Trend
    vergiften.
  - **Fehler-Regeln fach-konditioniert (N5):** gemeinsamer Baustein
    `_fehler_anweisungen(fach, wortanzahl)` für Text- UND Vision-Prompt;
    Nachsuch-Checkliste sprachspezifisch (Deutsch: Kommata/das-dass ·
    Englisch: tenses/3rd-person-s/False Friends), Fehler-Erwartung an die
    Wortanzahl gekoppelt (≈1 je 25–40 Wörter) statt Pauschalspanne „15–30".
- `tests/test_llm_pipeline.py`: 5 neue Tests (Fach-Konditionierung, Vision ohne
  Zahlenanker, Fixture-Pin, Skalen-Hinweis). pytest: 125 grün.

### Changed — Prompt-Didaktik P1: Operatoren, Österreich-Register, Textspezifität
- `apps/lua/packages/llm/src/prompt.ts` (Audit `docs/AUDIT-prompts-didaktik.md`):
  - Neuer Abschnitt **ARBEITSANWEISUNGEN & OPERATOREN** in den geteilten
    BLOCK_REGELN (Text- UND Kompetenz-Modus): Operator + Gegenstand Pflicht,
    Anforderungsbereiche I–III an die Bloom-Schwierigkeit gekoppelt,
    zielsprachige Operatoren in Fremdsprachen (A1).
  - Neuer Abschnitt **OESTERREICHISCHES DEUTSCH**: österreichische
    Standardvarietät als Zielnorm (Matura/Schularbeit/Jänner), Szenarien
    spielen in Österreich, Varianten gelten nicht als Fehler (A2).
  - **TEXTSPEZIFITAET**-Regel für offene Verständnisfragen: ohne Quelltext
    unbeantwortbar, Absatz-Verankerung; Negativ-/Positivbeispiel; das
    Beispiel-JSON demonstriert jetzt den Absatzbezug (A3).
  - Verstümmelte Überschrift „LaeNGEN- ae HNLIChKEIT" → „LAENGEN-AEHNLICHKEIT"
    im Distraktor-Abschnitt repariert (A4, Test-Pin mitgezogen).
- `prompt.test.ts`: 3 neue Pin-Tests (Operatoren inkl. Kompetenz-Modus,
  Österreich-Register, Textspezifität). llm-Suite: 129 Tests grün.

### Added — Tafel-Modus (PR D, Welle 1)
- Neuer Vollbild-Beamer-Modus für Unterlagen: Quelltext-Folien zuerst, danach
  Aufgabenblöcke read-only mit Lösungsschalter, Tastatursteuerung (Pfeile,
  Leertaste, L, +/- und Esc) und Scroll-Lock.
- `lib/tafel.ts` kapselt Slide-Aufbau und Schriftgrößen-Clamping; neue Tests
  decken Reihenfolge, leere Quelltexte und Grenzwerte ab.
- Step 4 erhält einen „Tafel-Modus"-Button; die Befehlspalette startet ihn per
  „tafel", „beamer" oder „präsentation".
- `.tafel-overlay` nutzt lokal dieselben Kreide-Farbvariablen wie das Dark-Theme,
  ohne das App-Theme umzuschalten.

### Added — Empfehlung des Tages (PR A, Welle 1)
- `FEATURES.natascha` aktiviert die NATASCHA-Views im Hauptmenü.
- `nataschaBridge`: `KATEGORIE_LABEL` und `buildPrefillFromHeatmap(...)`
  erzeugen aus Heatmap-Schwerpunkten eine Generator-Vorbefüllung.
- Dashboard zeigt bei vorhandenen Korrekturdaten eine „Empfehlung des Tages"
  und startet per Klick ein gezieltes Übungsblatt mit optionalem Ausgangstext.

### Added — Wirksamkeits-Ansicht: Fehlertrend je Klasse (PR B, Welle 1)
- `apps/lua/src-tauri/src/commands/natascha_read.rs`: neuer Read-Command
  `db_get_fehler_trend(klasse)` — Fehlerkategorien (R/G/Z/A) je Schularbeit,
  normalisiert auf **Fehler pro Abgabe** (Abgabenzahl schwankt je SA; Rohzahlen
  würden täuschen). Seedet auch fehlerfreie Schularbeiten als Punkte; unbekannte
  Typ-Codes werden durchgereicht. Chronologie via `MIN(datum)` (Import-Zeitpunkt,
  gleiche Annahme wie `db_get_klassen_trend`). Kein Schema-Change. 2 neue
  Rust-Tests (Chronologie/Normalisierung, unbekannte Klasse).
- `apps/lua/apps/web/src/hooks/useNatascha.ts`: `getFehlerTrend` +
  exportiertes Interface `FehlerTrendPunkt`.
- `apps/lua/apps/web/src/views/KlassenView.tsx`: neue Sektion „Wirksamkeit über
  die Schularbeiten" im Statistik-Tab — LineChart (eine Linie je Kategorie,
  Y = Fehler pro Abgabe, ab 2 Schularbeiten; bei einer SA Hinweistext) plus
  Delta-Kacheln letzte vs. vorletzte SA (Rückgang grün/TrendingDown, Anstieg
  rot/TrendingUp, „neu" bei vorher 0; absolute pro-Abgabe-Werte neben dem
  Prozent) und Ehrlichkeits-Caption (Trend ≠ Kausalitätsbeweis).

### Changed — Übersicht-Startfläche
- Dashboard-Hero in ein Bento-Layout umgebaut: „Aus Quelltext" ist jetzt der
  visuelle Hauptweg, „Ohne Quelltext" und „Schnell-Übung" bleiben kompakte
  Alternativen.
- Einstiegskarten mit feineren SVG-Liniengrafiken, eigenen Light-/Dark-Styles,
  klarer CTA-Zeile und responsiver Stapelung überarbeitet.
- Nicht mehr verwendete generische `Hero`-Komponente entfernt.

### Fixed / CI — NATASCHA-Schema-Sync-Wächter (PR 11)
- Drift behoben: Tabelle `aufgabe_quelltext` fehlte im Rust-Spiegel
  `src-tauri/src/natascha_schema.sql` (in `apps/natascha/natascha_db.py` vorhanden) →
  ergänzt, beide Seiten wieder 1:1.
- Neuer Wächter `scripts/check_natascha_schema_sync.py` (stdlib) vergleicht die
  CREATE-TABLE-Definitionen beider Quellen normalisiert und bricht bei Drift mit
  Exit 1 + Diff ab. Als CI-Job `schema-sync` in `.github/workflows/ci.yml` eingehängt.

### Changed — PDF-Export mit Datei-Dialog (PR 6)
- Der PDF-Export verlangt keinen von Hand getippten Windows-Pfad mehr: das Modal in
  `Step4_Generate.tsx` bietet jetzt „DOCX-Datei wählen…" über den nativen Tauri-Datei-
  Dialog (`@tauri-apps/plugin-dialog` `open`, `dialog:allow-open`); gewählter Pfad wird
  angezeigt, „PDF erstellen" ist erst nach Auswahl aktiv. Neuer `pickDocxFile` in
  `hooks/usePdfExport.ts`, Default = zuletzt genutzter DOCX-Pfad.

### Fixed — Settings-Polish (PR 10)
- `SettingsView`: Button „Testdaten laden (Dev)" wird nur noch in
  `import.meta.env.DEV` gerendert.
- `useTheme`/`ThemeToggle`: Header-Toggle rotiert jetzt
  Hell → Dunkel → System, zeigt den aktuellen Modus per Icon/Titel und
  aktualisiert System-Theme-Wechsel live.
- `SettingsPanel`: API-Key-Felder zeigen provider-spezifische Prefix-Hinweise;
  untypische Prefixe erzeugen nur eine sanfte Warnung und blockieren das
  Speichern nicht.

### Changed — CI und Dependency-Wächter (PR 8)
- `.github/workflows/ci.yml`: Web-Job ergänzt `pnpm audit --prod` als
  non-blocking Report; neuer Rust-Job installiert Tauri-Linux-Abhängigkeiten und
  führt `cargo check`, `cargo test` sowie `cargo audit` als non-blocking Report
  aus.
- `.github/dependabot.yml`: wöchentliche Updates für npm (`apps/lua`), Cargo
  (`apps/lua/src-tauri`) und pip (`apps/natascha`) ergänzt.

### Fixed — UI-Symbole und Anrede (PR 4)
- Web-UI: verbliebene Emoji-/Symbol-Markierungen durch `lucide-react`-Icons
  ersetzt (`Lightbulb`, `AlertTriangle`, `Check`), damit die Tauri/WebView2-App
  konsistent rendert.
- Texte in `Step4_Generate`, PDF-Hinweis und PDF-Fehlerpfad auf die sonstige
  Du-Ansprache vereinheitlicht.
- Statusmeldungen in Settings, Erwartungshorizont und Schüleransicht zeigen
  Erfolg jetzt per Icon statt per `✓`-Textzeichen.

### Performance — Code-Splitting (PR 7)
- 14 sekundäre Views in `App.tsx` auf `React.lazy` + `Suspense` umgestellt
  (DashboardView + Wizard-Schritte bleiben eager). `renderView()` in `<Suspense>`
  mit dezentem Lade-Fallback.
- `apps/web/vite.config.ts`: `manualChunks` für `recharts` und `@dnd-kit`.
- Effekt: `recharts` (377 kB) und `@dnd-kit` (186 kB) verlassen das Haupt-Bundle
  (Haupt-Chunk 1,96 MB → 1,25 MB). recharts lädt nur noch beim Öffnen der
  NATASCHA-Klassen/Schüler-Views — im MVP (`FEATURES.natascha:false`) also nie.

### Performance — Asset-Diät (PR 3)
- 12 Fach-Atmosphäre-PNGs → WebP (q72, Alpha erhalten): **9,1 MB → 5,4 MB** (−41 %);
  Imports in `components/SubjectAtmosphere.tsx` auf `.webp` umgestellt.
- 10 Schriftschnitte (Ubuntu + PlaywriteAT) TTF → WOFF2: **3,1 MB → 1,15 MB** (−64 %);
  `index.css` `@font-face` auf `.woff2`/`format('woff2')` umgestellt.
- Verwaistes `assets/murals/philosophie.png` (2,1 MB, 0 Referenzen) gelöscht.
- Gesamt: rund **10 MB weniger** Frontend-Assets. (Glyph-Subsetting der Fonts als
  spätere Option offen.)

### Security — Spawn-Härtung + Key-Import räumt auf (PR 9)
- `launch_natascha` (`src-tauri/src/commands/natascha.rs`) validiert den frei
  editierbaren `pythonCommand` (Whitelist `A-Za-z0-9 _ . : / \ -`) vor der
  Interpolation in den `cmd`/`osascript`-String — verhindert Command-Injection aus
  einem präparierten Settings-JSON. Der CLI-Sidecar-Pfad war schon argv-basiert.
- `bin/import_keys`: löscht die Klartext-Quelldatei nach erfolgreichem Keyring-Import,
  statt sie nach `.env.local` umzubenennen (keine dauerhafte Klartext-Kopie mehr).
- Rust-Unit-Tests: gültige Interpreter ok; `python & calc`, `; rm`, `$()`, Backticks,
  leer → je Err.

### Security — Bridge-Read gehärtet (PR 5)
- `read_bridge_export` (`src-tauri/src/commands/bridge.rs`): liest nur noch `.json`
  **unterhalb des aufgelösten Inbox-Ordners** (Pfad-Canonicalize + `starts_with`),
  ≤ 5 MB (DoS-Schutz gegen Riesen-JSON aus dem fremd-beschreibbaren Inbox), mit
  gültiger `schemaVersion` (1|2, sonst freundliche Ablehnung mit Grund). Neuer
  `dir`-Parameter (Frontend reicht die Inbox aus den Einstellungen mit).
- `list_bridge_exports` überspringt Dateien > 5 MB, statt sie einzulesen.
- Rust-Unit-Tests: Pfad außerhalb Inbox → Err, > 5 MB → Err, `schemaVersion 99` → Err.

### Changed — Doku: Phase 2 ist gebaut
- `AGENTS.md`: Roadmap korrigiert — Phase 2 „Gemeinsame SQLite" ist nicht mehr
  geplant, sondern erledigt. Dokumentiert sind jetzt `~/lehr-suite-bridge/lehr-suite.db`,
  `db.rs`, `natascha_schema.sql`/`lua_schema.sql`, Hydrate-Cache und `--db-path`
  für NATASCHA-Sidecar-Aufrufe.
- `docs/phase2-shared-db.md`: vom alten Ausführungsdesign auf Ist-Architektur
  umgestellt, inklusive aktueller Tabellen, Tauri-Commands, localStorage-
  Migration und Verifikationshinweisen.

### Changed — Dashboard-Start und Fachgrafik-Feinschliff
- **Deutsch**-Fachatmosphäre ersetzt: keine Theatermasken mehr; stattdessen
  Goethe-/Schiller-Anmutung mit Buch-, Feder- und Manuskript-Lineart.
- **Englisch**-Fachatmosphäre ersetzt und neu positioniert: Big Ben ist nun das
  klare, sichtbare Hauptmotiv, ergänzt durch Globe-/Folio-/Kartenakzente.
- **Französisch**, **Spanisch**, **Latein**, **Geschichte**, **Geographie**,
  **Religion**, **Ethik**, **Psychologie** und **Philosophie** neu ausgerichtet:
  die vorhandenen PNG-Motive werden nicht mehr weit aus der Bühne geschoben,
  sodass zentrale Details wie Couch, Don Quijote/Pferd oder Philosophie-Motive
  nicht hart abgeschnitten wirken.
- `apps/lua/apps/web/src/views/DashboardView.tsx`: Dashboard-Hero fragt nun
  „Was möchtest du vorbereiten?" und nutzt drei ruhige Workflow-Illustrationen
  statt der bisherigen Türmetapher.
- `apps/lua/apps/web/src/components/ui/StartActionIllustration.tsx` und
  `apps/lua/apps/web/src/index.css`: neue gezeichnete Einstiegsgrafiken für
  „Aus Quelltext", „Ohne Quelltext" und „Schnell-Übung".
- Die alte `Door`-Startkomponente wurde entfernt, da das Dashboard nicht mehr
  mit der Türmetapher arbeitet.
- `apps/lua/apps/web/src/components/Sidebar.tsx`: Sidebar zeigt oben wieder nur
  die Luka-Schreibschrift; das blaue App-Zeichen bleibt aus der Navigation
  heraus und dient weiter als reine App-Icon-Komponente. Die interne
  Standard-Tagline lautet nun „Unterlagen gestalten".

### Added — Fachatmosphäre v4: kuratierte Lineart-Grafik je Fach
- `apps/lua/apps/web/src/components/SubjectAtmosphere.tsx`: neuer codebasierter
  Layer mit Asset-Unterstützung für hochwertige Fachillustrationen. Alle zwölf
  Fächer nutzen nun je ein kuratiertes, transparentes Lineart-Cluster als
  ruhige Fachsignatur statt verstreuter SVG-Doodles.
- Bestehende Pilotgrafiken für **Deutsch**, **Geographie**, **Geschichte** und
  **Philosophie** bleiben erhalten; Philosophie nutzt die gelungene
  Höhlen/Eule/Denker-Komposition als neutrales Standardmotiv.
- Neue Fachgrafiken für **Englisch**, **Französisch**, **Spanisch**,
  **Italienisch**, **Latein**, **Religion**, **Ethik** und **Psychologie**:
  Big Ben/Globe/Shakespeare, Eiffelturm/Marianne, Don Quijote/Alhambra, Dante/
  Kolosseum, römische Tafel/Büste/Säulen, interreligiöse Architektur,
  Waage/Brücke/Handshake sowie Gehirn/Neuron/Rubin-Vase.
- `apps/lua/apps/web/src/assets/subject-atmospheres/`: neue normalisierte
  PNG-Lineart-Assets aus der kuratierten Chroma-Key/Alpha-Pipeline.
- `apps/lua/apps/web/src/styles/murals.css`: Rasterbild-Mural-Pfad deaktiviert;
  sichtbare Fachidentität kommt jetzt aus einer ruhigen Randgalerie statt aus
  verstreuten Mini-Glyphen. Asset-Motive werden separat getönt; Dark Mode
  invertiert sie zu gedämpfter Kreide-Lineart.
- Dark Mode nutzt für die Fachzeichen eine eigene helle Kreide-/Tafel-Farbwelt
  statt dunkler Papier-Tinte; Fachakzente werden nur beigemischt, damit die
  Randzeichen sichtbar bleiben, ohne neonhaft zu wirken.
- `apps/lua/apps/web/src/themes/subjectThemes.ts`: Theme-Variablen treiben nur
  noch Farb-Wash und SVG-Fachzeichen, keine PNG-Registrierung mehr.
- `apps/lua/apps/web/src/lib/features.ts`: Fachatmosphäre für den Pilot
  aktiviert; NATASCHA bleibt weiterhin gegated.
- `apps/lua/apps/web/src/views/SettingsView.tsx`: Darstellungsschalter auf
  „Fachzeichen aktivieren" umbenannt.
- `apps/lua/scripts/llm-smoke.mjs`: `wordScramble`-Smoke auf die aktuelle
  Mehrsatz-Struktur (`config.saetze`) angepasst, damit der Live-Smoke wieder
  bis zum DOCX-Export durchläuft.

### Fixed — GIFT-Header: Thema/Fach klebten in einer Zeile
- `apps/lua/packages/export/src/index.ts` (`toGift`): Der Header trennte Thema
  und Fach durch `\//` (→ `//`) statt `\n//` — der Zeilenumbruch fehlte, sodass
  „Thema X// Fach:" in einer Zeile klebte. Korrigiert auf `\n// Fach:` (analog
  den anderen Header-Zeilen).
- `apps/lua/packages/export/src/export.test.ts`: neuer Test „toGift - Header"
  sichert saubere Zeilen pro Metadatum (Regression-Wächter).

### Changed — Hilfe auf aktuellen Funktionsstand
- `apps/lua/apps/web/src/views/HelpView.tsx`: Neue Sektionen **Aufgaben-Pool**
  (Block in Vorschau speichern, filtern/suchen/löschen, „Aus Pool einfügen"),
  **Export & Dateien** (DOCX-Zielordner/Speichern-unter, GIFT/Moodle-Export:
  geschlossene → Quiz, offene → Essay, PDF/Raster/Selbstlern/Selbsteinschätzung)
  und **Suche & Befehle** (Such-/Befehlsleiste / Ctrl+K, gruppierte Treffer,
  ↑/↓/Enter/Esc). Matura (SRDP) bei „Unterlagen erstellen", Rollenkarten-Set
  bei „Aufgabentypen", Mistral-Medium-3.5-Default bei „Erste Schritte" sowie
  „Wie zuletzt"/„Schnell-Übung" auf der Übersicht erwähnt.
- `docs/ANLEITUNG.md`: dieselben Inhalte als Markdown in gleicher Reihenfolge
  wie die App-Hilfe gespiegelt.

### Changed — Renderer: Block-Builder als reine exportierte Funktionen + Struktur-Tests
- `apps/lua/packages/renderer/src/index.ts`: Per-Blocktyp-Renderteil in reine,
  exportierte Funktionen faktorisiert (Verhalten/DOCX-Output unverändert):
  `export RenderBlockCtx`, `renderBlockChildren(block, ctx)` (typspezifische
  Children ohne Banner), `buildBlock(block, ctx)` (Banner + Children), sowie
  `numbersForLines(lines)` (reine, deterministische Quelltext-Zeilennummerierung
  — Leerzeilen lassen die Nummerierung nicht springen); `quelltextAbsaetze`
  konsumiert nur noch den Plan. Öffentliche Render-Funktionen unverändert.
- `apps/lua/packages/renderer/src/blocks.test.ts`: Neue Vitest-Struktur-Suite
  (58 Tests) gegen den docx-Objektbaum (Walker, kein Zip, keine neue Dep):
  alle 18 Blocktypen, GENAU EINE Überschrift pro Block (Doppelkopf-Wächter),
  matching-Struktur, multipleChoice ☑/☐-Modus, lueckentext-Varianten,
  schueler-vs-loesung, Quelltext-Nummerierung, Sonderzeichen, E2E-Smoke.
  Bestätigt: Doppelkopf & Nummern-Lücken im aktuellen Code nicht vorhanden
  (Builder schon separiert, Numerierung schon lückenfrei) — Tests erstarren
  die Invarianten. 38 bestehende renderer-Tests bleiben grün.

### Added — Globale Such- + Befehls-Palette (Raycast-/Linear-Stil)
- `apps/lua/apps/web/src/lib/search.ts`: Reines, deterministisches Such- +
  Fuzzy-Matching-Modul (kein UI, keine Deps). `buildSearchIndex()` baut aus
  Dokumenten/Vorlagen/Pool/Klassen/Navigation/Befehlen eine flache Liste;
  `searchIndex()` scored tiered (exact > prefix > substring > subsequence),
  case-/umlaut-insensitiv, mit Rezenz-/Art-Tie-Breaks; leerer Query → Defaults.
  `groupResults()` liefert Sektionen fester Reihenfolge.
- `apps/lua/apps/web/src/lib/search.test.ts`: 30 Vitest-Tests (Ranking-Reihenfolge,
  Umlaut-/Case-Insensitivität, leerer Query, alle Arten, Tie-Breaks,
  Sonderzeichen, Determinismus).
- `apps/lua/apps/web/src/lib/navigation.ts`: Einzelne Quelle der
  Navigationsziele (Views + Labels), feature-gefiltert (NATASCHA), genutzt vom
  Index-Builder.
- `apps/lua/apps/web/src/components/CommandPalette.tsx`: Palette ist jetzt eine
  echte Such- + Befehls-Palette — ein Eingabefeld durchsucht Befehle UND
  Inhalte, Ergebnisse nach Art GRUPPIERT (Befehle/Unterlagen/Vorlagen/
  Aufgaben-Pool/Klassen/Gehe zu …), Tastatur-Navigation ↑/↓, Enter führt aus
  (Dokument laden, Vorlage laden, View öffnen, Befehl ausführen), Esc schließt.
  Bestehende Befehlslogik (Slash-/Text-Befehle, Spracheingabe) bleibt erhalten;
  parametrisierte Befehle laufen weiter über den Legacy-Fallback (Enter ohne
  Auswahl parst den rohen Text).
- `apps/lua/apps/web/src/App.tsx`: Index wird beim Öffnen der Palette aus dem
  Cache (Dokumente/Vorlagen/Klassen) + statischer Nav/Befehle gebaut; der
  Aufgaben-Pool wird async über den bestehenden `pool_list`-Command geladen
  (kein neuer Rust/DB-Code). Enter-Aktionen sind an die vorhandenen Handler
  gebunden (LOAD_SNAPSHOT+Wizard, Vorlagen-Ladepfad, setActiveView,
  onActions/onExport). Header-Suchleiste bleibt der Auslöser.
- `apps/lua/apps/web/src/index.css`: Palette-Stile im bestehenden Token-System
  (`.palette-*`), aktive Zeile via `aria-selected` (keine Hover-onMouseEnter-
  Hacks).

### Added — „Wie zuletzt"-Schnellaktion auf dem Dashboard
- `apps/lua/apps/web/src/views/DashboardView.tsx`: Neue Kachel „Wie zuletzt"
  über dem letzten Dokument; zeigt Fach, Stufe und Unterlagentyp des letzten
  Dokuments an und springt auf Klick in den Wizard.
- `apps/lua/apps/web/src/components/Step0_Absicht.tsx`: Unterlagentyp (`typ`)
  wird bereits aus den Metadaten des letzten Dokuments vorbefüllt, sodass der
  „Wie zuletzt"-Fluss sofort mit denselben Einstellungen startet.

### Added — Sichtbare Such-/Befehlsleiste im Header
- `apps/lua/apps/web/src/App.tsx`: Im Header ein als Suchfeld gestyltes,
  klickbares Element mit Lupe-Icon, Text „Suchen / Befehle…" und „⌘K"-Badge.
  Klick öffnet die bestehende `CommandPalette`; Tastatur-Shortcut `Ctrl+K`
  bleibt erhalten.

### Added — Empty-State für Aufgaben-Pool
- `apps/lua/apps/web/src/views/PoolView.tsx`: Bei leerem Pool oder leerem
  Filterergebnis wird ein `EmptyState` mit `Database`-Icon und erklärendem
  Hinweis angezeigt (Stil wie TrashView/HistoryView).

### Changed — Sidebar in Bereiche gruppiert
- `apps/lua/apps/web/src/components/Sidebar.tsx`: `NAV_ITEMS` um `gruppe`
  erweitert; Items werden unter „Übersicht", „Unterrichten" und „Korrigieren"
  gruppiert.
- Gruppen-Header werden nur angezeigt, wenn nach NATASCHA-Gating mindestens ein
  Item sichtbar ist → „Korrigieren" verschwindet im MVP vollständig.
- Einstellungen + Hilfe bleiben unten ohne Gruppe.

### Changed — Menschliche Wizard-Labels
- `apps/lua/apps/web/src/lib/types.ts`: Step-Labels umbenannt in
  „Idee", „Material", „Aufgaben", „Anpassen", „Erstellen" und
  `STEP_DESCRIPTIONS` kürzer/menschlicher formuliert.

### Added — GIFT/Moodle-Export-Button in Step4_Generate
- `apps/lua/apps/web/src/components/Step4_Generate.tsx`: `exportGift` aus
  `useExport()` verdrahtet; neuer Button „Als Moodle/GIFT exportieren" im
  Akkordeon „Weitere Exporte & Werkzeuge" (nur bei `canExport`).
- Button nutzt denselben Lade-/Disabled-Zustand wie die anderen Export-Buttons
  und zeigt beim Exportieren „GIFT wird erstellt…".
- Tooltip/Hilfetext: „Geschlossene Aufgaben als Quiz für Moodle (GIFT). Offene
  Aufgaben werden als Essay exportiert."
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck &&
  `pnpm -r test` grün (Schema 145, LLM 126, Renderer 38, Input 17, QA 103,
  Web 73, Export 20).

### Added — Freundliche Leerzustände in TrashView + HistoryView
- `apps/lua/apps/web/src/views/TrashView.tsx`: Bei leerem Papierkorb wird ein
  `EmptyState` (Icon `Trash2`, Überschrift, erklärender Satz, optionaler
  „Neue Übung erstellen"-Button) angezeigt.
- `apps/lua/apps/web/src/views/HistoryView.tsx`: Leerzustand-Text angepasst auf
  „Noch kein Verlauf" mit passendem Hinweis.
- `apps/lua/apps/web/src/views/_DocumentList.tsx`: `emptyMessage` optional,
  damit `TrashView` den Leerzustand selbst rendern kann.
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck &&
  `pnpm -r test` grün (Schema 145, LLM 126, Renderer 38, Input 17, QA 103, Web 73).

### Added — Subject Murals: Philosophie-Ambient-System
- Neues Ambient-Mural-System für fachbezogene Arbeitsflächen-Hintergründe:
  `SubjectMural`, `SubjectMuralLayer`, `subjectThemes`/JSON, `useSubjectTheme`
  und `murals.css`.
- Philosophie v1 nutzt die bereitgestellte Referenzgrafik als weich maskiertes
  Papier-/Aquarell-Mural in linken und rechten Ambient-Zonen; die Mitte bleibt
  durch Veil/Vignette ruhig und lesbar.
- Einstellungen erweitert um „Ambient-Murals aktivieren", „Bewegung reduzieren"
  und „Hintergrundeffekte reduzieren"; Änderungen wirken ohne Reload.

### Added — Daten-Integration: Stufen-Deskriptoren + Inhalts-Module (alle 12 Fächer)
- `apps/lua/scripts/generate-stoffkatalog-from-research.mjs` um
  `<fach>_stufen.json`-Pfad erweitert: ersetzt grobe Deskriptoren pro Fach
  durch schulstufen-genauere (5–12); StoffItems bleiben grob und verlinken
  Unterstufe (≤ 8) / Oberstufe (≥ 9) passend.
- Alle 12 `apps/lua/apps/web/src/lib/stoffkatalog/<fach>.ts` neu generiert;
  keine verwaisten `deskriptorIds`, keine Dup-IDs.
- `apps/lua/scripts/generate-inhaltskatalog-from-research.mjs` neu: liest
  `<fach>_module.json` und erzeugt `apps/lua/apps/web/src/lib/inhaltskatalog/<fach>.ts`
  + `index.ts` für alle 12 Fächer.
- `apps/lua/apps/web/src/lib/coverage.ts`: `computeCoverage` beachtet optional
  `meta.schulstufe` für grad-genauen Kompetenznachweis.
- Tests angepasst/grün gehalten:
  - `stoffkatalog.test.ts`: Entwurfs-Vermerk nach vollständiger Sourcierung
    korrigiert.
  - `coverage.test.ts`: Item-ID an neuen Stoffkatalog angepasst.
  - `inhaltskatalog.test.ts`: auf alle 12 Fächer mit Modulen aktualisiert.
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck &&
  `pnpm -r test` grün (Schema 145, LLM 126, Renderer 38, Input 17, QA 103, Web 73).

### Added — Inhalts-Module für Geschichte + Geographie (Welle C)
- `apps/lua/packages/schema/src/index.ts`: `InhaltsModulSchema` und optionales
  `inhaltsModulId` in `MetaSchema`/`AuftragSchema`.
- `apps/lua/apps/web/src/lib/inhaltskatalog/`: neuer Katalog mit
  `geschichte.ts`, `geographie.ts` und `index.ts` (`listInhaltsModule`,
  `getInhaltsModul`) — gleiche Fallback-Filterregel wie bei `stoffkatalog`.
- `apps/lua/apps/web/src/views/KompetenzView.tsx`: optionaler
  Inhalts-Modul-Selektor (nur bei vorhandenen Daten); Thema-Prefill und
  Weitergabe von `inhaltsModulId` an `meta`/`auftrag`.
- `apps/lua/packages/llm/src/types.ts`: `GenerateInput.inhaltsModul`;
  `apps/lua/apps/web/src/hooks/useGenerate.ts`: baut und reicht das Modul in
  beide Generate-Aufrufe durch; `packages/llm/src/prompt.ts`: inhaltlicher
  Rahmen im Kompetenz-Zweig.
- `apps/lua/packages/schema/src/schema.test.ts`: Tests für `InhaltsModulSchema`;
  `apps/lua/apps/web/src/lib/inhaltskatalog/inhaltskatalog.test.ts`:
  Integritätstest (keine Dup-IDs, gültige fach/stufe-Werte).
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck &&
  `pnpm -r test` grün (Schema 145, LLM 126, Renderer 38, Input 17, QA 103, Web 73).

### Added — Schulstufen-Granularität 5–12 im Kompetenz-Modus (Welle B)
- `apps/lua/packages/schema/src/index.ts`: `SCHULSTUFEN`, `stufeFromSchulstufe(s)`
  und optionales `schulstufe`-Feld an `DeskriptorSchema`, `StoffItemSchema`,
  `MetaSchema` und `AuftragSchema`.
- `apps/lua/apps/web/src/lib/stoffkatalog/index.ts`: `listStoffItems` und
  `listDeskriptoren` mit optionalem `schulstufe`-Parameter und Fallback-Regel
  (exakte Schulstufe ODER grobe Stufe, wenn keine Schulstufe angegeben).
- `apps/lua/apps/web/src/views/KompetenzView.tsx`: Schulstufen-Wähler 5–12
  plus „ganze Unter-/Oberstufe"; `stufe` bleibt synchron; `schulstufe` fließt
  in `meta`/`auftrag` ein.
- `apps/lua/packages/llm/src/prompt.ts`: altersgenauer `zielgruppeHinweis` mit
  konkreter Schulstufe/Klasse AHS, wenn `meta.schulstufe` gesetzt.
- `apps/lua/packages/schema/src/schema.test.ts`: Tests für `schulstufe` und
  `stufeFromSchulstufe`.
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck &&
  `pnpm -r test` grün (Schema 141, LLM 126, Renderer 38, Input 17, QA 103, Web 67).

### Added — Multi-Kompetenz-Auswahl im Kompetenz-Modus (Welle A)
- `apps/lua/apps/web/src/views/KompetenzView.tsx`: Stoff-Item-Auswahl von
  Single-`<select>` auf Checkbox-Kacheln (gruppiert nach Kompetenzbereich)
  umgestellt; mehrere Items gleichzeitig wählbar.
- State `stoffItem` → `stoffItemIds`; `handleErstellen` übergibt das Array an
  `meta`/`auftrag`; `thema`-Fallback nutzt das erste gewählte Item.
- `toggleStoffItem`: Thema-Prefill nur bei exakt einer Auswahl, sonst Typen
  aus `defaultAufgabentypen` aller gewählten Items in `gewuenschteTypen` mergen.
- `apps/lua/packages/llm/src/prompt.ts`: Verzahnungs-Anweisung im
  Kompetenz-Zweig — mehrere `stoffItems` sollen organisch in EINEM Arbeitsblatt
  umgesetzt werden, keine getrennten Teilblätter.
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck &&
  `pnpm -r test` grün (Schema 133, LLM 126, Renderer 38, Input 17, QA 103, Web 67).

### Added — Phase-0 Launch-Härtung (Generator-only, NATASCHA gegated)
- `apps/lua/apps/web/src/lib/features.ts`: neues Feature-Flag `FEATURES.natascha = false`.
- `apps/lua/apps/web/src/components/Sidebar.tsx`: NATASCHA-Nav-Items
  (`klassen`, `korrektur`, `schueler`, `erwartungshorizont`) ausgeblendet, wenn
  `FEATURES.natascha` aus ist.
- `apps/lua/apps/web/src/views/DashboardView.tsx`: NATASCHA-Klassenstats/-Widgets
  nur noch bei `FEATURES.natascha`.
- `apps/lua/apps/web/src/components/Step0_Absicht.tsx`: Closed-Loop-Einstieg
  (`consumePendingUebung`, `FehlerKuration`, NATASCHA-Export-Sektion) gegated.
- `apps/lua/apps/web/src/App.tsx`: NATASCHA-Views landen bei ausgeschaltetem
  Flag auf dem Dashboard; First-Run-Onboarding-Gate verlangt mindestens einen
  API-Key, bevor die App bedienbar wird (nur Tauri).
- `apps/lua/apps/web/src/hooks/usePdfExport.ts` +
  `apps/lua/apps/web/src/components/Step4_Generate.tsx`: LibreOffice-Verfügbarkeit
  abfragen (Command vom Chief) — PDF-Button nur anzeigen, sonst dezenter Hinweis.
- `apps/lua/apps/web/src/components/SettingsPanel.tsx`: optionales
  `onKeySaved`-Callback für das Onboarding-Gate.
- `apps/lua/apps/web/src/views/TrashView.tsx`: freundlicherer Leerzustand mit
  Aktion „Neue Übung erstellen".
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck &&
  `pnpm -r test` grün (Schema 132, LLM 126, Renderer 38, Input 17, QA 103, Web 67).

### Added — Rollenkarten-Set UI-Editor
- `apps/lua/apps/web/src/lib/constants.ts`: Baukasten-Kachel „Rollenkarten-Set"
  (`Layers`-Icon) + Freigabe für Unter- und Oberstufe.
- `apps/lua/apps/web/src/components/BlockConfigPanel.tsx`: Neuer Zweig für
  `rollenkartenSet` — Rahmen, Zeit pro Paar, KI/Manuell-Toggle, editierbare
  Rollenliste (2–3 Rollen), Szenario-Anzahl (1–15), manuelle Szenario-Titel
  und Toggles für Schnittlinie/Team-Feld.
- `apps/lua/apps/web/src/lib/commands.ts`: Schnell-Einfügen-Befehl für
  „Rollenkarten" / „rollenkartenSet".
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck &&
  `pnpm -r test` grün (Schema 132, LLM 126, Renderer 38, Input 17, QA 103, Web 67).

### Added — Rollenkarten-Set-Modus (Sprech-Differenzierung) — Fundament (Chief)
- Neuer Blocktyp `rollenkartenSet`: EINE Rollen-Struktur (2–3 Rollen) × N Szenarien — jedes
  Schüler-Paar bekommt ein eigenes Szenario mit gleicher Rollenmechanik (Reporter/Experte-Muster
  aus Nataschas „Disaster Reports"-Vorlage).
- schema: neue Block-/Rollen-/Szenario-Schemata + Union + BlockTyp-Enum + Tests.
- prompt: Beschreibungs-Sektion + Few-Shot (aus der Referenz-DOCX) + Preserve-Regel (manuelle
  Szenario-Titel/Rollen bleiben wortgleich).
- renderer: `buildRollenkartenSet` — Karten als gerahmte Tabellen (Rolle + Team-Feld, Szenario,
  Fakten, Sprech-Reihenfolge, Inhalts-Bullets, Sprach-Hinweis), Schnittlinie zwischen Paaren.
- qa: `rollenkartenSet` erzeugt kein Korrekturraster (Sprechprodukt). normalize: leere Punkte gefiltert.
- web: createDefaultBlock + Labels + blockToRequest (BlockRequest-Variante) — Generierung lauffähig.
- Live-Smoke (DeepSeek): Rahmen + 4 Szenarien × 2 Rollen × 4 Punkte, gerendert. UI-Editor (BlockConfigPanel,
  Baukasten-Kachel) = Kimi.

### Added — Gesourcte Lehrplan-Recherche in Stoffkatalog integriert (Task 2)
- `apps/lua/scripts/generate-stoffkatalog-from-research.mjs`: `--only`-Filter,
  `--output`-Verzeichnis wird rekursiv angelegt, `DEFAULT_AUFGABENTYPEN`-Mapping
  je Kompetenzbereich (1–2 BlockTyp-Werte pro StoffItem).
- `apps/lua/scripts/merge-language-stoffkatalog.mjs`: neues Merge-Skript für
  Sprachfächer; ersetzt Skill-Blöcke aus `docs/lehrplan-quellen/` und behält
  kuratierte Grammatik-/Wortschatz-/Sprachmittlungs-/Literatur-Blöcke bei.
- Sachfächer `ethik`, `geschichte`, `geographie`, `philosophie` vollständig aus
  den Recherche-JSONs neu generiert (Voloverwrite, verlustfrei).
- Sprachfächer `deutsch`, `englisch`, `franzoesisch`, `italienisch`, `spanisch`
  gemerged: gesourcte Skill-Deskriptoren + erhaltene kuratierte Spezialbereiche.
- `latein`, `religion`, `psychologie` nachträglich aus `docs/lehrplan-quellen/`
  generiert; Mapping um Latein-/Religions-/Psychologie-Kompetenzbereiche erweitert.
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck &&
  pnpm -r test` grün (Schema 129, LLM 126, Renderer 38, Input 17, QA 103, Web 64).

### Added — SRDP-Matura-Modus (Task 1, Deutsch + Englisch)
- `packages/schema/src/index.ts`: neuer Unterlagentyp `'matura'` + `PROFILE.matura`
  (SRDP-Struktur, K1/K3-Hinweis, Raster + Notenschlüssel, ~270 Min).
- `packages/renderer/src/template.ts`: nüchternes Render-Template `'srdp'` (formell, s/w).
- `packages/qa/src/korrekturraster/`: SRDP-Deutsch-Katalog (K1 Inhalt/Textstruktur, K3
  Ausdruck/Sprachnormen); `waehleKatalog` routet bei `typ==='matura'` (DE → SRDP, EN → Open Writing).
- `packages/llm/src/prompt.ts`: `maturaHinweis` (SRDP-Format je Fach) in beide Prompt-Pfade.
- `apps/web/src/components/Step0_Absicht.tsx`: Unterlagentyp-Kachel „Matura (SRDP)" +
  automatische Vorwahl des `srdp`-Templates.
- `apps/lua/scripts/srdp-smoke.mjs`: Live-Smoke DE + EN (DeepSeek) — K1/K3- bzw. Open-Writing-Raster.
- Tests: schema (matura-Profil + Skelett), qa (matura → SRDP/Open-Writing). Schema 129, QA 103.

### Added — In-App-Auto-Fetch Ausgangstext (Task 4b UI)
- `apps/lua/apps/web/src/hooks/useNatascha.ts`: neuer `quelltextGet(klasse, aufgabe)`-Getter,
  ruft `natascha_quelltext_get` (Chief: Rust/Python) ab und liefert den gespeicherten Ausgangstext.
- `apps/lua/apps/web/src/views/KlassenView.tsx`: `handleGenerateUebung` ist jetzt async und
  befüllt `prefill.ausgangstext` mit dem Ausgangstext der gewählten Klasse/Aufgabe.
- `apps/lua/apps/web/src/views/SchuelerView.tsx`: `handleGenerateUebung` holt den Ausgangstext
  der jüngsten Aufgabe aus dem Längsschnitt (`laengsschnitt.verlauf`) und setzt ihn in den Prefill.
- Step0 konsumiert den Ausgangstext bereits als Quelltext — Closed Loop damit komplett.

### Added — Quick-Übung als eigener 1-Screen (Task 3b)
- `apps/lua/apps/web/src/lib/types.ts`: `ActiveView` um `'quick'` erweitert.
- Neue `apps/lua/apps/web/src/views/QuickExerciseView.tsx`: Eingaben Thema, Fach, Stufe,
  Aufgabentyp (nach Stufe gefiltert) → `buildSkelett` → sofortiger Sprung in den Baukasten.
- `apps/lua/apps/web/src/App.tsx`: View-Route + Titel für `quick` eingetragen.
- `apps/lua/apps/web/src/components/Sidebar.tsx`: Sidebar-Eintrag „Schnell-Übung" (Zap-Icon).
- `apps/lua/apps/web/src/views/DashboardView.tsx`: Dashboard-Kachel „Eigene Schnell-Übung".

### Added — Einheitliche Empty-States für leere Views (Task 3a)
- Neue wiederverwendbare `EmptyState`-Komponente in `apps/web/src/views/_EmptyState.tsx`
  (Icon + Titel + Beschreibung + optional CTA), orientiert am bestehenden Muster in
  `_DocumentList.tsx`.
- `HistoryView.tsx`: Aufgewerteter Leerzustand mit CTA „Neue Übung erstellen".
- `KlassenView.tsx`: Freundliche Leerzustände für „Noch keine Klassen", „Keine Noten",
  „Keine Fehlerdaten" und „Wähle eine Klasse".
- `SchuelerView.tsx`: Leerzustände für „Noch keine Klassen", „Keine Schüler in dieser
  Klasse" und „Wähle eine Klasse und einen Schüler".
- `App.tsx`: `onCreateNew` an `HistoryView` durchgereicht.
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test`
  grün (Schema 127, LLM 126, Renderer 38, Input 17, QA 101, Web 64).

### Added — Kompetenz-Modus: Sachfach-Stoffkataloge Welle 2
- Neue Fach-Kataloge für die 6 Sachfächer in `apps/web/src/lib/stoffkatalog/`:
  `geschichte.ts`, `geographie.ts`, `religion.ts`, `ethik.ts`, `psychologie.ts`,
  `philosophie.ts`. Jeder Katalog hält je Stufe (Unter-/Oberstufe) Deskriptoren
  und Stoff-Items pro Kompetenzbereich (exakte Namen aus `KOMPETENZBEREICHE`
  in `@lehrunterlagen/schema`).
- `apps/web/src/lib/stoffkatalog/index.ts`: Alle neuen Fächer in die
  Aggregat-Arrays `DESKRIPTOREN` und `STOFF_ITEMS` eingetragen.
- Deskriptoren sind als kuratierte Entwürfe gekennzeichnet (`quelle` =
  „Entwurf, angelehnt an BMBWF-Lehrplan AHS <Fach> …").
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test`
  grün (Schema 127, LLM 126, Renderer 38, Input 17, QA 101, Web 64).

### Added — Neuer Aufgabenblock: Rollenspiel (Roleplay)
- `packages/schema/src/index.ts`: Neuer `RoleplayBlock` mit Situation, Setting,
  Ziel, Zeitvorgabe, gemeinsamen + rollenspezifischen Redemitteln, 2–4 Rollen,
  Bewertungs-Checkliste und Lösung (Musterdialog + Lehrerhinweise). Der Block
  trägt immer 0 Punkte (reine Sprechübung).
- `packages/llm/src/prompt.ts`: System-Prompt, Beispiel-JSON und
  Manuell/Hybrid-Instruktionen für Rollenspiele.
- `packages/llm/src/normalize.ts`: `normalizeRoleplay` bereinigt Rollen,
  Redemittel, Bewertung und Zeitangaben aus LLM-Antworten.
- `packages/renderer/src/index.ts`: `buildRoleplay` rendert Schülerfassung mit
  Situation/Ziel/Zeit, gemeinsamer Wortbank und gerahmten Ausschneide-Karten pro
  Rolle; Lösung zeigt Musterdialog und Hinweise.
- `apps/web/src/components/BlockConfigPanel.tsx`: Vollständiger Editor für
  Rollenspiele inkl. KI/Manuell-Umschalter, Rollen-Editor und Redemittel-Listen.
- `apps/web/src/components/BlockPreviewRoleplay.tsx` + `BlockPreview.tsx`:
  Live-Vorschau der Rollenkarten und des Musterdialogs.
- `apps/web/src/lib/constants.ts`: Rollenspiel in Block-Typ-Definitionen und
  Stufen-Regeln (Unter-/Oberstufe) aufgenommen.
- `apps/web/src/hooks/useGenerate.ts`: Roleplay-Blöcke werden korrekt in den
  LLM-Generate-Input überführt (Hybrid-Modus unterstützt).
- `packages/qa/src/korrekturraster/builder.ts`: Rollenspiele liefern ein leeres
  Korrekturraster (keine schriftliche Bewertung).
- `docs/ANLEITUNG.md` + `apps/web/src/views/HelpView.tsx`: Dokumentation des
  neuen Blocktyps mit Best Practices und Beispiel.
- Tests: Schema-Validierung, Normalizer, Renderer, BlockDefaults.

### Added — Selbsteinschätzungsbogen (Quick Win #5)
- `packages/renderer/src/index.ts`: `renderSelbsteinschaetzungToBlob(raster, lernziele, template)`
  — ein DOCX, das Schüler/innen VOR der Abgabe ausfüllen. Aussagen aus Lernzielen
  („Ich kann: …") + eindeutigen Raster-Kriterien, 3-stufige Skala (sicher/teilweise/
  unsicher) + Reflexionszeilen. Kein LLM, fach-lokalisiert (DE/EN).
- `apps/web/src/hooks/useExport.ts`: `exportSelbsteinschaetzung(state)` (buildRaster +
  Lernziele → Blob, Dateiname `…_Selbsteinschaetzung.docx`).
- `apps/web/src/components/Step4_Generate.tsx`: Knopf „Selbsteinschätzungsbogen"
  im Akkordeon „Weitere Exporte & Werkzeuge".

### Added — Früh-Warnung bei fehlendem API-Key
- `apps/web/src/components/Step3_LLMOptions.tsx`: prüft beim Provider-Wechsel, ob ein
  Key im Keychain liegt; sonst Hinweis + Direkt-Button zu den Einstellungen (statt
  erst beim Generieren zu scheitern).
- `PROVIDER_KEY_IDS` nach `lib/constants.ts` ausgelagert/exportiert (gemeinsames
  Mapping UI-Provider → Keychain-ID, verhindert falsch-negative Warnungen bei claude/chatgpt).

### Added — UX-Friction: Quelltext wird optional für kleine Übungen
- `apps/web/src/components/Step1_Input.tsx`: Button „Ohne Quelltext fortfahren",
  wenn noch keine Quelltexte vorhanden sind.
- `apps/web/src/components/Step0_Absicht.tsx`: Neue Schnellstart-Kachelreihe
  „Schnell ohne Quelltext" für Kreuzworträtsel, Vokabeltest, Fehlerkorrektur.
- `apps/web/src/views/DashboardView.tsx` + `apps/web/src/App.tsx`: Shortcuts
  „Schnell ohne Quelltext" auf dem Dashboard; jeder Shortcut startet den Wizard
  direkt im Baukasten mit passendem Blocktyp und leeren Quelltexten.
- `packages/llm/src/prompt.ts`: Wenn `quelltexte` leer ist, bekommt das LLM
  explizit die Instruktion, Inhalte aus Thema + manuellen Vorgaben zu erfinden.
- `packages/schema/src/index.ts`: `DocumentSchema` erlaubt jetzt leere
  `quelltexte` auch im Text-Modus; entsprechender Test angepasst.
- `apps/lua/scripts/quick-exercise-smoke.mjs`: Echter LLM-Smoke-Test für den
  neuen Pfad ohne Quelltext (mit DeepSeek verifiziert).

### Added — F1: Quelltext-Check in Schritt 1
- `apps/web/src/lib/quelltextInfo.ts`: Heuristik für Wortzahl, Satzzahl und
  durchschnittliche Satzlänge ohne LLM.
- `apps/web/src/components/Step1_Input.tsx`: Pro Quelltext wird angezeigt:
  „{woerter} Wörter · Ø {schnitt} W/Satz · {hinweis}" mit Stufen-Einschätzung.
- `apps/web/src/lib/quelltextInfo.test.ts`: 7 Tests für kurze/mittlere/lange Sätze,
  leeren Text, Einzelsatz und Wortzahl-Extreme.

### Added — F3: Selbstlern-Variante (Übung + Lösungsteil in einem DOCX)
- `packages/renderer/src/index.ts`: `buildDocumentChildren` aus `buildDocxPacked`
  herausfaktorisiert; neue `renderSelbstlernToBlob` erzeugt ein DOCX mit
  Schülerfassung, Seitenumbruch und Lösungsteil (inkl. Englisch-Variante
  „Solutions").
- `apps/web/src/hooks/useExport.ts`: Neue `exportSelbstlern(state)` mit Dateiname
  `{datum}_{thema}_Uebung-mit-Loesung.docx`.
- `apps/web/src/components/Step4_Generate.tsx`: Button „Übung mit Lösungsteil" in
  der Export-Spalte.
- `packages/renderer/src/renderer.test.ts`: 2 Smoke-Tests für die Selbstlern-Variante.
- **Hinweis:** Chief-Review vor Merge empfohlen (Renderer-Refactor).

### Added — Vertrauens-Badge: „Lösungen prüfen" im Haupt-Modus
- `packages/llm/src/judge.ts` (Basis `921935a`): `runJudge` + `istRisikoTyp` exportiert.
- `apps/web/src/hooks/useGenerate.ts`: Neue `pruefeLoesungen(state)` mit `llm_complete`-Invoke,
  `runJudge`-Aufruf und Ladezustand `pruefend`.
- `apps/web/src/components/Step4_Generate.tsx`: Button „Lösungen prüfen" (nur bei
  `canExport`), Summenzeile „X geprüft · Y auffällig", Judge-Ergebnis wird an
  `PreviewTwoColumn` durchgereicht.
- `apps/web/src/components/PreviewTwoColumn.tsx`: Pro Risiko-Block (`multipleChoice`,
  `matching`, `lueckentext`, `offeneVerstaendnisfrage`) erscheint nach Prüfung ✓
  „Lösung geprüft" oder ⚠ „bitte prüfen" mit Tooltip der Befunde. Kein Extra-Call
  bei normaler Generierung.

### Added — Kimi-Specs Runde 2 (2026-06-17)
- `docs/ANLEITUNG.md`: Neue standalone-Anleitung, die alle 14 Hilfe-Abschnitte aus der
  In-App-Hilfe als reines Markdown abbildet (zum Ausdrucken/Onboarding außerhalb der App).
- `apps/web/src/components/PreviewTwoColumn.tsx`: Warnung vor Datenverlust beim
  „Neu generieren" einer manuell bearbeiteten Aufgabe via `window.confirm`;
  Bearbeitung wird bei Abbruch beibehalten.
- `apps/web/src/components/Step4_Generate.tsx`: Nach „3 Niveaus erzeugen" wird die
  Vorschau wieder auf die Mittel-Fassung zurückgesetzt, während die drei Exporte
  (`_leicht`, `_mittel`, `_schwer`) korrekt erzeugt werden.
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test`
  grün (Schema 118, LLM 123, Renderer 33, Input 17, QA 96, Web 54).

### Added — Kompetenz-Modus: Freitext-Kompetenz + „ohne Quelltext"-Tür
- `packages/schema/src/index.ts`: Neues optionales Feld `freieKompetenz` in `MetaSchema` und
  `AuftragSchema` — additiv, kein Breaking Change.
- `apps/web/src/views/KompetenzView.tsx`: Prominentes Freitextfeld für Kompetenz oder Thema;
  Katalog-Dropdown ist jetzt optional. Generierung möglich mit Freitext, Katalog-Item oder beiden.
- `apps/web/src/hooks/useGenerate.ts`: Guard akzeptiert `stoffItemIds` ODER `freieKompetenz`;
  bei Freitext wird ein synthetisches `StoffItem` erzeugt, das Prompt + Judge kontextualisiert.
  Judge-Anbieter auf DeepSeek (`deepseek-chat`) umgestellt; Fallback-Reihenfolge DeepSeek zuerst.
- `apps/web/src/components/Step4_Generate.tsx` + `apps/web/src/hooks/useExport.ts`: Bei rein
  freier Kompetenz (kein Katalog-Item) wird kein Coverage-Panel und kein
  „Kompetenznachweis exportieren" angeboten — stattdessen Hinweis „frei definiert, kein
  formaler Lehrplan-Nachweis".
- `apps/web/src/components/Step4_Generate.tsx`: `canGenerate` ist jetzt modus-bewusst:
  Im Kompetenz-Modus wird kein Quelltext für den „Inhalt generieren"-Button verlangt;
  Hinweistext passt sich entsprechend an.
- `apps/web/src/views/KompetenzView.tsx`: Neuer Schalter „Punkte vergeben" (Default an).
  Aus → `meta.punkteAusblenden = true` für einfache Übungen ohne Punkteangaben.
- `apps/web/src/components/PreviewTwoColumn.tsx`: A4-Vorschau spiegelt den didaktischen
  Rahmen 1:1 — sprechender Titel als H1, Fach/Thema in Unterzeile, Einleitung kursiv,
  Merkkasten als gerahmte Box, `block.beispiel` pro Block, Transferaufgabe „Zum Schluss –
  jetzt du!" mit Schreiblinien am Ende.
- `apps/web/src/components/Step0_Absicht.tsx`: Link-Text angepasst auf „Übung ohne Quelltext".

### Fixed — Welle 6: Natascha-Testfeedback (Bugs + Didaktik)
- `apps/web/src/lib/commands.ts`: Ctrl+K-/Command-Pfad für `multipleChoice` erzeugt jetzt
  4 Optionen (A–D), statt 2 — konsistent mit `createDefaultBlock` und Schema-Minimum.
- `apps/web/src/lib/blockDefaults.ts`: `createDefaultBlock` setzt bei `meta.punkteAusblenden === true`
  neue Blöcke auf `punkte: 0` (punktlose Schulübungen bleiben punktefrei).
- `packages/llm/src/normalize.ts`: Leere/whitespace Strings werden gefiltert in
  `config.aspekte`, MC-`optionen` und `distraktorWoerter`. Offene Schreibaufgabe bekommt
  bei ausschließlich leeren Aspekten einen sinnvollen Fallback (`['Inhalt', 'Struktur']`).
- `packages/llm/src/prompt.ts`: Didaktik-Härtung — Distraktoren an Stufe gekoppelt
  (Oberstufe = konzeptuell nahe, fein nuanciert; Unterstufe = klare Begriffsverwechslungen);
  `offeneSchreibaufgabe` mit ausführlicherer Schreibsituation, Adressat, Anlass, Medium;
  Beispiel angereichert.
- Verifikation: `pnpm -r build` + `pnpm -r test` grün (Schema 118, LLM 123, Renderer 31,
  Input 17, QA 96, Web 52).

### Added — Kimi-Specs 2026-06-16
- `packages/llm/src/prompt.ts`: Zielgruppen-Hinweis (`meta.klasse` + `meta.stufe`) in beiden
  Prompt-Pfaden (normal + kompetenz).
- `apps/web/src/index.css`: Dark-Theme `.btn-primary` bekommt dunklen Text (`#14241F`) für
  besseren Kontrast auf dem hellen Akzent.
- `apps/web/src/index.css`: Tote `.door-icon`-Regel entfernt (war bereits nicht mehr im Code).
- `apps/web/src/components/Step4_Generate.tsx`: Quality-Gate vor DOCX-Export —
  `checkLernzielCoverage` und `checkSchreibaufgabe` zeigen mögliche Probleme; Export erst nach
  „Trotzdem exportieren".
- `apps/web/src/lib/niveauTransform.ts` + `apps/web/src/hooks/useExport.ts` +
  `apps/web/src/components/Step4_Generate.tsx`: 3-Niveau-Differenzierung — Button „3 Niveaus
  erzeugen" erstellt `_leicht`, `_mittel`, `_schwer` Fassungen. „leicht" = reine TS-Transformation
  ohne LLM; „schwer" = regenerateBlock nur für offene Blöcke.
- Verifikation: `pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test`
  grün (Schema 118, LLM 123, Renderer 31, Input 17, QA 96, Web 52).

### Added — Kompetenz-Modus: Stoffkatalog-Erweiterung Unterstufe Englisch
- `apps/web/src/lib/stoffkatalog.ts`: Neue Deskriptoren + Stoff-Items für Unterstufe Englisch:
  `Present Perfect Simple`, `Past Simple vs. Present Perfect`, `Questions, Negation, Short Answers`.
  Deckt Nataschas erste Anfrage ab; Integritätstest (`coverage.test.ts`) bleibt grün.
- Verifikation: `pnpm -r build` + `pnpm -r test` grün (Schema 118, LLM 123, Renderer 31,
  Input 17, QA 96, Web 52).

### Added — Kompetenz-Modus: Phase 4 (Coverage-Export + UI + Stoffkatalog-Erweiterung)
- `apps/web/src/hooks/useExport.ts`: `exportKompetenzraster(state)` berechnet über
  `lib/coverage.computeCoverage` die abgedeckten/fehlenden Deskriptoren und exportiert
  sie als `<datum>_<thema>_Kompetenznachweis.docx` via `renderer.renderCoverageToBlob`.
- `apps/web/src/components/Step4_Generate.tsx`: Coverage-Panel (abgedeckt grün /
  fehlend grau) + Button „Kompetenznachweis exportieren", strikt nur wenn
  `meta.modus === 'kompetenz'`.
- `apps/web/src/lib/stoffkatalog.ts`: Katalog erweitert auf Englisch Unterstufe
  (6 Items) sowie Deutsch Unterstufe (5 Items) und Oberstufe (5 Items). Alle
  Stoff-Items verweisen referentiell korrekt auf Deskriptoren desselben Fachs/Stufe;
  Coverage-Integritätstest bleibt grün.
- Verifikation: `pnpm -r build` + `pnpm -r test` grün (Web 52 Tests inkl.
  `coverage.test.ts`).

### Added — Kompetenz-Modus: Phase 2b (grammatik-bewusster Judge)
- `packages/llm/src/judge.ts`: `runKompetenzJudge` + `buildKompetenzJudgePrompt` —
  LLM-as-Judge für erfundene Übungsinhalte (umformung/fehlerkorrektur) ohne Quelltext:
  prüft sprachliche Korrektheit der Musterlösung, Aufgabe↔Lösung-Konsistenz und
  Passung zu Stoff-Item/Niveau. „hart" → error (löst Reparaturrunde aus), „weich" → Warnung.
- `packages/llm/src/quality.ts`: `runQualityChecks` ruft im Kompetenz-Modus den
  Kompetenz-Judge auf (wenn `complete` verfügbar), inkl. Stoff-Item-/Niveau-Kontext.
- `packages/llm/src/validate.ts`: `parseAndValidate` nimmt optional aufgelöste
  `stoffItems` für den Judge-Kontext entgegen.
- `packages/llm/src/judge.test.ts`: 6 Tests (korrekt/hart/weich/Kontext/Typ-Filter/API-Fehler).

### Added — Kompetenz-Modus: Phase 2 (Prompt-Dualität + Validierung)
- `packages/llm/src/prompt.ts`: `SYSTEM` in gemeinsame `BLOCK_REGELN` + Text-/Kompetenz-Kopf
  gesplittet (Text-Modus unverändert); Block-Regeln + Beispiele für `umformung`/`fehlerkorrektur`;
  `buildMessages` schaltet auf `meta.modus`; IB-Command-Terms bei `rahmenwerk === 'ib-dp'`.
- `packages/llm/src/quality.ts`: Quelltext-Grounding/Schreibaufgaben-Check im Kompetenz-Modus
  übersprungen.

### Added — Kompetenz-Modus: Phase 0 + 1b (App-Wiring + Stoffkatalog + UI)
- `apps/web/src/views/KompetenzView.tsx`: Neue 1-Screen-Ansicht für Kompetenz-Übungen.
  Wahl von Rahmenwerk, Fach, Stufe, Stoff-Item, Thema/Kontext, Niveau und Aufgabentypen.
  Setzt `modus: 'kompetenz'`, baut deterministisches Skelett (`buildSkelett`) und ruft
  `useGenerate().generate()` direkt auf.
- `apps/web/src/lib/stoffkatalog.ts`: Proof-Slice mit 8 englischen Grammatik-Stoff-Items
  (Oberstufe, at-lehrplan) + zugehörigen Deskriptoren; Lookup-Funktionen
  `listStoffItems`, `getStoffItems`, `getDeskriptoren`, `getAllDeskriptoren`.
- `apps/web/src/hooks/useGenerate.ts`: Modus-abhängige Guards (Kompetenz: keine
  Quelltextpflicht, aber `stoffItemIds` erforderlich); `GenerateInput` bekommt leere
  `quelltexte` und `stoffItems` im Kompetenz-Modus; `regenerateBlock` ebenfalls modus-aware.
- `apps/web/src/lib/types.ts`: `ActiveView` um `'kompetenz'` erweitert.
- `apps/web/src/components/Sidebar.tsx`: Neuer Navigationspunkt „Kompetenz-Übung"
  mit `Target`-Icon.
- `apps/web/src/components/Step0_Absicht.tsx` + `apps/web/src/App.tsx`: Link
  „Aus Kompetenz erstellen" im Absicht-Schritt; `KompetenzView` in `renderView` eingebunden.
- Verifikation: `pnpm -r build` und `pnpm -r test` alle grün (Schema, LLM, Renderer,
  Input, QA, Web).

### Added — Kompetenz-Modus: Phase 0 + 1 (Schema + 2 neue Blocktypen)
- `packages/schema/src/index.ts`: Neuer `Modus` (`text` | `kompetenz`), `Rahmenwerk`
  (`at-lehrplan` | `ib-dp`), `Bewertungsschema` (`at-1-5` | `ib-1-7`), `Deskriptor`,
  `StoffItem`. `MetaSchema` und `AuftragSchema` um Kompetenz-Felder erweitert.
- `DocumentSchema`: Quelltext-Pflicht ist jetzt modus-abhängig (`refine`); Kompetenz-Modus
  darf leere `quelltexte` haben.
- Zwei neue Blocktypen: `umformung` (Satztransformation) und `fehlerkorrektur`
  (Fehler finden + korrigieren) — Schema, Skelett, Renderer, Web-Config, Web-Preview,
  Korrekturraster-Logik und Block-Typ-Definitionen.
- `packages/llm/src/types.ts`: `GenerateInput` um `stoffItems` erweitert; `BlockRequest`
  um `umformung` und `fehlerkorrektur` erweitert.
- Tests erweitert: Schema-Tests für neue Typen, Kompetenz-Modus-Document, Refinement,
  BlockTyp-Enum.
- Verifikation: `pnpm -r build` und `pnpm -r test` alle grün (Schema, LLM, Renderer,
  Input, QA, Web).

### Added — Stage 4: LLM-Klassen-Briefing + Schüler-Profil
- **KI-Klassen-Briefing** (Statistik-Tab in `KlassenView`): Button „Briefing generieren" ruft
  `klassen-briefing`-CLI auf (aggregiert Fehlerheatmap, Notenverteilung, Trend, Kalibrierung → LLM
  → speichert in `klassen_briefing`-Tabelle). Letztes Briefing wird beim Klassen-Wechsel automatisch
  geladen. Rust-Command `natascha_klassen_briefing`, Rust-Read `db_get_klassen_briefing`.
- **KI-Schüler-Profil** (`SchuelerView`): Button „Profil generieren" ruft `schueler-profil`-CLI
  auf (Längsschnitt → LLM → speichert in `schueler_profil`-Tabelle). Profil wird beim
  Schüler-Wechsel automatisch geladen. Rust-Command `natascha_schueler_profil`,
  Rust-Read `db_get_schueler_profil`.
- **Python CLI** (`natascha_cli.py`): `cmd_klassen_briefing` + `cmd_schueler_profil` rufen jetzt
  `nc.run_llm_api()` auf + speichern via `ndb.save_klassen_briefing/save_schueler_profil`.
  `--provider`/`--model` Override-Args ergänzt. `_apply_provider_override()` als Helper.
- TS-Hooks `generateKlassenBriefing`, `generateSchuelerProfil`, `getKlassenBriefing`,
  `getSchuelerProfil` in `useNatascha.ts` + Interfaces `KlassenBriefingRow`, `SchuelerProfilRow`.
- Verifikation: 41 Web-Tests, 27 Rust-Tests, `tsc`, `cargo check` alle grün.

### Added — Stage 3b: Korrektur-Feedback-Vorschau (Schülertext annotiert)
- `KorrekturView`: neues **„Schülertext mit Markierungen"**-Panel nach der Fehler-Liste.
  Klappt per Toggle auf (Eye/EyeOff). Rendert `rohtext` mit farbigen Inline-Markierungen
  für jedes `fehler_historie.zitat` (R=rot, G=grün, Z=blau, A=orange). Legende unten.
  `annotateText()`-Funktion findet Zitatpositionen, löst Überlappungen auf (first-wins),
  rendert React-Nodes. Keine DOCX-Erstellung mehr nötig für die Schnell-Übersicht.
- `AbgabeInfo` (Rust struct + SQL): `rohtext: Option<String>` hinzugefügt. `db_get_abgabe_detail`
  selektiert jetzt `a.rohtext` (Spalte 16). `db_get_abgaben` (Listen-View) setzt `rohtext: None`
  (kein unnötiger Datentransfer). TypeScript-Interfaces in `useNatascha.ts` +
  `KorrekturView.tsx` entsprechend ergänzt (`rohtext: string | null`).
- Verifikation: 41 Web-Tests, 27 Rust-Tests, `tsc --noEmit`, `cargo check` alle grün.

### Added — Erwartungshorizont speichern + in der Korrektur nutzen
- `ErwartungshorizontView`: Ergebnis ist jetzt **bearbeitbar** (Textarea) +
  Button **„Akzeptieren & speichern"** → schreibt `rubrics/erwartungshorizont_*.md`
  und verlinkt ihn in der Config (CLI `erwartungshorizont-save`, Text via stdin;
  nutzt NATASCHAs `save_erwartungshorizont_to_config`). Die Korrektur lädt ihn dann
  automatisch (`load_erwartungshorizont`). Rust-Command `natascha_save_erwartungshorizont`
  (stdin-Piping), Hook `saveErwartungshorizont`. CLI-Roundtrip smoke-getestet.

### Added — Closed Loop: Heatmap → Übungsblatt (1 Klick)
- `KlassenView` (Fehler-Heatmap): Button **„Übungsblatt zu Top-Fehlern generieren"**
  springt direkt in LUAs Generator (Step0) — Top-3-Fehlerkategorien werden zu
  `meta.fokusThemen` + passenden Aufgabentypen (`KATEGORIE_TO_BLOCKTYPEN`),
  Thema/Notizen vorbefüllt. **Keine Datei-Brücke mehr nötig** (eine App, gemeinsame
  DB): transiente In-Memory-Übergabe `lib/korrekturBridge.ts`, Step0 konsumiert sie
  beim Mounten. Schließt den Loop Korrigieren→Üben in einem Klick.

### Added — UX: Baukasten-Blocktyp komplett entfernen
- In `Step2_Baukasten` lässt sich ein ganzer Blocktyp per **X** (oben rechts)
  entfernen; der Zähler wandert nach oben links (Design-Konsistenz). Karte von
  `<button>` auf `<div role="button">` umgestellt (valides HTML für den inneren
  X-Button) inkl. Tastatur-Support. Neue Reducer-Action `REMOVE_BLOCKS_BY_TYPE`
  + `removeBlocksByType` in `useBlocks`.

### Added — Welle 4b: Erwartungshorizont-Generator (UI)
- Neue `ErwartungshorizontView` + Sidebar-Eintrag „Erwartungshorizont": Klasse
  wählen, Aufgabe (mit Vorschlägen aus vorhandenen Aufgaben) → „Generieren" ruft
  NATASCHAs LLM-Erwartungshorizont (Backend war bereits da) → Markdown-Ergebnis
  mit Kopieren-Button.
- `useNatascha.generateErwartungshorizont` wirft den (kategorisierten) Fehler jetzt
  durch, statt ihn zu schlucken — die View zeigt „API-Key fehlt" etc.

### Added — Härtung (Tests + Fehler-Sichtbarkeit)
- **Rust-Unit-Tests** für `natascha_read.rs`: Read-Logik in testbare
  `*_impl(conn, …)`-Helfer extrahiert (list_aufgaben, fehler_heatmap, schueler-
  CRUD); Tests gegen In-Memory-`rusqlite` (Schema laden → seeden → Aggregat/CRUD
  prüfen). `cargo test` 27 grün.
- **P1-4:** Fire-and-forget-DB-Writes in `storage.ts` laufen über `persist()` —
  Fehler werden geloggt (+ optionaler `setPersistErrorHandler` für UI-Toasts),
  statt dass Cache und DB still auseinanderlaufen.

### Added — Welle 4: Aufgabe/Klasse/Rubrik nativ anlegen
- **CLI** (`natascha_cli.py`): `add-klasse`, `add-aufgabe` (mit `--fach/--schulstufe/
  --textsorte/--rubric`), `list-rubrics` — nutzen NATASCHAs vorhandene, kommentar-
  erhaltende Config-Schreiber (`nc.add_class_to_config`/`add_aufgabe_to_config`/
  `rubric_options_for`/`default_rubric_for`). Smoke-getestet (Config-Roundtrip).
- **Rust** (`natascha.rs`): `natascha_add_klasse`/`natascha_add_aufgabe`/
  `natascha_list_rubrics` (Sidecar) + Registrierung.
- **UI** (`SchuelerView`): „Aufgabe anlegen (Rubrik)"-Formular (Bezeichnung, Fach,
  Schulstufe, Rubrik-Dropdown). `useNatascha` um `addKlasse`/`addAufgabe`/
  `listRubrics` erweitert. (Schüler-Anlegen war bereits da; Klassen entstehen
  automatisch.)

### Added — M1 Polish (Fehler + Dev-Seed)
- **Strukturierte Analyse-Fehler:** `natascha.rs` kategorisiert CLI-Fehler jetzt
  (API-Key fehlt / Netzwerk / Ratenlimit / fehlende Python-Deps / Python nicht
  startbar) statt rohem stderr/Traceback durchzureichen (`categorize_cli_error`).
- **Dev-Seed-Button:** `natascha_seed_testdaten` (Rust) führt `seed_testdaten.py`
  in die gemeinsame DB aus; Button „Testdaten laden (Dev)" + DB-Pfad-Anzeige im
  Einstellungen-Abschnitt „NATASCHA". Behebt das „Views sind leer"-Rätsel beim Testen.

### Changed/Removed — M2 Aufräumen (eine Read-Quelle, Bugfixes)
- **Doppelten Read-Pfad entfernt:** Die 6 ungenutzten CLI-Sidecar-Read-Commands
  (`natascha_klassen_liste/aufgaben/abgaben/heatmap/notenverteilung/statistik` in
  `natascha.rs`) und ihre Python-Pendants in `natascha_cli.py` gelöscht. LUA liest
  ausschließlich über den Rust-Read-Layer (`natascha_read.rs`, `db_*`). Kein
  Drift-Risiko mehr durch zwei Read-Implementierungen.
- **`feedback-docx`-Bug behoben:** suchte die Abgabe via
  `get_abgaben_by_klasse_aufgabe(db,"","")` (leere Filter → nichts gefunden) + toter
  Loop. Jetzt direkter `SELECT * FROM abgabe WHERE id=?`.
- **`db_set_path`** stellt die gemanagte Connection jetzt sofort um (vorher erst nach
  Neustart wirksam).
- `natascha_schema.sql` mit Hinweis versehen, dass NATASCHA Schema-Eigentümer ist
  (1:1-Spiegelung). Ungenutzter `Mutex`-Import entfernt.

### Fixed — M0 Blocker + WSLg-Crash (Review-Nacharbeit)
- **DB-Split-Brain behoben:** `natascha_analyze` schrieb über die CLI in
  `natascha_schuljahr.db`, während die UI aus `lehr-suite.db` las → Analysen tauchten
  nie in den Views auf. Jetzt ist Rust Single Source of Truth: `natascha.rs`
  `build_cli_command` reicht `--db-path` (`db::resolve_db_path`) an `natascha_cli.py`
  (neues globales `--db-path`); `natascha_config.toml [database] path` aktiv auf
  `~/lehr-suite-bridge/lehr-suite.db` (für TUI/seed). Verifiziert: seed → CLI-Read
  finden dieselben Daten.
- **`require()`-Runtime-Crash** in `useNatascha.ts` (3×) → echtes
  `import { loadSettings }` (Vite/ESM kennt kein `require`; Analyse-Button war so tot).
- **Terminal-Start-Crash unter WSLg** (`fontpack.cc: No suitable files for '9x18'`):
  `x-terminal-emulator` → Zutty stürzt ohne die Bitmap-Schrift ab. `launch_natascha`
  bevorzugt jetzt `xterm` mit skalierbarer Xft-Schrift (`-fa Monospace -fs 11`),
  Zutty/x-terminal-emulator nur noch als letzter Fallback.

### Added — Welle 4 (P3, Start): Schüler nativ anlegen
- Native Rust-Commands `db_insert_schueler` / `db_delete_schueler`
  (`natascha_read.rs`, reiner SQL-INSERT/DELETE, kein Python). `db_load_all` listet
  Klassen jetzt aus Abgaben **und** Schülern (neu angelegte Klasse erscheint sofort).
- `SchuelerView`: „Schüler anlegen"-Formular (Klasse/Vorname/Nachname) + Löschen je
  Zeile; `useNatascha` um `insertSchueler`/`deleteSchueler` erweitert.

### Added — Welle 3 (P2): Klassen-/Schüler-Ansichten
- **7 neue Rust-Commands in `natascha_read.rs`:**
  - `db_list_schueler` — Schülerliste pro Klasse
  - `db_get_schueler_laengsschnitt` — Längsschnittprofil (Verlauf, Trend, Fehlerschwerpunkte, Kalibrierung)
  - `db_get_klassen_trend` — Noten-Trend über Aufgaben (KI + Lehrer)
  - `db_get_klassen_kalibrierung` — KI vs. Lehrer-Notenvergleich
  - `db_get_fehler_detail` — Drill-down einzelner Fehlerzitate pro Typ
  - `db_export_noten_csv` — Semicolon-getrennter CSV-Export der Noten
- **`SchuelerView.tsx`** — Neue Sidebar-Ansicht „Schüler":
  Klassen/Schüler-Selector, Längsschnitt-Profil mit Notenverlauf (LineChart via Recharts),
  Trend-Indikatoren, Kriterien-K1/K3-Verlauf, Fehlerschwerpunkte, Kalibrierung.
- **`KlassenView.tsx`** — Erweitert mit Tab „Statistik":
  Noten-Trend (LineChart), Kalibrierung (KI vs. Lehrer), Heatmap-Drilldown (Klick → Fehler-Detail-Liste),
  CSV-Export-Button.
- **Recharts** — Neue Dependency für Charts (`BarChart`, `LineChart`, `ResponsiveContainer`).
- **Sidebar** — Neuer Eintrag „Schüler" (Users-Icon) zwischen Korrektur und Vorlagen.
- **`useNatascha.ts`** — 6 neue Methoden: `listSchueler`, `getSchuelerLaengsschnitt`, `getKlassenTrend`,
  `getKlassenKalibrierung`, `getFehlerDetail`, `exportNotenCsv` + zugehörige TypeScript-Interfaces.

### Added — Welle 2: P1 Korrektur-Core-Flow
- **`KorrekturView.tsx`** — Native React-View fuer Korrektur-Workflow:
  TUI-Modus (startet NATASCHA-Terminal) + Native-Modus (Klassen/Aufgaben-Selector,
  Abgaben-Tabelle, Detail-Ansicht mit Kriterien, Fehlern, Lehrer-Noten-Vergabe).
  Neue-Analyse-Dialog (Datei-Chooser + Klasse/Aufgabe + `natascha_analyze` Sidecar).
  Feedback-DOCX-Button in Detail-Ansicht.
- **`db_get_abgabe_detail`** — Neuer Rust-Command fuer vollstaendige Abgabe-Details
  (AbgabeInfo + KriteriumRow + FehlerRow + LehrerFeedbackRow).
- **`db_upsert_lehrer_feedback`** — INSERT/UPDATE Lehrer-Feedback (Note, Kommentar).
- **`useNatascha.ts`** — Neue Methoden `getAbgabeDetail()`, `upsertLehrerFeedback()`
  + zugehoerige TypeScript-Interfaces (`KriteriumRow`, `FehlerRow`,
  `LehrerFeedbackRow`, `AbgabeDetail`). Alle Views nutzen jetzt den Hook statt
  direktem `invoke()` (DRY).
- **`KlassenView.tsx`** — Refactored auf `useNatascha`-Hook.
- **`tauri-plugin-dialog`** — Datei-Dialog-Plugin (Tauri v2) fuer
  Datei-Auswahl im Analyse-Dialog.
- **`@keyframes spin`** — CSS-Animation fuer Lade-Spinner in `index.css`.

### Added — Welle 1: Headless-CLI + Sidecar-Commands
- **`natascha_cli.py`** — Neues Headless-CLI (12 Sub-Commands):
  `analyze`, `srdp-detail`, `schueler-profil`, `klassen-briefing`,
  `feedback-docx`, `erwartungshorizont`, `klassen-liste`, `aufgaben`,
  `abgaben`, `heatmap`, `notenverteilung`, `statistik`.
  Alle Ausgabe als JSON auf stdout, Fehler auf stderr. Kein TUI-Import.
- **`requirements_cli.txt`** — Minimale Dependencies fuer Headless-Betrieb
  (ohne `textual`/`rich`, nur API+DB+DOCX).
- **Tauri Sidecar-Commands** — 8 neue Commands in `natascha.rs`:
  `natascha_analyze`, `natascha_klassen_liste`, `natascha_aufgaben`,
  `natascha_abgaben`, `natascha_heatmap`, `natascha_notenverteilung`,
  `natascha_statistik`, `natascha_feedback_docx`,
  `natascha_erwartungshorizont`. Alle rufen `natascha_cli.py` als
  Sidecar auf und reichen JSON durch.
- **React Hook `useNatascha.ts`** —抽象ion fuer alle NATASCHA-Operationen
  aus der UI: `analyze()`, `listKlassen()`, `listAufgaben()`, `getAbgaben()`,
  `getHeatmap()`, `getNotenverteilung()`, `getKlassenStatistik()`,
  `generateFeedbackDocx()`, `generateErwartungshorizont()`.

### Added — Phase 2: Gemeinsame SQLite-Datenbank
- **Rust-DB-Infrastruktur:** `rusqlite` (bundled) als neue Dependency.
  `src-tauri/src/db.rs` + `natascha_schema.sql` + `lua_schema.sql` — erstellt
  alle 7 NATASCHA-Tabellen + 4 LUA-Tabellen (`generated_materials`, `lua_history`,
  `lua_settings`, `lua_templates`) mit WAL-Modus und Foreign Keys.
- **Tauri-Commands:** 16 neue Commands in `commands/db.rs` und
  `commands/natascha_read.rs`: `db_load_all`, `db_upsert_document`,
  `db_delete_document`, `db_restore_document`, `db_purge_deleted`,
  `db_toggle_favorite`, `db_append_history`, `db_clear_history`,
  `db_save_settings`, `db_save_template`, `db_delete_template`,
  `db_migrate_from_localstorage`, `db_resolve_path`, `db_set_path`,
  `db_list_aufgaben`, `db_get_abgaben`, `db_get_fehler_heatmap`,
  `db_get_notenverteilung`, `db_get_klassen_statistik`,
  `db_upsert_lehrer_feedback`.
- **Hydrate-Cache:** `storage.ts` liest jetzt aus einem In-Memory-Cache, der
  beim App-Start asynchron aus der SQLite-DB geladen wird. Schreibzugriffe
  erfolgen als fire-and-forget über Tauri-Commands. Fallback auf localStorage
  im Browser. Einmalige Migration localStorage → SQLite beim ersten Start.
- **„Meine Klassen"-View:** Neue `KlassenView` in der Sidebar — zeigt
  Klassenliste mit Abgabenzahl, Aufgabenauswahl, Notenverteilung,
  Fehler-Heatmap (R/G/Z/A) und Abgaben-Tabelle. Liest direkt aus der
  NATASCHA-Datenbank (via Rust SQL-Commands, kein Python-Sidecar nötig).
- **DB-Pfad-Sektion in Einstellungen:** Zeigt den erkannten DB-Pfad an
  (`~/lehr-suite-bridge/lehr-suite.db` oder Auto-Erkennung von
  `apps/natascha/*.db`).
- **NATASCHA `natascha_db.py`:** `init_db()` aktiviert jetzt WAL-Modus und
  Foreign Keys. `save_analysis_to_db()` nutzt atomare Transaktionen statt
  einzelner Inserts. `get_db_path()` unterstützt `~/`-Pfade.
- **App-Start:** Loading-Spinner während DB-Hydratation, bevor die
  Oberfläche rendert. Templates werden jetzt über die DB gespeichert
  statt direkt in localStorage.

### Added — Phase 3c Bauplan (voller Port, freigegeben)
- `docs/phase3c-natascha-port-plan.md` — verbindlicher Bauplan: NATASCHA komplett
  nativ in die LUA-UX (Python-Core als headless Sidecar, alle ~15 Screens in
  React), inkrementell in Wellen 0–4. Erster Bau-Schritt = Welle 0 = Phase 2
  (gemeinsame DB). Verlinkt aus `AGENTS.md`.

### Added — Phase 3a: NATASCHA-Korrektur aus der App starten
- Sidebar-Eintrag **„Korrektur (NATASCHA)"** + neue `KorrekturView` mit Button
  „NATASCHA-Korrektur öffnen" (startet die TUI in einem Terminalfenster) und
  manuellem Fallback-Befehl.
- Tauri-Command `launch_natascha` (`src-tauri/src/commands/natascha.rs`),
  plattformspezifisch (Windows/macOS/Linux, je `#[cfg]`); findet `apps/natascha`
  automatisch relativ zur App.
- Einstellungen: `AppSettings.nataschaDir` + `pythonCommand` (Abschnitt „NATASCHA").
- Design-Doku `docs/phase3-correction-ui.md` (Wege A/B/C + Empfehlung).
- **Verifikation offen:** Terminal-Spawn nur auf Linux kompiliert; Windows-Pfad
  braucht echten Test (Fallback-Befehl in der View dokumentiert).

### Added
- **Phase-1-UX:** Auswahlliste „Aus NATASCHA-Korrektur" zeigt jetzt pro Export
  ein Badge „X Fehler · Y Kategorien" + Mini-Heatmap-Balken (farbcodiert R/G/Z/A)
  + Top-3-Kategorien. Rust-`BridgeExportMeta` um `gesamtFehler` + `heatmap`
  erweitert (`commands/bridge.rs`).
- **Inbox-Ordner konfigurierbar:** neues Feld `AppSettings.nataschaInboxDir`
  (Default leer = `~/lehr-suite-bridge/inbox`), Eingabe im Einstellungen-View
  (Abschnitt „NATASCHA-Brücke"). Step0 übergibt den Ordner an die Bridge-Commands.
- **Bessere Leer-/Fehlerzustände:** Leerzustand zeigt den tatsächlich gesuchten
  Pfad (neuer Command `resolve_bridge_inbox`) + Hinweis auf NATASCHA-Export-Button
  und die Einstellung; klarere Fehlermeldungen (z. B. „nur in Desktop-App").
- `docs/phase2-shared-db.md` — ausführbares Design für Phase 2 (gemeinsame
  SQLite). Kernentscheidung dokumentiert: `storage.ts` ist synchron, SQLite-
  über-Tauri ist async → Hydrate-Cache (Weg A), sync-API erhalten.

## 2026-06-08 — Phase 1: Datei-Brücke NATASCHA → LUA (MVP)

### Added
- **Neues Mono-Repo** `lehr-suite/` mit `apps/lua/` (Lehrunterlagen-Tool) und
  `apps/natascha/` (NATASCHA) als sauberer Snapshot ihrer eigenständigen Repos
  (keine Alt-Git-Historie). Original-Repos bleiben als Backup unangetastet.
- **Bridge-Vertrag** `bridge/schema.json` (JSON Schema, `schemaVersion: 1`):
  Heatmap (R/G/Z/A) + echte Fehlerbeispiele (`zitat`/`korrektur`) + Empfehlungen.
  Doku: `bridge/README.md`.
- **NATASCHA** `natascha_bridge.py`: `export_klassen_bridge()` schreibt pro
  Klasse/Aufgabe ein schema-konformes JSON in die Inbox (atomar). Mit CLI
  (`python natascha_bridge.py <klasse> <aufgabe>`).
- **NATASCHA-TUI**: Button „🎯 Für Übungs-Tool" im Heatmap-Tab
  (`natascha.py`, Handler `_export_bridge`). Config-Sektion `[bridge]` in
  `natascha_config.toml` (`inbox_dir`, Default `~/lehr-suite-bridge/inbox`).
- **LUA** `meta.fokusThemen` (+ in `AuftragSchema`) in
  `packages/schema/src/index.ts`. Prompt-Hinweis `fokusThemenHinweis` in
  `packages/llm/src/prompt.ts` (`buildMessages`).
- **LUA** Tauri-Commands `list_bridge_exports` / `read_bridge_export`
  (`src-tauri/src/commands/bridge.rs`, registriert in `main.rs`/`mod.rs`).
- **LUA** Step0-Einstieg „Aus NATASCHA-Korrektur" + Mapping-Helfer
  `apps/web/src/lib/nataschaBridge.ts` (Kategorie → Aufgabentypen, Vorbefüllung).
- **Tests**: `prompt.test.ts` (fokusThemen-Hinweis), `nataschaBridge.test.ts`
  (Parse + Mapping).

### Verified
- `pnpm build`, `pnpm -r typecheck`, `pnpm -r test` — grün.
- `cargo check` (Tauri-Backend) — sauber.
- NATASCHA seed (`seed_testdaten.py`) → Export → `jsonschema.validate` — PASS.

### Noch offen
- Phase 2 (gemeinsame SQLite) und Phase 3 (Unified Tauri-Frontend) — geplant,
  nicht gebaut. Siehe `AGENTS.md` → Roadmap und `docs/phase2-shared-db.md`.

### 2026-06-08 — Live-GUI-Test bestanden
- `pnpm tauri:dev` baut & läuft (Tauri-Backend inkl. `commands/bridge.rs`
  kompiliert in ~1m13s); NATASCHA-Sektion in Step0 sichtbar und funktional.

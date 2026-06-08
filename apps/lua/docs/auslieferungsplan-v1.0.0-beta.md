# Auslieferungsplan — Natascha v1.0.0-beta

**Stand:** 2026-06-05
**Status:** Verbindlich für die Testauslieferung
**Gegenprüfung:** Ein zweites LLM hat den vorherigen Plan gegengelesen; alle kritischen Befunde sind in dieser Version eingearbeitet und am Code verifiziert.

## Ziel

Eine einzelne Lehrkraft (Windows) kann die App installieren, mit den sechs zentral hinterlegten LLM-API-Keys aus `src-tauri/.env.local` eine vollständige Schularbeit erzeugen, und das Ergebnis als DOCX + PDF exportieren — mit Onboarding, Persistenz und einer vollständig aktivierten Sidebar.

## Voraussetzungen und Annahmen

- Build-Host: Windows mit Tauri-Toolchain, Node 20+, pnpm, Rust 1.96+, NSIS (für Installer)
- Ziel-System: Windows 10/11, **LibreOffice muss auf dem Zielsystem vorhanden sein** (für PDF-Export) — wird in der Schnellstart-Anleitung erklärt
- Lehrkraft hat keine Programmierkenntnisse; alle Interaktionen laufen über die UI
- Keine Code-Signierung (SmartScreen-Warnung akzeptabel; Anleitung zum "Weitere Informationen → Trotzdem ausführen" liegt bei)
- Sechs LLM-Keys aus `src-tauri/.env.local` werden zentral in den Windows-Credential-Manager importiert

## Architektur-Kontext (verifiziert am Code)

| Aspekt | Tatsächlicher Stand (verifiziert) | Quelle |
|--------|----------------------------------|--------|
| `import_keys.rs` | Liest aus `neue ENV-Datei.txt`, benennt sie danach in `.env.local` um. **Muss gepatcht werden**, damit sie direkt aus `.env.local` liest. | `src-tauri/src/bin/import_keys.rs:5, 54-58` |
| `response_format: json_object` | Ist **bereits** für openai/mistral/deepseek/kimi/qwen gesetzt. Audit-Befund Q1 ist erledigt. | `src-tauri/src/adapters/openai_compat.rs:58` |
| Voice-Command | Ist **bereits** in `CommandPalette.tsx` verdrahtet (🎤-Button, `voice.supported`-Check). | `apps/web/src/components/CommandPalette.tsx:153-165` |
| CommandPalette | Verwendet keine hardcoded View-IDs; Anpassung an neue Sidebar-Items trivial. | `apps/web/src/components/CommandPalette.tsx:46-58` |
| `generiertesDokument` | Enthält alle Quelltexte + Blöcke + LLM-Output. Bei längeren Schularbeiten > 1 MB. **Muss selektiv persistiert werden.** | `apps/web/src/lib/types.ts:14` |
| Version | Aktuell `0.1.0` in allen drei Manifesten. **Muss auf `1.0.0-beta`.** | `tauri.conf.json:4`, `Cargo.toml:3`, `apps/web/package.json:3` |
| Renderer | 1707 Zeilen monolithisch (`packages/renderer/src/index.ts`), 11 `build*`-Funktionen, keine Snapshot-Tests. | `wc -l packages/renderer/src/index.ts` |
| Qwen-Key | `sk-15c669f8e54f4d238bf64f18d40775b3` — Status laut `offene Punkte.txt #11` 401, muss live geprüft werden. | extern |

## Phasen-Reihenfolge (korrigiert)

Die Phasen sind **sequenziell**, jede baut auf der vorherigen auf. Phasen 1–4 ergeben bereits eine testbare App (mit aktivierten Sidebar-Views, aber noch nicht perfekter DOCX-Formatierung). Phase 5 (Renderer) ist der größte Brocken.

---

### Phase 1 — Fundament: Version, Keys, Installer, Smoke-Test

**Ziel:** Lauffähiger Windows-Installer + alle LLM-Provider funktionieren.

| # | Aufgabe | Datei/Ort | Aufwand |
|---|---------|-----------|---------|
| 1.1 | Version-Bump auf `1.0.0-beta` in `tauri.conf.json`, `Cargo.toml`, `apps/web/package.json` | 3 Dateien | XS |
| 1.2 | `import_keys.rs:5` patchen: statt aus `neue ENV-Datei.txt` direkt aus `src-tauri/.env.local` lesen, Datei nicht umbenennen. | `src-tauri/src/bin/import_keys.rs` | S |
| 1.3 | `import_keys` ausführen, lokale `.env.local` danach löschen. Verifizieren via `cmdkey /list:lehrunterlagen-tool*` (Windows). | Shell | XS |
| 1.4 | Qwen-Key live testen (`curl https://dashscope.aliyuncs.com/compatible-mode/v1/models` mit Authorization-Header). Bei 401: `qwen` aus `LLM_PROVIDERS` in `constants.ts` auskommentieren, Rust-Adapter bleibt für spätere Re-Aktivierung. | extern + `constants.ts` | S |
| 1.5 | `tauri build` mit `bundle.targets: ["nsis"]`. Falls NSIS fehlt: vorher installieren (`cargo install tauri-cli --version "^2"` bringt es mit, alternativ `choco install nsis`). | `src-tauri/tauri.conf.json:27-28` | M |
| 1.6 | Smoke-Test pro Provider: `LLM_PROVIDER=anthropic pnpm smoke`, dann durchrotiert für `openai`, `deepseek`, `mistral`, `kimi`, optional `qwen`. Pro Lauf ein DOCX nach `scripts/out/`, geprüft via Stichprobe. | `scripts/llm-smoke.mjs` | M |

**DoD Phase 1:** `Lehrunterlagen-Tool_1.0.0-beta_x64-setup.exe` liegt vor. Fünf (oder sechs) Provider liefern je ein valides DOCX.

---

### Phase 2 — Persistenz-Grundlage (vor Onboarding)

**Ziel:** Lehrkraft kann App schließen und neu öffnen, ohne dass die Eingaben verloren sind. `onboardingDone` wird gemerkt.

| # | Aufgabe | Datei/Ort | Aufwand |
|---|---------|-----------|---------|
| 2.1 | `usePersistence.ts` Hook anlegen: serialisiert eine **Whitelist** von `AppState`-Feldern (alle außer `generiertesDokument`) als JSON nach `localStorage['lehrunterlagen:current:v1']` mit Debounce 30 s. | `apps/web/src/hooks/usePersistence.ts` (neu) | M |
| 2.2 | Separater Slot: `generiertesDokument` wird nur über expliziten "Aktuelles Dokument speichern"-Klick in `lehrunterlagen:dokument:v1` abgelegt. Schützt vor 5-MB-LocalStorage-Limit. | `usePersistence.ts` | S |
| 2.3 | Beim App-Start: Wenn `localStorage.lehrunterlagen:current:v1` existiert → "Sitzung vom <Datum> wiederherstellen?"-Modal in `App.tsx`. "Nein" verwirft, "Ja" lädt. | `App.tsx` | S |
| 2.4 | "Speichern"-Button in der Kopfleiste: speichert aktuelle Sitzung als benanntes Projekt unter `lehrunterlagen:projects:v1` (Map `name → snapshot`). | `App.tsx:113-133` | S |
| 2.5 | `onboardingDone: boolean` in `AppState` aufnehmen, in `usePersistence`-Whitelist aufnehmen. Action `SET_ONBOARDING_DONE`. | `types.ts`, `useWizard.ts`, `usePersistence.ts` | XS |
| 2.6 | **Kein Eingriff** in bestehende `lehrunterlagen-templates` (TemplateManager). Getrennter localStorage-Key, koexistiert. | – | – |

**DoD Phase 2:** App-Neustart erhält die Sitzung. Lehrkraft kann benannte Projekte speichern und wieder laden.

---

### Phase 3 — Onboarding-Wizard (braucht 2.5)

**Ziel:** Frische Lehrkraft wird in unter 2 Minuten durch den Erststart geführt.

| # | Aufgabe | Datei/Ort | Aufwand |
|---|---------|-----------|---------|
| 3.1 | `Onboarding/Step1_Welcome.tsx` — App-Name, Logo, Kurzbeschreibung, "Was du brauchst: API-Key(s), Quelltext, ~1-2 Min pro Schularbeit". | neu | S |
| 3.2 | `Onboarding/Step2_ApiKey.tsx` — Tabelle der 6 Provider mit Status ✓/✗, Eingabefeld für fehlende Keys, "Speichern" via bestehende `save_api_key`-invoke. Logik aus `SettingsPanel.tsx` wiederverwendet. | neu | M |
| 3.3 | `Onboarding/Step3_Tutorial.tsx` — 3 Kacheln: ① Absicht ② Quelltext ③ Generieren. "Loslegen" setzt `onboardingDone = true`. | neu | S |
| 3.4 | `App.tsx`: Wenn `!state.onboardingDone`, Wizard statt Hauptlayout rendern. | `App.tsx` | S |
| 3.5 | "Tour wiederholen"-Button in Sidebar (Hilfe-Eintrag, bisher "bald verfügbar") setzt `onboardingDone = false`. | `Sidebar.tsx` | XS |

**DoD Phase 3:** Frischer Start zeigt Wizard; nach "Loslegen" Step 0; jederzeitige Wiederholung möglich.

---

### Phase 4 — Sidebar-Vervollständigung & View-Routing

**Ziel:** Alle Sidebar-Einträge sind klickbar, jede View rendert etwas Sinnvolles.

| # | Aufgabe | Datei/Ort | Aufwand |
|---|---------|-----------|---------|
| 4.1 | `currentView: ViewId` in `AppState` einführen. ViewId-Union: `'new' \| 'materials' \| 'templates' \| 'history' \| 'favorites' \| 'trash' \| 'settings' \| 'help' \| 'feedback'`. Action `SET_VIEW`. | `types.ts`, `useWizard.ts` | S |
| 4.2 | **Alle 9 Sidebar-Items auf `active: true`** in `Sidebar.tsx:8-15, 17-23`. | `Sidebar.tsx` | XS |
| 4.3 | `Sidebar.handleItemClick` dispatcht `SET_VIEW` (statt nur bei `api` zu reagieren). | `Sidebar.tsx:28-33` | S |
| 4.4 | `App.tsx`: Bei `state.currentView === 'new'` → Wizard-Flow (Step0–Step4). Sonst → jeweilige View. Routing-Switch in der Renderfunktion. | `App.tsx` | M |
| 4.5 | `TemplateManager.tsx` (Header-Button, Zeile 115–122) **auflösen** und Inhalt in neue `TemplatesView.tsx` wiederverwenden (gleiche localStorage-Operationen, lädt via `dispatch SET_META + ADD_BLOCK × n`). | `TemplateManager.tsx` (Refactor) + `TemplatesView.tsx` (neu) | M |
| 4.6 | `MaterialsView.tsx` — Liste aus `lehrunterlagen:projects:v1`, Klick lädt, Löschen-Button. | neu | M |
| 4.7 | `HistoryView.tsx` — chronologische Liste aus `lehrunterlagen:history:v1` (jeder `SET_GENERIERTES_DOKUMENT`-Event mit Zeitstempel). | neu | S |
| 4.8 | `FavoritesView.tsx` — gefilterte Liste aus `projects` mit `favorite: true`-Flag. | neu | S |
| 4.9 | `TrashView.tsx` — `lehrunterlagen:trash:v1`, Restore-Button, automatisches 30-Tage-Cleanup. | neu | S |
| 4.10 | `HelpView.tsx` — statisches Markdown via `react-markdown`: Anleitung, Shortcuts (Ctrl+K), FAQ, "Email an …". | neu | S |
| 4.11 | `FeedbackView.tsx` + `src-tauri/src/commands/feedback.rs` — Formular (Typ, Beschreibung). Senden via `invoke('save_feedback', {content, email})` schreibt in `${AppLocalDataDir}/feedback.log`. Fallback: "Email an support@… mit Screenshot". | `FeedbackView.tsx` (neu) + `feedback.rs` (neu, simpel) | M |
| 4.12 | **Korrekturraster-Export prüfen**: `useExport.ts:exportKorrekturraster` — Funktionalität verifizieren, ggf. fixen. | `useExport.ts` | S |
| 4.13 | CommandPalette: bestehende `onNavigate('next'/'back')`-Callbacks beibehalten. Kein Refactor nötig. | – | – |

**DoD Phase 4:** Alle 9 Sidebar-Einträge aktiv; jede View zeigt sinnvollen Inhalt; TemplateManager-Button aus dem Header ist weg.

---

### Phase 5 — Vorlagen-Formatierung im Hauptpfad (kritischster Brocken)

**Ziel:** Das DOCX sieht für alle 11 Blocktypen und alle drei Dokumente (Schülerfassung, Lösung, Korrekturraster) wie eine echte, austeilbare Schularbeit aus.

| # | Aufgabe | Datei/Ort | Aufwand |
|---|---------|-----------|---------|
| 5.1 | **Bestandsaufnahme**: Inventar aller 11 Block-Builder. Welche haben Border, Header, Spaltenausrichtung, Schriftbild? Tabelle als Markdown. | `packages/renderer/src/index.ts` | XS |
| 5.2 | **Konsistente Konstanten** einführen: `FONT_BODY = 'Arial'`, `SIZE_BODY = 22`, `SIZE_TABLE = 20`, `SIZE_HEADER = 24`, `BORDER_SINGLE` — alle Block-Builder nutzen diese. | `packages/renderer/src/index.ts` | M |
| 5.3 | **Kopf-/Fußzeilen-Fix**: `buildPageHeader` (Zeile 430). Endgültiger Pass: nur "Schularbeit — <Fach> — <Thema>" oder leer, weil die Raster-Tabelle die einzige Klasse/Name/Datum-Quelle sein soll. | `buildPageHeader` | S |
| 5.4 | **Tabellen-Ränder vereinheitlichen**: `THIN_BORDER` für matching/multipleChoice/tabelle. | `buildMultipleChoice`, `buildMatching`, `buildTabelle` | M |
| 5.5 | **Schülerkopf** (Zeile 496) auf alle 3 Dokumente spiegeln (Schüler, Lösung, Korrekturraster). | `buildSchuelerkopf` | S |
| 5.6 | **Aufgaben-Header gerahmt** (oberer/unterer Rand) + Punkteintrag rechts `___ / X`. War in Changelog 2026-06-05 für Schülerfassung gemacht, jetzt für Lösung + Raster spiegeln. | `buildBlock` (Zeile 711) | M |
| 5.7 | **Strophen/Ehrlichkeit** aus Quelltext in **Lösungs-DOCX** und **Korrekturraster** (war in Schülerfassung schon OK). | `buildQuelltexte` (Zeile 651) | S |
| 5.8 | **Snapshot-Test-Infrastruktur**: für jeden Blocktyp ein Golden-DOCX in `packages/renderer/src/__fixtures__/<typ>.json`. Test rendert, vergleicht Buffer-Hash und prüft menschenlesbare Textinhalte aus dem DOCX-XML. Pragmatisch, da `__snapshots__` fehlt. | `packages/renderer/src/snapshots.test.ts` (neu) | L |
| 5.9 | **Web-Preview angleichen** — Schülerkopf, Aufgabenübersicht, Strophen. | `apps/web/src/components/PreviewTwoColumn.tsx` | S |

**DoD Phase 5:** Für jeden der 11 Blocktypen + 3 Dokumente (Schüler/Lösung/Raster) sieht das DOCX wie eine echte Schularbeit aus. Snapshot-Tests in CI grün.

---

### Phase 6 — Robustheit & Polish

| # | Aufgabe | Datei/Ort | Aufwand |
|---|---------|-----------|---------|
| 6.1 | `check_pdf_prereq` Rust-Command: prüft LibreOffice via `find_libreoffice()` (existiert in `pdf.rs:65-114`). Settings-Hinweis mit Download-Link falls fehlt. | `src-tauri/src/commands/pdf.rs` + `usePdfExport.ts` | S |
| 6.2 | Datenschutz-Modal beim ersten Generieren (einmalig pro Session, `localStorage.lehrunterlagen:datenschutz-ok`). | `Step4_Generate.tsx` | S |
| 6.3 | Live-Kostenschätzung pro Generierung (grobe Token-Schätzung × `models.ts`-Preise). | `Step4_Generate.tsx` | M |
| 6.4 | "Rohantwort anzeigen" Button im Fehlerfall — bereits vorhanden (`useGenerate.ts:204-206`), UI-Politur. | OK | XS |
| 6.5 | Voice-Command: bereits verdrahtet (`CommandPalette.tsx:153-165`). **Nichts tun.** | – | – |

**DoD Phase 6:** Lehrkraft kann nicht in stille Fehler laufen.

---

### Phase 7 — Verpackung & Lieferung

| # | Aufgabe | Datei/Ort | Aufwand |
|---|---------|-----------|---------|
| 7.1 | `docs/lehrkraft-quickstart.md` schreiben: ① Setup.exe ausführen ② Erster Start: Wizard → Keys eintragen ③ Erste Schularbeit in < 10 Min ④ Bei Problemen: Email an … | neu | S |
| 7.2 | `scripts/build-deliverable.ps1`: ① `.env.local` prüfen ② `tauri build` ③ Ordner `Lehrunterlagen-Tool_v1.0.0-beta/` mit `Setup.exe`, `Erste-Schritte.pdf`, `.env.local` (Backup), `Release-Notes.txt` | neu | S |
| 7.3 | **Endtest auf frischer Windows-VM**: Install, gesamter Hauptpfad, DOCX + PDF, alle 5–6 Provider. | manuell | M |
| 7.4 | ZIP mit SHA-256-Checksum notieren. | manuell | XS |

**DoD Phase 7:** Eine Person kann die ZIP öffnen, Setup ausführen, und in unter 10 Min eine Schularbeit erstellen.

---

## Kritischer Pfad

```
1.5 Installer bauen
   ↓
2.1 usePersistence (Whitelist)
   ↓
3.4 Onboarding-Mount
   ↓
4.4 View-Routing
   ↓
5.5 Schülerkopf-Update
   ↓
7.2 Lieferordner
   ↓
7.3 Endtest
```

## Aufwandsschätzung (eine Person, Vollzeit)

| Phase | Beschreibung | Tage |
|-------|-------------|------|
| 1 | Fundament, Keys, Installer, Smoke | 2–3 |
| 2 | Persistenz-Grundlage | 1–2 |
| 3 | Onboarding | 1–1.5 |
| 4 | Sidebar + Views + Routing | 2–3 |
| 5 | Renderer-Formatierung (1707-Zeilen-Monolith) | 7–10 |
| 6 | Polish | 1–2 |
| 7 | Verpackung, Doku, Lieferung | 1–2 |
| Puffer | Unerwartetes (NSIS-Setup, Snapshot-Infra, Edge-Cases) | 2–4 |
| **Summe** | | **17–28 Tage** |

Falls die Lehrkraft **früher** testen soll: nach Phase 1–4 + 7.1–7.4 (ohne 5) ist die App in 6–9 Tagen lieferbar ("läuft, Vorlagen sehen noch roh aus"); Phase 5 wird als Iteration 1.1 nachgereicht.

## Beantwortung der offenen Fragen

| Frage | Entscheidung |
|-------|-------------|
| Qwen-Key: aus Liste oder Code? | **UI-Versteck** in `constants.ts:LLM_PROVIDERS` (Kommentar: "Backend aktiv, Key ungültig"). Rust-Adapter bleibt — bei Key-Erneuerung wieder einblendbar. |
| Voice-Command: behalten? | **Ja, ist bereits verdrahtet.** Web Speech API läuft in Tauri-WebView (WebView2 auf Windows, WKWebView auf macOS). Auf Linux eingeschränkt, irrelevant für Windows-Ziel. |
| localStorage-Key-Konflikt Templates/Projects? | **Kein Konflikt, getrennte Keys**: `lehrunterlagen-templates` (unverändert, Phase 4.5), `lehrunterlagen:projects:v1`, `lehrunterlagen:current:v1`, `lehrunterlagen:history:v1`, `lehrunterlagen:trash:v1`, `lehrunterlagen:dokument:v1`. |
| Feedback-Backend URL konfigurierbar? | **Ja, Rust-Command** `save_feedback`: Default = lokal in `${AppLocalDataDir}/feedback.log` schreiben. Fallback "Email an support@…". Kein HTTP-POST in der Beta. |
| Persistenz-Größe (5-MB-Limit)? | **Selektiv persistieren** (Phase 2.1/2.2): alles außer `generiertesDokument` in `current`. `generiertesDokument` nur auf expliziten Klick. |

## Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|--------------------|--------|-----------|
| Renderer-Refit zieht unbekannte Edge-Cases nach sich | Hoch | Hoch | Phase 5 in kleine verifizierbare Teilschritte zerlegen (5.1–5.9), pro Schritt Snapshot-Tests, Web-Preview nachziehen |
| NSIS-Toolchain auf Build-Host fehlt | Mittel | Mittel | Vor 1.5 prüfen, Doku-Notiz im `build-deliverable.ps1` |
| Qwen-Key bleibt 401 | Hoch | Niedrig | UI-Versteck (siehe 1.4), Lehrkraft nutzt einen der fünf anderen Provider |
| LocalStorage-Quota bei vielen Projekten | Niedrig | Mittel | Nur ein "current" + n Projekte; bei 5-MB-Engpass: WARN-Hinweis in UI |
| Snapshot-Tests für DOCX zu flaky | Mittel | Mittel | Pragmatischer Ansatz (Hash + Textinhalt), keine Pixel-/Layout-Snapshots |
| Lehrkraft findet einen Bug im Hauptpfad | Hoch | Mittel | Phase 5 priorisiert Hauptpfad-Block-Typen (lueckentext, multipleChoice, matching, markieraufgabe, offeneSchreibaufgabe) vor den neuen Typen |

## Was bewusst NICHT in dieser Beta steckt

- Phase E: Korrektur-Lebenszyklus (Scan, OCR, Bewertung) — eigene Hauptphase laut `produktvision.md`
- Auto-Update
- Code-Signing (akzeptabel für Einzeltest)
- LibreOffice-Bundle (Lehrkraft installiert es selbst; Installer-Doku in 7.1 erklärt es)
- Mobile / Tablet
- Echte HTTP-Backend für Feedback
- i18n (deutsch only)
- macOS- und Linux-Builds (nur Windows)

## Erfolgskriterien

Die Beta ist erfolgreich, wenn die Lehrkraft innerhalb einer 30-minütigen Testsitzung:

1. Die App installiert und startet ohne SmartScreen-Blockade-Workaround-Hilfe
2. Den Onboarding-Wizard durchläuft und ihre(n) API-Key(s) einträgt
3. Eine Schularbeit von Absicht bis DOCX-Export in unter 10 Minuten erstellt
4. Das DOCX ohne manuelles Nachformatieren in Word/LibreOffice öffnen kann
5. Eine zweite Schularbeit erstellt, ohne dass die erste verloren geht (Persistenz)

Bei Nichterfüllung eines Punkts: Phase, die diesen Punkt verantwortet, identifizieren, fixen, Re-Test.

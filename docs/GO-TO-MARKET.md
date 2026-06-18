# LUKA — Go-to-Market: Schlanker Generator-MVP (Desktop, BYO-Key)

_Stand 2026-06-18_

## Context
LUKA soll „live" gehen + kleines Marketingbudget. Produkt ist reif — liegenlassen wäre schade.

**Wichtigste Klarstellung:** LUKA ist eine **Tauri-Desktop-App** (native EXE, Python-NATASCHA-Sidecar,
lokale SQLite, API-Keys im OS-Keychain → `apps/lua/src-tauri/src/keystore.rs`). Man „hostet" sie
**nicht** auf Hetzner — sie läuft auf dem Lehrer-Rechner. Der **Datenschutz (Schülerdaten + Keys
bleiben lokal)** ist der größte Moat für AHS/Österreich und darf NICHT durch einen Web-Rewrite
verspielt werden. **Hetzner = Landingpage + Installer-Download + (später) Lizenz/Proxy.**

## Entscheidungen (User, 2026-06-18)
- **Vertrieb = Hybrid später:** jetzt Desktop-Distribution, Web-Variante als spätere Option offenhalten.
- **LLM/Geld = Hybrid:** BYO-Key jetzt (schon gebaut), Managed-Proxy-Tier später für Nicht-Techies.
- **MVP-Umfang = schlank, nur Generator:** NATASCHA (Closed Loop) später → umgeht den Python-Bundling-Blocker.

## Im Code gefundene Launch-Blocker (das ist die Arbeit, nicht „Hosting")
1. **NATASCHA ruft System-Python** (`Command::new(&py)`, `apps/lua/src-tauri/src/commands/natascha.rs`)
   — kein Sidecar-Bundling. Laien haben kein Python. → Im MVP **ausblenden**, in Phase 4 via PyInstaller bündeln.
2. **PDF-Export braucht LibreOffice** (`soffice`, `apps/lua/src-tauri/src/commands/pdf.rs`, hat schon
   `which soffice`-Detection ~Z.101). → graceful degrade: PDF-Knopf nur zeigen wenn vorhanden.
3. **Keine Code-Signierung** → Windows-SmartScreen/Mac-Gatekeeper schrecken ab (Phase 1).
4. **Kein Auto-Updater** (`tauri.conf.json` nur `bundle`) (Phase 1).
5. **Keine Lizenz/Bezahlung, keine Landingpage, keine Rechtstexte** (Impressum/Datenschutz/AGB) (Phase 1/3).

## Strategie / These
Moat = lokaler Datenschutz + Closed Loop. Schlank starten, **gratis öffentliche Beta** sammelt
AT-Lehrkräfte + Testimonials, **Monetarisierung erst nach Traktion**. Marketingbudget zündet erst,
wenn signierter, selbst-aktualisierender, onboardbarer Installer + Landingpage stehen.

---

## Phasen (Reihenfolge)

### Phase 0 — MVP-Härtung (Generator-only), Python-frei
- Feature-Flag `FEATURES.natascha = false` (neue `apps/lua/apps/web/src/lib/features.ts`) gated:
  - Nav-Items `korrektur / schueler / klassen / erwartungshorizont` (`components/Sidebar.tsx`, `NAV_ITEMS`).
  - NATASCHA-Widgets im `views/DashboardView.tsx` (nutzt `useNatascha`).
  - Closed-Loop-Einstieg in `components/Step0_Absicht.tsx` (consumePendingUebung / FehlerKuration).
  - View-Routing in `App.tsx`.
- PDF graceful degrade: Knopf in `Step4_Generate.tsx` / `hooks/usePdfExport.ts` nur bei vorhandenem
  `soffice`, sonst Hinweis „LibreOffice nötig" statt Fehler.
- First-Run-Onboarding: BYO-Key-Eingabe (SettingsView hat Key-UI) als Erststart-Gate, wenn kein Key da.
- Restliche User-Flow-Politur (läuft schon: Step4-Spalte, Differenzierung, EN-Sprache).

### Phase 1 — Distribution
- Tauri-Updater-Plugin + Signaturschlüssel + Update-Manifest auf Hetzner.
- Code-Signing: Win (Zertifikat / Azure Trusted Signing), Mac (Apple Developer ID + Notarization, $99/J).
- `tauri.conf.json` bundle: identifier, publisher, productName „Luka", Icons, Targets je OS.
- Landingpage (statisch auf Hetzner): Nutzen, Screenshots, Download je OS, `docs/ANLEITUNG.md` als Hilfe,
  **Impressum + Datenschutzerklärung + AGB** (DSGVO-Pflicht; Stärke betonen: Daten bleiben lokal).

### Phase 2 — Soft-Launch (gratis Beta) + Marketing
- Kanäle: AT-Lehrer-FB-Gruppen, eEducation Austria, Fachdidaktik-Netzwerke, r/Lehrerzimmer,
  Mundpropaganda/Multiplikatoren. Kleines Budget → gezielt (FB/IG auf AT-Lehrkräfte ODER Sponsoring
  eines Lehrer-Newsletters). Feedback + Testimonials sammeln.
- Opt-in-Telemetrie (Crash/Usage), datenschutzfreundlich.

### Phase 3 — Monetarisierung
- Preis-Empfehlung: Gratis-Tier (limitiert, z. B. Wasserzeichen oder n Dok./Monat) + günstiges Pro
  (Jahreslizenz). BYO-Key → keine LLM-Kosten bei dir. Bezahlung via **Paddle** (Merchant of Record,
  regelt EU-USt — ideal für Solo) oder Stripe. Lizenzschlüssel-Aktivierung (offline-tauglich).

### Phase 4 — NATASCHA zurück
- Python-Sidecar via PyInstaller → Tauri `externalBin`/Sidecar; `natascha.rs` ruft gebündeltes Binary
  statt System-`py`. Requirements bündeln. `FEATURES.natascha = true`.

### Phase 5 — Managed-Proxy / optional Web
- Hetzner-LLM-Proxy (rate-limited, pro Lizenz) für Nicht-Techies (Hybrid-Tier).
- Optional dünne Web-Variante (React `apps/lua/apps/web` ist plattformagnostisch) — aber NUR Generator,
  KEINE Schülerdaten am Server (Minderjährigen-DSGVO), NATASCHA bleibt Desktop.

---

## Funktionsumfang parallel (Differenzierung / Retention)
- Aufgaben-Pool / Frage-Bank (#4, noch Brainstorm offen) — stärkster Langzeit-Moat.
- GIFT/Moodle-Export (#2) — digitaler Test-Import.

## Risiken / Kosten
- Signing-Kosten + SmartScreen-Reputationsaufbau (Anlaufzeit).
- Python-Bundling-Fragilität (Phase 4). LibreOffice-Abhängigkeit (PDF).
- DSGVO: auch Desktop braucht Datenschutzerklärung — Position aber stark (Daten lokal).
- Solo-Bandbreite → Phasen strikt sequenziell.

## Verifikation (Definition of Done je Phase)
- **Phase 0:** frische Windows-VM **ohne Python/LibreOffice** → Installer rein → kompletter
  Generator-Flow (generieren → DOCX-Export) läuft fehlerfrei; NATASCHA-Nav unsichtbar; keine Python-Aufrufe.
- **Phase 1:** Download von Hetzner-Landing → signierter Build ohne SmartScreen-Block installierbar →
  Auto-Update vN→vN+1 funktioniert.
- **Phase 2:** echte Lehrkräfte (außer Natascha) installieren eigenständig nach Anleitung; Feedback fließt.
- **Phase 3:** Kauf → Lizenz aktiviert → Pro-Features frei; Testkauf inkl. USt-Beleg.
- **Phase 4:** NATASCHA-Closed-Loop auf der VM ohne System-Python lauffähig (gebündelter Sidecar).

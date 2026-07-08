# LUKA-Strategie: Lean-Nebenerwerb

**Beschlossen: 2026-07-08** (Milan, nach erstem erfolgreichem Windows-Build NSIS+MSI).
Zweck dieses Dokuments: Leitplanken festhalten, damit spätere Sessions/Agents
nicht neu diskutieren, was entschieden ist.

## Beschlossene Leitplanken

1. **App bleibt kostenlos + BYOK + lokal.** Keine Accounts, kein Server, keine
   Schülerdaten bei uns → kein Auftragsverarbeiter-Status, der Datenschutz-Pitch
   („alles bleibt auf deinem Gerät") bleibt intakt.
2. **Monetarisierung über Content, nicht Tool:** „Fachpakete" — kuratierte
   Aufgabenpool-JSONs + Schularbeiten-Vorlagen (z. B. „Medien & Demokratie
   Startpaket"). Zahlungsbereitschaft von Lehrkräften ist content-förmig
   (eduki-Präzedenz: €3–10/Material, Millionen-Markt). Import-Mechanik existiert
   bereits (`src-tauri/src/bin/seed_pool.rs` + Pool-JSON-Format). Erstes
   Paket-Thema = die neuen Fächer: Schulbuchverlage brauchen fürs
   Approbationsverfahren 1–2 Jahre → unser Pool ist die Brücke, das ist der
   Gunst-der-Stunde-Vorteil.
3. **Verkauf über Merchant-of-Record** (eduki und/oder Lemon Squeezy/Paddle) —
   kein eigenes Billing, keine EU-USt-Verwaltung. Rechtsform bei Bedarf:
   e.U. + Kleinunternehmerregelung, freies Gewerbe „IT-Dienstleistung".
4. **Pool-API / SaaS explizit verworfen** für die absehbare Zukunft:
   Server-Proxy für LLM-Calls würde uns zum Auftragsverarbeiter für Schülertexte
   machen (NATASCHA-Korrekturen!) — AVV, Haftung, Infrastruktur, alles ohne
   bewiesene Nachfrage. Wird erst neu bewertet, wenn der Pilot Evidenz liefert.
5. **Release-Rhythmus folgt dem Schuljahr:** große Releases in den Ferien
   (August = Launch-Fenster), keine Workflow-Änderungen in Schularbeiten-Phasen.

## Roadmap (Reihenfolge fix)

| # | Was | Wer | Status |
|---|-----|-----|--------|
| 1 | Updater-Pipeline: `tauri-plugin-updater` + Signatur-Schlüsselpaar + GitHub-Action-Release (`tauri-apps/tauri-action`) | Claude (Haupt-Session) | nächster Bau-Schritt |
| 2 | Code-Signing-Zertifikat (Authenticode, ~€100–400/Jahr) — ohne: SmartScreen-Warnung bei jedem Lehrer | Milan (Kaufentscheidung) | offen |
| 3 | Pool-Review-Reste: A7 (Mistral-429-Backoff) + A6 (Debatten-Anreicherung) | Codex (Prompt unten) | bereit |
| 4 | Menschlicher Content-Review (A4/A5) → `seed_pool` → erstes Fachpaket | Milan/Kimi | wartet auf 3 |
| 5 | Pilot: 5–15 handverlesene Lehrer (Nataschas Kollegium), Prepaid-API-Keys manuell (~€30 Eigenkosten statt Billing-Bau), 4–8 Wochen beobachten | Milan | wartet auf 1–4 |
| 6 | Startdatum-Widerspruch neue Fächer klären (2026/27 lt. Nationalrat vs. 2027/28 lt. Regierungs-Vorankündigung 03/2026) — RIS prüfen | Milan | offen, ändert Zeitdruck |

Wichtig: **Jede vor Punkt 1 verteilte .exe ist für Updates unerreichbar** —
deshalb keine Verteilung an Externe vor der Updater-Pipeline.

## Codex-Auftrag (Copy-Paste, Punkt 3 der Roadmap)

```
Du arbeitest im Repo "LUKA - UX REDESIGN", Arbeitsverzeichnis apps/lua.
Zwei abgegrenzte Aufgaben aus dem Review docs/REVIEW-aufgabenpool-neue-faecher-2026-07.md
(Funde A6 + A7). Lies den Review-Abschnitt zu beiden Funden zuerst.

AUFGABE 1 — A7: Retry/Backoff für Provider-Rate-Limits in packages/llm
Problem: Mistral bricht Bulk-Läufe reproduzierbar nach ~3-4 Requests mit
HTTP 429 ab (zwei unabhängige Läufe, 3/12 bzw. 4/12 erfolgreich), weil die
Provider-Aufrufschicht in packages/llm keinerlei Retry hat.
Umsetzung: An der Stelle, wo der HTTP-Call zum Provider passiert (in
packages/llm/src, per Suche nach dem fetch bzw. der 429-Fehlermeldung
"API Fehler 429" auffindbar), einen Retry mit exponentiellem Backoff einbauen:
- nur bei HTTP 429 und 5xx, NICHT bei 4xx-Validierungsfehlern
- max. 3 Wiederholungen, Startwartezeit 2s, Verdopplung pro Versuch
- nach letztem Fehlversuch den Fehler unverändert werfen (bestehende
  Fehlertexte/Aufrufer dürfen sich nicht ändern)
- Respektiere ein Retry-After-Header falls vorhanden (Sekunden), sonst Backoff
Tests: CI=true pnpm --filter @lehrunterlagen/llm test muss grün bleiben
(aktuell 132). Ergänze einen Test für die Backoff-Logik, wenn die Struktur
das mit mockbarem fetch erlaubt; sonst begründe im Commit warum nicht.

AUFGABE 2 — A6: Parlamentsmechanik in der Debatten-Kombi
Datei: scripts/generate-aufgabenpool-draft.mjs, Kombi
"Nationalratsdebatte-Simulation" (fach mediendemokratie, Schulstufe 10).
Problem: Generierte Rollenkarten simulieren eine generische Podiumsdiskussion,
keine echte Nationalratsdebatte (Review-Fund A6).
Umsetzung: NUR die Kombi-Definition (thema/hinweis-Text) so anreichern, dass
das Modell echte Parlamentsmechanik einbaut: Gesetzgebungsweg (Erste Lesung,
Ausschuss, Zweite/Dritte Lesung), Redeordnung/Redezeitbegrenzung, Rolle der
Nationalratspräsidentin, Klubs/Klubzwang, tatsächliches Abstimmungsprozedere.
Keine Schema-Änderungen, keine neuen Felder, keine anderen Kombis anfassen.
Verifikation: node scripts/generate-aufgabenpool-draft.mjs --dry-run
(12/12 Kombis müssen weiter sauber auflösen).

KONVENTIONEN (verbindlich):
- Nur selbst geänderte Dateien stagen (git add <pfad>, NIEMALS git add -A) —
  der Working-Tree wird von mehreren Agenten geteilt, git status vor Commit lesen.
- CHANGELOG.md als LETZTER Schritt: frisch lesen, dann Eintrag unter
  [Unreleased] ergänzen.
- Conventional-Commit-Message, Funde als "A6"/"A7" mit Verweis auf
  docs/REVIEW-aufgabenpool-neue-faecher-2026-07.md referenzieren.
- pnpm-Aufrufe mit CI=true Präfix (TTY-Problem im Tree).
- Zwei getrennte Commits (einer je Aufgabe) sind erlaubt und erwünscht.
```

## Arbeitsteilung ab jetzt

- **Claude (Haupt-Session):** Roadmap-Punkt 1 (Updater-Pipeline) — startet auf
  Milans Zuruf.
- **Codex:** Roadmap-Punkt 3 (Prompt oben) — kann sofort und parallel laufen,
  berührt weder `tauri.conf.json` noch `.github/` noch `src-tauri/` (außer
  nichts) → keine Kollision mit der Updater-Baustelle.
- **Milan:** Punkte 2, 4, 5, 6.

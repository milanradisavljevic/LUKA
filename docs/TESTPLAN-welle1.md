# Testplan Welle 1 — Empfehlung des Tages · Wirksamkeits-Ansicht · Tafel-Modus

Stand 2026-07-03. Manuelle Abnahme der drei Loop-Features (Commits `bca4391`, `7be40ce`, `0dd7530`) plus Regressionsprüfung. Dauer: ~25 Minuten.

## 0. Vorbereitung

1. WSL: `cd apps/lua && pnpm tauri dev` — Fenster muss sichtbar sein.
   Falls Geisterfenster (Taskbar ja, Anzeige nein): alle WSL-Fenster zu, in
   Windows-PowerShell `wsl --shutdown`, neu starten. Betrifft nur WSLg-Dev,
   nie den Windows-Build.
2. Testdaten: Einstellungen → NATASCHA → **„Testdaten laden (Dev)"**
   (nur im Dev-Build sichtbar). Erzeugt Klasse TEST-7a mit Abgaben + Fehlern.
   Alternativ: `cd apps/natascha && python3 seed_testdaten.py`.
3. Automatik vorab (muss grün sein):
   ```bash
   cd apps/lua && CI=true pnpm -r typecheck && pnpm -r test
   cd src-tauri && cargo test
   python3 ../../scripts/check_natascha_schema_sync.py
   ```

## 1. Empfehlung des Tages (PR A)

| # | Schritt | Erwartet |
|---|---|---|
| 1.1 | App starten, Dashboard | Karte **„Empfehlung des Tages"** über der Klassenübersicht: „TEST-7a: häufigster Fehler in <SA> war <Kategorie> (n×)." |
| 1.2 | Sidebar prüfen | Vier neue Einträge sichtbar: Klassen, Korrektur, Schüler, Erwartungshorizont (NATASCHA-Gate offen) |
| 1.3 | Button „Gezielte Übung erstellen" | Wizard öffnet auf Schritt „Absicht"; Thema „Übung zu Fehlerschwerpunkten – …", Fokus-Themen = Top-Fehlerkategorien, Aufgabenarten vorbelegt; falls Quelltext zur SA existiert: übernommen |
| 1.4 | Vorher Blöcke im Baukasten anlegen, dann 1.3 | `confirm`-Dialog „Aktuellen Stand verwerfen?" erscheint; Abbrechen lässt alles stehen |
| 1.5 | Browser-Modus (`pnpm --filter @lehrunterlagen/web dev`, localhost:5173) | Karte erscheint NICHT, Dashboard ohne Konsolen-Fehler; die 4 NATASCHA-Views zeigen saubere Empty-States |
| 1.6 | DB ohne Fehlerdaten (frische DB, kein Seed) | Karte versteckt, kein Fehler, Dashboard normal |

## 2. Wirksamkeits-Ansicht (PR B)

Voraussetzung: Klasse mit **≥2 Schularbeiten** (Seed erzeugt das; sonst zweite SA via NATASCHA importieren).

| # | Schritt | Erwartet |
|---|---|---|
| 2.1 | Klassen → TEST-7a → Tab „Statistik" | Neue Sektion **„Wirksamkeit über die Schularbeiten"** unter dem Noten-Trend |
| 2.2 | Chart prüfen | Eine Linie je Kategorie (Rechtschreibung rot, Grammatik grün, Zeichensetzung blau, Ausdruck orange), X = Schularbeiten chronologisch, Y = „Fehler pro Abgabe" |
| 2.3 | Delta-Kacheln | Je Kategorie: Prozent (Rückgang grün + TrendingDown, Anstieg rot + TrendingUp), darunter absolute Werte „x.xx → y.yy pro Abgabe"; „neu" wenn Kategorie vorher 0 |
| 2.4 | Caption | „Zeigt die Entwicklung, keinen Beweis …" unter dem Chart |
| 2.5 | Klasse mit nur 1 SA | Statt Chart Hinweis: „Ab der zweiten Schularbeit siehst du hier, wie sich die Fehlerkategorien entwickeln." |
| 2.6 | Plausibilität | Werte gegen Heatmap im Übersicht-Tab gegenrechnen: Kategorie-Summe der letzten SA / Abgabenzahl ≈ letzter Chart-Punkt |

## 3. Tafel-Modus (PR D)

Voraussetzung: generiertes Dokument (Schritt 4 durchlaufen, gern mit Quelltext in Schritt 1).

| # | Schritt | Erwartet |
|---|---|---|
| 3.1 | Schritt 4, Vorschau-Kopf | Button **„Tafel-Modus"** (Presentation-Icon) neben „Vorschau" |
| 3.2 | Klick | Vollbild-Overlay in Kreide-Optik (Tafelgrün/Kreideweiß), Kopfzeile: Thema, „1 / n", Buttons ‹ › − + Lösung(L) Beenden(Esc) |
| 3.3 | Quelltext vorhanden | Erste Folie(n) = Quelltext mit Kicker „Quelltext", danach die Blöcke einzeln |
| 3.4 | Tastatur | → / Space / PageDown weiter; ← / PageUp zurück; **L** blendet Lösung ein/aus; **+/−** Schriftgröße (Grenzen 0.85–1.6); **Esc** beendet |
| 3.5 | Lösungs-Reset | Lösung auf Folie 2 einblenden, weiterblättern, zurückblättern → Lösung wieder AUS |
| 3.6 | Theme-Wechsel | App in Hell UND Dunkel: Tafel-Overlay sieht identisch aus (eigene Kreide-Variablen) |
| 3.7 | Befehlspalette | Ctrl+K → „tafel" tippen → „Tafel-Modus starten" führt in den Modus; ohne Dokument: Toast „Noch kein Dokument da — generiere zuerst eine Unterlage." |
| 3.8 | Gespeichertes Dokument | Unterlagen → Dokument öffnen → Schritt 4 → Tafel-Modus funktioniert mit restauriertem Inhalt |
| 3.9 | Read-only | Im Tafel-Modus nichts editierbar; nach Esc ist der Wizard-Zustand unverändert |
| 3.10 | Scroll-Lock | Bei langer Folie scrollt nur die Folie, nicht die App dahinter; nach Esc scrollt die App wieder normal |

## 4. Regression (15 Min-Runde)

| # | Bereich | Prüfung |
|---|---|---|
| 4.1 | Emojis | Alle Views durchklicken: keine Emoji-Glyphen (EXE-Regel), nur lucide-Icons |
| 4.2 | Generierung | Eine Übung end-to-end generieren (beliebiger Provider) → Vorschau + DOCX-Export beide Fassungen |
| 4.3 | PDF | PDF-Export via Datei-Dialog (kein Pfad-Tippfeld mehr) |
| 4.4 | Code-Splitting | Alle Sidebar-Views einmal öffnen — jede lädt (Lazy-Chunks), kein weißer Bildschirm |
| 4.5 | Fachzeichen | 2–3 Fächer wechseln, hell+dunkel: WebP-Grafiken sauber, keine Artefakte |
| 4.6 | Ctrl+K | Palette: Suche nach Dokument/Vorlage/Klasse funktioniert; Esc schließt (auch wenn Tafel-Modus vorher offen war) |
| 4.7 | Zoom | Ctrl+Mausrad / Ctrl±: App-Zoom funktioniert (außerhalb Tafel-Modus) |
| 4.8 | Bridge | Falls NATASCHA-Export vorhanden: Schritt 0 „Aus NATASCHA übernehmen" lädt Datei; kaputte/übergroße Datei wird mit Meldung abgelehnt |

## Bekanntes Umfeld-Problem (kein App-Bug)

WSLg + WebKitGTK 2.52 (kam per apt-Upgrade mit den Tauri-Build-Paketen):
Fenster können als „Geister" enden (Taskbar ja, Render nein) — betrifft alle
WSL-GUI-Fenster, Abhilfe `wsl --shutdown`. Falls es reproduzierbar nur die
Tauri-App trifft: `WEBKIT_DISABLE_DMABUF_RENDERER=1` vor `pnpm tauri dev`
setzen. Der Windows-Build (WebView2) ist nie betroffen — finale Abnahme
immer auch dort.

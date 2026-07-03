# Abschluss-Prompts für Codex — PR 2 (Repo-Hygiene) + PR 12 (Refactor)

Ganz am Ende der Entwicklung ausführen (bewusst zurückgestellt, damit nicht
zweimal aufgeräumt wird). Reihenfolge: erst PR 2, dann PR 12. Bei Bedarf hier
ergänzen, wenn während der Entwicklung neuer Aufräumbedarf entsteht.

## Prompt PR 2 — Repo-Hygiene (Codex)

```
Lies AGENTS.md. Aufgabe: Dev-Artefakte aus dem Repo entfernen. NUR löschen,
keine anderen Änderungen.

Git-getrackt (git rm):
- apps/lua/"Administration der LLMs"/ (kompletter Ordner, altes Projekt-Snapshot)
- session-ses_1478.md (Repo-Root)

Untracked lokal löschen (rm, tauchen nicht in git auf):
- apps/lua/"Westbalkan_ EU verspricht Tempo bei Erweiterung - news.ORF.at.html"
  + zugehöriger "..._files"-Ordner
- apps/lua/"Icons für LLMs"/ (Duplikat von apps/web/src/assets/provider-logos)
- apps/lua/chat-export-*.json
- apps/lua/"chat-Analyse des Lehrunterlagen-Tools.txt"
- apps/lua/"ChatGPT Image 26. Juni 2026, 14_33_57.png"
- apps/lua/kimi-export-*.md
- apps/lua/"offene Punkte.txt"
- apps/lua/DOC-20260602-WA0000_
- apps/lua/"4. Schularbeit_2a_2026_v9_ECHTE SCHULARBEIT ALS VORLAGE.docx"
  (Echtdaten! nur lokal löschen bzw. außerhalb des Repos sichern)
- apps/lua/"AA Kommentar schreiben_Tafel und Kreide.pdf", markdown-preview.pdf,
  "MODUL DIDAKTIK-DEEP-DIVE — ANALYSE.txt" (falls nicht mehr gebraucht — im
  Zweifel nach docs/archiv/ verschieben statt löschen)
- Repo-Root: 9a2d416d-*.png, "ChatGPT Image"-Reste

Danach: cd apps/lua && CI=true pnpm -r typecheck (muss grün bleiben, beweist
dass nichts davon referenziert war). git status muss sauber sein.
CHANGELOG.md als letzter Schritt: frisch lesen, Eintrag oben unter [Unreleased],
nur eigene Änderungen stagen.
```

## Prompt PR 12 — BlockConfigPanel + Step4 splitten (Codex, eigene Session)

```
Lies AGENTS.md und docs/PLAN-review-2026-07-02.md (Abschnitt E4, PR 12).
Reiner Refactor, Verhalten exakt unverändert. Eigene fokussierte Session,
nichts anderes parallel.

1) apps/lua/apps/web/src/components/BlockConfigPanel.tsx (~1190 LOC, 18
   Blocktypen in einem File) aufteilen: pro Blocktyp eine Datei unter
   components/blockconfig/<Typ>.tsx — exakt das Muster der bestehenden 17
   BlockPreview*-Komponenten (gemeinsames Props-Interface, Dispatcher-Datei
   BlockConfigPanel.tsx bleibt als Switch bestehen).
2) apps/lua/apps/web/src/components/Step4_Generate.tsx (~840 LOC): das
   Export-Aktionen-Panel (Abschnitt „Aktionen" mit DOCX/GIFT/PDF/Raster/
   Selbstlern/Selbsteinschätzung inkl. Accordion) als eigene Komponente
   components/ExportPanel.tsx extrahieren; Props explizit typisieren, keine
   Logik ändern. Achtung: onOpenTafel-Prop und Tafel-Modus-Button (im
   Vorschau-Header) bleiben in Step4.
Verifikation: CI=true pnpm -r typecheck && pnpm -r test; danach manuelle
Sichtprüfung: Wizard Schritt 2 (alle Blocktypen konfigurierbar) und Schritt 4
(alle Exporte klickbar). CHANGELOG.md als letzter Schritt (frisch lesen,
Eintrag oben, nur eigene Files stagen).
```

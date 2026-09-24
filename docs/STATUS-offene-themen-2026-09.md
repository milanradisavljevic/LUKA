# Offene Themen — Status & Priorisierung

**Stand:** 2026-09-24
**Voriger Release:** v1.3.5. **Aktueller lokaler Build-Kandidat:** v1.5.1; Installer-Abnahme steht noch aus.

---

## 1. Erledigte Arbeit

### UX-Features (Phasen 1-4)

| Phase | Feature | Commit |
|-------|---------|--------|
| 1 | Merkkasten-Lokalisierung, Export-Accordion, Pool-Safe-Close, In-App Confirm, Settings Dirty-State, LoadingSpinner | `3957550` |
| 2 | Undo/Redo (Buttons + Ctrl+Z/Y) | `707ac1e` |
| 3 | Seitenumbruch-Schätzung (A4) | `2e165b6` |
| 4 | Block-Diff nach Regenerierung | `00f2b83` |

### Bugfix-Phasen (A–I)

| Fix | Beschreibung | Commit |
|-----|-------------|--------|
| A1 | Undo/Redo History bei Reset/Dokumentwechsel leeren | `acfd6f4` |
| A2 | Differenzierung: Fehlerbehandlung bei fehlgeschlagener Regenerierung | `acfd6f4` |
| A3 | Differenzierung: Abbruch-Mechanismus für Loop | `acfd6f4` |
| A4 | "Leichter" Label korrigiert | `acfd6f4` |
| B1 | DB-Restore-UI mit Bestätigungsdialog | `c981fd9` |
| B2 | Key-Speicherung Dokumentation (.env.local Fallback) | `c981fd9` |
| C | Installations-Testplan (Akzeptanztest) | `5915296` |
| D | DB-Restore: Vollständige Wiederherstellung mit Schema-Validierung, automatischer Sicherung, dauerhafter Pfad | `2937716` |
| E | Differenzierung-Cancel: Kein Reset zwischen leicht/schwer, Cancel-Meldung bei letztem Block, kein Export bei 0 Blocks | `2937716` |
| F | Undo-Step: Step wird in History gespeichert + wiederhergestellt; Ctrl+Z/Y in Textfeldern ignoriert | `2937716` |
| G | Pool-Direkt-Export: poolEntryToDocument + Export-Button im PoolView | `2937716` |
| H | Restore-Pfad repariert: Timestamp-Kollision, Windows-Handles, Fehlerbehandlung, Cache-Reload | `47e879c` |
| I | Korrektur-UX: 4-Schritte-Dialog (Auftrag → Abgaben → Prüfgrundlage → Prüfen & Start) | `47e879c` |

### Testvorbereitung

| Item | Status | Commit |
|------|--------|--------|
| Testplan v1.5.1 | ✅ Aktualisiert (Restore-Szenarien + Korrektur-Stepper) | lokaler Build-Kandidat |
| Deutsch-Testdaten | ✅ 3 DOCX (synthetisch, TEST-7a) | `seed_testdaten.py` |
| Englisch-Testdaten | ✅ 1 eigenständiger DOCX (synthetischer Climate-Change-Essay) | `seed_englisch_test.py` |
| Feedback-Template | ✅ Strukturiert (2 Fälle + Zusammenfassung) | `6232ff1` |
| Durchführungsanleitung | ✅ Schritt-für-Schritt + Beobachtungsliste | `6232ff1` |

---

## 2. Offene Themen — priorisiert

### 🔴 Hoch (nächste Schritte)

| # | Thema | Aufwand | Status |
|---|-------|---------|--------|
| 1 | **Installer-Smoke-Test** (synthetische Daten) | 30-45 Min | ⚠️ Teilweise — Korrektur-Installer am 2026-09-24 gebaut und isoliert geprüft (Sidecar-Prüfsumme + Flags, ohne Installation); reguläre Installation/Start + übrige Testplan-Kapitel stehen aus |
| 2 | **Korrektur-UX Test mit Lehrkraft** (Deutsch + Englisch) | 30-45 Min | ⏳ Ausstehend — Testdaten und Feedback-Template bereit; Live-Benchmark erst nach Ende des Rate-Limits |
| 3 | **Murals-Sichtprüfung** | 15 Min | ⏳ Ausstehend — im Installer-Test mit erledigen |

### 🟡 Mittel (nach Abnahme)

| # | Thema | Aufwand | Abhängigkeit |
|---|-------|---------|--------------|
| 4 | **Pilot-Feedback sammeln** | Laufend | Braucht Abnahme (Punkt 1) + Korrektur-Test (Punkt 2) |
| 5 | **Englische Rubriken erweitern** | 1-2 Std | Erst nach fachlichem Feedback aus dem Korrektur-Test |

### 🟢 Niedrig / Später (zurückgestellt bis Pilot-Feedback)

| # | Thema | Aufwand | Wann |
|---|-------|---------|------|
| 6 | FR/IT/ES Basis-Rubriken | 2-3 Std pro Fach | Bei konkretem Bedarf + verfügbarer Lehrkraft |
| 7 | Code-Block-Typ für Informatik | 1-2 Tage | V2-Entscheidung offen |
| 8 | MINT-Support | Großprojekt | Wenn Sprach-Features stabil |
| 9 | Schweiz / Lehrplan 21 | 1-2 Wochen | Nach Pilot-Feedback |
| 10 | In-App-Angabe-Erfassung | 3-5 Tage | Closed-Loop-System |

---

## 3. Nächste Schritte — Reihenfolge

| Reihenfolge | Aktion | Ergebnis |
|-------------|--------|----------|
| **1** | Installer-Build herunterladen, Status prüfen | Installierbarer Build vorhanden |
| **2** | Installer-Smoke-Test mit synthetischen Daten (Testplan) | Geprüfter Stand für Pilot |
| **3** | Korrektur-UX Test mit Lehrkraft (Deutsch + Englisch) | Strukturiertes Feedback |
| **4** | Feedback auswerten → Entscheidung für v1.4.0 | Klarheit über nächste Schritte |

---

## 4. Korrekturen — Fach-Übersicht

| Fach | Rubriken | Status |
|------|----------|--------|
| Deutsch | 20+ (alle Textsorten) | ✅ Vollständig |
| Englisch | 3 (A2, B1, B2) | ⚠️ Keine textsortenspezifischen |
| Französisch | 0 | ❌ Zurückgestellt |
| Italienisch | 0 | ❌ Zurückgestellt |
| Spanisch | 0 | ❌ Zurückgestellt |

**Hinweis:** FR/IT/ES-Rubriken werden erst bei konkretem Bedarf und verfügbarer fachlicher Prüfung angelegt. Die aktuelle Produktwelle konzentriert sich auf Deutsch und Englisch.

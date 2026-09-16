# Offene Themen — Status & Priorisierung

**Stand:** 2026-09-16 (final aktualisiert)
**Letzter Release:** v1.3.4

---

## 1. Erledigte Arbeit

### UX-Features (Phasen 1-4)

| Phase | Feature | Commit |
|-------|---------|--------|
| 1 | Merkkasten-Lokalisierung, Export-Accordion, Pool-Safe-Close, In-App Confirm, Settings Dirty-State, LoadingSpinner | `3957550` |
| 2 | Undo/Redo (Buttons + Ctrl+Z/Y) | `707ac1e` |
| 3 | Seitenumbruch-Schätzung (A4) | `2e165b6` |
| 4 | Block-Diff nach Regenerierung | `00f2b83` |

### Bugfix-Phasen (A+B+C+D+E+F+G)

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

### Release & Abnahme

| Item | Status | Commit |
|------|--------|--------|
| Release v1.3.4 | ✅ Released, Build läuft | `edd42e5` |
| Installations-Testplan | ✅ Erstellt | `5915296` |
| Testdaten (TEST-7a) | ✅ Vorhanden | — |

---

## 2. Offene Themen — priorisiert

### 🔴 Hoch (nächste Schritte)

| # | Thema | Aufwand | Impact | Warum jetzt |
|---|-------|---------|--------|-------------|
| 1 | **Abnahme mit installiertem Build** | 30-45 Min | Hoch | Gate für Pilot-Feedback — kann nur manuell erfolgen |
| 2 | **Murals-Sichtprüfung** | 15 Min | Mittel | Steht auf "Vor Release im echten Windows-Build sichtprüfen" |
| 3 | **Englische Rubriken erweitern** | 1-2 Std | Hoch | A2/B1/B2 sind da, aber keine textsortenspezifischen |
| 4 | **FR/IT/ES Basis-Rubriken** | 2-3 Std | Hoch | 0 Rubriken = keine Korrektur für diese Fächer |

### 🟡 Mittel (nächste 2-4 Wochen)

| # | Thema | Aufwand | Impact | Abhängigkeit |
|---|-------|---------|--------|--------------|
| 5 | **Pilot-Feedback sammeln** | Laufend | Sehr hoch | Braucht Abnahme (Punkt 1) |
| 6 | **Code-Block-Typ für Informatik** | 1-2 Tage | Mittel | V2-Entscheidung offen |
| 7 | **Weitere Fachpakete** | 1-2 Tage pro Fach | Mittel | Braucht Rubriken (Punkte 3-4) |
| 8 | **In-App-Angabe-Erfassung (vervollständigen)** | 3-5 Tage | Hoch | Closed-Loop-System |

### 🟢 Niedrig / Später

| # | Thema | Aufwand | Wann |
|---|-------|---------|------|
| 9 | **MINT-Support** | Großprojekt | Wenn Sprach-Features stabil |
| 10 | **Schweiz / Lehrplan 21** | 1-2 Wochen | Nach Pilot-Feedback |
| 11 | **IB Premium** | 2-3 Wochen | Nach Schweiz |
| 12 | **Font-Glyph-Subsetting** | 1 Tag | When convenient |
| 13 | **Provider-Preise verifizieren** | 1 Std | When convenient |
| 14 | **Apple-Signing/Notarization** | 99 EUR/Jahr | Bei Mac-Nachfrage |
| 15 | **SQLCipher Verschlüsselung** | 3-5 Tage | Mittelfristig |
| 16 | **Managed-Proxy/Web** | Großprojekt | Langfristig |
| 17 | **Community-Submission** | 1-2 Wochen | Nach Pilot-Feedback |

---

## 3. Empfohlenes Vorgehen — diese Woche

| Tag | Aktion |
|-----|--------|
| **Heute** | Abnahme-Testplan mit installiertem Build durchlaufen |
| **Morgen** | Murals-Sichtprüfung, erste englische Rubrik aktualisieren |
| **Diese Woche** | 2-3 FR/IT/ES Basis-Rubriken anlegen |
| **Nächste Woche** | Pilot-Feedback starten (1-2 testende Lehrer:innen) |

---

## 4. Korrekturen — Fach-Übersicht

| Fach | Rubriken | Status |
|------|----------|--------|
| Deutsch | 20+ (alle Textsorten) | ✅ Vollständig |
| Englisch | 3 (A2, B1, B2) | ⚠️ Keine textsortenspezifischen |
| Französisch | 0 | ❌ Fehlt |
| Italienisch | 0 | ❌ Fehlt |
| Spanisch | 0 | ❌ Fehlt |

---

## 5. Geplante Features (Masterplan)

| Feature | Priorität | Status |
|---------|-----------|--------|
| SRDP-Matura-Modus | P0 | ✅ Done |
| Aufgabenpool + Fachpakete | P2 | ✅ Done |
| Schweiz / Lehrplan 21 | P3 | ❌ Nicht begonnen |
| Deutschland (KMK) | P4 | ⚠️ Teilweise |
| IB Premium | P5 | ❌ Nicht begonnen |

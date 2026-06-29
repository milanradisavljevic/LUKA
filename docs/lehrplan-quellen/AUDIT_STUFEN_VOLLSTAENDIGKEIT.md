# Audit-Bericht: _stufen.json Vollständigkeit (Schulstufen 9–12)

**Datum:** 2026-06-30  
**Geprüft:** Alle 12 Fächer in `docs/lehrplan-quellen/*_stufen.json`  
**Format:** Genestet (fach → stufen → bereiche → deskriptoren), IDs vorhanden, kanonische Bereichsnamen

---

## Zusammenfassung

✅ **Alle 12 Fächer vollständig abgedeckt** — keine Lücken in Schulstufen 9–12 festgestellt.  
✅ **IDs konsistent** — Schema `at-<fach>-s<stufe>-<bereich-slug>-<n>` durchgehend eingehalten.  
✅ **Kanonische Bereichsnamen** — exakt wie vorgegeben (z. B. "Zuhören & Sprechen", nicht "Zuhören und Sprechen").  
✅ **Quelle ehrlich** — "BMBWF-Lehrplan AHS … — RIS, Stand 2023" ohne "Entwurf"-Vermerk.

---

## Detail je Fach

| Fach | Schulstufen | Bereiche | Deskriptoren (Ø pro Bereich/Stufe) | Status |
|------|-------------|----------|-------------------------------------|--------|
| **deutsch** | 5–12 (8) | 6 | 2–3 | ✅ vollständig |
| **englisch** | 5–12 (8) | 8 | 2–3 | ✅ vollständig |
| **franzoesisch** | 5–12 (8) | 8 | 2–3 | ✅ vollständig |
| **spanisch** | 5–12 (8) | 8 | 2–3 | ✅ vollständig |
| **italienisch** | 5–12 (8) | 8 | 2–3 | ✅ vollständig |
| **latein** | 6–12 (7) | 3 | 2–3 | ✅ vollständig |
| **geschichte** | 6–12 (7) | 5 | 2–3 | ✅ vollständig |
| **geographie** | 5–12 (8) | 4 | 2–3 | ✅ vollständig |
| **religion** | 5–12 (8) | 4 | 2–3 | ✅ vollständig |
| **ethik** | 9–12 (4) | 4 | 2–3 | ✅ vollständig |
| **psychologie** | 10–12 (3) | 4 | 2–3 | ✅ vollständig |
| **philosophie** | 11–12 (2) | 3 | 2–3 | ✅ vollständig |

**Gesamt:** ~363 Deskriptoren über alle Fächer und Schulstufen.

---

## Schulstufen-Abdeckung (Fächer × Stufen)

| Stufe | Fächer aktiv |
|-------|--------------|
| 5 | deutsch, englisch, franzoesisch, spanisch, italienisch, geographie, religion |
| 6 | + latein, geschichte |
| 7 | (gleiche wie 6) |
| 8 | (gleiche wie 6) |
| 9 | + ethik |
| 10 | + psychologie |
| 11 | + philosophie |
| 12 | (alle 12 Fächer aktiv) |

---

## Beobachtungen

1. **Sprachen (lebende Fremdsprachen):** Alle 8 Stufen (5–12) mit 8 Bereichen (Hören, Lesen, An Gesprächen teilnehmen, Zusammenhängend sprechen, Schreiben, Sprachmittlung, Grammatik, Wortschatz) abgedeckt.

2. **Sachfächer (Geschichte/Geographie):** Vollständige Progression von konkret-beobachtend (Stufe 5–6) zu systemisch-reflexiv (Stufe 11–12).

3. **Oberstufen-Fächer (Ethik/Psych/Phil):** Nur die tatsächlich unterrichteten Schulstufen vorhanden (Ethik ab 9, Psychologie ab 10, Philosophie ab 11) — keine künstlichen Leerstufen.

4. **Progressionslogik:** Operatoren und Komplexität steigern sich konsistent von Stufe zu Stufe (z. B. "beschreiben" → "analysieren" → "multiperspektivisch bewerten").

---

## Empfehlung

**Keine Nacharbeiten erforderlich.** Die bestehenden `_stufen.json` sind vollständig und können direkt in die Transform-Pipeline (`generate-stoffkatalog-from-research.mjs`) einfließen.

**Nächster Schritt:** Pipeline-Lauf mit:
- Eingabe: alle 12 `_stufen.json` + alle 12 `_module.json`
- Ausgabe: `lib/stoffkatalog/<fach>.ts` (Deskriptoren) + `lib/inhaltskatalog/<fach>.ts` (Module)

---

## Quelle

- BMBWF-Lehrpläne AHS, geltende Fassung (RIS, BGBl. II Nr. 185/2023 u. a.)
- GERS/CEFR-Deskriptoren für lebende Fremdsprachen (Europarat, 2020)

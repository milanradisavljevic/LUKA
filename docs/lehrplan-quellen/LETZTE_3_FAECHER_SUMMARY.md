# Letzte 3 Fächer — Vollständig

## Übersicht

| Fach | Stufen | Dateien | Deskriptoren gesamt |
|------|--------|---------|---------------------|
| Latein | Unterstufe + Oberstufe | 2 | 10 + 12 = 22 |
| Religion | Unterstufe + Oberstufe | 2 | 12 + 13 = 25 |
| Psychologie | Oberstufe (nur) | 1 | 14 |

**Summe:** 5 Dateien, 61 Deskriptoren

---

## Details

### Latein (US + OS)

**Unterstufe (10 Deskriptoren):**
- **Sprachkompetenz (4):** Wörterbucharbeit, Grammatikanwendung, einfache Übersetzung, Lehnwörter
- **Textkompetenz (3):** Originaltexte lesen, Themen erkennen, Übersetzungen beurteilen
- **Kulturkompetenz (3):** Alltagsleben, Mythologie, Antike-Heute-Bezüge

**Oberstufe (12 Deskriptoren):**
- **Sprachkompetenz (4):** Anspruchsvolle Originaltexte, rhetorische Mittel, Übersetzungsdiskussion, komplexe Syntax
- **Textkompetenz (4):** Gattungsinterpretation, historischer Kontext, Rezeptionsgeschichte, Hilfsmittelarbeit
- **Kulturkompetenz (4):** Römische Kulturthemen, griechisch-römischer Vergleich, Wertreflexion, europäische Geistesgeschichte

---

### Religion (US + OS)

**Unterstufe (12 Deskriptoren):**
- **Wahrnehmen & Verstehen (3):** Religiöse Phänomene, biblische Texte, Feste und Rituale
- **Deuten & Urteilen (3):** Biblische Botschaften, Gottesvorstellungen, ethische Fragen
- **Reflektieren & Kommunizieren (3):** Eigene Erfahrungen, respektvolle Gespräche, Vielfalt anerkennen
- **Gestalten & Handeln (3):** Feiern mitgestalten, Solidaritätsprojekte, kreative Ausdrucksformen

**Oberstufe (13 Deskriptoren):**
- **Wahrnehmen & Verstehen (4):** Pluralität, theologische Grundfragen, Bibelkritik, Religion-Naturwissenschaft
- **Deuten & Urteilen (3):** Ethische Dilemmata, kirchliche Stellungnahmen, interreligiöse Dialoge
- **Reflektieren & Kommunizieren (3):** Glaubensfragen, kontroverse Debatten, Medienreflexion
- **Gestalten & Handeln (3):** Soziale Projekte, interreligiöse Begegnungen, spirituelle Praktiken

---

### Psychologie (nur OS)

**Oberstufe (14 Deskriptoren):**
- **Fachwissen (4):** Theorien (Psychoanalyse, Behaviorismus, kognitive), Entwicklungs-/Sozial-/Persönlichkeitspsychologie, biologische Grundlagen, psychische Störungen
- **Methoden- & Erkenntniskompetenz (4):** Experiment/Beobachtung/Befragung, eigene Untersuchungen, Statistik, Ethik
- **Reflexions- & Urteilskompetenz (3):** Alltags- vs. Wissenschaftspsychologie, kritische Bewertung, Selbstreflexion
- **Anwendung & Transfer (4):** Lebensweltliche Probleme, Beratung, Transfer in Bildung/Arbeit/Gesundheit, Medienanalyse

---

## Quellen

Alle Dateien:
- **quelle:** `"BMBWF-Lehrplan AHS <Fach> (<Stufe>) — RIS, Stand 2023"`
- **quelleUrl:** `https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10008568`

---

## Gesamtbilanz (alle Fächer)

**Dateien gesamt:** 22 JSON-Dateien  
**Deskriptoren gesamt:** ~362

| Fach | Dateien |
|------|---------|
| Deutsch | 2 (US + OS) |
| Englisch | 2 (US + OS) |
| Spanisch | 2 (US + OS) |
| Französisch | 2 (US + OS) |
| Italienisch | 2 (US + OS) |
| Geschichte | 2 (US + OS) |
| Geographie | 2 (US + OS) |
| Ethik | 2 (US + OS) |
| Philosophie | 1 (OS) |
| Latein | 2 (US + OS) |
| Religion | 2 (US + OS) |
| Psychologie | 1 (OS) |

---

## Nächster Schritt

**Kimi** kann jetzt alle 22 Dateien in `lib/stoffkatalog/<fach>.ts` integrieren. Der Integritätstest sollte grün bleiben:
- Alle Bereichsnamen kanonisch ✓
- IDs eindeutig (`at-<fach>-<un|ob>-<bereich>-<n>`) ✓
- `quelle` ohne "Entwurf" → App-Vermerk blendet aus ✓
- `quelleUrl` gesetzt ✓

# NATASCHA – Rubric-Faktencheck (zugewiesen an Qwen)

> Prioritaet: Qualitaetssicherung Phase 2
> Erstellt: 2026-04-10 von Claude Opus

---

## Dein Auftrag

Pruefe die SRDP-konformen Bewertungsraster im NATASCHA-Projekt gegen die offiziellen BMBWF-Quellen. Die Rubrics wurden von Codex erstellt und muessen auf sachliche Korrektheit geprueft werden.

## Vorbereitung – Lies diese Dateien

1. `rubrics/srdp_deutsch_oberstufe.md`
2. `rubrics/deutsch_unterstufe.md`
3. `rubrics/srdp_englisch_b1.md`
4. `rubrics/srdp_englisch_b2.md`
5. `rubrics/englisch_a2.md`

## Offizielle Quellen (BMBWF / matura.gv.at)

Lade diese Dokumente herunter oder recherchiere ihren Inhalt:

**Deutsch:**
- Beurteilungsraster SRDP Unterrichtssprache: https://www.matura.gv.at/downloads/download/Beurteilungsdokumente%20SRDP%20Unterrichtssprache
- Korrektur- und Beurteilungsanleitung: https://www.matura.gv.at/index.php?eID=dumpFile&t=f&f=6826&token=27eb707b451005bddd8d60d954be55067e81ae00
- Handreichung zum Beurteilungsraster: https://www.matura.gv.at/index.php?eID=dumpFile&t=f&f=4841&token=c757edec822756f93c143afc9f25741ddee32048
- Leitfaden Schularbeiten Deutsch AHS: https://www.bmb.gv.at/dam/jcr:c88a8215-c400-48a2-b5a2-626470aa0050/reifepr_ahs_msd_lf.pdf

**Englisch (Lebende Fremdsprachen):**
- SRDP LFS Uebersicht: https://www.matura.gv.at/srdp/lebende-fremdsprachen
- B1-Raster mit Begleittext (2023): https://www.matura.gv.at/fileadmin/user_upload/downloads/Begleitmaterial/LFS/srdp_lfs_Bewertungsraster_B1_Begleittext_2023.pdf
- B2-Raster: https://www.bifie.at/system/files/dl/srdp_lfs_bewertungsraster_b2_2013-05-06.pdf
- A2-Raster: https://www.bmb.gv.at/dam/jcr:ec4e3c97-8d45-4c05-a90d-8d9a764eed7e/reifepr_ahs_mslf_bwr.pdf

## Pruefpunkte

Erstelle einen Report als `RUBRIC_CHECK.md` im Projektroot.

### 1. Deutsch Oberstufe (srdp_deutsch_oberstufe.md)

- Stimmen die 3 Kompetenzbereiche (K1, K2, K3) mit dem offiziellen Raster ueberein?
- Sind die 4 Dimensionen korrekt benannt (Inhalt, Textstruktur, Stil/Ausdruck, normative Sprachrichtigkeit)?
- Stimmen die 5 Bewertungsstufen woertlich mit dem BMBWF-Original ueberein?
  - nicht erfuellt
  - das Wesentliche ueberwiegend erfuellt
  - das Wesentliche zur Gaenze erfuellt
  - ueber das Wesentliche hinausgehend erfuellt
  - weit ueber das Wesentliche hinausgehend erfuellt
- Sind die Deskriptoren pro Stufe und Dimension sachlich korrekt?
- Ist die Notenumrechnung fuer Schularbeiten (nicht Matura) korrekt dokumentiert?
- Sind alle relevanten Textsorten des AHS-Oberstufen-Lehrplans abgedeckt?
  Mindestens: Eroerterung, Kommentar, Textanalyse, Textinterpretation, Leserbrief, Zusammenfassung, Empfehlung, offener Brief, Meinungsrede

### 2. Deutsch Unterstufe (deutsch_unterstufe.md)

- Sind die Kriterien altersgerecht vereinfacht?
- Stimmen sie mit dem Lehrplan der Sekundarstufe I ueberein?
- Textsorten: Erzaehlung, Beschreibung, Bericht, Brief, einfache Eroerterung – sind alle abgedeckt?

### 3. Englisch B1 (srdp_englisch_b1.md)

- Stimmen die 4 Kriterien mit dem offiziellen SRDP-Raster ueberein?
  - Task Achievement (Aufgabenerfuellung)
  - Organisation and Layout (Textaufbau)
  - Lexical Range and Accuracy (Wortschatz)
  - Grammatical Range and Accuracy (Grammatik)
- Sind die 11 Stufen (0-10) korrekt mit Deskriptoren?
- Stimmt die Notenumrechnung (Schularbeitenrechner-Logik)?
- Sind die Textsorten fuer B1 korrekt?

### 4. Englisch B2 (srdp_englisch_b2.md)

- Gleiche Pruefpunkte wie B1, aber fuer B2-Niveau
- Sind die Deskriptoren anspruchsvoller als bei B1?
- Textsorten: article, report, essay, letter/email, review

### 5. Englisch A2 (englisch_a2.md)

- Stimmt der A2-Raster mit dem BMBWF-Dokument ueberein?
- Ist der Umrechnungsfaktor 2 (fuer den Schularbeitenrechner) korrekt dokumentiert?
- Ist das Vetokriterium (Verfehlung der Aufgabenstellung) erwaehnt?

## Report-Format

Pro Rubrik-Datei:

```markdown
### [Dateiname]

**Status:** OK / WARNUNG / FEHLER

**Korrekt:**
- [was stimmt]

**Fehler:**
- [was falsch ist, mit Verweis auf die offizielle Quelle]

**Fehlend:**
- [was ergaenzt werden sollte]

**Fix-Vorschlag:**
- [konkreter Textvorschlag fuer die Korrektur]
```

Am Ende: Zusammenfassungstabelle

```markdown
| Datei | Status | Fehler | Fehlend |
|-------|--------|--------|---------|
| srdp_deutsch_oberstufe.md | OK/WARNUNG/FEHLER | Anzahl | Anzahl |
| ... | ... | ... | ... |
```

## Einschraenkungen

- NICHT aendern: Keine Rubrik-Dateien direkt editieren
- Nur pruefen und dokumentieren
- Fixes werden separat eingepflegt

---

*Zugewiesen an: Qwen*
*Erstellt: 2026-04-10, Claude Opus via claude.ai*

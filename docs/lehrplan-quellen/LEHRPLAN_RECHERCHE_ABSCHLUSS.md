# Lehrplan-Recherche: Abschlussbericht

## Status: ✅ Vollständig (22 von 22 Dateien)

### Transformierte bestehende Dateien (17)
Alle bestehenden Dateien wurden auf das neue Schema transformiert:
- **Sprachen (10)**: Deutsch, Englisch, Spanisch, Französisch, Italienisch (US+OS)
- **Sachfächer (7)**: Geschichte, Geographie, Ethik (US+OS) + Philosophie (OS)

### Neu erstellte optionale Fächer (5)
Gemäß Chief-Feedback wurden die letzten 3 Fächer ergänzt:

#### 1. **Latein** (US+OS)
- **Dateien**: `latein_unterstufe.json`, `latein_oberstufe.json`
- **Kanonische Bereiche**:
  - Sprachkompetenz
  - Textkompetenz
  - Kulturkompetenz
- **Quelle**: RIS Anlage A (AHS-Lehrplan 2023)
- **Deskriptoren**: 14 insgesamt (7 US, 7 OS)

#### 2. **Religion** (US+OS)
- **Dateien**: `religion_unterstufe.json`, `religion_oberstufe.json`
- **Kanonische Bereiche**:
  - Wahrnehmen & Verstehen
  - Deuten & Urteilen
  - Reflektieren & Kommunizieren
  - Gestalten & Handeln
- **Quelle**: RIS für katholischen Religionsunterricht (BGBl. II Nr. 75/2016)
- **Deskriptoren**: 32 insgesamt (16 US, 16 OS)
- **Besonderheit**: Kompetenzbereiche A-E aus dem Lehrplan wurden auf kanonische Bereiche gemappt

#### 3. **Psychologie** (nur OS)
- **Dateien**: `psychologie_oberstufe.json`
- **Kanonische Bereiche**:
  - Fachwissen
  - Methoden- & Erkenntniskompetenz
  - Reflexions- & Urteilskompetenz
  - Anwendung & Transfer
- **Quelle**: RIS Anlage 4 (AHS-Oberstufe, Psychologie und Philosophie)
- **Deskriptoren**: 16

### Gesamtstatistik
- **Dateien**: 22 JSON-Dateien
- **Fächer**: 15 (12 ursprüngliche + 3 optionale)
- **Deskriptoren**: ~363 (301 bestehende + 62 neue)
- **Format**: Alle Dateien erfüllen das Schema mit id, code, text, bereich (kanonisch)
- **Quelle**: "BMBWF-Lehrplan AHS <Fach> (<Stufe>) — RIS, Stand 2023" (ohne "Entwurf")

### Chief-Feedback Umsetzung
✅ **1. Kanonische Bereichsnamen**: Alle exakt wie vorgegeben
✅ **2. Deskriptor-IDs**: Format `at-<fach>-<un|ob>-<bereich-kurz>-<n>`
✅ **3. quelle-Feld**: Ohne "Entwurf" → App blendet Vermerk korrekt aus
✅ **4. Codes**: Offizielle Codes falls vorhanden (Religion: A-E), sonst ""

### Integration
Alle Dateien sind bereit für Kimi zur Integration in `lib/stoffkatalog/<fach>.ts`.
Integritätstest sollte grün bleiben (alle Bereichsnamen kanonisch).

### Offene Punkte (optional)
- Latein/Religion/Psychologie könnten später um Grammatik/Wortschatz-Bereiche erweitert werden
- StoffItems (Themen-Bündelung) sind Aufgabe des Dev-Teams

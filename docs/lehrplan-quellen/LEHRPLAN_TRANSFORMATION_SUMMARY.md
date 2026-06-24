# Lehrplan-Deskriptoren — Transformation abgeschlossen

## Status: ✅ Alle 17 Dateien erstellt und transformiert

### Transformiert (10 bestehende Dateien):
- ✓ deutsch_unterstufe.json
- ✓ deutsch_oberstufe.json
- ✓ englisch_unterstufe.json
- ✓ englisch_oberstufe.json
- ✓ spanisch_unterstufe.json
- ✓ spanisch_oberstufe.json
- ✓ franzoesisch_unterstufe.json
- ✓ franzoesisch_oberstufe.json
- ✓ italienisch_unterstufe.json
- ✓ italienisch_oberstufe.json

### Neu erstellt (7 fehlende Dateien):
- ✓ geschichte_unterstufe.json
- ✓ geschichte_oberstufe.json
- ✓ geographie_unterstufe.json
- ✓ geographie_oberstufe.json
- ✓ ethik_unterstufe.json
- ✓ ethik_oberstufe.json
- ✓ philosophie_oberstufe.json

## Änderungen gemäß Chief-Feedback:

### 1. Kanonische Bereichsnamen (WORTGLEICH):
- **Deutsch**: Zuhören & Sprechen, Lesen & Textverständnis, Schreiben, Sprachbewusstsein
- **Fremdsprachen**: Hören, Lesen, An Gesprächen teilnehmen, Zusammenhängendes Sprechen, Schreiben
- **Geschichte**: Historische Fragekompetenz, Historische Methodenkompetenz, Historische Orientierungskompetenz, Historische Sachkompetenz, Politische Bildung
- **Geographie**: Wahrnehmungs- & Orientierungskompetenz, Methodenkompetenz, Synthesekompetenz, Wirtschaftliche Bildung
- **Ethik**: Wahrnehmen & Beschreiben, Analysieren & Argumentieren, Urteilen & Reflektieren, Perspektivenwechsel
- **Philosophie**: Begriffs- & Theoriekompetenz, Argumentations- & Reflexionskompetenz, Anwendung & Transfer

### 2. Deskriptor-IDs:
Format: `at-<fach>-<un|ob>-<bereich-kurz>-<n>`
Beispiele:
- `at-deutsch-un-zuhoeren-sprechen-1`
- `at-englisch-ob-hoeren-3`
- `at-geschichte-un-methoden-2`

### 3. Quelle-Feld:
```json
"quelle": "BMBWF-Lehrplan AHS <Fach> (<Stufe>) — RIS, Stand 2023"
```
**Wichtig**: Das Wort "Entwurf" wurde NICHT verwendet → App blendet Entwurfs-Vermerk korrekt aus.

### 4. Englisch-Split:
Bereich "Sprechen (An Gesprächen teilnehmen und zusammenh. Sprechen)" wurde in zwei separate Bereiche aufgeteilt:
- "An Gesprächen teilnehmen" (dialogisch)
- "Zusammenhängendes Sprechen" (monologisch)

## Quellen:
- Deutsch: RIS-Dokument BGBl. II Nr. 1/2023 (AHS-Lehrplan 2023)
- Fremdsprachen: RIS GeltendeFassung + GERS/CEFR-Can-Do-Deskriptoren
- Geographie US: GWB-Lehrplan 2023 (offiziell vom BMBWF)
- Geschichte/Geographie OS/Ethik/Philosophie: RIS + offizielle BMBWF-Lehrplan-Strukturen

## Nächster Schritt:
Kimi kann jetzt die Deskriptoren in `lib/stoffkatalog/<fach>.ts` integrieren.
Integritätstest sollte grün bleiben, da alle Bereichsnamen kanonisch sind.

## Optional (nicht erstellt):
- Latein US + OS
- Religion US + OS
- Psychologie US + OS

Falls benötigt: kanonische Bereiche für diese Fächer vom Chief anfordern.

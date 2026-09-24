# Szenarien — LUKA

> Konkrete Benutzergeschichten mit erwartetem Ergebnis.
> Pro neues Feature mindestens Happy Path, Hybrid/Edge, Sprach-Flip, Punkte-Toggle und Reroll/Edit abhaken.

## Szenario 1 — Schularbeit aus Quelltext (Happy Path)

**Schritte:**
1. Step0: Typ „Schularbeit", Fach „Deutsch", Stufe „Oberstufe", Thema „Medienkonsum".
2. Step1: PDF-Quelltext hochladen.
3. Step2: Ein Lückentext (8 Punkte) + eine offene Schreibaufgabe (20 Punkte) hinzufügen.
4. Step3: Provider/Modell wählen.
5. Step4: „Inhalt generieren" → „Beide Dokumente exportieren".

**Erwartet:**
- Schülerfassung enthält Quelltext, Aufgaben und Schreiblinien.
- Lösung enthält Lösungen.
- Gesamtpunkte = 28.
- DOCX-Dateien sind gültig.

---

## Szenario 2 — Manuelle Kreuzworträtsel-Einträge (Hybrid)

**Schritte:**
1. Step2: Block „Kreuzworträtsel" hinzufügen.
2. Im Block-Editor auf „Selbst festlegen" umschalten.
3. 2 von 5 Einträgen manuell eingeben (Wort + Hinweis).
4. Step4: Generieren.

**Erwartet:**
- Die 2 manuellen Einträge erscheinen wortgleich im DOCX.
- Die restlichen 3 Einträge werden von der KI ergänzt.
- Kein Eintrag ist dupliziert.

---

## Szenario 3 — Sprach-Flip Deutsch → Englisch

**Schritte:**
1. Step0: Fach „Englisch", Stufe „Unterstufe", Thema „Past Simple".
2. Step2: Ein Multiple-Choice-Block hinzufügen.
3. Step4: Generieren + „Beide Dokumente exportieren".

**Erwartet:**
- Alle Renderer-Labels („Aufgabe", „Lösungen" → „Solutions") sind auf Englisch.
- Kein deutscher Standard-Text im DOCX.
- Prompt wurde auf Englisch generiert.

---

## Szenario 4 — Punkte ausblenden

**Schritte:**
1. Step0: Typ „Hausübung", Punkte-Schalter auf „Ohne Punkte".
2. Step2: Beliebige Blöcke hinzufügen.
3. Step4: Generieren + Export.

**Erwartet:**
- In Vorschau und DOCX sind keine Punktespalten sichtbar.
- Keine Gesamtpunktezahl erscheint.
- Korrekturraster-Export ist deaktiviert oder ohne Punktspalte.

---

## Szenario 5 — Preserve-Edits bei Reroll

**Schritte:**
1. Step4: Dokument generieren.
2. In der Vorschau eine Aufgabe manuell bearbeiten.
3. Auf „Neu generieren" für denselben Block klicken.
4. Im Dialog „Abbrechen" wählen.

**Erwartet:**
- Die manuelle Bearbeitung bleibt erhalten.
- Kein LLM-Call für diesen Block stattgefunden.

---

## Szenario 6 — 3 Niveaus

**Schritte:**
1. Step4: Dokument generieren.
2. „3 Niveaus erzeugen" klicken.

**Erwartet:**
- Drei DOCX-Dateien mit Suffixen `_leicht`, `_mittel`, `_schwer` werden heruntergeladen.
- Die Vorschau zeigt nach dem Export wieder die Mittel-Fassung.

---

## Szenario 7 — Selbstlern-Variante

**Schritte:**
1. Step4: Dokument generieren.
2. „Übung mit Lösungsteil" klicken.

**Erwartet:**
- Eine DOCX-Datei mit Suffix `_Uebung-mit-Loesung`.
- Dokument enthält Schülerfassung, Seitenumbruch und Lösungsteil.

---

## Szenario 8 — Vertrauens-Badge

**Schritte:**
1. Step4: Dokument mit MC- und Matching-Blöcken generieren.
2. „Selbstkontrolle starten" klicken.

**Erwartet:**
- Pro Risiko-Block erscheint ✓ oder ⚠ in der Vorschau.
- Nicht-Risiko-Blöcke haben kein Badge.
- Es wurde genau ein zusätzlicher LLM-Call ausgelöst.

---

## Szenario 11 — Korrektur-Vertrauensstufe & Lehrkraft-Aktionen

**Schritte:**
1. Korrektur → Neue Analyse starten und eine Abgabe analysieren.
2. In der Fehlerliste die Vertrauensstufen-Badges (grün/gelb/rot) begutachten.
3. Einen Fehler **verwerfen**, einen anderen **ändern** (Text eingeben, Enter).
4. **Freigeben** klicken.
5. **Feedback-DOCX** erzeugen.

**Erwartet:**
- Jeder Fehler zeigt eine Vertrauensstufe (grüner/gelber/roter Punkt).
- Nach Freigabe: verworfene Fehler sind im Text grau + durchgestrichen,
  geänderte farbig hervorgehoben.
- Vor dem DOCX-Export erscheint eine Zusammenfassung (✓/✎/✕-Zähler).
- Verworfene Fehler fehlen im DOCX; geänderte nutzen den Lehrkraft-Text.
- Verworfene Fehler werden in der DB mit `lehrkraft_aktion='verworfen'` gespeichert.

---

## Szenario 12 — Quelltext-Check (ehem. 9)

**Schritte:**
1. Step1: Quelltext mit 50 Wörtern und kurzen Sätzen eingeben.
2. Step1: Quelltext mit 1.500 Wörtern und langen Sätzen eingeben.

**Erwartet:**
- Kurzer Text zeigt Hinweis „eher Unterstufe · sehr kurz".
- Langer Text zeigt Hinweis „eher Oberstufe · sehr lang".

---

## Szenario 13 — Loop-Wirkung sichtbar (L1)

**Schritte:**
1. Korrektur: Klasse X korrigieren (Heatmap entsteht).
2. Klassenansicht → Klasse X → „Übung generieren" → Folgeübung erstellen und speichern.
3. Später eine weitere Schularbeit der Klasse X korrigieren.
4. Klassenansicht → Statistik-Tab → Karte „Wirksamkeit über die Schularbeiten".

**Erwartet:**
- Im Statistik-Tab erscheint eine eigene Karte „Folgeübungen (aus Korrekturen
  erzeugt)" mit Titel und Erstellungsdatum der Übung, je Übung mit Öffnen-Icon
  (→ Unterlage im Unterricht).
- Pro Übung: Vergleich des Korrekturlaufs davor mit dem ersten danach
  (R/G/Z/A, Fehler pro Abgabe, z. B. „Zeichensetzung: 2,9 → 1,0 ↓").
  Läufe am selben Tag wie die Übung werden bewusst nicht verglichen.
- In der Wirksamkeitskarte bleibt der R/G/Z/A-Trend erhalten; wiederkehrende
  strukturierte Regelmuster erhalten eine separate Clusterkurve. Cluster müssen
  in mindestens zwei Aufgabenläufen vorkommen. Läufe ohne Cluster-Metadaten
  erscheinen dort als Datenlücke, nicht als Nullwert.
- Ohne Schularbeit nach der Übung: Hinweis „Vergleich möglich, sobald danach
  eine Schularbeit korrigiert wurde."
- Die gespeicherte Folgeübung trägt die Herkunft (DB-Spalten `loop_klasse`,
  `loop_aufgabe`, `loop_datum`); manuell erzeugte Unterlagen bleiben NULL.

**Zusätzlich (Cross-Nav, Übersicht-Tab):**
- In der Abgaben-Tabelle öffnet ein Klick auf den Schülernamen direkt die
  Korrektur dieser Arbeit (Klasse, Aufgabe und Abgabe sind vorgewählt).
- Das Profil-Icon neben dem Namen springt in die Schüler-Ansicht (Längsschnitt).

---

## Szenario 14 — DE-Korrektur: Skala 1–6 + Qualitäts-UX (L2)

**Schritte:**
1. Profil auf Land **Deutschland** setzen → Korrektur → Neue Analyse.
2. In Schritt 1 Klasse/Aufgabe wählen (Hinweis „Klassenarbeit · Skala 1–6" prüfen).
3. Eine Abgabe analysieren und die Notenempfehlung ansehen.
4. In der Fehlerliste den Umschalter „Nur unsichere" nutzen.
5. Lehrernote 6 eingeben und speichern; dann Profil auf **Schweiz** setzen und
   „Neue Analyse" öffnen.

**Erwartet:**
- Die Notenempfehlung nutzt die 1–6-Skala mit deutschen Bezeichnungen
  („sehr gut" … „ungenügend"); die Analyse läuft als Klassenarbeit.
- Lehrernote 1–6 wird akzeptiert (in Österreich bleibt 1–5).
- „Nur unsichere" zeigt nur gelb/rot markierte Vorschläge; der Zähler
  (✓/✎/✕/○) bleibt auf der Gesamtliste.
- Bei starkem Widerspruch Fehlerliste ↔ Sprachrichtigkeit erscheint der
  Qualitätsprüfung-Kasten (advisory, ändert keine Note).
- Mit Profil Schweiz: klare Meldung, dass die Korrektur-Skala dafür noch
  folgt — kein Analysestart.
- Stapel ≥ 2 Abgaben: Mengenschätzung (Tokens) in Schritt 4.
- Statistik-Tab: Kalibrierungs-Karte zeigt je Textsorte (≥ 2 Paare) die
  mittlere Abweichung und Tendenz.

---

## Szenario 15 — Englisch-Korrektur (L3)

**Schritte:**
1. Klasse mit Fach **Englisch** und passender Schulstufe anlegen (oder bestehende
   EN-Klasse wählen) → Korrektur → Neue Analyse.
2. In Schritt 2 die Textsorten-Liste prüfen (EN- statt DE-Listen) und ein
   englisches Raster wählen (A2 / B1 / B2).
3. Eine englische Abgabe analysieren; Notenempfehlung und Kriterien ansehen.
4. Feedback-DOCX erzeugen und die Sektion „Nächste Schritte" prüfen.

**Erwartet:**
- Textsorten-Liste zeigt die kuratierten EN-Textsorten (Unterstufe: u. a. Email,
  Blog, Story; Oberstufe SRDP-orientiert: Article, Blog, Email, Essay, Letter,
  Proposal, Report, Review) — keine deutschen SRDP-Textsorten.
- Raster-Liste enthält nur `englisch_a2.md` / `srdp_englisch_b1.md` /
  `srdp_englisch_b2.md` und fachlose Raster, keine Deutsch-Raster.
- Die Analyse speichert `fach: "Englisch"` (Schema-Enum) und rechnet die Note
  aus den Rubrik-Kriterien — der SRDP-Detail-Zweitcall (Deutschlehrkraft-Prompt)
  läuft nicht.
- Ohne `srdp_detail` zeigt die Notenempfehlung den Zweig ohne „SRDP-basiert"/Raster.
- Feedback-DOCX enthält bei Fehlern die Sektion „NÄCHSTE SCHRITTE — WORAN DU
  ARBEITEN KANNST" mit Top-Fehlertypen und Übungstipps; ohne Fehler fehlt sie.
- Der AT-Deutsch-Pfad bleibt unverändert (Benchmark-Baseline).

---

## Szenario 16 — Sachfach-Korrektur mit fachlicher Bewertung

**Schritte:**
1. Eine Aufgabe im Fach **Geschichte**, **Geographie** oder einem anderen
   unterstützten Sachfach öffnen.
2. Eine Abgabe mit optionalem Ausgangstext und Erwartungshorizont korrigieren.
3. Feedback-DOCX und Notendetail öffnen.

**Erwartet:**
- Das Analyse-JSON enthält bei fachlicher Korrektur ein separates
  `sachfach_bewertung`-Objekt für Operator-Erfüllung, Inhaltsgenauigkeit,
  Fachbegriffe und Erwartungshorizont-Bezug.
- Sprachfehler stehen weiterhin separat und ersetzen keine Inhaltsbewertung.
- Die App-Note verwendet bei vorhandenem Sachfach-Objekt nur die fachlichen
  Kriterien; die verwendete Erwartungshorizont-Fassung bleibt in der Revision
  mit stabiler Fassung-ID nachvollziehbar.

---

## Szenario 17 — Sachfach-Timeline / Datierung

**Schritte:**
1. Im Fach **Geschichte** oder einem anderen Sachfach einen Block
   „Timeline / Datierung“ anlegen.
2. Mindestens zwei Ereigniskarten mit materialgebundenen Beschreibungen
   hinterlegen oder vom gewählten Modell erzeugen lassen.
3. Schüler- und Lösungs-Vorschau sowie den DOCX-Export öffnen.

**Erwartet:**
- Die Schülervorschau zeigt die Ereigniskarten ohne vorweggenommene Lösung.
- Die Lösung zeigt die chronologische Reihenfolge und nur die eingetragenen
  Datierungen.
- Die Prompt-Regel verbietet erfundene historische Datierungen; ein
  Korrekturraster fällt bei der Auswertung auf die geschlossene
  Richtig/Falsch-Bewertung zurück.

---

## Szenario 18 — Sachfach-Diagramm-/Datenanalyse

**Schritte:**
1. Im Fach **Geographie**, **Geschichte** oder einem anderen Sachfach einen
   Block „Diagramm-/Datenanalyse“ anlegen.
2. Mindestens zwei Datenpunkte und einen Operatorauftrag hinterlegen.
3. Schüler- und Lösungs-Vorschau sowie den DOCX-Export öffnen.

**Erwartet:**
- Die Datenpunkte sind sichtbar und von den Analyseaufträgen getrennt.
- Die Lösung enthält eine fachliche Erwartung und mindestens einen konkreten
  Datenbeleg je Auftrag.
- Zahlen, Einheiten und Ursachen werden nicht ergänzt, wenn sie im Material
  nicht belegt sind.

---

## Szenario 19 — Weitere Sprachfächer und Latein

**Schritte:**
1. Eine Klasse mit **Französisch**, **Spanisch**, **Italienisch** oder **Latein**
   und passender Schulstufe öffnen → Korrektur → Neue Analyse.
2. In Schritt 2 die Textsorten-Liste und das vorgeschlagene Raster prüfen.
3. Eine synthetische Abgabe analysieren und die fachbezogenen Prompt-Hinweise
   bzw. das gespeicherte Bewertungsraster kontrollieren.

**Erwartet:**
- Französisch, Spanisch und Italienisch zeigen jeweils eigene kuratierte
  Textsortenfamilien und kein deutsches SRDP-Menü.
- Latein zeigt text- und übersetzungsbezogene Aufgaben und keinen CEFR-Hinweis.
- Die Raster-Liste enthält das passende `sprachfach_*.md`-Grundraster; fremde
  Fachraster werden ausgeblendet.
- Die Fehler-Checkliste ist sprachspezifisch. Erklärungen bleiben auf Deutsch,
  Zitate und Korrekturen bleiben in der jeweiligen Zielsprache.
- Die Listen sind als kuratierte Arbeitsauswahl zu verstehen, nicht als
  amtliche Vollständigkeits- oder Prüfungsskala.

---

## Szenario 21 — Niveaugruppen vor der Folgeübung prüfen

**Schritte:**
1. In einer Klasse mit mindestens sechs Schüler/innen eine Aufgabe mit
   bestätigten Lehrkraftnoten öffnen.
2. In der Fehlerübersicht eine Niveaugruppe auswählen.
3. In der Vorschau die Zuordnung prüfen, eine Person umgruppieren und eine
   Person bei Bedarf auf „Keine“ setzen.
4. Ein Niveau auswählen und **Übung vorbereiten** wählen.

**Erwartet:**
- Unter sechs bestätigten Schüler/innen wird keine automatische Einteilung
  angeboten; ab sechs entstehen zwei und ab zwölf drei Gruppen.
- Die Vorschau zeigt die jeweils neueste bestätigte Lehrkraftnote pro Person.
- Die manuelle Zuordnung steuert die Gruppengröße und den lokalen Herkunftsdatensatz.
- An den Modellanbieter gehen Gruppenlabel und Schwierigkeitsstufe, keine
  Schülernamen oder internen Schüler-IDs.

---

## Szenario 20 — Digitale Selbstkontrolle ohne KI

**Schritte:**
1. Eine Unterlage mit vollständigem Antwortschlüssel für Multiple Choice,
   Lückentext oder Zuordnung erzeugen.
2. In Schritt 4 **Weitere Exporte & Werkzeuge → Digitale Selbstkontrolle**
   öffnen.
3. Antworten eingeben und **Antworten lokal prüfen** wählen.

**Erwartet:**
- Die Prüfung zeigt richtig, falsch oder unvollständig je Antwort.
- Die Prüfung erfolgt lokal gegen den gespeicherten Schlüssel; es gibt keinen
  KI-Aufruf und keinen Upload.
- Offene, materialgebundene oder unvollständige Aufgaben werden nicht
  heuristisch bewertet, sondern als nicht automatisch prüfbar ausgewiesen.

---

## Szenario 10 — Kompetenz-Modus mit Coverage

**Schritte:**
1. Sidebar → „Kompetenz-Übung".
2. Englisch · Oberstufe · Stoff-Item aus Katalog wählen.
3. Step4: Generieren.

**Erwartet:**
- Coverage-Panel zeigt abgedeckte und fehlende Deskriptoren.
- „Kompetenznachweis exportieren" erzeugt lesbares DOCX.

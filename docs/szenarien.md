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

---

## Szenario 22 — Fehlerliste und Schülertext verzahnen

**Schritte:**
1. Eine Abgabe mit vielen Fehlern analysieren (deutlich mehr als 20).
2. Einen Vorschlag in der Fehlerliste anklicken.
3. Eine Markierung im Schülertext anklicken.
4. Über „Reihenfolge" auf *Fehlerart*, dann *Unsicherheit zuerst*, dann wieder
   auf *Reihenfolge im Text* umschalten.
5. Über „Nur unsichere" filtern; danach einen Vorschlag ohne Textstelle suchen.
6. „Nr. im Text" aus- und wieder einschalten.

**Erwartet:**
- Klick auf eine Karte scrollt die zugehörige Markierung in den sichtbaren
  Bereich; sie bekommt einen dunklen Ring, alle übrigen Markierungen treten
  zurück. Klick auf eine Markierung hebt die Karte in der Liste hervor.
  Escape löst die Auswahl.
- Die Nummer auf der Karte steht als kleine Ziffer auch am Text. Beim
  Umsortieren wird neu durchnummeriert; „Reihenfolge im Text" vergibt die Nummern
  streng in Leserichtung.
- Fehlerarten-Reihenfolge ist Rechtschreibung → Grammatik → Zeichensetzung →
  Ausdruck (nicht alphabetisch), innerhalb einer Art folgt die Textreihenfolge.
- Nach „Nur unsichere" sind die Nummern lückenlos ab 1; der Zähler „(n von m)"
  zeigt die gefilterte Menge.
- Vorschläge, deren Zitat nicht im Text steht, stehen in der eigenen Gruppe
  „nicht im Schülertext auffindbar (n)" mit Symbol; ein Klick darauf zeigt den
  Hinweistext statt eines Sprungs. Sie verschwinden nie.
- Kommt eine Wendung mehrfach vor, ist sie an **allen** Fundstellen gestrichelt
  markiert — nie nur an der ersten.
- „Nr. im Text" blendet die Ziffern aus, ohne die Markierungen zu verlieren.
- Die Farbe im Text bleibt immer der Fehlertyp, auch wenn ein Vorschlag
  übernommen, geändert oder verworfen wurde.

## Szenario 23 - Unterrichtsplanung (Closed Loop Unterricht)

**Ausgangslage:** Eine Lehrkraft in Österreich hat für das Schuljahr 2026/27 ein
festes Wochenraster (4 Klassen, 18 Wochenstunden) und trägt es einmalig ein.
Für 2026/27 sind in ihrem Bundesland noch keine Ferien hinterlegt – die
amtlichen Termine liegen aber bereits in LUA.

1. Wochenraster eintragen: Montag 1b 08:00-08:45 Deutsch, Montag 3a
   08:00-08:45 Mathe usw. – alles mit Schuljahr 2026/27.
2. Klassenfarben setzen: 1b bekommt Ton 1, 3a Ton 2.
3. Ferien übernehmen: LUA schlägt die Ferienordnung des Bundeslandes vor,
   nennt Quelle und Abrufdatum, die Lehrkraft bestätigt und gleicht mit der
   Verordnung ab. Die Osterferien stehen dabei amtlich am 20.–29.03.2027, nicht
   zwei Wochen später.
4. Ein schulinterner Tag wird als Pause für die ganze Schule eingetragen.
5. „Woche einplanen" → 18 Stunden entstehen, alle mit Datum und Uhrzeit.
6. Einzelne Stunden: Thema eintragen, eine als „Entfällt" markieren, eine auf
   den Folgetag verschieben, eine Datei ablegen.
7. „Monat einplanen" → der ganze Monat ist gefüllt; Samstag und Sonntag sind
   als Wochenende gekennzeichnet.
8. „Schuljahr einplanen" → alle restlichen Wochen des Schuljahres, Ferien
   bleiben leer.
9. Auf der Startseite zeigt der Streifen die nächsten sieben Tage; ein Klick auf
   einen Tag öffnet die Planung bei genau diesem Tag.

**Erwartet:**
- Doppeltes Einplanen derselben Woche erzeugt **keine** Dublette; bereits
  geplante Stunden werden gemeldet statt erneut angelegt.
- Vor „Schuljahr einplanen" erscheint eine Rückfrage mit der Stundenzahl.
- Eine Stunde, die auf einen Feiertag fällt, wird mit „Ferien auslassen"
  **nicht** angelegt; ohne die Option wird sie angelegt.
- Entfallene Stunden bleiben sichtbar und tragen die Kennzeichnung
  „entfällt"; sie zählen nicht als Unterricht.
- Keine Stunde liegt in den amtlichen Ferien – auch nicht in den Osterferien,
  weil LUA sie nachschlägt statt zu rechnen.

## Szenario 24 - Ferienhinweis: Lücke, Warnung oder ehrliches Nichtwissen

**Ausgangslage:** Dieselbe Lehrkraft ist im Schuljahr 2030/31. Für dieses Jahr
gibt es noch keine veröffentlichte Verordnung.

1. Sie öffnet die Planung und sieht einen **neutralen Hinweis**, keinen gelben
   Alarm: Für ihr Bundesland liegen noch keine amtlichen Termine vor.
2. Der Vorschlagsknopf fehlt – es gibt nichts zu übernehmen.
3. Sie wechselt in einer zweiten Lehrkraft-Testumgebung das Profil-Bundesland
   auf eines, für das 2026/27 Termine vorliegen: Jetzt erscheint eine
   **deutliche Warnung** mit Knopf „N Blöcke übernehmen" und Quellenangabe.
4. Eine dritte Umgebung hat als Land die Schweiz: LUA sagt, dass es keine
   kantonalen Termine führt, und lässt die Ferien leer.
5. Deutschland ohne gewähltes Bundesland im Profil: Der Hinweis nennt
   ausdrücklich Deutschland und verweist auf die Profilauswahl.

**Erwartet:**
- Kein Fall erzeugt einen erfundenen Ferientag.
- Warnung und neutraler Hinweis sind unterscheidbar, beide nennen das
  Bundesland oder Land beim Namen.
- Für die Schweiz erscheint kein Vorschlag, der so tut, als gäbe es ihn.
- Verschobene Stunden behalten Zeit, Klasse und Unterlagen, nur das Datum
  ändert sich.
- Klassenfarben bleiben über Planung, Monatsraster und Startseite hinweg
  gleich, und keine zwei Klassen teilen sich einen Ton.
- Beim Wechsel auf das Folge-Schuljahr zeigt das Raster nur dessen Stunden;
  „Raster aus dem Vorjahr übernehmen" befüllt das neue Jahr additiv.
- Eine Rasterzeile **ohne Klasse** (Freistunde) bleibt im Raster stehen und wird
  nicht eingeplant; der Bericht nennt die Anzahl.

## Szenario 24 - Aus einem Termin eine Unterlage vorbereiten

**Ausgangslage:** Eine Stunde am 28.09. für 6b, Thema „Der Sturm auf den Barrikaden",
Status geplant, noch keine Unterlage. 6b hat in der Klassenverwaltung Fach „Deutsch".

1. Die Lehrkraft wählt die Stunde und klickt **„Unterlage vorbereiten"**.
2. LUA übernimmt Klasse, Fach, Schulstufe und Datum in den Assistenten und zeigt
   einen Hinweis: **zu welchem Termin** die Unterlage gehören wird.
3. Die Lehrkraft ergänzt Quelltext und Aufgaben, erzeugt und speichert.
4. Beim Speichern hängt LUA die Unterlage automatisch an den Termin.

**Erwartet:**
- Die Unterlage liegt in der Anlagenliste der Stunde mit dem Klammer-Symbol und
  zählt in der Statistik der Stunde mit.
- Sie steht in der Bibliothek und lässt sich normal öffnen und bearbeiten.
- Der Termin bleibt, wo er war; es wird **kein** zweiter Termin und **keine**
  zweite Stunde angelegt.
- **LUA erfindet keinen Quelltext.** Der Kalendereintrag hat keine Datei, also
  öffnet sich der Assistent zur leeren Quelltextseite – nicht zu erfundenem
  Material in der Sprache der Lehrkraft.
- Fehlt der Stunde ein Thema oder der Klasse ein Fach, geht dieselbe Stunde auf;
  der Assistent vermerkt im Notizfeld, was noch fehlt.
- Klickt die Lehrkraft vorher auf **„Verknüpfung abbrechen"**, wird die Unterlage
  beim Speichern **nicht** angehängt – sie landet nur in der Bibliothek.

**Der Fehlerfall, abgesichert:**
- `lua_klassen.fach` steht auf „Deutsch 6b" (freier Text). LUA nimmt das **nicht**
  als Fach an und trägt es als Lücke nach, statt eine Unterlage im falschen Fach
  vorzubereiten.

## Szenario 25 - Vertretung: eine einzelne Stunde anlegen

**Ausgangslage:** Die Lehrkraft übernimmt am 15.10. für 5b eine Stunde. 5b hat
keine Zeile im Wochenraster, weil 5b sonst nur alle zwei Wochen Unterricht hat.

1. Sie klickt **„Stunde hinzufügen"** und trägt 15.10., 5b, 08:00–08:45 und ein
   Thema ein.
2. LUA legt genau eine Stunde an und springt in die Woche vom 15.10.
3. Sie trägt noch eine Unterlage an – über den Weg aus Szenario 24.
4. Am 22.10. klickt sie auf „Woche einplanen".

**Erwartet:**
- Die Stunde steht am 15.10. im Wochen- und im Monatsbild und ist wie jede
  andere bearbeitbar.
- Sie kommt **nicht** aus dem Wochenraster und wird deshalb beim Einplanen am
  22.10. **nicht** ein zweites Mal erzeugt.
- Fehlt die Klasse, sagt LUA das und legt nichts an – eine Stunde ohne Klasse
  wäre in der Anlage nicht zuzuordnen.
- Das Datum außerhalb des gerade betrachteten Monats ist kein Problem: LUA
  wechselt selbst in die richtige Woche.

---

## Szenario 26 - Suche: Inhalt, Befehl und Navigation in einem Feld

**Ausgangslage:** Die Lehrkraft hat 30 Unterlagen gespeichert, ein volles
Startpaket im Pool und zwei Klassen. Sie tippt `goethe` in die Palette.

1. Sie drückt <kbd>Strg</kbd>+<kbd>K</kbd> und tippt `goethe`.
2. Sie sieht Treffer unter **Unterlagen**, aber auch unter **Gehe zu …**.
3. Sie setzt statt eines Treffers `thema: Goethe` und drückt <kbd>Enter</kbd>.
4. Sie probiert `planung` und wählt **Unterrichtsplanung** per <kbd>↓</kbd> und
   <kbd>Enter</kbd>.
5. Sie wiederholt Schritt 4, obwohl im Assistenten noch ungespeicherte Blöcke
   liegen.
6. Sie tippt `vorlage speichern als Klassenarbeit 7b` und <kbd>Enter</kbd>.

**Erwartet:**
- Zu 1.: Die 30 Unterlagen-Treffer füllen die Liste **nicht** allein. Pool,
  Klassen und Navigation bleiben sichtbar, weil es dort auch Treffer gibt.
- Zu 2.: Unterlagen stehen **gruppiert**; ein Anführungszeichen-Treffer steht vor
  einem Nur-Teilwort-Treffer, ein Titeltreffer vor einem Metadaten-Treffer.
- Zu 3.: Das Thema steht in den Metadaten. Eine Befehlszeile **„Thema: &lt;Text&gt;"**
  erscheint dabei **nicht**, solange die Eingabe kein Thema enthält — sie wäre sonst
  sichtbar, aber nicht ausführbar. Nach `thema: ` erscheint sie und setzt beim
  Drücken von <kbd>Enter</kbd> das Thema.
- Zu 4.: Die Planung öffnet sich. Der Sprung aus der Palette verliert **keine**
  ungespeicherte Arbeit, ohne vorher nachzufragen.
- Zu 5.: LUKA fragt nach, ob der aktuelle Stand verworfen werden soll. Antwortet
  sie mit „Abbrechen", bleibt sie im Assistenten — die geschlossene Palette
  ändert daran nichts.
- Zu 6.: Die Vorlage liegt in der Datenbank und ist unter **Vorlagen** wiederzufinden.
  Ein Neustart ändert daran nichts.

---

## Szenario 27 - Hilfe: der Einstiegspfad führt zum ersten Export

**Ausgangslage:** Eine neue Lehrkraft startet LUKA zum ersten Mal.

1. Sie klickt unten in der Seitenleiste auf **Hilfe**.
2. Sie liest „So funktioniert LUKA" und folgt dem Fünf-Minuten-Weg.
3. Sie springt über das Inhaltsverzeichnis nach **Unterricht vorbereiten** →
   **Unterrichtsplanung**.
4. Sie prüft dort, ob ihre Schulferien für ihr Bundesland dabei sind.
5. Sie sucht im Abschnitt **Fächer** ihr Fach, und im Abschnitt **Aufgabentypen**
   den Typ, den sie im Baukasten wählt.
6. Sie schlägt im Abschnitt **Tastenkürzel** nach, wie sie rückgängig macht.

**Erwartet:**
- Zu 1.: Die Hilfe ist in **sechs Kapitel** gegliedert, nicht in einer flachen
  Liste. Das Inhaltsverzeichnis zeigt die Kapitel mit ihren Abschnitten.
- Zu 3.: Die Planung ist beschrieben — Wochenraster, Einplanen, Vertretungsstunde,
  Ferien und Pausen, Unterlagen an die Stunde hängen, Klassenfarben.
- Zu 4.: Steht ihr Bundesland nicht im Profil, sagt die Hilfe das ausdrücklich —
  und dass LUKA dann keine Ferien zuordnen kann.
- Zu 5.: **Jedes** Fach und **jeder** im Baukasten wählbare Aufgabentyp steht da.
  Diese Listen werden aus den Listen der App erzeugt, nicht abgeschrieben.
- Zu 6.: Der Abschnitt sagt, **wo** ein Kürzel gilt: Rückgängig gilt im Assistenten,
  Zoom überall, und der Tafel-Modus hat eigene Tasten. Auf einem Apple-Gerät steht
  ⌘, sonst Strg.

---

## Szenario 28 - Hilfe und App wachsen gemeinsam

**Nicht als Nutzererlebnis, sondern als Prüfregel für jede neue Funktion.**

1. Jemand legt in `packages/schema` ein neues Pflichtfach an.
2. Jemand ergänzt in `lib/constants.ts` einen neuen Aufgabentyp.
3. Jemand fügt in `lib/shortcuts.ts` ein Tastenkürzel hinzu.
4. Jemand ergänzt in `lib/navigation.ts` ein neues Navigationsziel.

**Erwartet:**
- Ohne Änderung an der Hilfe schlagen die Tests in
  `apps/web/src/views/helpSections.test.tsx` fehl und benennen, **was** fehlt:
  ein Fach, ein Aufgabentyp, ein Kürzel oder ein unerklärtes Navigationsziel.
- Ein neuer Aufgabentyp ohne `gruppe` fällt ebenfalls durch — die Liste wird
  nicht unvollständig, sondern gar nicht erst gerendert.
- Ein Kürzel ohne bekannten Geltungsbereich wird abgelehnt.

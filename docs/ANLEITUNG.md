# LUKA – Anleitung

LUKA vereint zwei Lehrer-Werkzeuge in **einer** App mit **gemeinsamer Datenbank**:

- **Unterlagen-Generator** – erzeugt Arbeitsblätter, Übungen und Schularbeiten mit KI und exportiert sauber formatierte DOCX (Schülerfassung, Lösung, Korrekturraster).
- **Korrektur-Assistent** – analysiert Schülerabgaben anhand von Rubriken, erzeugt Notenempfehlung, Fehler-Heatmaps und Lern-Längsschnitte.

Der eigentliche Mehrwert ist die **Verbindung** beider Seiten: Aus den Korrekturen weiß die App, **woran** eine Klasse oder einzelne Schüler:innen scheitern – und erstellt mit einem Klick **passgenaue Übungsblätter** dazu.

---

## Überblick & Closed Loop

LUKA verbindet zwei Lehrer-Werkzeuge zu **einem** durchgängigen Kreislauf: Unterlagen **erstellen**, Schülerabgaben **korrigieren** und daraus gezielt **üben** lassen – alles in einer App, mit gemeinsamer Datenbank.

Der Ablauf im Überblick: **Unterlagen erstellen → Abgaben korrigieren → Fehler-Heatmap → gezieltes Übungsblatt ↺**

Der Clou: Nach der Korrektur kennt die App die häufigsten Fehler einer Klasse oder eines einzelnen Schülers – und erzeugt mit einem Klick ein passendes Übungsblatt dazu.

> 💡 Wenn du neu bist, lies **Erste Schritte** und spiele danach den Closed Loop einmal komplett durch – das dauert keine 5 Minuten.

---

## Erste Schritte

Damit die KI-Funktionen (Generieren, Korrigieren) laufen, brauchst du einen API-Schlüssel deines KI-Anbieters.

1. Öffne **Einstellungen** und trage deinen API-Schlüssel ein (z. B. Anthropic, OpenAI, Mistral, DeepSeek). Schlüssel werden sicher im Schlüsselspeicher des Betriebssystems abgelegt – nicht im Klartext.
2. Wähle Standard-Anbieter und -Modell. Für günstige Tests eignet sich ein kleines Modell.
3. Zum gefahrlosen Ausprobieren ohne echte Schülerdaten: Testdaten laden (siehe **Onboarding** im README / Beispiel-Abgaben im Ordner `samples/`).
4. Lade in **Korrektur** eine erste Abgabe hoch und starte die Analyse.

> 💡 Ohne hinterlegten Schlüssel schlagen Analyse/Generierung fehl. Die Fehlermeldung nennt dann meist „Key/Provider prüfen".

**Kein-Key-Hinweis:** Wählst du in Schritt „KI-Modell" einen Anbieter, für den noch kein Schlüssel hinterlegt ist, zeigt die App dort einen Hinweis mit Direkt-Link zu den Einstellungen — so scheiterst du nicht erst beim Generieren.

---

## Fächer

LUKA unterstützt alle textbasierten AHS-Fächer in einer Codebase:

- **Sprachfächer:** Deutsch, Englisch, Französisch, Spanisch, Italienisch, Latein.
  - Inhalte werden in der Zielsprache erzeugt.
  - Für lebende Fremdsprachen fließen CEFR-Niveaus (A2–B2) ein.
  - Latein wird als Sprachfach behandelt, aber ohne CEFR-Bezug.
- **Sachfächer:** Geschichte, Geographie, Religion, Ethik, Psychologie, Philosophie.
  - Inhalte werden deutschsprachig erzeugt.
  - Textsorten und Bewertungskataloge orientieren sich vorerst am Deutsch-Modell.

Du wählst das Fach in Schritt **Absicht** oder im **Kompetenz-Modus**. Daraufhin passt LUKA automatisch Sprache, verfügbare Blocktypen und didaktische Hinweise an.

> 💡 Sachfächer sind in v1 mit den deutschsprachigen Katalogen nutzbar. Fachspezifische Kompetenzkataloge (z. B. Geschichts-Quellenanalyse) folgen in späteren Updates.

---

## Unterlagen erstellen

Der Generator führt dich in fünf Schritten von der Absicht zum fertigen DOCX.

1. **Absicht** – Schulstufe, Fach, Thema und Art der Unterlage festlegen. Notizen fließen als Wünsche in die Generierung ein.
2. **Quelltexte** – Textgrundlage per Direkteingabe, Datei (TXT/DOCX/PDF/HTML) oder URL hinzufügen.
3. **Aufgabenblöcke** – gewünschte Aufgabentypen zusammenstellen, Punkte und Arbeitsanweisungen festlegen. Beispieldaten sind grau und werden beim Generieren ersetzt.
4. **KI-Modell** – Anbieter, Modell und Kreativitätsgrad (präzise bis kreativ) wählen.
5. **Generieren** – Inhalte erzeugen und Schülerfassung, Lösung und optional das Korrekturraster als DOCX exportieren. Jeder Export landet im Verlauf.

**Bewertung (Punkte an/aus):** In Schritt „Absicht" legst du fest, ob die Unterlage Punkte trägt. Schulübungen sind standardmäßig *ohne* Punkte; mit dem Schalter „Punkte vergeben / Ohne Punkte" überschreibst du das pro Dokument. „Ohne Punkte" blendet Punktespalte und Gesamtpunkte überall aus – in Vorschau *und* Export gleich.

**Einzelne Aufgabe neu generieren:** In der Vorschau bei einem Block auf „Neu generieren" – mit optionalem Hinweis (kürzer, schwieriger, andere Formulierung). Nur dieser Block wird ersetzt.

**Export-Varianten:** „Beide Dokumente" (Schülerfassung + Lösung), „Korrekturraster", im Kompetenz-Modus zusätzlich „Kompetenznachweis", sowie „Als PDF". Vor dem Export prüft ein **Quality-Gate** Lernziel-Abdeckung und Wortzahl der Schreibaufgaben – bei Auffälligkeiten kannst du „Nochmal prüfen" oder „Trotzdem exportieren".

**Differenzierung (leichter / schwerer):** Im Akkordeon „Differenzierung" (nach dem Generieren) erzeugst du zusätzlich zur Standardfassung (mittel = „Beide Dokumente") gezielt eine *leichtere* und/oder *schwerere* Variante: Häkchen setzen, dann „Variante(n) erstellen & exportieren". *Leicht* vereinfacht offene Aufgaben ohne KI-Kosten; *schwer* generiert die offenen Aufgaben anspruchsvoller neu. Dateinamen tragen `_leicht`/`_schwer`.

**Manuell oder Hybrid festlegen:** Bei Kreuzworträtsel, Wortgitter, Vokabelübung, Fehlerkorrektur und „Wörter ordnen" kannst du im Block-Editor auf „Selbst festlegen" umschalten. Gib eigene Wörter, Sätze oder Vokabeln ein — die KI übernimmt sie wortgleich und ergänzt nur noch fehlende Einträge, bis die gewünschte Anzahl erreicht ist. So bleibst du Herrin/Herr der Inhalte, sparst aber trotzdem Zeit.

**Schnell ohne Quelltext:** Für kleine Übungen mit eigenen Inhalten brauchst du keine Textgrundlage. Wähle im Dashboard oder in Schritt „Absicht" einen der Schnellstarts (z. B. „Kreuzworträtsel", „Vokabeltest", „Fehlerkorrektur", „Lückentext"). Der Assistent springt direkt in den Baukasten; Quelltexte kannst du überspringen.

**Selbsteinschätzungsbogen:** Nach dem Generieren kannst du einen zusätzlichen Bogen exportieren, mit dem Schülerinnen und Schüler einschätzen, wie sicher sie sich bei den einzelnen Aufgaben fühlen. Er eignet sich besonders für differenzierte Rückmeldung und Selbstregulation.

> 💡 Einen ganzen Blocktyp wieder entfernen: im Baukasten oben rechts am Block auf das **X** klicken. Mehr Zuordnungs-Paare/MC-Antworten: im Block-Editor auf „+ Item" / „+ Option" / „+ Frage".

---

## Übung ohne Quelltext (Kompetenz)

Die zweite Tür auf der Startseite – **„Ohne Quelltext"** – erzeugt Übungen *ohne* eigene Textgrundlage. Statt eines Quelltexts gibst du vor, **woran** geübt werden soll:

1. **Freies Thema / Kompetenz** – z. B. „Present Perfect vs. Past Simple" oder „Kommasetzung bei Relativsätzen" frei eintippen.
2. **Oder Lehrplan-Kompetenz** aus dem Katalog (Deutsch/Englisch, Unter-/Oberstufe) wählen – dann entsteht zusätzlich ein **Kompetenznachweis** beim Export.
3. Aufgabentypen wählen, optional Punkte an/aus, generieren – wie beim Quelltext-Pfad, nur dass die KI die Inhalte stufengerecht selbst erfindet.

> 💡 Faustregel: **Aus Quelltext** = Schularbeit/Test zu einem konkreten Text. **Ohne Quelltext** = schnelle Grammatik-/Kompetenz-Übung.

---

## Rollenspiel

Der Blocktyp **Rollenspiel** erzeugt kommunikative Sprechsituationen für den Mündlich-Unterricht:

- **Situation + Setting + Ziel** definieren, worum es geht (z. B. „Im Restaurant“, „Einen Tisch reservieren“).
- **Rollenkarten** werden im DOCX als gerahmte Ausschneide-Karten dargestellt — pro Rolle eine Karte mit Beschreibung, Aufgabe und passenden Redemitteln.
- **Gemeinsame Redemittel** stehen allen Rollen zur Verfügung; **rollenspezifische Redemittel** unterstützen die einzelne Rolle.
- **Zeitvorgabe** (3–8 Minuten) hilft beim Unterrichtsablauf.
- **Bewertungs-Checkliste** ermöglicht Selbst- oder Partner-Feedback.
- **Lösung** zeigt einen Musterdialog und Hinweise für die Lehrkraft.

### Best Practices für den täglichen Einsatz

1. **Klares kommunikatives Ziel wählen** — das Gespräch sollte auf ein konkretes Ergebnis hinauslaufen (z. B. „einen Termin vereinbaren", „eine Reklamation durchziehen").
2. **2 Rollen = Paararbeit, 3–4 Rollen = Gruppenarbeit** — je nach Klassengröße und Zeit.
3. **Redemittel als Scaffolding** — bei schwächeren Klassen mehr Satzbausteine vorgeben; bei stärkeren Klassen die Redemittel reduzieren oder ganz weglassen.
4. **Authentische Alltagssituationen** — Restaurant, Arzt, Bewerbungsgespräch, Beschwerde, Reisebüro, Schließfach verloren.
5. **Hybrid-Modus nutzen** — die Lehrkraft kann Situation, Rollen oder Redemittel selbst vorgeben; die KI ergänzt fehlende Teile stufengerecht.

### Beispiel

- **Situation:** Im Restaurant
- **Setting:** Du gehst mit deiner Familie essen.
- **Ziel:** Einen Tisch für vier Personen reservieren und bestellen.
- **Rollen:** Gast (bestellt für die Gruppe) und Kellner (nimmt Bestellung auf).
- **Redemittel:** „Ich hätte gerne …", „Könnten Sie mir bitte …?", „Was kostet …?"

> 💡 Leichte Variante: Viele Redemittel vorgeben. Schwere Variante: Redemittel reduzieren oder weglassen.

---

## Aufgabentypen

Diese Blocktypen kannst du im Baukasten kombinieren (je nach Fach/Stufe sinnvoll vorausgewählt):

1. **Geschlossen:** Multiple Choice, Matching (Zuordnung), Lückentext (mit/ohne Wortbank), Kategorisierung, Wörter ordnen, Kreuzworträtsel, Wortgitter, Vokabelübung.
2. **Offen:** Verständnisfrage, Schreibaufgabe, Markieraufgabe, Stilübung, Songanalyse.
3. **Sprachrichtigkeit:** Fehlerkorrektur.
4. **Sprechhandlung:** Rollenspiel — kommunikative Situationen mit Rollenkarten, gemeinsamen und rollenspezifischen Redemitteln, Zeitvorgabe und Bewertungs-Checkliste. Ideal für authentisches Sprechen im Paar oder in der Gruppe.

Die **Schwierigkeit** (leicht/mittel/schwer) steuert das kognitive Niveau *innerhalb* des Typs (Bloom; bei Englisch zusätzlich CEFR A2/B1/B2) – der Typ selbst bleibt erhalten.

> 💡 Ein Matching-Block = eine Aufgabe mit *mehreren* Paaren. Für mehr Paare „+ Item"/„+ Option" nutzen, nicht mehrere Matching-Blöcke anlegen.

---

## Dokumente, Vorlagen & Verlauf

Erstellte Unterlagen und Konfigurationen verwaltest du über die Seitenleiste:

1. **Speichern** (Kopf oben) sichert die aktuelle Unterlage unter **Meine Unterlagen**.
2. **Vorlagen** – gespeicherte Baukasten-Konfigurationen, die du als Startpunkt für neue Unterlagen lädst.
3. **Verlauf** – jede Generierung/jeder Export wird protokolliert.
4. **Favoriten** – häufig genutzte Dokumente markieren; **Papierkorb** – Gelöschtes wiederherstellen.

> 💡 Datensicherung: in **Einstellungen → Datenbank → „Datensicherung exportieren"** schreibst du eine Kopie der gesamten lokalen Datenbank an einen Ort deiner Wahl.

---

## Korrigieren (NATASCHA)

Im Bereich **Korrektur** analysiert die KI Schülerabgaben anhand einer Rubrik: Kriterien-Bewertung, Notenempfehlung und einzelne Fehler – farbcodiert nach **R**echtschreibung, **G**rammatik, **Z**eichensetzung und **A**usdruck.

1. Klasse und Aufgabe links wählen, dann „Neue Analyse" und eine Datei (DOCX/PDF/TXT) hochladen.
2. Nach der Analyse zeigt die Detailansicht links die Bewertung (Note, Kriterien, Fehlerliste) und rechts den **markierten Schülertext** als A4-Vorschau.
3. Eigene **Lehrernote** und einen Kommentar erfassen und speichern – die App vergleicht deine Note später mit der KI-Note (Kalibrierung).
4. Mit „Feedback-DOCX" ein Rückmelde-Dokument für die Schülerin/den Schüler erzeugen.

**Batch-Korrektur:** Im Analyse-Dialog „Mehrere wählen …" → ganze Klasse auf einmal. Ein Fortschrittsbalken zeigt den Lauf; „Abbrechen" stoppt nach der laufenden Datei. Duplikate werden übersprungen, nicht abgebrochen.

**Retro-Import:** Bereits außerhalb der App korrigierte Abgaben (vorhandene Analyse-JSONs) holst du über „Retro-Import" im Abgaben-Kopf nachträglich in die Datenbank.

> 💡 Über den Schülernamen in der Detailansicht springst du direkt zum Längsschnitt dieses Schülers.

---

## Klassen-Auswertung

Der Bereich **Meine Klassen** verdichtet alle Korrekturen einer Klasse zu Auswertungen:

1. **Fehler-Heatmap** – welche Fehlerarten dominieren.
2. **Notenverteilung** und **Trend** über mehrere Aufgaben.
3. **Kalibrierung** – wie stark KI-Note und Lehrernote auseinanderliegen.
4. **KI-Klassen-Briefing** – eine generierte Zusammenfassung mit Handlungsempfehlungen.

**Closed Loop:** „Übungsblatt zu Top-Fehlern generieren" springt direkt in den Generator – die häufigsten Fehlerschwerpunkte der Klasse sind bereits als Fokus vorbefüllt.

> 💡 Du kannst die Noten einer Klasse als CSV exportieren (z. B. fürs Notenbuch).

---

## Schüler-Längsschnitt

Im Bereich **Schüler** verfolgst du die Entwicklung einzelner Lernender über mehrere Aufgaben.

1. Klasse und Schüler wählen → Notenverlauf, Trend (K1/K3), Fehlerschwerpunkte und Kalibrierung.
2. **KI-Schüler-Profil** generieren – eine individuelle Einschätzung auf Basis des Längsschnitts.
3. **Closed Loop pro Schüler:** „Übungsblatt zu Schwächen" erzeugt ein Arbeitsblatt, das auf die persönlichen Fehlerschwerpunkte zugeschnitten ist.
4. **CSV-Import:** mehrere Schüler auf einmal anlegen – eine Zeile pro Person (Vorname, Nachname).

---

## Erwartungshorizont & Rubrik-Editor

Ein **Erwartungshorizont** ist eine KI-generierte Musterlösung für eine Aufgabe. Generieren, im Textfeld bearbeiten und „Akzeptieren & speichern" – danach nutzt die Korrektur dieser Aufgabe ihn automatisch als Maßstab.

Im **Rubrik-Editor** (gleiche Ansicht) bearbeitest du die Bewertungsraster direkt: Rubrik wählen, Markdown anpassen, speichern. Änderungen wirken bei der nächsten Korrektur mit dieser Rubrik.

> 💡 So steuerst du die Bewertung gezielt – z. B. strengere oder fachspezifische Kriterien.

---

## Übersicht (Dashboard)

Die **Übersicht** ist deine Startseite: Anzahl Klassen und Abgaben, Klassen mit **Handlungsbedarf** (schwacher Notenschnitt) und pro Klasse eine Karte mit Notenschnitt, letzter Aktivität und Lehrer-Feedback-Quote. Ein Klick führt in die Klassen-Ansicht.

---

## Tastenkürzel

| Tastenkürzel | Wirkung |
| --- | --- |
| Strg / Cmd + K | Befehlspalette öffnen oder schließen |
| Esc | Befehlspalette / Dialog schließen |
| Enter | In Eingabefeldern: Aktion bestätigen (z. B. Schüler hinzufügen) |

---

## Datenschutz

**Wichtig:** Bei Korrektur, Erwartungshorizont und Schüler-Profil wird der jeweilige **Text an den gewählten KI-Anbieter übertragen** (z. B. Anthropic, OpenAI, DeepSeek). Verwende daher möglichst **pseudonymisierte** Abgaben – keine vollen Klarnamen in den Dokumenten.

Alles andere bleibt **lokal**: Datenbank und Exporte liegen auf deinem Rechner und sind nicht in der Cloud. Details im Dokument `docs/DATENSCHUTZ.md`.

---

## Bekannte Einschränkungen & Hilfe

1. **„Analyse fehlgeschlagen"** → API-Schlüssel und Anbieter in den Einstellungen prüfen; ggf. anderes Modell wählen.
2. **Erzeugtes DOCX öffnet sich nicht automatisch** (in der Entwicklungs-/WSL-Umgebung bekannt) → Datei manuell im Ausgabeordner öffnen.
3. **Selten unvollständige KI-Antwort** bei sehr günstigen Modellen (z. B. abgeschnittenes JSON) → Analyse erneut starten oder hochwertigeres Modell wählen.
4. **Daten nach Neustart weg?** Sollte nicht passieren – falls doch, bitte als Fehler melden (siehe README / Testplan).

> 💡 Speicherfehler werden seit Kurzem als Hinweis (Toast) unten rechts angezeigt – wenn so einer auftaucht, bitte mit Screenshot melden.

---

Mehr Details im Repo: `docs/TESTPLAN.md` und `README.md`.

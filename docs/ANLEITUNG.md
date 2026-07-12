# LUKA – Anleitung

LUKA ist ein **Unterlagen-Generator** für Lehrkräfte: Er erzeugt Arbeitsblätter, Übungen und Schularbeiten mit KI und exportiert sauber formatierte DOCX (Schülerfassung, Lösung, Korrekturraster zum Selbst-Korrigieren).

Alles läuft **lokal auf deinem Rechner** mit deinem eigenen API-Schlüssel — keine Accounts, kein Server, keine Cloud-Datenbank.

---

## Überblick

Der Ablauf im Überblick: **Absicht festlegen → Quelltext (optional) → Aufgaben zusammenstellen → generieren → DOCX exportieren.**

Dazu kommen der **Aufgaben-Pool** (bewährte Aufgaben speichern, wiederverwenden und als Fachpaket mit Kolleg:innen teilen) sowie **Vorlagen**, **Verlauf** und **Favoriten** für die Organisation.

> 💡 Wenn du neu bist, lies **Erste Schritte** und erstelle danach eine erste Schnell-Übung – das dauert keine 5 Minuten.
>
> **Ausblick:** Ein integrierter Korrektur-Assistent (Schülerabgaben analysieren, Fehler-Heatmaps, Längsschnitte) ist in Entwicklung, aber **in dieser Version noch nicht enthalten**.

---

## Installation

### Windows

Neueste `LUKA.-.Lehrunterlagen-Tool_*_x64-setup.exe` von den
[Releases](https://github.com/milanradisavljevic/LUKA/releases/latest) laden und
ausführen. Windows warnt dabei per **SmartScreen**, weil das Programm (noch)
nicht mit einem teuren Zertifikat signiert ist — über **„Weitere
Informationen" → „Trotzdem ausführen"** geht es weiter. Das ist bei
quelloffener Software ohne Firmen-Zertifikat normal.

### macOS

Neueste `LUKA.-.Lehrunterlagen-Tool_*_universal.dmg` von den
[Releases](https://github.com/milanradisavljevic/LUKA/releases/latest) laden,
öffnen und LUKA in **Programme** ziehen.

Auch hier ist die App (noch) nicht mit einem Apple-Entwicklerzertifikat
signiert: Beim ersten Öffnen meldet **Gatekeeper** „App ist beschädigt" oder
„kann nicht überprüft werden". Kein Grund zur Sorge — nur kein
kostenpflichtiges Apple-Zertifikat. Seit macOS 15 fehlt der frühere
Rechtsklick-„Öffnen"-Trick, deshalb so:

1. App einmal ganz normal per Doppelklick öffnen und die Warnung wegklicken.
2. **Systemeinstellungen → Datenschutz & Sicherheit** öffnen, nach unten
   scrollen, **„Dennoch öffnen"** anklicken.
3. Noch einmal öffnen und bestätigen — danach startet LUKA wie gewohnt.

---

## Erste Schritte

Damit das Generieren läuft, brauchst du einen API-Schlüssel deines KI-Anbieters. Beim ersten Start führt dich die App durch die Einrichtung inklusive Verbindungstest.

1. Beim **ersten Start** wählst du einen Anbieter (empfohlen: Mistral, EU-Anbieter), trägst deinen API-Schlüssel ein und testest die Verbindung direkt im Dialog. Schlüssel werden sicher im Schlüsselspeicher des Betriebssystems abgelegt – nicht im Klartext.
2. Später änderst du Anbieter und Standard-Modell jederzeit in den **Einstellungen**. Für günstige Tests eignet sich ein kleines Modell.
3. Zum schnellen Loslegen mit fertigen Aufgaben: eines der vier mitgelieferten **Fachpakete** (Ordner `samples/fachpakete/`) über **Aufgaben-Pool → Importieren** einspielen. Verfügbar sind das Startpaket **Medien und Demokratie / Informatik und KI**, **Medien und Demokratie**, **Informatik und KI** sowie **Deutsch – Textsorten-Training Oberstufe**.

> 💡 Ohne hinterlegten Schlüssel schlägt die Generierung fehl. Die Fehlermeldung nennt dann meist „Key/Provider prüfen".

**Kein-Key-Hinweis:** Wählst du in Schritt „KI-Modell" einen Anbieter, für den noch kein Schlüssel hinterlegt ist, zeigt die App dort einen Hinweis mit Direkt-Link zu den Einstellungen — so scheiterst du nicht erst beim Generieren.

---

## Fächer

LUKA unterstützt alle textbasierten AHS-Fächer in einer Codebase:

- **Sprachfächer:** Deutsch, Englisch, Französisch, Spanisch, Italienisch, Latein.
  - Inhalte werden in der Zielsprache erzeugt.
  - Für lebende Fremdsprachen fließen CEFR-Niveaus (A2–B2) ein.
  - Latein wird als Sprachfach behandelt, aber ohne CEFR-Bezug.
- **Sachfächer:** Geschichte, Geographie, Religion, Ethik, Psychologie, Philosophie, Medien und Demokratie, Informatik und Künstliche Intelligenz.
  - Inhalte werden deutschsprachig erzeugt.
  - Textsorten und Bewertungskataloge orientieren sich vorerst am Deutsch-Modell.

Du wählst das Fach in Schritt **Absicht** oder im **Kompetenz-Modus**. Daraufhin passt LUKA automatisch Sprache, verfügbare Blocktypen und didaktische Hinweise an.

> 💡 Sachfächer sind in v1 mit den deutschsprachigen Katalogen nutzbar. Fachspezifische Kompetenzkataloge (z. B. Geschichts-Quellenanalyse) folgen in späteren Updates.

---

## Unterlagen erstellen

Der Generator führt dich in fünf Schritten von der Absicht zum fertigen DOCX.

1. **Absicht** – Schulstufe, Fach, Thema und Art der Unterlage festlegen (Schulübung, **Matura (SRDP)** oder Kompetenz-Übung). Notizen fließen als Wünsche in die Generierung ein.
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

## Matura-Training (SRDP-Format)

Das **Matura-Training (SRDP-Format)** ist ein eigener Unterlagentyp für **Deutsch in der Oberstufe**. Die Auswahl erscheint im Schritt **Absicht** nur, wenn Deutsch und eine Oberstufen-Schulstufe gewählt sind.

1. **Matura-Training auswählen:** Im Schritt „Absicht" die Kachel **„Matura-Training (SRDP-Format)"** wählen.
2. **Textsorte festlegen:** Eine Textsorte aus der kuratierten SRDP-Auswahl wählen.
3. **Aufgabe erzeugen:** LUKA erstellt genau eine textgebundene Schreibaufgabe mit genau einer Textbeilage und einem Umfang von **405–495 Wörtern**.
4. **Exportieren:** Neben Schülerfassung und Lösung wird das bestehende **K1/K3-Korrekturraster** exportiert. Der Erwartungshorizont strukturiert die vier SRDP-Dimensionen und die zugehörigen Kriterien.

> ⚠️ Das Matura-Training ist ein Übungsformat für den Unterricht und **kein amtliches Prüfungsmaterial**.

---

## Aufgaben-Pool

Der **Aufgaben-Pool** sammelt wiederverwendbare Aufgaben-Blöcke — einmal gespeichert, beliebig oft wieder eingefügt.

1. In der **Vorschau** (Schritt Erstellen) bei einem Block auf **„In Pool speichern"** — der Block wird mit Fach, Stufe, Thema und Tags abgelegt.
2. In der Ansicht **Aufgaben-Pool** (Seitenleiste) suchst du nach Thema, Tags oder Typ und filterst nach Fach, Stufe, Aufgabentyp, Herkunft und Qualitätsstatus. Du kannst nach **„Neueste zuerst"**, **„Zuletzt verwendet"** oder **„Empfohlen zuerst"** sortieren.
3. Jede Aufgabe lässt sich mit dem Stern als **Favorit** markieren. Der lokale Qualitätsstatus kann **Unbewertet**, **Getestet**, **Empfohlen** oder **Zurückgestellt** sein. Kuratierte Fachpaket-Aufgaben tragen das Badge **„Kuratiert"** und zeigen ihren Herkunftsvermerk.
4. Im **Baukasten** fügst du einen Pool-Eintrag über **„Aus Pool einfügen"** direkt als neuen Block ein — die Aufgabe inkl. Konfiguration und Lösung landet im aktuellen Dokument und wird als zuletzt verwendet gespeichert.
5. **Fachpakete teilen:** Über **„Exportieren"** speicherst du den gesamten lokalen Pool als teilbare JSON-Datei. Favoriten, Qualitätsstatus und letzte Verwendung bleiben lokal und werden nicht exportiert.
6. **Fachpaket importieren:** Über **„Importieren"** wählst du eine JSON-Datei. LUKA validiert sie vollständig, bevor sie den lokalen Pool verändert. Die Vorschau zeigt Anzahl, Fächer, Herkunftsvermerke und Duplikate. Bei gleichen IDs entscheidest du zwischen **„Ersetzen"** und **„Behalten"**. Nach dem Import meldet die App neue, ersetzte und übersprungene Aufgaben; eine ungültige Datei wird abgelehnt und verändert den Pool nicht.

> 💡 Der Pool ist pro Rechner lokal. Beim Ersetzen eines Duplikats bleiben deine lokalen Organisationsdaten erhalten — ideal, um kuratierte Inhalte zu übernehmen und eigene Bewertungen weiterzuführen. Vier kuratierte Pakete liegen in `samples/fachpakete/`: das Startpaket **Medien und Demokratie / Informatik und KI**, **Medien und Demokratie**, **Informatik und KI** sowie **Deutsch – Textsorten-Training Oberstufe**.

---

## Export & Dateien

Beim Export entstehen pro Unterlage mehrere Dateien — wohin sie landen, stellst du in den **Einstellungen → Export** ein.

1. **DOCX-Zielordner:** In den Einstellungen legst du einen Ordner fest, in den alle DOCX geschrieben werden. Alternativ aktivierst du **„Speichern unter…"**, um bei jedem Export den Ort einzeln zu wählen. Ohne Tauri (Browser) landen die Dateien im Download-Ordner.
2. **Beide Dokumente** (Schülerfassung + Lösung) sowie **Korrekturraster** als DOCX; im Kompetenz-Modus zusätzlich der **Kompetenznachweis**; optional **PDF** (braucht LibreOffice).
3. **Moodle/GIFT-Export:** In Schritt Erstellen unter „Weitere Exporte" erzeugst du eine `.gift`-Datei zum Import in Moodle. Geschlossene Aufgaben (Multiple Choice, Matching, Lückentext …) werden zu Quizfragen, offene (Schreibaufgabe, Verständnisfrage) zu Essay-Fragen.
4. Zusätzlich: **Übung mit Lösungsteil** (Schüler- und Lösungsteil in einem Dokument) und **Selbsteinschätzungsbogen** für die Schüler/innen.

> 💡 Vor dem DOCX-Export läuft ein **Quality-Gate** (Lernziel-Abdeckung, Wortzahl Schreibaufgabe) — nur Hinweise, kein Zwang. Jeder Export wird im **Verlauf** protokolliert.

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
4. **Sprechhandlung:** Rollenspiel — kommunikative Situationen mit Rollenkarten, gemeinsamen und rollenspezifischen Redemitteln, Zeitvorgabe und Bewertungs-Checkliste. Ideal für authentisches Sprechen im Paar oder in der Gruppe. Das **Rollenkarten-Set** ist die differenzierte Variante: jedes Paar bekommt ein eigenes Szenario als Karten-Set (Rollenhinweis, Inhalts-Stichpunkte, Sprachhinweis), sodass mehrere Paare gleichzeitig unterschiedliche Situationen spielen können.

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

## Übersicht (Dashboard)

Die **Übersicht** ist deine Startseite mit deinen zuletzt bearbeiteten Unterlagen und Schnellstarts.

**Schnellstarts:** Über die Übersicht legst du direkt los — **„Wie zuletzt"** öffnet das letzte Dokument mit denselben Einstellungen (Fach, Stufe, Typ), und **„Schnell-Übung"** springt mit Thema + Aufgabentyp direkt in den Baukasten, ohne Quelltext-Umweg.

---

## Suche & Befehle

Die **Such-/Befehlsleiste** oben im Kopf (oder `Ctrl`/`Cmd`+`K`) durchsucht die gesamte App und führt Befehle aus — eine Eingabe, beides zugleich.

1. **Inhalte suchen:** Tippe ein Thema, Fach oder einen Vorlagennamen — Treffer aus Unterlagen, Vorlagen, Aufgaben-Pool und Navigation erscheinen **gruppiert**.
2. **Befehle ausführen:** Slash-/Text-Befehle wie „Thema: …", „Exportieren", „Weiter/Zurück" funktionieren weiter; `Enter` *ohne* ausgewählte Zeile parst den getippten Text wie bisher.
3. Navigation mit der Tastatur: `↑`/`↓` Zeile wählen, `Enter` öffnen/ausführen, `Esc` schließen.

> 💡 Die Suche läuft rein lokal über die schon geladenen Daten — kein Server, keine Verzögerung. Der Aufgaben-Pool wird beim Öffnen der Palette frisch geladen.

---

## Tastenkürzel

| Tastenkürzel | Wirkung |
| --- | --- |
| Strg / Cmd + K | Befehlspalette öffnen oder schließen |
| Esc | Befehlspalette / Dialog schließen |
| Enter | In Eingabefeldern: Aktion bestätigen (z. B. Schüler hinzufügen) |

---

## Datenschutz

**Wichtig:** Beim Generieren werden **Thema, Notizen und Quelltexte an den gewählten KI-Anbieter übertragen** (z. B. Mistral, Anthropic, OpenAI, DeepSeek). Verwende in Quelltexten und Notizen daher **keine Klarnamen** von Schüler:innen.

Alles andere bleibt **lokal**: Datenbank und Exporte liegen auf deinem Rechner und sind nicht in der Cloud. Details im Dokument `docs/DATENSCHUTZ.md`.

---

## Bekannte Einschränkungen & Hilfe

1. **„Generierung fehlgeschlagen"** → API-Schlüssel und Anbieter in den Einstellungen prüfen („Verbindung testen"); ggf. anderes Modell wählen.
2. **Erzeugtes DOCX öffnet sich nicht automatisch** (in der Entwicklungs-/WSL-Umgebung bekannt) → Datei manuell im Ausgabeordner öffnen.
3. **Selten unvollständige KI-Antwort** bei sehr günstigen Modellen (z. B. abgeschnittenes JSON) → Generierung erneut starten oder hochwertigeres Modell wählen.
4. **Daten nach Neustart weg?** Sollte nicht passieren – falls doch, bitte als Fehler melden (siehe README / Testplan).

> 💡 Speicherfehler werden seit Kurzem als Hinweis (Toast) unten rechts angezeigt – wenn so einer auftaucht, bitte mit Screenshot melden.

---

Mehr Details im Repo: `README.md` und `docs/DATENSCHUTZ.md`.

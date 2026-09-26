# LUKA – Anleitung

LUKA ist ein lokales **Unterlagen- und Korrektur-Tool** für Lehrkräfte: Es
erzeugt Arbeitsblätter, Übungen und Schularbeiten, analysiert Schülerabgaben
mit einer Rubrik und hilft dabei, aus Fehlerschwerpunkten gezielte Folgeübungen
zu erstellen.

Alles läuft **lokal auf deinem Rechner** mit deinem eigenen API-Schlüssel — keine Accounts, kein Server, keine Cloud-Datenbank.

---

## Überblick

Der Ablauf im Überblick: **Absicht festlegen → Quelltext (optional) → Aufgaben
zusammenstellen → generieren → DOCX exportieren → Unterrichtseinsatz vermerken
→ Abgaben korrigieren → Folgeübung ableiten.**

Dazu kommen der **Aufgaben-Pool** (bewährte Aufgaben speichern, wiederverwenden und als Fachpaket mit Kolleg:innen teilen) sowie **Vorlagen**, **Verlauf** und **Favoriten** für die Organisation.

> 💡 Wenn du neu bist, lies **Erste Schritte** und erstelle danach eine erste Schnell-Übung – das dauert keine 5 Minuten.
>
> **Hinweis:** Die Korrektur ist in der Desktop-App integriert. Das Modul prüft
> sich vor einer Analyse selbst. Falls die Installation nicht bereit ist, zeigt
> die App eine verständliche Diagnose; der technische TUI-Fallback liegt in den
> erweiterten Einstellungen.

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

1. Beim **ersten Start** wählst du einen Anbieter (empfohlen: Mistral, EU-Anbieter), trägst deinen API-Schlüssel ein und testest die Verbindung direkt im Dialog. Schlüssel werden sicher im Schlüsselspeicher des Betriebssystems abgelegt. Auf Systemen ohne Keyring (z. B. WSL) wird eine `.env.local`-Datei im Datenbankordner verwendet.
2. Später änderst du Anbieter und Standard-Modell jederzeit in den **Einstellungen**. Für günstige Tests eignet sich ein kleines Modell.
3. Zum schnellen Loslegen mit fertigen Aufgaben: eines der sechs mitgelieferten **Fachpakete** (Ordner `samples/fachpakete/`) über **Aufgaben-Pool → Importieren** einspielen. Verfügbar sind das Startpaket **Medien und Demokratie / Informatik und KI**, **Startpaket Deutschland**, **Medien und Demokratie**, **Informatik und KI**, **Deutsch – Textsorten-Training Oberstufe** sowie **Englisch Oberstufe (CEFR B1–B2)**.

> 💡 Ohne hinterlegten Schlüssel schlägt die Generierung fehl. Die Fehlermeldung nennt dann meist „Key/Provider prüfen".

**Kein-Key-Hinweis:** Wählst du in Schritt „KI-Modell" einen Anbieter, für den noch kein Schlüssel hinterlegt ist, zeigt die App dort einen Hinweis mit Direkt-Link zu den Einstellungen — so scheiterst du nicht erst beim Generieren.

---

## LUKA für Deutschland

Wenn du in **Einstellungen → Mein Profil** das Land **Deutschland** auswählst, schreibt die KI bundesdeutsch und ordnet Beispiele dem deutschen Schulalltag zu. Dazu gehören Begriffe wie **Abitur**, **Klassenarbeit**, **Klausur** und **Januar** statt österreichischer Varianten.

- **Klassenstufen:** Deutschland verwendet die Klassen 5 bis 13. Bis einschließlich Klasse 10 ist die Stufe die **Sekundarstufe I**, ab Klasse 11 die **Sekundarstufe II**.
- **Profil:** Im Profil kannst du deutsche Bundesländer und Schulformen auswählen. Diese Angaben helfen der KI, Szenarien und Beispiele passend zu deinem Schulort und deiner Schulart zu formulieren.
- **Kompetenz-Modus:** Bei Land Deutschland ist der deutsche Lehrplan-Katalog der **Kultusministerkonferenz (KMK)** für alle Fächer vorausgewählt. Er ist als **kuratierter Entwurf** gekennzeichnet: Die Inhalte sind sorgfältig zusammengestellt, aber kein amtliches Dokument.
- **Abitur-Training (KMK-Format):** Bei Land Deutschland wird aus dem Matura-Training das Abitur-Training — eine textbezogene Einzelaufgabe nach den sechs KMK-Aufgabenarten (Interpretation, Analyse, Erörterung, materialgestütztes Schreiben) mit zwei bis drei nach den **Anforderungsbereichen AFB I–III** gestaffelten Arbeitsaufträgen und passendem Erwartungshorizont. Wie das Matura-Training ein Übungsformat, **kein amtliches Prüfungsmaterial**.
- **Deutsch-Korrektur im deutschen Schulsystem:** Bei Land Deutschland korrigiert LUKA das Fach **Deutsch** als **Klassenarbeit** mit deutscher **Notenskala 1–6** (Notenempfehlung „sehr gut" bis „ungenügend"); die eigene Lehrernote kann entsprechend 1–6 sein. Österreichische Sprachbesonderheiten (z. B. „Jänner", „heuer") werden nicht als Fehler gezählt. Für die Schweiz erscheint im Korrektur-Dialog eine klare Meldung, dass die Schweizer Skala noch folgt.
- **Startpaket Deutschland:** Das neue Paket mit acht Aufgaben liegt auf GitHub unter `samples/fachpakete/`. Importiere die JSON-Datei über **Aufgaben-Pool → Importieren**, genauso wie die anderen Fachpakete.

> 💡 Die Auswahl des Landes bleibt eine Profileinstellung. Prüfe bei offiziellen Prüfungen und landesspezifischen Vorgaben weiterhin die aktuellen Hinweise deines Bundeslands.

## Fächer

LUKA unterstützt derzeit folgende textbasierte Fächer:

- **Sprachfächer:** Deutsch, Englisch, Französisch, Spanisch, Italienisch, Latein.
  - Inhalte werden in der Zielsprache erzeugt.
  - Für lebende Fremdsprachen fließen CEFR-Niveaus (A2–B2) ein.
  - Latein wird als Sprachfach behandelt, aber ohne CEFR-Bezug.
- **Sachfächer:** Geschichte, Geographie, Religion, Ethik, Psychologie, Philosophie, Medien und Demokratie, Informatik und Künstliche Intelligenz.
  - Inhalte werden deutschsprachig erzeugt.
  - Für Quellenarbeit kann der Blocktyp **Quellenanalyse** mit Operatoren,
    Schreibraum, fachlicher Erwartung und konkreten Quellenbelegen verwendet werden.
  - Für historische Einordnung gibt es außerdem **Timeline / Datierung**:
    Ereigniskarten werden chronologisch geordnet; Datierungen erscheinen nur,
    wenn sie aus dem Material belegt sind.
  - **Diagramm-/Datenanalyse** trennt Datenpunkte von materialgebundenen
    Operatorfragen. Jede Lösung muss mindestens einen konkreten Datenbeleg
    nennen.
  - Bei einer Sachfach-Korrektur werden Operator-Erfüllung, Inhaltsgenauigkeit,
    Fachbegriffe und Erwartungshorizont getrennt von Sprachrichtigkeit bewertet;
    Sprachfehler bleiben ein ergänzender Befund.

Du wählst das Fach in Schritt **Absicht** oder im **Kompetenz-Modus**. Daraufhin passt LUKA automatisch Sprache, verfügbare Blocktypen und didaktische Hinweise an.

> **Bewusste Grenze:** Mathematik und performative Fächer (z. B. Musik- oder
> Sportpraxis) sind nicht als vollwertige Textkorrektur-Fächer freigegeben.
> LUKA kann dafür Unterlagen erstellen, behauptet aber keine automatische
> fachliche Korrektur.

> 💡 Quellenanalyse, Timeline / Datierung und Diagramm-/Datenanalyse sind fachspezifische Sachfach-Blöcke. Prüfe bei
> historischen Aufgaben weiterhin, ob die gewählte Quelle tatsächlich im
> Dokument vorhanden ist und die Arbeitsaufträge sie sichtbar voraussetzen.

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

**Qualität schärfen:** Nach der Generierung kannst du den Qualitätspass einmal bewusst starten. Dein gewählter KI-Anbieter prüft das eigene Dokument als strenger Fachkollege gegen konkrete Schreibsituationen, Textbezug, beobachtbare Erwartungshorizonte sowie Niveau und Punkte. Er liefert eine verbesserte Fassung und zwei bis drei Änderungsnotizen. Dafür wird ein weiterer API-Aufruf deines Anbieters verwendet; Blockstruktur, IDs und Textbeilagen-Verweise bleiben unverändert.

**Export-Varianten:** „Beide Dokumente" (Schülerfassung + Lösung), „Korrekturraster", im Kompetenz-Modus zusätzlich „Kompetenznachweis", sowie „Als PDF". Für PDF exportierst du zuerst die Schülerfassung als DOCX und wählst danach den Speicherort im nativen Datei-Dialog; dafür muss LibreOffice installiert sein. Vor dem Export prüft ein **Quality-Gate** Lernziel-Abdeckung und Wortzahl der Schreibaufgaben – bei Auffälligkeiten kannst du „Nochmal prüfen" oder „Trotzdem exportieren".

**Differenzierung (leichter / schwerer):** Im Akkordeon „Differenzierung" (nach dem Generieren) erzeugst du zusätzlich zur Standardfassung (mittel = „Beide Dokumente") gezielt eine *leichtere* und/oder *schwerere* Variante: Häkchen setzen, dann „Variante(n) erstellen & exportieren". *Leicht* vereinfacht unterstützte Aufgaben ohne KI-Kosten. Bei *schwer* werden offene Aufgaben mit dem gewählten Modell anspruchsvoller neu erzeugt; geschlossene Lückentexte verlieren eine vorhandene Wortbank. Weitere Lücken werden nur mit vollständig vorhandenem Lösungsschlüssel ergänzt; bei Cloze-Texten müssen auch die nummerierten Textmarker passen. Nicht sicher transformierbare Teile bleiben unverändert. Dateinamen tragen `_leicht`/`_schwer`.

**Manuell oder Hybrid festlegen:** Bei Kreuzworträtsel, Wortgitter, Vokabelübung, Fehlerkorrektur und „Wörter ordnen" kannst du im Block-Editor auf „Selbst festlegen" umschalten. Gib eigene Wörter, Sätze oder Vokabeln ein — die KI übernimmt sie wortgleich und ergänzt nur noch fehlende Einträge, bis die gewünschte Anzahl erreicht ist. So bleibst du Herrin/Herr der Inhalte, sparst aber trotzdem Zeit.

**Schnell ohne Quelltext:** Für kleine Übungen mit eigenen Inhalten brauchst du keine Textgrundlage. Wähle im Dashboard oder in Schritt „Absicht" einen der Schnellstarts (z. B. „Kreuzworträtsel", „Vokabeltest", „Fehlerkorrektur", „Lückentext"). Der Assistent springt direkt in den Baukasten; Quelltexte kannst du überspringen.

**Selbsteinschätzungsbogen:** Nach dem Generieren kannst du einen zusätzlichen Bogen exportieren, mit dem Schülerinnen und Schüler einschätzen, wie sicher sie sich bei den einzelnen Aufgaben fühlen. Er eignet sich besonders für differenzierte Rückmeldung und Selbstregulation.

> 💡 Einen ganzen Blocktyp wieder entfernen: im Baukasten oben rechts am Block auf das **X** klicken. Mehr Zuordnungs-Paare/MC-Antworten: im Block-Editor auf „+ Item" / „+ Option" / „+ Frage".

---

## Korrigieren und gezielt üben

Der Bereich **Korrektur** schließt den Unterrichtskreislauf. Die Analyse läuft
im eingebauten Korrektur-Modul oder — nur als technischer Fallback — über eine
lokale NATASCHA-Installation.

1. Öffne **Korrektur → Neue Analyse**. Wähle Klasse und Aufgabe und lade eine
   Schülerabgabe als DOCX, PDF oder TXT hoch. Mehrere Dateien können als
   Stapel verarbeitet werden.
2. Hinterlege optional das **Ausgangsmaterial** als Text oder Datei. Für
   textgebundene Aufgaben wird es empfohlen, weil es gemeinsam mit der Rubrik
   und dem Auftrag gespeichert und später für Folgeübungen wieder angezeigt
   wird.
3. Wähle die **Textsorte** und das **Bewertungsraster**. Die Textsorten-Liste passt
   sich dem Fach an: Für **Deutsch** erscheinen die gewohnten (Oberstufe: SRDP)
   Textsorten, für **Englisch** kuratierte EN-Textsorten (Oberstufe SRDP-orientiert:
   Article, Blog, Email, Essay, Letter, Proposal, Report, Review; Unterstufe u. a.
   Email, Blog, Story). **Französisch, Spanisch und Italienisch** verwenden eigene
   kuratierte Textsortenfamilien und Grundraster; **Latein** verwendet text- und
   übersetzungsbezogene Aufgaben ohne CEFR-Übertragung. Diese Listen sind eine
   fachbezogene Auswahl und keine amtliche Vollständigkeitsbehauptung. Die Raster-Liste zeigt nur das passende Fach —
   fachfremde Raster werden ausgeblendet. Vor dem Versand zeigt LUKA bei Textabgaben
   eine Redaktionsvorschau; erkannte Namen aus der gewählten Klasse werden
   standardmäßig durch stabile Aliasse ersetzt. Bei PDF- und Bildabgaben kann
   LUKA den sichtbaren Inhalt nicht automatisch redigieren.
   Bei Sachfächern werden Operator-Erfüllung, Inhaltsgenauigkeit, Fachbegriffe
   und Erwartungshorizont getrennt von Sprachrichtigkeit bewertet. Die verwendete
   Erwartungshorizont-Fassung wird je Korrektur-Revision unverändert dokumentiert.
   Unter **Weitere Exporte & Werkzeuge → Digitale Selbstkontrolle** können
   geschlossene Aufgaben mit vollständigem Antwortschlüssel lokal geprüft werden.
   Das funktioniert ohne KI-Aufruf und ohne Upload; offene oder sachfachliche
   Aufgaben werden nicht automatisch bewertet.
4. Nach der Analyse siehst du Note, Kriterien, Fehlerliste und den markierten
   Text. Eine bestätigte Schülerzuordnung hat Vorrang vor der Dateinamen-
   Erkennung. Eigene Lehrernote und Kommentar kannst du speichern.

   Jeder KI-Vorschlag in der Fehlerliste zeigt eine **Vertrauensstufe** als
   farbigen Punkt: grün (hohe Sicherheit), gelb (mittlere Sicherheit) rot
   (niedrige Sicherheit). Prüfe besonders die gelben und roten Vorschläge.

   **Fehlerliste und Schülertext sind verzahnt.** Ein Klick auf einen Vorschlag
   holt die betreffende Stelle im markierten Text in den Blick — die Stelle
   bekommt einen kräftigen Rahmen, die übrigen Markierungen treten zurück. Ein
   Klick auf eine Markierung im Text hebt umgekehrt die zugehörige Karte hervor.
   Escape hebt die Auswahl wieder auf.
   - Jeder Vorschlag trägt eine **Nummer**, die auf der Karte und am Text steht
     (kleine Ziffer über der Markierung). Über **„Nr. im Text"** blendest du sie
     aus, wenn du den Text lieber ohne Zahlen liest.
   - Steht dieselbe Wendung mehrfach im Text, ist die Markierung **gestrichelt**
     und an **allen** Fundstellen zu sehen. Dann musst du selbst entscheiden,
     welche Stelle gemeint ist — LUKA rät nicht.
   - Findet LUKA ein Zitat gar nicht (frei formuliert, Zitat weicht ab), steht
     der Vorschlag unten in der Gruppe **„nicht im Schülertext auffindbar"** mit
     einem Symbol an der Karte. Diese Vorschläge gehen nicht verloren, sie sind
     nur nicht anklickbar — bitte am Text mitprüfen.

   **Reihenfolge der Fehlerliste** über **„Reihenfolge"**:
   - *Reihenfolge im Text* (Voreinstellung) — die Vorschläge folgen dem
     Schülertext, du kannst ihn damit von oben nach unten durchgehen.
   - *Fehlerart* — gruppiert nach Rechtschreibung, Grammatik, Zeichensetzung,
     Ausdruck.
   - *Unsicherheit zuerst* — die wackeligsten Vorschläge oben.
   - *Offene zuerst* — zuerst alles ohne Entscheidung.

   Die Nummern passen sich der gewählten Reihenfolge an; nach dem Umsortieren
   beginnt die Zählung neu.

   Pro Vorschlag kannst du drei Aktionen ausführen:
   - **Übernehmen** — der Vorschlag wird als korrekt markiert.
   - **Ändern** — du bearbeitest den Korrekturtext direkt (Enter speichert,
     Escape bricht ab).
   - **Verwerfen** — der Vorschlag wird gestrichen und erscheint weder im
     Text noch im Feedback-DOCX.

   Die Aktionen werden erst beim Klick auf **Freigeben** in der Datenbank
   gespeichert. Verworfene Fehler erscheinen im markierten Text grau und
   durchgestrichen, geänderte farbig hervorgehoben. Die Farbe im Text sagt
   immer den **Fehlertyp**, nie den Bearbeitungsstand — übernommene Vorschläge
   sind nur etwas kräftiger hinterlegt.

   Über der Fehlerliste gibt es zwei Hilfsmittel: Den Umschalter **„Nur
   unsichere"**, der gezielt die gelben und roten Vorschläge zeigt, und den
   Kasten **„Qualitätsprüfung"**, der erscheint, wenn die Fehlerliste und die
   Sprachrichtigkeits-Note stark widersprechen (z. B. viele Fehler, aber „gut"
   bewertet) — das ist ein Hinweis zum Nachprüfen, keine Notenänderung.

   Bei einem **Stapel** ab zwei Abgaben zeigt Schritt 4 eine Mengenschätzung
   (geschätzte Tokens) — hilfreich, um bei Anbieter-Ratenlimits den Stapel
   zeitlich zu staffeln.

5. Erzeuge über **Feedback-DOCX** ein Rückmeldedokument. Vor dem Export
   zeigt eine Zusammenfassung, wie viele Vorschläge übernommen, geändert
   oder verworfen wurden — verworfene Fehler werden nicht ins DOCX
   geschrieben. Enthält die Fehlerliste Schwerpunkte, endet das Dokument
   mit der Sektion **„Nächste Schritte — woran du arbeiten kannst"**:
   zu den zwei bis drei häufigsten Fehlertypen ein konkreter Übungstipp
   (Rechtschreib-Kartei, Kommas beim lauten Lesen, Satzkerne/Zeitformen,
   Synonyme statt Füllwörter). Die Datei landet im lokalen Feedback-Ordner;
   die Erfolgskarte zeigt den Dateinamen und öffnet auf Wunsch den Ordner.
6. Unter **Meine Klassen** und **Schüler** findest du Fehler-Heatmaps,
   Notenverteilungen, Trends und Längsschnitte. **Übungsblatt zu Top-Fehlern**
   übernimmt die Schwerpunkte direkt in den Generator. Die dabei erzeugten
   Folgeübungen merken sich ihre Herkunft: Die Fehlerkorrektur-Aufgabe baut
   die Fehler ein, die die Klasse tatsächlich gemacht hat (du kannst die
   Vorschläge vor dem Generieren frei anpassen oder abwählen).

   Für jede Klasse lässt sich im Klassenformular ein eigenes **Land/
   Schulsystem** festlegen. „Profilstandard“ übernimmt das Land aus dem
   Lehrkraftprofil; eine ausdrücklich gesetzte Klassenangabe hat beim
   Vorbereiten von Folgeübungen Vorrang.

   Bei ausreichend bestätigten Lehrkraftnoten schlägt die Klassenansicht zwei
   oder drei **Niveaugruppen** vor. Die Sortierung berücksichtigt das
   Schulsystem: In der Schweiz ist 6 die stärkste und 1 die schwächste Note;
   für Österreich und Deutschland gilt die umgekehrte Zahlenrichtung. Öffne
   eine Gruppe, prüfe die angezeigte Einteilung und ordne Schüler/innen bei
   Bedarf neu zu oder nimm sie aus der Übung heraus. Erst danach wird die
   Gruppenübung vorbereitet.

   Im **Statistik-Tab** der Klassenansicht zeigt der Abschnitt „Folgeübungen",
   wie sich die Fehlerkategorien seit einer Übung entwickelt haben — es wird
   der Korrekturlauf vor der Übung mit dem ersten danach verglichen
   (Fehler pro Abgabe, z. B. „Zeichensetzung: 2,9 → 1,0"). Das zeigt die
   Entwicklung, es ist kein Beweis der Ursache: Korrekturläufe am selben Tag
   wie die Übung bleiben bewusst unberücksichtigt.
   Zusätzlich zeigt die Wirksamkeitskarte wiederkehrende strukturierte
   Fehler-Cluster, sobald ein Regelmuster in mindestens zwei Aufgabenläufen
   vorkommt. Nicht strukturierte Altfehler bleiben in der R/G/Z/A-Ansicht und
   werden in der Clusterkurve nicht als Null gezählt.

Bereits vorhandene Analyse-JSONs können über **Retro-Import** nachträglich in
die gemeinsame lokale Datenbank übernommen werden. Ohne gebündeltes Modul zeigt
die App den Diagnosegrund; die Einstellungen enthalten den TUI-Fallback und
Optionen für Sonderinstallationen.

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

> 💡 Der Pool ist pro Rechner lokal. Beim Ersetzen eines Duplikats bleiben deine lokalen Organisationsdaten erhalten — ideal, um kuratierte Inhalte zu übernehmen und eigene Bewertungen weiterzuführen. Sechs kuratierte Pakete liegen in `samples/fachpakete/`: das Startpaket **Medien und Demokratie / Informatik und KI**, **Startpaket Deutschland**, **Medien und Demokratie**, **Informatik und KI**, **Deutsch – Textsorten-Training Oberstufe** sowie **Englisch Oberstufe (CEFR B1–B2)**.

---

## Export & Dateien

Beim Export entstehen pro Unterlage mehrere Dateien — wohin sie landen, stellst du in den **Einstellungen → Export** ein.

1. **DOCX-Zielordner:** In den Einstellungen legst du einen Ordner fest, in den alle DOCX geschrieben werden. Alternativ aktivierst du **„Speichern unter…"**, um bei jedem Export den Ort einzeln zu wählen. Ohne Tauri (Browser) landen die Dateien im Download-Ordner.
2. **Beide Dokumente** (Schülerfassung + Lösung) sowie **Korrekturraster** als DOCX; im Kompetenz-Modus zusätzlich der **Kompetenznachweis**; optional **PDF** über den nativen Speicher-Dialog (braucht LibreOffice).
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

> 💡 Datensicherung: in **Einstellungen → Datenbank** kannst du eine Kopie der gesamten Datenbank exportieren oder eine vorhandene Sicherung wiederherstellen.

---

## Übersicht (Dashboard)

Die **Übersicht** ist deine Startseite. Ganz oben steht kompakt, wo du bist: die Begrüßung, ein Sprung zu den Korrekturen und einer in den Stundenplan.

**Was steht an:** Direkt darunter zeigt LUA die nächsten **sieben Tage** als Streifen – heute plus die folgenden sechs Tage, jeder Tag zeigt seine Stunden in der Klassenfarbe. Eine kleine Markierung weist auf Tage hin, an denen eine Unterlage fehlt; Samstag und Sonntag sind zurückhaltend als Wochenende gekennzeichnet. **Ein Klick auf einen Tag bringt dich in der Planung genau zu diesem Tag.** Darunter listet **„Anstehend"** die nächsten Stunden mit Tag, Klasse, Uhrzeit und Hinweis.

**Schnellstarts:** Über die Übersicht legst du direkt los — **„Wie zuletzt"** öffnet das letzte Dokument mit denselben Einstellungen (Fach, Stufe, Typ), und **„Schnell-Übung"** springt mit Thema + Aufgabentyp direkt in den Baukasten, ohne Quelltext-Umweg.

---

## Unterrichtsplanung

Im Bereich **Unterricht** findest du den Stundenplan. Er besteht aus zwei Teilen: deinem festen **Wochenraster** und den daraus erzeugten **einzelnen Stunden**.

### 1. Wochenraster eintragen

Unten im Abschnitt „Mein Wochenraster" trägst du Tag, Klasse, Uhrzeit und Fach ein. Das ist die feste Form deiner Woche – du pflegst sie **einmal pro Schuljahr**, nicht jede Woche.

- **Schuljahr wählen** oben rechts: Jedes Raster gehört zu einem Schuljahr. So bleibt das Raster 2026/27 getrennt von 2027/28.
- **Aus dem Vorjahr übernehmen** („Schuljahr planen") überträgt die Zeiten, wenn das neue Schuljahr startet. Die Klassen prüfst du danach selbst.
- **Bearbeiten** blendet ein, wo du einzelne Zeilen deaktivierst (statt löschst) oder ganz entfernst. Deaktivierte Zeilen bleiben erhalten, zählen aber nicht mehr mit.

### 2. Einplanen

Aus dem Raster macht LUA einzelne Stunden – jede mit Datum, Uhrzeit und Klasse:

- **Woche einplanen** / **Monat einplanen** / **Schuljahr einplanen**
- Bereits geplante Stunden werden **nicht doppelt** angelegt. Beim ganzen Schuljahr fragt LUA vorher nach.
- **Ferien auslassen** (Häkchen neben dem Knopf): standardmäßig an. Dann entstehen an schulfreien Tagen keine Stunden. Ohne Häkchen werden sie mit eingeplant – praktisch, wenn du eine Praxisphase im Betrieb planst.
- **Rasterzeilen ohne Klasse** (Freistunde, Aufsicht) werden **nicht** eingeplant. Sie bleiben im Raster stehen, damit sie später noch da sind; im Bericht steht, wie viele es waren.

**Woche oder Monat:** Der Umschalter oben wechselt zwischen Wochen- und Monatsansicht. Randtage des Monats bleiben grau. „Diese Woche"/„Dieser Monat" springt zurück zum Heute. **Ein Klick auf die Tageszahl im Monatsraster** springt in die Woche dieses Tages und wählt die erste Stunde dort aus.

**Die Wochenkarte** oben zeigt nur dein festes Raster: eine Zeile je Klasse, in der Farbe der Klasse, und rechts die Zahl der schon eingeplanten Stunden. Uhrzeiten, Titel und Unterlagen stehen in der Liste darunter – die Karte ist die Übersicht, die Liste die Arbeitsliste.

### 3. Ferien und Pausen

Ganz unten im Planungsbereich liegen **Ferien und Pausen** – diese Daten pflegst du einmal im Jahr.

- **Gesetzliche Feiertage** rechnet LUA selbst (Österreich, Deutschland, Schweiz).
- **Schulferien**: LUA hat die amtlichen Termine eingetragen – für **Österreich** 2025/26 und 2026/27 (alle neun Bundesländer), für **Deutschland** 2026/27 (alle 16 Bundesländer, je Bundesland unterschiedlich). Gibt es für dein Bundesland und dein Schuljahr noch keine, bietet LUA dir den Vorschlag an („Vorschlag aus der Ferienordnung") und nennt dir **Quelle und Abrufdatum**. Du übernimmst ihn und **gleichst ihn mit der geltenden Verordnung ab** – Regelbetreuungstage und verschobene Feiertage stehen bewusst nicht im Vorschlag.
- **Deutschland:** Damit LUA weiß, welche Ferien gelten, muss im **Lehrerprofil** ein Bundesland gewählt sein. Deutschland hat seine Schulferien je Bundesland, deshalb lohnt sich das besonders dort.
- **Für die Schweiz** führt LUA bewusst keine Termine: dort sind die Ferien kantonal, das wäre eine Datenpflege je Kanton. Trage die Termine bei Bedarf selbst ein.
- **Einzelne Blöcke** trägst du mit Bezeichnung, Von und Bis selbst ein.
- **Schulinterne Pausen** (Fortbildung, MuT, Elternabend) legst du als einzelne Tage an – entweder für die ganze Schule oder nur für eine Klasse.

Solange für dein Bundesland und Schuljahr keine Ferien hinterlegt sind, erinnert dich die Planung oben daran. LUA unterscheidet dabei: Sind die Termine **bekannt, aber nicht eingetragen**, ist es eine deutliche Warnung mit Übernehmen-Knopf. Gibt es für das Schuljahr **noch keine Verordnung** oder fehlt das Bundesland im Profil, ist es nur ein neutraler Hinweis – LUA erfindet keine Termine.

### 4. Eine Stunde anpassen

Wähle eine Stunde, dann kannst du:

- **Thema, Uhrzeit, Notiz** eintragen und den **Status** setzen (Geplant / Vorbereitet / Gehalten).
- **Auf einen anderen Tag legen** – für Vertretungsstunden.
- **Entfällt** markieren: Die Stunde bleibt im Kalender stehen, gilt aber nicht mehr als Unterricht. Mit „Findet doch statt" machst du das rückgängig.
- **Unterlagen** anlegen – zwei Wege:
  - **„Unterlage vorbereiten"**: LUA übernimmt aus diesem Kalendereintrag **Klasse, Fach, Thema und Datum** und öffnet den Assistenten. Quelltext und Aufgaben arbeitest du selbst aus – LUA erfindet keinen Quelltext nur deshalb, weil im Kalender keine Datei danebenliegt. Ein Hinweis im Assistenten sagt dir, zu welchem Termin die Unterlage gehört; **beim Speichern hängt LUA sie automatisch an die Stunde**. Mit „Verknüpfung abbrechen" nimmst du den Termin wieder heraus. Fehlt der Stunde ein Thema oder der Klasse ein Fach, trägst du das im Assistenten nach.
  - **„Datei ablegen"** kopiert eine Datei in den Ablage-Ordner von LUA – dein Original bleibt, wo es ist.
  - **„Verweis"** merkt sich einen Pfad oder eine Adresse für Material, das woanders liegt.
  - Fehlt eine abgelegte Datei, sagt LUA es dir.

**Voraussetzung für „Unterlage vorbereiten":** Damit das Gerüst vollständig ist, braucht die Klasse in der Klassenverwaltung ein **Fach**. Steht dort etwas, das LUA nicht kennt (z. B. „Deutsch 6b"), trägst du es im Assistenten nach – LUA rät kein Fach.

### 4a. Eine einzelne Stunde anlegen (Vertretung)

Für einen Tag, für den es keine Zeile im Wochenraster gibt – eine Vertretung, eine Einzelsehre, eine Projektstunde:

- Neben **„Woche einplanen"** findest du **„Stunde hinzufügen"**. Trage **Datum, Klasse, Uhrzeit** und bei Bedarf ein Thema ein.
- Die Stunde steht danach ganz normal im Wochen- und im Monatsbild und lässt sich wie jede andere bearbeiten.
- Sie kommt **nicht** aus dem Wochenraster. „Woche einplanen" oder „Schuljahr einplanen" erzeugt sie deshalb **nicht** ein zweites Mal.

### 5. Klassenfarben

Jede Klasse bekommt einen von acht gedämpften Farbtönen. Festlegen tust du das in der **Klassenverwaltung** beim Bearbeiten einer Klasse. Klassen ohne eigene Farbe bekommen automatisch eine – zwei Klassen teilen sich nie denselben Ton.

Die Farbe erscheint im Wochenstreifen, im Monatsraster, in der Rasterliste, in der Anstehend-Liste und als Randfarbe der Klassenkarte. In der **Korrektur** wird sie bewusst nicht verwendet – dort stehen die Farben für Richtig/Falsch/Zeichen/Ausdruck.

---

## Suche & Befehle

Die **Such-/Befehlsleiste** oben im Kopf (oder `Mod`+`K`) durchsucht die gesamte App und führt Befehle aus - eine Eingabe, beides zugleich.

1. **Inhalte suchen:** Tippe ein Thema, Fach, eine Klasse oder einen Vorlagennamen. Treffer aus **Unterlagen**, **Vorlagen**, **Aufgaben-Pool**, **Klassen** und **Gehe zu …** erscheinen **gruppiert** - passend zum Zweck, nicht nur nach Textähnlichkeit. Eine Trefferliste führt die anderen nicht in den Schatten: Passen 30 Unterlagen, bleiben Aufgaben-Pool, Klassen und Navigation sichtbar.
2. **Befehle ausführen:** Textbefehle wie `Thema: …`, `Klasse: 7A`, `Fach: Deutsch`, `Punkte: 8`, `Exportieren`, `Weiter`/`Zurück` setzen Dokument, Schritt oder Export. `Enter` *ohne* ausgewählte Zeile parst den getippten Text.
3. **Befehle mit Platzhalter** wie „Thema: <Text>" oder „Punkte: <Zahl>" erscheinen **erst, wenn die Eingabe sie auch erfüllt**. Vorher wären sie sichtbar, aber nicht ausführbar - ein Klick meldete dann nur „Befehl nicht erkannt".
4. Navigation mit der Tastatur: `↑`/`↓` Zeile wählen, `Enter` öffnen/ausführen, `Esc` schließen.
5. **Spracheingabe:** Ist im System eine verfügbar, findest du links im Eingabefeld ein Mikrofon. LUKA hört Deutsch und trägt das Erkannte ein.

**Was bei einem Treffer passiert:** Eine Unterlage wird im Assistenten geöffnet, eine Vorlage in den Baukasten geladen, eine Pool-Aufgabe als Block eingefügt, eine Klasse geöffnet. Steht im Assistenten noch ungespeicherte Arbeit, fragt LUKA vorher nach - ein Sprung aus der Palette verwirft nichts ohne Rückfrage.

> Die Suche läuft rein lokal über die schon geladenen Daten - kein Server, keine Verzögerung. Der Aufgaben-Pool wird beim Öffnen der Palette frisch geladen.

---

## Tastenkürzel

`Mod` steht für `Strg` unter Windows/Linux und `⌘` auf Mac. Die Liste in der App zeigt die Taste, die auf deinem Gerät tatsächlich gilt.

### Überall

| Tastenkürzel | Wirkung |
| --- | --- |
| `Mod`+`K` | Suche und Befehle öffnen oder schließen |
| `Esc` | Suche, Dialog oder Tafel-Modus schließen |
| `Enter` | Aktion im Eingabefeld bestätigen |
| `Mod`+`+` / `Mod`+`−` / `Mod`+`0` | App vergrößern / verkleinern / zurücksetzen |
| `Mod` + Mausrad | Größe mit dem Mausrad ändern |

### In der Suche

| Tastenkürzel | Wirkung |
| --- | --- |
| `↑` / `↓` | Trefferzeile wählen |
| `Enter` | Gewählten Treffer öffnen oder Befehl ausführen |
| `Esc` | Suche schließen |

### Im Assistenten

| Tastenkürzel | Wirkung |
| --- | --- |
| `Mod`+`Z` | Letzte Änderung zurücknehmen (nicht im Textfeld) |
| `Mod`+`Y` bzw. `Mod`+`Shift`+`Z` | Zurückgenommenes wiederherstellen |

### Im Tafel-Modus

| Tastenkürzel | Wirkung |
| --- | --- |
| `→` / `Leertaste` | Nächste Folie |
| `←` | Vorherige Folie |
| `L` | Lösung aufdecken bzw. wieder ausblenden |
| `+` / `−` | Schriftgröße |
| `Esc` | Tafel-Modus beenden |

### Anzeige

Die App lässt sich in der Gr��ße verstellen, was auf einem Beamer mit wenig
Bildschirmfläche hilfreich ist. Dazu in **Einstellungen → Darstellung**: *Fachzeichen
aktivieren*, *Bewegung reduzieren* (stoppt Parallax-Effekte) und *Hintergrundeffekte
reduzieren*.

---

## Datenschutz

**Wichtig:** Beim Generieren werden **Thema, Notizen und Quelltexte an den gewählten KI-Anbieter übertragen** (z. B. Mistral, Anthropic, OpenAI, DeepSeek). Verwende in Quelltexten und Notizen daher **keine Klarnamen** von Schüler:innen.

Alles andere bleibt **lokal**: Datenbank und Exporte liegen auf deinem Rechner und sind nicht in der Cloud. Details im Dokument `docs/DATENSCHUTZ.md`.

---

## Bekannte Einschränkungen & Hilfe

1. **"Generierung fehlgeschlagen"** → API-Schlüssel und Anbieter in den Einstellungen prüfen; dort gibt es je Anbieter **"Verbindung testen"**. Falls der Test gerade scheitert, den Schlüssel mit **"Nur speichern"** sichern und später erneut testen. Bleibt die Meldung, ein anderes Modell wählen.
2. **PDF-Export schlägt fehl** → PDF geht nur über LibreOffice. Ohne LibreOffice als DOCX exportieren und selbst umwandeln.
3. **Der Korrekturauftrag startet nicht** → unter **Einstellungen → Korrektur-Modul** steht, ob die Installation bereit ist; dort liegt auch der technische Fallback.
4. **Schulferien fehlen in der Planung** → im Lehrerprofil muss ein **Bundesland** gewählt sein, sonst kann LUKA sie nicht zuordnen. Siehe *Unterrichtsplanung*.
5. **Selten unvollständige KI-Antwort** bei sehr günstigen Modellen (z. B. abgeschnittenes JSON) → Generierung erneut starten oder hochwertigeres Modell wählen.
6. **Speicherfehler** erscheinen als Hinweis (Toast) unten rechts. Bitte mit Screenshot melden.
7. **Daten nach Neustart weg?** Sollte nicht passieren – falls doch, bitte als Fehler melden.

**Fehler melden:** Über den Knopf **Fehler melden** unten in der Seitenleiste. Je mehr Kontext du mitgibst, desto schneller lässt sich die Ursache finden – Version (steht in den Einstellungen unter *"Installation & Updates"*) und ein Screenshot helfen sehr.

---

Mehr Details: `docs/DATENSCHUTZ.md` · Anleitung mit mehr Tiefe je Fall: `docs/ANLEITUNG.md` (dieses Dokument).

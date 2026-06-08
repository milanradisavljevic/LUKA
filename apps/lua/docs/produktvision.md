# Produktvision

Stand: 2026-06-01. Dies ist die Quelle der Wahrheit fuer Umfang und Mehrwert.
Technische Architektur: siehe `tauri-architektur.md`. Datenmodell: `datenmodell-erweiterung.md`.
Ablauf und Zustaendigkeiten: `fahrplan.md`.

## Der Mehrwert in einem Satz

Nicht "die KI schreibt Arbeitsblaetter", das kann jeder. Sondern: von der Idee zur
fertig korrigierten Arbeit mit minimalem Zeitaufwand, weil ein einziges Datenmodell
den ganzen Weg traegt und der Bewertungsmassstab mit dem Dokument geboren wird.
Die zwei groessten Zeitfresser einer Lehrkraft sind das Erstellen und das Korrigieren.
Das Produkt greift beide mit demselben Modell an.

## Grundprinzip: Absicht zuerst, Baukasten als Werkstatt

Der Baukasten ist nicht die Eingangstuer. Eine Lehrkraft ohne Zeit will nicht Bloecke
ziehen und Distraktoren konfigurieren, sie will beschreiben und bekommen.

Primaerweg (Absicht): Die Lehrkraft beschreibt, was sie braucht (Typ, Fach, Stufe,
Thema, Quelltext, ungefaehre Dauer). Daraus erzeugt die App einen vollstaendigen
Entwurf: Struktur, Inhalt, Loesung und Korrekturraster in einem Zug.

Optionale Vorgabe: Die Lehrkraft darf die gewuenschten Aufgabenarten auswaehlen. Tut
sie das, nimmt die App genau diese. Tut sie es nicht, entscheidet die App anhand des
Typ-Profils.

Sekundaerweg (Werkstatt): Der erzeugte Entwurf ist im Baukasten editierbar. Das ist
fuer Vertrauen noetig, denn bei einer Schularbeit verlaesst sich niemand blind auf die
KI. Aber es ist Nachbessern, nicht Aufbauen. Die Muehe faellt einmal an oder nie.

Deterministische Struktur: Welche Bloecke mit wie vielen Punkten, liefert das Typ-Profil
deterministisch. Die KI fuellt nur den Inhalt. So bleibt die Struktur vorhersehbar.

Vorlagen: Einmal eine Vorlage je Typ und Klasse anlegen, immer wieder abrufen.

## Unterlagentypen als Profile

Der Unterlagentyp ist ein erstklassiges Konzept, das alle Voreinstellungen steuert.

- Hausuebung (HUe): kurz, niedrige Stakes, Loesung ja, Raster optional/leicht, kein
  formaler Notenschluessel, schnell, weil haeufig.
- Test / Stundenwiederholung / Klassenarbeit: mittel, Punkte plus einfacher Schluessel,
  Loesung plus leichtes Raster.
- Schularbeit: lang, hohe Stakes, Oberstufe an der Maturastruktur orientiert, voller
  Korrekturraster plus AHS-Notenschluessel, Sorgfalt, weil selten.

Das Profil legt fest: Standard-Aufgabenarten, Laenge, Punktelogik, ob Raster und
Notenschluessel entstehen, und den Ton.

## Der Burggraben: Erstellung und Korrektur teilen ein Datenmodell

Wenn die App die Unterlage erzeugt, entstehen zugleich Loesung und Raster. Das ist
exakt die Grundwahrheit, die ein Korrekturwerkzeug braucht. Generalisten muessen den
Massstab aus einem leeren Blatt erraten. Hier ist der Korrekturgedanke schon im Design
gesetzt.

Der geschlossene Kreis:
- Geschlossene Aufgaben (Lueckentext, Matching, Multiple Choice) werden nach dem
  Einscannen automatisch gegen die bekannte Loesung geprueft. Sofort und verlaesslich.
- Offene Aufgaben (Verstaendnisfrage, Schreibaufgabe) bewertet die KI gegen das bekannte
  Raster und den Erwartungshorizont, also begruendet statt freihaendig. Die Lehrkraft
  bestaetigt oder aendert. Assistenz, kein Ersatz.
- Die Note rechnet sich aus den Punkten ueber den Notenschluessel.
- Auf Klassenebene: welche Aufgaben oft falsch waren, welche Kriterien schwach.
  Das verbessert die naechste Arbeit. Erstellung speist Korrektur speist Erstellung.

## Die nicht verhandelbare Grenze: Schuelerdaten

Korrektur heisst Schuelerdaten verarbeiten. Deshalb ist die Desktop-Architektur (Tauri)
nicht Beiwerk, sondern Voraussetzung. Scan, Texterkennung und der Abgleich der
geschlossenen Aufgaben bleiben lokal auf dem Rechner. Nur wenn die Lehrkraft es will,
verlaesst der reine Antworttext (ohne Schueleridentitaet) den Rechner, idealerweise an
einen EU-Anbieter (Mistral) oder mit ausdruecklicher Zustimmung.

## Umfang: Nordstern gegen naechster Schritt

- Uebergabe-Umfang: die Erstellungsseite, neu gedacht (Absicht zuerst, Typ-Profile,
  Baukasten als Werkstatt), Ergebnis ist das Dreierpaket Schuelerfassung, Loesung,
  Raster, als DOCX und PDF.
- Nordstern, naechste Hauptphase: die Korrekturseite (Scan, Abgleich, KI-gestuetzte
  Bewertung offener Aufgaben, Notenschluessel, Auswertung). Eigener Bauabschnitt,
  beruehrt Schuelerdaten, eigene Datenschutzpruefung. Das gemeinsame Datenmodell wird
  schon jetzt so gelegt, dass die Korrektur sauber andockt.

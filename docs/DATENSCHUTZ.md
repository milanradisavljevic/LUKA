# Datenschutz-Hinweise (LUKA)

Kurz, ehrlich und praxisnah für den Einsatz an einer österreichischen Schule.
Dies ist **keine** Rechtsberatung, sondern eine technische Beschreibung des
Datenflusses, damit du informiert entscheiden kannst.

## Das Wichtigste in einem Satz

**Bei Korrektur, Erwartungshorizont-Generierung und Schüler-Profil wird der
jeweilige Text an den von dir gewählten KI-Anbieter übertragen** (z. B. Anthropic,
OpenAI, Mistral, DeepSeek). Alles andere bleibt lokal auf deinem Rechner.

## Was lokal bleibt

- **Datenbank** (`~/lehr-suite-bridge/lehr-suite.db`): Klassen, Abgaben, Noten,
  Fehler, Längsschnitte. Liegt nur auf deinem Gerät.
- **Exporte** (generierte Arbeitsblätter, Feedback-DOCX) im Ausgabeordner.
- **API-Schlüssel**: im **Schlüsselspeicher des Betriebssystems**, nicht im Klartext
  in Dateien oder im Repo.
- Echte Schülerdaten (DBs, Abgaben, Output, Bridge-Inbox) sind per `.gitignore`
  vom Repository ausgeschlossen und gehören **nicht** auf GitHub.

## Was das Gerät verlässt

- Der **Text der Schülerabgabe** (bzw. der Aufgaben-/Rubriktext) geht zur Analyse an
  die API des gewählten Anbieters. Ohne diese Übertragung ist keine KI-Korrektur möglich.
- Für **Schüler-Profile** werden Längsschnitt-Daten datenminimiert aufbereitet, bevor
  sie an die KI gehen (keine vollständigen Rohtexte mehr als nötig).
- Es findet **keine** sonstige Cloud-Synchronisierung statt; LUKA sendet nichts an
  eigene Server (es gibt keine).

## Empfehlungen für den Schuleinsatz

1. **Pseudonymisieren:** Abgaben ohne vollen Klarnamen verwenden (z. B. Kürzel oder
   Sitzplatznummer). Die App braucht keinen echten Namen, um zu korrigieren.
2. **Anbieter bewusst wählen:** Prüfe die Datenschutz-/Auftragsverarbeitungs­bedingungen
   des KI-Anbieters (Serverstandort, Speicherung, Training auf Eingaben).
3. **Sparsam:** Nur die Texte hochladen, die wirklich korrigiert werden sollen.
4. **Gerät absichern:** Da alle Daten lokal liegen, schützt ein gesperrtes/verschlüsseltes
   Gerät die Daten am wirksamsten.

## DSGVO-Einordnung (vereinfacht)

- Schülertexte können **personenbezogene Daten** sein. Die Übertragung an einen
  KI-Anbieter ist eine Verarbeitung durch einen Dritten — kläre die Zulässigkeit mit
  Schule/Schulerhalter und nutze Pseudonymisierung.
- LUKA selbst ist ein **lokales Werkzeug** ohne eigene Datenerhebung in der Cloud.

Bei Fragen: milanradisavljevic7@gmail.com

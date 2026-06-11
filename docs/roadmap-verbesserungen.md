# 5 Verbesserungsideen für die Lehr-Suite

Erstellt: 2026-06-11
Status: Planung (nicht priorisiert)

---

## 1. Lehrplan-Kompetenz-Mapping (automatisch)

**Was:** Die App kennt den österreichischen AHS-Lehrplan (Deutsch + Englisch, Unter-/Oberstufe) als strukturierte Kompetenzliste. Beim Generieren wird jeder Aufgabenblock automatisch den passenden Lehrplan-Kompetenzen zugeordnet. Ein Dashboard zeigt: „Diese Schularbeit deckt Kompetenzbereiche X, Y, Z ab — Bereich W fehlt." Export als Kompetenzraster-Dokument für die Dokumentation.

**Warum:** Lehrkräfte müssen gegenüber Schulleitung und Bildungsinspektion nachweisen, welche Kompetenzen sie geprüft haben. Das ist heute reine Handarbeit — ein mühsamer Abgleich zwischen Lehrplan-PDF und eigener Prüfung. Einer der häufigsten administrativen Schmerzpunkte im österreichischen Schulsystem.

**Schwierigkeit:** Mittel — Der Lehrplan ist öffentlich und strukturiert (BMBWF-Lehrpläne). Die Kompetenzen als JSON zu modellieren ist Fleissarbeit. Das automatische Mapping kann das LLM im Generationsschritt mitliefern (ähnlich wie `lernziele` heute). Kein Architektur-Umbau nötig.

**Priorität:** **Hoch** — Spart direkt administrative Zeit, Alleinstellungsmerkmal gegenüber generischen Tools.

---

## 2. Binnendifferenzierung: 3 Niveaustufen aus einem Master

**Was:** Aus einer erstellten Schularbeit/Übung generiert die App auf Knopfdruck drei Versionen: Basis (leichter Wortschatz, mehr Scaffolding, Wortbank, kürzere Texte), Standard (wie heute), und erweitert (komplexere Aufgabenstellungen, weniger Hilfen, höhere Textkomplexität). Gleiche Struktur, gleiche Kompetenzen, unterschiedliches Niveau. Export als drei DOCX-Pakete.

**Warum:** In einer AHS-Klasse sitzen 25 Schüler mit massiv unterschiedlichem Leistungsstand. Lehrkräfte wissen, dass sie differenzieren müssten, aber drei Versionen einer Schularbeit zu erstellen kostet das Dreifache an Zeit. In der Praxis wird dann doch nur eine Version für alle geschrieben — und die schwächeren Schüler scheitern, die stärkeren langweilen sich.

**Schwierigkeit:** Mittel bis gross — Das LLM-Prompt-System muss um Niveauparameter erweitert werden (Wortbankschwellen, Textkomplexität, Scaffolding-Dichte). Die Block-Schemas brauchen optionale `differenzierung`-Felder. Der Export muss drei Dokumente in einem Durchgang produzieren. Der grösste Brocken ist die Qualitätssicherung — alle drei Versionen müssen gleichwertig geprüft werden.

**Priorität:** **Hoch** — Differenzierung ist ein Kernbedürfnis, das kein konkurrierendes Tool gut löst.

---

## 3. Quick-Übung: 1-Klick-Miniübungen für den Unterrichtseinstieg

**Was:** Ein separater Modus ausserhalb des 5-Schritte-Wizards. Lehrkraft tippt ein Thema ein (z.B. „Konjunktiv II", „Passiv im Englischen", „Inhaltsangabe"), wählt einen Aufgabentyp und die Stufe — die App generiert sofort eine einzelne, fokussierte 5-10-Minuten-Übung. Kein Wizard, keine Quelltexte, kein Baukasten. Direkt als DOCX oder als Bildschirm-Anzeige zum Abfotografieren/Abzeichnen an die Tafel.

**Warum:** Der 5-Schritte-Wizard ist perfekt für Schularbeiten und Hausübungen — aber völlig überdimensioniert für „Ich brauche schnell eine 10-Minuten-Übung für den Stundenbeginn." Lehrkräfte greifen dann zum Schulbuch oder googeln. Eine Quick-Übung in 30 Sekunden wäre ein Game-Changer für den täglichen Unterricht.

**Schwierigkeit:** Klein — Die gesamte Generierungs-Pipeline existiert bereits. Es braucht nur einen vereinfachten Einstiegspunkt, der `buildSkelett()` mit sinnvollen Defaults aufruft (1 Block, niedrige Punktzahl, kein Korrekturraster). Das LLM-Prompt ist bereits da. Die UI ist ein einzelner Screen mit Textfeld + Dropdown + Generate-Button.

**Priorität:** **Hoch** — Niedrigster Aufwand, höchster Alltagsnutzen. Das Feature, das Lehrkräfte am häufigsten verwenden würden.

---

## 4. SRDP-Simulation: Matura-Probeklausuren unter Echtbedingungen

**Was:** Ein dedizierter „Matura-Modus" für die Oberstufe. Generiert vollständige SRDP-Prüfungen im offiziellen Format: standardisierte Aufgabenstellung, Zeitlimit (270 Minuten für Deutsch), offizielle SRDP-Bewertungsraster (K1 Inhalt, K1 Textstruktur, K3 Ausdruck, K3 Sprachrichtigkeit mit den 15 Subkriterien), inklusive Deckblatt und Instruktionen im BMBWF-Stil. Optional: Vergleich mit früheren SRDP-Themen (Themenpool).

**Warum:** Die standardisierte Reifeprüfung ist DER Stressfaktor in der Oberstufe. Lehrkräfte suchen händeringend nach authentischem Übungsmaterial im SRDP-Format. Die App hat bereits das SRDP-Assessment in NATASCHA (15 Subkriterien, Stufen 0-4) — aber LUA generiert keine SRDP-formatierten Prüfungen. Das ist eine verschenkte Synergie.

**Schwierigkeit:** Mittel — Das SRDP-Format ist gut dokumentiert (BMBWF-Handreichungen). Die Bewertungsraster sind in NATASCHA bereits implementiert. Das DOCX-Rendering muss ein offizielles Layout unterstützen (neues Template „SRDP"). Der grösste Aufwand ist die Themenpool-Integration und die Sicherstellung, dass die generierten Aufgaben dem SRDP-Niveau entsprechen.

**Priorität:** **Mittel** — Betrifft nur die Oberstufe, aber dort mit extrem hohem Nutzwert. Könnte das Killer-Feature für die Akzeptanz an AHS sein.

---

## 5. Selbsteinschätzungsbogen für Schüler (automatisch generiert)

**Was:** Zu jeder generierten Schularbeit/Übung erstellt die App automatisch einen einseitigen Selbsteinschätzungsbogen. Der Bogen listet alle Kompetenzbereiche und Bewertungskriterien in Schüler-Sprache („Ich kann einen Text sachlich zusammenfassen", „Ich achte auf korrekte Beistrichsetzung") mit einer Skala (trifft zu / teilweise / trifft nicht zu). Schüler füllen ihn VOR der Abgabe aus. Die Lehrkraft sieht die Selbsteinschätzung neben dem Korrekturergebnis.

**Warum:** Forschung zeigt: Metakognition ist einer der stärksten Prädiktoren für Lernerfolg. Schüler, die vor einer Prüfung über ihre eigenen Stärken und Schwächen nachdenken, schneiden signifikant besser ab. Gleichzeitig entlastet es die Lehrkraft — viele „Überraschungen" bei der Notenvergabe entstehen, weil Schüler die Erwartungen nicht kennen. Der Bogen macht Erwartungshaltungen explizit.

**Schwierigkeit:** Klein — Die Kriterien und Lernziele sind im Dokument bereits vorhanden. Der Selbsteinschätzungsbogen ist ein zusätzliches DOCX, das aus den bestehenden Daten (Korrekturraster-Kriterien + Lernziele) automatisch abgeleitet wird. Ein neues Renderer-Template, keine neue Logik. Die Auswertung (Selbsteinschätzung vs. tatsächliches Ergebnis) könnte in der NATASCHA-Korrektur als Zusatzinfo angezeigt werden.

**Priorität:** **Mittel** — Pädagogisch extrem wertvoll, aber kein „Must-have" für den täglichen Betrieb. Perfekt als Feature, das die App von reinen „Erstellungs-Tools" abhebt.

---

## Zusammenfassung

| # | Idee | Aufwand | Priorität | Zielgruppe |
|---|------|---------|-----------|------------|
| 1 | Lehrplan-Kompetenz-Mapping | Mittel | Hoch | Alle (Admin-Nachweis) |
| 2 | Binnendifferenzierung (3 Stufen) | Mittel-Gross | Hoch | Alle (Heterogenität) |
| 3 | Quick-Übung (1-Klick) | Klein | Hoch | Alle (Alltag) |
| 4 | SRDP-Simulation | Mittel | Mittel | Oberstufe |
| 5 | Selbsteinschätzungsbogen | Klein | Mittel | Alle (Pädagogik) |

### Empfohlene Reihenfolge

**3 → 1 → 5 → 2 → 4**

Die Quick-Übung ist der schnellste Win mit dem grössten Alltags-Impact, gefolgt vom Kompetenz-Mapping als strategisches Alleinstellungsmerkmal.

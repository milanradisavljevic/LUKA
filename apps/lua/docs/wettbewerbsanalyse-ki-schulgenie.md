# Wettbewerbsanalyse: KI Schulgenie

**Stand:** 2026-06-07  
**Quelle:** kischulgenie.com, thomasfelzmann.at, lernmarktplatz.de

---

## 1. Wer ist KI Schulgenie?

- **Plattform:** SaaS mit 120+ KI-Tools für Lehrkräfte
- **Herkunft:** Schweiz/Österreich, gegründet von René Mayer (ehemaliger Lehrer)
- **Verbreitung:** 65.000+ Nutzer (laut eigener Angabe), Marktführer D-A-CH nach Eigenaussage
- **Preis:** Standard ~100 EUR/Jahr, Pro höher, Ultimate noch höher; 14 Tage kostenlos testbar
- **Technik:** Cloud-basiert, DSGVO-konform (Schweizer Server), 3-fache KI-Korrektur-Schleife

---

## 2. Was macht KI Schulgenie?

### Kernfunktionalität

1. **Fertige Tool-Maske statt Prompts:** Lehrkraft wählt ein Tool (z.B. "Arbeitsblatt Generator", "Lückentext-Ersteller", "KreuzwortProfi"), füllt Formularfelder aus, drückt auf Los.
2. **Breite statt Tiefe:** 120+ Tools für alle Fächer, alle Schulstufen, alle Use-Cases (Arbeitsblätter, Quizze, Präsentationen, Mindmaps, Bilder, Videos, Korrektur).
3. **PDF/Word-Export:** Ergebnisse als PDF oder DOCX, oder als Link direkt an Schüler.
4. **KI-gestützte Korrektur:** Handschriftliche Texte hochladen, Feedback generieren lassen.
5. **Kein Technikwissen nötig:** "Wenn du ein Google-Formular ausfüllen kannst, kannst du das hier."

### Zielgruppe

Lehrkräfte aller Fächer und Schulstufen, die keine Zeit haben und keine Prompts schreiben wollen. Der Fokus liegt auf Breite und Geschwindigkeit, nicht auf fachspezifischer Tiefe.

---

## 3. Stärken von KI Schulgenie

1. **Marktvorsprung:** 65.000+ Nutzer, etablierte Marke, Kooperationen mit Bildungs-Bloggern.
2. **UX-Fokus:** Keine Prompts, keine Einarbeitung, sofort nutzbar. Das ist die Haupteinwandsbehandlung für technikferne Lehrkräfte.
3. **Breite:** 120+ Tools decken fast jeden Use-Case ab. Wer ein Tool sucht, findet es.
4. **DSGVO-konform:** Schweizer Server, keine Schülerdaten nötig. Das ist ein echtes Verkaufsargument.
5. **Community:** KI-Lernwelt-Community, VIP-Support, aktive Weiterentwicklung.

---

## 4. Schwächen von KI Schulgenie

1. **Generisch statt spezifisch:** Die Tools sind für alle Fächer und Schulstufen gemacht. AHS-Schularbeiten mit offiziellem Notenschlüssel, Erwartungshorizont und Hausstil sind nicht das Ziel.
2. **Keine Quelltexte als Basis:** Die KI generiert Texte aus dem Nichts. Echte Literatur (Kafka, Brecht, Zeitungsartikel) wird nicht verarbeitet.
3. **Keine Integration Erstellung → Korrektur:** Die Korrektur ist ein separates Tool. Sie erbt keine Grundwahrheit aus der Erstellung, sondern muss den Bewertungsmassstab neu aufbauen.
4. **Cloud-basiert:** Daten gehen über Schweizer Server. Für manche Lehrkräfte ist das ein Problem, besonders bei sensiblen Inhalten oder Schülerdaten.
5. **Abo-Modell:** Laufende Kosten (100+ EUR/Jahr). Für eine einzelne Lehrkraft ist das viel, besonders wenn die Schule keine Lizenz zahlt.
6. **Kein Hausstil:** Die Arbeitsblätter sind generisch gestaltet. Es gibt kein festes Layout, das an die eigene Schule oder das eigene Fach angepasst ist.

---

## 5. Was wir besser machen können

### 5.1 Lokale Datenhaltung (Tauri) vs. Cloud

**Unser Vorteil:** Alle Daten bleiben auf dem Rechner der Lehrkraft. Keine Server, keine Cloud, keine Abhängigkeit von einem Anbieter. API-Schlüssel werden lokal gespeichert, Schülerdaten verlassen nie den Rechner.

**Warum das zählt:** Datenschutz ist für Lehrkräfte ein echtes Thema. Besonders bei sensiblen Inhalten (z.B. politische Texte, Schülerarbeiten) ist "lokal" ein starkes Argument. KI Schulgenie kann das nicht bieten, weil es eine Cloud-Plattform ist.

**Konkret:** Tauri-App mit lokaler Schlüsselablage, keine Datenübertragung ausser dem reinen API-Aufruf an den LLM-Anbieter.

---

### 5.2 Intent-first mit Typ-Profilen

**Unser Vorteil:** Die Lehrkraft beschreibt die Absicht ("Schularbeit, Deutsch, 7A, Medienkonsum, 50 Minuten"), und die App generiert einen vollständigen Entwurf. Typ-Profile (HÜ, Test, Schularbeit) legen die Struktur fest, nicht die KI.

**Warum das zählt:** KI Schulgenie bietet 120+ Tools, aber keines davon versteht "AHS-Schularbeit nach offiziellem Notenschlüssel". Unsere Typ-Profile sind genau das: vordefinierte Strukturen für echte Use-Cases, nicht generische Arbeitsblätter.

**Konkret:** Drei Typ-Profile (HÜ, Test, Schularbeit) mit fester Struktur, Punkteverteilung und Raster-Logik. Die Lehrkraft wählt den Typ, die App liefert den Rest.

---

### 5.3 Integrierter Korrektur-Kreis

**Unser Vorteil:** Das Korrekturraster entsteht bei der Erstellung, nicht nachträglich. Die Korrektur erbt perfekte Grundwahrheit: bekannte richtige Antworten, bekannte Punkteverteilung, bekannter Notenschlüssel.

**Warum das zählt:** KI Schulgenie hat Korrektur als separates Tool. Die Lehrkraft muss den Bewertungsmassstab neu eingeben oder die KI raten lassen. Bei uns ist der Massstab schon da, weil er bei der Erstellung entstanden ist. Das ist der Burggraben.

**Konkret:** Geschlossene Aufgaben werden nach dem Einscannen automatisch gegen die bekannte Lösung geprüft. Offene Aufgaben werden gegen das bekannte Raster bewertet. Die Note rechnet sich automatisch.

---

### 5.4 Quelltexte als Basis

**Unser Vorteil:** Die Lehrkraft bringt echte Texte mit (Kafka, Brecht, Zeitungsartikel), und die App generiert Aufgaben dazu. Die KI erfindet keine Texte, sondern arbeitet mit dem, was die Lehrkraft vorgibt.

**Warum das zählt:** KI Schulgenie generiert Texte aus dem Nichts. Das ist für einfache Arbeitsblätter okay, aber für Schularbeiten mit echten literarischen Texten unbrauchbar. Unsere Quelltexte als Basis sind der Unterschied zwischen "KI schreibt Arbeitsblatt" und "KI arbeitet mit meinem Text".

**Konkret:** Upload von .txt, .docx, .html, oder Copy-Paste. Die App generiert Aufgabenblöcke basierend auf dem Text.

---

### 5.5 Hausstil-Rendering

**Unser Vorteil:** Feste Layout-Vorlagen für AHS-Schularbeiten (0,5 pt schwarze Ränder, Calibri 11, bestimmte Zeilenabstände). Das ist der offizielle Stil, den Lehrkräfte brauchen.

**Warum das zählt:** KI Schulgenie generiert generische Arbeitsblätter. Es gibt keinen Hausstil, der an die eigene Schule oder das eigene Fach angepasst ist. Bei uns ist der Stil fest im Code eingebaut, nicht konfigurierbar, aber genau richtig für AHS.

**Konkret:** `packages/renderer` hat feste Layout-Regeln, die nicht über die UI änderbar sind. Das ist Absicht: Der Stil ist Teil des Produkts, nicht der Konfiguration.

---

### 5.6 Bring your own keys

**Unser Vorteil:** Keine Abo-Kosten, nur API-Kosten. Die Lehrkraft nutzt ihre eigenen Schlüssel (Anthropic, OpenAI, DeepSeek, etc.) und zahlt nur für das, was sie verbraucht.

**Warum das zählt:** 100+ EUR/Jahr für KI Schulgenie ist viel, besonders wenn die Schule nicht zahlt. Bei uns zahlt die Lehrkraft nur die API-Kosten (z.B. 0.50 EUR pro Schularbeit mit Claude Sonnet). Das ist ein echter Kostenvorteil.

**Konkret:** Tauri-App mit lokaler Schlüsselablage. Die Lehrkraft bringt ihre eigenen Schlüssel mit, die App nutzt sie direkt.

---

## 6. Wo wir schwächer sind (ehrlich)

1. **Marktvorsprung:** KI Schulgenie hat 65.000+ Nutzer und eine etablierte Marke. Wir starten bei Null.
2. **UX-Polish:** KI Schulgenie ist poliert, getestet, optimiert. Unsere App ist MVP-Status.
3. **Breite:** KI Schulgenie hat 120+ Tools für alle Use-Cases. Wir haben ein Tool für einen Use-Case (AHS-Schularbeiten).
4. **Support:** KI Schulgenie hat VIP-Support, Community, aktive Weiterentwicklung. Wir sind ein kleines Team.
5. **Installation:** KI Schulgenie ist eine Web-App, sofort nutzbar. Unsere App muss installiert werden (Tauri-Installer).

---

## 7. Positionierung: Wo wir spielen

Wir spielen nicht im selben Markt wie KI Schulgenie. Wir sind kein "120+ Tools für alle Fächer"-Anbieter. Wir sind ein spezialisiertes Werkzeug für AHS-Lehrkräfte, die Schularbeiten mit echten Quelltexten erstellen und korrigieren müssen.

**Unser Markt:** AHS-Lehrkräfte in Österreich (und später Deutschland/Schweiz), die Deutsch, Englisch, Geschichte oder andere textbasierte Fächer unterrichten und pro Jahr 4-6 Schularbeiten pro Klasse erstellen müssen.

**Unser Versprechen:** Von der Idee zur fertig korrigierten Schularbeit in einem Workflow, mit minimalem Zeitaufwand, weil ein einziges Datenmodell den ganzen Weg trägt.

**Unser Preis:** Keine Abo-Kosten, nur API-Kosten. Die App ist kostenlos (Open Source oder einmaliger Kauf), die Lehrkraft zahlt nur für die LLM-Aufrufe.

---

## 8. Konkrete Angriffsfläche

### 8.1 Datenschutz als Keil

KI Schulgenie ist Cloud-basiert. Wir sind lokal. Für Lehrkräfte, die keine Daten ausser Haus geben wollen (oder dürfen), ist das der entscheidende Unterschied.

**Marketing-Angle:** "Deine Schularbeiten bleiben bei dir. Keine Cloud, keine Server, keine Abhängigkeit."

### 8.2 Kosten als Keil

KI Schulgenie kostet 100+ EUR/Jahr. Wir kosten nur API-Kosten (ca. 0.50 EUR pro Schularbeit). Für eine Lehrkraft mit 5 Klassen und 5 Schularbeiten pro Jahr sind das 12.50 EUR statt 100 EUR.

**Marketing-Angle:** "Zahl nur für das, was du verbrauchst. Kein Abo, keine versteckten Kosten."

### 8.3 Tiefe als Keil

KI Schulgenie ist breit, aber flach. Wir sind schmal, aber tief. Für AHS-Schularbeiten mit offiziellem Notenschlüssel, Erwartungshorizont und Hausstil gibt es nichts Besseres.

**Marketing-Angle:** "Das einzige Tool, das AHS-Schularbeiten versteht."

---

## 9. Fazit

KI Schulgenie ist ein starker Konkurrent mit Marktvorsprung, guter UX und breiter Abdeckung. Aber sie sind generisch, Cloud-basiert und Abo-finanziert. Das sind ihre Schwächen.

Unsere Stärken sind: lokale Datenhaltung, Integration Erstellung → Korrektur, Quelltexte als Basis, Hausstil, Bring your own keys. Das sind echte Differenzierungsmerkmale, die KI Schulgenie nicht nachbauen kann, ohne ihr gesamtes Modell zu ändern.

Wir spielen nicht im selben Markt. Wir sind kein "120+ Tools"-Anbieter, sondern ein spezialisiertes Werkzeug für AHS-Schularbeiten. Das ist kleiner, aber tiefer, und das ist unsere Chance.

---

## 10. Nächste Schritte

1. **Produktvision schärfen:** "Das einzige Tool, das AHS-Schularbeiten versteht" als Kernbotschaft.
2. **Tauri-Migration:** Lokale Datenhaltung als technischen Vorteil umsetzen.
3. **Intent-first Flow:** Absicht-zuerst-Logik als UX-Vorteil umsetzen.
4. **Korrektur-Kreis:** Integrierte Korrektur als Burggraben ausbauen.
5. **Marketing-Angle:** Datenschutz, Kosten, Tiefe als drei Keile gegen KI Schulgenie.

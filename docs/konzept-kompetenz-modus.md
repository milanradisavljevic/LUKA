# Konzept: Kompetenz-basierter Übungsgenerator („Kompetenz-Modus")

*Stand: 2026-06-11 · Status: durchdachtes Konzept, noch nicht umgesetzt*
*Beteiligt: Natascha (Praxis-Insight), Milan, Claude (Architektur)*

---

## 1. Problem & Reframe (von Natascha)

Lehrkräfte planen Unterricht **nicht über allgemeine Themen**. Ein Thema (z. B.
„Reisen", „Klimawandel") ist nur die **Ummantelung** für das eigentliche Lernziel —
die **Kompetenz**: *Konjunktiv II*, *englische Zeiten*, *Kommasetzung*, *Argumentieren*.

Die heutige App ist aber **themen-/textgetrieben**: Man gibt ein Thema + Quelltext ein,
und die KI leitet Aufgaben **aus dem Text** ab. Das ist stark für Inhalts-Kompetenzen
(Textinterpretation, Leseverständnis, Zusammenfassung) — aber **ungeeignet** für
sprachliche Drills, die *keinen* Quelltext haben und bei denen die KI Beispiele
**erfinden muss**.

> **Reframe:** Planungseinheit = **Lehrplan-Kompetenz**. Das Thema ist optionaler Kontext.

**Technischer Beleg:** Der aktuelle Prompt sagt wörtlich „leite alle Inhalte strikt aus
den Quelltexten ab, erfinde keine Fakten"; jeder Aufgabenblock trägt eine `quelleId`;
die Generierungs-Guards verlangen ≥ 80 Wörter Quelltext. Kompetenz-Drills brauchen das
**Gegenteil**. (Immerhin: `quelleId` ist im Schema bereits optional.)

---

## 2. Lösung: Zwei komplementäre Modi

| | **Text-Modus** (heute) | **Kompetenz-Modus** (neu) |
|---|---|---|
| Primär-Input | Quelltext (Thema → Text) | **Lehrplan-Kompetenz / Stoff-Item** |
| Thema | das Eigentliche | nur Kontext-Ummantelung (optional) |
| KI erfindet Inhalt? | nein (textgebunden) | **ja** (Beispiele zur Kompetenz) |
| Stark für | Inhalt, Analyse, Lesen | Grammatik, Wortschatz, Rechtschreibung |

Beide Modi laufen über **dieselbe** Generierungs-/Render-/Export-Pipeline. Der
Kompetenz-Modus braucht nur einen **neuen Prompt-Modus** (ohne „nicht erfinden"-Regel,
quelltextfrei) und gelockerte Guards.

---

## 3. Datenmodell: Zwei Ebenen, verlinkt

Der offizielle Lehrplan ist **abstrakt** formuliert („setzt grammatische Strukturen
normgerecht ein"). Die reale Planungseinheit ist **konkret** („Konjunktiv II"). Diese
konkreten Items stehen oft gar nicht im rechtlichen Lehrplan, sondern in
Schulbuch/Stoffverteilung. Deshalb zwei verlinkte Ebenen:

**Ebene 1 — Lehrplan (Nachweis/Coverage):**
```
Fach → Stufe → Kompetenzbereich → Deskriptor { id, code, text, quelle (BGBl/RIS) }
```
Rechtsverbindliche Referenz, read-only.

**Ebene 2 — Stoffkatalog (Generator-Input, die Planungseinheit):**
```
StoffItem { id, titel ("Konjunktiv II"), fach, stufe, kategorie,
            deskriptorIds[]  → Verweis auf Ebene 1,
            defaultAufgabentypen[] }
```

Der Link `StoffItem.deskriptorIds[]` liefert die **Lehrplan-Abdeckung / den Nachweis
gratis** (siehe §6).

**Vorhandener Asset:** Für Oberstufe-Deutsch existiert ein Kompetenzmodell bereits im
Repo — NATASCHAs SRDP-Bewertung (K1/K3, 15 Subkriterien). Dort nicht bei null starten.

---

## 4. Aufgabentypen: Format-Kartierung

Die 14 vorhandenen Block-Typen sind alle inhalts-/textorientiert. Abgleich mit dem, was
Lehrkräfte real brauchen:

| Kompetenz-Kategorie | Abdeckung durch bestehende Typen | Lücke |
|---|---|---|
| **Grammatik/Strukturen** | Einsetzen→Lückentext, richtige Form→MultipleChoice, Regel↔Beispiel→Matching/Kategorisierung, Konjugation→Tabelle | **Umformung 🔲 · Fehlerkorrektur 🔲 · Satzbildung 🔲** |
| **Wortschatz** | Vokabelübung, WordScramble, Kreuzwort, Wortgitter, Kategorisierung, Cloze | — (voll) |
| **Rechtschreibung/Zeichensetzung** | Kommas→Markieraufgabe, Cloze | **Fehlerkorrektur 🔲** (dieselbe) |
| **Schreiben/Textproduktion** | offeneSchreibaufgabe (braucht keinen Quelltext) | — |
| **Sprachreflexion/Stil** | stiluebung (verdeutlichen/kürzen/…) | — |
| **Leseverstehen** | = Text-Modus (bestehend) | — |
| **Hörverstehen** | braucht Audio → DOCX kann's nicht | außer Scope |

> **Ergebnis:** Die ganze Lücke kollabiert auf **genau 2 neue Block-Typen** —
> **Umformung/Transformation** und **Fehlerkorrektur** (Satzbildung optional als 3.).
> Beide fächerübergreifend (DE + EN). Je Typ: Schema + Renderer + Prompt + Vorschau.

---

## 5. UI-Einstieg: Zwei Türen, eine Engine

- **Schnell-Einstieg** (eigener Sidebar-Punkt, 1 Screen): Kompetenz/Stoff-Item wählen
  + optional Thema + Aufgabentyp + Niveau → **sofort eine Übung**. Für den
  10-Minuten-Stundeneinstieg (= ursprüngliche „Quick-Übung").
- **Wizard-Modus-Switch** in Schritt 1: „**Aus Quelltext** (heute) ODER **Aus
  Kompetenz**". Im Kompetenz-Zweig entfällt der Quelltext-Schritt; stattdessen eine oder
  mehrere Kompetenzen + Kontext. Für **Schularbeiten über mehrere Kompetenzen**.

Beide Türen füttern denselben Kompetenz-Modus-Generator — kein Doppelbau.

---

## 6. Niveaustufen & Differenzierung

Niveau ist im Kompetenz-Modus nur ein **Generierungs-Parameter**
(Basis / Standard / Erweitert), der steuert: Satzkomplexität, Scaffolding
(Wortbank/Beispiel vorgeben), Item-Anzahl, Distraktoren. Stufen-abhängige Defaults
existieren bereits (z. B. Wortbank + Distraktoren bei Unterstufe; `zielniveau` bei
Stilübung).

Weil der Inhalt **erfunden** wird (kein Quelltext, der drei Niveaus versöhnen muss),
ist **„3 Versionen aus einem Master"** hier *natürlich*: gleiche Kompetenz + Thema,
dreimal mit anderem Niveau-Parameter generiert.

---

## 7. Coverage / Nachweis (administrativer Mehrwert)

Da die Kompetenz der *Eingang* ist, fällt die Lehrplan-Abdeckung gratis ab:
`Block → StoffItem → deskriptorIds[] → Deskriptoren`. Eine Übersicht zeigt „Diese
Schularbeit deckt ab: Deskriptor X, Y, Z — Bereich W fehlt", exportierbar als
Kompetenzraster für die Dokumentation gegenüber Direktion/Inspektion.

---

## 8. Validierung ohne Quelltext

Der heutige Qualitäts-Judge prüft Antworten *gegen den Quelltext*. Im Kompetenz-Modus
ist die Wahrheitsquelle die **sprachliche Korrektheit**:

- **Kompetenz-bewusster Judge** (neue Prompt-Variante): prüft die grammatische
  Korrektheit des Lösungsschlüssels + ob die Übung die Kompetenz wirklich trainiert +
  Niveau-Fit. LLMs sind bei DE/EN-Grammatik genau hier stark.
- **Verifier-Durchgang** (billig): „Löse die Übung selbst, vergleiche mit dem Schlüssel"
  → bei Abweichung greift die vorhandene Reparaturrunde (2 Versuche).
- **Mensch als Netz:** Die Lehrkraft prüft/editiert ohnehin vor dem Einsatz (Vorschau +
  Block-Regenerieren existieren).

> Ehrliche Erwartung: ein **hochwertiger Entwurf, den die Lehrkraft gegenliest** — nicht
> „fehlerfrei garantiert". Für ein Lehrer-Werkzeug die richtige Haltung.

---

## 9. Das verbindende Rückgrat

Der Kompetenz-Modus ist **kein Einzelfeature**, sondern subsumiert vier Ideen aus dem
Brainstorming auf einmal:

- **Quick-Übung** = die Schnell-Tür.
- **Lehrplan-Kompetenz-Mapping** = das Datenmodell + Coverage.
- **Binnendifferenzierung (3 Stufen)** = der Niveau-Parameter.
- **Das Reframe selbst** = Kompetenz als Eingang.

---

## 10. Phasing (dünner vertikaler Schnitt zuerst)

1. **Datenmodell/Schema** (Lehrplan + Stoffkatalog, verlinkt; trägt den vollen Lehrplan,
   anfangs leer).
2. **Proof-Slice:** EIN Kompetenzbereich (z. B. Englisch „Tenses") mit ~5–10 Stoff-Items
   + verlinkten Deskriptoren.
3. **Kompetenz-Modus-Generator** — das riskanteste Stück (Qualität ohne Quelltext)
   **zuerst beweisen** an realen Items.
4. **Coverage/Nachweis-Export.**
5. **Progressive Kuratierung** der restlichen Bereiche/Fächer/Stufen (KI-Entwurf +
   Mensch-Prüfung gegen RIS/BGBl).

---

## 11. Risiken (ehrlich)

- **Kuratierungsaufwand** des vollen BMBWF-Lehrplans (DE + EN, Unter-/Oberstufe): groß,
  fortlaufend, kann bei Lehrplanreformen veralten. → inkrementell füllen, nicht „erst
  alles".
- **Generierungsqualität ohne Quelltext** → braucht den kompetenz-bewussten Judge
  (§8); Restrisiko bewusst über das Mensch-Netz gemanagt.
- **Rechtsquellen-Treue** der Deskriptoren (wörtlich/akkurat aus RIS/BGBl; KI darf
  entwerfen, Mensch muss prüfen).

---

## 12. Empfehlung zur Reihenfolge

Architektonisch empfohlen: **erst Auslieferbarkeit** (Windows-Build, Python-Bündelung,
DOCX-Öffnen) **+ Natascha-Testfeedback**, *dann* dieses große Feature — beginnend mit
dem **Generator-Proof auf einem Mini-Datensatz**, bevor die volle Lehrplan-Kuratierung
investiert wird.

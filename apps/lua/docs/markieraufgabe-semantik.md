# Markieraufgabe — Semantik (Audit D-7)

Klärt, was eine `markieraufgabe` bedeutet, wie Lösung und Quelltext zusammenhängen
und wie sie gerendert/geprüft wird. Verbindlich für LLM-Prompt, Renderer und QA.

## Zweck

Die Schüler*innen markieren **Stellen im Quelltext**, die ein Kriterium erfüllen
(z. B. „Markiere alle Adjektive", „Unterstreiche die Argumente der Gegenseite").
Es ist eine **rezeptive, geschlossene** Aufgabe: die korrekten Markierungen stehen fest.

## Datenmodell (`packages/schema`)

```
config: {
  quelleId: string   // Pflicht — verweist auf den zu markierenden Quelltext
  anweisung: string  // was markiert werden soll (Imperativ, Du)
}
loesung: {
  stellen: string[]  // die korrekt zu markierenden Textstellen (mind. 1)
}
```

## Verbindliche Regeln

1. **`loesung.stellen` sind WORTWÖRTLICHE Teilstrings des Quelltexts** (`quelltexte[quelleId].inhalt`).
   Keine Paraphrasen, keine Zusammenfassungen. Das `checkGrounding` in
   `packages/llm/src/quality.ts` prüft die Stellen strikt wortwörtlich gegen den Quelltext.
2. **Granularität:** Eine „Stelle" ist die kleinste sinnvolle zusammenhängende Einheit
   (ein Wort, eine Wortgruppe oder ein Satz) — nicht ganze Absätze, wenn nur ein Teil gemeint ist.
3. **Vollständigkeit:** `stellen` enthält **alle** Stellen, die die `anweisung` erfüllen
   (nicht nur Beispiele). Die Aufgabe ist nur fair korrigierbar, wenn die Lösung vollständig ist.
4. **Mehrfachvorkommen:** Kommt eine Stelle mehrfach im Text vor und sind alle Vorkommen
   zu markieren, wird sie **einmal** in `stellen` gelistet (die Korrektur akzeptiert alle Vorkommen).
5. **`quelleId` ist Pflicht** und muss auf einen vorhandenen Quelltext zeigen.

## Rendering (`packages/renderer`)

- **Schülerfassung:** Der Quelltext wird mit linker Randlinie eingerückt ausgegeben
  (Platz zum Markieren), darunter die `anweisung`. Keine Lösung sichtbar.
- **Lösungsfassung:** Zusätzlich eine Liste „Zu markierende Stellen:" mit den `stellen`
  als kursive Aufzählung.
- Zeilenumbrüche im Quelltext bleiben erhalten (`mehrzeiligRuns`).

## Abgrenzung

- **markieraufgabe ≠ lueckentext:** Beim Lückentext fehlen Wörter; hier bleibt der Text
  vollständig, es wird nur markiert.
- **markieraufgabe ≠ offeneVerstaendnisfrage:** Keine frei formulierte Antwort, sondern
  Markierung vorhandener Textstellen (geschlossen, eindeutig korrigierbar).

## Korrektur (Ausblick Phase E)

Weil `stellen` wortwörtlich sind, ist die spätere automatische Korrektur ein
deterministischer Abgleich „markierte Stelle ⊆ erwartete Stellen" — kein KI-Urteil nötig.

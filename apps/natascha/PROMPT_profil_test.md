# Claude-Code-Auftrag: Profil-Prompt einbauen + Test-Knopf + synthetische Testdaten

## Kontext

Das dreischichtige Längsschnitt-System steht (siehe ARCHITECTURE.md):
- Schicht 1: `natascha_db.get_schueler_laengsschnitt(db_path, schueler_id)` — Aggregation.
- Schicht 2: `SchuelerDetailScreen` in `natascha.py` — zeigt den Verlauf.
- Schicht 3: `natascha_core.build_schueler_profil_prompt(laengsschnitt)` — datenminimierter
  Prompt-Builder, bisher nur Entwurf, KEIN Aufruf.

Dieser Auftrag macht drei Dinge:
1. Den instruktiven Teil von `build_schueler_profil_prompt` durch eine verfeinerte,
   pädagogisch dichtere Fassung ersetzen (Wortlaut unten, GENAU übernehmen).
2. Im `SchuelerDetailScreen` einen Knopf "KI-Profil erstellen" ergänzen, der NUR auf
   Klick den Prompt baut, EINEN LLM-Call macht und das Ergebnis anzeigt.
3. Ein eigenständiges Skript `seed_testdaten.py`, das einen synthetischen Schüler mit
   3–4 Arbeiten in die DB schreibt, damit der Knopf etwas zum Verdichten hat.

## WICHTIG — zuerst lesen, dann bauen

- `natascha_core.build_schueler_profil_prompt` (aktueller Entwurf) — nur den Text-/
  Instruktionsteil ersetzen, das Datengerüst (verlauf/trend/fehlerschwerpunkte, die
  `_fmt`- und `_trendzeile`-Helfer, die 6-Wörter-Kürzung der Zitate) BLEIBT unverändert.
- `natascha_db.get_schueler_laengsschnitt` — Rückgabestruktur, damit der Test-Knopf und
  das Seed-Skript dieselben Felder bedienen.
- `natascha.py`: `SchuelerDetailScreen` (Aufbau, wie er den Längsschnitt lädt und
  anzeigt, vorhandene Buttons/Bindings), und wie LLM-Calls in der App laufen
  (`@work(thread=True)`-Muster, `run_llm_api`/`run_llm_analysis`, cancel_event,
  Fehleranzeige via notify). Den Test-Knopf an dieses Muster anpassen.
- `natascha_db.insert_schueler`, `insert_abgabe`, `insert_kriterium`, `insert_fehler`,
  `upsert_lehrer_feedback` — die nutzt das Seed-Skript.
- `natascha_config.toml` — aktiver Provider/Modell (für den Testaufruf).

Stil: `from __future__ import annotations`, deutsche Docstrings, snake_case, Typ-Hints,
keine neuen Dependencies.

## Schritt 1 — Verfeinerter Profil-Prompt (Wortlaut GENAU übernehmen)

Ersetze in `build_schueler_profil_prompt` den instruktiven Teil (Rolle, Aufgabe,
Output-Schema) durch den folgenden Text. Das Datengerüst (VERLAUF, TREND,
FEHLERSCHWERPUNKTE) wird wie bisher aus dem Aggregat zusammengesetzt und VOR den
Instruktionsblock gestellt. Der Instruktionsblock lautet:

```
Du bist eine erfahrene AHS-Deutschlehrerin in Österreich und schreibst eine
Lernverlaufs-Einschätzung für eine Kollegin, die diesen Schüler übernommen hat.
Schreibe so, wie du es einer geschätzten Kollegin im Konferenzzimmer sagen würdest:
fachlich genau, ehrlich, aber wohlwollend. Du-Anrede an die Kollegin, nie an den
Schüler.

Datenbasis sind aggregierte Kennzahlen aus mehreren korrigierten Arbeiten desselben
Schülers. Es liegen bewusst keine Namen und keine Texte vor, nur Zahlen und kurze
Fehlerbeispiele.

SO LIEST DU DIE DATEN (wichtig, halte dich daran):
- Eine einzelne schwache Arbeit zwischen besseren ist meist ein Ausreißer, keine
  Tendenz. Benenne den Trend über mehrere Arbeiten, nicht einen einzelnen Einbruch.
- Eine Stagnation auf hoher Stufe (4 bis 5) ist gefestigtes Können, keine Schwäche.
  Eine Stagnation auf niedriger Stufe (1 bis 2) ist ein Förderauftrag. Unterscheide das.
- Die Spreizung zwischen K1 (Inhalt und Struktur) und K3 (Ausdruck und Sprachnormen)
  erzählt das eigentliche Profil: Ein Schüler mit starkem K1 und schwachem K3 hat etwas
  zu sagen, aber Mühe mit der Form. Umgekehrt deutet starkes K3 bei schwachem K1 auf
  sprachliche Sicherheit ohne inhaltliche Tiefe. Mache diese Unterscheidung explizit.
- Wenn App-Note und Lehrer-Note auseinanderliegen, deute es vorsichtig: Eine mildere
  Lehrer-Note kann auf sichtbare Anstrengung, mündliche Stärke oder Kontext hindeuten,
  den die reine Textanalyse nicht sieht. Behaupte nichts, biete es als Lesart an.
- Bei den Fehlerschwerpunkten zählt das Muster, nicht die Einzelzahl: Wenn ein Fehlertyp
  über mehrere Arbeiten dominiert, ist das der lohnendste Übungsansatz.

DEINE EINSCHÄTZUNG:
- Beginne mit echten Stärken, konkret an der Entwicklung festgemacht, nicht pauschal.
- Benenne dann die Förderbereiche ehrlich, jeweils mit einem konkreten, in der Klasse
  umsetzbaren Übungsvorschlag, der auf die schwächste SRDP-Kategorie zielt.
- Bei Oberstufe: Verorte den Stand mit Blick auf die Matura. Sage konkret, welche
  Kategorie bis zur Reifeprüfung noch tragen muss und wo der Hebel liegt. Sei dabei
  realistisch, nicht beschönigend und nicht entmutigend.

Keine KI-Floskeln ("Es wäre ratsam", "Man könnte", "Es lässt sich feststellen").
Schreibe wie ein Mensch mit Unterrichtserfahrung, auf Deutsch mit korrekten Umlauten.

Antworte NUR mit validem JSON in dieser Form:
{
  "kurzbild": "2-3 Sätze Gesamtbild des Schülers, wie eine mündliche Einschätzung",
  "staerken": ["konkrete Stärke mit Bezug zur Entwicklung", ...],
  "foerderbereiche": [
    {"kategorie": "Sprachrichtigkeit", "befund": "was die Daten zeigen",
     "uebung": "konkreter, in der Klasse umsetzbarer Übungsvorschlag"}
  ],
  "maturabezug": "nur Oberstufe: realistische Verortung mit Blick auf die Matura, sonst leer"
}
```

Der bestehende DSGVO-Regressionstest muss weiterhin grün sein (kein Name/keine Klasse im
Prompt). Falls der Test den alten Output-Wortlaut prüft, anpassen — aber die
DSGVO-Assertions (Felix/Müller/6i nicht enthalten) bleiben.

## Schritt 2 — Test-Knopf im SchuelerDetailScreen

Ergänze im `SchuelerDetailScreen` einen Button, z. B. "KI-Profil erstellen". Verhalten:
- NUR auf Klick aktiv. KEIN automatischer Aufruf beim Öffnen des Screens, bei keiner
  anderen Aktion. Der LLM-Call darf ausschließlich durch diesen Klick ausgelöst werden.
- Beim Klick: `laengsschnitt` des aktuellen Schülers holen (ist im Screen schon geladen),
  `build_schueler_profil_prompt(laengsschnitt)` aufrufen, dann EINEN `run_llm_api`-Call
  mit dem aktiven Provider/Modell aus der Config. Im `@work(thread=True)`-Muster wie die
  bestehenden LLM-Calls, mit cancel_event und Ladeanzeige ("Profil wird erstellt …").
- Antwort als JSON parsen (`extract_json_from_llm`) und lesbar darstellen: kurzbild,
  Stärken (Liste), Förderbereiche (kategorie/befund/uebung), maturabezug. Bei Oberstufe
  maturabezug zeigen, sonst weglassen.
- Defensiv: Bei API-Fehler (Antwort beginnt mit "FEHLER") oder JSON-Fehler eine
  freundliche notify-Meldung, kein Crash. Bei einem Schüler mit nur 1 Arbeit den Knopf
  trotzdem erlauben, aber im Prompt steht ohnehin nur 1 Arbeit — das ist ok für den Test.
- WICHTIG: Vor dem Call NICHTS aus laengsschnitt["schueler"] in den Prompt geben — das
  erledigt build_schueler_profil_prompt schon, aber stelle sicher, dass der Knopf nicht
  versehentlich den Namen mitschickt. Der Name darf nur lokal zur Überschrift der Anzeige
  dienen ("Profil für {Vorname}"), nicht im Call.
- Hinweis-Label am Knopf oder darunter (dezent): "Sendet anonymisierte Kennzahlen an den
  aktiven LLM-Provider." — damit beim späteren Echtbetrieb klar ist, was passiert.

Styling an natascha.tcss orientieren, vorhandene Button-Klassen nutzen.

## Schritt 3 — Seed-Skript `seed_testdaten.py` (eigenständig, im Projektordner)

Ein Skript, das EINEN synthetischen Schüler mit 3–4 Arbeiten in die DB schreibt, damit
Schicht 2 und der Test-Knopf etwas anzeigen. Eigenständig, kein App-Start nötig.

Anforderungen:
- Liest den DB-Pfad über `natascha_db.get_db_path(load_config())`, ruft `init_db`.
- Legt eine Klasse + einen Schüler an (frei erfundener Name, z. B. "Testschueler Mona",
  Klasse "TEST-7a") — KEIN echter Name. Idempotent: bei erneutem Lauf nicht duplizieren
  (über get_schueler_by_name prüfen).
- Schreibt 3–4 Abgaben mit aufsteigender Tendenz (damit der Trend "steigt" sichtbar wird),
  jeweils mit:
  * vier Kriterien (inhalt/textstruktur/ausdruck/sprachrichtigkeit) via insert_kriterium,
    Stufen z. B. Arbeit1: 2/2/2/1, Arbeit2: 3/2/3/2, Arbeit3: 3/3/3/3, Arbeit4: 4/3/4/3.
  * note via insert_abgabe (passend zur Stufe, grob 6 - Schnitt gerundet).
  * ein paar Fehler via insert_fehler mit realistischen Typen (Z, R, G, A) und kurzen,
    erfundenen Zitaten — bei den ersten Arbeiten mehr Z-Fehler, später weniger
    (zeigt Förderschwerpunkt + Verbesserung).
  * datei_hash: deterministisch aus einem festen String je Arbeit (hashlib), damit das
    Skript idempotent ist und insert_abgabe nicht an der UNIQUE-Constraint scheitert.
    Bei bereits existierendem Hash die Arbeit überspringen.
- Bei 1–2 der Arbeiten zusätzlich ein lehrer_feedback (upsert_lehrer_feedback) mit einer
  note_final, die leicht von der App-Note abweicht (z. B. App 3, Lehrer 2) — damit die
  Kalibrierungs-Anzeige und die App-vs-Lehrer-Gegenüberstellung etwas zeigen.
- Am Ende: print, welche schueler_id angelegt wurde und wie man sie in der App findet.
- Klare Doku im Docstring: "Nur für Testdaten. Legt einen synthetischen Schüler an.
  Mehrfach ausführbar (idempotent)."

Schreibe KEINEN automatischen Test dafür (es ist ein Hilfsskript), aber stelle sicher,
dass es ohne Fehler durchläuft und idempotent ist.

## Schritt 4 — Verifikation

- `python3 -m pytest tests/` grün (inkl. angepasstem Profil-Prompt-Test + DSGVO-Test).
- `ruff check` auf den geänderten Dateien ohne neue Findings.
- `python3 seed_testdaten.py` läuft durch, legt Schüler an, zweiter Lauf dupliziert nicht.
- Manuell: App starten, Testschüler öffnen, Verlauf sichtbar (Trend steigt, App- vs.
  Lehrer-Note nebeneinander), Knopf "KI-Profil erstellen" klicken → Profil erscheint.
- CHANGELOG.md kurz ergänzen.

## Grenzen / NICHT tun

- Der LLM-Call darf NUR durch den Knopf-Klick ausgelöst werden, nie automatisch.
- Kein Name, keine Klasse, kein Dateiname in den Prompt/Call (nur lokal zur Anzeige).
- Datengerüst von build_schueler_profil_prompt nicht umbauen, nur den Instruktionstext.
- Keine neuen Dependencies.
- seed_testdaten.py schreibt ausschließlich synthetische Daten mit erfundenem Namen.

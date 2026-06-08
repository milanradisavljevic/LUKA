# SECURITY AUDIT — NATASCHA

**Datum:** 2026-05-29 | **Version:** 0.7.3 | **Prüfer:** Code-Audit (automatisiert + manuell)
**Einsatzkontext:** Österreichische Schule, DSGVO strikt anwendbar (Verarbeitung von
Schülerdaten besonders schützenswert).

## Zusammenfassung

| Bereich | Bewertung | Handlungsbedarf |
|---------|-----------|-----------------|
| API-Key-Handling | ✅ Gut | keiner |
| DSGVO — lokale Speicherung | 🟠 mittel (Quick-Fix angewendet) | Restmaßnahmen offen |
| DSGVO — LLM-Übermittlung | 🔴 hoch | AVV + Anonymisierungs-Konzept |
| Input-Validierung | 🟡 gering | XML-/Zip-Bomb-Härtung optional |
| Dependencies | ✅ behoben | pillow/lxml aktualisiert (2026-05-29) |
| Path-Traversal | ✅ gering | keiner |

In dieser Session **bereits umgesetzt:** `.gitignore` um `*.db`, `*.sqlite*`, `*.docx`,
`*.odt`, `*.pdf` erweitert (siehe DSGVO-1).

---

## 1. API-Key-Handling — ✅ OK

- Keys werden ausschließlich über `os.environ.get()` gelesen
  (`natascha_core.py:2047-2185`); **kein** hardcodierter Key im Code.
- `.env` ist in `.gitignore` (Zeile 2); Template `natascha.env.example` ist eingecheckt
  und enthält keine echten Keys.
- Lade-Logik: `_load_dotenv()` nutzt `python-dotenv` falls vorhanden, sonst einen
  Fallback-Parser (`natascha_core.py:60-78`) mit `override=False` — bestehende Umgebungs-
  variablen werden nicht überschrieben.
- Keys werden **nicht** in Fehlermeldungen oder Logs ausgegeben. Fehlertexte bei fehlendem
  Key nennen nur den Variablennamen (z. B. `"FEHLER: ANTHROPIC_API_KEY nicht gesetzt"`).
- `.env` enthält lokal echte Keys — das ist akzeptabel, da gitignored. **Empfehlung:** Keys
  bei Verdacht auf Weitergabe rotieren; `.env`-Dateirechte auf `600` setzen.

---

## 2. Datenschutz / DSGVO

### DSGVO-1 — Lokale Schüler-Datenbank nicht von Git ausgeschlossen — 🟠 → behoben

**Befund:** `natascha_schuljahr.db` (SQLite) speichert personenbezogene Daten — Schüler-
namen, Klassenzugehörigkeit, Abgaben, Noten- und Fehler-Historie (Schema in
`natascha_db.py:24-80`). Diese Datei war **weder von Git getrackt noch in `.gitignore`**
(`git check-ignore` → „NOT ignored"). Ein versehentliches `git add .` hätte
personenbezogene Daten in die History gebracht. Gleiches galt für lose `*.docx`-Abgaben im
Repo-Root (z. B. `2026-05-26_deutsch_unter_elektromuell_AB.docx`).

**Quick-Fix (angewendet):** `.gitignore` erweitert um `*.db`, `*.sqlite`, `*.sqlite3`,
`*.docx`, `*.odt`, `*.pdf`. Verifiziert: `git check-ignore natascha_schuljahr.db` greift jetzt;
die DB erscheint nicht mehr in `git status`.

**Restmaßnahmen (Empfehlung):**
- **Aufbewahrungs-/Löschkonzept** dokumentieren (Art. 5 Abs. 1 lit. e DSGVO – Speicher-
  begrenzung): Wann werden Abgaben/Noten gelöscht? (z. B. Schuljahresende.)
- **Verschlüsselung at-rest** erwägen (SQLCipher oder verschlüsseltes Laufwerk/Profil),
  da die DB auf einem Lehrer-Laptop liegt.
- Git-History wurde geprüft: **bisher keine Schülerdaten committet** (`git log` über
  `input/`, `output/`, `abgegebene Arbeiten/`, `*.docx` → leer). Kein History-Rewrite nötig.

### DSGVO-2 — Übermittlung an externe LLM-APIs — 🔴 hoch

**Befund:** Schüler-Aufsätze werden **unverändert** an externe LLM-Provider gesendet
(`run_llm_api()`, `natascha_core.py:2013+`: anthropic, openai, deepseek, qwen/DashScope,
kimi). Der Volltext kann **Klarnamen** enthalten (Namensnennung im Dokument; zudem liest
`extract_schueler_name()` den Namen aktiv aus DOCX-Header/ersten Absätzen). Es findet
**keine Anonymisierung/Pseudonymisierung vor dem Versand** statt.

**Risiko:** Übermittlung personenbezogener Daten Minderjähriger an Auftragsverarbeiter,
teils außerhalb der EU (DashScope/Alibaba, Moonshot/Kimi, DeepSeek = China; OpenAI/Anthropic
= USA). Ohne Rechtsgrundlage + AVV ein DSGVO-Verstoß.

**Empfehlung:**
1. **Auftragsverarbeitungsvertrag (AVV/DPA)** mit dem genutzten Provider abschließen; in der
   Schule den Provider auf einen mit EU-Datenresidenz / DPA festlegen (z. B. Anthropic/OpenAI
   mit EU-Zusatz, Zero-Retention-Option). China-Provider (DeepSeek/Qwen/Kimi) für echte
   Schülerdaten **nicht** verwenden.
2. **Pseudonymisierung vor Versand:** Schülernamen vor dem API-Call durch Platzhalter
   ersetzen (der bereits vorhandene `extract_schueler_name()` + `NAME_BLOCKLIST`-Mechanismus
   liefert die Basis dafür) und erst im DOCX-Feedback lokal zurück-mappen.
3. **Einwilligung/Information** der Erziehungsberechtigten dokumentieren.
4. **„No-Training"-Flag** der APIs nutzen, wo verfügbar (Daten nicht zum Training).

### DSGVO-3 — Personenbezug in Logs — 🟡 gering

`fehlerlog.txt` (`log_tui_error`, `natascha_core.py:1724-1727`) wird in `output/` geschrieben
(gitignored) und kann Dateinamen mit Schülernamen enthalten. Risiko gering, da lokal +
gitignored. Vom Aufbewahrungs-/Löschkonzept (DSGVO-1) mit abdecken. Rohe LLM-Antworten werden
nur gekürzt (`raw[:200]`) und nur an `logging` (Konsole) ausgegeben, nicht persistiert.

---

## 3. Input-Validierung — 🟡 gering

- **Dateigröße:** Ein Größencheck **existiert** (`natascha_core.py:251-254`): Limit 32 MB
  (PDF) bzw. 20 MB (sonstige) vor dem API-Call. → `KNOWN_ISSUES`-Eintrag „Größe nicht
  geprüft" ist veraltet (in Aufgabe 5 korrigiert).
- **Dateityp:** Vision-Typen über Whitelist `_VISION_EXTENSIONS` (`.pdf/.jpg/.jpeg/.png`);
  Textextraktion nach Suffix (`.odt` vs. DOCX).
- **Robustheit gegen manipulierte Dateien:** `count_words()` fängt Fehler (`except Exception
  → 0`). Aber `read_docx_text()` (`:114`) und `read_odt_text()` (`:128`, `zipfile` +
  `xml.etree`) haben **keinen** eigenen Schutz. Risiken:
  - **XML-Entity-Expansion („Billion Laughs")** über manipuliertes DOCX/ODT-XML → DoS
    (Speicher/CPU). `xml.etree` expandiert keine externen Entities, ist aber gegen interne
    Entity-Expansion nicht gehärtet.
  - **Zip-Decompression-Bomb** (DOCX/ODT sind ZIP-Container).
  - **Bewertung:** Niedrig — Einzelplatz-Tool, Dateien stammen von der Lehrkraft, kein
    Netzwerk-Angreifer. **Empfehlung (optional):** `defusedxml` für ODT-Parsing; Größe der
    entpackten `content.xml` vor dem Parsen prüfen.

---

## 4. Dependency-Check (pip-audit) — 🟠 mittel

`pip-audit` installiert und ausgeführt (2026-05-29).

- **Direkte Requirements** (`requirements_tui.txt`, aufgelöst gegen `>=`-Ranges):
  **keine bekannten Schwachstellen.**
- **Tatsächlich installierte Umgebung:** 14 bekannte CVEs in 7 Paketen. Für NATASCHA
  **laufzeitrelevant** (verarbeiten untrusted Schüler-Input):

  | Paket | Version | Hinweis | Fix | Relevanz |
  |-------|---------|---------|-----|----------|
  | **pillow** | 12.1.1 | CVE-2026-40192, -42309, -42310, -42311, PYSEC-2026-165 | 12.2.0 | **hoch** — verarbeitet hochgeladene Schülerbilder (Vision) |
  | **lxml** | 5.4.0 | PYSEC-2026-87 | 6.1.0 | **mittel** — XML-Backend von python-docx |
  | idna | 3.11 | CVE-2026-45409 | 3.15 | transitiv |
  | pygments | 2.19.2 | CVE-2026-4539 | 2.20.0 | über rich/Konsole |
  | pip / wheel / pytest | — | diverse | — | nur Dev-/Build-Tooling |

**Status: BEHOBEN (2026-05-29).** `pillow>=12.2.0` und `lxml>=6.1.0` in
`requirements_tui.txt` + `pyproject.toml` verankert und Umgebung aktualisiert
(pillow 12.2.0, lxml 6.1.1) — `pip-audit` für beide Pakete nun sauber. pip/wheel/pytest/
pygments/idna sind Dev-/Build-Tooling (niedrige Priorität, nicht im Laufzeit-Angriffspfad).
**Empfehlung:** `pip-audit` regelmäßig (CI/vor Releases) ausführen.

---

## 5. File-Path-Handling / Path-Traversal — ✅ gering

- **Output-Dateiname:** `output_filename()` (`generate_feedback.py:1871`) bildet
  `Path(original_name).stem + "_feedback.docx"`. `.stem` entfernt Verzeichnisanteile und
  Separatoren → klassische `../`-Traversal über den Dateinamen ist neutralisiert.
- **LLM kann den Dateinamen nicht steuern:** Nach dem API-Call wird `data["datei"]` aus dem
  echten Pfad überschrieben (Metadaten-Override, `natascha_core.py:960`) — eine
  halluzinierte/bösartige `datei`-Angabe im JSON wird verworfen.
- **Output-Verzeichnisse** stammen aus der lokalen `natascha_config.toml` (`output_dir =
  PROJECT_ROOT / output_rel`, `:1436-1437`). Diese Config ist vertrauenswürdig (lokal, vom
  Nutzer kontrolliert). Kein Angriffsvektor über entfernte Eingaben.
- **Empfehlung (optional, defense-in-depth):** Bei künftigem Import von Dateinamen aus
  unkontrollierten Quellen einen expliziten Sanitizer (Whitelist `[\w.\-]`) ergänzen.

---

## Maßnahmen-Priorisierung

1. **🔴 Sofort:** DSGVO-2 — Provider mit AVV/EU-Residenz festlegen, China-Provider für echte
   Schülerdaten sperren; Pseudonymisierung planen.
2. **🟠 kurzfristig:** Löschkonzept + ggf. DB-Verschlüsselung.
3. **✅ erledigt:** `.gitignore`-Härtung (DSGVO-1); `pillow`/`lxml`-Update.
4. **🟡 optional:** XML-/Zip-Bomb-Härtung (`defusedxml`).

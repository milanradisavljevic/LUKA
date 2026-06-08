# NATASCHA — Quick-Wins-Umsetzungsplan (v0.7.4)
**Erstellt von:** Kimi Code CLI  
**Datum:** 2026-05-29  
**Ausgangslage:** 74 Tests grün, ruff-clean (keine neuen Findings), Lehrer-Feedback-Feature frisch gemerged

---

## Bewertung des MiMo-Plans

Der MiMo-Plan ist **insgesamt solide**, aber überambitioniert für einen einzelnen Durchgang. Einige Korrekturen:

| MiMo-Aussage | Realität |
|-------------|----------|
| "natascha.py: 4107 Zeilen" | Aktuell **4094 Zeilen** (nach Lehrer-Feedback) |
| "≥10 stille except Exception: pass" | Die meisten haben **bereits** `logging.debug(..., exc_info=True)` — nicht alle sind "stumm" |
| "19 Findings automatisch fixbar" | `ruff check . --fix` behebt ~3–5; Rest ist E501 (kosmetisch) + Prompt-Langzeilen |
| "F821 Undefined name" | Berebehoben (`uebersprungen` → `übersprungen`) |

### Was besonders gut ist
- **DSGVO-Pseudonymisierung** als höchste Priorität — korrekt, rechtlich kritisch
- **Package-Struktur** als langfristiges Ziel — sinnvoll, aber nicht dringend
- **CI/CD** als KURZ-Priorität — hoher Wert, moderate Hürde

### Was ich anders priorisieren würde
- `natascha.py` aufspalten ist **MITTEL**, nicht SOFORT — funktioniert stabil, Refactoring riskant bei aktiver Entwicklung
- Async-Pipeline ist **LANG**, nicht Architektur — `@work(thread=True)` ist robust genug
- Web-App / Multi-Tenant sind **>12 Monate**, nicht 3–12 Monate

---

## Drei Umsetzungsoptionen

### Option A: Minimal (30 Min)
- VERSION-String aus `pyproject.toml` lesen (Single Source of Truth)
- Stille `except: pass` in `natascha.py` durch `logging.debug(..., exc_info=True)` ersetzen
- Legacy-Wizard (`natascha_wizard.py`) Deprecation-Warnung hinzufügen

**Risiko:** Keines. Rein additive Änderungen.

---

### Option B: Standard (2–3h) — Empfohlen
Alles aus **Option A** plus:

- **DSGVO-Pseudonymisierung:** `anonymize_text()` Middleware vor `run_llm_api()`
  - `extract_schueler_name()` erweitern: Klarnamen → `[Schüler 1]`
  - Mapping lokal in DB speichern (`pseudonym_mapping` Tabelle)
  - Nur für Provider außerhalb der EU (DeepSeek, Qwen, Kimi, OpenAI, Anthropic)
- **`.pre-commit-config.yaml`:** ruff + ruff-format Hooks

**Risiko:** Niedrig. Pseudonymisierung ist isolierbar, Fallback auf Originaltext bei Fehler.

---

### Option C: Erweitert (1–2 Tage)
Alles aus **Option B** plus:

- **GitHub Actions CI:** `.github/workflows/ci.yml`
  - ruff check + ruff format --check
  - pytest tests/
  - pip-audit (Dependency-Vulnerabilities)
- **Smoke-Tests für Screens:**
  - `SchuelerVerwaltungScreen`
  - `FehlerHeatmapScreen`
  - `KlassenFeedbackScreen`
- **Automatisierte Audit-Scripts:** `scripts/audit.py`
  - Generiert `CODE_REVIEW.md`, `SECURITY_AUDIT.md`, `KNOWN_ISSUES.md` aus Code-Scanning

**Risiko:** Moderat. CI-Setup erfordert GitHub-Repo-Zugriff, Smoke-Tests für Textual sind manchmal flaky.

---

## Empfehlung

**Option B** umsetzen. Begründung:
1. DSGVO-Pseudonymisierung ist der größte offene Blocker für produktiven Einsatz an Schulen
2. VERSION-Drift + Logging sind 30 Minuten — vernachlässigbarer Aufwand
3. pre-commit verhindert zukünftige Regressions
4. Option C (CI) kann später nachgereicht werden, sobald das Repo auf GitHub aktiv gepflegt wird

---

## Nicht empfohlen jetzt

| Feature | Grund |
|---------|-------|
| `natascha.py` aufsplitten | Zu riskant bei aktiver Entwicklung; 4094 Zeilen sind handhabbar |
| Async-Pipeline (`httpx` statt `urllib`) | `@work(thread=True)` ist stabil; Rewrite ohne messbaren Nutzen |
| Plugin-System für LLM-Provider | `run_llm_api()`-Dispatch funktioniert; Overhead nicht gerechtfertigt |
| Web-App (`textual-serve`) | Out of scope für v0.7.x; keine Anforderung aus dem Lehrerkollegium |
| Multi-Tenant / Multi-Schule | >12 Monate Horizont; aktuelle Config ist bewusst Single-User |

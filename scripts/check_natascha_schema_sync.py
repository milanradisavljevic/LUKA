#!/usr/bin/env python3
"""NATASCHA-Schema-Sync-Wächter (E3 aus docs/PLAN-review-2026-07-02.md).

Das NATASCHA-Tabellenschema existiert zweimal:
  - Eigentümer:  apps/natascha/natascha_db.py         (SCHEMA_SQL = \"\"\"...\"\"\")
  - Spiegel:     apps/lua/src-tauri/src/natascha_schema.sql

Beide initialisieren dieselbe gemeinsame SQLite (~/lehr-suite-bridge/lehr-suite.db).
Driftet eine Seite (Spalte/Typ/Constraint), korrumpiert das die geteilte DB still.
Dieser Wächter vergleicht die CREATE-TABLE-Definitionen normalisiert (Whitespace,
Groß/Klein, `IF NOT EXISTS`) tabellenweise und beendet mit Exit 1 bei Drift.

CREATE INDEX wird bewusst ignoriert (Perf, kein Schema-Vertrag).

Aufruf:  python3 scripts/check_natascha_schema_sync.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
PY_SCHEMA = REPO / "apps" / "natascha" / "natascha_db.py"
RUST_SCHEMA = REPO / "apps" / "lua" / "src-tauri" / "src" / "natascha_schema.sql"

# CREATE TABLE [IF NOT EXISTS] <name> ( <body> );
TABLE_RE = re.compile(
    r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\((.*?)\)\s*;",
    re.IGNORECASE | re.DOTALL,
)


def extract_python_schema_sql(text: str) -> str:
    """Zieht den SCHEMA_SQL = \"\"\"...\"\"\"-Block aus natascha_db.py."""
    m = re.search(r'SCHEMA_SQL\s*=\s*"""(.*?)"""', text, re.DOTALL)
    if not m:
        print("FEHLER: SCHEMA_SQL-Block in natascha_db.py nicht gefunden.", file=sys.stderr)
        sys.exit(2)
    return m.group(1)


def normalize_body(body: str) -> str:
    """Spalten-/Constraint-Body normalisieren: Kommentare raus, Groß→klein,
    Whitespace kollabieren, Leerzeichen um Kommas/Klammern entfernen."""
    body = re.sub(r"--[^\n]*", " ", body)          # SQL-Zeilenkommentare
    body = body.lower()
    body = re.sub(r"\s+", " ", body)               # Whitespace kollabieren
    body = re.sub(r"\s*,\s*", ",", body)           # um Kommas
    body = re.sub(r"\s*\(\s*", "(", body)
    body = re.sub(r"\s*\)\s*", ")", body)
    return body.strip().strip(",")


def parse_tables(sql: str) -> dict[str, str]:
    return {name.lower(): normalize_body(body) for name, body in TABLE_RE.findall(sql)}


def main() -> int:
    py_tables = parse_tables(extract_python_schema_sql(PY_SCHEMA.read_text(encoding="utf-8")))
    rust_tables = parse_tables(RUST_SCHEMA.read_text(encoding="utf-8"))

    problems: list[str] = []

    only_py = sorted(set(py_tables) - set(rust_tables))
    only_rust = sorted(set(rust_tables) - set(py_tables))
    for t in only_py:
        problems.append(f"  - Tabelle '{t}' fehlt im Rust-Spiegel (natascha_schema.sql).")
    for t in only_rust:
        problems.append(f"  - Tabelle '{t}' existiert nur im Rust-Spiegel, nicht in natascha_db.py.")

    for t in sorted(set(py_tables) & set(rust_tables)):
        if py_tables[t] != rust_tables[t]:
            problems.append(
                f"  - Tabelle '{t}' unterscheidet sich:\n"
                f"      python: {py_tables[t]}\n"
                f"      rust  : {rust_tables[t]}"
            )

    if problems:
        print("NATASCHA-Schema-Drift zwischen natascha_db.py und natascha_schema.sql:\n", file=sys.stderr)
        print("\n".join(problems), file=sys.stderr)
        print(
            "\nEigentümer ist natascha_db.py (SCHEMA_SQL) — den Rust-Spiegel angleichen.",
            file=sys.stderr,
        )
        return 1

    print(f"OK — {len(py_tables)} Tabellen synchron zwischen natascha_db.py und natascha_schema.sql.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

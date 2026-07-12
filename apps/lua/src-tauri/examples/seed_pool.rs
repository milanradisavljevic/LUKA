// Standalone-Binary: seedet einen review-freigegebenen Aufgabenpool-Entwurf
// (JSON-Array im PoolEntry-Format, siehe apps/web/src/lib/pool.ts) direkt in
// die Tabelle aufgabe_pool -- ohne Tauri-IPC (Node-Skripte koennen Tauri-
// Commands nicht aufrufen). Muster: examples/import_keys.rs.
//
// Aufruf:
//   cargo run --example seed_pool -- <datei>.json
//   cargo run --example seed_pool -- <datei>.json --db-path <pfad-zur-db>   (optional, fuer Tests/Sidecar)
//
// Herkunft der Datei: apps/lua/scripts/generate-aufgabenpool-draft.mjs erzeugt
// einen Entwurf (quelleHinweis "LLM-Entwurf, ungeprueft"); ein manueller
// Review-Pass entfernt/korrigiert Eintraege, bevor dieses Binary sie seedet.

use std::fs;
use std::path::PathBuf;

use lehrunterlagen_tool::commands::pool::PoolEntry;
use lehrunterlagen_tool::db;

fn main() {
    let args: Vec<String> = std::env::args().collect();

    let mut json_path: Option<String> = None;
    let mut db_path: Option<PathBuf> = None;
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--db-path" => {
                let value = args.get(i + 1).unwrap_or_else(|| {
                    eprintln!("Fehler: --db-path braucht einen Pfad.");
                    std::process::exit(1);
                });
                db_path = Some(PathBuf::from(value));
                i += 2;
            }
            other => {
                if json_path.is_none() {
                    json_path = Some(other.to_string());
                }
                i += 1;
            }
        }
    }

    let json_path = match json_path {
        Some(p) => p,
        None => {
            eprintln!("Aufruf: cargo run --example seed_pool -- <datei>.json [--db-path <pfad>]");
            std::process::exit(1);
        }
    };

    if let Some(path) = db_path {
        db::set_db_path(Some(path));
    }

    let content = match fs::read_to_string(&json_path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Fehler: '{}' konnte nicht gelesen werden: {}", json_path, e);
            std::process::exit(1);
        }
    };

    let entries: Vec<PoolEntry> = match serde_json::from_str(&content) {
        Ok(e) => e,
        Err(e) => {
            eprintln!("Fehler: '{}' ist kein gueltiges PoolEntry-JSON-Array: {}", json_path, e);
            std::process::exit(1);
        }
    };

    if entries.is_empty() {
        println!("Datei enthaelt 0 Eintraege -- nichts zu tun.");
        return;
    }

    let conn = match db::open_db() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Fehler: DB konnte nicht geoeffnet werden: {}", e);
            std::process::exit(1);
        }
    };

    let mut eingefuegt = 0;
    let mut fehlgeschlagen = 0;

    for entry in &entries {
        let result = conn.execute(
            "INSERT OR REPLACE INTO aufgabe_pool
                (id, fach, stufe, schulstufe, thema, aufgabentyp, tags, block_json, quelle_hinweis, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                entry.id,
                entry.fach,
                entry.stufe,
                entry.schulstufe,
                entry.thema,
                entry.aufgabentyp,
                entry.tags,
                entry.block_json,
                entry.quelle_hinweis,
                entry.created_at,
            ],
        );

        match result {
            Ok(_) => eingefuegt += 1,
            Err(e) => {
                fehlgeschlagen += 1;
                eprintln!("✗ Eintrag {} fehlgeschlagen: {}", entry.id, e);
            }
        }
    }

    println!(
        "\n{} von {} Eintraegen eingefuegt (DB: {}).",
        eingefuegt,
        entries.len(),
        db::resolve_db_path().display()
    );
    if fehlgeschlagen > 0 {
        eprintln!("{} Eintraege fehlgeschlagen.", fehlgeschlagen);
        std::process::exit(1);
    }
}

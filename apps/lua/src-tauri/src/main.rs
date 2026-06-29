#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;

use lehrunterlagen_tool::commands;
use lehrunterlagen_tool::db as db_core;

fn main() {
    let conn = db_core::open_db().expect("Datenbank konnte nicht geöffnet werden");
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(commands::db::DbState(Mutex::new(conn)))
        .invoke_handler(tauri::generate_handler![
            commands::llm::llm_complete,
            commands::keys::save_api_key,
            commands::keys::load_api_key,
            commands::keys::delete_api_key,
            commands::pdf::convert_pdf,
            commands::pdf::libreoffice_available,
            commands::export::export_docx,
            commands::web::fetch_url,
            commands::bridge::list_bridge_exports,
            commands::bridge::read_bridge_export,
            commands::bridge::resolve_bridge_inbox,
            commands::natascha::launch_natascha,
            commands::natascha::natascha_analyze,
            commands::natascha::natascha_feedback_docx,
            commands::natascha::natascha_erwartungshorizont,
            commands::natascha::natascha_seed_testdaten,
            commands::natascha::natascha_add_klasse,
            commands::natascha::natascha_add_aufgabe,
            commands::natascha::natascha_list_rubrics,
            commands::natascha::natascha_retro_import,
            commands::natascha::natascha_quelltext_get,
            commands::natascha::natascha_list_rubric_files,
            commands::natascha::natascha_read_rubric,
            commands::natascha::natascha_save_rubric,
            commands::natascha::natascha_save_erwartungshorizont,
            commands::natascha::natascha_klassen_briefing,
            commands::natascha::natascha_schueler_profil,
            commands::db::db_load_all,
            commands::db::db_upsert_document,
            commands::db::db_delete_document,
            commands::db::db_restore_document,
            commands::db::db_purge_deleted,
            commands::db::db_toggle_favorite,
            commands::db::db_append_history,
            commands::db::db_clear_history,
            commands::db::db_save_settings,
            commands::db::db_save_template,
            commands::db::db_delete_template,
            commands::db::db_migrate_from_localstorage,
            commands::db::db_resolve_path,
            commands::db::db_set_path,
            commands::db::db_backup,
            commands::natascha_read::db_list_aufgaben,
            commands::natascha_read::db_get_abgaben,
            commands::natascha_read::db_get_fehler_heatmap,
            commands::natascha_read::db_get_notenverteilung,
            commands::natascha_read::db_get_klassen_statistik,
            commands::natascha_read::db_upsert_lehrer_feedback,
            commands::natascha_read::db_get_abgabe_detail,
            commands::natascha_read::db_list_schueler,
            commands::natascha_read::db_insert_schueler,
            commands::natascha_read::db_delete_schueler,
            commands::natascha_read::db_get_schueler_laengsschnitt,
            commands::natascha_read::db_get_klassen_trend,
            commands::natascha_read::db_get_klassen_kalibrierung,
            commands::natascha_read::db_get_fehler_detail,
            commands::natascha_read::db_export_noten_csv,
            commands::natascha_read::db_get_klassen_briefing,
            commands::natascha_read::db_get_schueler_profil,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

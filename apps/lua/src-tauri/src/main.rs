#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use lehrunterlagen_tool::commands::{llm, keys, pdf, web};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            llm::llm_complete,
            keys::save_api_key,
            keys::load_api_key,
            keys::delete_api_key,
            pdf::convert_pdf,
            web::fetch_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

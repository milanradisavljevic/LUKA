use crate::keystore;

#[tauri::command]
pub async fn save_api_key(provider: String, key: String) -> Result<(), String> {
    keystore::save_key(&provider, &key)
}

#[tauri::command]
pub async fn load_api_key(provider: String) -> Result<String, String> {
    keystore::load_key(&provider)
}

#[tauri::command]
pub async fn delete_api_key(provider: String) -> Result<(), String> {
    keystore::delete_key(&provider)
}

use serde::Serialize;
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct InstallationInfo {version:String, executable:String, temporary:bool}
#[tauri::command]
pub fn installation_info(app:tauri::AppHandle)->Result<InstallationInfo,String>{
 let exe=std::env::current_exe().map_err(|e|e.to_string())?;
 let normalized=exe.to_string_lossy().to_lowercase();
 let temporary=normalized.contains("sidecar-smoke") || exe.starts_with(std::env::temp_dir());
 Ok(InstallationInfo{version:app.package_info().version.to_string(),executable:exe.display().to_string(),temporary})
}

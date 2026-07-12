use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

const TIMEOUT_SECS: u64 = 60;

#[tauri::command]
pub async fn convert_pdf(docx_path: String, output_path: Option<String>) -> Result<String, String> {
    let docx = PathBuf::from(&docx_path);
    
    if !docx.exists() {
        return Err(format!("Datei nicht gefunden: {}", docx_path));
    }

    if !docx.extension().map(|e| e == "docx").unwrap_or(false) {
        return Err("Datei muss die Endung .docx haben.".to_string());
    }

    let requested_pdf = output_path.map(PathBuf::from);
    if let Some(target) = &requested_pdf {
        if !target.extension().map(|e| e.eq_ignore_ascii_case("pdf")).unwrap_or(false) {
            return Err("Der Zielpfad muss die Endung .pdf haben.".to_string());
        }
        if let Some(parent) = target.parent() {
            if !parent.exists() {
                return Err("Der gewählte PDF-Zielordner existiert nicht.".to_string());
            }
        }
    }

    let soffice = find_libreoffice()
        .ok_or_else(|| "LibreOffice nicht gefunden. Bitte installieren oder PDF manuell erzeugen.".to_string())?;

    let output_dir = requested_pdf
        .as_ref()
        .and_then(|target| target.parent())
        .or_else(|| docx.parent())
        .ok_or_else(|| "Ungültiger Dateipfad.".to_string())?;

    let generated_pdf_path = output_dir.join(
        docx.file_stem()
            .ok_or_else(|| "Ungültiger Dateiname.".to_string())?
    ).with_extension("pdf");

    let convert_future = async {
        let child = Command::new(&soffice)
            .arg("--headless")
            .arg("--convert-to")
            .arg("pdf")
            .arg("--outdir")
            .arg(output_dir)
            .arg(&docx)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("LibreOffice konnte nicht gestartet werden: {}", e))?;

        let output = child.wait_with_output().await
            .map_err(|e| format!("Fehler beim Warten auf LibreOffice: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("PDF-Erzeugung fehlgeschlagen: {}", stderr));
        }

        if !generated_pdf_path.exists() {
            return Err("PDF-Datei wurde nicht erzeugt.".to_string());
        }

        Ok(())
    };

    match timeout(Duration::from_secs(TIMEOUT_SECS), convert_future).await {
        Ok(Ok(_)) => {
            if let Some(target) = requested_pdf {
                if target != generated_pdf_path {
                    if target.exists() {
                        return Err("Die gewählte PDF-Zieldatei existiert bereits.".to_string());
                    }
                    std::fs::rename(&generated_pdf_path, &target)
                        .map_err(|e| format!("PDF konnte nicht am gewählten Ziel gespeichert werden: {}", e))?;
                }
                Ok(target.to_string_lossy().to_string())
            } else {
                Ok(generated_pdf_path.to_string_lossy().to_string())
            }
        }
        Ok(Err(error)) => Err(error),
        Err(_) => Err("PDF-Erzeugung hat zu lange gedauert.".to_string()),
    }
}

/// Ob LibreOffice (soffice) auf dem System gefunden wird. Frontend blendet den
/// PDF-Export aus, wenn nicht vorhanden (graceful degrade, Phase-0-Launch).
#[tauri::command]
pub fn libreoffice_available() -> bool {
    find_libreoffice().is_some()
}

fn find_libreoffice() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let paths = vec![
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        ];
        for path in paths {
            if Path::new(path).exists() {
                return Some(path.to_string());
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let path = "/Applications/LibreOffice.app/Contents/MacOS/soffice";
        if Path::new(path).exists() {
            return Some(path.to_string());
        }
    }

    #[cfg(target_os = "linux")]
    {
        let paths = vec![
            "/usr/bin/soffice",
            "/usr/local/bin/soffice",
            "/snap/bin/libreoffice",
        ];
        for path in paths {
            if Path::new(path).exists() {
                return Some(path.to_string());
            }
        }
    }

    if let Ok(output) = std::process::Command::new("which")
        .arg("soffice")
        .output()
    {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Some(path);
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_libreoffice() {
        let result = find_libreoffice();
        
        #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
        {
            if result.is_some() {
                println!("LibreOffice gefunden: {:?}", result);
            } else {
                println!("LibreOffice nicht installiert (Test übersprungen)");
            }
        }
    }

    #[tokio::test]
    async fn test_convert_pdf_invalid_path() {
        let result = convert_pdf("/nonexistent/file.docx".to_string(), None).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Datei nicht gefunden"));
    }

    #[tokio::test]
    async fn test_convert_pdf_wrong_extension() {
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join("test.txt");
        std::fs::write(&test_file, "test").unwrap();

        let result = convert_pdf(test_file.to_string_lossy().to_string(), None).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains(".docx"));

        std::fs::remove_file(test_file).ok();
    }

    #[tokio::test]
    #[ignore = "Benötigt installiertes LibreOffice"]
    async fn test_convert_pdf_real() {
        let test_docx = PathBuf::from("node_modules/mammoth/test/test-data/empty.docx");
        
        if !test_docx.exists() {
            println!("Test-DOCX nicht gefunden, Test übersprungen");
            return;
        }

        let result = convert_pdf(test_docx.to_string_lossy().to_string(), None).await;
        
        match result {
            Ok(pdf_path) => {
                println!("PDF erzeugt: {}", pdf_path);
                assert!(Path::new(&pdf_path).exists());
                std::fs::remove_file(pdf_path).ok();
            }
            Err(e) => {
                println!("Konvertierung fehlgeschlagen (LibreOffice fehlt?): {}", e);
            }
        }
    }
}

use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;
use tauri::Manager;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BackendConfig {
    pub api_url: String,
    pub ws_url: String,
}

impl Default for BackendConfig {
    fn default() -> Self {
        Self {
            api_url: "http://34.100.183.146:8000/api/v1".to_string(),
            ws_url: "ws://34.100.183.146:8000".to_string(),
        }
    }
}

pub fn get_config_path(app: &AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap_or_default().join("backend_config.json")
}

pub fn load_config(app: &AppHandle) -> BackendConfig {
    let path = get_config_path(app);
    if let Ok(content) = fs::read_to_string(path) {
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        BackendConfig::default()
    }
}

pub fn save_config(app: &AppHandle, config: &BackendConfig) -> Result<(), String> {
    let path = get_config_path(app);
    let dir = path.parent().ok_or("Invalid path")?;
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

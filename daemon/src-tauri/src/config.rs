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
            api_url: "https://34-100-183-146.sslip.io/api/v1".to_string(),
            ws_url: "wss://34-100-183-146.sslip.io".to_string(),
        }
    }
}

pub fn get_config_path(app: &AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap_or_default().join("backend_config.json")
}

pub fn load_config(app: &AppHandle) -> BackendConfig {
    let path = get_config_path(app);
    let mut config = if let Ok(content) = fs::read_to_string(path) {
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        BackendConfig::default()
    };

    // Auto-migration for Hackathon: Force upgrade old http links to secure https
    if config.api_url.contains("34.100.183.146") && config.api_url.starts_with("http://") {
        config.api_url = config.api_url.replace("http://", "https://").replace(":8000", "");
        config.ws_url = config.ws_url.replace("ws://", "wss://").replace(":8000", "");
        let _ = save_config(app, &config);
    }

    config
}

pub fn save_config(app: &AppHandle, config: &BackendConfig) -> Result<(), String> {
    let path = get_config_path(app);
    let dir = path.parent().ok_or("Invalid path")?;
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

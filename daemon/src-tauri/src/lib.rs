mod hw_detector;
mod docker_manager;
mod websocket;

use tauri::{AppHandle, Manager};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

pub struct AppState {
    pub is_active: Arc<AtomicBool>,
    pub node_id: String,
}

#[tauri::command]
fn get_hardware_profile() -> hw_detector::HardwareProfile {
    hw_detector::get_hardware_profile()
}

#[tauri::command]
fn get_docker_status() -> bool {
    docker_manager::is_docker_installed()
}

#[tauri::command]
fn toggle_active(state: tauri::State<AppState>) -> bool {
    // Toggle the atomic boolean
    let current = state.is_active.load(Ordering::SeqCst);
    state.is_active.store(!current, Ordering::SeqCst);
    !current
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            // Mock Node ID for MVP
            let node_id = "node_1234abcd".to_string();
            
            app.manage(AppState {
                is_active: Arc::new(AtomicBool::new(false)),
                node_id: node_id.clone(),
            });

            // Start websocket loop in the background
            tauri::async_runtime::spawn(async move {
                websocket::connect_and_listen(app_handle, node_id).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_hardware_profile,
            get_docker_status,
            toggle_active
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

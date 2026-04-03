use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use serde_json::json;
use std::time::Duration;
use tauri::Emitter;

/// Read real GPU telemetry via nvidia-smi
fn read_gpu_telemetry() -> (i32, i32, i32) {
    // GPU utilization, temperature, memory utilization
    if let Ok(output) = std::process::Command::new("nvidia-smi")
        .args(["--query-gpu=utilization.gpu,temperature.gpu,utilization.memory", "--format=csv,noheader,nounits"])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let parts: Vec<&str> = stdout.trim().split(", ").collect();
            if parts.len() >= 3 {
                let gpu_load = parts[0].parse::<i32>().unwrap_or(0);
                let temp = parts[1].parse::<i32>().unwrap_or(0);
                let vram = parts[2].parse::<i32>().unwrap_or(0);
                return (gpu_load, temp, vram);
            }
        }
    }
    // Fallback: no NVIDIA GPU or nvidia-smi unavailable
    (0, 0, 0)
}

pub async fn connect_and_listen(app_handle: tauri::AppHandle, node_id: String, auth_token: String) {
    let base_url = option_env!("CAMPUGRID_WS_URL").unwrap_or("ws://localhost:8000");
    let url = format!("{}/api/v1/ws/node/{}?token={}", base_url, node_id, auth_token);
    
    loop {
        println!("Attempting to connect to {}", url);
        match connect_async(&url).await {
            Ok((ws_stream, _)) => {
                println!("WebSocket connected!");
                let _ = app_handle.emit("ws_status", json!({ "status": "connected" }));

                let (mut write, mut read) = ws_stream.split();

                // Heartbeat task — reads REAL GPU telemetry
                let heartbeat_app_handle = app_handle.clone();
                let heartbeat_node_id = node_id.clone();
                
                tokio::spawn(async move {
                    loop {
                        tokio::time::sleep(Duration::from_secs(10)).await;
                        
                        let (gpu_load, temp, vram) = read_gpu_telemetry();
                        
                        let msg = json!({
                            "type": "heartbeat",
                            "node_id": heartbeat_node_id,
                            "available": true,
                            "resources": {
                                "gpu_load": gpu_load,
                                "temp": temp,
                                "vram_percent": vram
                            }
                        });
                        
                        let _ = heartbeat_app_handle.emit("telemetry", json!({
                            "gpu_load": gpu_load,
                            "temp": temp,
                            "vram_percent": vram
                        }));
                    }
                });

                while let Some(msg) = read.next().await {
                    match msg {
                        Ok(Message::Text(text)) => {
                            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                                let msg_type = json["type"].as_str().unwrap_or("");
                                match msg_type {
                                    "job_dispatch" => {
                                        let _ = app_handle.emit("job_dispatch", json);
                                    }
                                    "chunk_dispatch" => {
                                        let _ = app_handle.emit("chunk_dispatch", json);
                                    }
                                    _ => {
                                        println!("Unknown message type: {}", msg_type);
                                    }
                                }
                            }
                        }
                        Ok(Message::Close(_)) => {
                            println!("WebSocket closed by server.");
                            break;
                        }
                        Err(e) => {
                            println!("WebSocket error: {}", e);
                            break;
                        }
                        _ => {}
                    }
                }
            }
            Err(e) => {
                println!("Failed to connect: {}", e);
            }
        }
        
        let _ = app_handle.emit("ws_status", json!({ "status": "disconnected" }));
        println!("Reconnecting in 5 seconds...");
        tokio::time::sleep(Duration::from_secs(5)).await;
    }
}

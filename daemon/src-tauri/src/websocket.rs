use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use serde_json::json;
use std::time::Duration;
use tauri::Emitter;

pub async fn connect_and_listen(app_handle: tauri::AppHandle, node_id: String) {
    let base_url = option_env!("CAMPUGRID_WS_URL").unwrap_or("ws://localhost:8000");
    let url = format!("{}/api/v1/ws/node/{}?token=internal_node", base_url, node_id);
    
    // In production, implement a robust reconnect loop
    loop {
        println!("Attempting to connect to {}", url);
        match connect_async(&url).await {
            Ok((ws_stream, _)) => {
                println!("WebSocket connected!");
                let _ = app_handle.emit("ws_status", json!({ "status": "connected" }));

                let (mut write, mut read) = ws_stream.split();

                // Heartbeat task
                let heartbeat_app_handle = app_handle.clone();
                let heartbeat_node_id = node_id.clone();
                
                tokio::spawn(async move {
                    loop {
                        tokio::time::sleep(Duration::from_secs(10)).await;
                        // Mock telemtry data here
                        let msg = json!({
                            "type": "node_telemetry",
                            "node_id": heartbeat_node_id,
                            "gpu_load": fastrand::i32(0..100),
                            "temp": fastrand::i32(40..85),
                            "vram_percent": fastrand::i32(10..90)
                        });
                        
                        let _ = heartbeat_app_handle.emit("telemetry", msg.clone());
                        // In reality, send via 'write' here, requiring mpsc channel to share Sink
                    }
                });

                while let Some(msg) = read.next().await {
                    match msg {
                        Ok(Message::Text(text)) => {
                            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                                if json["type"] == "job_dispatch" {
                                    // Forward to frontend
                                    let _ = app_handle.emit("job_dispatch", json);
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

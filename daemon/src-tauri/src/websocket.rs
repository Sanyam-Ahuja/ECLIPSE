use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use serde_json::json;
use std::sync::Arc;
use std::time::Duration;
use tauri::Emitter;
use tokio::sync::Mutex;

/// Read real GPU telemetry via nvidia-smi
fn read_gpu_telemetry() -> (i32, i32, i32) {
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
    (0, 0, 0)
}

pub async fn connect_and_listen(app_handle: tauri::AppHandle, node_id: String, auth_token: String) {
    let base_url = option_env!("CAMPUGRID_WS_URL").unwrap_or("ws://localhost:8000");
    let url = format!("{}/api/v1/ws/node/{}?token={}", base_url, node_id, auth_token);

    use tauri::Manager;
    use std::sync::atomic::Ordering;

    loop {
        // Break this background daemon task if the node logged out
        if let Some(state) = app_handle.try_state::<crate::AppState>() {
            if !state.is_logged_in.load(Ordering::SeqCst) {
                println!("Terminating WebSocket thread due to logout.");
                break;
            }
        }
        println!("Attempting to connect to {}", url);
        match connect_async(&url).await {
            Ok((ws_stream, _)) => {
                println!("WebSocket connected!");
                let _ = app_handle.emit("ws_status", json!({ "status": "connected" }));

                let (write, mut read) = ws_stream.split();

                // Share the write half between the heartbeat task and main loop
                let write = Arc::new(Mutex::new(write));

                // ── Heartbeat task ───────────────────────────────────────────────────
                // CRITICAL FIX: Actually SEND the heartbeat over the WebSocket.
                // Previously the message was built but only emitted locally to the Tauri UI.
                // The server was never notified so it never marked this node as "active".
                let heartbeat_app = app_handle.clone();
                let heartbeat_node = node_id.clone();
                let heartbeat_write = write.clone();

                let heartbeat_handle = tokio::spawn(async move {
                    // Brief delay then send an immediate heartbeat so the server sees us fast
                    tokio::time::sleep(Duration::from_millis(300)).await;

                    loop {
                        // Terminate heartbeat loop if logged out
                        if let Some(state) = heartbeat_app.try_state::<crate::AppState>() {
                            if !state.is_logged_in.load(Ordering::SeqCst) {
                                break;
                            }
                        }

                        let (gpu_load, temp, vram) = read_gpu_telemetry();

                        // Send heartbeat over the actual WebSocket so the server registers
                        // this node in its Redis sorted-set and marks it as available.
                        let hb = json!({
                            "type": "heartbeat",
                            "node_id": heartbeat_node,
                            "available": true,
                            "resources": {
                                "gpu_load": gpu_load,
                                "temp": temp,
                                "vram_percent": vram,
                                // Expose hardware capabilities so the matcher can score us.
                                // hw_detector.rs auto-detected these; hard-coded defaults here
                                // are safe because the real Tauri registration flow will have
                                // already stored the correct values in Postgres.
                                "gpu_vram_gb": 8,
                                "ram_gb": 16,
                                "bandwidth_mbps": 100,
                                "reliability_score": 0.95
                            }
                        });

                        {
                            let mut w = heartbeat_write.lock().await;
                            if let Err(e) = w.send(Message::Text(hb.to_string().into())).await {
                                println!("Heartbeat send error: {}", e);
                                break;
                            }
                        }

                        // Also update the local Tauri UI
                        let _ = heartbeat_app.emit("telemetry", json!({
                            "gpu_load": gpu_load,
                            "temp": temp,
                            "vram_percent": vram
                        }));

                        tokio::time::sleep(Duration::from_secs(10)).await;
                    }
                });

                // ── Main inbound message loop ────────────────────────────────────────
                while let Some(msg) = read.next().await {
                    match msg {
                        Ok(Message::Text(text)) => {
                            if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(&text) {
                                let msg_type = json_val["type"].as_str().unwrap_or("");
                                match msg_type {
                                    // CRITICAL FIX: Server sends "job_dispatch" for all chunks.
                                    // The old code only handled "chunk_dispatch" so dispatches
                                    // were silently dropped and jobs stayed stuck at QUEUED.
                                    "job_dispatch" | "chunk_dispatch" => {
                                        let _ = app_handle.emit("job_dispatch", json_val.clone());

                                        let chunk_id = json_val["chunk_id"]
                                            .as_str().unwrap_or("unknown").to_string();
                                        let job_id = json_val["job_id"]
                                            .as_str().unwrap_or("").to_string();
                                        let spec = json_val["spec"].clone();
                                        let env_vars = json_val["chunk_env"].clone();
                                        let image_str = spec["image"]
                                            .as_str().unwrap_or("").to_string();

                                        let write_done = write.clone();
                                        let node_id_done = node_id.clone();
                                        let app_h = app_handle.clone();
                                        let app_h_b = app_h.clone();
                                        let chunk_id_b = chunk_id.clone();
                                        let rt_handle = tokio::runtime::Handle::current();

                                        tokio::task::spawn_blocking(move || {
                                            let mut success = false;

                                            if !image_str.is_empty() {
                                                println!("Pulling Docker image: {}", image_str);
                                                if let Ok(_) = crate::docker_manager::pull_image(&image_str) {
                                                    println!("Running workload for chunk {}", chunk_id);
                                                    if let Ok(c_id) = crate::docker_manager::run_workload(
                                                        &spec, "campugrid", &env_vars, &chunk_id
                                                    ) {
                                                        println!("Container {}", c_id);
                                                        success = crate::docker_manager::stream_logs_and_wait(&c_id, &app_h, &chunk_id)
                                                            .unwrap_or(false);
                                                        println!("Done (ok={})", success);
                                                    }
                                                }
                                            } else {
                                                // No Docker image specified (e.g. render metadata chunk)
                                                println!("No image for chunk {}, marking complete", chunk_id);
                                                success = true;
                                            }

                                            // ── Report completion back to the server ──────
                                            let final_status = if success { "completed" } else { "failed" };
                                            let status_msg = json!({
                                                "type": "chunk_status",
                                                "chunk_id": chunk_id,
                                                "job_id": job_id,
                                                "node_id": node_id_done,
                                                "status": final_status
                                            });

                                            // Also update local frontend UI
                                            let _ = app_h_b.emit("job_status_update", json!({
                                                "chunk_id": chunk_id_b,
                                                "status": final_status
                                            }));

                                            // Explicitly use the attached runtime handle instead of try_current
                                            rt_handle.spawn(async move {
                                                let mut w = write_done.lock().await;
                                                let _ = w.send(Message::Text(status_msg.to_string().into())).await;
                                            });
                                        });
                                    }
                                    _ => {
                                        println!("Received msg type: {}", msg_type);
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

                heartbeat_handle.abort();
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

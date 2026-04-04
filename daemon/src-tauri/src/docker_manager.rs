use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};
use tauri::Emitter;
use serde_json::Value;

pub fn is_docker_installed() -> bool {
    Command::new("docker")
        .arg("--version")
        .output()
        .map(|out| out.status.success())
        .unwrap_or(false)
}

pub fn pull_image(image: &str) -> Result<(), String> {
    // Check if the image exists locally first
    let check = Command::new("docker")
        .arg("image")
        .arg("inspect")
        .arg(image)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
        
    if let Ok(status) = check {
        if status.success() {
            println!("Image {} found locally, skipping remote pull to prevent TLS/Network timeouts", image);
            return Ok(());
        }
    }

    // Try pulling if it's completely missing
    let status = Command::new("docker")
        .arg("pull")
        .arg(image)
        .status()
        .map_err(|e| format!("Failed to execute docker pull: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        println!("Warning: Docker pull failed for {}, attempting to proceed without pulling", image);
        Ok(()) // Mask error so docker run can attempt local fallback anyways
    }
}

pub fn run_workload(
    spec: &Value,
    network_mode: &str,
    env_vars: &Value,
    chunk_id: &str,
) -> Result<String, String> {
    let image = spec["image"]
        .as_str()
        .ok_or("Missing image in generic spec")?;
    
    let command = spec["command"]
        .as_str()
        .unwrap_or(""); // Can be empty if entrypoint is sufficient

    let mut cmd = Command::new("docker");
    cmd.arg("run").arg("-d"); // Run detached (removed --rm so we can fetch logs after completion)

    // Tier 2 Security Sandboxing
    cmd.arg("--cap-drop=ALL"); // Drop all linux capabilities
    cmd.arg("--security-opt=no-new-privileges:true"); // Prevent privilege escalation
    cmd.arg("--pids-limit=200"); // Prevent fork bombs
    
    // Resource Ceilings (Static for MVP, dynamically allocated from Settings in Prod)
    cmd.arg("--memory=16g");
    cmd.arg("--cpus=4");

    let requires_public = spec["requires_public_network"].as_bool().unwrap_or(false);

    if network_mode == "campugrid_overlay" {
        cmd.arg("--network=host"); // MVP simplifies overlay to host networking on campus LAN
    } else if requires_public {
        cmd.arg("--network=bridge"); // Allow public internet access if explicitly requested
    } else {
        cmd.arg("--network=none"); // Standard isolated, strict cut-off from internet
    }

    // Pass environment variables
    if let Some(envs) = env_vars.as_object() {
        for (k, v) in envs {
            if let Some(v_str) = v.as_str() {
                cmd.arg("-e").arg(format!("{}={}", k, v_str));
            }
        }
    }

    // Name container after chunk
    cmd.arg("--name").arg(format!("campugrid_chunk_{}", chunk_id));
    cmd.arg(image);

    if !command.is_empty() {
        // Splitting simple commands for MVP (In prod, requires full shell word splitting)
        for part in command.split_whitespace() {
            cmd.arg(part);
        }
    }

    let output = cmd.output().map_err(|e| format!("Docker run failed: {}", e))?;

    if output.status.success() {
        let container_id = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(container_id)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn stream_logs_and_wait(container_id: &str, app_handle: &tauri::AppHandle, chunk_id: &str) -> Result<bool, String> {
    let mut child = Command::new("docker")
        .arg("logs")
        .arg("-f")
        .arg(container_id)
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start docker logs: {}", e))?;

    if let Some(stdout) = child.stdout.take() {
        let app_handle_clone = app_handle.clone();
        let chunk_clone = chunk_id.to_string();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(l) = line {
                    let _ = app_handle_clone.emit("chunk_log", serde_json::json!({
                        "chunk_id": chunk_clone,
                        "log": l
                    }));
                }
            }
        });
    }

    let status = Command::new("docker")
        .arg("wait")
        .arg(container_id)
        .status()
        .map_err(|e| format!("Docker wait failed: {}", e))?;
    
    // Check if the container actually succeeded
    let output = Command::new("docker")
        .arg("inspect")
        .arg(container_id)
        .arg("--format={{.State.ExitCode}}")
        .output()
        .unwrap();
    let exit_code = String::from_utf8_lossy(&output.stdout).trim().to_string();
    
    // Manually delete the container after we finish inspecting it
    let _ = Command::new("docker").arg("rm").arg(container_id).output();
    
    Ok(status.success() && exit_code == "0")
}

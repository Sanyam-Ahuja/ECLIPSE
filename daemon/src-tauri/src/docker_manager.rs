use std::process::Command;
use serde_json::Value;

pub fn is_docker_installed() -> bool {
    Command::new("docker")
        .arg("--version")
        .output()
        .map(|out| out.status.success())
        .unwrap_or(false)
}

pub fn pull_image(image: &str) -> Result<(), String> {
    let status = Command::new("docker")
        .arg("pull")
        .arg(image)
        .status()
        .map_err(|e| format!("Failed to execute docker pull: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("Docker pull failed for image {}", image))
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
    cmd.arg("run").arg("--rm").arg("-d"); // Run detached, cleanup after

    if network_mode == "campugrid_overlay" {
        cmd.arg("--network=host"); // MVP simplifies overlay to host networking on campus LAN
    } else {
        cmd.arg("--network=none"); // Standard isolated
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

pub fn stream_logs_and_wait(container_id: &str) -> Result<bool, String> {
    // In MVP, we just block and wait for it to finish.
    // In production, we'd spawn a thread to read stdout line by line and send over WS.
    let status = Command::new("docker")
        .arg("wait")
        .arg(container_id)
        .status()
        .map_err(|e| format!("Docker wait failed: {}", e))?;
    
    Ok(status.success())
}

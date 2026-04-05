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

    let container_name = format!("campugrid_chunk_{}", chunk_id);
    
    // Force remove any old container with the same name to prevent instant crash 
    // when resubmitting or retrying chunks
    let _ = Command::new("docker").args(["rm", "-f", &container_name]).output();

    let mut cmd = Command::new("docker");
    cmd.arg("run").arg("-d"); // Run detached (removed --rm so we can fetch logs after completion)

    // Always pass the GPU through if the NVIDIA container runtime is
    // available and the driver is loaded.
    if crate::gpu_setup::check_gpu_setup().fully_ready {
        cmd.arg("--gpus").arg("all");
        println!("GPU passthrough enabled (--gpus all)");
    }

    // Tier 2 Security Sandboxing
    cmd.arg("--security-opt=no-new-privileges:true"); // Prevent privilege escalation
    cmd.arg("--pids-limit=1000"); // Allow Blender threads and drivers
    
    // Resource Ceilings (Static for MVP, dynamically allocated from Settings in Prod)
    // We strictly enforce 16g RAM so the kernel kills it instead of bleeding host memory over 32g
    cmd.arg("--memory=16g");
    cmd.arg("--shm-size=8g"); // Essential for GPU and multiprocessing to avoid crashing
    cmd.arg("--cpus=4");

    let requires_public = spec["requires_public_network"].as_bool().unwrap_or(false);

    if network_mode == "campugrid_overlay" || network_mode == "host" {
        cmd.arg("--network=host"); // host mode: container sees host's localhost directly
    } else if network_mode == "bridge" || requires_public {
        cmd.arg("--network=bridge");
        // On Linux only: Docker bridge requires explicit host-gateway for host resolution.
        // On Windows/macOS with Docker Desktop, host.docker.internal resolves automatically.
        #[cfg(not(windows))]
        cmd.arg("--add-host=host.docker.internal:host-gateway");
    } else {
        cmd.arg("--network=none");
    }

    // Pass environment variables
    if let Some(envs) = env_vars.as_object() {
        for (k, v) in envs {
            if let Some(v_str) = v.as_str() {
                cmd.arg("-e").arg(format!("{}={}", k, v_str));
            }
        }
    }

    // Override entrypoint to sh so we can run multi-command pipelines
    // regardless of what the image's default ENTRYPOINT is (e.g. ikester/blender sets blender as entrypoint)
    cmd.arg("--name").arg(&container_name);
    cmd.arg("-e").arg("AUDIODEV=null"); // Suppress ALSA/OSS audio errors in headless Blender
    cmd.arg("--entrypoint").arg("sh");
    cmd.arg(image);

    if !command.is_empty() {
        // Pass as sh -c "command" so shell operators (&&, URLs with &, quotes) are preserved
        cmd.arg("-c").arg(command);
    }

    let mut output = cmd.output().map_err(|e| format!("Docker run failed: {}", e))?;

    // If it failed because the image was missing, try pulling it once and retrying
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("Unable to find image") || stderr.contains("not found") {
            println!("Image not found locally during run. Forcing pull of {}...", image);
            let _ = Command::new("docker").arg("pull").arg(image).status();
            // Retry the command once
            output = cmd.output().map_err(|e| format!("Retry Docker run failed: {}", e))?;
        }
    }

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

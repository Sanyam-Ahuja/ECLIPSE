use sysinfo::System;
use serde::Serialize;
use std::process::Command;

#[derive(Serialize, Clone, Debug)]
pub struct HardwareProfile {
    cpu_cores: usize,
    ram_gb: f64,
    gpu_model: String,
    gpu_vram_gb: f64,
    cuda_version: Option<String>,
    os: String,
}

pub fn get_hardware_profile() -> HardwareProfile {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_cores = sys.physical_core_count().unwrap_or(4);
    let ram_gb = sys.total_memory() as f64 / 1024.0 / 1024.0 / 1024.0;
    let os = System::name().unwrap_or_else(|| "Unknown".to_string());

    let mut gpu_model = "None Details".to_string();
    let mut gpu_vram_gb = 0.0;
    let mut cuda_version: Option<String> = None;

    // Check for NVIDIA GPU
    if let Ok(output) = Command::new("nvidia-smi")
        .arg("--query-gpu=name,memory.total")
        .arg("--format=csv,noheader,nounits")
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let parts: Vec<&str> = stdout.trim().split(", ").collect();
            if parts.len() >= 2 {
                gpu_model = parts[0].to_string();
                if let Ok(vram_mb) = parts[1].parse::<f64>() {
                    gpu_vram_gb = vram_mb / 1024.0;
                }
            }

            // Get CUDA version
            if let Ok(nvcc_out) = Command::new("nvidia-smi").output() {
                let nvcc_str = String::from_utf8_lossy(&nvcc_out.stdout);
                if let Some(cuda_idx) = nvcc_str.find("CUDA Version: ") {
                    let version = nvcc_str[cuda_idx + 14..]
                        .split_whitespace()
                        .next()
                        .unwrap_or("");
                    cuda_version = Some(version.to_string());
                }
            }
        }
    } else {
        // Fallback for non-NVIDIA or missing nvidia-smi
        gpu_model = "CPU Only or Integrated GPU".to_string();
    }

    HardwareProfile {
        cpu_cores,
        ram_gb,
        gpu_model,
        gpu_vram_gb,
        cuda_version,
        os,
    }
}

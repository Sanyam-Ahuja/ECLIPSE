use serde::Serialize;
use std::process::Command;

#[derive(Serialize, Clone, Debug)]
pub struct GpuSetupStatus {
    /// True if an NVIDIA GPU is physically detected via nvidia-smi
    pub nvidia_gpu_detected: bool,
    /// The GPU model name if detected
    pub gpu_model: String,
    /// True if nvidia-container-toolkit package is installed
    pub toolkit_installed: bool,
    /// Toolkit version string if installed
    pub toolkit_version: String,
    /// True if Docker has the nvidia runtime registered
    pub docker_gpu_runtime: bool,
    /// True if everything is working end-to-end
    pub fully_ready: bool,
    /// The detected OS family ("windows", "debian", "fedora", etc)
    pub distro_family: String,
    /// The install command or URL the user should follow
    pub install_command: String,
    /// The configure command to register nvidia runtime in Docker
    pub configure_command: String,
}

// ── OS Detection ─────────────────────────────────────────────────────

#[cfg(windows)]
fn detect_distro_family() -> String {
    "windows".to_string()
}

#[cfg(not(windows))]
fn detect_distro_family() -> String {
    if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
        let id = content.lines()
            .find(|l| l.starts_with("ID="))
            .map(|l| l.strip_prefix("ID=").unwrap_or("").trim_matches('"').to_lowercase())
            .unwrap_or_default();
        
        let id_like = content.lines()
            .find(|l| l.starts_with("ID_LIKE="))
            .map(|l| l.strip_prefix("ID_LIKE=").unwrap_or("").trim_matches('"').to_lowercase())
            .unwrap_or_default();

        if id == "fedora" || id_like.contains("fedora") || id == "rhel" || id_like.contains("rhel") || id == "centos" {
            return "fedora".to_string();
        }
        if id == "ubuntu" || id == "debian" || id_like.contains("debian") || id_like.contains("ubuntu") {
            return "debian".to_string();
        }
        if id == "arch" || id_like.contains("arch") {
            return "arch".to_string();
        }
        if id == "opensuse" || id_like.contains("suse") {
            return "suse".to_string();
        }
        return id;
    }
    "unknown".to_string()
}

/// Check if nvidia-smi is available and working
fn check_nvidia_gpu() -> (bool, String) {
    if let Ok(output) = Command::new("nvidia-smi")
        .args(["--query-gpu=name", "--format=csv,noheader,nounits"])
        .output()
    {
        if output.status.success() {
            let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return (true, name);
        }
    }
    (false, String::new())
}

// ── Toolkit Check ─────────────────────────────────────────────────────

/// On Windows: check for nvidia-smi (driver) and Docker Desktop (toolkit equivalent)
#[cfg(windows)]
fn check_toolkit_installed() -> (bool, String) {
    // On Windows with Docker Desktop + WSL2, the "toolkit" is built-in via CUDA on WSL2
    // We check if Docker Desktop is running and the nvidia runtime is accessible
    if let Ok(output) = Command::new("docker")
        .args(["info", "--format", "{{json .Runtimes}}"])
        .output()
    {
        if output.status.success() {
            let info = String::from_utf8_lossy(&output.stdout);
            if info.contains("nvidia") {
                return (true, "Docker Desktop with NVIDIA runtime".to_string());
            } else {
                // Docker is running but nvidia runtime not configured
                return (false, String::new());
            }
        }
    }
    // Docker Desktop not running or not installed
    (false, String::new())
}

/// On Linux: check package managers and nvidia-ctk binary
#[cfg(not(windows))]
fn check_toolkit_installed() -> (bool, String) {
    // Try RPM-based check (Fedora, RHEL, CentOS, SUSE)
    if let Ok(output) = Command::new("rpm")
        .args(["-q", "nvidia-container-toolkit"])
        .output()
    {
        if output.status.success() {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return (true, version);
        }
    }

    // Try dpkg check (Debian, Ubuntu)
    if let Ok(output) = Command::new("dpkg")
        .args(["-l", "nvidia-container-toolkit"])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if stdout.contains("ii ") {
                // Extract version from dpkg output
                for line in stdout.lines() {
                    if line.starts_with("ii ") {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() >= 3 {
                            return (true, parts[2].to_string());
                        }
                    }
                }
                return (true, "installed".to_string());
            }
        }
    }

    // Try pacman check (Arch)
    if let Ok(output) = Command::new("pacman")
        .args(["-Q", "nvidia-container-toolkit"])
        .output()
    {
        if output.status.success() {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return (true, version);
        }
    }

    // Fallback: check if the nvidia-ctk binary exists
    if let Ok(output) = Command::new("nvidia-ctk")
        .arg("--version")
        .output()
    {
        if output.status.success() {
            let ver = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return (true, ver);
        }
    }

    (false, String::new())
}

/// Check if Docker has the nvidia runtime registered
fn check_docker_nvidia_runtime() -> bool {
    if let Ok(output) = Command::new("docker")
        .args(["info", "--format", "{{json .Runtimes}}"])
        .output()
    {
        if output.status.success() {
            let info = String::from_utf8_lossy(&output.stdout);
            return info.contains("nvidia");
        }
    }
    false
}

// ── Install / Configure Commands ─────────────────────────────────────

#[cfg(windows)]
fn get_install_command(_distro: &str) -> String {
    concat!(
        "OPEN: https://www.nvidia.com/Download/index.aspx\n",
        "Download and install the latest NVIDIA Game Ready or Studio Driver for your GPU.\n",
        "Then install Docker Desktop from: https://www.docker.com/products/docker-desktop/\n",
        "Ensure the WSL 2 backend is enabled in Docker Desktop > Settings > General."
    ).to_string()
}

#[cfg(not(windows))]
fn get_install_command(distro: &str) -> String {
    match distro {
        "fedora" => concat!(
            "# Add NVIDIA Container Toolkit repo\n",
            "curl -s -L https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo | sudo tee /etc/yum.repos.d/nvidia-container-toolkit.repo\n",
            "# Install the toolkit\n",
            "sudo dnf install -y nvidia-container-toolkit"
        ).to_string(),
        "debian" => concat!(
            "# Add NVIDIA GPG key and repo\n",
            "curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg\n",
            "curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list\n",
            "# Install the toolkit\n",
            "sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit"
        ).to_string(),
        "arch" => "sudo pacman -S nvidia-container-toolkit".to_string(),
        "suse" => concat!(
            "sudo zypper ar https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo\n",
            "sudo zypper install -y nvidia-container-toolkit"
        ).to_string(),
        _ => "# Please install nvidia-container-toolkit for your Linux distribution.\n# See: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html".to_string(),
    }
}

#[cfg(windows)]
fn get_configure_command() -> String {
    "Open Docker Desktop > Settings > Resources > WSL Integration and ensure your WSL2 distro is enabled. GPU support is automatic.".to_string()
}

#[cfg(not(windows))]
fn get_configure_command() -> String {
    "sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker".to_string()
}

/// Full GPU setup status check (cross-platform)
pub fn check_gpu_setup() -> GpuSetupStatus {
    let (nvidia_gpu_detected, gpu_model) = check_nvidia_gpu();
    let (toolkit_installed, toolkit_version) = check_toolkit_installed();
    let docker_gpu_runtime = check_docker_nvidia_runtime();
    let distro_family = detect_distro_family();
    let install_command = get_install_command(&distro_family);
    let configure_command = get_configure_command();

    // On Windows: fully_ready = driver present + docker nvidia runtime accessible
    // On Linux: fully_ready = driver + toolkit package + docker runtime all confirmed
    let fully_ready = nvidia_gpu_detected && toolkit_installed && docker_gpu_runtime;

    GpuSetupStatus {
        nvidia_gpu_detected,
        gpu_model,
        toolkit_installed,
        toolkit_version,
        docker_gpu_runtime,
        fully_ready,
        distro_family,
        install_command,
        configure_command,
    }
}

/// Attempt to install nvidia-container-toolkit
#[cfg(windows)]
pub fn install_toolkit(_distro: &str) -> Result<String, String> {
    // On Windows, we can't run a shell command to install - open browser instead
    Err("On Windows, please download the NVIDIA Driver from:\nhttps://www.nvidia.com/Download/index.aspx\n\nThen install Docker Desktop from:\nhttps://www.docker.com/products/docker-desktop/".to_string())
}

#[cfg(not(windows))]
pub fn install_toolkit(distro: &str) -> Result<String, String> {
    let (cmd, args) = match distro {
        "fedora" => ("pkexec", vec![
            "bash", "-c",
            "curl -s -L https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo | tee /etc/yum.repos.d/nvidia-container-toolkit.repo && dnf install -y nvidia-container-toolkit"
        ]),
        "debian" => ("pkexec", vec![
            "bash", "-c",
            "curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg && curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | tee /etc/apt/sources.list.d/nvidia-container-toolkit.list && apt-get update && apt-get install -y nvidia-container-toolkit"
        ]),
        "arch" => ("pkexec", vec!["pacman", "-S", "--noconfirm", "nvidia-container-toolkit"]),
        _ => return Err("Unsupported distribution. Please install nvidia-container-toolkit manually.".to_string()),
    };

    let output = Command::new(cmd)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run install command: {}", e))?;

    if output.status.success() {
        Ok("nvidia-container-toolkit installed successfully!".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Installation failed: {}", stderr))
    }
}

/// Configure Docker to use the nvidia runtime
#[cfg(windows)]
pub fn configure_docker_gpu() -> Result<String, String> {
    Err("On Windows, GPU support is built into Docker Desktop.\nGo to: Docker Desktop > Settings > Resources > WSL Integration\nEnsure your WSL2 distro is enabled and restart Docker Desktop.".to_string())
}

#[cfg(not(windows))]
pub fn configure_docker_gpu() -> Result<String, String> {
    let output = Command::new("pkexec")
        .args(["bash", "-c", "nvidia-ctk runtime configure --runtime=docker && systemctl restart docker"])
        .output()
        .map_err(|e| format!("Failed to configure Docker: {}", e))?;

    if output.status.success() {
        Ok("Docker configured for GPU passthrough and restarted!".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Configuration failed: {}", stderr))
    }
}

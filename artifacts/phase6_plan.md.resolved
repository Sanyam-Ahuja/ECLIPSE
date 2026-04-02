# Phase 6 — Contributor Tauri App: DETAILED EXECUTION PLAN

**Goal:** Polished desktop app: install → auto-detect GPU → register → contribute → see earnings.

---

## Tauri Project Setup

### 1. Initialize Tauri + Svelte

```bash
# In client/ directory
npx -y create-tauri-app --template svelte-ts --name campugrid-contributor
```

**Tauri config (`src-tauri/tauri.conf.json`) key settings:**
```json
{
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "CampuGrid Contributor",
        "width": 420,
        "height": 680,
        "resizable": true,
        "decorations": true
      }
    ],
    "systemTray": {
      "iconPath": "icons/tray-grey.png",
      "tooltip": "CampuGrid — Offline"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["deb", "appimage", "nsis", "msi"],
    "identifier": "com.campugrid.contributor"
  }
}
```

**Tray icons (4 states):**
- `tray-grey.png` — Offline (not running)
- `tray-blue.png` — Standby (running, waiting for jobs)
- `tray-green.png` — Contributing (job active)
- `tray-yellow.png` — Paused (user active or temp high)

---

## Rust Backend (`client/src-tauri/src/`)

### 2. `main.rs` — Entry Point

```rust
fn main() {
    tauri::Builder::default()
        .system_tray(create_system_tray())
        .on_system_tray_event(handle_tray_event)
        .invoke_handler(tauri::generate_handler![
            // Tauri commands (JS ↔ Rust bridge)
            cmd_start_daemon,
            cmd_stop_daemon,
            cmd_get_daemon_status,
            cmd_get_gpu_info,
            cmd_check_docker,
            cmd_install_docker,
            cmd_pull_image,
            cmd_get_settings,
            cmd_save_settings,
            cmd_get_earnings,
            cmd_get_history,
            cmd_get_leaderboard,
        ])
        .setup(|app| {
            // On startup: check Docker, check NVIDIA, start daemon if auto-start enabled
            Ok(())
        })
        .run(tauri::generate_context!())
}
```

### 3. `daemon_manager.rs` — Python Daemon Lifecycle

**Purpose:** Start/stop/monitor the Python daemon as a child process.

```rust
// Manages the Python daemon subprocess
// - start(): spawn PyInstaller executable as child process
//   - Pass args: --server-url, --node-id, --auth-token
//   - Capture stdout/stderr for logs
//   - Monitor process health
// - stop(): send SIGTERM, wait 5s, SIGKILL if needed
// - restart(): stop + start
// - status(): is process running, PID, uptime
// - get_logs(n_lines): last N lines of daemon output
//
// Communication: daemon writes JSON status to a Unix socket / named pipe
// Tauri reads from that pipe to get:
//   - current job info (job_id, chunk_id, type, progress)
//   - resource usage (cpu%, ram%, gpu%, temp)
//   - connection status (connected/disconnected to server)
//   - earnings for current session
```

### 4. `docker_manager.rs` — Docker Installation & Management

**Purpose:** Detect Docker installation, install if missing, manage images.

```rust
// check_docker() -> DockerStatus { installed: bool, version: String, running: bool }
//   - Run `docker --version` and `docker info`
//   - On Windows: also check WSL2 status
//
// install_docker() -> Result
//   - Linux: run install_docker.sh (apt-get install docker-ce)
//   - Windows: run install_docker.ps1 (download Docker Desktop installer, silent install)
//   - After install: add user to docker group (Linux), prompt restart if needed
//
// check_nvidia_docker() -> bool
//   - Run `docker run --rm --gpus all nvidia/cuda:12.1-base nvidia-smi`
//   - If fails: NVIDIA Container Toolkit not installed
//
// install_nvidia_toolkit() -> Result
//   - Linux: apt-get install nvidia-container-toolkit
//   - Windows: included with Docker Desktop + NVIDIA drivers
//
// pull_image(image_name: String) -> PullProgress
//   - docker pull {image_name}
//   - Stream progress (layer download %) back to frontend
//   - Return: success/failure
//
// list_cached_images() -> Vec<String>
//   - docker images --format '{{.Repository}}:{{.Tag}}' | grep campugrid
```

### 5. `nvidia_check.rs` — GPU Detection

```rust
// detect_gpu() -> GpuInfo
//   - Run nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv
//   - Parse: gpu_model, vram_gb, driver_version
//   - Also get CUDA version: nvcc --version
//   - Return: GpuInfo { model, vram_gb, cuda_version, driver_version }
//
// benchmark_gpu() -> BenchmarkResult
//   - Run a standardized CUDA kernel (small matrix multiply)
//   - Measure TFLOPS → compare against known benchmarks
//   - Used to verify reported GPU model is real
//   - Return: measured_tflops, expected_tflops, match_confidence
```

### 6. `system_tray.rs` — System Tray Management

```rust
// State machine for tray icon:
// - Offline → grey icon, menu: [Start, Settings, Quit]
// - Standby → blue icon, menu: [Stop, Dashboard, Settings, Quit]
// - Contributing → green icon, menu: [Pause, Job Info, Dashboard, Settings, Quit]
// - Paused → yellow icon, menu: [Resume, Dashboard, Settings, Quit]
//
// Tray tooltip shows: "CampuGrid — Contributing | RTX 4060 | ₹12.50 earned today"
//
// Click tray icon → open main window
// Right-click → context menu
```

### 7. `auto_updater.rs` — Self-Update

```rust
// On startup: GET /api/v1/version → { latest: "0.2.1", download_url: "..." }
// Compare with current version
// If newer: show update notification in app
// User clicks "Update" → download new installer, run, restart
// Tauri has built-in updater: https://tauri.app/v1/guides/distribution/updater/
```

---

## Svelte Frontend (`client/src/`)

### 8. Design System

**Same dark theme as web app for brand consistency:**
- Background: `#0a0a0f`
- Surface: `#12121a`
- Primary: `#6366f1` (indigo)
- Success: `#22c55e`, Warning: `#eab308`, Danger: `#ef4444`
- Font: Inter, loaded from app bundle (not CDN — desktop app)

**Layout:** Single-window app, 420×680px default, tab navigation at top.

### 9. `routes/Dashboard.svelte` — Main Dashboard

```
┌────────────────────────────────┐
│ CampuGrid ■ Contributing      │  (green dot = active)
├────────────────────────────────┤
│                                │
│  ┌───────────────────────┐     │
│  │  GPU: RTX 4060        │     │
│  │  ██████████░░░  72%   │     │  GPU utilization gauge
│  │  VRAM: 5.2/8 GB       │     │
│  │  Temp: 68°C           │     │
│  └───────────────────────┘     │
│                                │
│  ┌──────────┐ ┌──────────┐    │
│  │ Session  │ │ Today    │    │
│  │ ₹42.50   │ │ ₹127.50  │    │  Earnings cards
│  │ 3.2 hrs  │ │ 9.6 hrs  │    │
│  └──────────┘ └──────────┘    │
│  ┌──────────┐ ┌──────────┐    │
│  │ Month    │ │ Lifetime │    │
│  │ ₹3,850   │ │ ₹12,400  │    │
│  │ 289 hrs  │ │ 931 hrs  │    │
│  └──────────┘ └──────────┘    │
│                                │
│  ┌───────────────────────┐     │
│  │ Current Job           │     │
│  │ Type: ML Training     │     │  Active job card
│  │ Progress: 67%         │     │
│  │ ████████████░░░░░     │     │
│  │ Est. remaining: 12min │     │
│  └───────────────────────┘     │
│                                │
│  Rate: ₹13.20/hr              │  Current earning rate
│  Reliability: ★★★★☆ 0.94      │
│                                │
├─ Dashboard │ Settings │ History┤  Tab bar
└────────────────────────────────┘
```

**Data source:** Reads from Python daemon status pipe (via Tauri commands).

### 10. `routes/Settings.svelte` — Resource Limits & Schedule

```
┌────────────────────────────────┐
│ ⚙️ Settings                    │
├────────────────────────────────┤
│                                │
│  Resource Limits               │
│  ─────────────────             │
│  Max CPU:    ████████░░  80%   │  (slider)
│  Max RAM:    ████████░░  12GB  │  (slider)
│  Max GPU:    ██████████  100%  │  (slider)
│  Temp Limit: ███████░░░  83°C │  (slider)
│                                │
│  Schedule                      │
│  ─────────────────             │
│  ○ Always on                   │
│  ● Scheduled                   │
│  From: [22:00] To: [08:00]    │  (contribute overnight)
│  Days: ☑Mon ☑Tue ☑Wed ☑Thu    │
│        ☑Fri ☐Sat ☐Sun         │
│                                │
│  Auto-start on login: [✓]     │
│                                │
│  Payment                       │
│  ─────────────────             │
│  Mode: ○ Credits  ● Cash      │
│  UPI ID: [user@paytm    ]     │
│  Min payout: ₹[500]           │
│                                │
│         [ Save Settings ]      │
└────────────────────────────────┘
```

**Settings persistence:** Saved to local JSON file via Tauri `app_data_dir()`. Loaded on startup, sent to daemon.

### 11. `routes/History.svelte` — Past Contributions

```
┌────────────────────────────────┐
│ 📋 History                     │
├────────────────────────────────┤
│                                │
│  March 2026                    │
│  ┌────────────────────────┐    │
│  │ 🎨 Render job  3h ago  │    │
│  │ Duration: 45min         │    │
│  │ GPU-hours: 0.75         │    │
│  │ Earned: ₹9.90           │    │
│  ├────────────────────────┤    │
│  │ 🧠 ML Training 8h ago  │    │
│  │ Duration: 2h 15min      │    │
│  │ GPU-hours: 2.25         │    │
│  │ Earned: ₹29.70          │    │
│  ├────────────────────────┤    │
│  │ 📊 Data Process 1d ago │    │
│  │ Duration: 30min         │    │
│  │ GPU-hours: 0.50         │    │
│  │ Earned: ₹6.60           │    │
│  └────────────────────────┘    │
│                                │
│  Showing 15 of 47 jobs         │
│  [ Load more ]                 │
└────────────────────────────────┘
```

**Data source:** `GET /api/v1/nodes/me/history?page=1&limit=15`

### 12. `routes/Leaderboard.svelte` — Campus Rankings

```
┌────────────────────────────────┐
│ 🏆 Leaderboard — March 2026   │
├────────────────────────────────┤
│                                │
│  Your Rank: #7    🔥3-day streak│
│  Tier: ⚡ Cluster (Lv.2/5)    │
│                                │
│  ┌─────────────────────────┐   │
│  │ #1 🥇 Node_Alpha        │   │
│  │    289 GPU-hrs  ★★★★★   │   │
│  │    Tier: 🌩️ Supercomputer│   │
│  ├─────────────────────────┤   │
│  │ #2 🥈 GPUKing42         │   │
│  │    234 GPU-hrs  ★★★★☆   │   │
│  ├─────────────────────────┤   │
│  │ #3 🥉 RTX_Warrior       │   │
│  │    201 GPU-hrs  ★★★★☆   │   │
│  ├─────────────────────────┤   │
│  │ ...                      │   │
│  ├─────────────────────────┤   │
│  │ #7 ⭐ You                │   │  (highlighted)
│  │    89 GPU-hrs   ★★★☆☆   │   │
│  └─────────────────────────┘   │
│                                │
│  Impact: Your GPU helped       │
│  complete 47 student projects  │
│  and saved ₹1,20,000 in       │
│  cloud costs this semester.    │
└────────────────────────────────┘
```

---

## Server-Side: Billing Engine

### 13. `server/app/services/billing_service.py` — Pricing & Earnings

```python
class BillingService:
    async def calculate_chunk_cost(self, chunk: Chunk, node: Node) -> BillingBreakdown:
        """Calculate cost for a completed chunk."""
        gpu_model = node.gpu_model
        gpu_hours = chunk.gpu_hours  # (completed_at - started_at).seconds / 3600
        
        # Base price
        base_rate = customer_price_per_hour(gpu_model)  # from gpu_benchmarks.py
        
        # ML sync mode multiplier
        job = await db.get_job(chunk.job_id)
        sync_multiplier = ML_SYNC_MULTIPLIER.get(job.ml_sync_mode, 1.0)
        
        # Dynamic supply/demand multiplier
        dyn_multiplier = dynamic_multiplier(gpu_model)
        
        customer_charge = base_rate * gpu_hours * sync_multiplier * dyn_multiplier
        contributor_credit = customer_charge * CONTRIBUTOR_SHARE  # 72%
        platform_fee = customer_charge * PLATFORM_CUT  # 28%
        
        # Electricity deduction for contributor
        power_watts = GPU_BENCHMARKS[gpu_model][2]
        electricity_cost = (power_watts / 1000) * 0.096 * gpu_hours  # ₹/kWh
        contributor_net = contributor_credit - electricity_cost
        
        return BillingBreakdown(
            customer_charge=customer_charge,
            contributor_gross=contributor_credit,
            contributor_net=contributor_net,
            electricity_cost=electricity_cost,
            platform_fee=platform_fee,
            dynamic_multiplier=dyn_multiplier,
        )
    
    async def record_billing(self, chunk: Chunk, breakdown: BillingBreakdown):
        """Write billing record to DB and update balances."""
        # 1. Insert BillingRecord
        # 2. Deduct from customer credit_balance
        # 3. Add to contributor node.total_earned
        # 4. Update job.actual_cost

    async def get_contributor_earnings(self, user_id: str) -> EarningsSummary:
        """Aggregate earnings for a contributor."""
        # session_earnings (since daemon last started)
        # today_earnings
        # month_earnings
        # lifetime_earnings
        # current_rate_per_hour (based on GPU model + dynamic pricing)
```

### 14. Gamification System

**Rank tiers (in `server/app/utils/gamification.py`):**
```python
RANK_TIERS = [
    {"name": "Node",          "icon": "💻", "min_gpu_hours": 0,     "level": 1},
    {"name": "Cluster",       "icon": "⚡", "min_gpu_hours": 50,    "level": 2},
    {"name": "Datacenter",    "icon": "🏢", "min_gpu_hours": 200,   "level": 3},
    {"name": "Supercomputer", "icon": "🌩️", "min_gpu_hours": 1000,  "level": 4},
    {"name": "Hyperscaler",   "icon": "🌌", "min_gpu_hours": 5000,  "level": 5},
]

def get_tier(total_gpu_hours: float) -> dict:
    for tier in reversed(RANK_TIERS):
        if total_gpu_hours >= tier["min_gpu_hours"]:
            return tier
    return RANK_TIERS[0]
```

**Streak tracking (in `models/node.py`):**
```python
# Additional fields on Node model:
# current_streak: int (consecutive days contributed)
# longest_streak: int
# last_contribution_date: date
#
# On each job completion:
#   if last_contribution_date == today: pass
#   elif last_contribution_date == yesterday: current_streak += 1
#   else: current_streak = 1 (streak broken)
#   longest_streak = max(longest_streak, current_streak)
```

**API endpoint:** `GET /api/v1/leaderboard?campus=all&period=month`

---

## Bundling

### 15. PyInstaller Bundle for Python Daemon

```bash
# In client/daemon/
pyinstaller --onefile --name campugrid-daemon agent.py
# Produces: dist/campugrid-daemon (Linux) or dist/campugrid-daemon.exe (Windows)
# Size: ~30-50MB (includes Python runtime + dependencies)
```

**Tauri bundles this executable** inside the app package. On first run, extracts to app data dir.

### 16. Tauri Build

```bash
# In client/
npm run tauri build
# Produces:
# Linux: .deb + .AppImage
# Windows: .msi + .exe (NSIS installer)
# Total size including daemon: ~50-70MB
```

---

## Phase 6 Completion Test

1. Build Tauri app for Linux
2. Install on a second machine (or same machine, different directory)
3. First-run: auto-detects RTX 4060, checks Docker (installed), checks NVIDIA toolkit
4. Registration flow: creates account → registers node with server
5. System tray icon → blue (standby)
6. Submit a job from web app → tray icon → green (contributing)
7. Dashboard shows: GPU meter, current job, earnings updating in real-time
8. Job completes → earnings increment → tray icon back to blue
9. Settings: set schedule 22:00-08:00, save → daemon pauses outside hours
10. History: see completed job with earnings breakdown
11. Leaderboard: see campus rankings (will be just this one node for now)

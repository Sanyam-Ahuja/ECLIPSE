import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Activity, Power, Settings, Cpu, Clock } from "lucide-react";
import clsx from "clsx";
import Dashboard from "./Dashboard";
import WorkloadView from "./WorkloadView";
import SettingsView from "./SettingsView";
import SetupView from "./SetupView";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isActive, setIsActive] = useState(false);
  const [hwProfile, setHwProfile] = useState<any>(null);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [isSetup, setIsSetup] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    // Check if credentials exist
    invoke("has_credentials").then((has: any) => {
      setIsSetup(!!has);
    }).catch(() => {
      setIsSetup(false);
    });

    // Initial fetch
    invoke("get_hardware_profile").then((res: any) => {
      setHwProfile(res);
    }).catch(console.error);

    // Setup listeners
    const unlistenWs = listen("ws_status", (event: any) => {
      setWsStatus(event.payload.status);
    });

    const unlistenJob = listen("job_dispatch", (event: any) => {
      setCurrentJob(event.payload.job);
      setActiveTab("workload");
      setIsActive(true);
    });

    return () => {
      unlistenWs.then(f => f());
      unlistenJob.then(f => f());
    };
  }, []);

  const toggleActive = async () => {
    try {
      const newState = await invoke("toggle_active");
      setIsActive(newState as boolean);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetupComplete = () => {
    setIsSetup(true);
    // Restart WebSocket connection with new credentials
    invoke("restart_websocket").catch(console.error);
  };

  // Loading state while checking credentials
  if (isSetup === null) {
    return (
      <div className="flex h-screen bg-[#0a0a0f] items-center justify-center">
        <div className="animate-pulse text-[#64748b]">Loading...</div>
      </div>
    );
  }

  // Show setup if no credentials
  if (!isSetup) {
    return (
      <div className="h-screen bg-[#0a0a0f] text-white overflow-y-auto">
        <SetupView onComplete={handleSetupComplete} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-text overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-16 bg-surface/50 border-r border-border flex flex-col items-center py-6 gap-6 relative z-20">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="font-bold text-white leading-none">C</span>
        </div>
        
        <nav className="flex-1 flex flex-col gap-4 w-full px-2 mt-4">
          <NavBtn icon={Activity} active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
          <NavBtn icon={Cpu} active={activeTab === "workload"} onClick={() => setActiveTab("workload")} indicator={!!currentJob} />
          <NavBtn icon={Clock} active={activeTab === "history"} onClick={() => setActiveTab("history")} />
          <NavBtn icon={Settings} active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
        </nav>
        
        <button 
          onClick={toggleActive}
          className={clsx(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
            isActive ? "bg-success text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]" : "bg-white/10 text-text-muted hover:text-white"
          )}
        >
          <Power size={20} />
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto">
        {/* Status Bar */}
        <div className="sticky top-0 right-0 left-0 h-8 bg-surface border-b border-border z-10 flex items-center justify-end px-4 gap-4 text-xs font-medium" data-tauri-drag-region>
          <div className="flex items-center gap-1.5 text-text-muted">
            <div className={clsx("w-2 h-2 rounded-full", wsStatus === "connected" ? "bg-success" : "bg-danger")} />
            {wsStatus === "connected" ? "Connected to Grid" : "Disconnected"}
          </div>
          {hwProfile && (
            <div className="flex items-center gap-2 text-text-muted border-l border-white/10 pl-4">
              <Cpu size={12} /> {hwProfile.gpu_model} • {hwProfile.gpu_vram_gb.toFixed(1)}GB
            </div>
          )}
        </div>

        <div className="p-8">
          {activeTab === "dashboard" && <Dashboard isActive={isActive} toggleActive={toggleActive} hwProfile={hwProfile} />}
          {activeTab === "workload" && <WorkloadView currentJob={currentJob} />}
          {activeTab === "history" && <HistoryPlaceholder />}
          {activeTab === "settings" && <SettingsView />}
        </div>
      </main>
    </div>
  );
}

function HistoryPlaceholder() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="pb-6 border-b border-border">
        <h1 className="text-3xl font-bold tracking-tight text-white">Job History</h1>
        <p className="text-text-muted mt-1">Your past contributions to the CampuGrid network.</p>
      </header>
      <div className="glass rounded-2xl p-12 text-center">
        <Clock size={48} className="text-text-muted mx-auto mb-4" />
        <p className="text-text-muted">No completed jobs yet.</p>
        <p className="text-xs text-text-muted mt-2">Activate your node to start receiving workloads.</p>
      </div>
    </div>
  );
}

function NavBtn({ icon: Icon, active, onClick, indicator }: any) {
  return (
    <button 
      onClick={onClick}
      className={clsx(
        "w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative",
        active ? "bg-primary/20 text-primary border border-primary/30" : "text-text-muted hover:text-white hover:bg-white/5"
      )}
    >
      <Icon size={22} />
      {indicator && !active && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-success animate-pulse" />
      )}
    </button>
  );
}

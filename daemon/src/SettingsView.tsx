import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { HardDrive, Cpu, Settings as SettingsIcon, Globe, Save, RefreshCw } from "lucide-react";

export default function SettingsView() {
  const [config, setConfig] = useState({ api_url: "", ws_url: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    invoke("get_backend_config")
      .then((res: any) => setConfig(res))
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await invoke("update_backend_config", { config });
      setMessage("Settings saved. Restarting connection...");
      await invoke("restart_websocket");
      setTimeout(() => setMessage(""), 3000);
    } catch (e: any) {
      setMessage(`Error: ${e}`);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header className="pb-6 border-b border-border">
        <h1 className="text-3xl font-bold tracking-tight text-white">Node Settings</h1>
        <p className="text-text-muted mt-1">Configure resource limits and contribution schedule.</p>
      </header>

      <div className="max-w-3xl space-y-8">
        {/* Network & Backend */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Globe className="text-blue-400" size={20} /> Network & Backend
          </h2>
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Backend API URL</label>
                <input 
                  type="text" 
                  value={config.api_url}
                  onChange={e => setConfig({ ...config, api_url: e.target.value })}
                  placeholder="http://your-vm-ip:8000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-all font-mono" 
                />
                <p className="text-[10px] text-text-muted mt-1.5">For authentication and registration (e.g., http://34.123.45.67:8000)</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">WebSocket URL</label>
                <input 
                  type="text" 
                  value={config.ws_url}
                  onChange={e => setConfig({ ...config, ws_url: e.target.value })}
                  placeholder="ws://your-vm-ip:8000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-all font-mono" 
                />
                <p className="text-[10px] text-text-muted mt-1.5">For live job dispatches (e.g., ws://34.123.45.67:8000)</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {message && <span className={`text-xs ${message.includes("Error") ? "text-red-400" : "text-emerald-400"}`}>{message}</span>}
              <button 
                onClick={handleSave}
                disabled={saving}
                className="ml-auto flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? "Saving..." : "Apply & Reconnect"}
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Cpu className="text-primary" size={20} /> Resource Allocation
          </h2>
          <div className="glass rounded-2xl p-6 space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-white">Max GPU VRAM Allocation</label>
                <span className="text-sm font-bold text-primary">80%</span>
              </div>
              <input type="range" min="10" max="100" defaultValue="80" className="w-full accent-primary" />
              <p className="text-xs text-text-muted mt-2">Maximum amount of Video RAM workloads are allowed to use.</p>
            </div>
            
            <div className="pt-4 border-t border-white/10">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-white">System RAM Limit</label>
                <span className="text-sm font-bold text-primary">16 GB</span>
              </div>
              <input type="range" min="4" max="64" defaultValue="16" className="w-full accent-primary" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <HardDrive className="text-secondary" size={20} /> Storage & Docker
          </h2>
          <div className="glass rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white">Docker Engine path</h3>
                <p className="text-xs text-text-muted">Auto-detected from system $PATH</p>
              </div>
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-text-muted font-mono">
                /usr/bin/docker
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-white">Max Local Cache (Images & Artifacts)</label>
                <span className="text-sm font-bold text-secondary">50 GB</span>
              </div>
              <input type="range" min="10" max="250" defaultValue="50" className="w-full accent-secondary" />
              <div className="flex justify-between items-center mt-4">
                <p className="text-xs text-text-muted">Currently using ~12.4 GB</p>
                <button className="text-xs font-semibold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                  Clear Cache
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <SettingsIcon className="text-yellow-400" size={20} /> Schedule
          </h2>
          <div className="glass rounded-2xl p-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 rounded border-border bg-background accent-primary" />
              <div>
                <span className="block text-sm font-medium text-white mb-1">Only active when computer is idle</span>
                <span className="block text-xs text-text-muted">Node will pause accepting new chunks if user input is detected.</span>
              </div>
            </label>
            
            <label className="flex items-start gap-3 cursor-pointer mt-6 border-t border-white/10 pt-6">
              <input type="checkbox" className="mt-1 w-4 h-4 rounded border-border bg-background accent-primary" />
              <div>
                <span className="block text-sm font-medium text-white mb-1">Launch on startup</span>
                <span className="block text-xs text-text-muted">Start CampuGrid automatically silently in the system tray.</span>
              </div>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}

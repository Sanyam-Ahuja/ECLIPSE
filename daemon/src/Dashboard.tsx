import { Activity, Zap, ShieldCheck, Database } from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

export default function Dashboard({ isActive, toggleActive, hwProfile }: any) {
  const [telemetry, setTelemetry] = useState<any[]>([]);

  useEffect(() => {
    const unlisten = listen("telemetry", (event: any) => {
      setTelemetry(prev => {
        const next = [...prev, event.payload];
        if (next.length > 20) return next.slice(next.length - 20);
        return next;
      });
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  const latestStats = telemetry.length > 0 ? telemetry[telemetry.length - 1] : { gpu_load: 0, temp: 0, vram_percent: 0 };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Node Dashboard</h1>
          <p className="text-text-muted mt-1">Manage your active contribution to the network.</p>
        </div>
        
        <div className="flex flex-col items-end">
          <p className="text-sm text-text-muted mb-2 uppercase tracking-wide font-semibold">Node Status</p>
          <button 
            onClick={toggleActive}
            className={clsx(
              "px-8 py-3 rounded-2xl font-bold text-lg transition-all shadow-xl flex items-center gap-3",
              isActive 
                ? "bg-gradient-to-r from-danger to-red-600 text-white shadow-danger/20 hover:shadow-danger/40" 
                : "bg-gradient-to-r from-success to-emerald-500 text-white shadow-success/20 hover:shadow-success/40"
            )}
          >
            <PowerIcon />
            {isActive ? "Stop Node" : "Start Earning"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-6 mt-8">
        <div className="col-span-2 glass rounded-3xl p-8 border-t-4 border-t-primary relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-primary/20 transition-colors" />
          
          <h2 className="text-lg font-semibold text-white mb-6">Live Telemetry</h2>
          
          <div className="grid grid-cols-3 gap-8 mb-8">
            <Stat label="GPU Load" value={`${latestStats.gpu_load}%`} icon={Activity} color="text-primary" />
            <Stat label="Temperature" value={`${latestStats.temp}°C`} icon={Zap} color="text-yellow-400" />
            <Stat label="VRAM Usage" value={`${latestStats.vram_percent}%`} icon={Database} color="text-secondary" />
          </div>

          <div className="h-40 w-full -ml-4">
            {telemetry.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetry}>
                  <Area 
                    type="monotone" 
                    dataKey="gpu_load" 
                    stroke="#6366f1" 
                    fill="#6366f1" 
                    fillOpacity={0.1}
                    strokeWidth={2}
                    animationDuration={300}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="vram_percent" 
                    stroke="#8b5cf6" 
                    fill="#8b5cf6" 
                    fillOpacity={0.1}
                    strokeWidth={2}
                    animationDuration={300}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-text-muted text-sm border border-dashed border-white/10 rounded-xl">
                Waiting for telemetry...
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-3xl p-6 h-[47%] flex flex-col justify-center">
            <h3 className="text-sm text-text-muted font-bold uppercase tracking-wider mb-2">Total Earnings</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold text-success">$14.50</span>
              <span className="text-sm text-text-muted font-medium">USD</span>
            </div>
            <p className="text-xs text-text-muted">+ $2.10 today</p>
          </div>
          
          <div className="glass rounded-3xl p-6 h-[47%] flex flex-col justify-center">
            <h3 className="text-sm text-text-muted font-bold uppercase tracking-wider mb-2">Platform Trust</h3>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="text-blue-400" size={28} />
              <span className="text-3xl font-bold text-white">99.8%</span>
            </div>
            <p className="text-xs text-text-muted">High reliability score. Priority routing enabled.</p>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 mt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Hardware Profile</h3>
        <div className="grid grid-cols-4 gap-4 text-sm bg-background border border-border rounded-xl p-4">
          <ProfileItem label="OS" value={hwProfile?.os || "Loading..."} />
          <ProfileItem label="CPU Cores" value={hwProfile?.cpu_cores || "-"} />
          <ProfileItem label="System RAM" value={hwProfile ? `${hwProfile.ram_gb.toFixed(1)} GB` : "-"} />
          <ProfileItem label="CUDA Version" value={hwProfile?.cuda_version || "N/A"} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, color }: any) {
  return (
    <div className="flex flex-col border-l border-white/10 pl-4">
      <div className="flex items-center gap-2 text-text-muted text-xs font-bold uppercase tracking-wider mb-2">
        <Icon size={14} className={color} /> {label}
      </div>
      <span className="text-3xl font-bold text-white">{value}</span>
    </div>
  );
}

function ProfileItem({ label, value }: any) {
  return (
    <div className="flex flex-col">
      <span className="text-text-muted text-xs mb-1 uppercase tracking-wider">{label}</span>
      <span className="font-semibold text-white truncate">{value}</span>
    </div>
  );
}

function PowerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64A9 9 0 1 1 5.64 6.64"></path>
      <line x1="12" y1="2" x2="12" y2="12"></line>
    </svg>
  );
}

"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import Link from "next/link";
import { Activity, Cpu, HardDrive, Zap, TrendingUp, Search, Filter } from "lucide-react";
import { motion } from "motion/react";

export default function MonitorIndexPage() {
  const { data: session } = useSession();
  const api = new CampuGridAPI(session?.backend_jwt || "");

  const { data: jobsResponse, isLoading } = useQuery({
    queryKey: ["jobs-monitor", session?.backend_jwt],
    queryFn: () => api.getJobs(1, 100),
    enabled: !!session?.backend_jwt,
    refetchInterval: 10000,
  });

  const { data: clusterStats } = useQuery({
    queryKey: ["cluster-stats-monitor", session?.backend_jwt],
    queryFn: () => api.getClusterStats(),
    enabled: !!session?.backend_jwt,
    refetchInterval: 30000,
  });

  const jobs = jobsResponse?.jobs || [];
  const activeJobs = jobs.filter((j: any) => ["analyzing", "queued", "running", "assembling"].includes(j.status));

  return (
    <div className="p-8 relative min-h-screen">
      {/* 3D Background Graphics */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          className="absolute top-32 right-20 w-48 h-48 border-2 border-emerald-500/30 rounded-full shadow-lg shadow-emerald-500/20"
          animate={{ rotateY: [0, 360], scale: [1, 1.15, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
        <motion.div
           className="absolute bottom-20 right-40 w-36 h-36 border-2 border-emerald-500/25 rounded-lg"
           animate={{ rotateZ: [0, 360], rotateX: [0, 180, 360] }}
           transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
           style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
      </div>

      <div className="relative z-10 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Monitor</h1>
          <p className="text-slate-400">Real-time monitoring of active jobs and system performance.</p>
        </div>
        <div className="flex gap-3">
           <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search jobs..." 
                className="pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all w-64"
              />
           </div>
           <button className="p-2 bg-slate-900/50 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
              <Filter size={18} />
           </button>
        </div>
      </div>

      {/* Live Stats Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="Active Jobs"
          value={activeJobs.length.toString()}
          trend="+0%"
          iconBg="bg-emerald-500/20"
          iconColor="text-emerald-400"
        />
        <StatCard
          icon={<Cpu className="w-6 h-6" />}
          label="Nodes Online"
          value={clusterStats?.total_nodes || "0"}
          trend="+5%"
          iconBg="bg-emerald-500/20"
          iconColor="text-emerald-400"
        />
        <StatCard
          icon={<HardDrive className="w-6 h-6" />}
          label="Available VRAM"
          value={`${clusterStats?.total_vram_gb || 0}GB`}
          trend="+2.1%"
          iconBg="bg-emerald-500/20"
          iconColor="text-emerald-400"
        />
        <StatCard
          icon={<Zap className="w-6 h-6" />}
          label="Network Power"
          value={`${(activeJobs.length * 280)} W`}
          trend="-3.2%"
          iconBg="bg-emerald-500/20"
          iconColor="text-emerald-400"
        />
      </div>

      {/* Active Workloads List */}
      <div className="relative z-10 bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
           <Activity className="text-emerald-500" size={20} />
           Active Workloads
        </h2>
        
        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <div className="py-20 text-center text-slate-500 animate-pulse font-mono tracking-widest uppercase text-xs">
              Fetching Network State...
            </div>
          ) : activeJobs.length === 0 ? (
            <div className="py-20 text-center bg-slate-950/30 rounded-xl border border-dashed border-slate-800">
               <p className="text-slate-500 mb-4">No active workloads found on the grid.</p>
               <Link href="/submit">
                 <button className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20">
                    Submit Job
                 </button>
               </Link>
            </div>
          ) : (
            activeJobs.map((job: any) => (
              <motion.div 
                key={job.id} 
                className="group p-5 bg-slate-800/20 border border-slate-800/50 rounded-xl hover:bg-slate-800/40 hover:border-emerald-500/30 transition-all flex justify-between items-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-emerald-400 font-mono text-sm group-hover:text-emerald-300 transition-colors">
                      {job.id.substring(0, 12)}...
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-tighter rounded border border-emerald-500/20">
                      {job.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium max-w-md truncate">
                    {job.input_path}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="hidden md:block text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-black mb-1">Compute Cost</div>
                      <div className="text-sm font-bold text-white">$0.19 / hr</div>
                   </div>
                   <Link href={`/monitor/${job.id}`}>
                      <button className="px-5 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-bold group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-lg shadow-emerald-500/0 group-hover:shadow-emerald-500/20">
                        View Live Stats
                      </button>
                   </Link>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, iconBg, iconColor }: any) {
  const isPositive = trend.startsWith("+");
  return (
    <motion.div
      className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -4, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-400 text-sm font-medium">{label}</span>
        <div className={`p-2 rounded-lg ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-3xl font-black text-white">{value}</div>
        <div className={`flex items-center gap-1 text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          <TrendingUp size={14} className={!isPositive ? 'rotate-180' : ''} />
          <span>{trend}</span>
        </div>
      </div>
    </motion.div>
  );
}

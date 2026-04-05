"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import Link from "next/link";
import { Activity, Clock, Database, Server, Upload, FileText, IndianRupee, CreditCard } from "lucide-react";
import { motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";

export default function DashboardPage() {
  const { data: session } = useSession();

  const api = new CampuGridAPI(session?.backend_jwt || "");

  const { data: jobsResponse, isLoading } = useQuery({
    queryKey: ["jobs", session?.backend_jwt],
    queryFn: () => api.getJobs(1, 20),
    enabled: !!session?.backend_jwt,
    refetchInterval: 15000,
  });

  const { data: earnings } = useQuery({
    queryKey: ["dashboard-earnings", session?.backend_jwt],
    queryFn: () => api.getEarnings(),
    enabled: !!session?.backend_jwt,
  });

  const { data: clusterStats } = useQuery({
    queryKey: ["cluster-stats", session?.backend_jwt],
    queryFn: () => api.getClusterStats(),
    enabled: !!session?.backend_jwt,
    refetchInterval: 30000,
  });

  const jobs = jobsResponse?.jobs || [];
  const activeJobs = jobs.filter((j: any) => ["analyzing", "queued", "running", "assembling"].includes(j.status));

  return (
    <div className="p-8 relative">
      {/* 3D Floating Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          className="absolute top-20 right-40 w-64 h-64 border-2 border-emerald-500/40 rounded-full shadow-lg shadow-emerald-500/20"
          animate={{ rotateY: [0, 360], rotateX: [0, 180, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
        <motion.div
          className="absolute top-60 right-96 w-40 h-40 border-2 border-emerald-500/30 rounded-lg shadow-lg shadow-emerald-500/20"
          animate={{ rotateZ: [0, 180, 360], rotateY: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
        <motion.div
           className="absolute bottom-32 right-60 w-48 h-48 bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 rounded-full blur-2xl"
           animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
           transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">Welcome back. You have {activeJobs.length} active jobs running.</p>
        </div>
        <div className="flex items-center gap-4">
          {session?.backend_jwt && (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-1.5 flex flex-col items-start gap-0 w-48 shadow-inner overflow-hidden">
               <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Node Token</span>
               <input 
                 readOnly 
                 value={session.backend_jwt as string} 
                 className="bg-transparent border-none outline-none text-[10px] text-emerald-400 font-mono w-full blur-[3px] hover:blur-none transition-all cursor-text selection:bg-emerald-500/30"
                 onClick={e => (e.target as HTMLInputElement).select()}
               />
            </div>
          )}
          <Link href="/submit">
            <button className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-400 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20">
              <Upload size={18} />
              Submit New Job
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Database className="w-6 h-6" />}
          label="Total Jobs"
          value={jobsResponse?.total || 0}
          iconBg="bg-emerald-500/20"
          iconColor="text-emerald-400"
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="Active Jobs"
          value={activeJobs.length}
          iconBg="bg-emerald-500/20"
          iconColor="text-emerald-400"
        />
        <StatCard
          icon={<Clock className="w-6 h-6" />}
          label="GPU Hours"
          value={(earnings?.total_gpu_hours || 0).toFixed(1)}
          iconBg="bg-emerald-500/20"
          iconColor="text-emerald-400"
        />
        <StatCard
          icon={<Server className="w-6 h-6" />}
          label="Earned"
          value={`$${(earnings?.total_earned || 0).toFixed(2)}`}
          iconBg="bg-emerald-500/20"
          iconColor="text-emerald-400"
        />
      </div>

      {/* Network Status & Quick Actions */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div
          className="lg:col-span-2 bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="text-xl font-bold text-white mb-6">Network Status</h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-1">{clusterStats?.total_nodes || 0}</div>
              <div className="text-slate-400 text-sm">Available Nodes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-1">{clusterStats?.active_jobs || 0}</div>
              <div className="text-slate-400 text-sm">Active Jobs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-1">{clusterStats?.queued_jobs || 0}</div>
              <div className="text-slate-400 text-sm">Queue Size</div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Total VRAM Capacity</span>
                <span className="text-emerald-400">{clusterStats?.total_vram_gb || 0} GB</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
                  initial={{ width: "0%" }}
                  animate={{ width: `${Math.min(100, (clusterStats?.active_jobs || 0) * 5)}%` }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 rounded-xl p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/submit" className="block">
              <button className="w-full px-4 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-400 transition-colors text-left flex justify-between items-center group">
                <span>Submit Job</span>
                <Upload size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link href="/contributor" className="block">
              <button className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-left flex justify-between items-center group">
                <span>Manage Nodes</span>
                <Server size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link href="/billing" className="block">
              <button className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-left flex justify-between items-center group">
                <span>Add Funds</span>
                <CreditCard size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Recent Workloads Table */}
      <div className="relative z-10 bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Recent Workloads</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-slate-500 text-sm border-b border-slate-800">
                <th className="pb-4 font-medium">JOB ID / INPUT</th>
                <th className="pb-4 font-medium">TYPE</th>
                <th className="pb-4 font-medium">STATUS</th>
                <th className="pb-4 font-medium">TIME</th>
                <th className="pb-4 font-medium text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No workloads found. <Link href="/submit" className="text-emerald-400 hover:underline">Submit one</Link>
                  </td>
                </tr>
              ) : (
                jobs.map((job: any) => (
                  <tr key={job.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-4">
                      <div className="text-white font-mono text-sm">{job.id.substring(0, 8)}...</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[200px]">{job.input_path}</div>
                    </td>
                    <td className="py-4">
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs uppercase tracking-wider font-semibold">
                        {job.type}
                      </span>
                    </td>
                    <td className="py-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="py-4 text-slate-400 text-sm">
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </td>
                    <td className="py-4 text-right">
                      {job.status === "completed" ? (
                        <Link href={`/results/${job.id}`} className="text-emerald-400 hover:text-emerald-300 transition-colors text-sm font-medium">
                          View Results
                        </Link>
                      ) : (
                        <Link href={`/monitor/${job.id}`} className="text-emerald-400 hover:text-emerald-300 transition-colors text-sm font-medium">
                          Monitor Live
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, iconBg, iconColor }: any) {
  return (
    <motion.div
      className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -4, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-400 text-sm">{label}</span>
        <div className={`p-2 rounded-lg ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string, text: string }> = {
    analyzing:  { bg: "bg-emerald-500/20", text: "text-emerald-400" },
    queued:     { bg: "bg-yellow-500/20", text: "text-yellow-400" },
    running:    { bg: "bg-emerald-500/20", text: "text-emerald-400" },
    assembling: { bg: "bg-purple-500/20", text: "text-purple-400" },
    completed:  { bg: "bg-green-500/20", text: "text-green-400" },
    failed:     { bg: "bg-red-500/20", text: "text-red-400" },
    cancelled:  { bg: "bg-slate-500/20", text: "text-slate-400" },
  };

  const config = configs[status] || { bg: "bg-slate-800", text: "text-slate-400" };

  return (
    <span className={`px-3 py-1 ${config.bg} ${config.text} rounded-full text-xs font-semibold`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

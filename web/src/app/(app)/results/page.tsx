"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import Link from "next/link";
import { Download, Eye, Trash2, FileText, Image, Archive, FolderDown, Search, Filter } from "lucide-react";
import { motion } from "motion/react";

export default function ResultsIndexPage() {
  const { data: session } = useSession();
  const api = new CampuGridAPI(session?.backend_jwt || "");

  const { data: jobsResponse, isLoading } = useQuery({
    queryKey: ["jobs-results", session?.backend_jwt],
    queryFn: () => api.getJobs(1, 100),
    enabled: !!session?.backend_jwt,
  });

  const jobs = jobsResponse?.jobs || [];
  const completedJobs = jobs.filter((j: any) => ["completed", "failed", "cancelled"].includes(j.status));

  return (
    <div className="p-8 relative min-h-screen">
      {/* 3D Background Graphics */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          className="absolute top-40 right-60 w-52 h-52 border-2 border-emerald-400/35 rounded-full shadow-lg shadow-emerald-400/25"
          animate={{ rotateX: [0, 360], rotateZ: [0, 180, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
        <motion.div
           className="absolute bottom-40 right-20 w-44 h-44 border-2 border-emerald-400/30"
           animate={{ rotateY: [0, 360], y: [-15, 15, -15] }}
           transition={{ rotateY: { duration: 16, repeat: Infinity, ease: "linear" }, y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
           style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
      </div>

      <div className="relative z-10 flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Results</h1>
          <p className="text-slate-400">Download and manage your completed job outputs.</p>
        </div>
        <div className="flex gap-4">
           <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Find output..." 
                className="pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all w-64"
              />
           </div>
           <button className="px-4 py-2 bg-slate-800/50 border border-slate-800 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors">
              <Filter size={18} />
           </button>
        </div>
      </div>

      {/* Storage Usage (Dummy for now) */}
      <motion.div
        className="relative z-10 bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Grid Storage</h3>
            <p className="text-slate-400 text-sm">4.7 GB of 50 GB used</p>
          </div>
          <div className="text-emerald-400 text-2xl font-bold">9.4%</div>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            initial={{ width: "0%" }}
            animate={{ width: "9.4%" }}
            transition={{ duration: 1.5 }}
          />
        </div>
      </motion.div>

      {/* Results List */}
      <div className="relative z-10 grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="py-20 text-center text-slate-500 animate-pulse font-mono tracking-widest uppercase text-xs">
            Scanning result metadata...
          </div>
        ) : completedJobs.length === 0 ? (
          <div className="py-20 text-center bg-slate-950/30 border border-dashed border-slate-800 rounded-xl">
             <p className="text-slate-500 mb-4">No completed workloads found.</p>
             <Link href="/submit" className="text-emerald-400 hover:text-emerald-300 underline font-bold uppercase tracking-widest text-[10px]">Start Processing</Link>
          </div>
        ) : (
          completedJobs.map((job: any, index: number) => (
            <motion.div
              key={job.id}
              className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6 hover:border-emerald-500/30 transition-all group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${getIconBg(job.type || "archive")}`}>
                    {getFileIcon(job.type || "archive")}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1 truncate max-w-xs">{job.input_path}</h3>
                    <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                       <span className="font-mono">{job.id.substring(0, 12)}</span>
                       <span>•</span>
                       <span className={`px-1.5 py-0.5 rounded border ${job.status === 'completed' ? 'text-green-400 border-green-400/20 bg-green-500/10' : 'text-red-400 border-red-400/20 bg-red-500/10'}`}>
                         {job.status}
                       </span>
                       <span>•</span>
                       <span>₹{((job.total_chunks || 1) * 0.45).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                   <Link href={`/results/${job.id}`}>
                      <button className="p-2 bg-slate-800/50 border border-slate-700 text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white hover:border-emerald-500 transition-all">
                        <Eye size={18} />
                      </button>
                   </Link>
                   <button className="p-2 bg-slate-800/50 border border-slate-700 text-slate-400 rounded-lg hover:bg-slate-800 hover:text-emerald-400 hover:border-emerald-500 transition-all">
                      <Download size={18} />
                   </button>
                   <button className="p-2 bg-slate-800/50 border border-slate-700 text-slate-400 rounded-lg hover:bg-slate-800 hover:text-red-400 hover:border-red-500 transition-all">
                      <Trash2 size={18} />
                   </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function getFileIcon(type: string) {
  switch (type?.toLowerCase()) {
    case "video":
      return <Archive className="w-5 h-5 text-purple-400" />;
    case "image":
      return <Image className="w-5 h-5 text-green-400" />;
    case "text":
      return <FileText className="w-5 h-5 text-emerald-400" />;
    default:
      return <Archive className="w-5 h-5 text-slate-400" />;
  }
}

function getIconBg(type: string) {
  switch (type?.toLowerCase()) {
    case "video": return "bg-purple-500/20";
    case "image": return "bg-green-500/20";
    case "text": return "bg-emerald-500/20";
    default: return "bg-slate-500/20";
  }
}

"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import { Trophy, Medal, Award, TrendingUp, IndianRupee, Zap, Star, Flame, Crown } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const api = new CampuGridAPI(session?.backend_jwt || "");
  const [activeTab, setActiveTab] = useState<"earnings" | "hours">("earnings");

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard-grid", session?.backend_jwt, activeTab],
    queryFn: () => api.getLeaderboard("month", 25),
    enabled: !!session?.backend_jwt,
    refetchInterval: 60000,
  });

  const leaderboard = data?.leaderboard || [];
  const yourRank = data?.your_rank;

  // Sorting based on tab
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (activeTab === "earnings") return b.total_earned - a.total_earned;
    return b.total_gpu_hours - a.total_gpu_hours;
  });

  const top3 = sortedLeaderboard.slice(0, 3);
  const remaining = sortedLeaderboard.slice(3);

  return (
    <div className="p-8 relative min-h-screen">
      {/* 3D Background Graphics */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          className="absolute top-24 right-16 w-48 h-48 border-2 border-emerald-500/30 rounded-full shadow-lg shadow-emerald-500/20"
          animate={{ rotateY: [0, 360], scale: [1, 1.12, 1] }}
          transition={{ duration: 17, repeat: Infinity, ease: "linear" }}
          style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
        <motion.div
           className="absolute bottom-24 right-80 w-40 h-40 border-2 border-emerald-500/35 rounded-lg"
           animate={{ rotateZ: [0, 180, 360], rotateX: [0, 180, 0] }}
           transition={{ duration: 21, repeat: Infinity, ease: "linear" }}
           style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
      </div>

      <div className="relative z-10 flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-white mb-2">Grid Legends</h1>
          <p className="text-slate-400">Top contributors powering the CampuGrid decentralized network.</p>
        </div>

        <div className="flex gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
          <TabButton 
            active={activeTab === "earnings"} 
            onClick={() => setActiveTab("earnings")}
            icon={<IndianRupee size={14} />}
            label="Earnings"
          />
          <TabButton 
            active={activeTab === "hours"} 
            onClick={() => setActiveTab("hours")}
            icon={<Zap size={14} />}
            label="GPU Hours"
          />
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
         <StatCard icon={<Trophy />} label="Your Rank" value={yourRank ? `#${yourRank}` : "N/A"} highlight />
         <StatCard icon={<Award />} label="Total Nodes" value={leaderboard.length.toString()} />
         <StatCard icon={<Zap />} label="Grid Power" value="2.4 PFLOPS" />
         <StatCard icon={<Medal />} label="Active Streak" value="12 Days" />
      </div>

      {/* Top 3 Spotlight */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 items-end">
         {top3.length >= 2 && <SpotlightCard entry={top3[1]} rank={2} activeTab={activeTab} />}
         {top3.length >= 1 && <SpotlightCard entry={top3[0]} rank={1} activeTab={activeTab} featured />}
         {top3.length >= 3 && <SpotlightCard entry={top3[2]} rank={3} activeTab={activeTab} />}
      </div>

      {/* Leaderboard Table */}
      <motion.div
        className="relative z-10 bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-3xl p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-xl font-black text-white mb-8 uppercase tracking-widest text-[10px]">Active Contributors</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                <th className="pb-4">RANK</th>
                <th className="pb-4">CONTRIBUTOR</th>
                <th className="pb-4">GPU MODEL</th>
                <th className="pb-4">RELIABILITY</th>
                <th className="pb-4 text-right">{activeTab === "earnings" ? "TOTAL EARNED" : "GPU HOURS"}</th>
              </tr>
            </thead>
            <tbody>
               {isLoading ? (
                  <tr><td colSpan={5} className="py-20 text-center text-slate-600 animate-pulse font-mono uppercase text-xs">Synchronizing Global Rankings...</td></tr>
               ) : (
                  sortedLeaderboard.map((entry: any, idx: number) => (
                     <motion.tr 
                        key={entry.node_id}
                        className={`border-b border-slate-800/50 hover:bg-white/5 transition-colors ${entry.is_you ? 'bg-emerald-500/10' : ''}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                     >
                        <td className="py-5">
                           <span className={`text-lg font-black ${idx === 0 ? 'text-emerald-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-orange-400' : 'text-slate-500'}`}>
                              #{idx + 1}
                           </span>
                        </td>
                        <td className="py-5">
                           <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black uppercase ${entry.is_you ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-800'}`}>
                                 {entry.hostname[0]}
                              </div>
                              <div>
                                 <div className="text-white font-bold text-sm flex items-center gap-2">
                                    {entry.hostname}
                                    {entry.is_you && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">You</span>}
                                 </div>
                                 <div className="text-[10px] text-slate-500 font-mono">{entry.node_id.substring(0, 12)}</div>
                              </div>
                           </div>
                        </td>
                        <td className="py-5 text-slate-400 font-bold text-xs uppercase tracking-wider">{entry.gpu_model}</td>
                        <td className="py-5">
                           <div className="flex items-center gap-1 text-emerald-400">
                              <Star size={12} fill="currentColor" />
                              <span className="text-xs font-black">{(entry.reliability_score * 100).toFixed(0)}%</span>
                           </div>
                        </td>
                        <td className="py-5 text-right">
                           <div className={`text-sm font-black ${activeTab === "earnings" ? 'text-emerald-400' : 'text-white'}`}>
                              {activeTab === "earnings" ? `₹${entry.total_earned.toFixed(2)}` : `${entry.total_gpu_hours.toFixed(1)}h`}
                           </div>
                        </td>
                     </motion.tr>
                  ))
               )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 ${
        active ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SpotlightCard({ entry, rank, activeTab, featured }: any) {
  return (
    <motion.div
      className={`relative p-8 rounded-3xl text-center transition-all ${
        featured 
          ? "bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 scale-110 shadow-2xl z-10" 
          : "bg-slate-900/30 backdrop-blur-xl border border-slate-800 scale-95 opacity-80 hover:opacity-100"
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1 }}
    >
      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
         {rank === 1 ? (
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/40 rotate-3 animate-bounce">
               <Crown size={24} />
            </div>
         ) : (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm ${rank === 2 ? 'bg-slate-600' : 'bg-orange-600'}`}>
               #{rank}
            </div>
         )}
      </div>

      <div className="inline-block mb-6 relative">
         <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-white font-black text-3xl uppercase ${featured ? 'bg-emerald-500 shadow-xl shadow-emerald-500/20' : 'bg-slate-800'}`}>
            {entry.hostname[0]}
         </div>
      </div>

      <h3 className="text-xl font-black text-white mb-1">{entry.hostname}</h3>
      <p className="text-slate-500 font-mono text-[10px] mb-4 uppercase tracking-widest">{entry.gpu_model}</p>

      <div className="text-3xl font-black text-emerald-400 mb-2">
         {activeTab === "earnings" ? `₹${entry.total_earned.toFixed(0)}` : `${entry.total_gpu_hours.toFixed(0)}h`}
      </div>
      <div className="flex items-center justify-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
         <div className="flex items-center gap-1.5">
            <Flame size={12} className="text-orange-500" />
            {(entry.reliability_score * 100).toFixed(0)}% Reliable
         </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, highlight }: any) {
  return (
    <motion.div
      className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-3xl p-6"
      whileHover={{ y: -4, border: '1px solid rgba(16, 185, 129, 0.2)' }}
    >
       <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
          <div className={`p-2 rounded-xl ${highlight ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
             {icon}
          </div>
       </div>
       <div className="text-3xl font-black text-white">{value}</div>
    </motion.div>
  );
}

import { motion } from "motion/react";
import { Trophy, Medal, Award, TrendingUp, IndianRupee, Zap } from "lucide-react";
import { useState } from "react";

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<"rupees" | "credits">("rupees");

  const topContributorsRupees = [
    {
      rank: 1,
      name: "Arjun Sharma",
      username: "@arjunsharma",
      gpuHours: 2456,
      earnings: "₹12,345.50",
      uptime: "99.9%",
      avatar: "AS",
      change: "+2",
    },
    {
      rank: 2,
      name: "Priya Patel",
      username: "@priyapatel",
      gpuHours: 2198,
      earnings: "₹10,987.25",
      uptime: "99.7%",
      avatar: "PP",
      change: "-1",
    },
    {
      rank: 3,
      name: "Rohan Verma",
      username: "@rohanverma",
      gpuHours: 2045,
      earnings: "₹10,234.75",
      uptime: "99.8%",
      avatar: "RV",
      change: "+1",
    },
    {
      rank: 4,
      name: "Ananya Singh",
      username: "@ananyasingh",
      gpuHours: 1876,
      earnings: "₹9,387.00",
      uptime: "98.9%",
      avatar: "AS",
      change: "0",
    },
    {
      rank: 5,
      name: "Vikram Reddy",
      username: "@vikramreddy",
      gpuHours: 1654,
      earnings: "₹8,276.50",
      uptime: "99.2%",
      avatar: "VR",
      change: "+3",
    },
    {
      rank: 6,
      name: "Sneha Gupta",
      username: "@snehagupta",
      gpuHours: 1543,
      earnings: "₹7,715.00",
      uptime: "98.5%",
      avatar: "SG",
      change: "-2",
    },
    {
      rank: 7,
      name: "Aditya Joshi",
      username: "@adityajoshi",
      gpuHours: 1432,
      earnings: "₹7,162.50",
      uptime: "99.1%",
      avatar: "AJ",
      change: "+1",
    },
    {
      rank: 8,
      name: "You",
      username: "@yourname",
      gpuHours: 1247,
      earnings: "₹4,267.50",
      uptime: "97.8%",
      avatar: "YO",
      change: "-1",
      isCurrentUser: true,
    },
  ];

  const topContributorsCredits = [
    {
      rank: 1,
      name: "Priya Patel",
      username: "@priyapatel",
      gpuHours: 2456,
      credits: "45,678",
      uptime: "99.9%",
      avatar: "PP",
      change: "+1",
    },
    {
      rank: 2,
      name: "Rohan Verma",
      username: "@rohanverma",
      gpuHours: 2198,
      credits: "43,210",
      uptime: "99.8%",
      avatar: "RV",
      change: "+2",
    },
    {
      rank: 3,
      name: "Arjun Sharma",
      username: "@arjunsharma",
      gpuHours: 2045,
      credits: "41,567",
      uptime: "99.7%",
      avatar: "AS",
      change: "-2",
    },
    {
      rank: 4,
      name: "Vikram Reddy",
      username: "@vikramreddy",
      gpuHours: 1876,
      credits: "38,945",
      uptime: "99.2%",
      avatar: "VR",
      change: "+1",
    },
    {
      rank: 5,
      name: "Ananya Singh",
      username: "@ananyasingh",
      gpuHours: 1654,
      credits: "35,234",
      uptime: "98.9%",
      avatar: "AS",
      change: "-1",
    },
    {
      rank: 6,
      name: "Sneha Gupta",
      username: "@snehagupta",
      gpuHours: 1543,
      credits: "32,876",
      uptime: "98.5%",
      avatar: "SG",
      change: "0",
    },
    {
      rank: 7,
      name: "Aditya Joshi",
      username: "@adityajoshi",
      gpuHours: 1432,
      credits: "30,145",
      uptime: "99.1%",
      avatar: "AJ",
      change: "+2",
    },
    {
      rank: 8,
      name: "You",
      username: "@yourname",
      gpuHours: 1247,
      credits: "25,890",
      uptime: "97.8%",
      avatar: "YO",
      change: "-1",
      isCurrentUser: true,
    },
  ];

  const topContributors = activeTab === "rupees" ? topContributorsRupees : topContributorsCredits;

  return (
    <div className="p-8 relative">
      {/* 3D Background Graphics */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          className="absolute top-24 right-16 w-48 h-48 border-2 border-yellow-500/30 rounded-full shadow-lg shadow-yellow-500/20"
          animate={{
            rotateY: [0, 360],
            scale: [1, 1.12, 1],
          }}
          transition={{
            duration: 17,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
        <motion.div
          className="absolute bottom-24 right-80 w-40 h-40 border-2 border-cyan-500/35 rounded-lg"
          animate={{
            rotateZ: [0, 180, 360],
            rotateX: [0, 180, 0],
          }}
          transition={{
            duration: 21,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
        <motion.div
          className="absolute top-72 right-52 w-52 h-52 bg-gradient-to-br from-yellow-500/10 to-cyan-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
          <p className="text-slate-400">Top contributors on the CampusGrid network.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-slate-900/50 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("rupees")}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === "rupees"
                ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <IndianRupee className="w-4 h-4" />
            Rupees
          </button>
          <button
            onClick={() => setActiveTab("credits")}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === "credits"
                ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-4 h-4" />
            Credits
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="relative z-10 grid grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Trophy className="w-6 h-6" />}
          label="Your Rank"
          value="#8"
          iconBg="bg-cyan-500/20"
          iconColor="text-cyan-400"
        />
        <StatCard
          icon={<Award className="w-6 h-6" />}
          label="Total Contributors"
          value="1,247"
          iconBg="bg-blue-500/20"
          iconColor="text-blue-400"
        />
        <StatCard
          icon={activeTab === "rupees" ? <IndianRupee className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
          label={activeTab === "rupees" ? "Your Earnings" : "Your Credits"}
          value={activeTab === "rupees" ? "₹4,267.50" : "25,890"}
          iconBg="bg-cyan-500/20"
          iconColor="text-cyan-400"
        />
        <StatCard
          icon={<Medal className="w-6 h-6" />}
          label="Best Rank"
          value="#6"
          iconBg="bg-blue-500/20"
          iconColor="text-blue-400"
        />
      </div>

      {/* Top 3 Spotlight */}
      <div className="relative z-10 grid grid-cols-3 gap-6 mb-8">
        {/* Rank 2 */}
        <motion.div
          className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {topContributors[1].avatar}
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              2
            </div>
          </div>
          <h3 className="text-white font-semibold mb-1">{topContributors[1].name}</h3>
          <p className="text-slate-400 text-sm mb-3">{topContributors[1].username}</p>
          <div className="text-2xl font-bold text-cyan-400 mb-1">
            {activeTab === "rupees"
              ? (topContributors[1] as any).earnings
              : `${(topContributors[1] as any).credits} credits`}
          </div>
          <p className="text-slate-500 text-sm">{topContributors[1].gpuHours} GPU hours</p>
        </motion.div>

        {/* Rank 1 */}
        <motion.div
          className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl p-6 text-center transform scale-105"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-cyan-500/50">
              {topContributors[0].avatar}
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white">
              <Trophy className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-white font-semibold text-lg mb-1">{topContributors[0].name}</h3>
          <p className="text-slate-400 text-sm mb-3">{topContributors[0].username}</p>
          <div className="text-3xl font-bold text-cyan-400 mb-1">
            {activeTab === "rupees"
              ? (topContributors[0] as any).earnings
              : `${(topContributors[0] as any).credits} credits`}
          </div>
          <p className="text-slate-400 text-sm">{topContributors[0].gpuHours} GPU hours</p>
        </motion.div>

        {/* Rank 3 */}
        <motion.div
          className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {topContributors[2].avatar}
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              3
            </div>
          </div>
          <h3 className="text-white font-semibold mb-1">{topContributors[2].name}</h3>
          <p className="text-slate-400 text-sm mb-3">{topContributors[2].username}</p>
          <div className="text-2xl font-bold text-cyan-400 mb-1">
            {activeTab === "rupees"
              ? (topContributors[2] as any).earnings
              : `${(topContributors[2] as any).credits} credits`}
          </div>
          <p className="text-slate-500 text-sm">{topContributors[2].gpuHours} GPU hours</p>
        </motion.div>
      </div>

      {/* Leaderboard Table */}
      <motion.div
        className="relative z-10 bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h2 className="text-xl font-bold text-white mb-6">All Contributors</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-slate-500 text-sm border-b border-slate-800">
                <th className="pb-4 font-medium">RANK</th>
                <th className="pb-4 font-medium">CONTRIBUTOR</th>
                <th className="pb-4 font-medium">GPU HOURS</th>
                <th className="pb-4 font-medium">{activeTab === "rupees" ? "EARNINGS" : "CREDITS"}</th>
                <th className="pb-4 font-medium">UPTIME</th>
                <th className="pb-4 font-medium">CHANGE</th>
              </tr>
            </thead>
            <tbody>
              {topContributors.map((contributor, index) => (
                <motion.tr
                  key={contributor.username}
                  className={`border-b border-slate-800/50 transition-colors ${
                    contributor.isCurrentUser
                      ? "bg-cyan-500/10 hover:bg-cyan-500/20"
                      : "hover:bg-slate-800/30"
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                >
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-lg ${
                        contributor.rank === 1
                          ? "text-yellow-400"
                          : contributor.rank === 2
                          ? "text-slate-400"
                          : contributor.rank === 3
                          ? "text-amber-600"
                          : "text-white"
                      }`}>
                        #{contributor.rank}
                      </span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                        contributor.isCurrentUser
                          ? "bg-gradient-to-br from-cyan-500 to-blue-600"
                          : "bg-slate-700"
                      }`}>
                        {contributor.avatar}
                      </div>
                      <div>
                        <div className={`font-semibold ${contributor.isCurrentUser ? "text-cyan-400" : "text-white"}`}>
                          {contributor.name}
                        </div>
                        <div className="text-slate-400 text-sm">{contributor.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-white font-semibold">
                    {contributor.gpuHours.toLocaleString()}
                  </td>
                  <td className="py-4 text-cyan-400 font-semibold">
                    {activeTab === "rupees"
                      ? (contributor as any).earnings
                      : `${(contributor as any).credits} credits`}
                  </td>
                  <td className="py-4 text-white">{contributor.uptime}</td>
                  <td className="py-4">
                    {contributor.change !== "0" && (
                      <span className={`flex items-center gap-1 ${
                        contributor.change.startsWith("+") ? "text-green-400" : "text-red-400"
                      }`}>
                        <TrendingUp className={`w-4 h-4 ${contributor.change.startsWith("-") && "rotate-180"}`} />
                        {contributor.change}
                      </span>
                    )}
                    {contributor.change === "0" && (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconBg: string;
  iconColor: string;
}) {
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

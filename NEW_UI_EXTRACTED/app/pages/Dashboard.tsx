import { motion } from "motion/react";
import { Link } from "react-router";
import { FileText, Activity, Clock, IndianRupee } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="p-8 relative">
      {/* 3D Floating Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Large rotating circle */}
        <motion.div
          className="absolute top-20 right-40 w-64 h-64 border-2 border-cyan-500/40 rounded-full shadow-lg shadow-cyan-500/20"
          animate={{
            rotateY: [0, 360],
            rotateX: [0, 180, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            transform: "perspective(1000px)",
            transformStyle: "preserve-3d"
          }}
        />

        {/* Rotating square */}
        <motion.div
          className="absolute top-60 right-96 w-40 h-40 border-2 border-blue-500/30 rounded-lg shadow-lg shadow-blue-500/20"
          animate={{
            rotateZ: [0, 180, 360],
            rotateY: [0, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            transform: "perspective(1000px)",
            transformStyle: "preserve-3d"
          }}
        />

        {/* Glowing orb */}
        <motion.div
          className="absolute bottom-32 right-60 w-48 h-48 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-2xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Small rotating circle */}
        <motion.div
          className="absolute bottom-60 right-20 w-32 h-32 border-2 border-cyan-400/50 rounded-full shadow-lg shadow-cyan-400/30"
          animate={{
            rotateX: [0, 360],
            rotateZ: [0, 180, 360],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            transform: "perspective(800px)",
            transformStyle: "preserve-3d"
          }}
        />

        {/* Floating hexagon */}
        <motion.div
          className="absolute top-96 right-32 w-24 h-24 border-2 border-blue-400/40"
          style={{
            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            transform: "perspective(1000px)",
            transformStyle: "preserve-3d"
          }}
          animate={{
            rotateY: [0, 360],
            y: [-10, 10, -10],
          }}
          transition={{
            rotateY: {
              duration: 18,
              repeat: Infinity,
              ease: "linear",
            },
            y: {
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }
          }}
        />
      </div>
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">Welcome back. You have 1 active jobs running.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors">
            <div className="text-xs text-slate-500">NODE</div>
            <div className="text-xs text-slate-500">TOKEN</div>
          </button>
          <Link to="/dashboard/submit-job">
            <button className="px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-400 transition-colors flex items-center gap-2">
              <span>↓</span>
              Submit New Job
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="relative z-10 grid grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<FileText className="w-6 h-6" />}
          label="Total Jobs"
          value="1"
          iconBg="bg-cyan-500/20"
          iconColor="text-cyan-400"
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="Active Jobs"
          value="1"
          iconBg="bg-blue-500/20"
          iconColor="text-blue-400"
        />
        <StatCard
          icon={<Clock className="w-6 h-6" />}
          label="GPU Hours"
          value="0.0"
          iconBg="bg-cyan-500/20"
          iconColor="text-cyan-400"
        />
        <StatCard
          icon={<IndianRupee className="w-6 h-6" />}
          label="Earned"
          value="₹0.00"
          iconBg="bg-blue-500/20"
          iconColor="text-blue-400"
        />
      </div>

      {/* Network Status */}
      <div className="relative z-10 grid grid-cols-3 gap-6 mb-8">
        <motion.div
          className="col-span-2 bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="text-xl font-bold text-white mb-6">Network Status</h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-1">247</div>
              <div className="text-slate-400 text-sm">Available GPUs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">89</div>
              <div className="text-slate-400 text-sm">Active Jobs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-1">12</div>
              <div className="text-slate-400 text-sm">Queue Size</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Network Load</span>
                <span className="text-cyan-400">73%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "73%" }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link to="/dashboard/submit-job">
              <button className="w-full px-4 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-400 transition-colors text-left">
                + Submit New Job
              </button>
            </Link>
            <Link to="/dashboard/contributor">
              <button className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-left">
                Manage GPUs
              </button>
            </Link>
            <Link to="/dashboard/billing">
              <button className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-left">
                Add Funds
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
                <th className="pb-4 font-medium">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="py-4 text-white font-mono">4fab1ea0...</td>
                <td className="py-4">
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                    render
                  </span>
                </td>
                <td className="py-4">
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                    Queued
                  </span>
                </td>
                <td className="py-4 text-slate-400">about 11 hours ago</td>
                <td className="py-4">
                  <button className="text-cyan-400 hover:text-cyan-300 transition-colors">
                    Monitor Live
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
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

import { motion } from "motion/react";
import { Activity, Cpu, HardDrive, Zap, Clock, TrendingUp } from "lucide-react";

export default function Monitor() {
  return (
    <div className="p-8 relative">
      {/* 3D Background Graphics */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          className="absolute top-32 right-20 w-48 h-48 border-2 border-cyan-500/30 rounded-full shadow-lg shadow-cyan-500/20"
          animate={{
            rotateY: [0, 360],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
        <motion.div
          className="absolute bottom-20 right-40 w-36 h-36 border-2 border-blue-500/25 rounded-lg"
          animate={{
            rotateZ: [0, 360],
            rotateX: [0, 180, 360],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
        <motion.div
          className="absolute top-80 right-96 w-56 h-56 bg-gradient-to-br from-cyan-500/15 to-blue-500/15 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
      {/* Header */}
      <div className="relative z-10 mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Monitor</h1>
        <p className="text-slate-400">Real-time monitoring of active jobs and system performance.</p>
      </div>

      {/* Live Stats Grid */}
      <div className="relative z-10 grid grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="Active Jobs"
          value="1"
          trend="+0%"
          iconBg="bg-cyan-500/20"
          iconColor="text-cyan-400"
        />
        <StatCard
          icon={<Cpu className="w-6 h-6" />}
          label="GPU Utilization"
          value="73%"
          trend="+5%"
          iconBg="bg-blue-500/20"
          iconColor="text-blue-400"
        />
        <StatCard
          icon={<HardDrive className="w-6 h-6" />}
          label="Memory Usage"
          value="45GB"
          trend="+2%"
          iconBg="bg-cyan-500/20"
          iconColor="text-cyan-400"
        />
        <StatCard
          icon={<Zap className="w-6 h-6" />}
          label="Power Draw"
          value="285W"
          trend="-3%"
          iconBg="bg-blue-500/20"
          iconColor="text-blue-400"
        />
      </div>

      {/* Active Jobs Monitoring */}
      <div className="relative z-10 grid grid-cols-2 gap-6 mb-8">
        {/* Job Performance */}
        <motion.div
          className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl font-bold text-white mb-6">Job Performance</h2>

          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-cyan-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-mono text-sm">4fab1ea0...</span>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                  Running
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-white">67%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    initial={{ width: "0%" }}
                    animate={{ width: "67%" }}
                    transition={{ duration: 1.5 }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>GPU: RTX 3090</span>
                  <span>Elapsed: 2h 15m</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Resource Usage Graph */}
        <motion.div
          className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-xl font-bold text-white mb-6">Resource Usage</h2>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">GPU Compute</span>
                <span className="text-cyan-400">73%</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                  initial={{ width: "0%" }}
                  animate={{ width: "73%" }}
                  transition={{ duration: 1.5 }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">VRAM</span>
                <span className="text-blue-400">45GB / 24GB</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                  initial={{ width: "0%" }}
                  animate={{ width: "56%" }}
                  transition={{ duration: 1.5, delay: 0.2 }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">CPU</span>
                <span className="text-cyan-400">34%</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                  initial={{ width: "0%" }}
                  animate={{ width: "34%" }}
                  transition={{ duration: 1.5, delay: 0.4 }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Network I/O</span>
                <span className="text-blue-400">120 MB/s</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                  initial={{ width: "0%" }}
                  animate={{ width: "45%" }}
                  transition={{ duration: 1.5, delay: 0.6 }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* System Logs */}
      <motion.div
        className="relative z-10 bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-white mb-6">Live Logs</h2>

        <div className="bg-slate-950/50 rounded-lg p-4 font-mono text-sm space-y-2 max-h-64 overflow-y-auto">
          <div className="text-slate-400">
            <span className="text-cyan-400">[12:34:56]</span> Job started on GPU-0 (RTX 3090)
          </div>
          <div className="text-slate-400">
            <span className="text-cyan-400">[12:35:02]</span> Loading model checkpoint...
          </div>
          <div className="text-slate-400">
            <span className="text-cyan-400">[12:35:15]</span> Model loaded successfully (2.3GB)
          </div>
          <div className="text-slate-400">
            <span className="text-cyan-400">[12:35:20]</span> Processing batch 1/150
          </div>
          <div className="text-slate-400">
            <span className="text-cyan-400">[12:36:45]</span> Processing batch 50/150
          </div>
          <div className="text-slate-400">
            <span className="text-cyan-400">[12:38:12]</span> Processing batch 100/150
          </div>
          <div className="text-green-400">
            <span className="text-cyan-400">[12:38:45]</span> GPU utilization optimal (73%)
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  trend,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
  iconBg: string;
  iconColor: string;
}) {
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
        <span className="text-slate-400 text-sm">{label}</span>
        <div className={`p-2 rounded-lg ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-3xl font-bold text-white">{value}</div>
        <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          <TrendingUp className={`w-4 h-4 ${!isPositive && 'rotate-180'}`} />
          <span>{trend}</span>
        </div>
      </div>
    </motion.div>
  );
}

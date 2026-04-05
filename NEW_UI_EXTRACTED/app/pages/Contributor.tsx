import { motion } from "motion/react";
import { Plus, Cpu, Zap, TrendingUp, IndianRupee, Activity, HardDrive } from "lucide-react";

export default function Contributor() {
  const gpus = [
    {
      id: "GPU-001",
      name: "RTX 3090",
      status: "active",
      uptime: "99.8%",
      earnings: "₹1,234.50",
      utilization: 73,
      vram: "24GB",
      powerDraw: "350W",
    },
    {
      id: "GPU-002",
      name: "RTX 4090",
      status: "active",
      uptime: "98.5%",
      earnings: "₹2,156.75",
      utilization: 89,
      vram: "24GB",
      powerDraw: "450W",
    },
    {
      id: "GPU-003",
      name: "RTX 3080",
      status: "offline",
      uptime: "95.2%",
      earnings: "₹876.25",
      utilization: 0,
      vram: "10GB",
      powerDraw: "0W",
    },
  ];

  return (
    <div className="p-8 relative">
      {/* 3D Background Graphics */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          className="absolute top-20 right-32 w-56 h-56 border-2 border-cyan-500/35 rounded-full shadow-lg shadow-cyan-500/20"
          animate={{
            rotateY: [0, 360],
            rotateX: [0, 180, 0],
          }}
          transition={{
            duration: 19,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
        <motion.div
          className="absolute bottom-32 right-72 w-40 h-40 border-2 border-blue-500/30 rounded-lg"
          animate={{
            rotateZ: [0, 360],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
        <motion.div
          className="absolute top-96 right-40 w-60 h-60 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.35, 1],
            opacity: [0.25, 0.55, 0.25],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Contributor</h1>
          <p className="text-slate-400">Contribute your GPU power to the network and earn rewards.</p>
        </div>
        <button className="px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-400 transition-colors flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add GPU
        </button>
      </div>

      {/* Stats Cards */}
      <div className="relative z-10 grid grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Cpu className="w-6 h-6" />}
          label="Total GPUs"
          value="3"
          iconBg="bg-cyan-500/20"
          iconColor="text-cyan-400"
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="Active GPUs"
          value="2"
          iconBg="bg-blue-500/20"
          iconColor="text-blue-400"
        />
        <StatCard
          icon={<IndianRupee className="w-6 h-6" />}
          label="Total Earned"
          value="₹4,267.50"
          iconBg="bg-cyan-500/20"
          iconColor="text-cyan-400"
        />
        <StatCard
          icon={<Zap className="w-6 h-6" />}
          label="GPU Hours"
          value="1,247"
          iconBg="bg-blue-500/20"
          iconColor="text-blue-400"
        />
      </div>

      {/* Earnings Overview */}
      <div className="relative z-10 grid grid-cols-3 gap-6 mb-8">
        <motion.div
          className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-slate-400 text-sm mb-2">Today's Earnings</h3>
          <div className="text-3xl font-bold text-white mb-2">₹124.50</div>
          <div className="flex items-center gap-1 text-sm text-green-400">
            <TrendingUp className="w-4 h-4" />
            <span>+12.5%</span>
          </div>
        </motion.div>

        <motion.div
          className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h3 className="text-slate-400 text-sm mb-2">This Month</h3>
          <div className="text-3xl font-bold text-white mb-2">₹2,456.75</div>
          <div className="flex items-center gap-1 text-sm text-green-400">
            <TrendingUp className="w-4 h-4" />
            <span>+8.3%</span>
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-slate-400 text-sm mb-2">Pending Payout</h3>
          <div className="text-3xl font-bold text-white mb-2">₹876.25</div>
          <button className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
            Withdraw →
          </button>
        </motion.div>
      </div>

      {/* My GPUs */}
      <div className="relative z-10">
        <h2 className="text-xl font-bold text-white mb-6">My GPUs</h2>

        <div className="grid grid-cols-1 gap-4">
          {gpus.map((gpu, index) => (
            <motion.div
              key={gpu.id}
              className={`bg-slate-900/30 backdrop-blur-xl border rounded-xl p-6 ${
                gpu.status === "active"
                  ? "border-cyan-500/30 hover:border-cyan-500/50"
                  : "border-slate-800 hover:border-slate-700"
              } transition-all`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between">
                {/* GPU Info */}
                <div className="flex items-center gap-6 flex-1">
                  {/* Icon and Name */}
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${
                      gpu.status === "active"
                        ? "bg-cyan-500/20"
                        : "bg-slate-700/20"
                    }`}>
                      <Cpu className={`w-8 h-8 ${
                        gpu.status === "active"
                          ? "text-cyan-400"
                          : "text-slate-500"
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">{gpu.name}</h3>
                      <p className="text-slate-400 text-sm font-mono">{gpu.id}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-8 ml-8">
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Status</p>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        gpu.status === "active"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        {gpu.status === "active" ? "Active" : "Offline"}
                      </span>
                    </div>

                    <div>
                      <p className="text-slate-500 text-xs mb-1">Uptime</p>
                      <p className="text-white font-semibold">{gpu.uptime}</p>
                    </div>

                    <div>
                      <p className="text-slate-500 text-xs mb-1">Utilization</p>
                      <p className="text-white font-semibold">{gpu.utilization}%</p>
                    </div>

                    <div>
                      <p className="text-slate-500 text-xs mb-1">VRAM</p>
                      <p className="text-white font-semibold">{gpu.vram}</p>
                    </div>

                    <div>
                      <p className="text-slate-500 text-xs mb-1">Power</p>
                      <p className="text-white font-semibold">{gpu.powerDraw}</p>
                    </div>

                    <div>
                      <p className="text-slate-500 text-xs mb-1">Earnings</p>
                      <p className="text-cyan-400 font-semibold">{gpu.earnings}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                    Settings
                  </button>
                  {gpu.status === "active" ? (
                    <button className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
                      Stop
                    </button>
                  ) : (
                    <button className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors">
                      Start
                    </button>
                  )}
                </div>
              </div>

              {/* Utilization Bar */}
              {gpu.status === "active" && (
                <div className="mt-4">
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                      initial={{ width: "0%" }}
                      animate={{ width: `${gpu.utilization}%` }}
                      transition={{ duration: 1.5, delay: index * 0.1 + 0.5 }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add GPU Info */}
      <motion.div
        className="relative z-10 mt-8 bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-cyan-500/20 rounded-lg">
            <HardDrive className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-2">Want to contribute more GPUs?</h3>
            <p className="text-slate-400 text-sm mb-4">
              Connect additional GPUs to increase your earning potential. Our network supports NVIDIA RTX 3000 and 4000 series GPUs.
            </p>
            <button className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium">
              Learn more about GPU requirements →
            </button>
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

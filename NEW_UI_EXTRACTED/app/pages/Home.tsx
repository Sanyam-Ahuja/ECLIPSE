import { motion } from "motion/react";
import { Network, Cpu, Database, Globe } from "lucide-react";
import { Link } from "react-router";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-900 overflow-hidden">
      {/* 3D Background Graphics */}
      <div className="absolute inset-0 z-0">
        {/* Grid pattern */}
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34, 211, 238, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 211, 238, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
            transform: "perspective(500px) rotateX(60deg)",
            transformOrigin: "center center",
          }}
          animate={{
            backgroundPosition: ["0px 0px", "50px 50px"],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* 3D geometric shapes */}
        <motion.div
          className="absolute top-1/4 right-1/4 w-64 h-64 border-2 border-cyan-500/35 rounded-full shadow-lg shadow-cyan-500/20"
          animate={{
            rotateY: [0, 360],
            rotateX: [0, 360],
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

        <motion.div
          className="absolute bottom-1/4 left-1/3 w-48 h-48 border-2 border-cyan-400/30"
          animate={{
            rotateZ: [0, 360],
            rotateY: [0, 180],
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

        {/* Additional floating shapes */}
        <motion.div
          className="absolute top-1/3 left-1/4 w-56 h-56 bg-gradient-to-br from-cyan-500/15 to-blue-500/15 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute bottom-1/3 right-1/3 w-40 h-40 border-2 border-blue-500/30"
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
      <header className="relative z-50 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
            <Network className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">campusgrid</span>
        </div>

        <div className="flex items-center gap-8">
          <nav className="flex items-center gap-8">
            <a href="#" className="text-slate-300 hover:text-white transition-colors">Solutions</a>
            <a href="#" className="text-slate-300 hover:text-white transition-colors">Pricing</a>
            <a href="#" className="text-slate-300 hover:text-white transition-colors">Documentation</a>
          </nav>
          <Link to="/dashboard">
            <button className="px-6 py-2.5 bg-white text-slate-900 rounded-full font-medium hover:bg-slate-100 transition-colors">
              Get Started
            </button>
          </Link>
        </div>
      </header>

      {/* Orbiting Circles System */}
      <div className="absolute right-32 top-1/2 -translate-y-1/2 z-20">
        <OrbitingCircles />
      </div>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-start justify-center min-h-[calc(100vh-100px)] px-16 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-7xl font-bold text-white leading-tight mb-6">
            The unified<br />
            <span className="text-cyan-400">Compute</span><br />
            network.
          </h1>

          <p className="text-slate-400 text-lg max-w-xl mb-8">
            Build and deploy modern applications with our distributed<br />
            edge network. No setup, no config needed, just pure compute power at global scale.
          </p>

          <div className="flex gap-4">
            <Link to="/dashboard">
              <motion.button
                className="px-8 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-400 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started →
              </motion.button>
            </Link>
            <motion.button
              className="px-8 py-3 border border-slate-600 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View Pricing
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Panel */}
        <motion.div
          className="mt-12 p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl max-w-md"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="text-cyan-400 text-sm font-mono mb-3">≈ LIVE PERFORMANCE</div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Requests/sec</span>
              <span className="text-white font-mono">847,392</span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                initial={{ width: "0%" }}
                animate={{ width: "73%" }}
                transition={{ duration: 1.5, delay: 0.5 }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Global uptime</span>
              <span className="text-white font-mono">99.99%</span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                initial={{ width: "0%" }}
                animate={{ width: "99.99%" }}
                transition={{ duration: 1.5, delay: 0.7 }}
              />
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function OrbitingCircles() {
  const orbitRadius = 200;
  const centerIcon = <Database className="w-6 h-6" />;

  const orbitingIcons = [
    { icon: <Cpu className="w-5 h-5" />, angle: 0, orbitSpeed: 10 },
    { icon: <Network className="w-5 h-5" />, angle: 60, orbitSpeed: 12 },
    { icon: <Globe className="w-5 h-5" />, angle: 120, orbitSpeed: 8 },
    { icon: <Cpu className="w-4 h-4" />, angle: 180, orbitSpeed: 15 },
    { icon: <Network className="w-4 h-4" />, angle: 240, orbitSpeed: 11 },
    { icon: <Globe className="w-5 h-5" />, angle: 300, orbitSpeed: 9 },
  ];

  return (
    <div className="relative w-[500px] h-[500px]">
      {/* Center circle */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/50"
        initial={{ scale: 0 }}
        animate={{
          scale: 1,
          boxShadow: [
            "0 0 20px rgba(34, 211, 238, 0.5)",
            "0 0 40px rgba(34, 211, 238, 0.8)",
            "0 0 20px rgba(34, 211, 238, 0.5)",
          ]
        }}
        transition={{
          scale: { duration: 0.6 },
          boxShadow: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }
        }}
      >
        {centerIcon}
      </motion.div>

      {/* Orbit rings */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-cyan-500/20 rounded-full"
        style={{ width: orbitRadius * 2, height: orbitRadius * 2 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />

      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-cyan-400/10 rounded-full"
        style={{ width: orbitRadius * 2.4, height: orbitRadius * 2.4 }}
        animate={{ rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />

      {/* Orbiting circles */}
      {orbitingIcons.map((item, index) => (
        <motion.div
          key={index}
          className="absolute top-1/2 left-1/2 w-16 h-16 rounded-full bg-slate-900/60 backdrop-blur-md border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20"
          style={{
            transform: "translate(-50%, -50%)",
          }}
          animate={{
            x: [
              Math.cos((item.angle * Math.PI) / 180) * orbitRadius,
              Math.cos(((item.angle + 360) * Math.PI) / 180) * orbitRadius,
            ],
            y: [
              Math.sin((item.angle * Math.PI) / 180) * orbitRadius,
              Math.sin(((item.angle + 360) * Math.PI) / 180) * orbitRadius,
            ],
            rotateY: [0, 360],
          }}
          transition={{
            x: {
              duration: item.orbitSpeed,
              repeat: Infinity,
              ease: "linear",
            },
            y: {
              duration: item.orbitSpeed,
              repeat: Infinity,
              ease: "linear",
            },
            rotateY: {
              duration: 6,
              repeat: Infinity,
              ease: "linear",
            },
          }}
          whileHover={{
            scale: 1.3,
            boxShadow: "0 0 30px rgba(34, 211, 238, 0.6)",
          }}
        >
          {item.icon}
        </motion.div>
      ))}

      {/* Connection lines */}
      {orbitingIcons.map((_, index) => (
        <motion.div
          key={`line-${index}`}
          className="absolute top-1/2 left-1/2 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent origin-left"
          style={{
            width: orbitRadius,
            transform: `rotate(${60 * index}deg)`,
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: index * 0.5,
          }}
        />
      ))}
    </div>
  );
}

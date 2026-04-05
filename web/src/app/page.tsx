"use client";

import { motion } from "motion/react";
import { Network, Cpu, Database, Globe, ArrowRight, Zap, ShieldCheck, Layers, Server } from "lucide-react";
import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-slate-950 overflow-hidden selection:bg-emerald-500/30">
      <MarketingHeader />

      {/* 3D Background Graphics */}
      <div className="absolute inset-0 z-0">
        {/* Grid pattern */}
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(16, 185, 129, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(16, 185, 129, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            transform: "perspective(500px) rotateX(60deg)",
            transformOrigin: "center center",
          }}
          animate={{
            backgroundPosition: ["0px 0px", "60px 60px"],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* 3D geometric shapes */}
        <motion.div
           className="absolute top-1/4 right-1/4 w-64 h-64 border-2 border-emerald-500/25 rounded-full shadow-lg shadow-emerald-500/10"
           animate={{ rotateY: [0, 360], rotateX: [0, 360] }}
           transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
           style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />

        <motion.div
           className="absolute bottom-1/4 left-1/4 w-56 h-56 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-full blur-3xl"
           animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.4, 0.2] }}
           transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="absolute bottom-1/3 right-1/3 w-40 h-40 border-2 border-emerald-500/20"
          style={{
            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            transform: "perspective(1000px)",
            transformStyle: "preserve-3d"
          }}
          animate={{ rotateY: [0, 360], y: [-20, 20, -20] }}
          transition={{ rotateY: { duration: 20, repeat: Infinity, ease: "linear" }, y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
        />
      </div>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col xl:flex-row items-center justify-between min-h-[calc(100vh-80px)] px-8 sm:px-16 max-w-7xl mx-auto gap-20 py-20">
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-8 backdrop-blur-md">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             Nodes Online: 1,247+
          </div>

          <h1 className="text-6xl sm:text-8xl font-black text-white leading-[0.9] mb-8">
            The unified<br />
            <span className="text-emerald-400">Compute</span><br />
            network.
          </h1>

          <p className="text-slate-400 text-lg max-w-xl mb-10 leading-relaxed">
            Harness the idle power of millions of campus computers. Train multi-node ML models, render 3D scenes, and run scientific simulations at 1/10th the cost.
          </p>

          <div className="flex flex-wrap gap-6">
            <Link href="/login">
              <motion.button
                className="px-10 py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Start Computing →
              </motion.button>
            </Link>
            <Link href="/pricing">
              <motion.button
                className="px-10 py-5 border-2 border-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-900 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                View Pricing
              </motion.button>
            </Link>
          </div>

          {/* Stats Panel */}
          <motion.div
            className="mt-16 p-8 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl max-w-md shadow-2xl relative overflow-hidden group"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Zap size={64} className="text-emerald-500" />
            </div>
            <div className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4">≈ GRID PERFORMANCE</div>

            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Aggregate Flops</span>
                  <span className="text-white font-mono text-sm">2.4 PFLOPS</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    initial={{ width: "0%" }}
                    animate={{ width: "73%" }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Network Saving Points</span>
                  <span className="text-emerald-400 font-mono text-sm font-black">₹4.2M SAVED</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500"
                    initial={{ width: "0%" }}
                    animate={{ width: "94%" }}
                    transition={{ duration: 1.5, delay: 0.7 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Orbiting Circles System (Visual) */}
        <div className="flex-1 relative hidden xl:block w-full h-[600px] items-center justify-center">
           <OrbitingCircles />
        </div>
      </main>

      {/* Features Grid */}
      <section className="relative z-10 py-32 px-8 bg-slate-950/80 border-y border-slate-900">
         <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-12">
               <FeatureCard 
                  icon={ShieldCheck}
                  title="Resilient Orchestration"
                  desc="Automated fault recovery via Watchdog peers ensures your workload never stalls."
               />
               <FeatureCard 
                  icon={Layers}
                  title="Gemini AI Pipeline"
                  desc="Dynamic dependency mapping and containerization for zero-config ML execution."
               />
               <FeatureCard 
                  icon={Zap}
                  title="Low-Latency Peers"
                  desc="P2P weight averaging optimized for high-speed university backbone networks."
               />
            </div>
         </div>
      </section>
    </div>
  );
}

function OrbitingCircles() {
  const orbitRadius = 180;
  
  const orbitingIcons = [
    { icon: <Cpu className="w-5 h-5" />, angle: 0, speed: 12 },
    { icon: <Network className="w-5 h-5" />, angle: 60, speed: 15 },
    { icon: <Globe className="w-5 h-5" />, angle: 120, speed: 10 },
    { icon: <ShieldCheck className="w-5 h-5" />, angle: 180, speed: 18 },
    { icon: <Layers className="w-5 h-5" />, angle: 240, speed: 14 },
    { icon: <Server className="w-5 h-5" />, angle: 300, speed: 11 },
  ];

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center">
       {/* Center Hub */}
       <motion.div
          className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-emerald-500/50 relative z-20"
          animate={{ rotate: [0, 90, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
       >
          <Database size={40} />
       </motion.div>

       {/* Orbit Path */}
       <div className="absolute w-[360px] h-[360px] border border-emerald-500/10 rounded-full animate-[spin_40s_linear_infinite]" />
       <div className="absolute w-[440px] h-[440px] border border-emerald-500/5 rounded-full animate-[spin_60s_linear_infinite_reverse]" />

       {orbitingIcons.map((item, idx) => (
          <motion.div
            key={idx}
            className="absolute p-4 bg-slate-900 border border-emerald-500/30 rounded-2xl text-emerald-400 shadow-xl shadow-emerald-500/10"
            animate={{
               x: [
                  Math.cos((item.angle * Math.PI) / 180) * orbitRadius,
                  Math.cos(((item.angle + 360) * Math.PI) / 180) * orbitRadius,
               ],
               y: [
                  Math.sin((item.angle * Math.PI) / 180) * orbitRadius,
                  Math.sin(((item.angle + 360) * Math.PI) / 180) * orbitRadius,
               ],
            }}
            transition={{ duration: item.speed, repeat: Infinity, ease: "linear" }}
          >
             {item.icon}
          </motion.div>
       ))}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="p-8 bg-slate-900/30 border border-slate-800 rounded-3xl hover:border-emerald-500/30 transition-all group">
       <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-8 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all">
          <Icon size={32} />
       </div>
       <h3 className="text-xl font-black text-white mb-4 uppercase tracking-widest text-[10px] opacity-60">Architectural Note</h3>
       <h4 className="text-2xl font-bold text-white mb-4 leading-tight">{title}</h4>
       <p className="text-slate-400 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}

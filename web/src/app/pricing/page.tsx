"use client";

import { MarketingHeader } from "@/components/MarketingHeader";
import { Check, Database, Zap, Cpu, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden pb-32 selection:bg-emerald-500/30">
      <MarketingHeader />

      {/* 3D Background Graphics */}
      <div className="absolute inset-0 z-0">
        <motion.div
           className="absolute top-1/4 right-0 w-[800px] h-[800px] bg-emerald-500/10 blur-[150px] rounded-full"
           animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
           transition={{ duration: 15, repeat: Infinity }}
        />
        <motion.div
           className="absolute -bottom-20 -left-20 w-96 h-96 border-2 border-emerald-500/10 rounded-full"
           animate={{ rotateY: 360 }}
           transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
           style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
      </div>

      <main className="relative z-10 pt-40 px-8 max-w-7xl mx-auto text-center">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest mb-8 backdrop-blur-md">
             Economic Model v2
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-white mb-8 leading-[0.9]">
             Compute cost,<br />
             <span className="text-emerald-400">crushed.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-20 leading-relaxed">
             By decentralizing workloads onto idle campus hardware, we eliminate cloud tax. Pay only for raw execution.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 max-w-5xl mx-auto gap-8 mb-24">
          <PricingCard 
            title="Standard Compute"
            desc="Optimal for physics simulations and CPU-based workloads."
            icon={Cpu}
            price="₹1.49"
            unit="per core hour"
            features={[
              "Distributed Simulation (MPI)",
              "Fault-Tolerant Watchdog",
              "Local SSD caching",
              "Unlimited Egress"
            ]}
          />
          
          <PricingCard 
            title="Accelerated GPU"
            desc="For ML Training, 3D Rendering, and parallel data streams."
            icon={Zap}
            price="₹12.50"
            unit="per RTX 3090 hr"
            featured
            features={[
               "NVIDIA CUDA 12.x Support",
               "Zero-Config Docker Hub",
               "Blender/Cycle automated chunks",
               "Priority Scheduler queue"
            ]}
          />
        </div>

        {/* Market Comparison */}
        <motion.div 
           className="bg-slate-900/40 backdrop-blur-3xl rounded-[40px] p-12 max-w-4xl mx-auto border border-slate-800 text-left shadow-2xl"
           initial={{ opacity: 0, scale: 0.95 }}
           whileInView={{ opacity: 1, scale: 1 }}
           viewport={{ once: true }}
        >
          <h2 className="text-[10px] font-black text-slate-500 mb-10 uppercase tracking-[0.3em] text-center">Protocol Transparency / Market Comparison</h2>
          <div className="space-y-4">
            <ComparisonRow provider="AWS EC2 (p3.2xlarge)" cost="₹224.50 / hr" />
            <ComparisonRow provider="Google Cloud (v100)" cost="₹286.00 / hr" />
            <ComparisonRow provider="Azure NV6" cost="₹198.25 / hr" />
            <div className="pt-6 mt-6 border-t border-slate-800">
              <ComparisonRow provider="CampuGrid Decentralized" cost="₹12.50 / hr" highlight />
            </div>
          </div>

          <div className="mt-12 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl flex items-center justify-between group cursor-pointer">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                   <Database size={24} />
                </div>
                <div>
                   <h4 className="text-white font-bold">Enterprise Quote?</h4>
                   <p className="text-slate-500 text-sm">Custom SLAs and private cluster orchestration.</p>
                </div>
             </div>
             <ArrowRight className="text-emerald-500 group-hover:translate-x-2 transition-transform" />
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function PricingCard({ title, desc, icon: Icon, price, unit, features, featured }: any) {
  return (
    <motion.div
      className={`relative p-10 rounded-[40px] text-left transition-all overflow-hidden ${
        featured 
          ? "bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 shadow-2xl shadow-emerald-500/20" 
          : "bg-slate-900/40 border border-slate-800"
      }`}
      whileHover={{ y: -8 }}
    >
      <div className="relative z-10">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 ${featured ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
           <Icon size={32} />
        </div>
        
        <h3 className="text-3xl font-black text-white mb-2">{title}</h3>
        <p className="text-slate-500 text-sm mb-10 leading-relaxed">{desc}</p>
        
        <div className="mb-10 flex items-baseline gap-2">
          <span className="text-6xl font-black text-white tabular-nums tracking-tighter">{price}</span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{unit}</span>
        </div>

        <Link href="/login" className={`w-full py-5 rounded-2xl flex items-center justify-center font-black uppercase tracking-widest text-xs transition-all mb-10 ${
           featured ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-xl' : 'bg-white text-slate-950 hover:bg-emerald-50'
        }`}>
          Select Tier
        </Link>
        
        <ul className="space-y-5">
          {features.map((f: string, i: number) => (
            <li key={i} className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest group cursor-default">
              <div className={`p-1 rounded-md ${featured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}>
                 <Check size={14} />
              </div>
              <span className="group-hover:text-white transition-colors">{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function ComparisonRow({ provider, cost, highlight }: any) {
  return (
    <div className={`flex justify-between items-center px-6 py-4 rounded-2xl transition-all ${highlight ? 'bg-emerald-500/10 border border-emerald-500/20 shadow-lg' : 'hover:bg-white/5'}`}>
      <span className={`text-[10px] font-black uppercase tracking-widest ${highlight ? "text-emerald-400" : "text-slate-500"}`}>
        {provider}
      </span>
      <span className={`font-mono text-sm font-black ${highlight ? "text-white" : "text-slate-400 opacity-60"}`}>
        {cost}
      </span>
    </div>
  );
}

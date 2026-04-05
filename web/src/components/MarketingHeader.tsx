import Link from "next/link";
import { Network } from "lucide-react";
import { motion } from "motion/react";

export function MarketingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-8 py-6 backdrop-blur-2xl bg-slate-950/20 border-b border-white/5">
      <Link href="/" className="flex items-center gap-3 group">
        <motion.div 
          className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30 group-hover:rotate-6 transition-transform"
          whileHover={{ scale: 1.1 }}
        >
          <Network size={20} className="text-white" />
        </motion.div>
        <span className="text-xl font-black tracking-tighter text-white uppercase tracking-widest">CampuGrid</span>
      </Link>
      
      <nav className="hidden md:flex items-center gap-10">
        <Link href="/" className="text-[10px] font-black text-slate-400 hover:text-emerald-400 uppercase tracking-[0.2em] transition-all">Platform</Link>
        <Link href="/pricing" className="text-[10px] font-black text-slate-400 hover:text-emerald-400 uppercase tracking-[0.2em] transition-all">Pricing</Link>
        <Link href="/docs" className="text-[10px] font-black text-slate-400 hover:text-emerald-400 uppercase tracking-[0.2em] transition-all">Protocol</Link>
      </nav>

      <div className="flex items-center gap-6">
        <Link href="/login" className="text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-[0.2em] transition-all">
          Sign In
        </Link>
        <Link href="/login" className="px-6 py-3 rounded-2xl bg-white text-slate-950 font-black uppercase tracking-widest text-[10px] hover:bg-emerald-50 transition-all shadow-xl active:scale-95">
          Join the Grid
        </Link>
      </div>
    </header>
  );
}

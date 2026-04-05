"use client";

import { signIn } from "next-auth/react";
import { Cpu, ShieldCheck, Zap, Network } from "lucide-react";
import { motion } from "motion/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center relative overflow-hidden selection:bg-emerald-500/30">
      {/* 3D Background Graphics */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div
           className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full"
           animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
           transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
           className="absolute bottom-1/4 right-1/4 w-60 h-60 border-2 border-emerald-500/20 rounded-full"
           animate={{ rotate: 360 }}
           transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
           style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
      </div>

      <motion.div 
        className="relative z-10 w-full max-w-md px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="bg-slate-900/40 backdrop-blur-3xl border border-slate-800 rounded-[32px] p-10 shadow-2xl flex flex-col items-center">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500 flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/30 rotate-3">
            <Network size={40} className="text-white" />
          </div>
          
          <h1 className="text-4xl font-black tracking-tight text-white mb-3">Initialize.</h1>
          <p className="text-slate-500 text-center mb-10 font-medium">
            Connect your identity to access the global compute fabric.
          </p>

          <div className="w-full space-y-4">
             <button
               onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
               className="w-full flex items-center justify-center gap-4 bg-white text-slate-950 font-black uppercase tracking-widest text-xs py-5 px-8 rounded-2xl hover:bg-emerald-50 transition-all shadow-xl active:scale-95 group"
             >
               <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                 <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                 <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                 <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                 <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
               </svg>
               Continue with Google
             </button>
             
             <div className="py-2 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">or secure gate</span>
                <div className="h-px flex-1 bg-slate-800" />
             </div>

             <button className="w-full flex items-center justify-center gap-2 border-2 border-slate-800 text-slate-400 font-black uppercase tracking-widest text-[10px] py-4 px-8 rounded-2xl hover:bg-slate-900 transition-all">
                Access with SSO
             </button>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 w-full">
             <LoginMetric icon={ShieldCheck} label="Secure" />
             <LoginMetric icon={Zap} label="Fast" />
             <LoginMetric icon={Cpu} label="Powerful" />
          </div>

          <p className="mt-10 text-[10px] font-bold text-slate-600 text-center leading-relaxed">
             AUTHENTICATION PROTOCOL v4.2<br />
             SECURE HANDSHAKE ENABLED
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function LoginMetric({ icon: Icon, label }: any) {
   return (
      <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 border border-white/5 text-slate-500">
         <Icon size={18} />
         <span className="text-[8px] font-black uppercase tracking-[0.2em]">{label}</span>
      </div>
   );
}

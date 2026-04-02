import { MarketingHeader } from "@/components/MarketingHeader";
import { ArrowRight, Cpu, Layers, Server, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <MarketingHeader />

      {/* Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-primary/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[800px] h-[800px] bg-secondary/15 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero Section */}
      <main className="relative z-10 pt-40 pb-20 px-8 max-w-7xl mx-auto flex flex-col xl:flex-row items-center gap-16">
        <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-text-muted backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Now live on 14+ university campuses
          </div>
          
          <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            The unified <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Compute</span> network.
          </h1>
          
          <p className="text-xl text-text-muted max-w-2xl leading-relaxed">
            Harness the idle power of millions of campus computers. Train multi-node ML models, render 3D scenes, and run scientific simulations at a fraction of the cost of traditional cloud providers.
          </p>

          <div className="flex items-center gap-4 pt-4">
            <Link href="/login" className="px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all scale-100 hover:scale-105 active:scale-95 flex items-center gap-2">
              Start Computing <ArrowRight size={20} />
            </Link>
            <Link href="/pricing" className="px-8 py-4 rounded-xl glass font-bold text-white hover:bg-white/10 transition-colors">
              View Pricing
            </Link>
          </div>
        </div>

        <div className="flex-1 relative w-full aspect-square max-w-[600px] animate-in fade-in slide-in-from-right-16 duration-1000">
          {/* Abstract 3D/Glass representation */}
          <div className="absolute inset-0 glass rounded-full border border-white/10 flex items-center justify-center p-8 overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
            
            {/* Network Nodes */}
            <div className="relative w-full h-full animate-[spin_60s_linear_infinite]">
              <Node x="20%" y="30%" active />
              <Node x="70%" y="20%" />
              <Node x="80%" y="70%" active />
              <Node x="30%" y="80%" />
              <Node x="50%" y="50%" active center />
              
              {/* Lines linking them */}
              <svg className="absolute inset-0 w-full h-full -z-10 opacity-30">
                <line x1="20%" y1="30%" x2="50%" y2="50%" stroke="currentColor" className="text-primary" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="70%" y1="20%" x2="50%" y2="50%" stroke="currentColor" className="text-white" strokeWidth="1" />
                <line x1="80%" y1="70%" x2="50%" y2="50%" stroke="currentColor" className="text-primary" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="30%" y1="80%" x2="50%" y2="50%" stroke="currentColor" className="text-white" strokeWidth="1" />
              </svg>
            </div>
          </div>

          {/* Floating UI cards */}
          <div className="absolute -left-12 top-1/4 glass p-4 rounded-2xl border-l-4 border-l-success shadow-2xl animate-[bounce_8s_ease-in-out_infinite]">
            <div className="flex items-center gap-3">
              <div className="bg-success/20 p-2 rounded-lg text-success">
                <CheckCircleIcon />
              </div>
              <div>
                <p className="text-xs text-text-muted font-bold tracking-wider uppercase">Job Finished</p>
                <p className="font-semibold text-white">ResNet50 / Local SGD</p>
              </div>
            </div>
          </div>

          <div className="absolute -right-8 bottom-1/4 glass p-4 rounded-2xl shadow-2xl animate-[bounce_6s_ease-in-out_infinite_reverse]">
            <p className="text-xs text-text-muted mb-1 font-semibold">Live Cost Savings</p>
            <p className="text-2xl font-bold text-success">-84.2%</p>
            <p className="text-[10px] text-text-muted">vs existing cloud</p>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 py-32 px-8 bg-black/40 border-y border-white/5 mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-white mb-4">Built for Scale and Resilience</h2>
            <p className="text-text-muted text-lg max-w-2xl mx-auto">
              CampuGrid automatically handles peer discovery, network traversal, and fault tolerance across untrusted campus hardware.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={ShieldCheck}
              title="Fault Tolerant Execution"
              desc="When a node drops offline mid-render, our Watchdog instantly identifies it and re-assigns the chunk to a healthy peer."
            />
            <FeatureCard 
              icon={Layers}
              title="Automated Pipeline"
              desc="Just drag-and-drop your .blend or .py file. Our Gemini AI pipeline detects dependencies, chunks data, and containerizes it dynamically."
            />
            <FeatureCard 
              icon={Zap}
              title="High-Latency Native"
              desc="Optimized for Campus Wi-Fi using Local SGD periodically averaging ML weights async, dodging the usual slow-network bottlenecks."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Node({ x, y, active, center }: any) {
  return (
    <div 
      className="absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y }}
    >
      <div className={`
        rounded-full flex items-center justify-center
        ${center ? 'w-24 h-24 bg-gradient-to-tr from-primary/30 to-secondary/30 border-2 border-primary shadow-[0_0_40px_rgba(99,102,241,0.5)]' : 
          active ? 'w-16 h-16 bg-white/10 border border-success/50 backdrop-blur-md shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 
          'w-12 h-12 bg-black/50 border border-white/10'}
      `}>
        {center ? <Server className="text-white" size={32} /> : <Cpu className={active ? "text-success" : "text-text-muted"} size={20} />}
      </div>
      {active && !center && (
        <div className="absolute top-[-4px] right-[-4px] w-3 h-3 bg-success rounded-full animate-ping" />
      )}
    </div>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}

function FeatureCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="glass rounded-3xl p-8 border-t border-white/10 hover:border-primary/50 transition-colors group">
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
        <Icon className="text-primary" size={28} />
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-text-muted leading-relaxed">{desc}</p>
    </div>
  );
}

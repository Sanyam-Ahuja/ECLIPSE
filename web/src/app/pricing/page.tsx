import { MarketingHeader } from "@/components/MarketingHeader";
import { Check, Database, Zap } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-32">
      <MarketingHeader />

      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-secondary/10 blur-[120px] rounded-full pointer-events-none" />

      <main className="relative z-10 pt-40 px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-bold uppercase tracking-wider mb-6">
          Pricing
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
          Compute cost, <span className="text-success border-b-4 border-success">crushed.</span>
        </h1>
        <p className="text-xl text-text-muted max-w-2xl mx-auto mb-16">
          By decentralizing workloads onto idle campus hardware, we cut the middleman. You only pay for raw compute seconds. No egress fees, no instance sizing.
        </p>

        <div className="grid md:grid-cols-2 max-w-4xl mx-auto gap-8 mb-24">
          <PricingCard 
            title="Standard Compute"
            desc="Optimal for data preprocessing, physics simulations, and CPU-based workloads."
            icon={Database}
            price="$0.02"
            unit="per CPU-core hour"
            gradient="from-blue-500/20 to-cyan-500/10"
            buttonClass="bg-white/10 hover:bg-white/20 text-white"
            features={[
              "Distributed Simulation Support (MPI)",
              "Fault-Tolerant Watchdog",
              "Local storage caching",
              "Unlimited Output Downloads"
            ]}
          />
          
          <PricingCard 
            title="Accelerated GPU"
            desc="For ML Training, 3D Rendering, and parallel data streaming workloads."
            icon={Zap}
            price="$0.19"
            unit="per RTX 3090-equivalent hour"
            gradient="from-primary/20 to-secondary/10"
            buttonClass="bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/25 hover:shadow-primary/40"
            featured
            features={[
              "NVIDIA CUDA Support",
              "Local-SGD distributed training",
              "Blender/Maya automated chunks",
              "Priority Scheduler queue"
            ]}
          />
        </div>

        <div className="glass rounded-3xl p-12 max-w-4xl mx-auto border-t-2 border-t-white/10 text-left">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Market Comparison</h2>
          <div className="space-y-6">
            <ComparisonRow provider="AWS EC2 (p3.2xlarge)" cost="$3.06 / hr" />
            <ComparisonRow provider="Google Cloud (a2-highgpu-1)" cost="$3.67 / hr" />
            <ComparisonRow provider="Lambda Labs (RTX A6000)" cost="$0.80 / hr" />
            <div className="pt-6 mt-6 border-t border-white/10">
              <ComparisonRow provider="CampuGrid Network" cost="$0.19 / hr" highlight />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function PricingCard({ title, desc, icon: Icon, price, unit, gradient, buttonClass, features, featured }: any) {
  return (
    <div className={clsx(
      "glass rounded-3xl p-8 text-left relative overflow-hidden transition-all duration-300 hover:-translate-y-2",
      featured ? "border outline outline-2 outline-primary outline-offset-[-2px] shadow-[0_0_40px_rgba(99,102,241,0.15)]" : ""
    )}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`} />
      <div className="relative z-10">
        <Icon className={featured ? "text-primary mb-4" : "text-white mb-4"} size={32} />
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-text-muted text-sm mb-6 h-10">{desc}</p>
        
        <div className="mb-8 flex items-end gap-2">
          <span className="text-5xl font-extrabold text-white leading-none">{price}</span>
          <span className="text-text-muted text-sm pb-1">{unit}</span>
        </div>

        <Link href="/login" className={clsx("w-full py-4 rounded-xl flex items-center justify-center font-bold transition-all mb-8", buttonClass)}>
          Get Started
        </Link>
        
        <ul className="space-y-4">
          {features.map((f: string, i: number) => (
            <li key={i} className="flex items-center gap-3 text-sm text-text-muted hover:text-white transition-colors">
              <Check size={16} className={featured ? "text-primary" : "text-text-muted"} />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ComparisonRow({ provider, cost, highlight }: any) {
  return (
    <div className="flex justify-between items-center px-4 py-2 hover:bg-white/5 rounded-lg transition-colors">
      <span className={clsx("font-medium", highlight ? "text-primary font-bold text-lg" : "text-text-muted")}>
        {provider}
      </span>
      <span className={clsx("font-mono", highlight ? "text-success font-bold text-lg" : "text-white/60")}>
        {cost}
      </span>
    </div>
  );
}

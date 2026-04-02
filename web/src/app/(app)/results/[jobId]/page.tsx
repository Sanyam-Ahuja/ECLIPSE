"use client";

import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import { ArrowLeft, CheckCircle2, Download, Play, FileText, CheckCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function ResultsPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const { data: session } = useSession();

  const api = new CampuGridAPI(session?.backend_jwt || "");

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => api.getJob(jobId),
    enabled: !!session?.backend_jwt && !!jobId,
  });

  if (isLoading || !job) {
    return <div className="p-8 text-center text-text-muted">Loading results...</div>;
  }

  // Determine what type of result to show based on job type
  const renderResult = () => {
    switch (job.type) {
      case "render":
        return (
          <div className="bg-black/50 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center aspect-video relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
            <img 
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
              alt="Render placeholder" 
              className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen"
            />
            <div className="relative z-20 flex flex-col items-center gap-4">
              <button className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all text-white">
                <Play size={24} className="ml-1" />
              </button>
              <span className="font-semibold text-white tracking-widest uppercase text-sm">Preview</span>
            </div>
            <div className="absolute bottom-4 left-4 z-20 text-white font-mono text-sm">
              00:00:12:04 / {job.chunks?.length * 75} frames
            </div>
          </div>
        );
      
      case "ml_training":
        return (
          <div className="bg-background rounded-2xl border border-border p-8 py-12 flex flex-col items-center">
            <div className="w-full max-w-lg aspect-[16/9] border-b border-l border-white/20 relative mb-8">
              {/* Fake training curve chart */}
              <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible preserve-3d" style={{ transform: "rotateX(10deg)" }}>
                <path d="M 0 90 Q 20 20 40 30 T 70 15 T 100 5" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                <path d="M 0 85 Q 20 80 40 40 T 70 25 T 100 10" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              </svg>
              <div className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-xs text-text-muted">Training Steps (Local SGD)</div>
              <div className="absolute top-1/2 -left-8 -translate-y-1/2 -rotate-90 text-xs text-text-muted">Loss</div>
            </div>
            <div className="grid grid-cols-3 gap-8 w-full max-w-lg text-center">
              <div>
                <p className="text-sm font-bold text-success mb-1">98.4%</p>
                <p className="text-xs text-text-muted uppercase tracking-wider">Final Accuracy</p>
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-1">0.0231</p>
                <p className="text-xs text-text-muted uppercase tracking-wider">Final Loss</p>
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-1">4 Nodes</p>
                <p className="text-xs text-text-muted uppercase tracking-wider">World Size</p>
              </div>
            </div>
          </div>
        );
      
      default: // data or simulation
        return (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-success/20 text-success rounded-full flex items-center justify-center mb-6">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Processing Complete</h3>
            <p className="text-text-muted max-w-md">
              Data assembly finished successfully. The finalized output artifact is ready for download.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <Link href="/dashboard" className="flex items-center gap-2 text-text-muted hover:text-white transition-colors w-fit">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <header className="glass rounded-3xl p-8 border-t-4 border-t-success flex justify-between items-center shadow-xl shadow-success/5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="text-success" size={28} />
            <h1 className="text-3xl font-bold tracking-tight text-white">Job Completed</h1>
          </div>
          <p className="text-text-muted text-lg mt-1">
            {job.id.substring(0, 8)} • Finished {format(new Date(job.updated_at), "MMM d, h:mm a")}
          </p>
        </div>
        
        {job.presigned_url ? (
          <a
            href={job.presigned_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-gradient-to-r from-success to-emerald-500 text-white font-bold py-3 px-8 rounded-xl hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all scale-100 hover:scale-105 active:scale-95"
          >
            <Download size={20} />
            Download Artifacts
          </a>
        ) : (
          <button disabled className="flex items-center gap-3 bg-white/5 text-text-muted font-bold py-3 px-8 rounded-xl cursor-not-allowed">
            Output Not Available
          </button>
        )}
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold text-white">Analysis & Outputs</h2>
          {renderResult()}
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Execution Summary</h2>
          
          <div className="glass rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center pb-6 border-b border-border">
              <span className="text-text-muted">Platform Cost</span>
              <span className="text-2xl font-bold text-white">$1.24</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Compute Time</span>
                <span className="font-medium text-white text-right">00:43:12</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">GPU Hours</span>
                <span className="font-medium text-white text-right">3.2 hrs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Total Nodes Used</span>
                <span className="font-medium text-white text-right">{job.chunks?.length || 4} Nodes</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Workload Type</span>
                <span className="font-medium text-white text-right capitalize">{job.type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Sync Mode</span>
                <span className="font-medium text-white text-right capitalize">{job.ml_sync_mode || "N/A"}</span>
              </div>
            </div>
          </div>
          
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4 text-white font-semibold">
              <FileText size={18} className="text-primary"/> Access Logs
            </div>
            <button className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors border border-white/10 text-white">
              Download Execution Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

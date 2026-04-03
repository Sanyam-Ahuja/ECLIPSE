"use client";

import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import { ArrowLeft, CheckCircle2, Download, FileText, CheckCircle } from "lucide-react";
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

  // Compute values from real job data
  const totalChunks = job.chunks?.length || 0;
  const completedChunks = job.chunks?.filter((c: any) => c.status === "completed").length || 0;
  const totalGpuHours = job.chunks?.reduce((sum: number, c: any) => sum + (c.gpu_hours || 0), 0) || 0;
  const totalCost = job.actual_cost || job.chunks?.reduce((sum: number, c: any) => sum + (c.cost || 0), 0) || 0;

  // Compute total duration from earliest start to latest completion
  const startTimes = job.chunks?.map((c: any) => c.started_at).filter(Boolean).map((t: string) => new Date(t).getTime()) || [];
  const endTimes = job.chunks?.map((c: any) => c.completed_at).filter(Boolean).map((t: string) => new Date(t).getTime()) || [];
  const wallClockMs = startTimes.length > 0 && endTimes.length > 0
    ? Math.max(...endTimes) - Math.min(...startTimes)
    : 0;
  const wallClockStr = wallClockMs > 0
    ? `${Math.floor(wallClockMs / 3600000).toString().padStart(2, "0")}:${Math.floor((wallClockMs % 3600000) / 60000).toString().padStart(2, "0")}:${Math.floor((wallClockMs % 60000) / 1000).toString().padStart(2, "0")}`
    : "—";

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
            {job.id.substring(0, 8)} • Finished {job.updated_at ? format(new Date(job.updated_at), "MMM d, h:mm a") : "—"}
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
          <h2 className="text-xl font-semibold text-white">Output</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-success/20 text-success rounded-full flex items-center justify-center mb-6">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Processing Complete</h3>
            <p className="text-text-muted max-w-md">
              {completedChunks} of {totalChunks} chunks completed successfully. 
              {job.presigned_url 
                ? " The finalized output artifact is ready for download."
                : " Output assembly is in progress."
              }
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Execution Summary</h2>
          
          <div className="glass rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center pb-6 border-b border-border">
              <span className="text-text-muted">Total Cost</span>
              <span className="text-2xl font-bold text-white">${totalCost.toFixed(2)}</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Wall Clock Time</span>
                <span className="font-medium text-white text-right">{wallClockStr}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">GPU Hours</span>
                <span className="font-medium text-white text-right">{totalGpuHours.toFixed(2)} hrs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Chunks Completed</span>
                <span className="font-medium text-white text-right">{completedChunks} / {totalChunks}</span>
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

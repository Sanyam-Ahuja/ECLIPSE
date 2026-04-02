"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import { useJobStream } from "@/lib/ws";
import { Activity, CheckCircle2, AlertTriangle, ArrowLeft, Cpu, Thermometer, Battery } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function MonitorPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const { data: session } = useSession();
  const router = useRouter();

  const api = new CampuGridAPI(session?.backend_jwt || "");

  // Initial fetch for chunks structure
  const { data: jobInfo, isLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => api.getJob(jobId),
    enabled: !!session?.backend_jwt && !!jobId,
  });

  // Live WebSocket for chunk updates
  const { messages } = useJobStream(jobId, session?.backend_jwt || "");
  
  // Track live chunk state by merging initial data with WS updates
  const [liveChunks, setLiveChunks] = useState<any[]>([]);
  const [jobStatus, setJobStatus] = useState<string>("queued");

  useEffect(() => {
    if (jobInfo?.chunks) {
      // Sort chunks by index
      setLiveChunks([...jobInfo.chunks].sort((a, b) => a.chunk_index - b.chunk_index));
      setJobStatus(jobInfo.status);
    }
  }, [jobInfo]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      
      if (lastMsg.type === "chunk_status") {
        setLiveChunks(prev => prev.map(c => 
          c.id === lastMsg.chunk_id 
            ? { ...c, status: lastMsg.status, progress: lastMsg.progress || c.progress } 
            : c
        ));
      } else if (lastMsg.type === "job_complete") {
        setJobStatus("completed");
        setTimeout(() => router.push(`/results/${jobId}`), 2000);
      }
    }
  }, [messages, jobId, router]);

  if (isLoading || !jobInfo) {
    return <div className="p-8 text-center text-text-muted">Loading job details...</div>;
  }

  const completedChunks = liveChunks.filter(c => c.status === "completed").length;
  const progressPercent = liveChunks.length > 0 ? (completedChunks / liveChunks.length) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <Link href="/dashboard" className="flex items-center gap-2 text-text-muted hover:text-white transition-colors w-fit">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <header className="glass rounded-3xl p-8 relative overflow-hidden">
        {/* Progress Background */}
        <div 
          className="absolute inset-0 bg-primary/5 transition-all duration-1000 origin-left"
          style={{ transform: `scaleX(${progressPercent / 100})` }}
        />
        
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-secondary/20 text-secondary border border-secondary/30 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide">
                {jobInfo.type}
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white">{jobId.substring(0, 8)}...</h1>
            </div>
            <p className="text-text-muted">Target Output: {jobInfo.input_path}</p>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-1">
              <span className="text-sm text-text-muted uppercase tracking-wider font-semibold">Status</span>
              <span className={clsx(
                "px-2.5 py-1 rounded-full text-xs font-bold border",
                jobStatus === "running" ? "text-primary bg-primary/10 border-primary/20" :
                jobStatus === "completed" ? "text-success bg-success/10 border-success/20" :
                "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
              )}>
                {jobStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{completedChunks} / {liveChunks.length} Chunks</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {liveChunks.map((chunk) => (
          <ChunkCard key={chunk.id} chunk={chunk} />
        ))}
      </div>
    </div>
  );
}

function ChunkCard({ chunk }: { chunk: any }) {
  const isRunning = chunk.status === "running";
  const isCompleted = chunk.status === "completed";
  const isFailed = chunk.status === "failed";
  const isPending = !isRunning && !isCompleted && !isFailed;

  // Mock live GPU stats for running chunks (would come via WS in production)
  const [gpuLoad] = useState(Math.floor(Math.random() * 15) + 85); // 85-99%
  const [temp] = useState(Math.floor(Math.random() * 10) + 65); // 65-75C
  const [vram] = useState(Math.floor(Math.random() * 20) + 60); // 60-80%

  return (
    <div className={clsx(
      "glass rounded-2xl p-6 relative border-l-4 transition-all duration-500",
      isRunning ? "border-l-primary shadow-[0_0_20px_rgba(99,102,241,0.1)]" :
      isCompleted ? "border-l-success" :
      isFailed ? "border-l-danger bg-danger/5" :
      "border-l-yellow-400"
    )}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Chunk #{chunk.chunk_index}</h3>
          <p className="text-sm font-medium text-text-muted flex items-center gap-2">
            <ServerNodeIcon />
            {chunk.node_id ? `Node ${chunk.node_id.substring(0, 6)}` : "Waiting for Node Match..."}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isRunning && <Activity className="text-primary animate-pulse" size={18} />}
          {isCompleted && <CheckCircle2 className="text-success" size={18} />}
          {isFailed && <AlertTriangle className="text-danger" size={18} />}
          <span className="font-semibold text-sm capitalize text-white opacity-80">{chunk.status}</span>
        </div>
      </div>

      {isRunning ? (
        <div className="space-y-4">
          <div className="bg-background rounded-xl border border-white/5 p-4 grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold flex items-center gap-1">
                <Cpu size={12} /> GPU Load
              </span>
              <span className="text-lg font-bold text-white">{gpuLoad}%</span>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-primary h-full" style={{ width: `${gpuLoad}%` }} />
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold flex items-center gap-1">
                <Thermometer size={12} /> Temp
              </span>
              <span className="text-lg font-bold text-yellow-400">{temp}°C</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold flex items-center gap-1">
                <Battery size={12} /> VRAM
              </span>
              <span className="text-lg font-bold text-white">{vram}%</span>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-secondary h-full" style={{ width: `${vram}%` }} />
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-xs mb-1 font-medium">
              <span className="text-primary">Executing Range: {chunk.spec?.chunk_start}-{chunk.spec?.chunk_end}</span>
              <span className="text-text-muted">Time Est: ~4m</span>
            </div>
          </div>
        </div>
      ) : isPending ? (
        <div className="bg-white/5 border border-dashed border-white/10 rounded-xl p-6 text-center text-text-muted flex flex-col items-center justify-center gap-2">
          <span className="w-8 h-8 rounded-full border-2 border-yellow-400/50 border-t-yellow-400 animate-spin" />
          <p className="text-sm">In orchestrator queue</p>
        </div>
      ) : isCompleted ? (
        <div className="h-24 bg-success/5 rounded-xl border border-success/10 flex items-center justify-center">
          <p className="text-success font-semibold flex items-center gap-2">
            <CheckCircle2 size={18} /> Processing Successful
          </p>
        </div>
      ) : (
        <div className="h-24 bg-danger/10 rounded-xl border border-danger/20 p-4">
          <p className="text-danger font-bold flex items-center gap-2 mb-1">
            <AlertTriangle size={16} /> Error during execution
          </p>
          <p className="text-sm text-text-muted line-clamp-2">Node dropped offline. Watchdog will rescue this chunk shortly.</p>
        </div>
      )}
    </div>
  );
}

function ServerNodeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
      <line x1="6" y1="6" x2="6.01" y2="6"/>
      <line x1="6" y1="18" x2="6.01" y2="18"/>
    </svg>
  );
}

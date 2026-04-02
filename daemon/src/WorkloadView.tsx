import { Terminal, Box, Activity } from "lucide-react";

export default function WorkloadView({ currentJob }: any) {
  if (!currentJob) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div className="w-24 h-24 rounded-full bg-white/5 border border-dashed border-white/10 flex items-center justify-center mb-6">
          <Box size={32} className="text-text-muted" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Active Workload</h2>
        <p className="text-text-muted text-center max-w-sm">
          Your node is currently idle. Ensure you have clicked "Start Earning" on the Dashboard to receive jobs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wider mb-4 animate-pulse">
          <Activity size={14} /> Active Workload (Chunk #{currentJob.chunk_index})
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{currentJob.id}</h1>
        <p className="text-text-muted mt-1">Docker Image: {currentJob.spec?.image}</p>
      </header>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3 glass rounded-2xl p-6 flex flex-col h-[60vh]">
          <div className="flex items-center gap-2 mb-4 text-white font-semibold pb-4 border-b border-white/10">
            <Terminal size={18} className="text-primary" /> Live Container Logs
          </div>
          
          <div className="bg-background rounded-xl flex-1 p-4 font-mono text-sm overflow-y-auto border border-border">
            {/* Simulated Logs for MVP */}
            <div className="text-text-muted">Pulling image... <span className="text-success">Done</span></div>
            <div className="text-text-muted">Creating network interface... <span className="text-success">Done</span></div>
            <div className="text-blue-400 mt-2">campugrid_wrap: executing inner workload...</div>
            <div className="text-white mt-1">Processing chunk {currentJob.chunk_index} ({currentJob.spec.chunk_start} to {currentJob.spec.chunk_end})</div>
            <div className="text-white mt-1 animate-pulse">Working...</div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Est. Payout</h3>
            <span className="text-3xl font-bold text-success">$0.32</span>
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Specs</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Type</span>
                <span className="text-white capitalize">{currentJob.type.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Network</span>
                <span className="text-white">Host LAN</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

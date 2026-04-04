import { Terminal, Box, Activity, CheckCircle2, XCircle, Cpu, Network } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { listen } from "@tauri-apps/api/event";

interface LogLine {
  ts: string;
  text: string;
  kind: "info" | "success" | "error" | "dim";
}

function ts() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

export default function WorkloadView({ currentJob }: any) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [phase, setPhase] = useState<"idle" | "pulling" | "running" | "done" | "failed">("idle");
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = (text: string, kind: LogLine["kind"] = "info") => {
    setLogs(p => [...p, { ts: ts(), text, kind }]);
  };

  useEffect(() => {
    if (!currentJob) return;

    // Reset when a new job arrives
    setLogs([]);
    setPhase("pulling");

    const jobId = currentJob.job_id ?? currentJob.id;
    const chunkId = currentJob.chunk_id ?? currentJob.id;
    const image = currentJob.spec?.image ?? "unknown";

    addLog(`Chunk ${chunkId} received`, "info");
    addLog(`Job ID: ${jobId}`, "dim");
    addLog(`Container image: ${image}`, "info");
    addLog(`Pulling image from registry…`, "dim");

    // Listen for any explicit status events from Rust
    const unlistenJob = listen("job_dispatch", (e: any) => {
      const p = e.payload;
      addLog(`📦 New chunk: ${p.chunk_id}`, "info");
    });

    const unlistenLog = listen("chunk_log", (e: any) => {
      const p = e.payload;
      if (p.chunk_id === chunkId) {
        addLog(`  ${p.log}`, "dim");
      }
    });

    const unlistenStatus = listen("job_status_update", (e: any) => {
      const p = e.payload;
      if (p.chunk_id === chunkId) {
        setPhase(p.status === "completed" ? "done" : "failed");
        addLog(
          p.status === "completed" ? "Execution completed successfully" : "Execution failed / Image not found",
          p.status === "completed" ? "success" : "error"
        );
      }
    });

    return () => {
      unlistenJob.then(f => f());
      unlistenLog.then(f => f());
      unlistenStatus.then(f => f());
    };
  }, [currentJob]);

  // Auto-scroll log terminal
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  if (!currentJob) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center animate-in">
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center mb-8 relative"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", border: "1px dashed rgba(255,255,255,0.1)" }}
        >
          <Box size={40} style={{ color: "#475569" }} />
          {/* Rotating ring */}
          <div style={{
            position: "absolute", inset: -8,
            borderRadius: "50%",
            border: "1px solid rgba(99,102,241,0.2)",
            borderTopColor: "transparent",
            animation: "spin 8s linear infinite"
          }} />
        </div>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>
          Node Idle — Waiting for Workloads
        </h2>
        <p style={{ color: "#64748b", textAlign: "center", maxWidth: 320, fontSize: "0.875rem", lineHeight: 1.6 }}>
          Make sure you've clicked <strong style={{ color: "#6366f1" }}>Start Earning</strong> on the dashboard.
          Chunks will appear here automatically.
        </p>
        <div style={{
          marginTop: "2rem",
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.4rem 1rem",
          borderRadius: 9999,
          background: "rgba(99,102,241,0.08)",
          border: "1px solid rgba(99,102,241,0.18)",
          fontSize: "0.75rem", color: "#6366f1", fontWeight: 600
        }}>
          <Activity size={12} style={{ animation: "pulse 2s ease infinite" }} />
          Listening for grid dispatches
        </div>
      </div>
    );
  }

  const jobId = currentJob.job_id ?? currentJob.id;
  const chunkId = currentJob.chunk_id ?? currentJob.id;
  const image = currentJob.spec?.image ?? "none";
  const chunkIndex = currentJob.spec?.chunk_start !== undefined
    ? `[${currentJob.spec.chunk_start}…${currentJob.spec.chunk_end}]`
    : "";

  const phaseColor: Record<string, string> = {
    pulling: "#eab308",
    running: "#6366f1",
    done: "#22c55e",
    failed: "#ef4444",
    idle: "#64748b",
  };

  const phaseLabel: Record<string, string> = {
    pulling: "Pulling Image",
    running: "Executing",
    done: "Completed ✓",
    failed: "Failed ✗",
    idle: "Idle",
  };

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", paddingBottom: "2rem" }}>

      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            padding: "0.25rem 0.75rem",
            borderRadius: 9999,
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.25)",
            fontSize: "0.7rem", fontWeight: 700,
            color: "#6366f1",
            textTransform: "uppercase", letterSpacing: "0.08em",
            marginBottom: "0.75rem",
            animation: "pulse 2s ease infinite",
          }}>
            <Activity size={12} /> Active Workload {chunkIndex}
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>
            Chunk #{chunkId.slice(0, 8)}
          </h1>
          <p style={{ color: "#64748b", marginTop: "0.25rem", fontSize: "0.875rem" }}>
            Job: <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{jobId}</span>
          </p>
        </div>

        {/* Phase badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.5rem 1rem",
          borderRadius: "0.75rem",
          background: `${phaseColor[phase]}15`,
          border: `1px solid ${phaseColor[phase]}30`,
          color: phaseColor[phase],
          fontWeight: 700, fontSize: "0.85rem"
        }}>
          {phase === "done" && <CheckCircle2 size={16} />}
          {phase === "failed" && <XCircle size={16} />}
          {(phase === "pulling" || phase === "running") && (
            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: phaseColor[phase], animation: "pulse 1.5s ease infinite" }} />
          )}
          {phaseLabel[phase]}
        </div>
      </header>

      {/* Main body */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: "1.25rem" }}>

        {/* Terminal / Logs */}
        <div className="glass" style={{ borderRadius: "1.25rem", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "0.6rem",
            padding: "0.875rem 1.25rem",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            color: "#e2e8f0", fontWeight: 600, fontSize: "0.875rem"
          }}>
            <Terminal size={16} style={{ color: "#6366f1" }} />
            Container Logs
            <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "#475569", fontFamily: "monospace" }}>
              {image}
            </span>
          </div>

          {/* Log lines */}
          <div
            ref={logRef}
            style={{
              flex: 1, padding: "1rem 1.25rem",
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              fontSize: "0.78rem", lineHeight: 1.75,
              overflowY: "auto", minHeight: "40vh", maxHeight: "55vh",
              background: "rgba(0,0,0,0.4)",
            }}
          >
            {logs.length === 0 && (
              <span style={{ color: "#334155" }}>Initializing container runtime…</span>
            )}
            {logs.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: "0.75rem" }}>
                <span style={{ color: "#1e3a5f", minWidth: 60 }}>{l.ts}</span>
                <span style={{
                  color: l.kind === "success" ? "#22c55e"
                    : l.kind === "error" ? "#ef4444"
                    : l.kind === "dim" ? "#475569"
                    : "#94a3b8"
                }}>{l.text}</span>
              </div>
            ))}
            {/* Blinking cursor */}
            <span className="cursor-blink" style={{ color: "#6366f1" }}>█</span>
          </div>
        </div>

        {/* Sidebar info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Specs */}
          <div className="glass" style={{ borderRadius: "1.25rem", padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>
              Chunk Spec
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.8rem" }}>
              <InfoRow label="Image" value={image.split(":")[0].split("/").pop() ?? image} />
              <InfoRow label="Tag" value={`:${image.split(":")[1] ?? "latest"}`} mono />
              {currentJob.spec?.chunk_start !== undefined && (
                <>
                  <InfoRow label="Start" value={String(currentJob.spec.chunk_start)} mono />
                  <InfoRow label="End" value={String(currentJob.spec.chunk_end)} mono />
                </>
              )}
            </div>
          </div>

          {/* Network */}
          <div className="glass" style={{ borderRadius: "1.25rem", padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>
              <Network size={11} style={{ display: "inline", marginRight: "0.4rem" }} />
              Network
            </h3>
            <div style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <InfoRow label="Mode" value={currentJob.spec?.network_mode ?? "host"} />
              <InfoRow label="Payout" value="Web Wallet" />
            </div>
          </div>

          {/* GPU status */}
          <div className="glass" style={{
            borderRadius: "1.25rem", padding: "1.25rem",
            background: "linear-gradient(135deg, rgba(99,102,241,0.07) 0%, rgba(139,92,246,0.07) 100%)",
            borderColor: "rgba(99,102,241,0.18)"
          }}>
            <h3 style={{ fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
              <Cpu size={11} style={{ display: "inline", marginRight: "0.4rem" }} />
              Compute
            </h3>
            <p style={{ fontSize: "0.78rem", color: "#6366f1", fontWeight: 600 }}>
              ⚡ GPU Active
            </p>
            <p style={{ fontSize: "0.72rem", color: "#475569", marginTop: "0.25rem" }}>
              Earnings sync to your web account
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
      <span style={{ color: "#475569" }}>{label}</span>
      <span style={{
        color: "#e2e8f0", fontFamily: mono ? "monospace" : "inherit",
        fontSize: mono ? "0.75rem" : "inherit",
        maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
      }}>{value}</span>
    </div>
  );
}

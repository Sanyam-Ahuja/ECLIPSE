"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, CheckCircle2, CircleDashed, File, XCircle, Shield } from "lucide-react";
import { CampuGridAPI } from "@/lib/api";
import { useJobStream } from "@/lib/ws";
import clsx from "clsx";

type SubmitState = "idle" | "uploading" | "detecting" | "ready";

export default function SubmitPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [jobProfile, setJobProfile] = useState<any>(null);
  const [requiresNetwork, setRequiresNetwork] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { connected, messages } = useJobStream(jobId, session?.backend_jwt || "");

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !session?.backend_jwt) return;

    setSubmitState("uploading");
    const api = new CampuGridAPI(session.backend_jwt);
    
    // Simulate upload progress since fetch doesn't natively support it easily
    const interval = setInterval(() => {
      setUploadProgress(p => Math.min(p + 10, 90));
    }, 200);

    try {
      const res = await api.submitJob(acceptedFiles, undefined, requiresNetwork);
      setJobId(res.job_id);
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => setSubmitState("detecting"), 500);
    } catch (e) {
      console.error(e);
      setSubmitState("idle");
      clearInterval(interval);
      setUploadProgress(0);
    }
  }, [session]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  // Watch WS messages for pipeline completion
  useEffect(() => {
    if (submitState === "detecting" && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.type === "pipeline_complete" && lastMsg.profile) {
        setJobProfile(lastMsg.profile);
        setSubmitState("ready");
      }
    }
  }, [messages, submitState]);

  const handleLaunch = () => {
    if (jobId) {
      router.push(`/monitor/${jobId}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="pb-8 border-b border-border">
        <h1 className="text-3xl font-bold tracking-tight text-white">Submit Workload</h1>
        <p className="text-text-muted mt-2 text-lg">
          Upload your files, and our AI pipeline will detect requirements and build the execution plan.
        </p>
      </header>

      <AnimatePresence mode="wait">
        {submitState === "idle" && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div
              className={clsx(
                "w-full h-96 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer",
                isDragActive 
                  ? "bg-primary/10 border-primary shadow-[0_0_40px_rgba(99,102,241,0.2)]" 
                  : "glass border-border hover:border-primary/50 hover:bg-white/5"
              )}
              {...getRootProps()}
            >
            <input {...getInputProps()} />
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
              <UploadCloud size={40} className="text-primary" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">
              {isDragActive ? "Drop files now" : "Drag & drop files here"}
            </h3>
            <p className="text-text-muted text-center max-w-sm">
              Supports .blend, .py, .csv, .parquet, OpenFOAM, LAMMPS, and archive formats (.zip, .tar.gz).
            </p>

            {/* Advanced Settings Toggle */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowAdvanced(!showAdvanced); }}
              className="mt-6 text-xs font-medium text-text-muted hover:text-white transition-colors underline underline-offset-4"
            >
              {showAdvanced ? "Hide Advanced Settings" : "Advanced Settings"}
            </button>

            {showAdvanced && (
              <div
                className="mt-4 p-4 glass rounded-xl border border-white/10 text-left w-full max-w-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresNetwork}
                    onChange={(e) => setRequiresNetwork(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded accent-primary"
                  />
                  <div>
                    <span className="block text-sm font-medium text-white">Requires Public Internet</span>
                    <span className="block text-xs text-text-muted mt-0.5">
                      Enable if your workload downloads datasets or dependencies at runtime. Disabling this maximizes contributor node security.
                    </span>
                  </div>
                </label>
              </div>
            )}
            </div>
          </motion.div>
        )}

        {(submitState === "uploading" || submitState === "detecting") && (
          <motion.div
            key="detecting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-3xl p-10 max-w-2xl mx-auto w-full"
          >
            <div className="flex flex-col items-center mb-10">
              <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
                <div 
                  className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"
                  style={{ animationDuration: "3s" }}
                />
                <div 
                  className="absolute inset-2 border-4 border-secondary rounded-full border-b-transparent animate-spin"
                  style={{ animationDuration: "2s", animationDirection: "reverse" }}
                />
                <CpuIcon />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {submitState === "uploading" ? "Uploading Files..." : "AI Pipeline Active"}
              </h2>
              <p className="text-text-muted">
                {submitState === "uploading" 
                  ? `${uploadProgress}% complete` 
                  : "Analyzing workload requirements and topology."}
              </p>
            </div>

            <div className="space-y-4">
              {submitState === "uploading" ? (
                <div className="w-full bg-white/5 rounded-full h-2 mb-4 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              ) : (
                <DetectionStream messages={messages} />
              )}
            </div>
          </motion.div>
        )}

        {submitState === "ready" && jobProfile && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <JobProfileCard profile={jobProfile} onLaunch={handleLaunch} onCancel={() => setSubmitState("idle")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CpuIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  );
}

function DetectionStream({ messages }: { messages: any[] }) {
  // Filter for steps
  const steps = messages.filter(m => m.type === "detection_step");
  
  return (
    <div className="bg-background/50 rounded-xl p-6 border border-border font-mono text-sm">
      {steps.length === 0 ? (
        <div className="flex items-center gap-3 text-text-muted">
          <CircleDashed className="animate-spin" size={16} />
          Waiting for pipeline start...
        </div>
      ) : (
        <div className="space-y-4">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3"
            >
              {idx === steps.length - 1 ? (
                <CircleDashed className="animate-spin text-primary mt-0.5 flex-shrink-0" size={16} />
              ) : step.step === "security_scan" ? (
                <Shield className="text-secondary mt-0.5 flex-shrink-0" size={16} />
              ) : step.status === "failed" ? (
                <XCircle className="text-danger mt-0.5 flex-shrink-0" size={16} />
              ) : (
                <CheckCircle2 className="text-success mt-0.5 flex-shrink-0" size={16} />
              )}
              <div>
                <span className={idx === steps.length - 1 ? "text-white" : "text-text-muted"}>
                  {step.detail || step.step}
                </span>
                {step.confidence && (
                  <span className="ml-2 text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    {(step.confidence * 100).toFixed(0)}% Match
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function JobProfileCard({ profile, onLaunch, onCancel }: { profile: any, onLaunch: () => void, onCancel: () => void }) {
  return (
    <div className="glass rounded-3xl p-8 max-w-2xl mx-auto border-t-4 border-t-primary shadow-2xl shadow-primary/10">
      <div className="flex items-center justify-between border-b border-border pb-6 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="text-success" />
            Analysis Complete
          </h2>
          <p className="text-text-muted mt-1">Ready to dispatch to CampuGrid.</p>
        </div>
        <div className="bg-success/10 border border-success/20 px-3 py-1.5 rounded-lg flex flex-col items-center">
          <span className="text-xs font-semibold text-success uppercase tracking-wider">Confidence</span>
          <span className="text-xl font-bold text-success">{(profile.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-6 gap-x-8 mb-8">
        <div>
          <p className="text-sm text-text-muted uppercase tracking-wider mb-1">Workload Type</p>
          <p className="font-semibold text-white text-lg capitalize">{profile.type.replace('_', ' ')}</p>
        </div>
        <div>
          <p className="text-sm text-text-muted uppercase tracking-wider mb-1">Framework</p>
          <p className="font-semibold text-white text-lg capitalize">{profile.framework || "N/A"}</p>
        </div>
        <div>
          <p className="text-sm text-text-muted uppercase tracking-wider mb-1">Entry File</p>
          <div className="flex items-center gap-2 text-white">
            <File size={16} className="text-primary" />
            <span className="font-semibold">{profile.entry_file}</span>
          </div>
        </div>
        <div>
          <p className="text-sm text-text-muted uppercase tracking-wider mb-1">Hardware Required</p>
          <div className="flex gap-2">
            {profile.gpu_required && (
              <span className="bg-secondary/20 text-secondary text-xs font-bold px-2 py-1 rounded">GPU</span>
            )}
            <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded">
              {profile.resources.cpu_cores} Cores
            </span>
            <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded">
              {profile.resources.ram_gb}GB RAM
            </span>
          </div>
        </div>
      </div>

      <div className="bg-background rounded-xl p-6 mb-8 border border-border">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Estimated Cost Comparison</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-muted">AWS p3.2xlarge</span>
            <span className="text-white decoration-red-400/50 line-through">$3.06 / hr</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-muted">Google Colab Pro (T4)</span>
            <span className="text-white decoration-yellow-400/50 line-through">$0.61 / hr</span>
          </div>
          <div className="flex justify-between items-center text-lg font-bold border-t border-white/10 pt-3 mt-3">
            <span className="text-primary">CampuGrid Network</span>
            <span className="text-success">$0.19 / hr</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={onCancel} className="flex-1 py-3 px-4 rounded-xl border border-border bg-white/5 text-white font-medium hover:bg-white/10 transition-colors">
          Cancel
        </button>
        <button onClick={onLaunch} className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold hover:opacity-90 shadow-lg shadow-primary/20 transition-all flex justify-center items-center gap-2">
          🚀 Launch Workload
        </button>
      </div>
    </div>
  );
}

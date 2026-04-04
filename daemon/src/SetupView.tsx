import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CheckCircle2, AlertCircle, Cpu, Loader2 } from "lucide-react";

interface SetupViewProps {
  onComplete: () => void;
}

export default function SetupView({ onComplete }: SetupViewProps) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "detecting" | "registering" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [detectedHw, setDetectedHw] = useState<any>(null);

  const handleSubmit = async () => {
    if (!token.trim()) {
      setError("Connection token is required.");
      return;
    }

    setError("");
    setStatus("detecting");

    try {
      // Step 1: Auto-detect hardware
      const hw: any = await invoke("get_hardware_profile");
      setDetectedHw(hw);

      // Step 2: Auto-register this machine as a node
      setStatus("registering");
      const regResult: any = await invoke("auto_register_node", {
        userToken: token.trim(),
        hwProfile: hw,
      });

      if (!regResult.success) {
        setError(regResult.error || "Node registration failed.");
        setStatus("error");
        return;
      }

      // Step 3: Save credentials
      await invoke("save_credentials", {
        nodeId: regResult.node_id,
        token: regResult.node_token,
      });

      setStatus("success");
      setTimeout(() => onComplete(), 1500);
    } catch (e: any) {
      setError(e?.toString() || "Something went wrong.");
      setStatus("error");
    }
  };

  const statusMessages: Record<string, string> = {
    detecting: "Detecting hardware...",
    registering: "Registering node on the grid...",
    success: "Connected! Starting daemon...",
  };

  return (
    <div className="flex items-center justify-center h-full min-h-[500px] p-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-[#6366f1] to-[#a855f7] flex items-center justify-center shadow-lg shadow-[#6366f1]/30 mb-4">
            <span className="font-bold text-white text-2xl">C</span>
          </div>
          <h1 className="text-2xl font-bold text-white">CampuGrid</h1>
          <p className="text-[#64748b] mt-2 text-sm">
            Sign in to start contributing your compute power.
          </p>
        </div>

        {/* Hardware Auto-Detection Notice */}
        <div className="bg-[#6366f1]/10 border border-[#6366f1]/20 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#6366f1] mb-1 flex items-center gap-2">
            <Cpu size={14} /> Automatic Setup
          </h3>
          <p className="text-xs text-[#64748b]">
            Your GPU, CPU, RAM, and CUDA version will be detected automatically. Just sign in and we handle the rest.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Connection Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the JWT token from your web dashboard"
              className="w-full px-4 py-4 rounded-xl bg-[#0a0a0f] border border-[#1e293b] text-white placeholder:text-[#475569] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] outline-none transition-all font-mono text-sm"
            />
          </div>

          {/* Status Progress */}
          {status !== "idle" && status !== "error" && (
            <div className="flex items-center gap-3 text-sm bg-[#6366f1]/10 border border-[#6366f1]/20 rounded-xl px-4 py-3">
              {status === "success" ? (
                <CheckCircle2 size={16} className="text-green-400" />
              ) : (
                <Loader2 size={16} className="text-[#6366f1] animate-spin" />
              )}
              <span className={status === "success" ? "text-green-400" : "text-[#6366f1]"}>
                {statusMessages[status]}
              </span>
            </div>
          )}

          {/* Detected Hardware Display */}
          {detectedHw && status !== "idle" && (
            <div className="p-3 bg-[#12121a] rounded-xl border border-[#1e293b] text-xs space-y-1">
              <div className="text-[#64748b]">Detected: <span className="text-white font-medium">{detectedHw.gpu_model}</span> • {detectedHw.gpu_vram_gb.toFixed(1)} GB VRAM</div>
              <div className="text-[#64748b]">{detectedHw.cpu_cores} CPU cores • {detectedHw.ram_gb.toFixed(1)} GB RAM • {detectedHw.os}</div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={status === "detecting" || status === "registering" || status === "success"}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-bold hover:opacity-90 shadow-lg shadow-[#6366f1]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "idle" || status === "error"
              ? "Verify & Connect Node"
              : statusMessages[status]
            }
          </button>
        </div>
      </div>
    </div>
  );
}

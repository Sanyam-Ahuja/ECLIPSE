"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import Link from "next/link";
import { Cpu, Plus, RefreshCw, Wifi, WifiOff, Copy, Check } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";

export default function ContributorPage() {
  const { data: session } = useSession();
  const api = new CampuGridAPI(session?.backend_jwt || "");

  const { data: nodes, isLoading, refetch } = useQuery({
    queryKey: ["my-nodes", session?.backend_jwt],
    queryFn: () => api.getMyNodes(),
    enabled: !!session?.backend_jwt,
    refetchInterval: 10000,
  });

  const { data: earnings } = useQuery({
    queryKey: ["earnings", session?.backend_jwt],
    queryFn: () => api.getEarnings(),
    enabled: !!session?.backend_jwt,
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="flex justify-between items-end pb-8 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Contributor Nodes</h1>
          <p className="text-text-muted mt-2 text-lg">
            Manage your machines and track earnings from the CampuGrid network.
          </p>
        </div>
        <Link
          href="/contributor/register"
          className="flex items-center gap-2 bg-primary text-white font-medium py-2.5 px-5 rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
        >
          <Plus size={20} />
          Register Node
        </Link>
      </header>

      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6 relative overflow-hidden group hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-success/10 rounded-full blur-[30px]" />
          <p className="text-text-muted font-medium mb-1">Total Earned</p>
          <h3 className="text-3xl font-bold text-success">${(earnings?.total_earned || 0).toFixed(2)}</h3>
        </div>
        <div className="glass rounded-2xl p-6 relative overflow-hidden group hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-[30px]" />
          <p className="text-text-muted font-medium mb-1">GPU Hours Contributed</p>
          <h3 className="text-3xl font-bold text-primary">{(earnings?.total_gpu_hours || 0).toFixed(1)}</h3>
        </div>
        <div className="glass rounded-2xl p-6 relative overflow-hidden group hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/10 rounded-full blur-[30px]" />
          <p className="text-text-muted font-medium mb-1">Current Rate</p>
          <h3 className="text-3xl font-bold text-secondary">${(earnings?.current_rate_per_hour || 0).toFixed(3)}<span className="text-lg text-text-muted">/hr</span></h3>
        </div>
      </div>

      {/* Nodes List */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Your Nodes</h2>
          <button onClick={() => refetch()} className="text-text-muted hover:text-white transition-colors">
            <RefreshCw size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-text-muted">Loading nodes...</div>
        ) : !nodes || nodes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Cpu size={48} className="text-text-muted mx-auto mb-4" />
            <p className="text-text-muted mb-4">No nodes registered yet.</p>
            <Link href="/contributor/register" className="text-primary hover:underline">
              Register your first node
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {nodes.map((node: any) => (
              <NodeCard key={node.id} node={node} api={api} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NodeCard({ node, api }: { node: any; api: CampuGridAPI }) {
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const isOnline = node.status === "online" || node.status === "busy";

  const handleRegenToken = async () => {
    setLoading(true);
    try {
      const res = await api.regenerateNodeToken(node.id);
      setToken(res.node_token);
      setShowToken(true);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="px-6 py-5 hover:bg-white/5 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={clsx(
            "w-3 h-3 rounded-full",
            isOnline ? "bg-success animate-pulse" : "bg-text-muted"
          )} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{node.hostname}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                {node.gpu_model}
              </span>
            </div>
            <div className="text-sm text-text-muted flex items-center gap-3 mt-1">
              <span>{node.cpu_cores} cores</span>
              <span>•</span>
              <span>{node.ram_gb} GB RAM</span>
              <span>•</span>
              <span>{node.gpu_vram_gb} GB VRAM</span>
              <span>•</span>
              {isOnline ? (
                <span className="flex items-center gap-1 text-success"><Wifi size={12} /> Online</span>
              ) : (
                <span className="flex items-center gap-1"><WifiOff size={12} /> Offline</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-text-muted">Earned</div>
          <div className="font-bold text-success">${node.total_earned.toFixed(2)}</div>
          <div className="text-xs text-text-muted">{node.total_gpu_hours.toFixed(1)} GPU hrs</div>
        </div>
      </div>

      {/* Token Section */}
      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs text-text-muted">Node ID: <code className="bg-white/5 px-1.5 py-0.5 rounded">{node.id.substring(0, 12)}...</code></span>
        <button
          onClick={handleRegenToken}
          disabled={loading}
          className="text-xs text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
        >
          {loading ? "Generating..." : "Get Auth Token"}
        </button>
      </div>

      {showToken && token && (
        <div className="mt-3 p-3 bg-background rounded-xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white">Node JWT Token</span>
            <button onClick={copyToken} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
              {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
          <code className="text-xs text-text-muted break-all block max-h-20 overflow-y-auto">
            {token}
          </code>
          <p className="text-xs text-text-muted mt-2">
            Paste this token into your CampuGrid Tauri app&apos;s setup screen.
          </p>
        </div>
      )}
    </div>
  );
}

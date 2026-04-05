"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import { Users, Server, Cpu, Activity, DollarSign, Clock, AlertTriangle, CheckCircle2, Shield } from "lucide-react";
import { useState } from "react";

export default function AdminPage() {
  const { data: session } = useSession();
  const api = new CampuGridAPI(session?.backend_jwt || "");
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "nodes" | "jobs">("overview");

  const { data: overview, isLoading: loadingOverview, error } = useQuery({
    queryKey: ["admin-overview", session?.backend_jwt],
    queryFn: () => api.getAdminOverview(),
    enabled: !!session?.backend_jwt,
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users", session?.backend_jwt],
    queryFn: () => api.getAdminUsers(1, 50),
    enabled: !!session?.backend_jwt && activeTab === "users",
  });

  const { data: nodesData } = useQuery({
    queryKey: ["admin-nodes", session?.backend_jwt],
    queryFn: () => api.getAdminNodes(1, 50),
    enabled: !!session?.backend_jwt && activeTab === "nodes",
  });

  const { data: jobsData } = useQuery({
    queryKey: ["admin-jobs", session?.backend_jwt],
    queryFn: () => api.getAdminJobs(1, 50),
    enabled: !!session?.backend_jwt && activeTab === "jobs",
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="glass rounded-3xl p-12 text-center max-w-md">
          <Shield size={48} className="text-danger mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-text-muted">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <header className="pb-8 border-b border-border flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={20} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Admin Panel</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Cluster Management</h1>
          <p className="text-text-muted mt-1">Monitor and manage the CampuGrid compute network.</p>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        {(["overview", "users", "nodes", "jobs"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize ${
              activeTab === tab
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-text-muted hover:text-white hover:bg-white/5"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {loadingOverview ? (
            <div className="text-text-muted text-center py-20">Loading cluster data...</div>
          ) : overview ? (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={Users} label="Total Users" value={overview.users.total} sub={`${overview.users.contributors} contributors`} color="primary" />
                <StatCard icon={Server} label="Nodes" value={`${overview.nodes.online} / ${overview.nodes.total}`} sub={`${overview.nodes.offline} offline`} color="success" />
                <StatCard icon={Activity} label="Active Jobs" value={overview.jobs.active} sub={`${overview.jobs.total} total`} color="secondary" />
                <StatCard icon={DollarSign} label="Revenue" value={`$${overview.financials.total_revenue}`} sub={`${overview.financials.total_gpu_hours} GPU hrs`} color="warning" />
              </div>

              {/* Detail Panels */}
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Cpu size={18} className="text-primary" /> Job Pipeline
                  </h3>
                  <div className="space-y-3">
                    <PipelineRow label="Completed" count={overview.jobs.completed} total={overview.jobs.total} color="bg-success" />
                    <PipelineRow label="Active" count={overview.jobs.active} total={overview.jobs.total} color="bg-primary" />
                    <PipelineRow label="Failed" count={overview.jobs.failed} total={overview.jobs.total} color="bg-danger" />
                  </div>
                </div>

                <div className="glass rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-secondary" /> Chunk Processing
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Total Chunks Created</span>
                      <span className="text-white font-bold">{overview.chunks.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Currently Running</span>
                      <span className="text-primary font-bold">{overview.chunks.running}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Node Utilization</span>
                      <span className="text-success font-bold">
                        {overview.nodes.total > 0
                          ? `${Math.round((overview.nodes.online / overview.nodes.total) * 100)}%`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-border text-xs text-text-muted uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Nodes</th>
                <th className="px-6 py-4 font-medium">Jobs</th>
                <th className="px-6 py-4 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usersData?.users?.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-text-muted">No users yet.</td></tr>
              ) : (
                usersData?.users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{u.name}</td>
                    <td className="px-6 py-4 text-text-muted text-sm">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        u.role === "admin" ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" :
                        u.role === "both" ? "text-primary bg-primary/10 border-primary/20" :
                        u.role === "contributor" ? "text-success bg-success/10 border-success/20" :
                        "text-text-muted bg-white/5 border-white/10"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white">{u.nodes_count}</td>
                    <td className="px-6 py-4 text-white">{u.jobs_count}</td>
                    <td className="px-6 py-4 text-white">${u.credit_balance.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Nodes Tab */}
      {activeTab === "nodes" && (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-border text-xs text-text-muted uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Hostname</th>
                <th className="px-6 py-4 font-medium">GPU</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Reliability</th>
                <th className="px-6 py-4 font-medium">GPU Hours</th>
                <th className="px-6 py-4 font-medium">Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {nodesData?.nodes?.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-text-muted">No nodes registered.</td></tr>
              ) : (
                nodesData?.nodes?.map((n: any) => (
                  <tr key={n.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{n.hostname}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="text-white">{n.gpu_model}</span>
                      <span className="text-text-muted ml-1">({n.gpu_vram_gb}GB)</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                        n.status === "online" ? "text-success" : "text-text-muted"
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${n.status === "online" ? "bg-success" : "bg-text-muted"}`} />
                        {n.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white">{(n.reliability_score * 100).toFixed(0)}%</td>
                    <td className="px-6 py-4 text-white">{n.total_gpu_hours.toFixed(1)}</td>
                    <td className="px-6 py-4 text-success">${n.total_earned.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === "jobs" && (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-border text-xs text-text-muted uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Job ID</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Chunks</th>
                <th className="px-6 py-4 font-medium">Cost</th>
                <th className="px-6 py-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobsData?.jobs?.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-text-muted">No jobs submitted yet.</td></tr>
              ) : (
                jobsData?.jobs?.map((j: any) => (
                  <tr key={j.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-white font-mono text-sm">{j.id.substring(0, 8)}...</td>
                    <td className="px-6 py-4">
                      <span className="text-white capitalize">{j.type || "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        j.status === "completed" ? "text-success bg-success/10 border-success/20" :
                        j.status === "running" ? "text-primary bg-primary/10 border-primary/20" :
                        j.status === "failed" ? "text-danger bg-danger/10 border-danger/20" :
                        "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
                      }`}>
                        {j.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white">{j.completed_chunks}/{j.total_chunks}</td>
                    <td className="px-6 py-4 text-white">${j.actual_cost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-text-muted text-sm">
                      {j.created_at ? new Date(j.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  const colorMap: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    secondary: "text-secondary bg-secondary/10",
    warning: "text-yellow-400 bg-yellow-400/10",
  };
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
        <span className="text-text-muted text-sm font-medium">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-xs text-text-muted mt-1">{sub}</p>
    </div>
  );
}

function PipelineRow({ label, count, total, color }: any) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-text-muted">{label}</span>
        <span className="text-white font-semibold">{count}</span>
      </div>
      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

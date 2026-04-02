"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import Link from "next/link";
import { Activity, Clock, Database, Server, Upload } from "lucide-react";
import clsx from "clsx";
import { formatDistanceToNow } from "date-fns";

export default function DashboardPage() {
  const { data: session } = useSession();

  const api = new CampuGridAPI(session?.backend_jwt || "");

  const { data: jobsResponse, isLoading } = useQuery({
    queryKey: ["jobs", session?.backend_jwt],
    queryFn: () => api.getJobs(1, 20),
    enabled: !!session?.backend_jwt,
    refetchInterval: 15000,
  });

  const jobs = jobsResponse?.jobs || [];
  const activeJobs = jobs.filter((j: any) => ["analyzing", "queued", "running", "assembling"].includes(j.status));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="flex justify-between items-end pb-8 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-text-muted mt-2 text-lg">
            Welcome back. You have {activeJobs.length} active jobs running.
          </p>
        </div>
        <Link 
          href="/submit"
          className="flex items-center gap-2 bg-primary text-white font-medium py-2.5 px-5 rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
        >
          <Upload size={20} />
          Submit New Job
        </Link>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Jobs" value={jobsResponse?.total || 0} icon={Database} delay="0" />
        <StatCard title="Active Jobs" value={activeJobs.length} icon={Activity} delay="100" />
        <StatCard title="GPU Hours" value="124.5" icon={Clock} delay="200" />
        <StatCard title="Credits" value="$42.50" icon={Server} delay="300" />
      </div>

      {/* Recent Jobs Table */}
      <div className="glass rounded-2xl overflow-hidden mt-8 animation-delay-400">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-xl font-semibold text-white">Recent Workloads</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border">
                <th className="px-6 py-4 font-medium text-text-muted text-sm uppercase tracking-wider">Job ID / Input</th>
                <th className="px-6 py-4 font-medium text-text-muted text-sm uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 font-medium text-text-muted text-sm uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-medium text-text-muted text-sm uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 font-medium text-text-muted text-sm uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                    Loading your workloads...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-text-muted mb-4">No workloads found.</p>
                    <Link href="/submit" className="text-primary hover:underline">
                      Submit your first job
                    </Link>
                  </td>
                </tr>
              ) : (
                jobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white group-hover:text-primary transition-colors">
                        {job.id.substring(0, 8)}...
                      </div>
                      <div className="text-sm text-text-muted">{job.input_path}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary border border-secondary/20">
                        {job.type || "unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted">
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {job.status === "completed" ? (
                        <Link href={`/results/${job.id}`} className="text-sm font-medium text-primary hover:text-primary/80">
                          View Results
                        </Link>
                      ) : (
                        <Link href={`/monitor/${job.id}`} className="text-sm font-medium text-primary hover:text-primary/80">
                          Monitor Live
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, delay }: any) {
  return (
    <div 
      className="glass rounded-2xl p-6 relative overflow-hidden group 
                 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all duration-300
                 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {/* Decorative gradient blob */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-[30px] group-hover:bg-primary/20 transition-colors" />
      
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-text-muted font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-white">{value}</h3>
        </div>
        <div className="p-3 bg-white/5 rounded-xl border border-white/10 group-hover:border-primary/30 transition-colors">
          <Icon className="text-primary" size={24} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string, label: string }> = {
    analyzing:  { color: "text-blue-400 bg-blue-400/10 border-blue-400/20", label: "Analyzing" },
    queued:     { color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", label: "Queued" },
    running:    { color: "text-primary bg-primary/10 border-primary/20", label: "Running" },
    assembling: { color: "text-purple-400 bg-purple-400/10 border-purple-400/20", label: "Assembling" },
    completed:  { color: "text-success bg-success/10 border-success/20", label: "Completed" },
    failed:     { color: "text-danger bg-danger/10 border-danger/20", label: "Failed" },
    cancelled:  { color: "text-gray-400 bg-gray-400/10 border-gray-400/20", label: "Cancelled" },
  };

  const active = config[status] || { color: "text-text-muted bg-white/5 border-white/10", label: status };

  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", active.color)}>
      {["running", "analyzing", "assembling"].includes(status) && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {active.label}
    </span>
  );
}

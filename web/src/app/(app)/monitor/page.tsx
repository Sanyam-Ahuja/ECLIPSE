"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import Link from "next/link";
import { Activity } from "lucide-react";

export default function MonitorIndexPage() {
  const { data: session } = useSession();
  const api = new CampuGridAPI(session?.backend_jwt || "");

  const { data: jobsResponse, isLoading } = useQuery({
    queryKey: ["jobs", session?.backend_jwt],
    queryFn: () => api.getJobs(1, 100),
    enabled: !!session?.backend_jwt,
  });

  const jobs = jobsResponse?.jobs || [];
  const activeJobs = jobs.filter((j: any) => ["analyzing", "queued", "running", "assembling"].includes(j.status));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-4xl mx-auto">
      <header className="pb-8 border-b border-border">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Activity className="text-primary" /> Active Workloads
        </h1>
        <p className="text-text-muted mt-2 text-lg">
          Select a workload below to monitor its live telemetry and cluster distribution.
        </p>
      </header>

      <div className="glass rounded-2xl overflow-hidden mt-8">
        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="px-6 py-12 text-center text-text-muted">Loading your workloads...</div>
          ) : activeJobs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-text-muted mb-4">You have no active workloads.</p>
              <Link href="/submit" className="text-primary hover:underline">Submit a new job</Link>
            </div>
          ) : (
            activeJobs.map((job: any) => (
              <div key={job.id} className="px-6 py-5 hover:bg-white/5 transition-colors flex justify-between items-center group">
                <div>
                  <div className="font-medium text-white mb-1 group-hover:text-primary transition-colors">
                    Job: {job.id.substring(0, 8)}...
                  </div>
                  <div className="text-sm text-text-muted">{job.input_path}</div>
                </div>
                <Link href={`/monitor/${job.id}`} className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-medium hover:bg-primary hover:text-white transition-colors">
                  View Live Stats
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import { CreditCard, Download, ArrowRight, Receipt } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function BillingPage() {
  const { data: session } = useSession();
  const api = new CampuGridAPI(session?.backend_jwt || "");

  const { data: earnings } = useQuery({
    queryKey: ["billing-earnings", session?.backend_jwt],
    queryFn: () => api.getEarnings(),
    enabled: !!session?.backend_jwt,
  });

  const { data: historyData, isLoading } = useQuery({
    queryKey: ["billing-history", session?.backend_jwt],
    queryFn: () => api.getBillingHistory(1, 20),
    enabled: !!session?.backend_jwt,
  });

  const records = historyData?.records || [];
  const totalSpent = records
    .filter((r: any) => r.role === "customer")
    .reduce((sum: number, r: any) => sum + r.customer_charge, 0);
  const totalEarned = records
    .filter((r: any) => r.role === "contributor")
    .reduce((sum: number, r: any) => sum + r.contributor_credit, 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <header className="pb-8 border-b border-border">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Billing & Usage</h1>
        <p className="text-text-muted text-lg">
          View your spending, earnings, and transaction history.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          {/* Balance Card */}
          <div className="glass rounded-3xl p-8 border-t-4 border-t-primary shadow-[0_0_30px_rgba(99,102,241,0.1)] relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-[40px] pointer-events-none" />
            <h2 className="text-text-muted font-medium uppercase tracking-wider text-sm mb-2 relative z-10">
              Total Spent
            </h2>
            <div className="flex items-baseline gap-2 mb-4 relative z-10">
              <span className="text-5xl font-bold text-white">${totalSpent.toFixed(2)}</span>
            </div>
            {earnings && (
              <div className="relative z-10 text-sm text-text-muted">
                <span className="text-success font-medium">${(earnings.total_earned || 0).toFixed(2)}</span> earned as contributor
              </div>
            )}
          </div>

          {/* Contributor CTA */}
          <div className="glass rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent group-hover:from-secondary/20 transition-colors" />
            <div className="relative z-10">
              <h2 className="text-xl font-bold text-white mb-2">Have idle hardware?</h2>
              <p className="text-text-muted text-sm mb-6">
                Download the CampuGrid contributor app to earn credits by renting your idle GPU.
              </p>
              <Link href="/contributor" className="flex items-center gap-2 text-secondary font-bold hover:gap-3 transition-all">
                Earn Credits <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="lg:col-span-2">
          <div className="glass rounded-3xl p-8 h-full">
            <h2 className="text-xl font-semibold text-white mb-6">Usage Summary</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-text-muted text-sm mb-1">Total GPU Hours Used</p>
                <p className="text-3xl font-bold text-white">{(earnings?.total_gpu_hours || 0).toFixed(1)}</p>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-text-muted text-sm mb-1">Transactions</p>
                <p className="text-3xl font-bold text-white">{historyData?.total || 0}</p>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-text-muted text-sm mb-1">Nodes Registered</p>
                <p className="text-3xl font-bold text-white">{earnings?.nodes?.length || 0}</p>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-text-muted text-sm mb-1">Earning Rate</p>
                <p className="text-3xl font-bold text-success">
                  ${(earnings?.current_rate_per_hour || 0).toFixed(3)}<span className="text-lg text-text-muted">/hr</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real Transaction History */}
      <div className="glass rounded-3xl p-8 mt-8">
        <h2 className="text-xl font-semibold text-white mb-6">Transaction History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border text-sm text-text-muted uppercase tracking-wider">
                <th className="px-6 py-4 font-medium rounded-tl-xl">Date</th>
                <th className="px-6 py-4 font-medium">Job</th>
                <th className="px-6 py-4 font-medium">GPU Hours</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium text-right rounded-tr-xl">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                    Loading transactions...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Receipt size={48} className="text-text-muted mx-auto mb-4" />
                    <p className="text-text-muted mb-4">No transactions yet.</p>
                    <Link href="/submit" className="text-primary hover:underline">
                      Submit your first job to get started
                    </Link>
                  </td>
                </tr>
              ) : (
                records.map((record: any) => (
                  <tr key={record.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-text-muted text-sm">
                      {formatDistanceToNow(new Date(record.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">{record.job_id.substring(0, 8)}...</span>
                    </td>
                    <td className="px-6 py-4 text-white text-sm">
                      {record.gpu_hours.toFixed(2)} hrs
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        record.role === "contributor"
                          ? "text-success bg-success/10 border-success/20"
                          : "text-primary bg-primary/10 border-primary/20"
                      }`}>
                        {record.role === "contributor" ? "Earned" : "Spent"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {record.role === "contributor" ? (
                        <span className="text-success">+${record.contributor_credit.toFixed(2)}</span>
                      ) : (
                        <span className="text-white">-${record.customer_charge.toFixed(2)}</span>
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

"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import { CreditCard, Download, Plus, TrendingDown, TrendingUp, Wallet, X, Copy, CheckCircle, Receipt, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

export default function BillingPage() {
  const { data: session } = useSession();
  const api = new CampuGridAPI(session?.backend_jwt || "");
  const [showBankModal, setShowBankModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

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
    <div className="p-8 relative min-h-screen">
      {/* 3D Background Graphics */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          className="absolute top-36 right-28 w-50 h-50 border-2 border-emerald-500/35 rounded-full shadow-lg shadow-emerald-500/20"
          animate={{ rotateY: [0, 360], scale: [1, 1.14, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
        <motion.div
          className="absolute bottom-36 right-64 w-42 h-42 border-2 border-emerald-500/28"
          animate={{ rotateY: [0, 360], y: [-12, 12, -12] }}
          transition={{ rotateY: { duration: 19, repeat: Infinity, ease: "linear" }, y: { duration: 5.5, repeat: Infinity, ease: "easeInOut" } }}
          style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Billing & Usage</h1>
          <p className="text-slate-400">Manage your balance, payments, and transaction history.</p>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 rounded-2xl p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Available Balance</span>
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="text-4xl font-black text-white mb-2">₹{(totalEarned - totalSpent).toFixed(2)}</div>
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Ready for workloads</p>
        </motion.div>

        <motion.div
          className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-2xl p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Spent</span>
            <div className="p-2 rounded-lg bg-red-500/20">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
          </div>
          <div className="text-4xl font-black text-white mb-2">₹{totalSpent.toFixed(2)}</div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Lifetime Usage</p>
        </motion.div>

        <motion.div
          className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-2xl p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Earned</span>
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="text-4xl font-black text-white mb-2">₹{totalEarned.toFixed(2)}</div>
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Contributor Credit</p>
        </motion.div>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
         {/* Usage Summary Stats */}
         <div className="lg:col-span-2 bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-widest text-[10px]">Earning Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
               <SummaryStat label="GPU Hours" value={(earnings?.total_gpu_hours || 0).toFixed(1)} />
               <SummaryStat label="Transactions" value={historyData?.total || 0} />
               <SummaryStat label="Nodes" value={earnings?.nodes?.length || 0} />
               <SummaryStat label="Current Rate" value={`₹${(earnings?.current_rate_per_hour || 0).toFixed(2)}/h`} highlight />
            </div>
         </div>

         {/* Contributor Card */}
         <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 rounded-3xl p-8 flex flex-col justify-between">
            <div>
               <h3 className="text-xl font-bold text-white mb-2">Passive Income?</h3>
               <p className="text-slate-400 text-sm mb-6">Rent your idle GPU to the grid and earn credits automatically.</p>
            </div>
            <Link href="/contributor" className="flex items-center justify-between text-emerald-400 font-black uppercase tracking-widest text-[10px] group">
               Become a Contributor <ArrowRight size={18} className="translate-x-0 group-hover:translate-x-2 transition-transform" />
            </Link>
         </div>
      </div>

      {/* Transaction History */}
      <motion.div
        className="relative z-10 bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-3xl p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-white uppercase tracking-widest text-[10px]">Transaction History</h2>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-800 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:text-emerald-400 transition-colors">
            <Download size={14} />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                <th className="pb-4">DATE</th>
                <th className="pb-4">WORKLOAD ID</th>
                <th className="pb-4">ROLE</th>
                <th className="pb-4">GPU TIME</th>
                <th className="pb-4 text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="py-10 text-center text-slate-600 animate-pulse font-mono uppercase text-xs">Decrypting Ledger...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-slate-600">No transactions found.</td></tr>
              ) : (
                records.map((record: any, index: number) => (
                  <motion.tr
                    key={record.id}
                    className="border-b border-slate-800/50 hover:bg-white/5 transition-colors group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td className="py-5 text-slate-400 text-xs">
                       {formatDistanceToNow(new Date(record.created_at), { addSuffix: true })}
                    </td>
                    <td className="py-5 text-white font-mono text-xs">
                       {record.job_id.substring(0, 12)}...
                    </td>
                    <td className="py-5">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                          record.role === "contributor" ? "text-emerald-400 border-emerald-400/20 bg-emerald-500/10" : "text-emerald-400 border-emerald-400/20 bg-emerald-500/10"
                       }`}>
                          {record.role}
                       </span>
                    </td>
                    <td className="py-5 text-slate-300 text-xs font-bold">
                       {record.gpu_hours.toFixed(2)} hrs
                    </td>
                    <td className={`py-5 text-right font-black ${record.role === "contributor" ? "text-emerald-400" : "text-white"}`}>
                       {record.role === "contributor" ? "+" : "-"}₹{Math.abs(record.role === "contributor" ? record.contributor_credit : record.customer_charge).toFixed(2)}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function SummaryStat({ label, value, highlight }: any) {
  return (
    <div className="p-6 bg-slate-800/30 border border-slate-800 rounded-2xl">
       <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</div>
       <div className={`text-2xl font-black ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}

function BankField({ label, value, onCopy, copied, isMono }: any) {
  return (
    <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl flex items-center justify-between group">
       <div>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{label}</div>
          <div className={`text-white font-bold ${isMono ? 'font-mono' : ''}`}>{value}</div>
       </div>
       <button onClick={onCopy} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
          {copied ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-500 group-hover:text-emerald-400" />}
       </button>
    </div>
  );
}

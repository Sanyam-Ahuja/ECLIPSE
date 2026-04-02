"use client";

import { useSession } from "next-auth/react";
import { CreditCard, Download, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: 'Mon', spend: 4.2 },
  { name: 'Tue', spend: 1.5 },
  { name: 'Wed', spend: 8.7 },
  { name: 'Thu', spend: 3.2 },
  { name: 'Fri', spend: 12.4 },
  { name: 'Sat', spend: 0.8 },
  { name: 'Sun', spend: 2.1 },
];

export default function BillingPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <header className="pb-8 border-b border-border">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Billing & Usage</h1>
        <p className="text-text-muted text-lg">
          Manage your credits, view past invoices, and monitor your usage.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <div className="glass rounded-3xl p-8 border-t-4 border-t-primary shadow-[0_0_30px_rgba(99,102,241,0.1)] relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-[40px] pointer-events-none" />
            <h2 className="text-text-muted font-medium uppercase tracking-wider text-sm mb-2 relative z-10">
              Available Credits
            </h2>
            <div className="flex items-baseline gap-2 mb-6 relative z-10">
              <span className="text-5xl font-bold text-white">$42.50</span>
            </div>
            <button className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-colors flex justify-center items-center gap-2 relative z-10">
              <CreditCard size={18} />
              Add Credits
            </button>
            <p className="text-xs text-text-muted mt-4 text-center relative z-10">
              Credits auto-refill when below $10.00
            </p>
          </div>

          <div className="glass rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent group-hover:from-secondary/20 transition-colors" />
            <div className="relative z-10">
              <h2 className="text-xl font-bold text-white mb-2">Have idle hardware?</h2>
              <p className="text-text-muted text-sm mb-6">
                Download the CampuGrid contributor app to earn credits by renting your idle GPU.
              </p>
              <button className="flex items-center gap-2 text-secondary font-bold hover:gap-3 transition-all">
                Earn Credits <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="glass rounded-3xl p-8 h-full">
            <h2 className="text-xl font-semibold text-white mb-6">Usage Last 7 Days</h2>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    tickFormatter={(value) => `$${value}`} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#ffffff05' }}
                    contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    formatter={(value) => [`$${value}`, "Spent"]}
                  />
                  <Bar 
                    dataKey="spend" 
                    fill="#6366f1" 
                    radius={[6, 6, 0, 0]} 
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl p-8 mt-8">
        <h2 className="text-xl font-semibold text-white mb-6">Recent Transactions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border text-sm text-text-muted uppercase tracking-wider">
                <th className="px-6 py-4 font-medium rounded-tl-xl">Date</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium text-right rounded-tr-xl">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-text-muted text-sm">Apr 01, 2026</td>
                <td className="px-6 py-4 text-white">Credit recharge via Stripe</td>
                <td className="px-6 py-4 text-success font-medium">+$20.00</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-primary hover:text-white transition-colors p-2"><Download size={18} /></button>
                </td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-text-muted text-sm">Mar 28, 2026</td>
                <td className="px-6 py-4 flex flex-col gap-1">
                  <span className="text-white">Render Job - blender_scene.blend</span>
                  <span className="text-text-muted text-xs">2.4 GPU hrs (RTX 4060)</span>
                </td>
                <td className="px-6 py-4 text-white font-medium">-$1.46</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-primary hover:text-white transition-colors p-2"><Download size={18} /></button>
                </td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-text-muted text-sm">Mar 25, 2026</td>
                <td className="px-6 py-4 flex flex-col gap-1">
                  <span className="text-white">ML Training - Local SGD (ResNet50)</span>
                  <span className="text-text-muted text-xs">12.1 GPU hrs (RTX 3090 x4)</span>
                </td>
                <td className="px-6 py-4 text-white font-medium">-$5.32</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-primary hover:text-white transition-colors p-2"><Download size={18} /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Upload, 
  Activity, 
  BarChart3, 
  CreditCard, 
  Trophy, 
  LogOut,
  ChevronRight,
  Zap,
  FileText,
  Users,
  Shield
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [role, setRole] = useState("customer");

  useEffect(() => {
    if (session?.backend_jwt) {
      try {
        const payload = JSON.parse(atob((session.backend_jwt as string).split('.')[1]));
        setRole(payload.role || "customer");
      } catch (e) {
        console.error("Failed to decode JWT", e);
      }
    }
  }, [session]);

  const allNavItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["customer", "both", "admin"] },
    { name: "Submit Job", href: "/submit", icon: Upload, roles: ["customer", "both", "admin"] },
    { name: "Monitor", href: "/monitor", icon: Activity, roles: ["customer", "both", "admin"] },
    { name: "Results", href: "/results", icon: FileText, roles: ["customer", "both", "admin"] },
    { name: "Billing", href: "/billing", icon: CreditCard, roles: ["customer", "contributor", "both", "admin"] },
    { name: "Contributor", href: "/contributor", icon: Users, roles: ["contributor", "both", "admin"] },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy, roles: ["contributor", "both", "admin"] },
    { name: "Admin", href: "/admin", icon: Shield, roles: ["admin"] },
  ];

  const navItems = allNavItems.filter((item) => item.roles.includes(role));

  return (
    <div className="w-64 bg-slate-950 border-r border-slate-900 flex flex-col relative z-20 overflow-hidden">
      {/* Glossy accent at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      
      {/* Branding */}
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 transform rotate-3 hover:rotate-0 transition-transform duration-300">
          <Zap className="text-white w-6 h-6" fill="currentColor" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">CampuGrid</h1>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Network Live</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1.5 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div className={`
                relative group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                ${isActive 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"}
              `}>
                {isActive && (
                   <motion.div 
                     layoutId="active-pill"
                     className="absolute left-0 w-1 h-6 bg-emerald-500 rounded-r-full"
                   />
                )}
                <item.icon size={20} className={isActive ? "text-emerald-400" : "group-hover:text-white"} />
                <span className="font-medium text-sm">{item.name}</span>
                {isActive && <ChevronRight size={14} className="ml-auto opacity-50" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Area */}
      <div className="p-4 mt-auto">
        {session?.user && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 shadow-xl">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold border-2 border-slate-800">
                  {session.user.name?.[0] || session.user.email?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{session.user.name || "User"}</p>
                  <p className="text-[10px] text-slate-500 truncate">{session.user.email}</p>
                </div>
             </div>
             
             <button
                onClick={() => signOut()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all border border-slate-800"
              >
                <LogOut size={14} />
                Sign Out
              </button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { 
  LayoutDashboard, 
  UploadCloud, 
  Activity, 
  FolderDown, 
  CreditCard,
  Cpu,
  Trophy,
  Shield,
  LogOut
} from "lucide-react";
import clsx from "clsx";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

function BackendStatus() {
  const [status, setStatus] = useState<"checking" | "connected" | "error">("checking");
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    // Strip /api/v1 from the end if present, since /health is usually at the root
    let baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    
    // Force HTTPS for production
    if (baseUrl.includes("sslip.io") || baseUrl.includes("34.100.183.146")) {
      baseUrl = baseUrl.replace("http://", "https://");
    }

    const healthUrl = baseUrl.replace(/\/api\/v1\/?$/, "") + "/health";
    setUrl(healthUrl);

    fetch(healthUrl)
      .then(res => {
        if (res.ok) setStatus("connected");
        else setStatus("error");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
      <div className={clsx(
        "w-2 h-2 rounded-full",
        status === "checking" ? "bg-yellow-400 animate-pulse" :
        status === "connected" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" :
        "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
      )} />
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-white/80">API Status</span>
        <span className="text-[10px] text-white/50 truncate max-w-[150px]" title={url}>
          {status === "checking" ? "Checking..." : status === "connected" ? "Connected" : "Disconnected"}
        </span>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  let role = "customer";
  if (session?.backend_jwt) {
    try {
      // Decode the JWT payload to find the role
      const payload = JSON.parse(atob((session.backend_jwt as string).split('.')[1]));
      role = payload.role;
    } catch (e) {
      // Default to customer on parsing error
    }
  }

  const allNavItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["customer", "both", "admin"] },
    { name: "Submit Job", href: "/submit", icon: UploadCloud, roles: ["customer", "both", "admin"] },
    { name: "Monitor", href: "/monitor", icon: Activity, roles: ["customer", "both", "admin"] },
    { name: "Results", href: "/results", icon: FolderDown, roles: ["customer", "both", "admin"] },
    { name: "Billing", href: "/billing", icon: CreditCard, roles: ["customer", "contributor", "both", "admin"] },
    { name: "Contributor", href: "/contributor", icon: Cpu, roles: ["contributor", "both", "admin"] },
    { name: "Leaderboard", href: "/contributor/leaderboard", icon: Trophy, roles: ["contributor", "both", "admin"] },
    { name: "Admin", href: "/admin", icon: Shield, roles: ["admin"] },
  ];

  const navItems = allNavItems.filter((item) => item.roles.includes(role));

  return (
    <div className="w-64 flex-shrink-0 h-screen sticky top-0 bg-surface/50 border-r border-border flex flex-col p-4 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-3 py-4 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center">
          <span className="font-bold text-white leading-none">C</span>
        </div>
        <span className="text-xl font-semibold tracking-tight text-white">CampuGrid</span>
      </div>
      
      <div className="mb-6">
        <BackendStatus />
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-primary/10 text-primary shadow-[inset_0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-primary/20" 
                  : "text-text-muted hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon 
                size={20} 
                className={clsx(
                  "transition-colors",
                  isActive ? "text-primary" : "text-text-muted group-hover:text-white"
                )} 
              />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 border-t border-border pt-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium text-sm">Sign out</span>
        </button>
      </div>
    </div>
  );
}

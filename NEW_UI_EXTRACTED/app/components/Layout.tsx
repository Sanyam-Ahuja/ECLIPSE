import { Outlet, NavLink, Link } from "react-router";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Upload,
  Activity,
  FileText,
  CreditCard,
  Users,
  Trophy,
  LogOut,
  Network
} from "lucide-react";

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-900 relative overflow-hidden">
      {/* 3D Background Graphics */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Grid pattern */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34, 211, 238, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 211, 238, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
            transform: "perspective(500px) rotateX(60deg)",
            transformOrigin: "center center",
          }}
          animate={{
            backgroundPosition: ["0px 0px", "50px 50px"],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Sidebar */}
      <aside className="w-64 bg-slate-950/80 backdrop-blur-xl border-r border-cyan-500/10 p-6 relative z-10">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-10 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/50">
            <Network className="w-6 h-6 text-white" />
          </div>
          <span className="text-white font-semibold text-xl">campusgrid</span>
        </Link>

        {/* Navigation */}
        <nav className="space-y-2">
          <NavItem to="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
          <NavItem to="/dashboard/submit-job" icon={<Upload className="w-5 h-5" />} label="Submit Job" />
          <NavItem to="/dashboard/monitor" icon={<Activity className="w-5 h-5" />} label="Monitor" />
          <NavItem to="/dashboard/results" icon={<FileText className="w-5 h-5" />} label="Results" />
          <NavItem to="/dashboard/billing" icon={<CreditCard className="w-5 h-5" />} label="Billing" />
          <NavItem to="/dashboard/contributor" icon={<Users className="w-5 h-5" />} label="Contributor" />
          <NavItem to="/dashboard/leaderboard" icon={<Trophy className="w-5 h-5" />} label="Leaderboard" />
        </nav>

        {/* Sign out */}
        <button className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors mt-auto absolute bottom-6">
          <LogOut className="w-5 h-5" />
          <span>Sign out</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/dashboard"}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
          isActive
            ? "bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/20"
            : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

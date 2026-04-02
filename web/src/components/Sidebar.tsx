import Link from "next/link";
import { 
  LayoutDashboard, 
  UploadCloud, 
  Activity, 
  FolderDown, 
  CreditCard,
  LogOut
} from "lucide-react";
import clsx from "clsx";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Submit Job", href: "/submit", icon: UploadCloud },
    { name: "Monitor", href: "/monitor", icon: Activity },
    { name: "Results", href: "/results", icon: FolderDown },
    { name: "Billing", href: "/billing", icon: CreditCard },
  ];

  return (
    <div className="w-64 flex-shrink-0 h-screen sticky top-0 bg-surface/50 border-r border-border flex flex-col p-4 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-3 py-4 mb-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center">
          <span className="font-bold text-white leading-none">C</span>
        </div>
        <span className="text-xl font-semibold tracking-tight text-white">CampuGrid</span>
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

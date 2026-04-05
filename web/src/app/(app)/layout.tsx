"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { motion } from "motion/react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-500">Loading...</div>;
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 relative overflow-hidden">
      {/* 3D Background Graphics */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Grid pattern */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(rgba(16, 185, 129, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(16, 185, 129, 0.05) 1px, transparent 1px)
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

      <Sidebar />
      
      <main className="flex-1 relative z-10 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-background relative selection:bg-primary/30">
      {/* Background glow effects */}
      <div className="absolute top-0 flex w-full justify-center pointer-events-none opacity-40">
        <div className="left-0 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="right-0 h-[400px] w-[400px] rounded-full bg-secondary/10 blur-[100px]" />
      </div>

      <Sidebar />
      
      <main className="flex-1 min-w-0 flex flex-col relative z-10 px-8 py-8 xl:px-12 h-screen overflow-y-auto">
        <div className="max-w-6xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

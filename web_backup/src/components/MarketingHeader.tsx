import Link from "next/link";

export function MarketingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 glass-light border-b-0 backdrop-blur-3xl bg-background/50">
      <Link href="/" className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
          <span className="font-bold text-white leading-none">C</span>
        </div>
        <span className="text-xl font-bold tracking-tight text-white">CampuGrid</span>
      </Link>
      
      <nav className="hidden md:flex items-center gap-8">
        <Link href="/" className="text-sm font-medium text-text-muted hover:text-white transition-colors">Platform</Link>
        <Link href="/pricing" className="text-sm font-medium text-text-muted hover:text-white transition-colors">Pricing</Link>
        <Link href="/docs" className="text-sm font-medium text-text-muted hover:text-white transition-colors">Documentation</Link>
      </nav>

      <div className="flex items-center gap-4">
        <Link href="/login" className="text-sm font-medium text-text-muted hover:text-white transition-colors">
          Sign In
        </Link>
        <Link href="/login" className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          Start Computing
        </Link>
      </div>
    </header>
  );
}

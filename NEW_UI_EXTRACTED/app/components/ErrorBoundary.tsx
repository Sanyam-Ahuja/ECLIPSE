import { useRouteError, Link } from "react-router";

export default function ErrorBoundary() {
  const error = useRouteError() as Error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-900 flex items-center justify-center p-8">
      <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-8 max-w-md text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Oops!</h1>
        <p className="text-slate-400 mb-6">Something went wrong.</p>
        {error && (
          <p className="text-red-400 text-sm mb-6 font-mono">
            {error.message || "Unknown error"}
          </p>
        )}
        <Link to="/">
          <button className="px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-400 transition-colors">
            Go Home
          </button>
        </Link>
      </div>
    </div>
  );
}

"use client";

import { signIn } from "next-auth/react";
import { Cpu } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-secondary/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 glass rounded-3xl p-10 max-w-md w-full mx-4 shadow-2xl flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
          <Cpu size={32} className="text-white" />
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome Back</h1>
        <p className="text-text-muted text-center mb-8">
          Sign in to access the CampuGrid distributed compute marketplace.
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-3 px-6 rounded-xl hover:bg-gray-100 transition-colors shadow-xl"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="mt-8 text-sm text-text-muted text-center max-w-[280px]">
          By continuing, you agree to CampuGrid's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

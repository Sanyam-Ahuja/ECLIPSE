"use client";

import { ArrowLeft, Download, Monitor } from "lucide-react";
import Link from "next/link";

export default function RegisterNodePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="pb-8 border-b border-border">
        <Link href="/contributor" className="flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-4 text-sm">
          <ArrowLeft size={16} /> Back to Contributor Dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-white">Register a Node</h1>
        <p className="text-text-muted mt-2 text-lg">
          To contribute compute power, download and install the CampuGrid desktop app.
        </p>
      </header>

      <div className="glass rounded-3xl p-10 text-center space-y-8">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center">
          <Monitor className="text-primary" size={40} />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-white">CampuGrid Desktop App</h2>
          <p className="text-text-muted max-w-md mx-auto">
            The desktop app automatically detects your GPU, CPU, RAM, and CUDA version — no manual setup needed. Just sign in and your machine joins the grid.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="glass p-6 rounded-2xl border border-white/10">
            <div className="text-2xl mb-3">1️⃣</div>
            <h3 className="font-semibold text-white mb-1">Download & Install</h3>
            <p className="text-sm text-text-muted">Available for Linux (.AppImage, .deb) and Windows (.msi).</p>
          </div>
          <div className="glass p-6 rounded-2xl border border-white/10">
            <div className="text-2xl mb-3">2️⃣</div>
            <h3 className="font-semibold text-white mb-1">Sign In</h3>
            <p className="text-sm text-text-muted">Use the same email and password from your CampuGrid account.</p>
          </div>
          <div className="glass p-6 rounded-2xl border border-white/10">
            <div className="text-2xl mb-3">3️⃣</div>
            <h3 className="font-semibold text-white mb-1">Start Earning</h3>
            <p className="text-sm text-text-muted">Hardware is detected automatically. Hit the power button and you&apos;re contributing.</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 pt-4">
          <a
            href="https://github.com/campugrid/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-gradient-to-r from-primary to-secondary text-white font-bold py-3.5 px-8 rounded-xl hover:opacity-90 shadow-lg shadow-primary/20 transition-all"
          >
            <Download size={20} />
            Download for Linux / Windows
          </a>
          <p className="text-xs text-text-muted">v0.1.0 • ~60 MB • Requires Docker</p>
        </div>
      </div>
    </div>
  );
}

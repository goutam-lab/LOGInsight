"use client";

import { createBrowserClient } from '@supabase/ssr';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      // Refresh to ensure Middleware picks up the new session
      router.refresh();
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      <form 
        onSubmit={handleLogin} 
        className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-slate-800/60 space-y-6 relative z-10"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-2 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
            <span className="text-white font-bold text-xl font-mono">L</span>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h2>
          <p className="text-slate-400 text-sm">Log in to access your analysis dashboard.</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Email</label>
            <input 
              type="email" 
              placeholder="admin@dev.io" 
              required
              className="w-full mt-1 p-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl text-white placeholder:text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
              <Link href="#" className="text-[10px] text-blue-500 hover:text-blue-400 uppercase font-bold tracking-tighter">Forgot?</Link>
            </div>
            <input 
              type="password" 
              placeholder="••••••••" 
              required
              className="w-full mt-1 p-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl text-white placeholder:text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Sign In
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>

        <div className="pt-4 border-t border-slate-800/50 text-center">
          <p className="text-sm text-slate-500">
            Don't have an account?{" "}
            <Link href="/signup" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
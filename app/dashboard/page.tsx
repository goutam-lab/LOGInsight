"use client";

import { useEffect, useState, useMemo } from "react";
// Import createBrowserClient for Next.js SSR compatibility
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, Shield, LogOut, Copy, Check, 
  History, BarChart3, Terminal as Console, Users, Loader2
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from "recharts";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "completed" | "error">("idle");
  
  const router = useRouter();
  
  // Initialize the browser-specific Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/login");
      else {
        setUser(user);
        fetchHistory(user.id);
      }
    };
    init();
  }, []);

  // Polling logic to check for the worker's result in Supabase
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === "processing" && fileName && user) {
      interval = setInterval(async () => {
        try {
          // Use maybeSingle() to avoid 406 errors if the record doesn't exist yet
          const { data, error } = await supabase
            .from("analysis_history")
            .select("*")
            .eq("file_name", fileName)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error("Polling error:", error.message);
            return;
          }

          if (data && data.analysis_content) {
            setAnalysis(data.analysis_content);
            setStatus("completed");
            setLoading(false);
            fetchHistory(user.id);
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Unexpected polling error:", err);
        }
      }, 3000); // Poll every 3 seconds
    }

    return () => clearInterval(interval);
  }, [status, fileName, user]);

  const fetchHistory = async (userId: string) => {
    const { data } = await supabase
      .from("analysis_history")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setHistory(data);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setFileName(file.name);
    setLoading(true);
    setStatus("processing");
    setAnalysis(""); 

    const content = await file.text();

    try {
      // Send data to the ingest API for background processing
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          log_content: content,
          metadata: {
            fileName: file.name,
            userId: user.id
          }
        })
      });

      if (!response.ok) throw new Error("Ingestion failed");
      
      const data = await response.json();
      console.log("Job queued successfully:", data.jobId);
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("error");
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    return [
      { name: 'Critical', value: (analysis.match(/critical/gi) || []).length },
      { name: 'Error', value: (analysis.match(/error/gi) || []).length },
      { name: 'Warning', value: (analysis.match(/warning/gi) || []).length },
      { name: 'Info', value: (analysis.match(/info/gi) || []).length },
    ].filter(d => d.value > 0);
  }, [analysis]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 flex flex-col font-sans">
      <nav className="border-b border-slate-800 bg-[#020617]/80 backdrop-blur-md px-6 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">L</div>
            <span className="text-xl font-bold tracking-tighter text-white">LogInsight</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1 text-blue-400"><Shield size={14}/> Personal Workspace</span>
            <span className="flex items-center gap-1 hover:text-slate-300 cursor-pointer"><Users size={14}/> Team</span>
          </div>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
          <LogOut size={20} />
        </button>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 border-r border-slate-800 bg-slate-950/50 p-6 hidden lg:block overflow-y-auto">
          <div className="flex items-center gap-2 mb-6 text-slate-400">
            <History size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Past Scans</span>
          </div>
          <div className="space-y-3">
            {history.length === 0 && <p className="text-xs text-slate-600 italic">No previous scans found.</p>}
            {history.map((item) => (
              <button 
                key={item.id}
                onClick={() => { setAnalysis(item.analysis_content); setFileName(item.file_name); setStatus("completed"); }}
                className="w-full text-left p-4 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-blue-500/50 transition-all group"
              >
                <p className="text-sm font-semibold text-slate-200 truncate">{item.file_name}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">{new Date(item.created_at).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-slate-900/40 border border-slate-800 p-10 rounded-[2.5rem] text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-blue-600/10 blur-[100px]" />
              <h1 className="text-3xl font-bold text-white mb-2">System Diagnostic</h1>
              <p className="text-slate-500 mb-8">Upload infrastructure logs for background AI analysis.</p>
              
              <div className="relative inline-block">
                <input type="file" onChange={handleUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={loading} />
                <button className={`px-10 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all ${loading ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20'}`}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload size={20} />}
                  {status === "processing" ? "Processing in Background..." : "Deploy Hunter-Alpha"}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {analysis && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  {chartData.length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6">
                      <div className="flex items-center gap-2 mb-6">
                        <BarChart3 size={18} className="text-blue-400" />
                        <span className="text-sm font-bold text-white">Severity Distribution</span>
                      </div>
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                              itemStyle={{ color: '#f8fafc' }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.name === 'Critical' ? '#ef4444' : '#3b82f6'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="bg-slate-900/50 px-6 py-4 flex items-center justify-between border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Console size={14} className="text-blue-400" />
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Analysis Engine Output</span>
                      </div>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(analysis); setCopied(true); setTimeout(()=>setCopied(false), 2000); }} 
                        className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors"
                      >
                        {copied ? <><Check size={14} className="text-emerald-400" /> Copied</> : <><Copy size={14} /> Copy All</>}
                      </button>
                    </div>
                    <div className="p-8 font-mono text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
                      {analysis}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
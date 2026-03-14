"use client";

import { useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, Terminal, Shield, LogOut, Copy, Check, 
  History, BarChart3, Terminal as Console, Users 
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
  
  const router = useRouter();
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

  const fetchHistory = async (userId: string) => {
    // Team Workspace: Fetches scans for the user's ID or their organization_id
    const { data } = await supabase
      .from("analysis_history")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setHistory(data);
  };

  const saveAnalysis = async (name: string, content: string) => {
    await supabase.from("analysis_history").insert([
      { 
        file_name: name, 
        analysis_content: content, 
        user_id: user?.id 
      }
    ]);
    if (user) fetchHistory(user.id);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setAnalysis(""); 

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/analyze", { method: "POST", body: formData });
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    let fullContent = "";
    while (reader) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const json = JSON.parse(line.slice(6));
            const content = json.choices[0]?.delta?.content;
            if (content) {
              setAnalysis((prev) => prev + content);
              fullContent += content;
            }
          } catch (e) {}
        }
      }
    }
    setLoading(false);
    if (fullContent) saveAnalysis(file.name, fullContent);
  };

  // Extract Mock Data for Chart from AI response (Visual Diagnostics)
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
        {/* Sidebar: Persistence Logic */}
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
                onClick={() => { setAnalysis(item.analysis_content); setFileName(item.file_name); }}
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
              <p className="text-slate-500 mb-8">Upload infrastructure logs for AI-powered hunter-alpha analysis.</p>
              
              <div className="relative inline-block">
                <input type="file" onChange={handleUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={loading} />
                <button className={`px-10 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all ${loading ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20'}`}>
                  {loading ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent animate-spin rounded-full" /> : <Upload size={20} />}
                  {loading ? "Analyzing Stream..." : "Deploy Hunter-Alpha"}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {analysis && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  
                  {/* Visual Diagnostics: Charts */}
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

                  {/* Actionable Insights: The Output */}
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
                      {/* Note: The UI naturally renders markdown code blocks if you use a library like react-markdown. 
                          For simplicity here, we rely on the system prompt forcing the AI to use clear blocks. */}
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
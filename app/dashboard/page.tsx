"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Terminal, Shield, LogOut, Copy, Check, History } from "lucide-react";

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
        fetchHistory();
      }
    };
    init();
  }, []);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from("analysis_history")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setHistory(data);
  };

  const saveAnalysis = async (name: string, content: string) => {
    await supabase.from("analysis_history").insert([
      { file_name: name, analysis_content: content, user_id: user?.id }
    ]);
    fetchHistory();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setAnalysis("🔍 Scanning file for error patterns..."); // Initial feedback

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

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-[#020617]/80 backdrop-blur-md px-6 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">L</div>
          <span className="text-xl font-bold tracking-tighter text-white">LogInsight</span>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
          <LogOut size={20} />
        </button>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar History */}
        <aside className="w-72 border-r border-slate-800 bg-slate-950/50 p-6 hidden lg:block overflow-y-auto">
          <div className="flex items-center gap-2 mb-6 text-slate-400">
            <History size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Past Scans</span>
          </div>
          <div className="space-y-3">
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

        {/* Main Workspace */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-slate-900/40 border border-slate-800 p-10 rounded-[2.5rem] text-center relative overflow-hidden">
              <h1 className="text-3xl font-bold text-white mb-2">System Diagnostic</h1>
              <p className="text-slate-500 mb-8">Deploy Hunter-Alpha to analyze your infrastructure logs.</p>
              
              <div className="relative inline-block">
                <input type="file" onChange={handleUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={loading} />
                <button className={`px-10 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all ${loading ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
                  <Upload size={20} /> {loading ? "Analyzing..." : "Upload Log"}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {analysis && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="bg-slate-900/50 px-6 py-4 flex items-center justify-between border-b border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Analysis Engine Output</span>
                    <button onClick={() => { navigator.clipboard.writeText(analysis); setCopied(true); setTimeout(()=>setCopied(false), 2000); }} className="text-slate-500 hover:text-white">
                      {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <div className="p-8 font-mono text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
                    {analysis}
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
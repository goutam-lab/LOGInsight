"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  Terminal, Activity, UploadCloud, Loader2, 
  Zap, LayoutDashboard, Settings, History, 
  Copy, Check, Cpu, HardDrive, Info, Share2, X, Calendar, 
  Code2, FileText, Search, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { io } from "socket.io-client";

/**
 * Custom Hook: useLiveAnalysis
 * Periodically polls the backend for the latest ingested log analysis from Supabase.
 */
function useLiveAnalysis(intervalMs: number = 5000) {
  const [data, setData] = useState<any>(null);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;

    const fetchLatest = async () => {
      try {
        const response = await fetch('/api/analyze/latest');
        if (response.ok) {
          const result = await response.json();
          if (result && result.summary) {
            setData(result);
          }
        }
      } catch (error) {
        console.error("Live polling error:", error);
      }
    };

    fetchLatest();
    const interval = setInterval(fetchLatest, intervalMs);
    return () => clearInterval(interval);
  }, [isLive, intervalMs]);

  return { data, isLive, setIsLive };
}

export default function Dashboard() {
  // --- UI & Data State ---
  const [loading, setLoading] = useState(false);
  const [manualResult, setManualResult] = useState<any>(null);
  const [rawLogs, setRawLogs] = useState<string>("");
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // --- Ghost Mode State ---
  const [executing, setExecuting] = useState(false);
  const [execStatus, setExecStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const logContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  // Initialize Live Polling
  const { data: liveResult, isLive, setIsLive } = useLiveAnalysis(3000);

  // Priority: Use Live Result if it exists, otherwise fall back to Manual Upload
  const result = liveResult || manualResult;

  // --- WebSocket Initialization (Ghost Mode Bridge) ---
  useEffect(() => {
    setMounted(true);
    fetchHistory();

    const initSocket = async () => {
      // Trigger the specialized socket API route
      await fetch("/api/socket"); 
      socketRef.current = io({ path: "/api/socket" });

      // Listen for the agent reporting back the result
      socketRef.current.on("fix-result-ui", (res: any) => {
        if (res.success) {
          setExecStatus('success');
          console.log("Agent Output:", res.output);
        } else {
          setExecStatus('error');
          console.error("Agent Error:", res.output);
        }
        setExecuting(false);
        setTimeout(() => setExecStatus('idle'), 4000);
      });
    };

    initSocket();
    return () => socketRef.current?.disconnect();
  }, []);

  // Auto-scroll to error lines in the Log Explorer
  useEffect(() => {
    if (result && logContainerRef.current) {
      setTimeout(() => {
        const errorLine = document.querySelector('[data-highlight="true"]');
        if (errorLine) {
          errorLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [result]);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/analyze/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      const res = await fetch(`/api/analyze/search?q=${query}`);
      const data = await res.json();
      setHistory(data);
    } else if (query.length === 0) {
      fetchHistory();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLive(false);
    setLoading(true);
    const text = await file.text();
    setRawLogs(text);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setManualResult(data);
      fetchHistory();
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Ghost Mode Dispatcher ---
  const runFixLocally = async () => {
    if (!result?.fix || !socketRef.current) return;
    
    const confirmText = `⚠️ GHOST MODE: Proceeding will execute the following command on your local machine via the active agent:\n\n${result.fix}\n\nAre you sure?`;
    if (!confirm(confirmText)) return;

    setExecuting(true);
    setExecStatus('idle');

    // Emit event to the Socket Server to be picked up by ghost-agent.js
    socketRef.current.emit("dispatch-fix", {
      command: result.fix,
      id: result.id
    });
  };

  const copyAsMarkdown = () => {
    if (!result) return;
    const markdown = `
# 🚨 Incident Report: ${result.summary}
**Severity:** ${result.metrics?.critical > 0 ? 'CRITICAL' : 'WARNING'}
**Source:** ${result.file_name || 'System Stream'}

### 🔍 Analysis
${result.analysis}

### 🛠️ Actionable Fix
\`\`\`bash
${result.fix}
\`\`\`

*Report generated by LOGInsight Engine*`.trim();

    navigator.clipboard.writeText(markdown);
    setShareStatus(true);
    setTimeout(() => setShareStatus(false), 2000);
  };

  const selectIncident = (incident: any) => {
    setManualResult(incident);
    setIsLive(false);
    setShowHistory(false);
  };

  const chartData = result?.metrics ? [
    { name: 'Critical', value: result.metrics.critical, color: '#ef4444' },
    { name: 'Error', value: result.metrics.error, color: '#f97316' },
    { name: 'Warning', value: result.metrics.warning, color: '#eab308' },
  ] : [];

  const hostUrl = mounted ? window.location.origin : 'https://loginsight.ai';

  return (
    <div className="flex min-h-screen bg-[#020203] text-zinc-300 font-sans tracking-tight selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className="w-20 lg:w-72 border-r border-white/5 bg-[#050507]/50 backdrop-blur-xl flex flex-col items-center lg:items-start py-8 lg:px-8 gap-10">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-600/20">
            <Zap className="w-6 h-6 text-white fill-current" />
          </div>
          <span className="hidden lg:block font-bold text-2xl text-white tracking-tighter">LOGInsight</span>
        </div>
        
        <nav className="flex flex-col gap-2 w-full">
          <button onClick={() => { setManualResult(null); setIsLive(true); }} className="w-full text-left focus:outline-none">
            <SidebarLink icon={<LayoutDashboard size={20} />} label="Overview" active={!result && isLive} />
          </button>
          <button onClick={() => setShowHistory(true)} className="w-full text-left focus:outline-none">
            <SidebarLink icon={<History size={20} />} label="Incident Logs" active={showHistory} />
          </button>
          <SidebarLink icon={<Share2 size={20} />} label="Settings" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-24 border-b border-white/5 px-10 flex items-center justify-between bg-[#020203]/80 backdrop-blur-md z-20">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-1">
              <button 
                onClick={() => setIsLive(!isLive)}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                  isLive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-zinc-800/50 border-white/5 text-zinc-500'
                }`}
              >
                <div className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                {isLive ? 'LIVE INGESTION' : 'PAUSED'}
              </button>
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">System Monitor Control</span>
          </div>

          <div className="flex items-center gap-4">
            {result && (
              <button 
                onClick={copyAsMarkdown}
                className="hidden md:flex items-center gap-2 bg-blue-600/10 text-blue-500 border border-blue-500/20 px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-600/20 transition-all shadow-lg shadow-blue-500/5"
              >
                {shareStatus ? <Check size={14} /> : <Share2 size={14} />}
                <span>{shareStatus ? 'Markdown Copied' : 'Share Report'}</span>
              </button>
            )}
            <label className="cursor-pointer group">
              <input type="file" className="hidden" onChange={handleFileUpload} />
              <div className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/5">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                <span>Analyze Local</span>
              </div>
            </label>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
          <AnimatePresence mode="wait">
            {!result && !loading ? (
              <EmptyState hostUrl={hostUrl} />
            ) : result ? (
              <motion.div 
                key={result.id || result.summary}
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="max-w-[1500px] mx-auto space-y-8 pb-12"
              >
                {/* Statistics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatCard label="Critical Issues" value={result.metrics?.critical || 0} color="text-red-500" />
                  <StatCard label="Warnings" value={result.metrics?.warning || 0} color="text-yellow-500" />
                  <StatCard label="Errors" value={result.metrics?.error || 0} color="text-orange-500" />
                  <StatCard label="Intelligence" value={result.is_recurring ? "Recurring" : "Unique"} color={result.is_recurring ? "text-yellow-500" : "text-emerald-500"} />
                </div>

                <div className="grid grid-cols-12 gap-8">
                  {/* Left: Analysis & Log Explorer */}
                  <div className="col-span-12 lg:col-span-8 space-y-8">
                    <section className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl">
                      {result.is_recurring && (
                        <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                          <History size={14} /> Pattern Match Found in History
                        </div>
                      )}
                      <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                        <Info size={14} className="text-blue-500" /> SRE Intelligence Summary
                      </h3>
                      <h1 className="text-4xl font-bold text-white mb-8 leading-[1.1] tracking-tight">{result.summary}</h1>
                      <div className="text-zinc-400 leading-relaxed text-lg whitespace-pre-wrap font-medium">{result.analysis}</div>
                    </section>

                    <section className="bg-black border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                      <div className="bg-white/[0.02] px-8 py-5 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                          <Code2 size={18} className="text-blue-500" />
                          Source Stream Explorer
                        </div>
                        <span className="text-[10px] font-mono text-zinc-600 px-3 py-1 bg-white/5 rounded-full uppercase border border-white/5">
                          Line Diagnostics
                        </span>
                      </div>
                      <div 
                        ref={logContainerRef}
                        className="h-[500px] overflow-auto p-8 font-mono text-[11px] leading-relaxed scroll-smooth bg-black/40 selection:bg-red-500/40"
                      >
                        {(rawLogs || "Awaiting stream content...").split('\n').map((line, i) => {
                          const isError = line.toLowerCase().includes('error') || line.toLowerCase().includes('critical') || line.toLowerCase().includes('exception');
                          return (
                            <div 
                              key={i} 
                              data-highlight={isError}
                              className={`flex gap-8 px-4 py-1 rounded transition-colors group ${isError ? 'bg-red-500/10 text-red-400 font-bold border-l-2 border-red-500' : 'hover:bg-white/[0.02] text-zinc-600'}`}
                            >
                              <span className="w-10 text-right opacity-20 select-none group-hover:opacity-100 transition-opacity font-bold">{i + 1}</span>
                              <span className="break-all">{line}</span>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  </div>

                  {/* Right: Patch & Ghost Mode Actions */}
                  <div className="col-span-12 lg:col-span-4 space-y-8">
                    <section className="bg-emerald-500/[0.03] border border-emerald-500/20 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                      <div className="flex items-center gap-3 mb-8 text-emerald-500 font-bold uppercase text-[10px] tracking-widest">
                        <Terminal size={20} /> Resolution Script
                      </div>
                      <div className="bg-black/60 p-6 rounded-2xl border border-white/5 font-mono text-xs text-emerald-400 mb-8 break-all leading-relaxed shadow-inner max-h-[150px] overflow-auto">
                        {result.fix}
                      </div>
                      
                      <div className="space-y-3">
                        <button 
                          onClick={() => { navigator.clipboard.writeText(result.fix); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                          className="w-full py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-bold text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                          <span>{copied ? 'Copied' : 'Copy Bash Script'}</span>
                        </button>

                        <button 
                          onClick={runFixLocally}
                          disabled={executing}
                          className={`w-full py-5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest shadow-xl border ${
                            execStatus === 'success' 
                              ? 'bg-emerald-500 text-black border-emerald-400' 
                              : execStatus === 'error'
                              ? 'bg-red-500/20 text-red-500 border-red-500/30'
                              : 'bg-zinc-900 text-white border-white/10 hover:bg-black'
                          }`}
                        >
                          {executing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : execStatus === 'success' ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : execStatus === 'error' ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <Zap className="w-4 h-4 text-blue-500 fill-blue-500" />
                          )}
                          <span>
                            {executing ? 'Executing...' : 
                             execStatus === 'success' ? 'Fix Applied' : 
                             execStatus === 'error' ? 'Execution Failed' : 
                             'Run in Ghost Mode'}
                          </span>
                        </button>
                      </div>
                    </section>

                    <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 space-y-8 shadow-xl">
                      <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Activity size={14} /> Telemetry Stream
                      </h4>
                      <EnvRow icon={<Cpu size={16} />} label="Node CPU" val="24.8%" />
                      <EnvRow icon={<HardDrive size={16} />} label="IO Delay" val="12ms" />
                      <div className="pt-8 border-t border-white/5">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-4">Ingestion Gateway URL</p>
                        <p className="text-[10px] font-mono text-zinc-400 bg-white/5 p-4 rounded-xl border border-white/5 break-all leading-relaxed hover:text-white transition-colors cursor-pointer select-all">
                          {hostUrl}/api/ingest
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* History Overlay */}
        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-[#020203]/90 backdrop-blur-xl p-10 flex justify-end">
              <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} className="w-full max-w-2xl bg-[#08080a] border border-white/10 rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
                <div className="p-10 border-b border-white/5 bg-white/[0.01]">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-4">
                      <History className="text-blue-500" /> Incident Database
                    </h3>
                    <button onClick={() => setShowHistory(false)} className="p-3 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white">
                      <X size={28} />
                    </button>
                  </div>
                  
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                      type="text"
                      placeholder="Query history (e.g. 'timeout', 'db error')..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium text-white placeholder:text-zinc-600"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-thin">
                  {history.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-700">
                      <FileText size={60} className="mb-6 opacity-5" />
                      <p className="font-bold tracking-tight">No records found.</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <div key={item.id} onClick={() => selectIncident(item)} className="group p-8 bg-white/[0.01] border border-white/5 rounded-[2rem] cursor-pointer hover:bg-white/[0.05] hover:border-blue-500/30 transition-all relative">
                        {item.is_recurring && <div className="absolute top-8 right-8 h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]" />}
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                            <Calendar size={12} /> {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-lg text-white font-bold group-hover:text-blue-400 transition-colors line-clamp-1">{item.summary}</h4>
                        <p className="text-zinc-500 text-sm mt-3 line-clamp-2 leading-relaxed font-medium">{item.analysis}</p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Sub-components
function SidebarLink({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl cursor-pointer transition-all w-full group ${active ? 'bg-white/10 text-white shadow-xl border border-white/5' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]'}`}>
      <span className={active ? 'text-blue-500' : 'group-hover:text-blue-400 transition-colors'}>{icon}</span>
      <span className="hidden lg:block font-bold text-sm tracking-tight">{label}</span>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string, value: any, color: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[2rem] hover:bg-white/[0.05] transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Activity size={40} />
      </div>
      <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.3em] mb-3 group-hover:text-zinc-400 transition-colors relative z-10">{label}</p>
      <p className={`text-4xl font-bold tracking-tighter ${color} relative z-10`}>{value}</p>
    </div>
  );
}

function EnvRow({ icon, label, val }: { icon: any, label: string, val: string }) {
  return (
    <div className="flex items-center justify-between text-xs group">
      <div className="flex items-center gap-3 text-zinc-500 font-bold uppercase tracking-tighter group-hover:text-zinc-400 transition-colors">{icon} <span>{label}</span></div>
      <span className="font-mono text-white bg-white/5 px-2 py-1 rounded-lg border border-white/5">{val}</span>
    </div>
  );
}

function EmptyState({ hostUrl }: { hostUrl: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
      <div className="w-24 h-24 bg-blue-600/10 rounded-[2.5rem] flex items-center justify-center mb-8 border border-blue-500/20 shadow-2xl shadow-blue-500/10">
        <Activity className="w-12 h-12 text-blue-600" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Intelligence Gateway Idle</h3>
      <p className="text-zinc-500 text-center max-w-sm text-sm leading-relaxed mb-8 font-medium">
        No active telemetry stream detected. Connect via the local ingest gateway or upload an incident file for AI diagnostics.
      </p>
      <div className="flex items-center gap-3 font-mono text-[10px] bg-black/40 px-6 py-4 rounded-full border border-white/5 text-zinc-400 shadow-inner group cursor-pointer hover:bg-black/60 transition-all">
        <span className="text-emerald-500 font-bold">$</span> 
        <span className="select-all tracking-tight group-hover:text-white transition-colors">curl -d "log content" {hostUrl}/api/ingest</span>
      </div>
    </motion.div>
  );
}
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 selection:bg-blue-500/30 font-sans">
      {/* Ambient Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-indigo-600/10 blur-[100px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-slate-800/60 bg-[#020617]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black shadow-[0_0_15px_rgba(37,99,235,0.4)]">L</div>
            <span className="text-xl font-bold tracking-tighter text-white">LogInsight</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium hover:text-white transition-colors">Sign In</Link>
            <Link href="/signup" className="bg-white text-slate-950 px-5 py-2 rounded-full text-sm font-bold hover:bg-blue-50 transition-all shadow-lg">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-8 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Hunter-Alpha reasoning engine is live
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white mb-8 leading-[0.9]">
          Logs are messy. <br />
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent italic">AI is precise.</span>
        </h1>
        
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          Upload 100MB logs. Get 3 bullet points of truth. Identify leaks, bugs, and bottlenecks using deep reasoning.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-24">
          <Link href="/signup" className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all">
            Analyze First Log Free
          </Link>
          <button className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg border border-slate-800 hover:bg-slate-800 transition-all">
            See Demo
          </button>
        </div>

        {/* How it works grid */}
        <section className="grid md:grid-cols-3 gap-6 text-left border-t border-slate-800/50 pt-20">
          <FeatureCard 
            step="01" 
            title="Secure Upload" 
            desc="Drag your .txt or .log files into our encrypted terminal." 
          />
          <FeatureCard 
            step="02" 
            title="AI Reasoning" 
            desc="Hunter-Alpha thinks through every line to find the needle in the haystack." 
          />
          <FeatureCard 
            step="03" 
            title="Instant Fix" 
            desc="Receive a root-cause report and suggested shell commands to fix the issue." 
          />
        </section>
      </main>
    </div>
  );
}

function FeatureCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="p-8 bg-slate-900/40 border border-slate-800/60 rounded-3xl hover:border-blue-500/50 transition-colors group">
      <span className="text-blue-500 font-mono text-sm font-bold block mb-4 group-hover:animate-pulse">{step}</span>
      <h3 className="text-white text-xl font-bold mb-2">{title}</h3>
      <p className="text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
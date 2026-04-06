import { Outlet } from 'react-router-dom'
import { Github, ShieldCheck } from 'lucide-react'

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative selection:bg-blue-500/20">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[100px] animate-blob" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-400/20 blur-[100px] animate-blob animation-delay-2000" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-cyan-400/20 blur-[100px] animate-blob animation-delay-4000" />
      </div>

      {/* Floating Header */}
      <header className="fixed top-0 inset-x-0 z-50 flex justify-center pt-6 px-4 pointer-events-none">
        <div className="pointer-events-auto flex h-14 items-center justify-between px-6 rounded-full bg-white/70 backdrop-blur-xl border border-white shadow-lg shadow-slate-200/50 w-full max-w-5xl transition-all hover:shadow-xl hover:shadow-slate-200/60 hover:bg-white/80">
          <a href="/" className="flex items-center gap-3 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors shadow-sm border border-blue-100">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <span className="text-sm font-bold tracking-wide text-slate-800">API Purity</span>
          </a>
          <a
            href="https://github.com/Forlives/relay-api-hub"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all"
          >
            <Github className="h-4.5 w-4.5" />
          </a>
        </div>
      </header>

      <main className="flex-1 relative z-10 pt-32 pb-16">
        <Outlet />
      </main>

      <footer className="relative z-10 border-t border-slate-200/60 py-8 text-center text-xs text-slate-500 backdrop-blur-md bg-white/30">
        <p className="mb-2">你的 API Key 仅用于实时检测，不会被存储或发送到任何第三方。</p>
        <p>
          &copy; {new Date().getFullYear()} API Purity Detector &mdash; 
          <a href="https://github.com/Forlives/relay-api-hub" className="ml-1 text-slate-600 hover:text-blue-600 font-medium transition-colors">开源项目</a>
        </p>
      </footer>
    </div>
  )
}

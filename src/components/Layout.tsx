import { Outlet } from 'react-router-dom'
import { Github, ShieldCheck } from 'lucide-react'

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#030712] flex flex-col relative selection:bg-blue-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] mix-blend-screen animate-blob" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px] mix-blend-screen animate-blob animation-delay-2000" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-cyan-600/10 blur-[120px] mix-blend-screen animate-blob animation-delay-4000" />
      </div>

      {/* Floating Header */}
      <header className="fixed top-0 inset-x-0 z-50 flex justify-center pt-6 px-4 pointer-events-none">
        <div className="pointer-events-auto flex h-14 items-center justify-between px-6 rounded-full bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-2xl w-full max-w-5xl">
          <a href="/" className="flex items-center gap-3 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 group-hover:bg-white/20 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <ShieldCheck className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-wide text-white/90">API Purity</span>
          </a>
          <a
            href="https://github.com/Forlives/relay-api-hub"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all"
          >
            <Github className="h-4.5 w-4.5" />
          </a>
        </div>
      </header>

      <main className="flex-1 relative z-10 pt-32 pb-16">
        <Outlet />
      </main>

      <footer className="relative z-10 border-t border-white/[0.05] py-8 text-center text-xs text-white/40 backdrop-blur-md bg-[#030712]/50">
        <p className="mb-2">你的 API Key 仅用于实时检测，不会被存储或发送到任何第三方。</p>
        <p>
          &copy; {new Date().getFullYear()} API Purity Detector &mdash; 
          <a href="https://github.com/Forlives/relay-api-hub" className="ml-1 text-white/60 hover:text-white transition-colors">开源项目</a>
        </p>
      </footer>
    </div>
  )
}

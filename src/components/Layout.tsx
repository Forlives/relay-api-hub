import { Outlet } from 'react-router-dom'
import { Github, ShieldCheck } from 'lucide-react'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="border-b border-gray-800/40 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 flex h-14 items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <ShieldCheck className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-base font-bold gradient-text">API 纯净度检测</span>
          </a>
          <a
            href="https://github.com/Forlives/relay-api-hub"
            target="_blank"
            rel="noreferrer"
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Github className="h-5 w-5" />
          </a>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-gray-800/30 py-5 text-center text-xs text-gray-600">
        你的 API Key 仅用于实时检测，不会被存储或发送到任何第三方 &mdash; <a href="https://github.com/Forlives/relay-api-hub" className="text-blue-500/60 hover:text-blue-400">开源项目</a>
      </footer>
    </div>
  )
}

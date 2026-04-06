import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Trophy, FlaskConical, Server, Github } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '总览' },
  { to: '/ranking', icon: Trophy, label: '排行榜' },
  { to: '/test', icon: FlaskConical, label: '测试' },
  { to: '/sites', icon: Server, label: '站点管理' },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-950">
      <header className="sticky top-0 z-50 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                <span className="text-lg font-bold text-white">R</span>
              </div>
              <div>
                <h1 className="text-lg font-bold gradient-text">API Relay Hub</h1>
                <p className="text-[10px] text-gray-500 leading-none">AI 中转站评测平台</p>
              </div>
            </div>

            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="sm:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-gray-400 hover:text-gray-200'
                )
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-gray-800/50 py-6 text-center text-xs text-gray-600">
        API Relay Hub &copy; {new Date().getFullYear()} &mdash; AI API 中转站自动化评测
      </footer>
    </div>
  )
}

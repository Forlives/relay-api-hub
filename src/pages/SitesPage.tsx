import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Server, Plus, Trash2, ExternalLink, X } from 'lucide-react'
import { api, type Site } from '@/lib/api'
import { cn } from '@/lib/utils'

const categoryLabels: Record<string, string> = {
  recommended: '推荐',
  neutral: '中性',
  not_recommended: '不推荐',
}

const categoryColors: Record<string, string> = {
  recommended: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  neutral: 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
  not_recommended: 'bg-red-500/10 text-red-400 ring-red-500/20',
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    url: '',
    api_base: '',
    description: '',
    category: 'neutral' as Site['category'],
    models: 'Claude,GPT,Gemini',
  })

  useEffect(() => {
    api.getSites()
      .then(setSites)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async () => {
    if (!form.name.trim() || !form.api_base.trim()) return
    try {
      const newSite = await api.addSite(form)
      setSites((prev) => [...prev, newSite])
      setShowForm(false)
      setForm({ name: '', url: '', api_base: '', description: '', category: 'neutral', models: 'Claude,GPT,Gemini' })
    } catch (e: any) {
      alert(e.message || '添加失败')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此站点？')) return
    try {
      await api.deleteSite(id)
      setSites((prev) => prev.filter((s) => s.id !== id))
    } catch {}
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Server className="h-6 w-6 text-blue-400" />
            站点管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">管理需要测试的 API 中转站</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" /> 添加站点
        </button>
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-200">添加新站点</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">站点名称 *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例如: PackyCode"
                  className="w-full bg-gray-800/80 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">网站地址</label>
                <input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full bg-gray-800/80 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">API Base URL *</label>
                <input
                  value={form.api_base}
                  onChange={(e) => setForm({ ...form, api_base: e.target.value })}
                  placeholder="https://api.example.com/v1"
                  className="w-full bg-gray-800/80 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">支持模型</label>
                <input
                  value={form.models}
                  onChange={(e) => setForm({ ...form, models: e.target.value })}
                  placeholder="Claude,GPT,Gemini"
                  className="w-full bg-gray-800/80 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">分类</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as Site['category'] })}
                  className="w-full bg-gray-800/80 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="recommended">推荐</option>
                  <option value="neutral">中性</option>
                  <option value="not_recommended">不推荐</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">简介</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="简要描述..."
                  className="w-full bg-gray-800/80 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                disabled={!form.name.trim() || !form.api_base.trim()}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sites Grid */}
      {loading ? (
        <div className="py-16 text-center text-gray-500">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-3" />
          加载中...
        </div>
      ) : sites.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <div key={site.id} className="glass-card p-5 group hover:border-gray-700/50 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800 text-sm font-bold text-blue-400">
                    {site.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-200">{site.name}</h3>
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ring-1',
                      categoryColors[site.category]
                    )}>
                      {categoryLabels[site.category]}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(site.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {site.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{site.description}</p>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 font-mono truncate max-w-[200px]">{site.api_base}</span>
                {site.url && (
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    访问 <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mt-3">
                {site.models.split(',').map((m) => (
                  <span key={m} className="px-1.5 py-0.5 rounded bg-gray-800/80 text-[10px] text-gray-400">
                    {m.trim()}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <Server className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>还没有添加任何站点</p>
          <p className="text-xs mt-1">点击上方"添加站点"按钮开始</p>
        </div>
      )}
    </motion.div>
  )
}

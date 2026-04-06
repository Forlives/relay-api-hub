import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  FlaskConical, Play, Key, Plus, Trash2, Loader2,
  CheckCircle, XCircle, AlertTriangle
} from 'lucide-react'
import { api, type Site, type TestResult } from '@/lib/api'
import { cn, formatLatency } from '@/lib/utils'

export default function TestPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [keys, setKeys] = useState<{ id: number; name: string; masked_key: string }[]>([])
  const [selectedSite, setSelectedSite] = useState<number>(0)
  const [model, setModel] = useState('claude-sonnet-4-6-20250514')
  const [apiKey, setApiKey] = useState('')
  const [keyName, setKeyName] = useState('')
  const [testing, setTesting] = useState(false)
  const [batchTesting, setBatchTesting] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [showKeyForm, setShowKeyForm] = useState(false)

  useEffect(() => {
    api.getSites().then(setSites).catch(() => {})
    api.getKeys().then(setKeys).catch(() => {})
  }, [])

  const handleTest = async () => {
    if (!selectedSite || !apiKey.trim()) return
    setTesting(true)
    try {
      const result = await api.runTest(selectedSite, model, apiKey)
      setResults((prev) => [result, ...prev])
    } catch (e: any) {
      alert(e.message || '测试失败')
    } finally {
      setTesting(false)
    }
  }

  const handleBatchTest = async () => {
    if (!apiKey.trim()) return
    setBatchTesting(true)
    try {
      const batchResults = await api.runBatchTest(model, apiKey)
      setResults((prev) => [...batchResults, ...prev])
    } catch (e: any) {
      alert(e.message || '批量测试失败')
    } finally {
      setBatchTesting(false)
    }
  }

  const handleSaveKey = async () => {
    if (!keyName.trim() || !apiKey.trim()) return
    try {
      await api.saveKey(keyName, apiKey)
      const updated = await api.getKeys()
      setKeys(updated)
      setShowKeyForm(false)
      setKeyName('')
    } catch (e: any) {
      alert(e.message || '保存失败')
    }
  }

  const handleDeleteKey = async (id: number) => {
    try {
      await api.deleteKey(id)
      setKeys((prev) => prev.filter((k) => k.id !== id))
    } catch {}
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-cyan-400" />
          API 测试
        </h1>
        <p className="text-sm text-gray-500 mt-1">输入你的 API Key，对所有站点进行延迟、质量、掺水检测</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Test Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-300">测试配置</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">选择模型</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-gray-800/80 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="claude-sonnet-4-6-20250514">Claude Sonnet 4.6</option>
                  <option value="claude-opus-4-6-20250514">Claude Opus 4.6</option>
                  <option value="gpt-5.4">GPT 5.4</option>
                  <option value="gemini-3.1-pro">Gemini 3.1 Pro</option>
                  <option value="deepseek-r1">DeepSeek R1</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">选择站点（单站测试）</label>
                <select
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(Number(e.target.value))}
                  className="w-full bg-gray-800/80 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value={0}>请选择站点</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 bg-gray-800/80 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <button
                  onClick={() => setShowKeyForm(!showKeyForm)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-gray-800/80 border border-gray-700/50 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <Key className="h-3.5 w-3.5" />
                  保存
                </button>
              </div>
            </div>

            {showKeyForm && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1.5">Key 名称</label>
                  <input
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="例如: PackyCode 主账号"
                    className="w-full bg-gray-800/80 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <button
                  onClick={handleSaveKey}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 transition-colors"
                >
                  确认保存
                </button>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleTest}
                disabled={testing || !selectedSite || !apiKey.trim()}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
                  testing || !selectedSite || !apiKey.trim()
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-500 glow-brand'
                )}
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                单站测试
              </button>
              <button
                onClick={handleBatchTest}
                disabled={batchTesting || !apiKey.trim()}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
                  batchTesting || !apiKey.trim()
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500'
                )}
              >
                {batchTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                全站批量测试
              </button>
            </div>
          </div>

          {/* Test Results */}
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-300">测试结果</h3>
            </div>
            {results.length > 0 ? (
              <div className="divide-y divide-gray-800/30">
                {results.map((r, i) => (
                  <div key={`${r.id}-${i}`} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      {r.success ? (
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400" />
                      )}
                      <div>
                        <p className="text-sm text-gray-200">{r.site_name ?? `站点 #${r.site_id}`}</p>
                        <p className="text-xs text-gray-500">{r.model}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-gray-300">{formatLatency(r.latency_ms)}</p>
                        <p className="text-[10px] text-gray-600">延迟</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-300">{r.tokens_per_second.toFixed(1)} t/s</p>
                        <p className="text-[10px] text-gray-600">速度</p>
                      </div>
                      <div className="text-right">
                        {r.is_watermarked ? (
                          <div className="flex items-center gap-1 text-red-400">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-xs">疑似掺水</span>
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-400">正常</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500 text-sm">
                运行测试后结果将在这里显示
              </div>
            )}
          </div>
        </div>

        {/* Saved Keys */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Key className="h-4 w-4 text-yellow-400" />
                已保存的 Key
              </h3>
              <button
                onClick={() => setShowKeyForm(!showKeyForm)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> 添加
              </button>
            </div>
            {keys.length > 0 ? (
              <div className="space-y-2">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/50 group cursor-pointer hover:bg-gray-800/80 transition-colors"
                    onClick={() => setApiKey(k.masked_key)}
                  >
                    <div>
                      <p className="text-sm text-gray-200">{k.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{k.masked_key}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteKey(k.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600 text-center py-4">
                还没有保存的 Key<br />
                输入 Key 后点击保存按钮
              </p>
            )}
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">测试说明</h3>
            <div className="space-y-2 text-xs text-gray-500 leading-relaxed">
              <p>1. 输入你在各中转站购买的 API Key</p>
              <p>2. 选择要测试的模型和站点</p>
              <p>3. 点击"单站测试"或"全站批量测试"</p>
              <p>4. 系统将测试延迟、速度、并检测掺水</p>
              <p className="text-yellow-500/70 pt-2">
                Key 仅保存在服务器本地数据库，不会上传到任何第三方
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

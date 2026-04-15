import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, ShieldAlert, ShieldX, AlertTriangle,
  Play, RotateCcw, ChevronDown, ChevronUp,
  Zap, Brain, Code2, Fingerprint, Calendar,
  CheckCircle, XCircle, Info, Sparkles, Activity,
  UserCheck, Repeat, ArrowRight, Search, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Dimension {
  key: string
  name: string
  desc: string
  icon: string
  applicable: boolean
  score: number | null
  officialBaseline: string
  detail: any
}

interface DetectionResult {
  status: 'pass' | 'caution' | 'suspect' | 'fail' | 'error'
  verdict: string
  verdictDetail: string
  score: number
  avgLatency: number
  dimensions: Dimension[]
  meta: { requestedModel: string; modelFamily: string; baselineLabel: string; testedAt: string }
}

const PRESETS = [
  { label: 'Claude 4.6 Sonnet', value: 'claude-sonnet-4-6-20250514' },
  { label: 'Claude 4.6 Opus', value: 'claude-opus-4-6-20250514' },
  { label: 'GPT-5.4', value: 'gpt-5.4' },
  { label: 'Gemini 3.1 Pro', value: 'gemini-3.1-pro' },
  { label: 'DeepSeek R1', value: 'deepseek-r1' },
]

const statusConfig = {
  pass: { icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', barColor: 'bg-emerald-500', glow: 'shadow-[0_0_60px_rgba(52,211,153,0.15)]' },
  caution: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', barColor: 'bg-amber-500', glow: 'shadow-[0_0_60px_rgba(251,191,36,0.15)]' },
  suspect: { icon: ShieldAlert, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', barColor: 'bg-orange-500', glow: 'shadow-[0_0_60px_rgba(249,115,22,0.15)]' },
  fail: { icon: ShieldX, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', barColor: 'bg-red-500', glow: 'shadow-[0_0_60px_rgba(239,68,68,0.15)]' },
  error: { icon: XCircle, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200', barColor: 'bg-slate-400', glow: '' },
}

const iconMap: Record<string, typeof Fingerprint> = {
  Fingerprint, UserCheck, Calendar, Brain, Code2, Repeat,
}

function getScoreBarColor(score: number) {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-blue-500'
  if (score >= 30) return 'bg-amber-500'
  return 'bg-red-500'
}

function getScoreLabel(score: number) {
  if (score >= 80) return { text: '达标', color: 'text-emerald-600 bg-emerald-50' }
  if (score >= 60) return { text: '基本达标', color: 'text-blue-600 bg-blue-50' }
  if (score >= 30) return { text: '偏差', color: 'text-amber-600 bg-amber-50' }
  return { text: '严重异常', color: 'text-red-600 bg-red-50' }
}

export default function Home() {
  const [apiBase, setApiBase] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(PRESETS[0].value)
  const [customModel, setCustomModel] = useState('')
  const [testing, setTesting] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [expandedDim, setExpandedDim] = useState<string | null>(null)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [remoteModels, setRemoteModels] = useState<{ id: string; owned_by?: string }[]>([])
  const [showRemoteModels, setShowRemoteModels] = useState(false)

  const effectiveModel = customModel.trim() || model

  const handleFetchModels = async () => {
    if (!apiBase.trim() || !apiKey.trim()) return
    setFetchingModels(true)
    setRemoteModels([])
    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_base: apiBase, api_key: apiKey }),
      })
      const data = await res.json()
      if (res.ok && data.models) {
        setRemoteModels(data.models)
        setShowRemoteModels(true)
      }
    } catch {}
    setFetchingModels(false)
  }

  const handleDetect = async () => {
    if (!apiBase.trim() || !apiKey.trim()) return
    setTesting(true)
    setResult(null)
    setExpandedDim(null)
    setProgress('正在建立安全连接...')

    try {
      setProgress('正在检测 API 连通性...')
      const pingRes = await fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_base: apiBase, api_key: apiKey, model: effectiveModel }),
      })
      const ping = await pingRes.json()

      if (!ping.ok) {
        setResult({
          status: 'error',
          verdict: 'API 连接失败',
          verdictDetail: `无法连接到 ${apiBase}${ping.error ? ` (${ping.error})` : ping.status ? ` (HTTP ${ping.status})` : ''}。请检查：1) API 地址是否正确 2) 服务器是否在线 3) API Key 是否有效`,
          score: 0, avgLatency: 0, dimensions: [],
          meta: { requestedModel: effectiveModel, modelFamily: '', baselineLabel: '', testedAt: new Date().toISOString() },
        })
        return
      }

      setProgress(`连通 (${ping.latency}ms) — 正在运行 6 维度深度指纹分析...`)

      const res = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_base: apiBase, api_key: apiKey, model: effectiveModel }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
      } else {
        setResult({ status: 'error', verdict: data.error?.includes('无法连接') ? 'API 连接失败' : '检测失败', verdictDetail: `${data.error || '未知错误'}${data.hint ? '\n' + data.hint : ''}`, score: 0, avgLatency: 0, dimensions: [], meta: { requestedModel: effectiveModel, modelFamily: '', baselineLabel: '', testedAt: new Date().toISOString() } })
      }
    } catch (e: any) {
      setResult({ status: 'error', verdict: '网络错误', verdictDetail: e.message, score: 0, avgLatency: 0, dimensions: [], meta: { requestedModel: effectiveModel, modelFamily: '', baselineLabel: '', testedAt: new Date().toISOString() } })
    } finally {
      setTesting(false)
      setProgress('')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="text-center mb-16">
        <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-blue-100 shadow-sm mb-8 text-xs font-semibold text-blue-600">
          <Sparkles className="h-4 w-4" />
          <span>6 维度协议级指纹分析 · 官方基线对比</span>
        </motion.div>
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]">
          你买的 API <br className="sm:hidden" />
          <span className="gradient-text-brand">掺水了吗？</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed font-medium">
          对比真实官方 Claude / GPT / Gemini 的协议指纹，<br className="hidden sm:block" />
          用 6 个维度告诉你 API 到底纯不纯。
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} transition={{ duration: 0.5 }}>
            <div className="glass-panel p-6 sm:p-10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <AnimatePresence>
                {testing && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center rounded-3xl">
                    <div className="relative w-full h-full overflow-hidden rounded-3xl">
                      <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(59,130,246,0.15)_50%,transparent_100%)] h-[20%] w-full animate-scan" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="relative mb-6">
                          <Activity className="h-14 w-14 text-blue-600 animate-pulse relative z-10" />
                          <div className="absolute inset-0 bg-blue-400/30 blur-xl rounded-full animate-pulse-slow" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">正在对比官方基线</h3>
                        <p className="text-sm text-blue-600 font-mono font-medium">{progress}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-8 relative z-10">
                <div className="grid gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">API Base URL</label>
                    <input value={apiBase} onChange={e => setApiBase(e.target.value)} placeholder="https://api.example.com/v1" disabled={testing} className="glass-input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">API Key</label>
                    <div className="flex gap-2">
                      <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." disabled={testing} className="glass-input flex-1 font-mono text-sm tracking-widest" />
                      <button
                        onClick={handleFetchModels}
                        disabled={testing || fetchingModels || !apiBase.trim() || !apiKey.trim()}
                        className={cn(
                          'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 border shadow-sm whitespace-nowrap',
                          fetchingModels ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200',
                          (testing || !apiBase.trim() || !apiKey.trim()) && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {fetchingModels ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                        {fetchingModels ? '查询中' : '查询模型'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3 ml-1">你购买的模型</label>
                    <div className="flex flex-wrap gap-2.5 mb-3">
                      {PRESETS.map(p => (
                        <button key={p.value} onClick={() => { setModel(p.value); setCustomModel(''); setShowRemoteModels(false) }} disabled={testing} className={cn('px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 border shadow-sm', model === p.value && !customModel ? 'bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-500/20' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800')}>
                          {p.label}
                        </button>
                      ))}
                    </div>

                    <AnimatePresence>
                      {showRemoteModels && remoteModels.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-3 overflow-hidden"
                        >
                          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-100">
                            <div className="flex items-center justify-between mb-2.5">
                              <span className="text-xs font-bold text-blue-700">
                                该 Key 下可用模型 ({remoteModels.length})
                              </span>
                              <button onClick={() => setShowRemoteModels(false)} className="text-[10px] text-slate-400 hover:text-slate-600">收起</button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                              {remoteModels.map(m => (
                                <button
                                  key={m.id}
                                  onClick={() => { setCustomModel(m.id); setShowRemoteModels(false) }}
                                  className={cn(
                                    'px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 border',
                                    customModel === m.id
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                                  )}
                                >
                                  {m.id}
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <input value={customModel} onChange={e => setCustomModel(e.target.value)} placeholder="或输入自定义模型名" disabled={testing} className="glass-input w-full text-sm" />
                  </div>
                </div>
                <div className="pt-4">
                  <button onClick={handleDetect} disabled={testing || !apiBase.trim() || !apiKey.trim()} className={cn('w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-bold transition-all duration-300', testing || !apiBase.trim() || !apiKey.trim() ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' : 'btn-primary')}>
                    <Play className="h-5 w-5" fill="currentColor" />
                    开始深度检测
                  </button>
                  <div className="flex items-center justify-center gap-2 mt-5 text-slate-400 font-medium">
                    <Info className="h-4 w-4" />
                    <p className="text-xs">约消耗 1000 token · Key 不会被存储</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 20, stiffness: 100 }} className="space-y-6">
            {/* Verdict */}
            <VerdictCard result={result} />

            {/* Dimension Breakdown */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                6 维度检测报告 · 对比官方基线
              </h3>
              <div className="space-y-3">
                {result.dimensions.map((dim, i) => {
                  const Icon = iconMap[dim.icon] || Brain
                  const expanded = expandedDim === dim.key
                  const score = dim.score ?? 0
                  const scoreLabel = getScoreLabel(score)
                  const notApplicable = !dim.applicable

                  return (
                    <motion.div key={dim.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }} className="glass-panel overflow-hidden bg-white">
                      <button onClick={() => setExpandedDim(expanded ? null : dim.key)} className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors text-left">
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl shrink-0 shadow-sm border', notApplicable ? 'bg-slate-50 border-slate-200 text-slate-400' : score >= 60 ? 'bg-blue-50 border-blue-100 text-blue-600' : score >= 30 ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-red-50 border-red-100 text-red-600')}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-sm font-bold text-slate-800">{dim.name}</span>
                            {notApplicable ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500">不适用</span>
                            ) : (
                              <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold', scoreLabel.color)}>{scoreLabel.text}</span>
                            )}
                          </div>
                          {!notApplicable && (
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.8, delay: 0.2 + 0.1 * i, ease: [0.16, 1, 0.3, 1] }} className={cn('h-full rounded-full', getScoreBarColor(score))} />
                              </div>
                              <span className="text-sm font-black text-slate-700 w-10 text-right">{score}</span>
                            </div>
                          )}
                        </div>
                        {!notApplicable && (expanded ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />)}
                      </button>

                      <AnimatePresence>
                        {expanded && !notApplicable && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-5 pb-4 pt-0 border-t border-slate-100 bg-slate-50/50">
                              <p className="text-xs text-slate-500 mt-3 mb-3">{dim.desc}</p>
                              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-blue-50/60 border border-blue-100 mb-3">
                                <ShieldCheck className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-0.5">官方基线</span>
                                  <p className="text-xs text-blue-800 leading-relaxed">{dim.officialBaseline}</p>
                                </div>
                              </div>
                              <DimensionDetail dim={dim} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="pt-4">
              <button onClick={() => { setResult(null); setExpandedDim(null) }} className="mx-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:shadow-md transition-all duration-300">
                <RotateCcw className="h-4 w-4" />
                返回重新检测
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Features */}
      <div className="mt-32 mb-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-3">和官方 API 做 1:1 对比</h2>
          <p className="text-base text-slate-500 font-medium">不是猜，是量化对比。每个维度都有真实官方基线作为参照。</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { icon: Fingerprint, title: 'SSE 协议指纹', desc: '官方 Anthropic 的流式返回有独特的事件链，掺水站很难完美伪造' },
            { icon: Calendar, title: '知识截止日期', desc: 'Claude 4.6 的知识截止是 2025 年 5 月，如果回答不同就可疑' },
            { icon: Code2, title: '质量基线对比', desc: '官方高端模型的推理/代码能力有已知基线，低端模型达不到' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-panel p-8 text-center hover:-translate-y-1.5 transition-transform duration-300 bg-white">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 mx-auto mb-5 shadow-sm">
                <Icon className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2.5">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function VerdictCard({ result }: { result: DetectionResult }) {
  const config = statusConfig[result.status]
  const Icon = config.icon

  return (
    <div className={cn('glass-panel p-8 sm:p-10 text-center relative overflow-hidden bg-white', config.glow)}>
      <div className={cn('absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-lg blur-[100px] opacity-40 pointer-events-none', config.bg)} />
      <div className="relative z-10">
        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 15, stiffness: 200 }} className="flex justify-center mb-5">
          <div className={cn('flex h-20 w-20 items-center justify-center rounded-full border-4 shadow-xl bg-white', config.border)}>
            <Icon className={cn('h-10 w-10', config.color)} />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className={cn('text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight', config.color)}>{result.verdict}</h2>
          <p className="text-base text-slate-600 mb-8 max-w-lg mx-auto leading-relaxed font-medium">{result.verdictDetail}</p>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className={cn('text-3xl font-black mb-1', config.color)}>{result.score}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">综合评分</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="h-5 w-5 text-amber-500" />
                <p className="text-3xl font-black text-slate-800">{result.avgLatency || '—'}</p>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">延迟(ms)</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-3xl font-black text-slate-800 mb-1">{result.dimensions.filter(d => d.applicable && (d.score ?? 0) < 30).length}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">异常维度</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-6 font-medium">
            对比基线：<span className="text-slate-600">{result.meta.baselineLabel || result.meta.requestedModel}</span>
            <ArrowRight className="h-3 w-3 inline mx-1" />
            测试时间 {new Date(result.meta.testedAt).toLocaleString('zh-CN')}
          </p>
        </motion.div>
      </div>
    </div>
  )
}

function DimensionDetail({ dim }: { dim: Dimension }) {
  const d = dim.detail
  if (!d) return null

  switch (dim.key) {
    case 'sse':
      return (
        <div className="space-y-2 text-xs">
          {d.matchedEvents && (
            <div>
              <p className="font-bold text-slate-700 mb-1">匹配到的 SSE 事件：</p>
              <div className="flex flex-wrap gap-1.5">
                {(d.expectedEvents || []).map((e: string) => (
                  <span key={e} className={cn('px-2 py-1 rounded-lg font-mono border', d.matchedEvents.includes(e) ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600 line-through')}>
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}
          {d.messageStartModel && <p className="text-slate-600">Stream 返回的模型：<span className="font-bold text-slate-800">{d.messageStartModel}</span></p>}
          {d.hasThinkingBlock != null && <p className="text-slate-600">Thinking Block：{d.hasThinkingBlock ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 inline" /> : <XCircle className="h-3.5 w-3.5 text-red-500 inline" />}</p>}
          {d.inputTokens != null && <p className="text-slate-600">Input Tokens: {d.inputTokens} | Output Tokens: {d.outputTokens ?? 'N/A'}</p>}
        </div>
      )
    case 'identity':
      return (
        <div className="space-y-1.5 text-xs">
          {d.details?.map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              {item.pass === true ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : item.pass === false ? <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" /> : <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
              <span className="text-slate-700"><span className="font-bold">{item.check}：</span>{item.note}</span>
            </div>
          ))}
          {d.content && <p className="text-slate-500 mt-2 italic border-l-2 border-slate-200 pl-3">"{d.content.slice(0, 150)}"</p>}
        </div>
      )
    case 'cutoff':
      return (
        <div className="space-y-1.5 text-xs">
          <p className="text-slate-700">预期截止日期：<span className="font-bold">{d.expectedCutoff}</span></p>
          <p className="text-slate-700">模型回答：<span className="font-bold">{d.content?.slice(0, 100) || 'N/A'}</span></p>
          <p className="text-slate-700">匹配类型：<span className={cn('font-bold', d.matchType === 'exact' ? 'text-emerald-600' : d.matchType === 'year_only' ? 'text-amber-600' : 'text-red-600')}>
            {d.matchType === 'exact' ? '精确匹配' : d.matchType === 'year_only' ? '年份匹配' : d.matchType === 'outdated' ? '已过期' : '无法匹配'}
          </span></p>
        </div>
      )
    case 'reasoning':
      return (
        <div className="space-y-2 text-xs">
          {d.tests?.map((t: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              {t.pass ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
              <span className="text-slate-700"><span className="font-bold">{t.name}：</span>回答 "{t.answer}"，正确答案 {t.expected} — {t.pass ? '正确' : '错误'}</span>
              <span className="text-slate-400 ml-auto">{t.latency}ms</span>
            </div>
          ))}
        </div>
      )
    case 'code':
      return (
        <div className="space-y-2 text-xs">
          {d.checks?.map((c: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              {c.pass ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
              <span className="text-slate-700"><span className="font-bold">{c.name}</span> — {c.official}</span>
            </div>
          ))}
          {d.tps && <p className="text-slate-600 mt-1">生成速度：<span className="font-bold">{d.tps} tokens/s</span></p>}
        </div>
      )
    case 'consistency':
      return (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            {d.modelConsistent ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
            <span className="text-slate-700">模型标识一致性：<span className="font-bold">{d.modelConsistent ? '一致' : '不一致'}</span></span>
          </div>
          {d.results?.map((r: any, i: number) => (
            <p key={i} className="text-slate-600 pl-5">
              第 {i + 1} 次：model=<span className="font-mono font-bold">{r.responseModel || 'N/A'}</span> · {r.latency}ms
            </p>
          ))}
          {d.latencyDiff != null && <p className="text-slate-600 pl-5">延迟差：{d.latencyDiff}ms</p>}
        </div>
      )
    default:
      return null
  }
}

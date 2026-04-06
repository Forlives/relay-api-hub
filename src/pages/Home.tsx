import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, ShieldAlert, ShieldX, AlertTriangle,
  Play, Loader2, RotateCcw, ChevronDown, ChevronUp,
  Zap, Brain, Code2, Languages, Fingerprint, Clock,
  CheckCircle, XCircle, Info, Sparkles, Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProbeResult {
  name: string
  success: boolean
  latency: number
  detail: string
  correct?: boolean
  qualityScore?: number
  tps?: number
  getsSlang?: boolean
  responseModel?: string
}

interface Issue {
  severity: 'critical' | 'warning'
  probe: string
  message: string
}

interface DetectionResult {
  status: 'pass' | 'caution' | 'suspect' | 'fail' | 'error'
  verdict: string
  verdictDetail: string
  score: number
  avgLatency: number
  issues: Issue[]
  probes: Record<string, ProbeResult>
  meta: {
    requestedModel: string
    modelFamily: string
    responseModels: string[]
    testedAt: string
  }
}

const PRESETS = [
  { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20240620' },
  { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
  { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
  { label: 'DeepSeek R1', value: 'deepseek-reasoner' },
]

const statusConfig = {
  pass: { icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', glow: 'shadow-[0_0_80px_rgba(52,211,153,0.2)]' },
  caution: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', glow: 'shadow-[0_0_80px_rgba(251,191,36,0.2)]' },
  suspect: { icon: ShieldAlert, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', glow: 'shadow-[0_0_80px_rgba(249,115,22,0.2)]' },
  fail: { icon: ShieldX, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', glow: 'shadow-[0_0_80px_rgba(239,68,68,0.2)]' },
  error: { icon: XCircle, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200', glow: '' },
}

const probeIcons: Record<string, typeof Fingerprint> = {
  selfId: Fingerprint,
  math: Brain,
  logic: Brain,
  code: Code2,
  chinese: Languages,
}

export default function Home() {
  const [apiBase, setApiBase] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(PRESETS[0].value)
  const [customModel, setCustomModel] = useState('')
  const [testing, setTesting] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [showProbes, setShowProbes] = useState(false)

  const effectiveModel = customModel.trim() || model

  const handleDetect = async () => {
    if (!apiBase.trim() || !apiKey.trim()) return
    setTesting(true)
    setResult(null)
    setProgress('正在建立安全连接...')

    try {
      setProgress('Ping 连通性测试...')
      const pingRes = await fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_base: apiBase, api_key: apiKey, model: effectiveModel }),
      })
      const ping = await pingRes.json()

      if (!ping.ok) {
        setProgress('执行深度指纹分析 (预计 10-30 秒)...')
      } else {
        setProgress(`连接成功 (${ping.latency}ms) - 正在执行 5 项深度指纹分析...`)
      }

      const res = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_base: apiBase, api_key: apiKey, model: effectiveModel }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
      } else {
        setResult({
          status: 'error',
          verdict: '检测失败',
          verdictDetail: data.error || '未知错误',
          score: 0,
          avgLatency: 0,
          issues: [],
          probes: {},
          meta: { requestedModel: effectiveModel, modelFamily: '', responseModels: [], testedAt: new Date().toISOString() },
        })
      }
    } catch (e: any) {
      setResult({
        status: 'error',
        verdict: '网络错误',
        verdictDetail: e.message || '无法连接到检测服务器',
        score: 0, avgLatency: 0, issues: [], probes: {},
        meta: { requestedModel: effectiveModel, modelFamily: '', responseModels: [], testedAt: new Date().toISOString() },
      })
    } finally {
      setTesting(false)
      setProgress('')
    }
  }

  const handleReset = () => {
    setResult(null)
    setShowProbes(false)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      {/* Hero Section */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="text-center mb-16 relative z-20">
        <motion.div 
          animate={{ y: [-5, 5, -5] }} 
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-blue-100 shadow-sm mb-8 text-xs font-semibold text-blue-600"
        >
          <Sparkles className="h-4 w-4" />
          <span>全新 5 项深度指纹分析算法</span>
        </motion.div>
        
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]">
          你买的 API <br className="sm:hidden" />
          <span className="gradient-text-brand">掺水了吗？</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed font-medium">
          一键检测中转站是否用廉价模型冒充高端模型。<br className="hidden sm:block" />
          用数据说话，让掺水无所遁形。
        </p>
      </motion.div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            transition={{ duration: 0.5 }}
            className="relative z-20"
          >
            <div className="glass-panel p-6 sm:p-10 relative overflow-hidden group">
              {/* Subtle hover effect on the card */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Scanning Animation Overlay */}
              <AnimatePresence>
                {testing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center rounded-3xl"
                  >
                    <div className="relative w-full h-full overflow-hidden rounded-3xl">
                      <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(59,130,246,0.15)_50%,transparent_100%)] h-[20%] w-full animate-scan" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="relative">
                          <Activity className="h-14 w-14 text-blue-600 animate-pulse mb-6 relative z-10" />
                          <div className="absolute inset-0 bg-blue-400/30 blur-xl rounded-full animate-pulse-slow" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2 tracking-wide">正在分析模型指纹</h3>
                        <p className="text-sm text-blue-600 font-mono font-medium">{progress}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-8 relative z-10">
                {/* Inputs */}
                <div className="grid gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">API Base URL</label>
                    <input
                      value={apiBase}
                      onChange={(e) => setApiBase(e.target.value)}
                      placeholder="https://api.example.com/v1"
                      disabled={testing}
                      className="glass-input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">API Key</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      disabled={testing}
                      className="glass-input w-full font-mono text-sm tracking-widest"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3 ml-1">你购买的模型</label>
                    <div className="flex flex-wrap gap-2.5 mb-3">
                      {PRESETS.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => { setModel(p.value); setCustomModel('') }}
                          disabled={testing}
                          className={cn(
                            'px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 border shadow-sm',
                            model === p.value && !customModel
                              ? 'bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-500/20'
                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <input
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder="或输入自定义模型名（如 claude-3-opus-20240229）"
                      disabled={testing}
                      className="glass-input w-full text-sm"
                    />
                  </div>
                </div>

                {/* Action */}
                <div className="pt-4">
                  <button
                    onClick={handleDetect}
                    disabled={testing || !apiBase.trim() || !apiKey.trim()}
                    className={cn(
                      'w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-bold transition-all duration-300',
                      testing || !apiBase.trim() || !apiKey.trim()
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                        : 'btn-primary'
                    )}
                  >
                    <Play className="h-5 w-5" fill="currentColor" />
                    开始深度检测
                  </button>
                  <div className="flex items-center justify-center gap-2 mt-5 text-slate-400 font-medium">
                    <Info className="h-4 w-4" />
                    <p className="text-xs">检测消耗 &lt; 500 token，安全无痕</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="relative z-20 space-y-6"
          >
            {/* Verdict Card */}
            <ResultCard result={result} />

            {/* Issues */}
            {result.issues.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6 sm:p-8 space-y-5">
                <h3 className="text-sm font-bold tracking-wide text-slate-800 uppercase flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  异常报告
                </h3>
                <div className="space-y-3">
                  {result.issues.map((issue, i) => (
                    <div key={i} className={cn(
                      'flex items-start gap-4 px-5 py-4 rounded-2xl border bg-white shadow-sm',
                      issue.severity === 'critical' ? 'border-red-200' : 'border-amber-200'
                    )}>
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full shrink-0',
                        issue.severity === 'critical' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                      )}>
                        {issue.severity === 'critical' ? <ShieldX className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                      </div>
                      <div className="pt-0.5">
                        <span className={cn(
                          'text-xs font-bold uppercase tracking-wider mb-1.5 block',
                          issue.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                        )}>
                          {issue.probe}
                        </span>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">{issue.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Probe Details */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel overflow-hidden">
              <button
                onClick={() => setShowProbes(!showProbes)}
                className="w-full flex items-center justify-between px-6 py-5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50/50 transition-colors"
              >
                <span className="font-bold tracking-wide">探针详情分析 (5 项)</span>
                {showProbes ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              <AnimatePresence>
                {showProbes && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-slate-50/50"
                  >
                    <div className="border-t border-slate-100 divide-y divide-slate-100">
                      {Object.entries(result.probes).map(([key, probe]) => {
                        const Icon = probeIcons[key] || Brain
                        return (
                          <div key={key} className="px-6 py-5 flex items-start gap-4 hover:bg-white transition-colors">
                            <div className={cn(
                              'flex h-10 w-10 items-center justify-center rounded-xl shrink-0 border shadow-sm bg-white',
                              probe.success ? 'border-slate-200 text-slate-500' : 'border-red-200 text-red-500'
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-sm font-bold text-slate-800">{probe.name}</span>
                                {probe.success ? (
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                              <p className="text-sm text-slate-600 leading-relaxed">{probe.detail}</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-400 pt-1 bg-white px-2.5 py-1 rounded-md border border-slate-100 shadow-sm">
                              <Clock className="h-3.5 w-3.5" />
                              {probe.latency}ms
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Re-test */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="pt-4">
              <button
                onClick={handleReset}
                className="mx-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:shadow-md transition-all duration-300"
              >
                <RotateCcw className="h-4 w-4" />
                返回重新检测
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Features Grid */}
      <div className="mt-32 mb-16 relative z-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-3">多维交叉验证</h2>
          <p className="text-base text-slate-500 font-medium">通过 5 个精心设计的探针，从多个维度评估 API 真实性</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { icon: Fingerprint, title: '身份指纹', desc: '验证模型自我认知与返回头标识的一致性' },
            { icon: Brain, title: '认知边界', desc: '通过特定的逻辑陷阱题，区分高端与廉价模型' },
            { icon: Code2, title: '代码生成', desc: '评估代码的类型标注、边界处理和算法优化能力' },
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

function ResultCard({ result }: { result: DetectionResult }) {
  const config = statusConfig[result.status]
  const Icon = config.icon

  return (
    <div className={cn('glass-panel p-8 sm:p-12 text-center relative overflow-hidden bg-white', config.glow)}>
      {/* Decorative background glow */}
      <div className={cn('absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-lg blur-[100px] opacity-40 pointer-events-none', config.bg)} />
      
      <div className="relative z-10">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <div className={cn('flex h-24 w-24 items-center justify-center rounded-full border-4 shadow-xl bg-white', config.border)}>
            <Icon className={cn('h-12 w-12', config.color)} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className={cn('text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight', config.color)}>{result.verdict}</h2>
          <p className="text-base text-slate-600 mb-10 max-w-lg mx-auto leading-relaxed font-medium">{result.verdictDetail}</p>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className={cn('text-4xl font-black mb-1.5', config.color)}>{result.score}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">综合评分</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <Zap className="h-6 w-6 text-amber-500" />
                <p className="text-4xl font-black text-slate-800">{result.avgLatency || '—'}</p>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">平均延迟(ms)</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="text-4xl font-black text-slate-800 mb-1.5">{result.issues.length}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">发现异常</p>
            </div>
          </div>

          {result.meta.responseModels.length > 0 && (
            <div className="mt-10 pt-6 border-t border-slate-100 inline-flex flex-col items-center">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-500 font-medium">请求模型</span>
                <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs border border-slate-200 font-semibold shadow-sm">{result.meta.requestedModel}</span>
                <span className="text-slate-300 font-bold">&rarr;</span>
                <span className="text-slate-500 font-medium">实际返回</span>
                <span className={cn(
                  'px-3 py-1.5 rounded-lg font-mono text-xs border font-semibold shadow-sm',
                  result.meta.responseModels.length === 1 ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                )}>
                  {result.meta.responseModels.join(', ') || '未知'}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

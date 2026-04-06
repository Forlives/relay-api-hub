import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, ShieldAlert, ShieldX, AlertTriangle,
  Play, Loader2, RotateCcw, ChevronDown, ChevronUp,
  Zap, Brain, Code2, Languages, Fingerprint, Clock,
  CheckCircle, XCircle, Info
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
  { label: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6-20250514' },
  { label: 'Claude Opus 4.6', value: 'claude-opus-4-6-20250514' },
  { label: 'GPT-5.4', value: 'gpt-5.4' },
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'Gemini 3.1 Pro', value: 'gemini-3.1-pro' },
  { label: 'DeepSeek R1', value: 'deepseek-r1' },
]

const statusConfig = {
  pass: { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20', glow: 'shadow-[0_0_40px_rgba(52,211,153,0.15)]' },
  caution: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', ring: 'ring-yellow-500/20', glow: 'shadow-[0_0_40px_rgba(250,204,21,0.15)]' },
  suspect: { icon: ShieldAlert, color: 'text-orange-400', bg: 'bg-orange-500/10', ring: 'ring-orange-500/20', glow: 'shadow-[0_0_40px_rgba(251,146,60,0.15)]' },
  fail: { icon: ShieldX, color: 'text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-500/20', glow: 'shadow-[0_0_40px_rgba(248,113,113,0.15)]' },
  error: { icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-500/10', ring: 'ring-gray-500/20', glow: '' },
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
    setProgress('正在连接 API 端点...')

    try {
      // Quick ping first
      setProgress('检测连通性...')
      const pingRes = await fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_base: apiBase, api_key: apiKey, model: effectiveModel }),
      })
      const ping = await pingRes.json()

      if (!ping.ok) {
        setProgress('运行 5 项深度检测（约 10-30 秒）...')
      } else {
        setProgress(`连接成功（${ping.latency}ms），正在运行 5 项深度检测...`)
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
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-16">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-[0_0_40px_rgba(59,130,246,0.3)]">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 border-2 border-gray-950 animate-pulse" />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-3">
          你买的 API 掺水了吗？
        </h1>
        <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          粘贴你的 API 地址和 Key，一键检测中转站是否用廉价模型冒充高端模型
        </p>
      </motion.div>

      {/* Input Form */}
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-6 sm:p-8 space-y-5"
          >
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">API Base URL</label>
              <input
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                placeholder="https://api.example.com/v1"
                disabled={testing}
                className="w-full bg-gray-800/60 border border-gray-700/40 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all disabled:opacity-50"
              />
              <p className="text-[11px] text-gray-600 mt-1">中转站给你的 API 地址，一般以 /v1 结尾</p>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                disabled={testing}
                className="w-full bg-gray-800/60 border border-gray-700/40 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">你购买的模型</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => { setModel(p.value); setCustomModel('') }}
                    disabled={testing}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      model === p.value && !customModel
                        ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
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
                className="w-full bg-gray-800/60 border border-gray-700/40 rounded-xl px-4 py-2.5 text-xs text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all disabled:opacity-50"
              />
            </div>

            <button
              onClick={handleDetect}
              disabled={testing || !apiBase.trim() || !apiKey.trim()}
              className={cn(
                'w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-semibold transition-all',
                testing || !apiBase.trim() || !apiKey.trim()
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]'
              )}
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {progress || '检测中...'}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  开始检测
                </>
              )}
            </button>

            <div className="flex items-start gap-2 pt-1">
              <Info className="h-3.5 w-3.5 text-gray-600 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-gray-600 leading-relaxed">
                检测会向你的 API 发送 5 个小请求（总消耗不超过 500 token），用于验证模型身份、推理能力和代码质量。Key 不会被存储。
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-5"
          >
            {/* Verdict Card */}
            <ResultCard result={result} />

            {/* Issues */}
            {result.issues.length > 0 && (
              <div className="glass-card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-300">发现的问题</h3>
                {result.issues.map((issue, i) => (
                  <div key={i} className={cn(
                    'flex items-start gap-3 px-4 py-3 rounded-xl',
                    issue.severity === 'critical' ? 'bg-red-500/5 border border-red-500/10' : 'bg-yellow-500/5 border border-yellow-500/10'
                  )}>
                    {issue.severity === 'critical' ? (
                      <ShieldX className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <span className={cn(
                        'text-xs font-medium',
                        issue.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
                      )}>
                        [{issue.probe}]
                      </span>
                      <p className="text-sm text-gray-300 mt-0.5">{issue.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Probe Details */}
            <div className="glass-card overflow-hidden">
              <button
                onClick={() => setShowProbes(!showProbes)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                <span className="font-medium">检测详情（5 项探针）</span>
                {showProbes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <AnimatePresence>
                {showProbes && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-800/40 divide-y divide-gray-800/30">
                      {Object.entries(result.probes).map(([key, probe]) => {
                        const Icon = probeIcons[key] || Brain
                        return (
                          <div key={key} className="px-5 py-3.5 flex items-start gap-3">
                            <div className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-lg mt-0.5',
                              probe.success ? 'bg-gray-800/60 text-gray-400' : 'bg-red-500/10 text-red-400'
                            )}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-200">{probe.name}</span>
                                {probe.success ? (
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-red-400" />
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{probe.detail}</p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {probe.latency}ms
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Re-test */}
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium bg-gray-800/50 text-gray-400 hover:text-gray-200 hover:bg-gray-800/80 transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              重新检测
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How it works */}
      <div className="mt-16 space-y-6">
        <h2 className="text-center text-lg font-semibold text-gray-300">检测原理</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Fingerprint, title: '身份验证', desc: '让模型自报家门，对比请求模型与实际回答的模型标识是否匹配' },
            { icon: Brain, title: '智力测试', desc: '发送数学和逻辑题，高端模型能答对而廉价替代模型容易答错' },
            { icon: Code2, title: '质量评估', desc: '测试代码生成质量和语言理解力，从产出水平判断模型档次' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card p-5 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 mx-auto mb-3">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-200 mb-1.5">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
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
    <div className={cn('glass-card p-6 sm:p-8 text-center', config.glow)}>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        className="flex justify-center mb-4"
      >
        <div className={cn('flex h-20 w-20 items-center justify-center rounded-full ring-2', config.bg, config.ring)}>
          <Icon className={cn('h-10 w-10', config.color)} />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className={cn('text-2xl font-bold mb-1', config.color)}>{result.verdict}</h2>
        <p className="text-sm text-gray-400 mb-4">{result.verdictDetail}</p>

        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="text-center">
            <p className={cn('text-2xl font-bold', config.color)}>{result.score}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">纯净度评分</p>
          </div>
          <div className="h-8 w-px bg-gray-800" />
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Zap className="h-4 w-4 text-yellow-500" />
              <p className="text-2xl font-bold text-gray-200">{result.avgLatency || '—'}</p>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">平均延迟(ms)</p>
          </div>
          <div className="h-8 w-px bg-gray-800" />
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-200">{result.issues.length}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">发现问题</p>
          </div>
        </div>

        {result.meta.responseModels.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-800/40">
            <p className="text-xs text-gray-500">
              请求模型: <span className="text-gray-300">{result.meta.requestedModel}</span>
              {' '}&rarr;{' '}
              实际返回: <span className={cn(
                result.meta.responseModels.length === 1 ? 'text-gray-300' : 'text-yellow-400'
              )}>
                {result.meta.responseModels.join(', ') || '未知'}
              </span>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

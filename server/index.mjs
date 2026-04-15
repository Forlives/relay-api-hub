import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json())

// ═══════════════════════════════════════════════════════════════
//  Official Model Baselines — what real APIs look like
// ═══════════════════════════════════════════════════════════════
const BASELINES = {
  'claude': {
    label: 'Claude (Anthropic)',
    knowledgeCutoff: /2025\s*年?\s*5\s*月|2025[-\/\.]\s*0?5|May\s*2025/i,
    knowledgeCutoffLabel: '2025 年 5 月',
    identityPatterns: [/claude/i, /anthropic/i, /sonnet/i, /opus/i, /haiku/i],
    negativeIdentity: [/glm|chatglm/i, /deepseek/i, /minimax|abab/i, /qwen|通义/i, /gpt|openai/i, /grok/i, /baichuan/i, /yi-/i, /文心|ernie/i, /kimi|moonshot/i],
    sseEvents: ['message_start', 'content_block_start', 'content_block_delta', 'content_block_stop', 'message_delta', 'message_stop'],
    supportThinking: true,
    thinkingBlocks: ['thinking', 'text'],
    usageFields: { inputTokens: true, outputTokens: true, cacheRead: true, cacheCreation: true },
    streamEndpoint: '/v1/messages',
    apiFormat: 'anthropic',
  },
  'gpt': {
    label: 'GPT (OpenAI)',
    knowledgeCutoff: /2025\s*年?\s*(10|11|12)\s*月|2025[-\/\.]\s*(10|11|12)|Oct(ober)?\s*2025|Nov(ember)?\s*2025|Dec(ember)?\s*2025/i,
    knowledgeCutoffLabel: '2025 年 10 月+',
    identityPatterns: [/gpt/i, /openai/i, /chatgpt/i],
    negativeIdentity: [/claude|anthropic/i, /glm|chatglm/i, /deepseek/i, /minimax/i, /qwen|通义/i, /grok/i],
    sseEvents: null,
    supportThinking: false,
    thinkingBlocks: null,
    usageFields: { prompt_tokens: true, completion_tokens: true, total_tokens: true },
    streamEndpoint: '/v1/chat/completions',
    apiFormat: 'openai',
  },
  'gemini': {
    label: 'Gemini (Google)',
    knowledgeCutoff: /2025/i,
    knowledgeCutoffLabel: '2025 年',
    identityPatterns: [/gemini/i, /google/i],
    negativeIdentity: [/claude|anthropic/i, /gpt|openai/i, /glm/i, /deepseek/i, /minimax/i, /qwen/i],
    sseEvents: null,
    supportThinking: false,
    thinkingBlocks: null,
    usageFields: { prompt_tokens: true, completion_tokens: true },
    streamEndpoint: '/v1/chat/completions',
    apiFormat: 'openai',
  },
  'deepseek': {
    label: 'DeepSeek',
    knowledgeCutoff: /2025/i,
    knowledgeCutoffLabel: '2025 年',
    identityPatterns: [/deepseek/i],
    negativeIdentity: [/claude|anthropic/i, /gpt|openai/i, /glm/i, /minimax/i, /qwen/i],
    sseEvents: null,
    supportThinking: false,
    thinkingBlocks: null,
    usageFields: { prompt_tokens: true, completion_tokens: true },
    streamEndpoint: '/v1/chat/completions',
    apiFormat: 'openai',
  },
}

function getModelFamily(model) {
  const m = model.toLowerCase()
  if (m.includes('claude') || m.includes('sonnet') || m.includes('opus') || m.includes('haiku')) return 'claude'
  if (m.includes('gpt') || m.includes('o1') || m.includes('o3') || m.includes('o4')) return 'gpt'
  if (m.includes('gemini')) return 'gemini'
  if (m.includes('deepseek')) return 'deepseek'
  return 'unknown'
}

async function fetchWithTimeout(url, options, timeoutMs = 30000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

// ═══════════════════════════════════════════════════════════════
//  Dimension 1: SSE Protocol Fingerprint (Anthropic-native stream)
// ═══════════════════════════════════════════════════════════════
async function probeSSEProtocol(apiBase, apiKey, model, family) {
  const baseline = BASELINES[family]
  if (!baseline || baseline.apiFormat !== 'anthropic') {
    return { applicable: false, reason: '该模型家族使用 OpenAI 格式，SSE 协议指纹仅适用于 Anthropic 原生接口' }
  }

  const url = `${apiBase}${baseline.streamEndpoint}`
  const start = Date.now()
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'interleaved-thinking-2025-05-14',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: [{ type: 'text', text: '你是谁？请简要回答。' }] }],
        max_tokens: 2000,
        stream: true,
        thinking: { type: 'enabled', budget_tokens: 1999 },
      }),
    }, 60000)

    const latency = Date.now() - start
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { applicable: true, score: 0, latency, events: [], error: `HTTP ${res.status}: ${body.slice(0, 200)}` }
    }

    const text = await res.text()
    const lines = text.split('\n')
    const events = []
    const eventTypes = []
    const contentBlockTypes = []
    const deltaTypes = []
    let messageStartModel = null
    let inputTokens = null
    let outputTokens = null
    let hasThinkingBlock = false
    let hasTextBlock = false
    let responseText = ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') break
      try {
        const evt = JSON.parse(data)
        const type = evt.type || ''
        if (type) eventTypes.push(type)

        if (type === 'message_start') {
          messageStartModel = evt.message?.model
          inputTokens = evt.message?.usage?.input_tokens
        }
        if (type === 'content_block_start') {
          const bt = evt.content_block?.type
          if (bt) contentBlockTypes.push(bt)
          if (bt === 'thinking') hasThinkingBlock = true
          if (bt === 'text') hasTextBlock = true
        }
        if (type === 'content_block_delta') {
          const dt = evt.delta?.type
          if (dt) deltaTypes.push(dt)
          if (dt === 'text_delta') responseText += evt.delta?.text || ''
        }
        if (type === 'message_delta') {
          outputTokens = evt.usage?.output_tokens
        }
        events.push({ type, preview: JSON.stringify(evt).slice(0, 120) })
      } catch {}
    }

    const expectedEvents = baseline.sseEvents
    const matchedEvents = expectedEvents.filter(e => eventTypes.includes(e))
    const eventScore = Math.round((matchedEvents.length / expectedEvents.length) * 40)

    const thinkingScore = (hasThinkingBlock ? 15 : 0) + (hasTextBlock ? 10 : 0) + (deltaTypes.includes('thinking_delta') ? 10 : 0)

    const usageScore = (inputTokens != null && inputTokens > 0 ? 12 : 0) + (outputTokens != null && outputTokens > 0 ? 13 : 0)

    const total = Math.min(100, eventScore + thinkingScore + usageScore)

    return {
      applicable: true,
      score: total,
      latency,
      eventScore,
      thinkingScore,
      usageScore,
      matchedEvents,
      expectedEvents,
      messageStartModel,
      hasThinkingBlock,
      hasTextBlock,
      inputTokens,
      outputTokens,
      responseText,
    }
  } catch (e) {
    return { applicable: true, score: 0, latency: Date.now() - start, error: e.message }
  }
}

// ═══════════════════════════════════════════════════════════════
//  Dimension 2: Model Identity Verification
// ═══════════════════════════════════════════════════════════════
async function probeIdentity(apiBase, apiKey, model, family) {
  const start = Date.now()
  try {
    const res = await fetchWithTimeout(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Answer honestly and directly.' },
          { role: 'user', content: '请问你是什么AI模型？你的开发者/公司是谁？请直接回答模型名和公司名。' }
        ],
        max_tokens: 200,
        temperature: 0,
      }),
    })
    const latency = Date.now() - start
    if (!res.ok) return { score: 0, latency, error: `HTTP ${res.status}` }
    const data = await res.json()
    const content = (data.choices?.[0]?.message?.content || '').trim()
    const responseModel = data.model || ''

    const baseline = BASELINES[family]
    let score = 0
    const details = []

    if (responseModel) {
      const respFamily = getModelFamily(responseModel)
      if (respFamily === family) {
        score += 40
        details.push({ check: '返回头模型标识', pass: true, note: `"${responseModel}" 属于 ${baseline?.label || family}` })
      } else {
        details.push({ check: '返回头模型标识', pass: false, note: `"${responseModel}" 不属于 ${baseline?.label || family}` })
      }
    }

    if (baseline) {
      const matchesIdentity = baseline.identityPatterns.some(p => p.test(content))
      const matchesNegative = baseline.negativeIdentity.some(p => p.test(content))

      if (matchesNegative) {
        details.push({ check: '自我身份声明', pass: false, note: `模型自称为非 ${baseline.label} 的身份` })
      } else if (matchesIdentity) {
        score += 60
        details.push({ check: '自我身份声明', pass: true, note: `模型正确声称自己是 ${baseline.label}` })
      } else {
        score += 20
        details.push({ check: '自我身份声明', pass: null, note: '身份声明不够明确' })
      }
    }

    return { score: Math.min(100, score), latency, content, responseModel, details }
  } catch (e) {
    return { score: 0, latency: Date.now() - start, error: e.message }
  }
}

// ═══════════════════════════════════════════════════════════════
//  Dimension 3: Knowledge Cutoff Verification
// ═══════════════════════════════════════════════════════════════
async function probeKnowledgeCutoff(apiBase, apiKey, model, family) {
  const start = Date.now()
  try {
    const res = await fetchWithTimeout(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: '你的训练数据/知识库的截止时间是什么时候？请直接回答具体的年份和月份。' }],
        max_tokens: 200,
        temperature: 0,
      }),
    })
    const latency = Date.now() - start
    if (!res.ok) return { score: 0, latency, error: `HTTP ${res.status}` }
    const data = await res.json()
    const content = (data.choices?.[0]?.message?.content || '').trim()

    const baseline = BASELINES[family]
    let score = 0
    let matchType = 'unknown'

    if (baseline?.knowledgeCutoff?.test(content)) {
      score = 100
      matchType = 'exact'
    } else if (/2025/i.test(content)) {
      score = 50
      matchType = 'year_only'
    } else if (/2024/i.test(content)) {
      score = 20
      matchType = 'outdated'
    } else {
      score = 0
      matchType = 'unknown'
    }

    return {
      score,
      latency,
      content,
      matchType,
      expectedCutoff: baseline?.knowledgeCutoffLabel || '未知',
    }
  } catch (e) {
    return { score: 0, latency: Date.now() - start, error: e.message }
  }
}

// ═══════════════════════════════════════════════════════════════
//  Dimension 4: Reasoning Capability (vs cheap model baseline)
// ═══════════════════════════════════════════════════════════════
async function probeReasoning(apiBase, apiKey, model) {
  const tests = [
    {
      name: '数学陷阱',
      prompt: 'A farmer has 17 sheep. All but 9 run away. How many sheep does the farmer have left? Answer with JUST the number.',
      expected: 9,
    },
    {
      name: '逻辑推理',
      prompt: 'If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets? Answer with JUST the number of minutes.',
      expected: 5,
    },
  ]

  const results = []
  let totalScore = 0

  for (const test of tests) {
    const start = Date.now()
    try {
      const res = await fetchWithTimeout(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: test.prompt }],
          max_tokens: 20,
          temperature: 0,
        }),
      })
      const latency = Date.now() - start
      if (!res.ok) {
        results.push({ name: test.name, pass: false, latency, error: `HTTP ${res.status}` })
        continue
      }
      const data = await res.json()
      const content = (data.choices?.[0]?.message?.content || '').trim()
      const answer = parseInt(content)
      const pass = answer === test.expected
      if (pass) totalScore += 50
      results.push({ name: test.name, pass, answer: content, expected: test.expected, latency })
    } catch (e) {
      results.push({ name: test.name, pass: false, latency: Date.now() - start, error: e.message })
    }
  }

  return { score: totalScore, tests: results }
}

// ═══════════════════════════════════════════════════════════════
//  Dimension 5: Code Generation Quality
// ═══════════════════════════════════════════════════════════════
async function probeCodeQuality(apiBase, apiKey, model) {
  const start = Date.now()
  try {
    const res = await fetchWithTimeout(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Write a Python function that checks if a number is prime. Use type hints. Just the function, no explanation.' }],
        max_tokens: 400,
        temperature: 0,
      }),
    })
    const latency = Date.now() - start
    if (!res.ok) return { score: 0, latency, error: `HTTP ${res.status}` }
    const data = await res.json()
    const content = (data.choices?.[0]?.message?.content || '').trim()

    const checks = [
      { name: '类型标注', pass: /-> bool/.test(content) || /: int/.test(content), weight: 25, official: '官方模型 100% 会使用类型标注' },
      { name: '边界处理', pass: /<= 1|< 2|== 1/.test(content), weight: 25, official: '官方模型会处理 0/1/负数等边界' },
      { name: 'sqrt 优化', pass: /sqrt|isqrt|\*\* 0\.5/.test(content), weight: 25, official: '官方模型通常会用 sqrt 优化' },
      { name: '代码规范', pass: /def /.test(content) && /return /.test(content), weight: 25, official: '基本的函数定义和返回值' },
    ]

    const score = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0)
    const usage = data.usage || {}
    const completionTokens = usage.completion_tokens || Math.ceil(content.length / 4)
    const tps = Math.round((completionTokens / (latency / 1000)) * 10) / 10

    return { score, latency, checks, tps, content }
  } catch (e) {
    return { score: 0, latency: Date.now() - start, error: e.message }
  }
}

// ═══════════════════════════════════════════════════════════════
//  Dimension 6: Response Consistency (same prompt twice)
// ═══════════════════════════════════════════════════════════════
async function probeConsistency(apiBase, apiKey, model) {
  const prompt = '用一句话介绍量子计算。'
  const results = []

  for (let i = 0; i < 2; i++) {
    const start = Date.now()
    try {
      const res = await fetchWithTimeout(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0,
        }),
      })
      const latency = Date.now() - start
      if (!res.ok) {
        results.push({ latency, error: `HTTP ${res.status}` })
        continue
      }
      const data = await res.json()
      const content = (data.choices?.[0]?.message?.content || '').trim()
      const responseModel = data.model || ''
      results.push({ latency, content, responseModel })
    } catch (e) {
      results.push({ latency: Date.now() - start, error: e.message })
    }
  }

  if (results.length < 2 || results.some(r => r.error)) {
    return { score: 0, results, modelConsistent: null }
  }

  const modelConsistent = results[0].responseModel === results[1].responseModel
  const latencyDiff = Math.abs(results[0].latency - results[1].latency)
  const latencyRatio = Math.min(results[0].latency, results[1].latency) / Math.max(results[0].latency, results[1].latency)

  let score = 0
  if (modelConsistent) score += 50
  if (latencyRatio > 0.5) score += 25
  if (results[0].content && results[1].content) score += 25

  return {
    score,
    results: results.map(r => ({ latency: r.latency, responseModel: r.responseModel, contentPreview: (r.content || '').slice(0, 80) })),
    modelConsistent,
    latencyDiff,
  }
}

// ═══════════════════════════════════════════════════════════════
//  Main Detection Endpoint
// ═══════════════════════════════════════════════════════════════
app.post('/api/detect', async (req, res) => {
  const { api_base, api_key, model } = req.body
  if (!api_base || !api_key || !model) {
    return res.status(400).json({ error: '请填写完整：API 地址、Key 和模型名称' })
  }

  const base = api_base.replace(/\/+$/, '')
  const family = getModelFamily(model)
  const baseline = BASELINES[family] || null

  const [sseResult, identityResult, cutoffResult, reasoningResult, codeResult, consistencyResult] = await Promise.all([
    probeSSEProtocol(base, api_key, model, family),
    probeIdentity(base, api_key, model, family),
    probeKnowledgeCutoff(base, api_key, model, family),
    probeReasoning(base, api_key, model),
    probeCodeQuality(base, api_key, model),
    probeConsistency(base, api_key, model),
  ])

  const dimensions = [
    {
      key: 'sse',
      name: 'SSE 协议指纹',
      desc: '流式响应事件格式是否匹配官方 Anthropic SSE 规范',
      icon: 'Fingerprint',
      applicable: sseResult.applicable !== false,
      score: sseResult.applicable === false ? null : sseResult.score,
      officialBaseline: '官方 API 会返回 message_start → content_block_start → content_block_delta → message_delta → message_stop 完整事件链',
      detail: sseResult,
    },
    {
      key: 'identity',
      name: '模型身份验证',
      desc: '返回头中的 model 字段 + 模型自我声明是否匹配',
      icon: 'UserCheck',
      applicable: true,
      score: identityResult.score,
      officialBaseline: `官方 ${baseline?.label || model} 会在返回头中标识正确的模型名，并正确自我介绍`,
      detail: identityResult,
    },
    {
      key: 'cutoff',
      name: '知识截止验证',
      desc: '训练数据截止时间是否匹配官方公布的版本',
      icon: 'Calendar',
      applicable: true,
      score: cutoffResult.score,
      officialBaseline: `官方 ${baseline?.label || model} 知识截止时间为 ${baseline?.knowledgeCutoffLabel || '未知'}`,
      detail: cutoffResult,
    },
    {
      key: 'reasoning',
      name: '推理能力基线',
      desc: '数学/逻辑推理能力是否达到该模型档次的水平',
      icon: 'Brain',
      applicable: true,
      score: reasoningResult.score,
      officialBaseline: '官方高端模型（Claude 4.6/GPT-5.4）在这些基础推理题上正确率 100%',
      detail: reasoningResult,
    },
    {
      key: 'code',
      name: '代码生成质量',
      desc: '代码的类型标注、边界处理、算法优化是否达标',
      icon: 'Code2',
      applicable: true,
      score: codeResult.score,
      officialBaseline: '官方高端模型生成的代码 100% 具备类型标注、边界处理和 sqrt 优化',
      detail: codeResult,
    },
    {
      key: 'consistency',
      name: '响应一致性',
      desc: '多次请求的模型标识和响应延迟是否一致',
      icon: 'Repeat',
      applicable: true,
      score: consistencyResult.score,
      officialBaseline: '官方 API 多次请求的 model 字段完全一致，延迟波动在合理范围',
      detail: consistencyResult,
    },
  ]

  const applicableDims = dimensions.filter(d => d.applicable && d.score !== null)
  const totalScore = applicableDims.length > 0
    ? Math.round(applicableDims.reduce((s, d) => s + d.score, 0) / applicableDims.length)
    : 0

  const failDims = applicableDims.filter(d => d.score < 30)
  const warnDims = applicableDims.filter(d => d.score >= 30 && d.score < 60)

  let status, verdict, verdictDetail
  if (failDims.length >= 2) {
    status = 'fail'
    verdict = '高度疑似掺水'
    verdictDetail = `${failDims.length} 个维度严重不达标，该 API 端点很可能没有使用你购买的模型`
  } else if (failDims.length === 1) {
    status = 'suspect'
    verdict = '存在可疑迹象'
    verdictDetail = `"${failDims[0].name}" 检测严重异常，建议谨慎使用并联系服务商确认`
  } else if (warnDims.length >= 2) {
    status = 'caution'
    verdict = '轻微异常'
    verdictDetail = `${warnDims.length} 个维度存在偏差，可能是模型版本差异或服务商自定义导致`
  } else {
    status = 'pass'
    verdict = '检测通过'
    verdictDetail = '各项维度检测均与官方基线匹配，该 API 看起来是正品'
  }

  const latencies = applicableDims.map(d => d.detail.latency).filter(Boolean)
  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0

  res.json({
    status,
    verdict,
    verdictDetail,
    score: totalScore,
    avgLatency,
    dimensions,
    meta: {
      requestedModel: model,
      modelFamily: family,
      baselineLabel: baseline?.label || '未知',
      testedAt: new Date().toISOString(),
    },
  })
})

// 查询 API 可用模型列表
app.post('/api/models', async (req, res) => {
  const { api_base, api_key } = req.body
  if (!api_base || !api_key) {
    return res.status(400).json({ error: '请填写 API 地址和 Key' })
  }

  const base = api_base.replace(/\/+$/, '')
  try {
    const r = await fetchWithTimeout(`${base}/models`, {
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      },
    }, 15000)

    if (!r.ok) {
      const body = await r.text().catch(() => '')
      return res.status(r.status).json({ error: `API 返回 ${r.status}: ${body.slice(0, 200)}` })
    }

    const data = await r.json()
    let models = []

    if (Array.isArray(data?.data)) {
      models = data.data.map(m => ({
        id: m.id,
        owned_by: m.owned_by || '',
        created: m.created || null,
      }))
    } else if (Array.isArray(data)) {
      models = data.map(m => typeof m === 'string' ? { id: m } : { id: m.id || m.name || String(m), owned_by: m.owned_by || '' })
    }

    models.sort((a, b) => a.id.localeCompare(b.id))

    res.json({ models, total: models.length })
  } catch (e) {
    res.status(500).json({ error: `请求失败: ${e.message}` })
  }
})

// Quick ping
app.post('/api/ping', async (req, res) => {
  const { api_base, api_key } = req.body
  const base = (api_base || '').replace(/\/+$/, '')
  const start = Date.now()
  try {
    const r = await fetchWithTimeout(`${base}/models`, { headers: { 'Authorization': `Bearer ${api_key}` } }, 10000)
    res.json({ ok: r.ok, latency: Date.now() - start, status: r.status })
  } catch (e) {
    res.json({ ok: false, latency: Date.now() - start, error: e.message })
  }
})

// Static files
const distPath = join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')))
}

const PORT = process.env.PORT || 3721
app.listen(PORT, () => {
  console.log(`API Purity Detector running on http://localhost:${PORT}`)
})

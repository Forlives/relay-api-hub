import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json())

// ─── Model Fingerprint Database ───
// Known behaviors for each model family to detect substitution
const MODEL_FINGERPRINTS = {
  'claude': {
    keywords: ['claude', 'anthropic'],
    canSolveHard: true,
    typicalTPS: { min: 15, max: 120 },
    knownSelfId: /claude|anthropic/i,
  },
  'gpt': {
    keywords: ['gpt', 'openai', 'chatgpt'],
    canSolveHard: true,
    typicalTPS: { min: 20, max: 150 },
    knownSelfId: /gpt|openai/i,
  },
  'gemini': {
    keywords: ['gemini', 'google'],
    canSolveHard: true,
    typicalTPS: { min: 20, max: 200 },
    knownSelfId: /gemini|google/i,
  },
}

function getModelFamily(model) {
  const m = model.toLowerCase()
  if (m.includes('claude') || m.includes('sonnet') || m.includes('opus') || m.includes('haiku')) return 'claude'
  if (m.includes('gpt') || m.includes('o1') || m.includes('o3') || m.includes('o4')) return 'gpt'
  if (m.includes('gemini')) return 'gemini'
  if (m.includes('deepseek')) return 'deepseek'
  if (m.includes('glm') || m.includes('chatglm')) return 'glm'
  if (m.includes('qwen')) return 'qwen'
  return 'unknown'
}

// ─── Detection Probes ───

// Probe 1: Self-identification — ask the model who it is
async function probeSelfId(apiBase, apiKey, model) {
  const start = Date.now()
  try {
    const res = await fetchWithTimeout(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Answer honestly and directly.' },
          { role: 'user', content: 'What AI model are you? Just tell me your model name and version, nothing else.' }
        ],
        max_tokens: 100,
        temperature: 0,
      }),
    })
    const latency = Date.now() - start
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { success: false, latency, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` }
    }
    const data = await res.json()
    const content = (data.choices?.[0]?.message?.content || '').trim()
    const responseModel = data.model || ''
    return { success: true, latency, content, responseModel, usage: data.usage }
  } catch (e) {
    return { success: false, latency: Date.now() - start, error: e.message }
  }
}

// Probe 2: Math reasoning — something cheap models often get wrong
async function probeMathReasoning(apiBase, apiKey, model) {
  const start = Date.now()
  try {
    const res = await fetchWithTimeout(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: 'A farmer has 17 sheep. All but 9 run away. How many sheep does the farmer have left? Answer with JUST the number, nothing else.'
        }],
        max_tokens: 10,
        temperature: 0,
      }),
    })
    const latency = Date.now() - start
    if (!res.ok) return { success: false, latency, error: `HTTP ${res.status}` }
    const data = await res.json()
    const content = (data.choices?.[0]?.message?.content || '').trim()
    const answer = parseInt(content)
    return { success: true, latency, content, correct: answer === 9, responseModel: data.model, usage: data.usage }
  } catch (e) {
    return { success: false, latency: Date.now() - start, error: e.message }
  }
}

// Probe 3: Logic puzzle — distinguishes high-end from cheap models
async function probeLogicPuzzle(apiBase, apiKey, model) {
  const start = Date.now()
  try {
    const res = await fetchWithTimeout(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: 'If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets? Just answer the number of minutes.'
        }],
        max_tokens: 20,
        temperature: 0,
      }),
    })
    const latency = Date.now() - start
    if (!res.ok) return { success: false, latency, error: `HTTP ${res.status}` }
    const data = await res.json()
    const content = (data.choices?.[0]?.message?.content || '').trim()
    const answer = parseInt(content)
    return { success: true, latency, content, correct: answer === 5, responseModel: data.model, usage: data.usage }
  } catch (e) {
    return { success: false, latency: Date.now() - start, error: e.message }
  }
}

// Probe 4: Code generation quality — cheap models produce notably worse code
async function probeCodeQuality(apiBase, apiKey, model) {
  const start = Date.now()
  try {
    const res = await fetchWithTimeout(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: 'Write a Python function that checks if a number is prime. Use type hints. Just the function, no explanation.'
        }],
        max_tokens: 300,
        temperature: 0,
      }),
    })
    const latency = Date.now() - start
    if (!res.ok) return { success: false, latency, error: `HTTP ${res.status}` }
    const data = await res.json()
    const content = (data.choices?.[0]?.message?.content || '').trim()
    const hasTypeHints = content.includes('-> bool') || content.includes(': int')
    const hasEdgeCases = content.includes('<= 1') || content.includes('< 2') || content.includes('== 1')
    const hasSqrtOpt = content.includes('sqrt') || content.includes('** 0.5') || content.includes('isqrt')
    const qualityScore = (hasTypeHints ? 30 : 0) + (hasEdgeCases ? 35 : 0) + (hasSqrtOpt ? 35 : 0)
    const usage = data.usage
    const completionTokens = usage?.completion_tokens || Math.ceil(content.length / 4)
    const tps = completionTokens / (latency / 1000)

    return { success: true, latency, content, qualityScore, hasTypeHints, hasEdgeCases, hasSqrtOpt, tps: Math.round(tps * 10) / 10, responseModel: data.model, usage }
  } catch (e) {
    return { success: false, latency: Date.now() - start, error: e.message }
  }
}

// Probe 5: Chinese understanding — GLM/Qwen substitution detection
async function probeChineseNuance(apiBase, apiKey, model) {
  const start = Date.now()
  try {
    const res = await fetchWithTimeout(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: 'Translate to English precisely: "这个瓜保熟吗？" — This is Chinese internet slang. Explain the literal AND the slang meaning in one sentence.'
        }],
        max_tokens: 150,
        temperature: 0,
      }),
    })
    const latency = Date.now() - start
    if (!res.ok) return { success: false, latency, error: `HTTP ${res.status}` }
    const data = await res.json()
    const content = (data.choices?.[0]?.message?.content || '').trim().toLowerCase()
    const getsSlang = content.includes('reliable') || content.includes('trust') || content.includes('guarantee') || content.includes('legit') || content.includes('assured') || content.includes('ripe')
    return { success: true, latency, content: data.choices?.[0]?.message?.content?.trim(), getsSlang, responseModel: data.model, usage: data.usage }
  } catch (e) {
    return { success: false, latency: Date.now() - start, error: e.message }
  }
}

async function fetchWithTimeout(url, options, timeoutMs = 30000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Main Detection Endpoint ───
app.post('/api/detect', async (req, res) => {
  const { api_base, api_key, model } = req.body
  if (!api_base || !api_key || !model) {
    return res.status(400).json({ error: '请填写完整：API 地址、Key 和模型名称' })
  }

  const base = api_base.replace(/\/+$/, '')
  const family = getModelFamily(model)
  const issues = []
  const probeResults = {}
  let totalLatency = 0
  let successCount = 0

  // Run all probes
  const [selfId, math, logic, code, chinese] = await Promise.all([
    probeSelfId(base, api_key, model),
    probeMathReasoning(base, api_key, model),
    probeLogicPuzzle(base, api_key, model),
    probeCodeQuality(base, api_key, model),
    probeChineseNuance(base, api_key, model),
  ])

  probeResults.selfId = selfId
  probeResults.math = math
  probeResults.logic = logic
  probeResults.code = code
  probeResults.chinese = chinese

  // ─── Analyze Results ───

  // 1. Connection check
  const allFailed = [selfId, math, logic, code, chinese].every(p => !p.success)
  if (allFailed) {
    return res.json({
      status: 'error',
      verdict: '连接失败',
      verdictDetail: '无法连接到 API 端点，请检查地址和 Key 是否正确',
      score: 0,
      issues: [{ severity: 'critical', probe: '连接', message: selfId.error || '所有探针均失败' }],
      probes: probeResults,
    })
  }

  // 2. Self-identification analysis
  if (selfId.success) {
    successCount++
    totalLatency += selfId.latency

    // Check if response model header matches
    if (selfId.responseModel) {
      const respFamily = getModelFamily(selfId.responseModel)
      if (family !== 'unknown' && respFamily !== 'unknown' && respFamily !== family) {
        issues.push({
          severity: 'critical',
          probe: '模型标识',
          message: `你请求的是 ${model}，但返回头显示实际模型是 "${selfId.responseModel}"`,
        })
      }
    }

    // Check self-reported identity
    if (selfId.content && family !== 'unknown') {
      const fp = MODEL_FINGERPRINTS[family]
      if (fp) {
        const contentLower = selfId.content.toLowerCase()
        const claimsCorrectFamily = fp.knownSelfId.test(contentLower)
        if (!claimsCorrectFamily) {
          // Check if it claims to be a different known model
          const claimsCheap = /glm|chatglm|qwen|通义|智谱|minimax|abab|baichuan|yi-|文心|ernie/i.test(contentLower)
          if (claimsCheap) {
            issues.push({
              severity: 'critical',
              probe: '自我识别',
              message: `模型自称是 "${selfId.content}"，这不是你购买的 ${model}，疑似被替换为廉价国产模型`,
            })
          } else {
            issues.push({
              severity: 'warning',
              probe: '自我识别',
              message: `模型自称 "${selfId.content}"，与预期的 ${model} 不完全一致`,
            })
          }
        }
      }
    }
  }

  // 3. Math reasoning
  if (math.success) {
    successCount++
    totalLatency += math.latency
    if (!math.correct) {
      issues.push({
        severity: 'warning',
        probe: '数学推理',
        message: `简单数学题答错（答了 "${math.content}"，正确答案是 9）。高端模型不应出错，疑似用了低质量模型`,
      })
    }
  }

  // 4. Logic puzzle
  if (logic.success) {
    successCount++
    totalLatency += logic.latency
    if (!logic.correct) {
      issues.push({
        severity: 'warning',
        probe: '逻辑推理',
        message: `经典逻辑题答错（答了 "${logic.content}"，正确答案是 5 分钟）。高端模型通常能答对`,
      })
    }
  }

  // 5. Code quality
  if (code.success) {
    successCount++
    totalLatency += code.latency
    if (code.qualityScore < 50) {
      issues.push({
        severity: 'warning',
        probe: '代码质量',
        message: `生成的代码质量偏低（得分 ${code.qualityScore}/100），缺少类型标注或边界处理，不像高端模型的产出`,
      })
    }
  }

  // 6. Chinese nuance
  if (chinese.success) {
    successCount++
    totalLatency += chinese.latency
  }

  // 7. Response model consistency across probes
  const responseModels = [selfId, math, logic, code, chinese]
    .filter(p => p.success && p.responseModel)
    .map(p => p.responseModel)
  const uniqueModels = [...new Set(responseModels)]
  if (uniqueModels.length > 1) {
    issues.push({
      severity: 'warning',
      probe: '模型一致性',
      message: `多次请求返回了不同的模型标识：${uniqueModels.join(', ')}，站点可能在混用模型`,
    })
  }

  // ─── Compute Overall Score ───
  const criticalCount = issues.filter(i => i.severity === 'critical').length
  const warningCount = issues.filter(i => i.severity === 'warning').length

  let score = 100
  score -= criticalCount * 30
  score -= warningCount * 10
  if (code.success && code.qualityScore) score += (code.qualityScore - 50) * 0.1
  score = Math.max(0, Math.min(100, Math.round(score)))

  let status, verdict, verdictDetail
  if (criticalCount > 0) {
    status = 'fail'
    verdict = '高度疑似掺水'
    verdictDetail = '检测到严重问题，该 API 端点很可能没有使用你购买的模型'
  } else if (warningCount >= 2) {
    status = 'suspect'
    verdict = '存在可疑迹象'
    verdictDetail = '多项检测出现异常，建议谨慎使用并进一步验证'
  } else if (warningCount === 1) {
    status = 'caution'
    verdict = '轻微异常'
    verdictDetail = '有一项检测不太正常，可能是模型版本差异导致，整体尚可'
  } else {
    status = 'pass'
    verdict = '检测通过'
    verdictDetail = '各项探针均未发现掺水迹象，该 API 看起来是正品'
  }

  const avgLatency = successCount > 0 ? Math.round(totalLatency / successCount) : 0

  res.json({
    status,
    verdict,
    verdictDetail,
    score,
    avgLatency,
    issues,
    probes: {
      selfId: {
        name: '模型自我识别',
        success: selfId.success,
        latency: selfId.latency,
        detail: selfId.success ? selfId.content : selfId.error,
        responseModel: selfId.responseModel,
      },
      math: {
        name: '数学推理测试',
        success: math.success,
        latency: math.latency,
        correct: math.correct,
        detail: math.success ? `答案: ${math.content}（${math.correct ? '正确' : '错误，应为9'}）` : math.error,
      },
      logic: {
        name: '逻辑推理测试',
        success: logic.success,
        latency: logic.latency,
        correct: logic.correct,
        detail: logic.success ? `答案: ${logic.content}（${logic.correct ? '正确' : '错误，应为5'}）` : logic.error,
      },
      code: {
        name: '代码生成质量',
        success: code.success,
        latency: code.latency,
        qualityScore: code.qualityScore,
        tps: code.tps,
        detail: code.success ? `质量 ${code.qualityScore}/100 | 速度 ${code.tps} t/s` : code.error,
      },
      chinese: {
        name: '中文语境理解',
        success: chinese.success,
        latency: chinese.latency,
        getsSlang: chinese.getsSlang,
        detail: chinese.success ? (chinese.getsSlang ? '正确理解了俚语含义' : '未能理解俚语含义') : chinese.error,
      },
    },
    meta: {
      requestedModel: model,
      modelFamily: family,
      responseModels: uniqueModels,
      testedAt: new Date().toISOString(),
    },
  })
})

// ─── Quick connectivity test ───
app.post('/api/ping', async (req, res) => {
  const { api_base, api_key, model } = req.body
  const base = (api_base || '').replace(/\/+$/, '')
  const start = Date.now()
  try {
    const r = await fetchWithTimeout(`${base}/models`, {
      headers: { 'Authorization': `Bearer ${api_key}` },
    }, 10000)
    res.json({ ok: r.ok, latency: Date.now() - start, status: r.status })
  } catch (e) {
    res.json({ ok: false, latency: Date.now() - start, error: e.message })
  }
})

// ─── Static files (production) ───
const distPath = join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')))
}

const PORT = process.env.PORT || 3721
app.listen(PORT, () => {
  console.log(`API Purity Detector running on http://localhost:${PORT}`)
})

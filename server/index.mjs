import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(join(DATA_DIR, 'relay.db'))
db.pragma('journal_mode = WAL')

// ─── Schema ───
db.exec(`
  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT DEFAULT '',
    api_base TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'neutral',
    models TEXT DEFAULT 'Claude,GPT,Gemini',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    model TEXT NOT NULL,
    latency_ms REAL DEFAULT 0,
    success INTEGER DEFAULT 0,
    status_code INTEGER DEFAULT 0,
    tokens_per_second REAL DEFAULT 0,
    is_watermarked INTEGER DEFAULT 0,
    error_message TEXT,
    tested_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    key_value TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

// seed default sites if empty
const siteCount = db.prepare('SELECT COUNT(*) as cnt FROM sites').get()
if (siteCount.cnt === 0) {
  const seedSites = [
    { name: 'PackyCode', url: 'https://www.packyapi.com', api_base: 'https://api.packyapi.com/v1', category: 'recommended', models: 'Claude,GPT,Gemini', description: '老牌站点，质量稳定，客服响应快' },
    { name: 'AI派', url: 'https://api.aipaibox.com', api_base: 'https://api.aipaibox.com/v1', category: 'recommended', models: 'Claude,Gemini,GPT', description: '价格便宜，质量不错，不注水' },
    { name: '云雾AI', url: 'https://yunwu.ai', api_base: 'https://api.yunwu.ai/v1', category: 'recommended', models: 'Claude,GPT,Gemini,DeepSeek', description: '老牌中转站，支持模型多，面向企业' },
    { name: 'RightCode', url: 'https://www.right.codes', api_base: 'https://api.right.codes/v1', category: 'recommended', models: 'Claude,Gemini,GPT', description: '编程专用，文档清晰，接口快' },
    { name: 'Chintao AI', url: 'https://chintao.cn', api_base: 'https://api.chintao.cn/v1', category: 'recommended', models: 'Claude,GPT', description: '新站质量好，接口稳定不掺水' },
    { name: 'SparkCode', url: 'https://sparkcode.top', api_base: 'https://api.sparkcode.top/v1', category: 'neutral', models: 'Claude,Gemini,GPT,Kimi,GLM', description: '支持多种编程模型' },
    { name: 'BUZZ', url: 'https://buzzai.cc', api_base: 'https://api.buzzai.cc/v1', category: 'neutral', models: 'Claude,GPT', description: '价格清晰，稳定性不错' },
    { name: 'ZeroCode', url: 'https://zerocode.sbs', api_base: 'https://api.zerocode.sbs/v1', category: 'neutral', models: 'Claude,Gemini,GPT', description: 'VIP分等级，新用户送额度' },
  ]
  const insert = db.prepare('INSERT INTO sites (name, url, api_base, category, models, description) VALUES (?, ?, ?, ?, ?, ?)')
  for (const s of seedSites) {
    insert.run(s.name, s.url, s.api_base, s.category, s.models, s.description)
  }
}

const app = express()
app.use(cors())
app.use(express.json())

// ─── Sites ───
app.get('/api/sites', (_req, res) => {
  const sites = db.prepare('SELECT * FROM sites ORDER BY category, name').all()
  res.json(sites)
})

app.post('/api/sites', (req, res) => {
  const { name, url, api_base, description, category, models } = req.body
  if (!name || !api_base) return res.status(400).json({ error: '名称和API地址必填' })
  const result = db.prepare(
    'INSERT INTO sites (name, url, api_base, description, category, models) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, url || '', api_base, description || '', category || 'neutral', models || 'Claude,GPT,Gemini')
  const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(result.lastInsertRowid)
  res.json(site)
})

app.delete('/api/sites/:id', (req, res) => {
  db.prepare('DELETE FROM sites WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ─── API Keys ───
app.get('/api/keys', (_req, res) => {
  const keys = db.prepare('SELECT id, name, key_value, created_at FROM api_keys ORDER BY created_at DESC').all()
  const masked = keys.map(k => ({
    id: k.id,
    name: k.name,
    masked_key: k.key_value.slice(0, 8) + '...' + k.key_value.slice(-4),
  }))
  res.json(masked)
})

app.post('/api/keys', (req, res) => {
  const { name, key } = req.body
  if (!name || !key) return res.status(400).json({ error: '名称和Key必填' })
  const result = db.prepare('INSERT INTO api_keys (name, key_value) VALUES (?, ?)').run(name, key)
  res.json({ id: result.lastInsertRowid })
})

app.delete('/api/keys/:id', (req, res) => {
  db.prepare('DELETE FROM api_keys WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ─── Testing ───
async function testSiteEndpoint(apiBase, model, apiKey) {
  const startTime = Date.now()
  const testPrompt = 'What is 2+2? Reply with just the number.'
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: testPrompt }],
        max_tokens: 50,
        temperature: 0,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const latencyMs = Date.now() - startTime
    const statusCode = response.status

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      return {
        latency_ms: latencyMs,
        success: false,
        status_code: statusCode,
        tokens_per_second: 0,
        is_watermarked: false,
        error_message: `HTTP ${statusCode}: ${errBody.slice(0, 200)}`,
      }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    const usage = data.usage || {}
    const completionTokens = usage.completion_tokens || content.length / 4
    const tokensPerSecond = completionTokens / (latencyMs / 1000)
    
    // simple watermark detection: check if response model matches requested model
    const responseModel = data.model || ''
    const isWatermarked = responseModel && !responseModel.toLowerCase().includes(model.split('-')[0].toLowerCase())

    return {
      latency_ms: latencyMs,
      success: true,
      status_code: statusCode,
      tokens_per_second: Math.round(tokensPerSecond * 10) / 10,
      is_watermarked: isWatermarked,
      error_message: null,
    }
  } catch (err) {
    return {
      latency_ms: Date.now() - startTime,
      success: false,
      status_code: 0,
      tokens_per_second: 0,
      is_watermarked: false,
      error_message: err.message || 'Unknown error',
    }
  }
}

app.post('/api/test', async (req, res) => {
  const { site_id, model, api_key } = req.body
  if (!site_id || !model || !api_key) {
    return res.status(400).json({ error: '站点、模型和API Key必填' })
  }

  const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(site_id)
  if (!site) return res.status(404).json({ error: '站点不存在' })

  const result = await testSiteEndpoint(site.api_base, model, api_key)
  
  const insert = db.prepare(`
    INSERT INTO test_results (site_id, model, latency_ms, success, status_code, tokens_per_second, is_watermarked, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const dbResult = insert.run(
    site_id, model, result.latency_ms, result.success ? 1 : 0,
    result.status_code, result.tokens_per_second, result.is_watermarked ? 1 : 0,
    result.error_message
  )

  const testRecord = db.prepare('SELECT * FROM test_results WHERE id = ?').get(dbResult.lastInsertRowid)
  testRecord.site_name = site.name
  testRecord.success = !!testRecord.success
  testRecord.is_watermarked = !!testRecord.is_watermarked
  res.json(testRecord)
})

app.post('/api/test/batch', async (req, res) => {
  const { model, api_key } = req.body
  if (!model || !api_key) {
    return res.status(400).json({ error: '模型和API Key必填' })
  }

  const sites = db.prepare('SELECT * FROM sites').all()
  if (!sites.length) return res.status(400).json({ error: '没有可测试的站点' })

  const results = []
  const insert = db.prepare(`
    INSERT INTO test_results (site_id, model, latency_ms, success, status_code, tokens_per_second, is_watermarked, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const site of sites) {
    const result = await testSiteEndpoint(site.api_base, model, api_key)
    const dbResult = insert.run(
      site.id, model, result.latency_ms, result.success ? 1 : 0,
      result.status_code, result.tokens_per_second, result.is_watermarked ? 1 : 0,
      result.error_message
    )
    const testRecord = db.prepare('SELECT * FROM test_results WHERE id = ?').get(dbResult.lastInsertRowid)
    testRecord.site_name = site.name
    testRecord.success = !!testRecord.success
    testRecord.is_watermarked = !!testRecord.is_watermarked
    results.push(testRecord)
  }

  res.json(results)
})

// ─── Test History ───
app.get('/api/tests', (req, res) => {
  const { site_id } = req.query
  let sql = `
    SELECT t.*, s.name as site_name
    FROM test_results t
    LEFT JOIN sites s ON s.id = t.site_id
  `
  const params = []
  if (site_id) {
    sql += ' WHERE t.site_id = ?'
    params.push(site_id)
  }
  sql += ' ORDER BY t.tested_at DESC LIMIT 200'

  const rows = db.prepare(sql).all(...params)
  rows.forEach(r => {
    r.success = !!r.success
    r.is_watermarked = !!r.is_watermarked
  })
  res.json(rows)
})

// ─── Rankings ───
app.get('/api/rankings', (req, res) => {
  const { model } = req.query
  let sql = `
    SELECT
      t.site_id,
      s.name as site_name,
      s.url as site_url,
      t.model,
      ROUND(AVG(t.latency_ms), 1) as avg_latency,
      ROUND(AVG(t.success) * 100, 1) as success_rate,
      ROUND(AVG(t.tokens_per_second), 1) as avg_tps,
      ROUND(AVG(t.is_watermarked) * 100, 1) as watermark_rate,
      COUNT(*) as total_tests,
      MAX(t.tested_at) as last_tested
    FROM test_results t
    LEFT JOIN sites s ON s.id = t.site_id
  `
  const params = []
  if (model) {
    sql += ' WHERE t.model = ?'
    params.push(model)
  }
  sql += ' GROUP BY t.site_id, t.model HAVING total_tests >= 1 ORDER BY avg_latency ASC'

  const rows = db.prepare(sql).all(...params)

  // compute score: weighted combination
  const scored = rows.map(r => {
    const latencyScore = Math.max(0, 100 - (r.avg_latency / 100))
    const successScore = r.success_rate
    const tpsScore = Math.min(100, r.avg_tps * 2)
    const watermarkPenalty = r.watermark_rate * 0.5
    const score = (latencyScore * 0.25 + successScore * 0.35 + tpsScore * 0.25) - watermarkPenalty
    return { ...r, score: Math.max(0, Math.min(100, Math.round(score * 10) / 10)) }
  })
  scored.sort((a, b) => b.score - a.score)

  res.json(scored)
})

// ─── Models ───
app.get('/api/models', (_req, res) => {
  const rows = db.prepare('SELECT DISTINCT model FROM test_results ORDER BY model').all()
  res.json(rows.map(r => r.model))
})

// ─── Dashboard ───
app.get('/api/dashboard', (_req, res) => {
  const totalSites = db.prepare('SELECT COUNT(*) as cnt FROM sites').get().cnt
  const totalTests = db.prepare('SELECT COUNT(*) as cnt FROM test_results').get().cnt
  
  const onlineSites = db.prepare(`
    SELECT COUNT(DISTINCT site_id) as cnt FROM test_results
    WHERE success = 1 AND tested_at > datetime('now', '-24 hours')
  `).get().cnt

  const avgLatency = db.prepare(`
    SELECT AVG(latency_ms) as avg FROM test_results
    WHERE success = 1 AND tested_at > datetime('now', '-24 hours')
  `).get().avg || 0

  const recentTests = db.prepare(`
    SELECT t.*, s.name as site_name
    FROM test_results t
    LEFT JOIN sites s ON s.id = t.site_id
    ORDER BY t.tested_at DESC LIMIT 20
  `).all()
  recentTests.forEach(r => {
    r.success = !!r.success
    r.is_watermarked = !!r.is_watermarked
  })

  // top rankings
  const rankRows = db.prepare(`
    SELECT
      t.site_id,
      s.name as site_name,
      s.url as site_url,
      t.model,
      ROUND(AVG(t.latency_ms), 1) as avg_latency,
      ROUND(AVG(t.success) * 100, 1) as success_rate,
      ROUND(AVG(t.tokens_per_second), 1) as avg_tps,
      ROUND(AVG(t.is_watermarked) * 100, 1) as watermark_rate,
      COUNT(*) as total_tests,
      MAX(t.tested_at) as last_tested
    FROM test_results t
    LEFT JOIN sites s ON s.id = t.site_id
    GROUP BY t.site_id, t.model
    HAVING total_tests >= 1
  `).all()

  const topRankings = rankRows.map(r => {
    const latencyScore = Math.max(0, 100 - (r.avg_latency / 100))
    const successScore = r.success_rate
    const tpsScore = Math.min(100, r.avg_tps * 2)
    const watermarkPenalty = r.watermark_rate * 0.5
    const score = (latencyScore * 0.25 + successScore * 0.35 + tpsScore * 0.25) - watermarkPenalty
    return { ...r, score: Math.max(0, Math.min(100, Math.round(score * 10) / 10)) }
  }).sort((a, b) => b.score - a.score).slice(0, 10)

  res.json({
    total_sites: totalSites,
    total_tests: totalTests,
    online_sites: onlineSites,
    avg_latency: Math.round(avgLatency),
    recent_tests: recentTests,
    top_rankings: topRankings,
  })
})

// ─── Static files (production) ───
const distPath = join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

const PORT = process.env.PORT || 3721
app.listen(PORT, () => {
  console.log(`API Relay Hub server running on http://localhost:${PORT}`)
})

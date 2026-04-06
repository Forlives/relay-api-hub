const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export interface Site {
  id: number
  name: string
  url: string
  api_base: string
  description: string
  category: 'recommended' | 'neutral' | 'not_recommended'
  models: string
  created_at: string
}

export interface TestResult {
  id: number
  site_id: number
  site_name?: string
  model: string
  latency_ms: number
  success: boolean
  status_code: number
  tokens_per_second: number
  is_watermarked: boolean
  error_message: string | null
  tested_at: string
}

export interface RankingEntry {
  site_id: number
  site_name: string
  site_url: string
  model: string
  avg_latency: number
  success_rate: number
  avg_tps: number
  watermark_rate: number
  total_tests: number
  score: number
  last_tested: string
}

export interface DashboardStats {
  total_sites: number
  total_tests: number
  online_sites: number
  avg_latency: number
  recent_tests: TestResult[]
  top_rankings: RankingEntry[]
}

export const api = {
  getDashboard: () => request<DashboardStats>('/dashboard'),
  
  getSites: () => request<Site[]>('/sites'),
  addSite: (site: Omit<Site, 'id' | 'created_at'>) =>
    request<Site>('/sites', { method: 'POST', body: JSON.stringify(site) }),
  deleteSite: (id: number) =>
    request<void>(`/sites/${id}`, { method: 'DELETE' }),

  getRankings: (model?: string) =>
    request<RankingEntry[]>(`/rankings${model ? `?model=${encodeURIComponent(model)}` : ''}`),
  
  getModels: () => request<string[]>('/models'),

  runTest: (siteId: number, model: string, apiKey: string) =>
    request<TestResult>('/test', {
      method: 'POST',
      body: JSON.stringify({ site_id: siteId, model, api_key: apiKey }),
    }),

  runBatchTest: (model: string, apiKey: string) =>
    request<TestResult[]>('/test/batch', {
      method: 'POST',
      body: JSON.stringify({ model, api_key: apiKey }),
    }),

  getTestHistory: (siteId?: number) =>
    request<TestResult[]>(`/tests${siteId ? `?site_id=${siteId}` : ''}`),

  saveKey: (name: string, key: string) =>
    request<{ id: number }>('/keys', { method: 'POST', body: JSON.stringify({ name, key }) }),
  getKeys: () => request<{ id: number; name: string; masked_key: string }[]>('/keys'),
  deleteKey: (id: number) => request<void>(`/keys/${id}`, { method: 'DELETE' }),
}

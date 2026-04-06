import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Filter } from 'lucide-react'
import RankingTable from '@/components/RankingTable'
import { api, type RankingEntry } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function Ranking() {
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getModels().then(setModels).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    api.getRankings(selectedModel || undefined)
      .then(setRankings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedModel])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-400" />
            排行榜
          </h1>
          <p className="text-sm text-gray-500 mt-1">基于延迟、成功率、速度和掺水率的综合评分排行</p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-gray-800/80 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="">全部模型</option>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Model quick filters */}
      <div className="flex flex-wrap gap-2">
        {['', 'claude-sonnet-4-6-20250514', 'claude-opus-4-6-20250514', 'gpt-5.4', 'gemini-3.1-pro'].map((m) => (
          <button
            key={m}
            onClick={() => setSelectedModel(m)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              selectedModel === m
                ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
            )}
          >
            {m || '全部'}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-500">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-3" />
            加载中...
          </div>
        ) : (
          <RankingTable data={rankings} />
        )}
      </div>
    </motion.div>
  )
}

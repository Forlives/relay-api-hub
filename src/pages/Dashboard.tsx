import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Server, FlaskConical, Wifi, Clock, ArrowRight, Activity } from 'lucide-react'
import { motion } from 'framer-motion'
import StatCard from '@/components/StatCard'
import RankingTable from '@/components/RankingTable'
import { api, type DashboardStats } from '@/lib/api'
import { formatLatency } from '@/lib/utils'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDashboard()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-8 w-8 text-blue-500 animate-pulse" />
          <p className="text-gray-500 text-sm">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Hero */}
      <motion.div variants={item} className="text-center py-8">
        <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-3">
          AI API 中转站评测
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          自动化测试各中转站的延迟、稳定性、掺水率，帮你找到最靠谱的 API 服务
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Server}
          label="已收录站点"
          value={stats?.total_sites ?? 0}
          color="text-blue-400"
        />
        <StatCard
          icon={FlaskConical}
          label="总测试次数"
          value={stats?.total_tests ?? 0}
          color="text-cyan-400"
        />
        <StatCard
          icon={Wifi}
          label="在线站点"
          value={stats?.online_sites ?? 0}
          sub={`共 ${stats?.total_sites ?? 0} 个`}
          color="text-emerald-400"
        />
        <StatCard
          icon={Clock}
          label="平均延迟"
          value={stats?.avg_latency ? formatLatency(stats.avg_latency) : 'N/A'}
          color="text-yellow-400"
        />
      </motion.div>

      {/* Top Rankings */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-200">TOP 排行</h2>
          <Link
            to="/ranking"
            className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            查看全部 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="glass-card overflow-hidden">
          <RankingTable data={stats?.top_rankings ?? []} compact />
        </div>
      </motion.div>

      {/* Recent Tests */}
      <motion.div variants={item}>
        <h2 className="text-lg font-semibold text-gray-200 mb-4">最近测试</h2>
        <div className="glass-card divide-y divide-gray-800/50">
          {stats?.recent_tests && stats.recent_tests.length > 0 ? (
            stats.recent_tests.slice(0, 8).map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className={`status-dot ${t.success ? 'status-dot-online' : 'status-dot-offline'}`} />
                  <div>
                    <p className="text-sm text-gray-200">{t.site_name ?? `站点 #${t.site_id}`}</p>
                    <p className="text-xs text-gray-500">{t.model}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-300">{formatLatency(t.latency_ms)}</p>
                  <p className="text-[10px] text-gray-600">
                    {new Date(t.tested_at).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-gray-500">
              <FlaskConical className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无测试记录</p>
              <Link to="/test" className="text-blue-400 text-xs hover:underline mt-1 inline-block">
                去测试一下
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

import { Trophy, Zap, Shield, AlertTriangle } from 'lucide-react'
import { cn, formatLatency, getScoreColor } from '@/lib/utils'
import type { RankingEntry } from '@/lib/api'

interface RankingTableProps {
  data: RankingEntry[]
  compact?: boolean
}

export default function RankingTable({ data, compact = false }: RankingTableProps) {
  if (!data.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>暂无排行数据</p>
        <p className="text-xs mt-1">添加站点并运行测试后将显示排行</p>
      </div>
    )
  }

  const display = compact ? data.slice(0, 10) : data

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800/50 text-xs text-gray-500">
            <th className="py-3 px-3 text-left font-medium">#</th>
            <th className="py-3 px-3 text-left font-medium">站点</th>
            <th className="py-3 px-3 text-left font-medium">模型</th>
            <th className="py-3 px-3 text-right font-medium">延迟</th>
            <th className="py-3 px-3 text-right font-medium">成功率</th>
            <th className="py-3 px-3 text-right font-medium">速度(t/s)</th>
            {!compact && <th className="py-3 px-3 text-right font-medium">掺水率</th>}
            <th className="py-3 px-3 text-right font-medium">评分</th>
          </tr>
        </thead>
        <tbody>
          {display.map((entry, i) => {
            const rank = i + 1
            return (
              <tr
                key={`${entry.site_id}-${entry.model}`}
                className="border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors"
              >
                <td className="py-3 px-3">
                  <span className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    rank === 1 && 'bg-yellow-500/20 text-yellow-400',
                    rank === 2 && 'bg-gray-400/20 text-gray-300',
                    rank === 3 && 'bg-amber-600/20 text-amber-500',
                    rank > 3 && 'text-gray-500'
                  )}>
                    {rank}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-800 text-xs font-bold text-blue-400">
                      {entry.site_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-200 truncate max-w-[140px]">{entry.site_name}</p>
                      <p className="text-[10px] text-gray-600">{entry.total_tests} 次测试</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-800/80 text-xs text-gray-300">
                    {entry.model}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    <span className="text-gray-300">{formatLatency(entry.avg_latency)}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className={cn(
                    entry.success_rate >= 95 ? 'text-emerald-400' :
                    entry.success_rate >= 80 ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {entry.success_rate.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-gray-300">
                  {entry.avg_tps.toFixed(1)}
                </td>
                {!compact && (
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {entry.watermark_rate > 20 ? (
                        <AlertTriangle className="h-3 w-3 text-red-400" />
                      ) : (
                        <Shield className="h-3 w-3 text-emerald-400" />
                      )}
                      <span className={entry.watermark_rate > 20 ? 'text-red-400' : 'text-emerald-400'}>
                        {entry.watermark_rate.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                )}
                <td className="py-3 px-3 text-right">
                  <span className={cn('text-lg font-bold', getScoreColor(entry.score))}>
                    {entry.score.toFixed(0)}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  sub?: string
  color?: string
}

export default function StatCard({ icon: Icon, label, value, sub, color = 'text-blue-400' }: StatCardProps) {
  return (
    <div className="glass-card p-5 flex items-start gap-4">
      <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl bg-gray-800/80', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className={cn('text-2xl font-bold tracking-tight', color)}>{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

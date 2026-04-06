import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`
}

export function getStatusColor(status: 'online' | 'offline' | 'degraded'): string {
  switch (status) {
    case 'online': return 'text-emerald-400'
    case 'offline': return 'text-red-400'
    case 'degraded': return 'text-yellow-400'
  }
}

export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-400'
  if (score >= 70) return 'text-blue-400'
  if (score >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

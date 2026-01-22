'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Check, Loader2 } from 'lucide-react'

interface UsageData {
  remaining: number
  limit: number
  isPaid: boolean
  isLifetime: boolean
}

interface GenerationCounterProps {
  onLimitReached?: () => void
}

export function GenerationCounter({ onLimitReached }: GenerationCounterProps) {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUsage = async () => {
    try {
      const res = await fetch('/api/subscription/usage')
      if (res.ok) {
        const data = await res.json()
        setUsage(data)

        // Trigger callback if limit reached
        if (!data.isPaid && data.remaining <= 0 && onLimitReached) {
          onLimitReached()
        }
      }
    } catch (err) {
      console.error('Failed to fetch usage:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsage()
  }, [])

  // Expose refresh function
  useEffect(() => {
    // @ts-expect-error - attaching to window for external refresh
    window.refreshGenerationCounter = fetchUsage
    return () => {
      // @ts-expect-error - cleanup
      delete window.refreshGenerationCounter
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--muted)]" />
        <span className="text-sm text-[var(--muted)]">Loading...</span>
      </div>
    )
  }

  if (!usage) {
    return null
  }

  // Paid user - show unlimited
  if (usage.isPaid) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-lg">
        <Check className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium text-accent">
          {usage.isLifetime ? 'Lifetime' : 'Pro'} - Unlimited
        </span>
      </div>
    )
  }

  // Free user - show remaining count
  const percentage = (usage.remaining / usage.limit) * 100
  const isLow = usage.remaining <= 2
  const isEmpty = usage.remaining <= 0

  return (
    <div className={`flex items-center gap-3 px-3 py-1.5 bg-[var(--card)] border rounded-lg ${
      isEmpty ? 'border-red-500/50' : isLow ? 'border-amber-500/50' : 'border-[var(--border)]'
    }`}>
      <Sparkles className={`w-4 h-4 ${
        isEmpty ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-[var(--muted)]'
      }`} />
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${
          isEmpty ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-[var(--foreground)]'
        }`}>
          {usage.remaining} / {usage.limit}
        </span>
        <span className="text-xs text-[var(--muted)]">generations</span>
      </div>
      {/* Progress bar */}
      <div className="w-16 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isEmpty ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-accent'
          }`}
          style={{ width: `${Math.max(0, percentage)}%` }}
        />
      </div>
    </div>
  )
}

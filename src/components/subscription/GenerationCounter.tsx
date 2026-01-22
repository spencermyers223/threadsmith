'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'

interface UsageData {
  canGenerate: boolean
  remaining: number
  isSubscribed: boolean
  freeLimit: number
  subscription?: {
    status: string
    plan_type: string
  } | null
}

interface GenerationCounterProps {
  onLimitReached?: () => void
}

export function GenerationCounter({ onLimitReached }: GenerationCounterProps) {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription/usage')
      if (res.ok) {
        const data = await res.json()
        setUsage(data)

        // Trigger callback if limit reached
        if (!data.isSubscribed && data.remaining <= 0 && onLimitReached) {
          onLimitReached()
        }
      }
    } catch (err) {
      console.error('Failed to fetch usage:', err)
    } finally {
      setLoading(false)
    }
  }, [onLimitReached])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  // Expose refresh function
  useEffect(() => {
    // @ts-expect-error - attaching to window for external refresh
    window.refreshGenerationCounter = fetchUsage
    return () => {
      // @ts-expect-error - cleanup
      delete window.refreshGenerationCounter
    }
  }, [fetchUsage])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading...</span>
      </div>
    )
  }

  if (!usage) {
    return null
  }

  // Paid user - show unlimited
  if (usage.isSubscribed) {
    const isLifetime = usage.subscription?.status === 'lifetime'
    return (
      <span className="text-sm text-accent font-medium">
        {isLifetime ? 'Lifetime' : 'Pro'} — Unlimited generations
      </span>
    )
  }

  // Free user - show remaining count
  const isLow = usage.remaining <= 2
  const isEmpty = usage.remaining <= 0

  return (
    <span className={`text-sm font-medium ${
      isEmpty ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-[var(--muted)]'
    }`}>
      {usage.remaining} / {usage.freeLimit} free generations
    </span>
  )
}

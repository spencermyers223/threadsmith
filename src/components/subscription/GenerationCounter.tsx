'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Clock, Sparkles, Lock } from 'lucide-react'
import Link from 'next/link'

interface UsageData {
  canGenerate: boolean
  remaining: number
  isSubscribed: boolean
  isTrial: boolean
  trialDaysRemaining: number | null
  subscription?: {
    status: string
    plan_type: string
    tier: string
  } | null
}

export function GenerationCounter() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription/usage')
      if (res.ok) {
        const data = await res.json()
        setUsage(data)
      }
    } catch (err) {
      console.error('Failed to fetch usage:', err)
    } finally {
      setLoading(false)
    }
  }, [])

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

  // Trial user - show trial status with days remaining
  if (usage.isTrial) {
    const days = usage.trialDaysRemaining ?? 0
    const isUrgent = days <= 2
    
    return (
      <Link 
        href="/pricing"
        className="flex items-center gap-2 group"
      >
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium transition-colors ${
          isUrgent 
            ? 'bg-red-500/20 text-red-400 group-hover:bg-red-500/30' 
            : 'bg-accent/20 text-accent group-hover:bg-accent/30'
        }`}>
          <Clock className="w-3.5 h-3.5" />
          {days === 0 ? 'Trial ends today' : `${days}d trial left`}
        </span>
        <span className="text-[var(--muted)] text-sm">
          Unlimited generations
        </span>
      </Link>
    )
  }

  // Paid user - show unlimited
  if (usage.isSubscribed) {
    const tierLabel = usage.subscription?.tier === 'pro' ? 'Pro' : 'Premium'
    return (
      <span className="flex items-center gap-2 text-lg font-medium text-accent">
        <Sparkles className="w-4 h-4" />
        {tierLabel} — Unlimited generations
      </span>
    )
  }

  // No subscription and no trial - show upgrade prompt
  return (
    <Link 
      href="/pricing"
      className="flex items-center gap-2 group"
    >
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/30 transition-colors">
        <Lock className="w-3.5 h-3.5" />
        Trial expired
      </span>
      <span className="text-[var(--muted)] text-sm group-hover:text-[var(--foreground)] transition-colors">
        Subscribe to continue
      </span>
    </Link>
  )
}

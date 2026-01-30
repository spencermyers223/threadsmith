'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Clock, Sparkles } from 'lucide-react'
import Link from 'next/link'

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

interface TrialData {
  isTrial: boolean
  trialDaysRemaining: number | null
  tier: string
}

export function GenerationCounter() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [trialData, setTrialData] = useState<TrialData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUsage = useCallback(async () => {
    try {
      // Fetch both usage and trial status in parallel
      const [usageRes, statusRes] = await Promise.all([
        fetch('/api/subscription/usage'),
        fetch('/api/subscription/status')
      ])
      
      if (usageRes.ok) {
        const data = await usageRes.json()
        setUsage(data)
      }
      
      if (statusRes.ok) {
        const data = await statusRes.json()
        setTrialData({
          isTrial: data.isTrial,
          trialDaysRemaining: data.trialDaysRemaining,
          tier: data.tier
        })
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
  if (trialData?.isTrial) {
    const days = trialData.trialDaysRemaining ?? 0
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
    const tierLabel = trialData?.tier === 'pro' ? 'Pro' : 'Premium'
    return (
      <span className="flex items-center gap-2 text-lg font-medium text-accent">
        <Sparkles className="w-4 h-4" />
        {tierLabel} — Unlimited generations
      </span>
    )
  }

  // Free user - show remaining count
  const isLow = usage.remaining <= 2
  const isEmpty = usage.remaining <= 0

  // No generations remaining
  if (isEmpty) {
    return (
      <span className="text-lg font-medium text-red-400">
        No generations remaining
      </span>
    )
  }

  // Has generations remaining
  return (
    <span className="text-lg font-medium text-[var(--foreground)]">
      <span className={`text-xl font-bold ${isLow ? 'text-amber-400' : 'text-accent'}`}>
        {usage.remaining}
      </span>
      {' '}free generation{usage.remaining !== 1 ? 's' : ''} remaining
    </span>
  )
}

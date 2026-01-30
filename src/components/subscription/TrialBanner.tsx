'use client'

import { useState, useEffect } from 'react'
import { Clock, Sparkles, X } from 'lucide-react'
import Link from 'next/link'

interface TrialInfo {
  isTrial: boolean
  trialDaysRemaining: number | null
  trialEndsAt: string | null
}

export function TrialBanner() {
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrialInfo = async () => {
      try {
        const res = await fetch('/api/subscription/status')
        if (res.ok) {
          const data = await res.json()
          setTrialInfo({
            isTrial: data.isTrial,
            trialDaysRemaining: data.trialDaysRemaining,
            trialEndsAt: data.trialEndsAt,
          })
        }
      } catch (err) {
        console.error('Failed to fetch trial info:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTrialInfo()
  }, [])

  // Don't show if loading, dismissed, or not on trial
  if (loading || dismissed || !trialInfo?.isTrial) {
    return null
  }

  const days = trialInfo.trialDaysRemaining ?? 0
  const isUrgent = days <= 2
  const isEnding = days <= 4

  // Determine banner style based on urgency
  const bannerStyle = isUrgent
    ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border-red-500/30'
    : isEnding
    ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/30'
    : 'bg-gradient-to-r from-accent/20 to-blue-500/20 border-accent/30'

  const iconStyle = isUrgent
    ? 'text-red-400'
    : isEnding
    ? 'text-amber-400'
    : 'text-accent'

  return (
    <div className={`relative px-4 py-3 border rounded-lg ${bannerStyle} mb-4`}>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-[var(--muted)]" />
      </button>

      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full bg-white/10 ${iconStyle}`}>
          {isUrgent ? (
            <Clock className="w-5 h-5" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1">
          <p className="font-medium text-[var(--foreground)]">
            {days === 0 ? (
              'Your trial ends today!'
            ) : days === 1 ? (
              '1 day left in your free trial'
            ) : (
              `${days} days left in your free trial`
            )}
          </p>
          <p className="text-sm text-[var(--muted)]">
            {isUrgent
              ? "Subscribe now to keep all your premium features"
              : "You have full access to all premium features"}
          </p>
        </div>

        <Link
          href="/pricing"
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            isUrgent
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-accent hover:bg-accent/80 text-white'
          }`}
        >
          {isUrgent ? 'Subscribe Now' : 'View Plans'}
        </Link>
      </div>
    </div>
  )
}

/**
 * Smaller trial indicator for headers/navbars
 */
export function TrialIndicator() {
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null)

  useEffect(() => {
    const fetchTrialInfo = async () => {
      try {
        const res = await fetch('/api/subscription/status')
        if (res.ok) {
          const data = await res.json()
          setTrialInfo({
            isTrial: data.isTrial,
            trialDaysRemaining: data.trialDaysRemaining,
            trialEndsAt: data.trialEndsAt,
          })
        }
      } catch (err) {
        console.error('Failed to fetch trial info:', err)
      }
    }

    fetchTrialInfo()
  }, [])

  if (!trialInfo?.isTrial) {
    return null
  }

  const days = trialInfo.trialDaysRemaining ?? 0
  const isUrgent = days <= 2

  return (
    <Link
      href="/pricing"
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        isUrgent
          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
          : 'bg-accent/20 text-accent hover:bg-accent/30'
      }`}
    >
      <Clock className="w-3 h-3" />
      <span>
        {days === 0 ? 'Trial ends today' : `${days}d trial`}
      </span>
    </Link>
  )
}

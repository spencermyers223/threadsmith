'use client'

import { useState } from 'react'
import { X, Zap, Crown, Loader2 } from 'lucide-react'

type BillingPeriod = 'monthly' | 'annual'
type PlanType = 'premium_monthly' | 'premium_annual' | 'pro_monthly' | 'pro_annual'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
  const [loading, setLoading] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSelectPlan = async (tier: 'premium' | 'pro') => {
    const planType: PlanType = `${tier}_${billingPeriod}`
    setLoading(true)
    setLoadingPlan(planType)
    setError(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create checkout session')
      }

      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
      setLoadingPlan(null)
    }
  }

  if (!isOpen) return null

  const premiumPrice = billingPeriod === 'monthly' ? 19.99 : 191.90
  const proPrice = billingPeriod === 'monthly' ? 39.99 : 383.90

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-float animate-fade-in-up overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--card)] transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">
              Upgrade to Pro
            </h2>
            <p className="text-[var(--muted)]">
              Unlock unlimited generations and advanced features
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-1 p-1 bg-[var(--card)] border border-[var(--border)] rounded-lg">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-[var(--foreground)] text-[var(--background)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
                  billingPeriod === 'annual'
                    ? 'bg-[var(--foreground)] text-[var(--background)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                Annual
                <span className={`text-xs px-1 py-0.5 rounded ${
                  billingPeriod === 'annual'
                    ? 'bg-accent text-[var(--accent-text)]'
                    : 'bg-accent/20 text-accent'
                }`}>
                  -20%
                </span>
              </button>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Pricing options */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Premium */}
            <button
              onClick={() => handleSelectPlan('premium')}
              disabled={loading}
              className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-xl hover:border-blue-500/50 transition-all text-left disabled:opacity-50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Zap className="w-5 h-5 text-blue-400" />
                </div>
                <div className="font-semibold">Premium</div>
              </div>
              <div className="mb-2">
                {loadingPlan?.startsWith('premium') ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span className="text-2xl font-bold">${premiumPrice.toFixed(2)}</span>
                    <span className="text-sm text-[var(--muted)]">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-[var(--muted)]">
                Unlimited generations, 1 account, full analytics
              </p>
            </button>

            {/* Pro */}
            <button
              onClick={() => handleSelectPlan('pro')}
              disabled={loading}
              className="p-5 bg-accent/10 border border-accent/30 rounded-xl hover:bg-accent/20 transition-all text-left disabled:opacity-50 relative"
            >
              <div className="absolute -top-2 right-3 px-2 py-0.5 bg-accent text-[var(--accent-text)] text-xs font-medium rounded-full">
                Best value
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Crown className="w-5 h-5 text-accent" />
                </div>
                <div className="font-semibold">Pro</div>
              </div>
              <div className="mb-2">
                {loadingPlan?.startsWith('pro') ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span className="text-2xl font-bold text-accent">${proPrice.toFixed(2)}</span>
                    <span className="text-sm text-[var(--muted)]">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-[var(--muted)]">
                Up to 5 accounts, advanced analytics, priority support
              </p>
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-[var(--muted)] mt-6">
            Secure payment via Stripe • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
}

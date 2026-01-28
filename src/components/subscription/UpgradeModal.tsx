'use client'

import { useState } from 'react'
import { X, Sparkles, Zap, Loader2 } from 'lucide-react'

type PlanType = 'monthly' | 'annual'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSelectPlan = async (planType: PlanType) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-float animate-fade-in-up overflow-hidden">
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
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">
              Upgrade to Pro
            </h2>
            <p className="text-[var(--muted)]">
              Unlock unlimited generations
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Pricing options */}
          <div className="space-y-4">
            {/* Monthly */}
            <button
              onClick={() => handleSelectPlan('monthly')}
              disabled={loading}
              className="w-full p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl hover:border-[var(--muted)] transition-all text-left flex items-center gap-4 disabled:opacity-50"
            >
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Monthly</div>
                <div className="text-sm text-[var(--muted)]">Cancel anytime</div>
              </div>
              <div className="text-right">
                {loadingPlan === 'monthly' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <div className="font-bold">$9.99</div>
                    <div className="text-xs text-[var(--muted)]">/month</div>
                  </>
                )}
              </div>
            </button>

            {/* Annual */}
            <button
              onClick={() => handleSelectPlan('annual')}
              disabled={loading}
              className="w-full p-4 bg-accent/10 border border-accent/30 rounded-xl hover:bg-accent/20 transition-all text-left flex items-center gap-4 disabled:opacity-50 relative"
            >
              <div className="absolute -top-2 right-4 px-2 py-0.5 bg-accent text-[var(--accent-text)] text-xs font-medium rounded-full">
                Best value
              </div>
              <div className="p-2 rounded-lg bg-accent/20">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Annual</div>
                <div className="text-sm text-[var(--muted)]">Save with yearly billing</div>
              </div>
              <div className="text-right">
                {loadingPlan === 'annual' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <div className="font-bold text-accent">$99.99</div>
                    <div className="text-xs text-[var(--muted)]">/year</div>
                  </>
                )}
              </div>
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-[var(--muted)] mt-6">
            Secure payment via Stripe
          </p>
        </div>
      </div>
    </div>
  )
}

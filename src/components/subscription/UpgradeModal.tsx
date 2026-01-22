'use client'

import { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { PricingCards, PlanType } from './PricingCards'

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

      // Redirect to Stripe Checkout
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
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 mb-4">
              <AlertCircle className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              You&apos;ve used all your free generations!
            </h2>
            <p className="text-[var(--muted)] max-w-md mx-auto">
              Upgrade to keep creating content that grows your audience
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Pricing cards */}
          <PricingCards
            onSelectPlan={handleSelectPlan}
            loading={loading}
            loadingPlan={loadingPlan}
          />

          {/* Footer note */}
          <p className="text-center text-xs text-[var(--muted)] mt-6">
            Secure payment powered by Stripe. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  )
}

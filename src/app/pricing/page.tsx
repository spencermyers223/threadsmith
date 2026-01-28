'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Zap, Sparkles, Loader2, ArrowLeft } from 'lucide-react'

type PlanType = 'monthly' | 'annual'

const features = [
  'Unlimited AI generations',
  'All 6 post types (Scroll Stoppers, Debate Starters, etc.)',
  'Voice training from your tweets',
  'Content calendar & scheduling',
  'Post to X directly',
  'Analytics dashboard',
  'Reply Coach browser extension',
  'Priority support',
]

export default function PricingPage() {
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

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to xthread
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-[var(--muted)] max-w-2xl mx-auto">
            Unlock unlimited AI-powered content generation and grow your X audience faster.
          </p>
        </div>

        {/* Error display */}
        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-16">
          {/* Monthly */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Monthly</h2>
                <p className="text-sm text-[var(--muted)]">Cancel anytime</p>
              </div>
            </div>
            
            <div className="mb-6">
              <span className="text-4xl font-bold">$9.99</span>
              <span className="text-[var(--muted)]">/month</span>
            </div>

            <button
              onClick={() => handleSelectPlan('monthly')}
              disabled={loading}
              className="w-full py-3 px-6 bg-[var(--foreground)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingPlan === 'monthly' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Get Started'
              )}
            </button>
          </div>

          {/* Annual */}
          <div className="bg-accent/10 border-2 border-accent rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-[var(--accent-text)] text-sm font-medium rounded-full">
              Save 17%
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-accent/20">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Annual</h2>
                <p className="text-sm text-[var(--muted)]">Best value</p>
              </div>
            </div>
            
            <div className="mb-6">
              <span className="text-4xl font-bold text-accent">$99.99</span>
              <span className="text-[var(--muted)]">/year</span>
              <p className="text-sm text-[var(--muted)] mt-1">~$8.33/month</p>
            </div>

            <button
              onClick={() => handleSelectPlan('annual')}
              disabled={loading}
              className="w-full py-3 px-6 bg-accent text-[var(--accent-text)] rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingPlan === 'annual' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Get Started'
              )}
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-center mb-8">
            Everything included in Pro
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-accent" />
                </div>
                <span className="text-[var(--muted)]">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-[var(--muted)]">
          <p>Secure payment via Stripe. Cancel anytime.</p>
          <p className="mt-2">
            Questions? Email us at{' '}
            <a href="mailto:support@xthread.io" className="text-accent hover:underline">
              support@xthread.io
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

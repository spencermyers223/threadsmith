'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Zap, Crown, Loader2, ArrowLeft } from 'lucide-react'

type BillingPeriod = 'monthly' | 'annual'
type PlanType = 'premium_monthly' | 'premium_annual' | 'pro_monthly' | 'pro_annual'

const premiumFeatures = [
  'All post types (Scroll Stoppers, Debate Starters, etc.)',
  'Unlimited AI generations',
  'Voice training / custom tone',
  'Chrome extension',
  'Folders & tags',
  'Content calendar',
  '1 X account',
  'Impressions & engagement metrics',
  'Growth trends over time',
  'Post comparison',
]

const proFeatures = [
  'Everything in Premium',
  'Up to 5 X accounts',
  'Separate voice profiles per account',
  'URL click tracking',
  'Profile visit tracking',
  'Video retention curves',
  'Optimal posting times',
  'Priority support',
]

export default function PricingPage() {
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

  const premiumPrice = billingPeriod === 'monthly' ? 19.99 : 191.90
  const proPrice = billingPeriod === 'monthly' ? 39.99 : 383.90
  const premiumMonthly = billingPeriod === 'monthly' ? 19.99 : (191.90 / 12)
  const proMonthly = billingPeriod === 'monthly' ? 39.99 : (383.90 / 12)

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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-[var(--muted)] max-w-2xl mx-auto">
            Choose the plan that fits your content creation needs.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-2 p-1 bg-[var(--card)] border border-[var(--border)] rounded-lg">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-[var(--foreground)] text-[var(--background)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                billingPeriod === 'annual'
                  ? 'bg-[var(--foreground)] text-[var(--background)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              Annual
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                billingPeriod === 'annual'
                  ? 'bg-accent text-[var(--accent-text)]'
                  : 'bg-accent/20 text-accent'
              }`}>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* Premium */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Premium</h2>
                <p className="text-sm text-[var(--muted)]">For individual creators</p>
              </div>
            </div>
            
            <div className="mb-6">
              <span className="text-4xl font-bold">${premiumPrice.toFixed(2)}</span>
              <span className="text-[var(--muted)]">/{billingPeriod === 'monthly' ? 'month' : 'year'}</span>
              {billingPeriod === 'annual' && (
                <p className="text-sm text-[var(--muted)] mt-1">~${premiumMonthly.toFixed(2)}/month</p>
              )}
            </div>

            <button
              onClick={() => handleSelectPlan('premium')}
              disabled={loading}
              className="w-full py-3 px-6 bg-[var(--foreground)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mb-8"
            >
              {loadingPlan?.startsWith('premium') ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Get Started'
              )}
            </button>

            <ul className="space-y-3">
              {premiumFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-blue-400" />
                  </div>
                  <span className="text-sm text-[var(--muted)]">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="bg-accent/10 border-2 border-accent rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-[var(--accent-text)] text-sm font-medium rounded-full">
              Most Popular
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-accent/20">
                <Crown className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Pro</h2>
                <p className="text-sm text-[var(--muted)]">For power users & agencies</p>
              </div>
            </div>
            
            <div className="mb-6">
              <span className="text-4xl font-bold text-accent">${proPrice.toFixed(2)}</span>
              <span className="text-[var(--muted)]">/{billingPeriod === 'monthly' ? 'month' : 'year'}</span>
              {billingPeriod === 'annual' && (
                <p className="text-sm text-[var(--muted)] mt-1">~${proMonthly.toFixed(2)}/month</p>
              )}
            </div>

            <button
              onClick={() => handleSelectPlan('pro')}
              disabled={loading}
              className="w-full py-3 px-6 bg-accent text-[var(--accent-text)] rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mb-8"
            >
              {loadingPlan?.startsWith('pro') ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Get Started'
              )}
            </button>

            <ul className="space-y-3">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-accent" />
                  </div>
                  <span className="text-sm text-[var(--muted)]">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-[var(--muted)]">
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

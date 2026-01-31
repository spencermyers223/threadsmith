'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Check, Zap, Crown, Loader2, ArrowLeft } from 'lucide-react'

type BillingPeriod = 'monthly' | 'annual'
type PlanType = 'premium_monthly' | 'premium_annual' | 'pro_monthly' | 'pro_annual'

interface CurrentSubscription {
  hasSubscription: boolean
  tier: 'premium' | 'pro' | null
  billingPeriod: 'monthly' | 'annual' | 'lifetime' | null
  status: string | null
}

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

const professionalFeatures = [
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
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null)
  const [loadingSubscription, setLoadingSubscription] = useState(true)

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const res = await fetch('/api/subscription/current')
        if (res.ok) {
          const data = await res.json()
          setCurrentSubscription(data)
        }
      } catch (err) {
        console.error('Failed to fetch subscription:', err)
      } finally {
        setLoadingSubscription(false)
      }
    }
    fetchSubscription()
  }, [])

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
  const professionalPrice = billingPeriod === 'monthly' ? 39.99 : 383.90
  const premiumMonthly = billingPeriod === 'monthly' ? 19.99 : (191.90 / 12)
  const professionalMonthly = billingPeriod === 'monthly' ? 39.99 : (383.90 / 12)

  // Determine button text and state for each tier
  const getPremiumButton = () => {
    if (!currentSubscription?.hasSubscription) {
      return { text: 'Get Started', disabled: false, action: () => handleSelectPlan('premium') }
    }
    if (currentSubscription.tier === 'premium') {
      const periodLabel = currentSubscription.billingPeriod === 'lifetime' 
        ? 'Lifetime' 
        : currentSubscription.billingPeriod === 'annual' ? 'Annual' : 'Monthly'
      return { text: `Current Plan (${periodLabel})`, disabled: true, action: () => {} }
    }
    if (currentSubscription.tier === 'pro') {
      return { text: 'Downgrade to Premium', disabled: false, action: () => handleSelectPlan('premium') }
    }
    return { text: 'Get Started', disabled: false, action: () => handleSelectPlan('premium') }
  }

  const getProfessionalButton = () => {
    if (!currentSubscription?.hasSubscription) {
      return { text: 'Get Started', disabled: false, action: () => handleSelectPlan('pro') }
    }
    if (currentSubscription.tier === 'pro') {
      const periodLabel = currentSubscription.billingPeriod === 'annual' ? 'Annual' : 'Monthly'
      return { text: `Current Plan (${periodLabel})`, disabled: true, action: () => {} }
    }
    if (currentSubscription.tier === 'premium') {
      return { text: 'Upgrade to Professional', disabled: false, action: () => handleSelectPlan('pro') }
    }
    return { text: 'Get Started', disabled: false, action: () => handleSelectPlan('pro') }
  }

  const premiumButton = getPremiumButton()
  const professionalButton = getProfessionalButton()

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link 
            href="/settings"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            {currentSubscription?.hasSubscription ? 'Manage Your Subscription' : 'Simple, transparent pricing'}
          </h1>
          <p className="text-xl text-[var(--muted)] max-w-2xl mx-auto">
            {currentSubscription?.hasSubscription 
              ? 'Upgrade, downgrade, or manage your current plan.'
              : 'Choose the plan that fits your content creation needs.'}
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

        {/* Loading subscription state */}
        {loadingSubscription && (
          <div className="flex justify-center mb-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--muted)]" />
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* Premium */}
          <div className={`bg-[var(--card)] border rounded-2xl p-8 ${
            currentSubscription?.tier === 'premium' 
              ? 'border-blue-500 border-2' 
              : 'border-[var(--border)]'
          }`}>
            {currentSubscription?.tier === 'premium' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-sm font-medium rounded-full">
                Current Plan
              </div>
            )}
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
              onClick={premiumButton.action}
              disabled={loading || premiumButton.disabled}
              className={`w-full py-3 px-6 rounded-lg font-medium transition-all flex items-center justify-center gap-2 mb-8 ${
                premiumButton.disabled
                  ? 'bg-blue-500/20 text-blue-400 cursor-default'
                  : 'bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 disabled:opacity-50'
              }`}
            >
              {loadingPlan?.startsWith('premium') ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                premiumButton.text
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

          {/* Professional */}
          <div className={`rounded-2xl p-8 relative ${
            currentSubscription?.tier === 'pro'
              ? 'bg-accent/10 border-2 border-accent'
              : 'bg-accent/10 border-2 border-accent'
          }`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-[var(--accent-text)] text-sm font-medium rounded-full">
              {currentSubscription?.tier === 'pro' ? 'Current Plan' : 'Most Popular'}
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-accent/20">
                <Crown className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Professional</h2>
                <p className="text-sm text-[var(--muted)]">For power users & agencies</p>
              </div>
            </div>
            
            <div className="mb-6">
              <span className="text-4xl font-bold text-accent">${professionalPrice.toFixed(2)}</span>
              <span className="text-[var(--muted)]">/{billingPeriod === 'monthly' ? 'month' : 'year'}</span>
              {billingPeriod === 'annual' && (
                <p className="text-sm text-[var(--muted)] mt-1">~${professionalMonthly.toFixed(2)}/month</p>
              )}
            </div>

            <button
              onClick={professionalButton.action}
              disabled={loading || professionalButton.disabled}
              className={`w-full py-3 px-6 rounded-lg font-medium transition-all flex items-center justify-center gap-2 mb-8 ${
                professionalButton.disabled
                  ? 'bg-accent/30 text-accent cursor-default'
                  : 'bg-accent text-[var(--accent-text)] hover:bg-[var(--accent-hover)] disabled:opacity-50'
              }`}
            >
              {loadingPlan?.startsWith('pro') ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                professionalButton.text
              )}
            </button>

            <ul className="space-y-3">
              {professionalFeatures.map((feature) => (
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

'use client'

import { useState } from 'react'
import { Check, Sparkles, Zap, Loader2 } from 'lucide-react'

export type PlanType = 'monthly' | 'lifetime'

interface PricingCardsProps {
  onSelectPlan: (planType: PlanType) => void
  loading?: boolean
  loadingPlan?: PlanType | null
}

const PLANS = {
  monthly: {
    name: 'Pro Monthly',
    price: '$9.99',
    period: '/month',
    badge: 'Most flexible',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    description: 'Cancel anytime, no commitment',
    icon: Zap,
  },
  lifetime: {
    name: 'Lifetime Access',
    price: '$99.99',
    period: 'one-time',
    badge: 'Best value',
    badgeColor: 'bg-accent/20 text-accent border-accent/30',
    description: 'Pay once, use forever',
    icon: Sparkles,
    highlighted: true,
  },
}

const FEATURES = [
  'Unlimited post generations',
  'All post types (Scroll Stopper, Debate Starter, Viral Catalyst)',
  'Thread generation',
  'File-based content creation',
  'Priority support',
]

export function PricingCards({ onSelectPlan, loading, loadingPlan }: PricingCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
      {(Object.entries(PLANS) as [PlanType, typeof PLANS.monthly][]).map(([planType, plan]) => {
        const Icon = plan.icon
        const isHighlighted = 'highlighted' in plan && plan.highlighted
        const isLoading = loading && loadingPlan === planType

        return (
          <div
            key={planType}
            className={`relative flex flex-col p-6 rounded-xl border transition-all ${
              isHighlighted
                ? 'bg-accent/5 border-accent/50 ring-1 ring-accent/20'
                : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--muted)]'
            }`}
          >
            {/* Badge */}
            <div className={`absolute -top-3 left-4 px-3 py-1 text-xs font-medium rounded-full border ${plan.badgeColor}`}>
              {plan.badge}
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4 mt-2">
              <div className={`p-2 rounded-lg ${isHighlighted ? 'bg-accent/20' : 'bg-[var(--border)]'}`}>
                <Icon className={`w-5 h-5 ${isHighlighted ? 'text-accent' : 'text-[var(--foreground)]'}`} />
              </div>
              <h3 className="text-lg font-semibold">{plan.name}</h3>
            </div>

            {/* Price */}
            <div className="mb-2">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-[var(--muted)] ml-1">{plan.period}</span>
            </div>

            {/* Description */}
            <p className="text-sm text-[var(--muted)] mb-6">{plan.description}</p>

            {/* Features */}
            <ul className="space-y-3 mb-6 flex-1">
              {FEATURES.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isHighlighted ? 'text-accent' : 'text-green-400'}`} />
                  <span className="text-[var(--foreground)]">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button
              onClick={() => onSelectPlan(planType)}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                isHighlighted
                  ? 'bg-accent hover:bg-accent-hover text-[var(--accent-text)]'
                  : 'bg-[var(--foreground)] hover:bg-[var(--foreground)]/90 text-[var(--background)]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Get {plan.name}</>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}

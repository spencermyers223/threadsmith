'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Sparkles,
  Zap,
  FileText,
  MessageSquare,
  Calendar,
  ChevronDown,
  ArrowLeft,
  AlertCircle,
  Check,
} from 'lucide-react'
import { PricingCards, PlanType } from '@/components/subscription/PricingCards'

// FAQ Data
const FAQ_ITEMS = [
  {
    question: 'What counts as a generation?',
    answer: 'Each time you click "Generate Posts" counts as one generation, regardless of how many posts are created. Free users get 5 generations to try the service.',
  },
  {
    question: 'Can I cancel my subscription?',
    answer: 'Yes! Monthly subscriptions can be cancelled anytime from your account settings. You\'ll keep access until the end of your billing period.',
  },
  {
    question: 'What\'s included in Lifetime Access?',
    answer: 'Lifetime Access is a one-time payment that gives you unlimited generations forever. You\'ll also get all future features and updates at no extra cost.',
  },
  {
    question: 'Is my payment secure?',
    answer: 'Absolutely. All payments are processed securely through Stripe, the same payment processor used by companies like Amazon and Google.',
  },
]

// Features list
const FEATURES = [
  {
    icon: Sparkles,
    title: 'Unlimited Generations',
    description: 'Create as many posts as you need without limits',
  },
  {
    icon: Zap,
    title: 'All Post Types',
    description: 'Scroll Stoppers, Debate Starters, and Viral Catalysts',
  },
  {
    icon: FileText,
    title: 'File-Based Creation',
    description: 'Upload your notes and turn them into content',
  },
  {
    icon: MessageSquare,
    title: 'Thread Generation',
    description: 'Create engaging multi-tweet threads',
  },
  {
    icon: Calendar,
    title: 'Content Calendar',
    description: 'Plan and schedule your posts in advance',
  },
]

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="font-medium">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-[var(--muted)] transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="pb-4 text-[var(--muted)] text-sm animate-fade-in">
          {answer}
        </div>
      )}
    </div>
  )
}

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
      <header className="border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/generate" className="flex items-center">
            <Image
              src="/logo.svg"
              alt="ThreadSmith"
              width={160}
              height={36}
              className="h-8 w-auto"
              priority
            />
          </Link>
          <Link
            href="/generate"
            className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to app
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-full text-accent text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Upgrade to unlock
            <span className="text-accent"> unlimited</span> generations
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-xl mx-auto">
            Stop worrying about limits. Create as much content as you need to grow your audience on X.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16 px-6">
        {error && (
          <div className="max-w-2xl mx-auto mb-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        <PricingCards
          onSelectPlan={handleSelectPlan}
          loading={loading}
          loadingPlan={loadingPlan}
        />
        <p className="text-center text-sm text-[var(--muted)] mt-6">
          Secure payment powered by Stripe
        </p>
      </section>

      {/* Features */}
      <section className="py-16 px-6 border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">
            Everything you need to create great content
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div
                  key={idx}
                  className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-xl"
                >
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-accent/20 mb-4">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-[var(--muted)]">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-16 px-6 border-t border-[var(--border)]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">
            Free vs Pro
          </h2>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-6 py-4 text-left font-medium">Feature</th>
                  <th className="px-6 py-4 text-center font-medium">Free</th>
                  <th className="px-6 py-4 text-center font-medium text-accent">Pro</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-[var(--border)]">
                  <td className="px-6 py-4">Generations</td>
                  <td className="px-6 py-4 text-center text-[var(--muted)]">5 total</td>
                  <td className="px-6 py-4 text-center text-accent font-medium">Unlimited</td>
                </tr>
                <tr className="border-b border-[var(--border)]">
                  <td className="px-6 py-4">Post types</td>
                  <td className="px-6 py-4 text-center"><Check className="w-4 h-4 mx-auto text-green-400" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-4 h-4 mx-auto text-accent" /></td>
                </tr>
                <tr className="border-b border-[var(--border)]">
                  <td className="px-6 py-4">Thread generation</td>
                  <td className="px-6 py-4 text-center"><Check className="w-4 h-4 mx-auto text-green-400" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-4 h-4 mx-auto text-accent" /></td>
                </tr>
                <tr className="border-b border-[var(--border)]">
                  <td className="px-6 py-4">File uploads</td>
                  <td className="px-6 py-4 text-center"><Check className="w-4 h-4 mx-auto text-green-400" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-4 h-4 mx-auto text-accent" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4">Priority support</td>
                  <td className="px-6 py-4 text-center text-[var(--muted)]">-</td>
                  <td className="px-6 py-4 text-center"><Check className="w-4 h-4 mx-auto text-accent" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 border-t border-[var(--border)]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-6">
            {FAQ_ITEMS.map((item, idx) => (
              <FAQItem key={idx} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 border-t border-[var(--border)]">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">
            Ready to grow your audience?
          </h2>
          <p className="text-[var(--muted)] mb-8">
            Join thousands of creators using ThreadSmith to create engaging content.
          </p>
          <button
            onClick={() => handleSelectPlan('lifetime')}
            disabled={loading}
            className="px-8 py-3 bg-accent hover:bg-accent-hover text-[var(--accent-text)] rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Get Lifetime Access - $99.99
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-[var(--muted)]">
          ThreadSmith - Built for researchers who want to share their work on X
        </div>
      </footer>
    </div>
  )
}

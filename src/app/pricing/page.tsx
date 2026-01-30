'use client';

import { useState } from 'react';
import { Check, X, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';

const tiers = [
  {
    name: 'Premium',
    monthlyPrice: 19.99,
    annualPrice: 192,
    annualMonthly: 16,
    description: 'Everything you need to create viral content',
    icon: Sparkles,
    color: 'from-amber-500 to-orange-500',
    features: [
      { name: 'Unlimited generations', included: true },
      { name: 'Chrome extension', included: true },
      { name: 'Voice training', included: true },
      { name: 'Folders & content calendar', included: true },
      { name: 'Impressions & engagement analytics', included: true },
      { name: 'Growth trends', included: true },
      { name: 'Post comparison', included: true },
      { name: '1 X account', included: true, highlight: true },
      { name: 'URL & profile click tracking', included: false },
      { name: 'Video retention curves', included: false },
      { name: 'Optimal posting times', included: false },
      { name: 'Priority support', included: false },
    ],
    cta: 'Get Premium',
    plan: 'premium',
  },
  {
    name: 'Professional',
    monthlyPrice: 39.99,
    annualPrice: 384,
    annualMonthly: 32,
    description: 'For power users managing multiple accounts',
    icon: Zap,
    color: 'from-violet-500 to-purple-600',
    popular: true,
    features: [
      { name: 'Unlimited generations', included: true },
      { name: 'Chrome extension', included: true },
      { name: 'Voice training', included: true },
      { name: 'Folders & content calendar', included: true },
      { name: 'Impressions & engagement analytics', included: true },
      { name: 'Growth trends', included: true },
      { name: 'Post comparison', included: true },
      { name: 'Up to 5 X accounts', included: true, highlight: true },
      { name: 'URL & profile click tracking', included: true, highlight: true },
      { name: 'Video retention curves', included: true, highlight: true },
      { name: 'Optimal posting times', included: true, highlight: true },
      { name: 'Priority support', included: true, highlight: true },
    ],
    cta: 'Get Professional',
    plan: 'professional',
  },
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-stone-800">
            xthread
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="text-stone-600 hover:text-stone-900 transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-stone-900 text-white px-4 py-2 rounded-lg hover:bg-stone-800 transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-xl text-stone-600 max-w-2xl mx-auto">
          Choose the plan that fits your content strategy. Upgrade or downgrade anytime.
        </p>
      </section>

      {/* Billing Toggle */}
      <section className="max-w-6xl mx-auto px-4 pb-8">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              billingPeriod === 'annual'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Annual
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              billingPeriod === 'annual'
                ? 'bg-green-500 text-white'
                : 'bg-green-100 text-green-700'
            }`}>
              Save 20%
            </span>
          </button>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-8">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            const displayPrice = billingPeriod === 'monthly' ? tier.monthlyPrice : tier.annualMonthly;
            const period = billingPeriod === 'monthly' ? '/month' : '/month';
            const billedText = billingPeriod === 'annual' ? `Billed $${tier.annualPrice}/year` : '';
            
            return (
              <div
                key={tier.name}
                className={`relative bg-white rounded-2xl border-2 ${
                  tier.popular ? 'border-violet-500 shadow-xl shadow-violet-100' : 'border-stone-200'
                } p-8 flex flex-col`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="mb-6">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${tier.color} mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-stone-900">{tier.name}</h2>
                  <p className="text-stone-500 mt-1">{tier.description}</p>
                </div>

                {/* Price */}
                <div className="mb-2">
                  <span className="text-5xl font-bold text-stone-900">${displayPrice}</span>
                  <span className="text-stone-500">{period}</span>
                </div>
                
                {/* Billed annually note */}
                <div className="mb-6 h-6">
                  {billingPeriod === 'annual' && (
                    <span className="text-sm text-green-600 font-medium">{billedText} — Save 20%</span>
                  )}
                </div>

                {/* CTA */}
                <Link
                  href={`/signup?plan=${tier.plan}&billing=${billingPeriod}`}
                  className={`w-full py-3 px-6 rounded-xl font-semibold text-center transition-all mb-8 ${
                    tier.popular
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-200'
                      : 'bg-stone-900 text-white hover:bg-stone-800'
                  }`}
                >
                  {tier.cta}
                </Link>

                {/* Features */}
                <div className="space-y-3 flex-grow">
                  <p className="text-sm font-medium text-stone-500 uppercase tracking-wide">
                    What&apos;s included
                  </p>
                  {tier.features.map((feature) => (
                    <div key={feature.name} className="flex items-center gap-3">
                      {feature.included ? (
                        <div className={`p-1 rounded-full ${feature.highlight ? 'bg-violet-100' : 'bg-green-100'}`}>
                          <Check className={`w-4 h-4 ${feature.highlight ? 'text-violet-600' : 'text-green-600'}`} />
                        </div>
                      ) : (
                        <div className="p-1 rounded-full bg-stone-100">
                          <X className="w-4 h-4 text-stone-400" />
                        </div>
                      )}
                      <span className={`${feature.included ? 'text-stone-700' : 'text-stone-400'} ${feature.highlight ? 'font-medium' : ''}`}>
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-stone-900 text-center mb-8">
          Full Feature Comparison
        </h2>
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left p-4 bg-stone-50 text-stone-600 font-medium">Feature</th>
                <th className="p-4 bg-stone-50 text-center">
                  <span className="text-stone-900 font-bold">Premium</span>
                  <span className="block text-sm text-stone-500">
                    {billingPeriod === 'monthly' ? '$19.99/mo' : '$16/mo (billed annually)'}
                  </span>
                </th>
                <th className="p-4 bg-violet-50 text-center">
                  <span className="text-violet-900 font-bold">Professional</span>
                  <span className="block text-sm text-violet-600">
                    {billingPeriod === 'monthly' ? '$39.99/mo' : '$32/mo (billed annually)'}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: 'AI Tweet Generations', premium: 'Unlimited', pro: 'Unlimited' },
                { feature: 'Chrome Extension', premium: true, pro: true },
                { feature: 'Voice Training', premium: true, pro: true },
                { feature: 'Content Calendar', premium: true, pro: true },
                { feature: 'Folders & Organization', premium: true, pro: true },
                { feature: 'Impressions Analytics', premium: true, pro: true },
                { feature: 'Engagement Analytics', premium: true, pro: true },
                { feature: 'Growth Trends', premium: true, pro: true },
                { feature: 'Post Comparison', premium: true, pro: true },
                { feature: 'X Accounts', premium: '1', pro: 'Up to 5', highlight: true },
                { feature: 'URL Click Tracking', premium: false, pro: true, highlight: true },
                { feature: 'Profile Visit Tracking', premium: false, pro: true, highlight: true },
                { feature: 'Video Retention Curves', premium: false, pro: true, highlight: true },
                { feature: 'Optimal Posting Times', premium: false, pro: true, highlight: true },
                { feature: 'Priority Support', premium: false, pro: true, highlight: true },
              ].map((row, idx) => (
                <tr key={row.feature} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}>
                  <td className={`p-4 text-stone-700 ${row.highlight ? 'font-medium' : ''}`}>
                    {row.feature}
                  </td>
                  <td className="p-4 text-center">
                    {typeof row.premium === 'boolean' ? (
                      row.premium ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-stone-300 mx-auto" />
                      )
                    ) : (
                      <span className="text-stone-700">{row.premium}</span>
                    )}
                  </td>
                  <td className={`p-4 text-center ${row.highlight ? 'bg-violet-50/50' : ''}`}>
                    {typeof row.pro === 'boolean' ? (
                      row.pro ? (
                        <Check className="w-5 h-5 text-violet-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-stone-300 mx-auto" />
                      )
                    ) : (
                      <span className={`${row.highlight ? 'text-violet-700 font-medium' : 'text-stone-700'}`}>
                        {row.pro}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-stone-900 text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {[
            {
              q: 'Can I switch plans anytime?',
              a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any differences.',
            },
            {
              q: 'What happens to my content if I downgrade?',
              a: 'Your content is always safe. If you downgrade from Pro to Premium, you\'ll keep one X account active and can choose which one. Your saved content, folders, and analytics history remain intact.',
            },
            {
              q: 'How much do I save with annual billing?',
              a: 'Annual billing saves you 20% compared to monthly. Premium drops from $19.99/month to $16/month ($192/year), and Pro drops from $39.99/month to $32/month ($384/year).',
            },
            {
              q: 'Is there a free trial?',
              a: 'We offer a 7-day money-back guarantee. Try xthread risk-free — if it\'s not for you, we\'ll refund your payment, no questions asked.',
            },
          ].map((faq) => (
            <details
              key={faq.q}
              className="bg-white rounded-xl border border-stone-200 p-4 group"
            >
              <summary className="font-medium text-stone-900 cursor-pointer list-none flex items-center justify-between">
                {faq.q}
                <span className="text-stone-400 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="mt-3 text-stone-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-stone-900 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to create viral content?
          </h2>
          <p className="text-stone-400 mb-8">
            Join thousands of creators using xthread to grow their audience on X.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-stone-900 px-8 py-3 rounded-xl font-semibold hover:bg-stone-100 transition-colors"
          >
            Get Started Today
          </Link>
        </div>
      </section>
    </div>
  );
}

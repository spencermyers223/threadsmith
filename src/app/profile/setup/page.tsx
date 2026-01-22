'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { NicheSelector, VoiceStyleSelector, AdmiredAccountsInput } from '@/components/profile'
import type { Niche } from '@/components/profile/NicheSelector'
import type { VoiceStyle } from '@/components/profile/VoiceStyleSelector'

const TOTAL_STEPS = 5

const stepTitles = [
  'Your Niche',
  'Your Content Goal',
  'Target Audience',
  'Voice Style',
  'Accounts You Admire',
]

// Niche-specific placeholder examples for content goal
const goalPlaceholders: Record<string, string> = {
  'web3_crypto': "I am a researcher attempting to grow my X following with consistent posts about new crypto protocols",
  'finance_investing': "I share market analysis and investment insights to build credibility as a financial advisor",
  'saas_tech': "I'm a founder building in public, sharing our startup journey to attract customers and investors",
  'marketing_agency': "I help brands grow on social media and share case studies to attract new clients",
  'fitness_health': "I'm a personal trainer sharing workout tips and transformations to grow my online coaching business",
  'creator_economy': "I teach creators how to monetize their audience and build sustainable income streams",
  'ecommerce_dtc': "I share e-commerce growth strategies to establish myself as a thought leader in DTC",
  'career_jobs': "I post career advice and job search tips to build my personal brand as a recruiter",
  'sports': "I share sports analysis and hot takes to grow my following as a sports commentator",
  'news': "I break down current events with unique perspectives to become a trusted news source",
  'other': "I want to grow my X following by sharing valuable content consistently",
}

export default function ProfileSetupPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [niche, setNiche] = useState<Niche | null>(null)
  const [contentGoal, setContentGoal] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle | null>(null)
  const [admiredAccounts, setAdmiredAccounts] = useState<string[]>([])

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return niche !== null
      case 2:
        return contentGoal.trim().length > 0
      case 3:
        return targetAudience.trim().length > 0
      case 4:
        return voiceStyle !== null
      case 5:
        return true // Admired accounts are optional
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1)
      setError(null)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setError(null)
    }
  }

  const handleSkip = () => {
    router.push('/generate')
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      const { error: upsertError } = await supabase
        .from('content_profiles')
        .upsert({
          user_id: user.id,
          niche,
          content_goal: contentGoal.trim(),
          target_audience: targetAudience.trim(),
          voice_style: voiceStyle,
          admired_accounts: admiredAccounts,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })

      if (upsertError) {
        throw upsertError
      }

      router.push('/generate')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <NicheSelector
            selectedNiche={niche}
            onSelect={setNiche}
          />
        )

      case 2:
        const placeholder = niche ? goalPlaceholders[niche] || goalPlaceholders['other'] : goalPlaceholders['other']
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              What are you trying to achieve?
            </label>
            <textarea
              value={contentGoal}
              onChange={(e) => setContentGoal(e.target.value.slice(0, 500))}
              placeholder={placeholder}
              rows={5}
              className="
                w-full px-4 py-3 rounded-lg resize-none
                bg-[var(--card)] border border-[var(--border)]
                text-[var(--foreground)] placeholder-[var(--muted)]
                focus:outline-none focus:border-[var(--accent)]
                transition-colors duration-150
              "
            />
            <p className="text-xs text-[var(--muted)] text-right">
              {contentGoal.length}/500 characters
            </p>
          </div>
        )

      case 3:
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Who are you talking to?
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., 'Crypto and DeFi native people'"
              className="
                w-full px-4 py-3 rounded-lg
                bg-[var(--card)] border border-[var(--border)]
                text-[var(--foreground)] placeholder-[var(--muted)]
                focus:outline-none focus:border-[var(--accent)]
                transition-colors duration-150
              "
            />
          </div>
        )

      case 4:
        return (
          <VoiceStyleSelector
            selectedStyle={voiceStyle}
            onSelect={setVoiceStyle}
          />
        )

      case 5:
        return (
          <AdmiredAccountsInput
            accounts={admiredAccounts}
            onAdd={(account) => setAdmiredAccounts([...admiredAccounts, account])}
            onRemove={(account) => setAdmiredAccounts(admiredAccounts.filter(a => a !== account))}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">
            Set up your content profile
          </h1>
          <button
            onClick={handleSkip}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            {stepTitles.map((title, index) => {
              const stepNum = index + 1
              const isActive = stepNum === currentStep
              const isCompleted = stepNum < currentStep

              return (
                <div
                  key={stepNum}
                  className="flex flex-col items-center flex-1"
                >
                  <div className="flex items-center w-full">
                    {index > 0 && (
                      <div
                        className={`
                          h-0.5 flex-1
                          ${isCompleted || isActive ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}
                        `}
                      />
                    )}
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                        transition-colors duration-150
                        ${isCompleted
                          ? 'bg-[var(--accent)] text-[var(--background)]'
                          : isActive
                            ? 'bg-[var(--accent)] text-[var(--background)]'
                            : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]'
                        }
                      `}
                    >
                      {isCompleted ? <Check size={16} /> : stepNum}
                    </div>
                    {index < stepTitles.length - 1 && (
                      <div
                        className={`
                          h-0.5 flex-1
                          ${isCompleted ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}
                        `}
                      />
                    )}
                  </div>
                  <span
                    className={`
                      mt-2 text-xs text-center hidden sm:block
                      ${isActive ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}
                    `}
                  >
                    {title}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
      <main className="flex-1 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-1">
              {stepTitles[currentStep - 1]}
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Step {currentStep} of {TOTAL_STEPS}
            </p>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
            {renderStepContent()}
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </main>

      {/* Navigation */}
      <footer className="border-t border-[var(--border)] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              border border-[var(--border)] text-[var(--foreground)]
              hover:bg-[var(--card)] transition-colors duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {currentStep < TOTAL_STEPS ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                bg-[var(--accent)] text-[var(--background)]
                hover:opacity-90 transition-opacity duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              Next
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isSubmitting}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                bg-[var(--accent)] text-[var(--background)]
                hover:opacity-90 transition-opacity duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Complete Setup
                </>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}

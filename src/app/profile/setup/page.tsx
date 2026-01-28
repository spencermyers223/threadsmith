'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Loader2, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { NicheSelector, AdmiredAccountsInput } from '@/components/profile'
import type { Niche } from '@/components/profile/NicheSelector'

const TOTAL_STEPS = 5

const stepTitles = [
  'Your Niche',
  'Your Content Goal',
  'Target Audience',
  'Posting Schedule',
  'Accounts You Admire',
]

// Time slots for posting preferences
const TIME_SLOTS = [
  { id: 'early_morning', label: 'Early Morning', time: '6-9 AM', value: '07:00' },
  { id: 'late_morning', label: 'Late Morning', time: '9 AM-12 PM', value: '10:00' },
  { id: 'afternoon', label: 'Afternoon', time: '12-3 PM', value: '13:00' },
  { id: 'late_afternoon', label: 'Late Afternoon', time: '3-6 PM', value: '16:00' },
  { id: 'evening', label: 'Evening', time: '6-9 PM', value: '19:00' },
  { id: 'night', label: 'Night', time: '9 PM-12 AM', value: '22:00' },
]

// Common timezones
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
]

// Niche-specific placeholder examples for content goal
const goalPlaceholders: Record<string, string> = {
  'ai-ml': "I'm an AI researcher sharing insights on LLMs and ML developments to build thought leadership",
  'crypto-web3': "I share insights on blockchain and Web3 to establish credibility in the space",
  'robotics': "I cover robotics and hardware innovations to build my following as an industry voice",
  'quantum': "I make quantum computing accessible to build authority in an emerging field",
  'biotech': "I share biotech and health tech insights to grow my professional network",
  'space': "I cover space tech and aerospace to build a following of enthusiasts and professionals",
  'climate': "I share climate tech insights and solutions to establish myself as a sustainability voice",
  'fintech': "I cover fintech trends and innovations to build credibility in financial technology",
  'cybersecurity': "I share security research and insights to establish my expertise",
  'devtools': "I review dev tools and share coding insights to grow my developer audience",
  'gaming': "I cover gaming and VR/AR to build my following in the games industry",
  'general-tech': "I share tech industry insights and startup lessons to grow my professional brand",
  'saas-tech': "I'm a founder building in public, sharing our startup journey to attract customers and investors",
  'finance-investing': "I share market analysis and investment insights to build credibility as a financial advisor",
  'marketing-agency': "I help brands grow on social media and share case studies to attract new clients",
  'fitness-health': "I'm a personal trainer sharing workout tips and transformations to grow my online coaching business",
  'creator-economy': "I teach creators how to monetize their audience and build sustainable income streams",
  'ecommerce-dtc': "I share e-commerce growth strategies to establish myself as a thought leader in DTC",
  'career-job-advice': "I post career advice and job search tips to build my personal brand as a recruiter",
  'sports': "I share sports analysis and hot takes to grow my following as a sports commentator",
  'news': "I break down current events with unique perspectives to become a trusted news source",
  'other': "I want to grow my X following by sharing valuable content consistently",
}

function detectTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    // Check if it's in our list
    if (TIMEZONES.some(t => t.value === tz)) {
      return tz
    }
    // Default to ET if not found
    return 'America/New_York'
  } catch {
    return 'America/New_York'
  }
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
  const [admiredAccounts, setAdmiredAccounts] = useState<string[]>([])

  // Posting schedule state
  const [postsPerDay, setPostsPerDay] = useState(2)
  const [preferredTimes, setPreferredTimes] = useState<string[]>(['late_morning', 'evening'])
  const [timezone, setTimezone] = useState('America/New_York')

  // Auto-detect timezone on mount
  useEffect(() => {
    setTimezone(detectTimezone())
  }, [])

  const togglePreferredTime = (timeId: string) => {
    setPreferredTimes(prev =>
      prev.includes(timeId)
        ? prev.filter(t => t !== timeId)
        : [...prev, timeId]
    )
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return niche !== null
      case 2:
        return contentGoal.trim().length > 0
      case 3:
        return targetAudience.trim().length > 0
      case 4:
        return preferredTimes.length > 0
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
    router.push('/creator-hub')
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

      // Convert preferred time IDs to actual time values
      const preferredTimeValues = preferredTimes
        .map(id => TIME_SLOTS.find(slot => slot.id === id)?.value)
        .filter(Boolean) as string[]

      const { error: upsertError } = await supabase
        .from('content_profiles')
        .upsert({
          user_id: user.id,
          niche,
          content_goal: contentGoal.trim(),
          target_audience: targetAudience.trim(),
          admired_accounts: admiredAccounts,
          posts_per_day: postsPerDay,
          preferred_times: preferredTimeValues,
          timezone,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })

      if (upsertError) {
        throw upsertError
      }

      router.push('/creator-hub')
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
              placeholder="e.g., 'AI researchers and tech enthusiasts'"
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
          <div className="space-y-6">
            {/* Posts per day */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Target posts per day
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setPostsPerDay(num)}
                    className={`
                      flex-1 py-3 rounded-lg text-sm font-medium transition-all
                      ${postsPerDay === num
                        ? 'bg-[var(--accent)] text-[var(--background)]'
                        : 'bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent)]'
                      }
                    `}
                  >
                    {num === 5 ? '5+' : num}
                  </button>
                ))}
              </div>
            </div>

            {/* Preferred posting times */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Best times to post
              </label>
              <p className="text-xs text-[var(--muted)]">
                Select all time slots that work for you
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const isSelected = preferredTimes.includes(slot.id)
                  return (
                    <button
                      key={slot.id}
                      onClick={() => togglePreferredTime(slot.id)}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg text-left transition-all
                        ${isSelected
                          ? 'bg-[var(--accent)]/15 border border-[var(--accent)] text-[var(--foreground)]'
                          : 'bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--muted)]'
                        }
                      `}
                    >
                      <div className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center
                        ${isSelected
                          ? 'bg-[var(--accent)] border-[var(--accent)]'
                          : 'border-[var(--muted)]'
                        }
                      `}>
                        {isSelected && <Check size={14} className="text-[var(--background)]" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{slot.label}</div>
                        <div className="text-xs text-[var(--muted)]">{slot.time}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Your timezone
              </label>
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="
                    w-full pl-10 pr-4 py-3 rounded-lg appearance-none
                    bg-[var(--background)] border border-[var(--border)]
                    text-[var(--foreground)]
                    focus:outline-none focus:border-[var(--accent)]
                    transition-colors duration-150
                  "
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
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
              {currentStep === 4 ? 'How often do you want to post?' : `Step ${currentStep} of ${TOTAL_STEPS}`}
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

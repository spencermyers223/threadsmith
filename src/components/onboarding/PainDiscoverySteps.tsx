'use client'

import { Check } from 'lucide-react'
import type { OnboardingData } from './OnboardingModal'

// Step 1: Struggles options
const STRUGGLES = [
  { id: 'dont_know_what', label: "I don't know what to post" },
  { id: 'no_engagement', label: 'I post but get no engagement' },
  { id: 'inconsistent', label: "I'm inconsistent / can't stay motivated" },
  { id: 'ideas_wrong', label: 'I have ideas but they come out wrong' },
  { id: 'algorithm', label: "I don't understand how the algorithm works" },
]

// Step 2: Growth stage options
const GROWTH_STAGES = [
  { id: 'under_1k', label: 'Stuck under 1K followers', description: 'Building from the ground up' },
  { id: '1k_10k', label: 'Growing slowly (1K-10K)', description: 'Making progress but want faster growth' },
  { id: 'dropping', label: 'Good following but engagement is dropping', description: 'Reach declining despite follower count' },
  { id: 'fresh', label: 'Starting fresh / new account', description: 'Beginning a new journey' },
]

// Step 3: Time spent options
const TIME_OPTIONS = [
  { id: 'too_much', label: 'Too much', description: 'Hours for one post' },
  { id: 'not_enough', label: 'Not enough', description: 'I keep putting it off' },
  { id: 'inconsistent', label: 'Inconsistent', description: 'Feast or famine' },
]

interface PainDiscoveryStepsProps {
  step: number
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
}

export default function PainDiscoverySteps({
  step,
  data,
  updateData,
}: PainDiscoveryStepsProps) {
  const toggleStruggle = (id: string) => {
    const current = data.struggles
    if (current.includes(id)) {
      updateData({ struggles: current.filter(s => s !== id) })
    } else {
      updateData({ struggles: [...current, id] })
    }
  }

  // Step 1: Struggles (multi-select)
  if (step === 1) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
            What&apos;s your biggest struggle with X/Twitter?
          </h2>
          <p className="text-[var(--muted)]">
            Select all that apply - this helps us personalize your experience
          </p>
        </div>

        <div className="space-y-3">
          {STRUGGLES.map((struggle) => {
            const isSelected = data.struggles.includes(struggle.id)
            return (
              <button
                key={struggle.id}
                onClick={() => toggleStruggle(struggle.id)}
                className={`
                  w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all
                  ${isSelected
                    ? 'bg-[var(--accent)]/15 border-2 border-[var(--accent)]'
                    : 'bg-[var(--card)] border-2 border-[var(--border)] hover:border-[var(--muted)]'
                  }
                `}
              >
                <div
                  className={`
                    w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0
                    ${isSelected
                      ? 'bg-[var(--accent)] border-[var(--accent)]'
                      : 'border-[var(--muted)]'
                    }
                  `}
                >
                  {isSelected && <Check size={14} className="text-[var(--background)]" />}
                </div>
                <span className="text-[var(--foreground)] font-medium">
                  {struggle.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Step 2: Growth stage (single select)
  if (step === 2) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
            How&apos;s your growth been?
          </h2>
          <p className="text-[var(--muted)]">
            Where are you in your X journey?
          </p>
        </div>

        <div className="space-y-3">
          {GROWTH_STAGES.map((stage) => {
            const isSelected = data.growthStage === stage.id
            return (
              <button
                key={stage.id}
                onClick={() => updateData({ growthStage: stage.id })}
                className={`
                  w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all
                  ${isSelected
                    ? 'bg-[var(--accent)]/15 border-2 border-[var(--accent)]'
                    : 'bg-[var(--card)] border-2 border-[var(--border)] hover:border-[var(--muted)]'
                  }
                `}
              >
                <div
                  className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${isSelected
                      ? 'border-[var(--accent)]'
                      : 'border-[var(--muted)]'
                    }
                  `}
                >
                  {isSelected && (
                    <div className="w-3 h-3 rounded-full bg-[var(--accent)]" />
                  )}
                </div>
                <div>
                  <span className="text-[var(--foreground)] font-medium block">
                    {stage.label}
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    {stage.description}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Step 3: Time spent (single select)
  if (step === 3) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
            How much time do you spend on content?
          </h2>
          <p className="text-[var(--muted)]">
            Understanding your workflow helps us optimize for you
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIME_OPTIONS.map((option) => {
            const isSelected = data.timeSpent === option.id
            return (
              <button
                key={option.id}
                onClick={() => updateData({ timeSpent: option.id })}
                className={`
                  flex flex-col items-center justify-center p-6 rounded-xl text-center transition-all
                  ${isSelected
                    ? 'bg-[var(--accent)]/15 border-2 border-[var(--accent)]'
                    : 'bg-[var(--card)] border-2 border-[var(--border)] hover:border-[var(--muted)]'
                  }
                `}
              >
                <span className="text-[var(--foreground)] font-semibold text-lg mb-1">
                  {option.label}
                </span>
                <span className="text-sm text-[var(--muted)]">
                  {option.description}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return null
}

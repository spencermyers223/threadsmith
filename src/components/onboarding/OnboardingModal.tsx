'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, ArrowLeft, ArrowRight, Loader2, Check, Sparkles } from 'lucide-react'

// Step components
import PainDiscoverySteps from './PainDiscoverySteps'
import ProfileSetupSteps from './ProfileSetupSteps'
import FirstWinStep from './FirstWinStep'

const TOTAL_STEPS = 8

// Phase definitions
const PHASES = [
  { name: 'Pain Discovery', steps: [1, 2, 3] },
  { name: 'Profile Setup', steps: [4, 5, 6, 7] },
  { name: 'First Win', steps: [8] },
]

export interface OnboardingData {
  // Phase 1: Pain Discovery
  struggles: string[]
  growthStage: string
  timeSpent: string

  // Phase 2: Profile Setup
  primaryNiche: string
  secondaryInterests: string[]
  specificProtocols: string
  voiceExamples: string
  voiceDescription: string
  toneFormalCasual: number
  toneHedgedDirect: number
  toneSeriousPlayful: number
  primaryGoal: string
  contentFrequency: string
  admiredAccounts: string[]
  targetAudience: string

  // Phase 3: First Win
  firstPostTopic: string
  firstPostType: string
  generatedPost: string | null
}

const initialData: OnboardingData = {
  struggles: [],
  growthStage: '',
  timeSpent: '',
  primaryNiche: '',
  secondaryInterests: [],
  specificProtocols: '',
  voiceExamples: '',
  voiceDescription: '',
  toneFormalCasual: 3,
  toneHedgedDirect: 3,
  toneSeriousPlayful: 3,
  primaryGoal: '',
  contentFrequency: '',
  admiredAccounts: [],
  targetAudience: '',
  firstPostTopic: '',
  firstPostType: 'market_take',
  generatedPost: null,
}

interface OnboardingModalProps {
  isOpen: boolean
  onComplete: () => void
}

export default function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<OnboardingData>(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get current phase
  const currentPhase = PHASES.find(phase => phase.steps.includes(currentStep))
  const currentPhaseIndex = PHASES.findIndex(phase => phase.steps.includes(currentStep))

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1)
      setData(initialData)
      setError(null)
    }
  }, [isOpen])

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return data.struggles.length > 0
      case 2:
        return data.growthStage !== ''
      case 3:
        return data.timeSpent !== ''
      case 4:
        return data.primaryNiche !== ''
      case 5:
        return data.voiceExamples.trim() !== '' || data.voiceDescription.trim() !== ''
      case 6:
        return data.primaryGoal !== '' && data.contentFrequency !== ''
      case 7:
        return true // Admired accounts are optional
      case 8:
        return true // Can skip or complete
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS && canProceed()) {
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

  const handleComplete = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      // Save onboarding data to content_profiles
      const { error: upsertError } = await supabase
        .from('content_profiles')
        .upsert({
          user_id: user.id,
          // Pain Discovery
          struggles: data.struggles,
          growth_stage: data.growthStage,
          time_spent: data.timeSpent,
          // Profile Setup
          primary_niche: data.primaryNiche,
          niche: data.primaryNiche, // Keep for backwards compatibility
          secondary_interests: data.secondaryInterests,
          specific_protocols: data.specificProtocols,
          voice_examples: data.voiceExamples,
          voice_description: data.voiceDescription,
          tone_formal_casual: data.toneFormalCasual,
          tone_hedged_direct: data.toneHedgedDirect,
          tone_serious_playful: data.toneSeriousPlayful,
          primary_goal: data.primaryGoal,
          content_goal: data.primaryGoal, // Keep for backwards compatibility
          content_frequency: data.contentFrequency,
          admired_accounts: data.admiredAccounts,
          target_audience: data.targetAudience,
          // Mark onboarding complete
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })

      if (upsertError) {
        throw upsertError
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    // Skip onboarding but still mark as "seen"
    handleComplete()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-[var(--background)] z-50 overflow-auto">
      {/* Header */}
      <header className="sticky top-0 bg-[var(--background)] border-b border-[var(--border)] px-6 py-4 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              Welcome to xthread
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {currentPhase?.name} - Step {currentStep} of {TOTAL_STEPS}
            </p>
          </div>
          <button
            onClick={handleSkip}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="px-6 py-6 bg-[var(--background)]">
        <div className="max-w-2xl mx-auto">
          {/* Phase indicators */}
          <div className="flex items-center justify-between mb-4">
            {PHASES.map((phase, index) => {
              const isActive = index === currentPhaseIndex
              const isCompleted = index < currentPhaseIndex
              const phaseFirstStep = phase.steps[0]
              const phaseLastStep = phase.steps[phase.steps.length - 1]

              return (
                <div key={phase.name} className="flex items-center flex-1">
                  {index > 0 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        isCompleted ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                      }`}
                    />
                  )}
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                        transition-colors duration-150
                        ${isCompleted
                          ? 'bg-[var(--accent)] text-[var(--background)]'
                          : isActive
                            ? 'bg-[var(--accent)] text-[var(--background)]'
                            : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]'
                        }
                      `}
                    >
                      {isCompleted ? (
                        <Check size={18} />
                      ) : index === 2 ? (
                        <Sparkles size={18} />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={`
                        mt-2 text-xs text-center whitespace-nowrap
                        ${isActive ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}
                      `}
                    >
                      {phase.name}
                    </span>
                  </div>
                  {index < PHASES.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        isCompleted ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Step progress within phase */}
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(step => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <main className="px-6 py-4 pb-32">
        <div className="max-w-2xl mx-auto">
          {/* Phase 1: Pain Discovery (Steps 1-3) */}
          {currentStep >= 1 && currentStep <= 3 && (
            <PainDiscoverySteps
              step={currentStep}
              data={data}
              updateData={updateData}
            />
          )}

          {/* Phase 2: Profile Setup (Steps 4-7) */}
          {currentStep >= 4 && currentStep <= 7 && (
            <ProfileSetupSteps
              step={currentStep}
              data={data}
              updateData={updateData}
            />
          )}

          {/* Phase 3: First Win (Step 8) */}
          {currentStep === 8 && (
            <FirstWinStep
              data={data}
              updateData={updateData}
              onComplete={handleComplete}
            />
          )}

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </main>

      {/* Navigation footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[var(--background)] border-t border-[var(--border)] px-6 py-4">
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
                flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium
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
                flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium
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

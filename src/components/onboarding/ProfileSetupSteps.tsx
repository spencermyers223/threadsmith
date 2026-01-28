'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { OnboardingData } from './OnboardingModal'
import { TECH_NICHES, CONTENT_GOALS, POSTING_FREQUENCIES } from '@/lib/constants/tech-niches'

interface ProfileSetupStepsProps {
  step: number
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
}

export default function ProfileSetupSteps({
  step,
  data,
  updateData,
}: ProfileSetupStepsProps) {
  const [accountInput, setAccountInput] = useState('')

  const toggleNiche = (id: string) => {
    const current = data.primaryNiches
    if (current.includes(id)) {
      updateData({ primaryNiches: current.filter(s => s !== id) })
    } else {
      updateData({ primaryNiches: [...current, id] })
    }
  }

  const toggleGoal = (id: string) => {
    const current = data.primaryGoals
    if (current.includes(id)) {
      updateData({ primaryGoals: current.filter(s => s !== id) })
    } else {
      updateData({ primaryGoals: [...current, id] })
    }
  }

  const addAdmiredAccount = () => {
    const handle = accountInput.trim().replace(/^@/, '')
    if (handle && !data.admiredAccounts.includes(handle)) {
      updateData({ admiredAccounts: [...data.admiredAccounts, handle] })
      setAccountInput('')
    }
  }

  const removeAdmiredAccount = (handle: string) => {
    updateData({ admiredAccounts: data.admiredAccounts.filter(a => a !== handle) })
  }

  // Step 4: Niche selection (multi-select)
  if (step === 4) {
    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
            What&apos;s your niche?
          </h2>
          <p className="text-[var(--muted)]">
            This helps us tailor content to your audience
          </p>
        </div>

        {/* Primary niches - multi-select */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Select all that apply
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TECH_NICHES.map((niche) => {
              const isSelected = data.primaryNiches.includes(niche.id)
              return (
                <button
                  key={niche.id}
                  onClick={() => toggleNiche(niche.id)}
                  className={`
                    flex items-center gap-3 p-4 rounded-xl text-left transition-all
                    ${isSelected
                      ? 'bg-[var(--accent)]/15 border-2 border-[var(--accent)]'
                      : 'bg-[var(--card)] border-2 border-[var(--border)] hover:border-[var(--muted)]'
                    }
                  `}
                >
                  <div
                    className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                      ${isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--muted)]'}
                    `}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-[var(--background)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {niche.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Specific topics/interests */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Specific topics or technologies you cover (optional)
          </label>
          <input
            type="text"
            value={data.specificProtocols}
            onChange={(e) => updateData({ specificProtocols: e.target.value })}
            placeholder="e.g., LLMs, React, Kubernetes, GPT-4, etc."
            className="
              w-full px-4 py-3 rounded-xl
              bg-[var(--card)] border border-[var(--border)]
              text-[var(--foreground)] placeholder-[var(--muted)]
              focus:outline-none focus:border-[var(--accent)]
              transition-colors duration-150
            "
          />
        </div>
      </div>
    )
  }

  // Step 5: Voice learning (simplified)
  if (step === 5) {
    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
            Teach us your voice
          </h2>
          <p className="text-[var(--muted)]">
            Help us generate content that sounds like you
          </p>
        </div>

        {/* Voice description */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Describe your style or the style you want to emulate
          </label>
          <textarea
            value={data.voiceDescription}
            onChange={(e) => updateData({ voiceDescription: e.target.value })}
            placeholder="e.g., I want to sound confident and data-driven, but approachable and not too technical..."
            rows={4}
            className="
              w-full px-4 py-3 rounded-xl resize-none
              bg-[var(--card)] border border-[var(--border)]
              text-[var(--foreground)] placeholder-[var(--muted)]
              focus:outline-none focus:border-[var(--accent)]
              transition-colors duration-150
            "
          />
        </div>

        {/* Tone sliders */}
        <div className="space-y-6">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Fine-tune your tone
          </label>

          {/* Formal ↔ Casual */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-[var(--muted)]">
              <span>Formal</span>
              <span>Casual</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={data.toneFormalCasual}
              onChange={(e) => updateData({ toneFormalCasual: parseInt(e.target.value) })}
              className="w-full accent-[var(--accent)]"
            />
          </div>

          {/* Hedged ↔ Direct */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-[var(--muted)]">
              <span>Hedged</span>
              <span>Direct</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={data.toneHedgedDirect}
              onChange={(e) => updateData({ toneHedgedDirect: parseInt(e.target.value) })}
              className="w-full accent-[var(--accent)]"
            />
          </div>

          {/* Serious ↔ Playful */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-[var(--muted)]">
              <span>Serious</span>
              <span>Playful</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={data.toneSeriousPlayful}
              onChange={(e) => updateData({ toneSeriousPlayful: parseInt(e.target.value) })}
              className="w-full accent-[var(--accent)]"
            />
          </div>
        </div>
      </div>
    )
  }

  // Step 6: Goals (multi-select)
  if (step === 6) {
    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
            What are your goals?
          </h2>
          <p className="text-[var(--muted)]">
            This shapes the type of content we generate for you
          </p>
        </div>

        {/* Goals - multi-select */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Select all that apply
          </label>
          <div className="space-y-3">
            {CONTENT_GOALS.map((goal) => {
              const isSelected = data.primaryGoals.includes(goal.id)
              return (
                <button
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
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
                      w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                      ${isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--muted)]'}
                    `}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-[var(--background)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-[var(--foreground)]">{goal.label}</span>
                    <p className="text-sm text-[var(--muted)]">{goal.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content frequency */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Target posting frequency
          </label>
          <div className="flex flex-wrap gap-2">
            {POSTING_FREQUENCIES.map((freq) => {
              const isSelected = data.contentFrequency === freq.id
              return (
                <button
                  key={freq.id}
                  onClick={() => updateData({ contentFrequency: freq.id })}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-medium transition-all
                    ${isSelected
                      ? 'bg-[var(--accent)] text-[var(--background)]'
                      : 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--muted)]'
                    }
                  `}
                >
                  {freq.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Target audience */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Who&apos;s your target audience? (optional)
          </label>
          <input
            type="text"
            value={data.targetAudience}
            onChange={(e) => updateData({ targetAudience: e.target.value })}
            placeholder="e.g., AI researchers, startup founders, tech professionals..."
            className="
              w-full px-4 py-3 rounded-xl
              bg-[var(--card)] border border-[var(--border)]
              text-[var(--foreground)] placeholder-[var(--muted)]
              focus:outline-none focus:border-[var(--accent)]
              transition-colors duration-150
            "
          />
        </div>
      </div>
    )
  }

  // Step 7: Admired accounts
  if (step === 7) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
            Accounts you admire
          </h2>
          <p className="text-[var(--muted)]">
            Who on Tech Twitter do you want to sound like? This helps us learn patterns.
          </p>
        </div>

        {/* Add account input */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Add X handles (optional)
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">@</span>
              <input
                type="text"
                value={accountInput}
                onChange={(e) => setAccountInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAdmiredAccount()}
                placeholder="handle"
                className="
                  w-full pl-9 pr-4 py-3 rounded-xl
                  bg-[var(--card)] border border-[var(--border)]
                  text-[var(--foreground)] placeholder-[var(--muted)]
                  focus:outline-none focus:border-[var(--accent)]
                  transition-colors duration-150
                "
              />
            </div>
            <button
              onClick={addAdmiredAccount}
              disabled={!accountInput.trim()}
              className="
                px-4 py-3 rounded-xl
                bg-[var(--accent)] text-[var(--background)]
                hover:opacity-90 disabled:opacity-50
                transition-opacity duration-150
              "
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Added accounts */}
        {data.admiredAccounts.length > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Added accounts
            </label>
            <div className="flex flex-wrap gap-2">
              {data.admiredAccounts.map((handle) => (
                <div
                  key={handle}
                  className="
                    flex items-center gap-2 px-3 py-2 rounded-xl
                    bg-[var(--card)] border border-[var(--border)]
                  "
                >
                  <span className="text-[var(--muted)]">@</span>
                  <span className="text-[var(--foreground)]">{handle}</span>
                  <button
                    onClick={() => removeAdmiredAccount(handle)}
                    className="p-1 hover:bg-[var(--border)] rounded transition-colors"
                  >
                    <X size={14} className="text-[var(--muted)]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    )
  }

  return null
}

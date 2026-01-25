'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { OnboardingData } from './OnboardingModal'

// Step 4: Niche options (CT-focused as per spec)
const PRIMARY_NICHES = [
  { id: 'bitcoin', label: 'Bitcoin / Digital Gold' },
  { id: 'ethereum', label: 'Ethereum / L1s / L2s' },
  { id: 'defi', label: 'DeFi / Yield' },
  { id: 'nfts', label: 'NFTs / Digital Art' },
  { id: 'trading', label: 'Trading / Technical Analysis' },
  { id: 'research', label: 'Protocol Research / Due Diligence' },
  { id: 'macro', label: 'Macro / Institutional' },
  { id: 'memecoins', label: 'Memecoins / Degen' },
  { id: 'building', label: 'Building / Development' },
]

// Step 6: Goal options
const GOALS = [
  { id: 'authority', label: 'Build authority/credibility', description: 'Become a trusted voice in your niche' },
  { id: 'followers', label: 'Grow follower count', description: 'Expand your reach and audience' },
  { id: 'traffic', label: 'Drive traffic', description: 'Newsletter, Discord, etc.' },
  { id: 'network', label: 'Network with others', description: 'Connect with people in the space' },
  { id: 'document', label: 'Document my journey', description: 'Build in public, share learnings' },
]

// Frequency options
const FREQUENCIES = [
  { id: '1_day', label: '1 post/day' },
  { id: '2_day', label: '2 posts/day' },
  { id: '3_day', label: '3+ posts/day' },
  { id: '3_week', label: '3 posts/week' },
  { id: '1_week', label: '1 post/week' },
]

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

  const toggleSecondaryInterest = (id: string) => {
    const current = data.secondaryInterests
    if (current.includes(id)) {
      updateData({ secondaryInterests: current.filter(s => s !== id) })
    } else {
      updateData({ secondaryInterests: [...current, id] })
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

  // Step 4: Niche selection
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

        {/* Primary niche */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Primary focus (select one)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PRIMARY_NICHES.map((niche) => {
              const isSelected = data.primaryNiche === niche.id
              return (
                <button
                  key={niche.id}
                  onClick={() => updateData({ primaryNiche: niche.id })}
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
                      w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${isSelected ? 'border-[var(--accent)]' : 'border-[var(--muted)]'}
                    `}
                  >
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />}
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {niche.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Secondary interests */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Secondary interests (optional, multi-select)
          </label>
          <div className="flex flex-wrap gap-2">
            {PRIMARY_NICHES.filter(n => n.id !== data.primaryNiche).map((niche) => {
              const isSelected = data.secondaryInterests.includes(niche.id)
              return (
                <button
                  key={niche.id}
                  onClick={() => toggleSecondaryInterest(niche.id)}
                  className={`
                    px-4 py-2 rounded-full text-sm transition-all
                    ${isSelected
                      ? 'bg-[var(--accent)]/20 border border-[var(--accent)] text-[var(--accent)]'
                      : 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--muted)]'
                    }
                  `}
                >
                  {niche.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Specific protocols */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Specific protocols/chains you cover (optional)
          </label>
          <input
            type="text"
            value={data.specificProtocols}
            onChange={(e) => updateData({ specificProtocols: e.target.value })}
            placeholder="e.g., Solana, Arbitrum, Uniswap, Aave..."
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

  // Step 5: Voice learning
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

        {/* Voice examples */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Option A: Paste 5-10 of your best tweets
          </label>
          <textarea
            value={data.voiceExamples}
            onChange={(e) => updateData({ voiceExamples: e.target.value })}
            placeholder="Paste your tweets here, one per line or separated by blank lines..."
            rows={6}
            className="
              w-full px-4 py-3 rounded-xl resize-none
              bg-[var(--card)] border border-[var(--border)]
              text-[var(--foreground)] placeholder-[var(--muted)]
              focus:outline-none focus:border-[var(--accent)]
              transition-colors duration-150
            "
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-sm text-[var(--muted)]">OR</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        {/* Voice description */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Option B: Describe your style in words
          </label>
          <textarea
            value={data.voiceDescription}
            onChange={(e) => updateData({ voiceDescription: e.target.value })}
            placeholder="e.g., I write with technical depth but keep it accessible. I use data to back up my points. I'm skeptical but not cynical..."
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

  // Step 6: Goals
  if (step === 6) {
    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
            What&apos;s your goal?
          </h2>
          <p className="text-[var(--muted)]">
            This shapes the type of content we generate for you
          </p>
        </div>

        {/* Primary goal */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Primary goal
          </label>
          <div className="space-y-3">
            {GOALS.map((goal) => {
              const isSelected = data.primaryGoal === goal.id
              return (
                <button
                  key={goal.id}
                  onClick={() => updateData({ primaryGoal: goal.id })}
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
                      w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${isSelected ? 'border-[var(--accent)]' : 'border-[var(--muted)]'}
                    `}
                  >
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />}
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
            {FREQUENCIES.map((freq) => {
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
            placeholder="e.g., DeFi researchers, crypto-curious professionals, retail traders..."
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
            Who on CT do you want to sound like? This helps us learn patterns.
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

        {/* Suggestions */}
        <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)] mb-3">
            Popular CT accounts for inspiration:
          </p>
          <div className="flex flex-wrap gap-2">
            {['cobie', 'AltcoinPsycho', 'DegenSpartan', 'inversebrah', 'loomdart', 'bllofish'].map((handle) => (
              <button
                key={handle}
                onClick={() => {
                  if (!data.admiredAccounts.includes(handle)) {
                    updateData({ admiredAccounts: [...data.admiredAccounts, handle] })
                  }
                }}
                disabled={data.admiredAccounts.includes(handle)}
                className="
                  px-3 py-1.5 rounded-lg text-sm
                  bg-[var(--background)] border border-[var(--border)]
                  text-[var(--muted)] hover:text-[var(--foreground)]
                  hover:border-[var(--muted)]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-150
                "
              >
                @{handle}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null
}

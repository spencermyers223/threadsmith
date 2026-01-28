'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Copy, Check, RefreshCw } from 'lucide-react'
import type { OnboardingData } from './OnboardingModal'

// Post type suggestions based on niche (tech-focused)
const NICHE_POST_SUGGESTIONS: Record<string, { type: string; topic: string }> = {
  // Tech niches
  'ai-ml': { type: 'alpha_thread', topic: 'The most underrated AI development that will shape the next 12 months' },
  'crypto-web3': { type: 'market_take', topic: 'The current state of Web3 and where the real innovation is happening' },
  'robotics': { type: 'alpha_thread', topic: 'The robotics breakthrough that nobody is talking about yet' },
  'quantum': { type: 'protocol_breakdown', topic: 'Quantum computing explained: what it actually means for tech' },
  'biotech': { type: 'alpha_thread', topic: 'The biotech trend that will impact everyone in the next decade' },
  'space': { type: 'hot_take', topic: 'Why the space industry is about to have its biggest year ever' },
  'climate': { type: 'alpha_thread', topic: 'The climate tech solution that deserves more attention' },
  'fintech': { type: 'market_take', topic: 'The fintech shift happening that most people are missing' },
  'cybersecurity': { type: 'hot_take', topic: 'The security vulnerability that keeps me up at night' },
  'devtools': { type: 'build_in_public', topic: 'The developer tools that transformed my workflow this year' },
  'gaming': { type: 'alpha_thread', topic: 'The gaming technology that will change how we play' },
  'general-tech': { type: 'hot_take', topic: 'The tech trend everyone is overcomplicating' },
  // Legacy mappings
  'bitcoin': { type: 'market_take', topic: 'The current state of Bitcoin and what it means for the industry' },
  'ethereum': { type: 'alpha_thread', topic: 'The most promising developments in the Ethereum ecosystem' },
  'defi': { type: 'alpha_thread', topic: 'The DeFi innovation that deserves more attention' },
  'nfts': { type: 'hot_take', topic: 'The real future of NFTs beyond the hype' },
  'trading': { type: 'market_take', topic: 'The setup I look for before entering any trade' },
  'research': { type: 'protocol_breakdown', topic: 'A technology that flew under the radar but deserves attention' },
  'macro': { type: 'alpha_thread', topic: 'How macro trends are shaping the tech industry right now' },
  'memecoins': { type: 'hot_take', topic: 'The cultural phenomenon behind memecoin communities' },
  'building': { type: 'build_in_public', topic: 'What I learned building this week' },
}

// Post type labels
const POST_TYPE_LABELS: Record<string, string> = {
  alpha_thread: 'Insight Thread',
  market_take: 'Industry Take',
  hot_take: 'Hot Take',
  data_insight: 'Data Insight',
  protocol_breakdown: 'Technical Deep Dive',
  build_in_public: 'Build in Public',
  // Legacy mappings
  on_chain_insight: 'Data Insight',
}

interface FirstWinStepProps {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
  onComplete: () => void
}

export default function FirstWinStep({
  data,
  updateData,
  onComplete,
}: FirstWinStepProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Get suggestion based on first selected niche
  const primaryNiche = data.primaryNiches[0] || ''
  const suggestion = NICHE_POST_SUGGESTIONS[primaryNiche] || {
    type: 'hot_take',
    topic: 'Your unique perspective on the technology shaping the future',
  }

  // Set default post type if not already set (but don't pre-fill topic - use placeholder)
  if (!data.firstPostType) {
    updateData({ firstPostType: suggestion.type })
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: data.firstPostTopic || suggestion.topic,
          length: 'standard',
          tone: 'casual',
          postType: 'scroll_stopper',
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Generation failed')
      }

      const result = await res.json()
      if (result.posts && result.posts.length > 0) {
        updateData({ generatedPost: result.posts[0].content })
      } else {
        throw new Error('No content generated')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate post')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (data.generatedPost) {
      await navigator.clipboard.writeText(data.generatedPost)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handlePostNow = () => {
    if (data.generatedPost) {
      const url = `https://x.com/intent/post?text=${encodeURIComponent(data.generatedPost)}`
      window.open(url, '_blank')
    }
  }

  // Format niche for display
  const formatNiche = (niche: string) => {
    return niche.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
          Let&apos;s create your first post
        </h2>
        <p className="text-[var(--muted)]">
          Experience the magic of algorithm-optimized content
        </p>
      </div>

      {/* Topic input */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            What do you want to post about?
          </label>
          <span className="text-xs px-2 py-1 rounded-md bg-[var(--card)] text-[var(--muted)]">
            {POST_TYPE_LABELS[data.firstPostType || suggestion.type]}
          </span>
        </div>
        <textarea
          value={data.firstPostTopic}
          onChange={(e) => updateData({ firstPostTopic: e.target.value })}
          placeholder={suggestion.topic}
          rows={3}
          className="
            w-full px-4 py-3 rounded-xl resize-none
            bg-[var(--card)] border border-[var(--border)]
            text-[var(--foreground)] placeholder-[var(--muted)]
            focus:outline-none focus:border-[var(--accent)]
            transition-colors duration-150
          "
        />
        <p className="text-xs text-[var(--muted)]">
          Based on your {primaryNiche ? `${formatNiche(primaryNiche)} focus` : 'profile'}, we suggest starting with a {POST_TYPE_LABELS[suggestion.type]?.toLowerCase()}.
        </p>
      </div>

      {/* Generate button */}
      {!data.generatedPost && (
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !data.firstPostTopic?.trim()}
          className="
            w-full flex items-center justify-center gap-3 px-6 py-4
            bg-[var(--accent)] text-[var(--background)]
            rounded-xl font-semibold text-lg
            hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed
            transition-opacity duration-150
          "
        >
          {isGenerating ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Generating your first post...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Generate My First Post
            </>
          )}
        </button>
      )}

      {/* Error display */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Generated post display */}
      {data.generatedPost && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-center gap-2 text-[var(--accent)]">
            <Sparkles size={20} />
            <span className="font-semibold">Your first algorithm-optimized post!</span>
          </div>

          <div className="p-6 rounded-xl bg-[var(--card)] border border-[var(--border)]">
            <p className="text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
              {data.generatedPost}
            </p>
            <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-sm text-[var(--muted)]">
                {data.generatedPost.length} characters
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handlePostNow}
              className="
                flex-1 flex items-center justify-center gap-2 px-4 py-3
                bg-[var(--accent)] text-[var(--background)]
                rounded-xl font-medium
                hover:opacity-90 transition-opacity duration-150
              "
            >
              Post it now
            </button>
            <button
              onClick={onComplete}
              className="
                flex-1 flex items-center justify-center gap-2 px-4 py-3
                bg-[var(--card)] border border-[var(--border)]
                text-[var(--foreground)]
                rounded-xl font-medium
                hover:bg-[var(--border)] transition-colors duration-150
              "
            >
              Save for later
            </button>
            <button
              onClick={() => {
                updateData({ generatedPost: null })
                handleGenerate()
              }}
              className="
                flex items-center justify-center gap-2 px-4 py-3
                bg-[var(--card)] border border-[var(--border)]
                text-[var(--foreground)]
                rounded-xl font-medium
                hover:bg-[var(--border)] transition-colors duration-150
              "
              title="Try another"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          {/* Remaining generations notice */}
          <p className="text-center text-sm text-[var(--muted)]">
            You have free generations remaining.{' '}
            <button className="text-[var(--accent)] hover:underline">
              Upgrade to Pro
            </button>{' '}
            for unlimited.
          </p>
        </div>
      )}

      {/* Skip option when no post generated yet */}
      {!data.generatedPost && !isGenerating && (
        <p className="text-center text-sm text-[var(--muted)]">
          Or{' '}
          <button
            onClick={onComplete}
            className="text-[var(--accent)] hover:underline"
          >
            skip and explore the app
          </button>
        </p>
      )}
    </div>
  )
}

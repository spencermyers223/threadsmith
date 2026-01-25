'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Copy, Check, RefreshCw } from 'lucide-react'
import type { OnboardingData } from './OnboardingModal'

// Post type suggestions based on niche
const NICHE_POST_SUGGESTIONS: Record<string, { type: string; topic: string }> = {
  bitcoin: { type: 'market_take', topic: "Bitcoin's current macro setup and what it means for the next 6 months" },
  ethereum: { type: 'alpha_thread', topic: 'The most promising L2s to watch this cycle and why' },
  defi: { type: 'on_chain_insight', topic: 'Unusual DeFi yield opportunities most people are missing' },
  nfts: { type: 'hot_take', topic: 'Why 99% of NFT projects will fail but the 1% will be massive' },
  trading: { type: 'market_take', topic: 'The setup I look for before entering any trade' },
  research: { type: 'protocol_breakdown', topic: 'A protocol that flew under the radar but deserves attention' },
  macro: { type: 'alpha_thread', topic: "How traditional finance is positioning for crypto's next leg up" },
  memecoins: { type: 'hot_take', topic: 'The memecoin meta right now and how to play it' },
  building: { type: 'build_in_public', topic: 'What I learned building in crypto this week' },
}

// Post type labels
const POST_TYPE_LABELS: Record<string, string> = {
  alpha_thread: 'Alpha Thread',
  market_take: 'Market Take',
  hot_take: 'Hot Take',
  on_chain_insight: 'On-Chain Insight',
  protocol_breakdown: 'Protocol Breakdown',
  build_in_public: 'Build in Public',
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
    type: 'market_take',
    topic: 'Your unique perspective on the current crypto market',
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
          Based on your {primaryNiche ? `${primaryNiche} niche` : 'profile'}, we suggest starting with a {POST_TYPE_LABELS[suggestion.type]?.toLowerCase()}.
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

'use client'

import { useState } from 'react'
import {
  Sparkles,
  User,
  Zap,
  Target,
  MessageSquare,
  TrendingUp,
  Loader2,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Crown,
  Flame,
  Eye,
  Star
} from 'lucide-react'

interface ProfileData {
  summary: string
  personality?: string
  patterns: {
    avgLength?: number
    emojiUsage?: string
    favoriteEmojis?: string[]
    hookStyles?: string[]
    toneMarkers?: string[]
    sentenceStyle?: string
    questionUsage?: string
    hashtagUsage?: string
    ctaStyle?: string
    engagementTactics?: string[]
  }
  signatureMoves?: string[]
  topTweets?: Array<{
    text: string
    likes: number
    whyItWorks?: string
  }>
}

interface AdmiredAccountAnalyzerProps {
  username: string
  onUsernameChange: (username: string) => void
  profileData: ProfileData | null
  onAnalysisComplete: (data: ProfileData) => void
  templateId?: string
  disabled?: boolean
}

export default function AdmiredAccountAnalyzer({
  username,
  onUsernameChange,
  profileData,
  onAnalysisComplete,
  templateId,
  disabled = false
}: AdmiredAccountAnalyzerProps) {
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [creditInfo, setCreditInfo] = useState<{
    creditCost: number
    currentCredits: number
    freeUsed: number
    freeLimit: number
  } | null>(null)
  const [expanded, setExpanded] = useState(true)

  const handleAnalyze = async (confirmed = false) => {
    if (!username.trim()) {
      setError('Enter a username to analyze')
      return
    }

    setError(null)
    setAnalyzing(true)

    try {
      const res = await fetch('/api/style-templates/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          templateId,
          confirmCredit: confirmed,
        }),
      })

      const data = await res.json()

      if (res.status === 402 && data.requiresConfirmation) {
        // Show credit confirmation dialog
        setCreditInfo({
          creditCost: data.creditCost,
          currentCredits: data.currentCredits,
          freeUsed: data.freeUsed,
          freeLimit: data.freeLimit,
        })
        setShowConfirm(true)
        setAnalyzing(false)
        return
      }

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      onAnalysisComplete(data.profileData)
      setShowConfirm(false)
      setCreditInfo(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const confirmAnalysis = () => {
    handleAnalyze(true)
  }

  return (
    <div className="space-y-4">
      {/* Username Input with Analyze Button */}
      <div className="bg-gradient-to-br from-[var(--accent)]/5 to-purple-500/5 border border-[var(--accent)]/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-[var(--accent)]/10">
            <Crown className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <span className="font-semibold text-sm">Steal Their Engagement Tactics</span>
        </div>
        
        <p className="text-xs text-[var(--muted)] mb-3">
          Enter a top creator&apos;s handle. We will analyze their best tweets and extract the patterns that make them go viral.
        </p>

        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3">
            <span className="text-[var(--muted)]">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value.replace('@', ''))}
              placeholder="signulll, naval, alexhormozi..."
              disabled={disabled || analyzing}
              className="flex-1 py-2 bg-transparent focus:outline-none text-sm"
            />
          </div>
          <button
            onClick={() => handleAnalyze()}
            disabled={disabled || analyzing || !username.trim()}
            className="px-4 py-2 bg-gradient-to-r from-[var(--accent)] to-amber-500 text-black font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm shadow-lg shadow-[var(--accent)]/20"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : profileData ? (
              <>
                <Sparkles className="w-4 h-4" />
                Re-analyze
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Analyze Style
              </>
            )}
          </button>
        </div>

        {/* First 3 free indicator */}
        {!profileData && (
          <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <Star className="w-3 h-3" />
            First 3 analyses free • 5 credits after
          </p>
        )}

        {error && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Credit Confirmation Modal */}
      {showConfirm && creditInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 max-w-md w-full animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-[var(--accent)]/10">
                <Zap className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Confirm Analysis</h3>
                <p className="text-sm text-[var(--muted)]">
                  You have used {creditInfo.freeUsed}/{creditInfo.freeLimit} free analyses
                </p>
              </div>
            </div>
            
            <div className="bg-[var(--background)] rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">Analysis cost</span>
                <span className="font-semibold text-[var(--accent)]">{creditInfo.creditCost} credits</span>
              </div>
              <div className="flex justify-between items-center text-[var(--muted)]">
                <span className="text-sm">Your balance</span>
                <span className="text-sm">{creditInfo.currentCredits} credits</span>
              </div>
              {creditInfo.currentCredits < creditInfo.creditCost && (
                <div className="mt-3 p-2 bg-red-500/10 rounded text-red-400 text-xs">
                  Not enough credits. You need {creditInfo.creditCost - creditInfo.currentCredits} more.
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirm(false); setCreditInfo(null) }}
                className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--border)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAnalysis}
                disabled={creditInfo.currentCredits < creditInfo.creditCost}
                className="flex-1 px-4 py-2 bg-[var(--accent)] text-black font-semibold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {analyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  `Use ${creditInfo.creditCost} Credits`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {profileData && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-[var(--border)]/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-left">
                <span className="font-semibold">@{username} Analyzed</span>
                <p className="text-xs text-[var(--muted)]">Click to {expanded ? 'collapse' : 'expand'} insights</p>
              </div>
            </div>
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {expanded && (
            <div className="border-t border-[var(--border)] p-4 space-y-4">
              {/* Summary */}
              <div className="bg-gradient-to-r from-[var(--accent)]/5 to-purple-500/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-[var(--accent)]" />
                  <span className="font-semibold text-sm">Writing Style</span>
                </div>
                <p className="text-sm text-[var(--foreground)]">{profileData.summary}</p>
                {profileData.personality && (
                  <p className="text-xs text-[var(--muted)] mt-2 italic">&ldquo;{profileData.personality}&rdquo;</p>
                )}
              </div>

              {/* Engagement Tactics */}
              {profileData.patterns?.engagementTactics && profileData.patterns.engagementTactics.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-sm">Viral Tactics</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profileData.patterns.engagementTactics.map((tactic, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs"
                      >
                        {tactic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Hook Styles */}
              {profileData.patterns?.hookStyles && profileData.patterns.hookStyles.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-orange-400" />
                    <span className="font-semibold text-sm">Hook Techniques</span>
                  </div>
                  <ul className="space-y-1">
                    {profileData.patterns.hookStyles.map((hook, idx) => (
                      <li key={idx} className="text-xs text-[var(--muted)] flex items-start gap-2">
                        <Flame className="w-3 h-3 text-orange-400 mt-0.5 flex-shrink-0" />
                        {hook}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Signature Moves */}
              {profileData.signatureMoves && profileData.signatureMoves.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-[var(--accent)]" />
                    <span className="font-semibold text-sm">Signature Moves</span>
                  </div>
                  <ul className="space-y-1">
                    {profileData.signatureMoves.map((move, idx) => (
                      <li key={idx} className="text-xs text-[var(--muted)] flex items-start gap-2">
                        <Star className="w-3 h-3 text-[var(--accent)] mt-0.5 flex-shrink-0" />
                        {move}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tone & Style */}
              <div className="grid grid-cols-2 gap-4">
                {profileData.patterns?.toneMarkers && profileData.patterns.toneMarkers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      <span className="font-semibold text-sm">Tone</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {profileData.patterns.toneMarkers.map((tone, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs"
                        >
                          {tone}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {profileData.patterns?.sentenceStyle && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-purple-400" />
                      <span className="font-semibold text-sm">Sentence Style</span>
                    </div>
                    <p className="text-xs text-[var(--muted)]">{profileData.patterns.sentenceStyle}</p>
                  </div>
                )}
              </div>

              {/* Top Tweets */}
              {profileData.topTweets && profileData.topTweets.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-4 h-4 text-red-400" />
                    <span className="font-semibold text-sm">Top Performing Tweets</span>
                  </div>
                  <div className="space-y-2">
                    {profileData.topTweets.slice(0, 3).map((tweet, idx) => (
                      <div key={idx} className="bg-[var(--background)] rounded-lg p-3">
                        <p className="text-xs text-[var(--foreground)] mb-2 line-clamp-3">&ldquo;{tweet.text}&rdquo;</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[var(--muted)]">
                            ❤️ {tweet.likes.toLocaleString()}
                          </span>
                          {tweet.whyItWorks && (
                            <span className="text-xs text-emerald-400 italic">{tweet.whyItWorks}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import {
  Search, Loader2, User, AlertCircle, Check, Sparkles,
  ChevronRight, Clock, TrendingUp, MessageSquare, Heart,
  Repeat2, ExternalLink, Plus, BookMarked, Zap, Target,
  Lightbulb, PenLine
} from 'lucide-react'

interface AccountResearcherProps {
  userCredits: number
  onCreditsUsed?: (amount: number) => void
}

interface TopTweet {
  text: string
  likes: number
  retweets: number
  url: string
  whyItWorks: string
}

interface AccountAnalysis {
  id: string
  analyzed_username: string
  analyzed_at: string
  top_tweets: TopTweet[]
  strategy_analysis: {
    postingFrequency: string
    contentMix: string
    bestPerformingTypes: string[]
    threadFrequency: string
  }
  voice_analysis: {
    summary: string
    toneMarkers: string[]
    sentenceStyle: string
    hookTechniques: string[]
    signatureMoves: string[]
  }
  engagement_patterns: {
    bestDays: string[]
    avgLikes: number
    avgRetweets: number
    threadVsTweetRatio: number
    topTopics: string[]
  }
  tactics_to_steal: string[]
  tweets_fetched: number
  style_template_id: string | null
}

const CREDIT_COST = 5

export function AccountResearcher({ userCredits, onCreditsUsed }: AccountResearcherProps) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingAnalyses, setLoadingAnalyses] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentAnalysis, setCurrentAnalysis] = useState<AccountAnalysis | null>(null)
  const [savedAnalyses, setSavedAnalyses] = useState<AccountAnalysis[]>([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [addingToStyle, setAddingToStyle] = useState(false)

  const canAfford = userCredits >= CREDIT_COST

  // Load saved analyses on mount
  useEffect(() => {
    loadSavedAnalyses()
  }, [])

  const loadSavedAnalyses = async () => {
    setLoadingAnalyses(true)
    try {
      const res = await fetch('/api/account-analysis')
      if (res.ok) {
        const data = await res.json()
        setSavedAnalyses(data.analyses || [])
      }
    } catch (err) {
      console.error('Failed to load analyses:', err)
    }
    setLoadingAnalyses(false)
  }

  const handleAnalyze = async (confirmed = false) => {
    if (!username.trim()) {
      setError('Please enter a username')
      return
    }

    if (!confirmed && !canAfford) {
      setError(`Not enough credits. You need ${CREDIT_COST} credits.`)
      return
    }

    if (!confirmed) {
      setShowConfirm(true)
      return
    }

    setShowConfirm(false)
    setLoading(true)
    setError(null)
    setSuccess(null)
    setCurrentAnalysis(null)

    try {
      const res = await fetch('/api/account-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.replace('@', ''),
          confirmCredit: true
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      if (data.cached) {
        setSuccess(data.message)
      } else {
        setSuccess(`Successfully analyzed @${data.analysis.analyzed_username}`)
        if (onCreditsUsed) {
          onCreditsUsed(CREDIT_COST)
        }
      }

      setCurrentAnalysis(data.analysis)
      
      // Refresh saved analyses list
      loadSavedAnalyses()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToStyleProfiles = async () => {
    if (!currentAnalysis) return
    
    setAddingToStyle(true)
    try {
      // Create a style template from this analysis
      const res = await fetch('/api/style-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `@${currentAnalysis.analyzed_username} Style`,
          admired_account_username: currentAnalysis.analyzed_username,
          profile_data: currentAnalysis.voice_analysis,
          fromAnalysis: true,
          analysisId: currentAnalysis.id
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add style profile')
      }

      setSuccess(`Added @${currentAnalysis.analyzed_username} to your Style Profiles!`)
      
      // Update the analysis to show it's linked
      setCurrentAnalysis(prev => prev ? { ...prev, style_template_id: 'linked' } : null)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add style profile')
    } finally {
      setAddingToStyle(false)
    }
  }

  const viewSavedAnalysis = (analysis: AccountAnalysis) => {
    setCurrentAnalysis(analysis)
    setUsername(analysis.analyzed_username)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Account Researcher</h2>
        <p className="text-[var(--muted)]">
          Get AI-powered insights from any X account. Learn their strategy, voice, and top tactics.
        </p>
      </div>

      {/* Credits Display */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--accent)]/10">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <p className="font-semibold">Your Credits</p>
            <p className="text-sm text-[var(--muted)]">{CREDIT_COST} credits per analysis</p>
          </div>
        </div>
        <div className="text-2xl font-bold text-[var(--accent)]">{userCredits}</div>
      </div>

      {/* Search Form */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Search className="w-5 h-5" />
          Analyze an Account
        </h3>

        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder="e.g., naval"
            className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          />
        </div>

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="p-4 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg">
            <p className="text-sm mb-3">
              This will use <strong>{CREDIT_COST} credits</strong> to analyze @{username.replace('@', '')}.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleAnalyze(true)}
                className="flex-1 py-2 bg-[var(--accent)] text-black rounded-lg font-medium"
              >
                Confirm Analysis
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 bg-[var(--border)] rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-emerald-400">
            <Check className="w-5 h-5 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Analyze Button */}
        {!showConfirm && (
          <button
            onClick={() => handleAnalyze()}
            disabled={loading || !canAfford || !username.trim()}
            className="w-full py-3 bg-[var(--accent)] text-black rounded-lg font-semibold hover:bg-[var(--accent)]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Analyze for {CREDIT_COST} Credits
              </>
            )}
          </button>
        )}
      </div>

      {/* Analysis Results */}
      {currentAnalysis && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-[var(--accent)]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">@{currentAnalysis.analyzed_username}</h3>
                  <p className="text-sm text-[var(--muted)] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Analyzed {new Date(currentAnalysis.analyzed_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={handleAddToStyleProfiles}
                disabled={addingToStyle || !!currentAnalysis.style_template_id}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 disabled:opacity-50"
              >
                {addingToStyle ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : currentAnalysis.style_template_id ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {currentAnalysis.style_template_id ? 'Added to Styles' : 'Add to Style Profiles'}
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[var(--background)] rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-pink-400 mb-1">
                  <Heart className="w-4 h-4" />
                  <span className="font-bold">{currentAnalysis.engagement_patterns.avgLikes?.toLocaleString()}</span>
                </div>
                <p className="text-xs text-[var(--muted)]">Avg Likes</p>
              </div>
              <div className="bg-[var(--background)] rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
                  <Repeat2 className="w-4 h-4" />
                  <span className="font-bold">{currentAnalysis.engagement_patterns.avgRetweets?.toLocaleString()}</span>
                </div>
                <p className="text-xs text-[var(--muted)]">Avg RTs</p>
              </div>
              <div className="bg-[var(--background)] rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-bold">{currentAnalysis.tweets_fetched}</span>
                </div>
                <p className="text-xs text-[var(--muted)]">Analyzed</p>
              </div>
            </div>
          </div>

          {/* Top 5 Tweets */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
            <h4 className="font-semibold flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
              Top 5 Performing Tweets
            </h4>
            <div className="space-y-4">
              {currentAnalysis.top_tweets?.map((tweet, idx) => (
                <div key={idx} className="bg-[var(--background)] rounded-lg p-4">
                  <p className="text-sm mb-3">{tweet.text}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-pink-400" />
                        {tweet.likes?.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Repeat2 className="w-3 h-3 text-emerald-400" />
                        {tweet.retweets?.toLocaleString()}
                      </span>
                    </div>
                    {tweet.url && (
                      <a 
                        href={tweet.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[var(--accent)] hover:underline text-sm flex items-center gap-1"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {tweet.whyItWorks && (
                    <div className="mt-3 p-2 bg-[var(--accent)]/10 rounded text-xs text-[var(--accent)]">
                      <strong>Why it works:</strong> {tweet.whyItWorks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Strategy Analysis */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
            <h4 className="font-semibold flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-blue-400" />
              Content Strategy
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--muted)] mb-1">Posting Frequency</p>
                <p className="font-medium">{currentAnalysis.strategy_analysis?.postingFrequency || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)] mb-1">Content Mix</p>
                <p className="font-medium">{currentAnalysis.strategy_analysis?.contentMix || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)] mb-1">Thread Frequency</p>
                <p className="font-medium">{currentAnalysis.strategy_analysis?.threadFrequency || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)] mb-1">Best Days</p>
                <p className="font-medium">{currentAnalysis.engagement_patterns?.bestDays?.join(', ') || 'N/A'}</p>
              </div>
            </div>
            {currentAnalysis.strategy_analysis?.bestPerformingTypes && (
              <div className="mt-4">
                <p className="text-sm text-[var(--muted)] mb-2">Best Performing Content Types</p>
                <div className="flex flex-wrap gap-2">
                  {currentAnalysis.strategy_analysis.bestPerformingTypes.map((type, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Voice & Style */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
            <h4 className="font-semibold flex items-center gap-2 mb-4">
              <PenLine className="w-5 h-5 text-purple-400" />
              Voice & Style
            </h4>
            <p className="mb-4">{currentAnalysis.voice_analysis?.summary || 'N/A'}</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--muted)] mb-2">Tone Markers</p>
                <div className="flex flex-wrap gap-2">
                  {currentAnalysis.voice_analysis?.toneMarkers?.map((tone, idx) => (
                    <span key={idx} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                      {tone}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)] mb-2">Sentence Style</p>
                <p className="text-sm">{currentAnalysis.voice_analysis?.sentenceStyle || 'N/A'}</p>
              </div>
            </div>

            {currentAnalysis.voice_analysis?.hookTechniques && (
              <div className="mt-4">
                <p className="text-sm text-[var(--muted)] mb-2">Hook Techniques</p>
                <ul className="space-y-1">
                  {currentAnalysis.voice_analysis.hookTechniques.map((hook, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                      {hook}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {currentAnalysis.voice_analysis?.signatureMoves && (
              <div className="mt-4">
                <p className="text-sm text-[var(--muted)] mb-2">Signature Moves</p>
                <ul className="space-y-1">
                  {currentAnalysis.voice_analysis.signatureMoves.map((move, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                      {move}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Tactics to Steal */}
          <div className="bg-gradient-to-br from-[var(--accent)]/10 to-[var(--accent)]/5 border border-[var(--accent)]/30 rounded-xl p-6">
            <h4 className="font-semibold flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-[var(--accent)]" />
              Tactics to Steal
            </h4>
            <div className="space-y-3">
              {currentAnalysis.tactics_to_steal?.map((tactic, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-[var(--background)] rounded-lg p-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--accent)] text-black flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-sm">{tactic}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Saved Analyses Library */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <BookMarked className="w-5 h-5" />
          My Analyzed Accounts
          {savedAnalyses.length > 0 && (
            <span className="text-xs text-[var(--muted)] bg-[var(--border)] px-2 py-0.5 rounded-full">
              {savedAnalyses.length}
            </span>
          )}
        </h3>

        {loadingAnalyses ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--muted)]" />
          </div>
        ) : savedAnalyses.length === 0 ? (
          <div className="text-center py-8 text-[var(--muted)]">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No analyses yet. Enter a username above to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {savedAnalyses.map(analysis => (
              <button
                key={analysis.id}
                onClick={() => viewSavedAnalysis(analysis)}
                className={`p-4 rounded-lg border text-left transition-all hover:border-[var(--accent)]/50 ${
                  currentAnalysis?.id === analysis.id
                    ? 'bg-[var(--accent)]/10 border-[var(--accent)]/50'
                    : 'bg-[var(--background)] border-[var(--border)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-[var(--muted)]" />
                  <span className="font-medium">@{analysis.analyzed_username}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {analysis.engagement_patterns?.avgLikes?.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(analysis.analyzed_at).toLocaleDateString()}
                  </span>
                </div>
                {analysis.style_template_id && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-purple-400">
                    <PenLine className="w-3 h-3" />
                    In Style Profiles
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pricing Info */}
      <div className="text-center text-sm text-[var(--muted)]">
        <p>💡 Each analysis costs {CREDIT_COST} credits and includes full AI insights</p>
        <p className="mt-1">Need more credits? <a href="/settings" className="text-[var(--accent)] hover:underline">Purchase credits</a></p>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Mic, Upload, Trash2, RefreshCw, AlertCircle, Check,
  ChevronDown, ChevronUp, Sparkles, MessageSquare, Download,
  Bookmark, ExternalLink, MessageCircle, Heart, Repeat2
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface InspirationTweet {
  id: string
  tweet_id: string
  tweet_text: string
  tweet_url: string | null
  author_username: string
  author_name: string | null
  author_profile_image_url: string | null
  reply_count: number
  like_count: number
  repost_count: number
  saved_at: string
}

interface VoiceSample {
  id: string
  tweet_text: string
  tweet_url: string | null
  created_at: string
}

interface VoiceProfile {
  avgTweetLength: number
  sentenceStyle: string
  emojiUsage: { frequency: string; favorites: string[] }
  punctuationStyle: {
    exclamationMarks: string
    ellipses: string
    dashes: string
    questionMarks: string
  }
  vocabularyLevel: string
  commonPhrases: string[]
  toneMarkers: string[]
  formalityLevel: number
  hotTakeTendency: number
  threadPreference: string
  hashtagUsage: string
  cashtagUsage: string
  openingStyle: string
  closingStyle: string
  signatureElements: string[]
  summary: string
}

export default function VoiceSettingsPage() {
  const supabase = createClient()
  const [samples, setSamples] = useState<VoiceSample[]>([])
  const [inspirationTweets, setInspirationTweets] = useState<InspirationTweet[]>([])
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null)
  const [voiceTrainedAt, setVoiceTrainedAt] = useState<string | null>(null)
  const [tweetInput, setTweetInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importingFromX, setImportingFromX] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showSamples, setShowSamples] = useState(false)
  const [showInspirationTweets, setShowInspirationTweets] = useState(false)
  const hasLoadedRef = useRef(false)

  // Tweak state (overrides on top of analyzed profile)
  const [tweaks, setTweaks] = useState<{
    formalityLevel?: number
    hotTakeTendency?: number
    emojiFrequency?: string
  }>({})

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load samples
      const samplesRes = await fetch('/api/voice/samples')
      if (samplesRes.ok) {
        const data = await samplesRes.json()
        setSamples(data)
      }

      // Load inspiration tweets
      const inspirationRes = await fetch('/api/inspiration-tweets')
      if (inspirationRes.ok) {
        const data = await inspirationRes.json()
        setInspirationTweets(data.tweets || [])
      }

      // Load voice profile from content_profiles
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('content_profiles')
          .select('voice_profile, voice_trained_at')
          .eq('user_id', user.id)
          .single()

        if (profile?.voice_profile) {
          setVoiceProfile(profile.voice_profile as VoiceProfile)
          setVoiceTrainedAt(profile.voice_trained_at)
        }
      }
    } catch {
      // Ignore load errors
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    loadData()
  }, [loadData])

  async function handleImportFromX() {
    setImportingFromX(true)
    setError(null)

    try {
      // Fetch tweets from X API
      const xRes = await fetch('/api/x/tweets?max_results=100')
      const xData = await xRes.json()

      if (!xRes.ok) {
        throw new Error(xData.error || 'Failed to fetch tweets from X')
      }

      if (!xData.tweets || xData.tweets.length === 0) {
        throw new Error('No tweets found on your X account')
      }

      // Extract just the text from each tweet
      const tweetTexts = xData.tweets.map((t: { text: string }) => t.text)

      // Import them as voice samples
      const res = await fetch('/api/voice/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweets: tweetTexts }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSuccess(`Imported ${data.inserted} tweets from X!`)
      setTimeout(() => setSuccess(null), 3000)

      // Reload samples
      const samplesRes = await fetch('/api/voice/samples')
      if (samplesRes.ok) setSamples(await samplesRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import from X')
    }
    setImportingFromX(false)
  }

  async function handleImport() {
    if (!tweetInput.trim()) return

    setImporting(true)
    setError(null)

    // Split by double newlines or single newlines, filter empties
    const tweets = tweetInput
      .split(/\n\n|\n/)
      .map(t => t.trim())
      .filter(t => t.length > 0)

    if (tweets.length === 0) {
      setError('No valid tweets found')
      setImporting(false)
      return
    }

    try {
      const res = await fetch('/api/voice/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweets }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setTweetInput('')
      setSuccess(`Imported ${data.inserted} tweets`)
      setTimeout(() => setSuccess(null), 3000)

      // Reload samples
      const samplesRes = await fetch('/api/voice/samples')
      if (samplesRes.ok) setSamples(await samplesRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    }
    setImporting(false)
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    setError(null)

    try {
      const res = await fetch('/api/voice/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setVoiceProfile(data.voiceProfile)
      setVoiceTrainedAt(data.analyzedAt)
      setTweaks({})
      setSuccess('Voice profile analyzed!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    }
    setAnalyzing(false)
  }

  async function handleDeleteSample(id: string) {
    const res = await fetch(`/api/voice/samples?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSamples(samples.filter(s => s.id !== id))
    }
  }

  async function handleDeleteInspirationTweet(id: string) {
    const res = await fetch(`/api/inspiration-tweets/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setInspirationTweets(inspirationTweets.filter(t => t.id !== id))
      setSuccess('Inspiration tweet removed')
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  async function handleClearAll() {
    if (!confirm('Delete all voice samples? This cannot be undone.')) return
    const res = await fetch('/api/voice/samples', { method: 'DELETE' })
    if (res.ok) {
      setSamples([])
      setSuccess('All samples cleared')
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  async function handleSaveTweaks() {
    if (!voiceProfile) return

    const tweakedProfile = {
      ...voiceProfile,
      ...(tweaks.formalityLevel !== undefined && { formalityLevel: tweaks.formalityLevel }),
      ...(tweaks.hotTakeTendency !== undefined && { hotTakeTendency: tweaks.hotTakeTendency }),
      ...(tweaks.emojiFrequency !== undefined && {
        emojiUsage: { ...voiceProfile.emojiUsage, frequency: tweaks.emojiFrequency }
      }),
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: updateError } = await supabase
        .from('content_profiles')
        .upsert({
          user_id: user.id,
          voice_profile: tweakedProfile,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

      if (updateError) throw updateError

      setVoiceProfile(tweakedProfile)
      setTweaks({})
      setSuccess('Voice profile updated!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  const effectiveFormality = tweaks.formalityLevel ?? voiceProfile?.formalityLevel ?? 5
  const effectiveHotTake = tweaks.hotTakeTendency ?? voiceProfile?.hotTakeTendency ?? 5
  const effectiveEmoji = tweaks.emojiFrequency ?? voiceProfile?.emojiUsage?.frequency ?? 'moderate'
  const hasTweaks = Object.keys(tweaks).length > 0

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/settings" className="p-2 rounded-md hover:bg-[var(--card)] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="w-6 h-6 text-accent" />
            Voice Training
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Teach the AI your unique writing voice by importing your tweets
          </p>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="mb-6 flex items-center gap-2 text-red-400 text-sm p-3 bg-red-400/10 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-200">×</button>
        </div>
      )}
      {success && (
        <div className="mb-6 flex items-center gap-2 text-green-400 text-sm p-3 bg-green-400/10 rounded-lg">
          <Check className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      <div className="space-y-6">
        {/* Import from X Section */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
            <h2 className="font-semibold flex items-center gap-2">
              <Download className="w-4 h-4" />
              Import from X
            </h2>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-[var(--muted)]">
              Automatically import your recent tweets from X to train the AI on your voice.
            </p>
            <button
              onClick={handleImportFromX}
              disabled={importingFromX}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black hover:bg-gray-900 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
            >
              {importingFromX ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Importing from X...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Import My Tweets
                </>
              )}
            </button>
          </div>
        </section>

        {/* Manual Import Section */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
            <h2 className="font-semibold flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Or Paste Manually
            </h2>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-[var(--muted)]">
              Paste tweets below — one per line or separated by blank lines.
            </p>
            <textarea
              value={tweetInput}
              onChange={(e) => setTweetInput(e.target.value)}
              placeholder={`Paste your tweets here...\n\nExample:\nJust shipped a new feature using Claude's API. The context window handling is game-changing.\n\nOpen source AI is moving faster than anyone expected. Not even close. 🔥\n\nHot take: most AI startups are just thin wrappers around API calls. The real value is in the UX.`}
              rows={8}
              className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-accent focus:outline-none resize-none text-sm font-mono"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--muted)]">
                {tweetInput.split(/\n\n|\n/).filter(t => t.trim()).length} tweets detected
              </span>
              <button
                onClick={handleImport}
                disabled={importing || !tweetInput.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-[var(--accent-text)] rounded-lg transition-colors text-sm font-medium"
              >
                {importing ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Import Tweets
              </button>
            </div>
          </div>
        </section>

        {/* Sample Count & Actions */}
        {samples.length > 0 && (
          <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
            <button
              onClick={() => setShowSamples(!showSamples)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--card-hover)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-accent" />
                <span className="font-semibold">{samples.length} tweets imported</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleClearAll() }}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-400/10"
                >
                  Clear All
                </button>
                {showSamples ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>
            {showSamples && (
              <div className="border-t border-[var(--border)] max-h-64 overflow-y-auto">
                {samples.map((sample) => (
                  <div key={sample.id} className="px-4 py-2 border-b border-[var(--border)] last:border-b-0 flex items-start gap-2 group">
                    <p className="text-sm flex-1 text-[var(--muted)]">{sample.tweet_text}</p>
                    <button
                      onClick={() => handleDeleteSample(sample.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={analyzing || samples.length < 3}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 text-[var(--accent-text)] rounded-lg transition-colors font-medium"
        >
          {analyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Analyzing your voice...
            </>
          ) : voiceProfile ? (
            <>
              <RefreshCw className="w-5 h-5" />
              Re-analyze Voice
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Analyze My Voice
            </>
          )}
        </button>
        {samples.length < 3 && samples.length > 0 && (
          <p className="text-xs text-[var(--muted)] text-center -mt-4">
            Need at least 3 tweets to analyze (you have {samples.length})
          </p>
        )}

        {/* Voice Profile Display */}
        {voiceProfile && (
          <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                Your Voice Profile
              </h2>
              {voiceTrainedAt && (
                <span className="text-xs text-[var(--muted)]">
                  Analyzed {new Date(voiceTrainedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="p-4 space-y-4">
              {/* Summary */}
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                <p className="text-sm">{voiceProfile.summary}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Tone */}
                <div className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--muted)] mb-1">Tone</p>
                  <p className="text-sm font-medium">{voiceProfile.toneMarkers?.join(', ') || 'N/A'}</p>
                </div>

                {/* Avg Length */}
                <div className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--muted)] mb-1">Avg Tweet Length</p>
                  <p className="text-sm font-medium">{voiceProfile.avgTweetLength} characters</p>
                </div>

                {/* Emoji Style */}
                <div className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--muted)] mb-1">Emoji Usage</p>
                  <p className="text-sm font-medium">
                    {voiceProfile.emojiUsage?.frequency || 'N/A'}
                    {voiceProfile.emojiUsage?.favorites?.length > 0 && (
                      <span className="ml-1">{voiceProfile.emojiUsage.favorites.join(' ')}</span>
                    )}
                  </p>
                </div>

                {/* Vocabulary */}
                <div className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--muted)] mb-1">Vocabulary</p>
                  <p className="text-sm font-medium capitalize">{voiceProfile.vocabularyLevel || 'N/A'}</p>
                </div>

                {/* Thread Preference */}
                <div className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--muted)] mb-1">Format Preference</p>
                  <p className="text-sm font-medium capitalize">{voiceProfile.threadPreference || 'N/A'}</p>
                </div>

                {/* Sentence Style */}
                <div className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--muted)] mb-1">Sentence Style</p>
                  <p className="text-sm font-medium capitalize">{voiceProfile.sentenceStyle || 'N/A'}</p>
                </div>
              </div>

              {/* Signature Phrases */}
              {voiceProfile.commonPhrases?.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--muted)] mb-2">Signature Phrases</p>
                  <div className="flex flex-wrap gap-2">
                    {voiceProfile.commonPhrases.map((phrase, i) => (
                      <span key={i} className="px-2 py-1 rounded-full text-xs bg-accent/15 text-accent border border-accent/20">
                        &ldquo;{phrase}&rdquo;
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Signature Elements */}
              {voiceProfile.signatureElements?.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--muted)] mb-2">Unique Stylistic Elements</p>
                  <div className="flex flex-wrap gap-2">
                    {voiceProfile.signatureElements.map((el, i) => (
                      <span key={i} className="px-2 py-1 rounded-full text-xs bg-[var(--background)] border border-[var(--border)]">
                        {el}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Formality Scale */}
              <div>
                <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
                  <span>Casual</span>
                  <span>Formality: {voiceProfile.formalityLevel}/10</span>
                  <span>Formal</span>
                </div>
                <div className="h-2 bg-[var(--background)] rounded-full border border-[var(--border)] overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${(voiceProfile.formalityLevel / 10) * 100}%` }}
                  />
                </div>
              </div>

              {/* Hot Take Scale */}
              <div>
                <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
                  <span>Safe</span>
                  <span>Hot Take Tendency: {voiceProfile.hotTakeTendency}/10</span>
                  <span>Spicy 🌶️</span>
                </div>
                <div className="h-2 bg-[var(--background)] rounded-full border border-[var(--border)] overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${(voiceProfile.hotTakeTendency / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tweak Section */}
        {voiceProfile && (
          <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
              <h2 className="font-semibold">Fine-tune Your Voice</h2>
              <p className="text-xs text-[var(--muted)] mt-1">Adjust the detected profile to your liking</p>
            </div>
            <div className="p-4 space-y-4">
              {/* Formality Slider */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Casual</span>
                  <span className="text-[var(--muted)]">Formality: {effectiveFormality}/10</span>
                  <span>Formal</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={effectiveFormality}
                  onChange={(e) => setTweaks({ ...tweaks, formalityLevel: parseInt(e.target.value) })}
                  className="w-full accent-accent"
                />
              </div>

              {/* Hot Take Slider */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Safe</span>
                  <span className="text-[var(--muted)]">Hot Takes: {effectiveHotTake}/10</span>
                  <span>Spicy</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={effectiveHotTake}
                  onChange={(e) => setTweaks({ ...tweaks, hotTakeTendency: parseInt(e.target.value) })}
                  className="w-full accent-accent"
                />
              </div>

              {/* Emoji Toggle */}
              <div>
                <p className="text-sm mb-2">Emoji Usage</p>
                <div className="flex gap-2">
                  {['none', 'rare', 'moderate', 'heavy'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setTweaks({ ...tweaks, emojiFrequency: level })}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        effectiveEmoji === level
                          ? 'bg-accent text-[var(--accent-text)]'
                          : 'bg-[var(--background)] border border-[var(--border)] hover:border-[var(--muted)]'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Tweaks */}
              {hasTweaks && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveTweaks}
                    className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-[var(--accent-text)] rounded-lg transition-colors text-sm font-medium"
                  >
                    <Check className="w-4 h-4" />
                    Save Adjustments
                  </button>
                  <button
                    onClick={() => setTweaks({})}
                    className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Inspiration Tweets Section */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <button
            onClick={() => setShowInspirationTweets(!showInspirationTweets)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--card-hover)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-violet-500" />
              <div className="text-left">
                <span className="font-semibold">Inspiration Tweets</span>
                <span className="text-xs text-[var(--muted)] ml-2">
                  {inspirationTweets.length} saved
                </span>
              </div>
            </div>
            {showInspirationTweets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showInspirationTweets && (
            <div className="border-t border-[var(--border)]">
              {/* Explainer */}
              <div className="px-4 py-3 bg-violet-500/5 border-b border-[var(--border)]">
                <p className="text-xs text-[var(--muted)]">
                  💡 Saved tweets from other creators influence your AI-generated content. 
                  The AI learns from their hooks, phrasing, and engagement patterns to improve your posts.
                </p>
              </div>

              {inspirationTweets.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bookmark className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-[var(--muted)]">No inspiration tweets saved yet</p>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Use the Chrome extension to save high-performing tweets from other creators
                  </p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto divide-y divide-[var(--border)]">
                  {inspirationTweets.map((tweet) => (
                    <div key={tweet.id} className="px-4 py-3 group hover:bg-[var(--card-hover)] transition-colors">
                      {/* Author info */}
                      <div className="flex items-center gap-2 mb-2">
                        {tweet.author_profile_image_url ? (
                          <Image 
                            src={tweet.author_profile_image_url} 
                            alt="" 
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded-full"
                            unoptimized
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[var(--border)]" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{tweet.author_name || tweet.author_username}</span>
                          <span className="text-xs text-[var(--muted)] ml-1">@{tweet.author_username}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {tweet.tweet_url && (
                            <a 
                              href={tweet.tweet_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteInspirationTweet(tweet.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tweet text */}
                      <p className="text-sm text-[var(--foreground)] mb-2 line-clamp-3">
                        {tweet.tweet_text}
                      </p>

                      {/* Engagement metrics */}
                      <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {formatNumber(tweet.reply_count)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Repeat2 className="w-3 h-3" />
                          {formatNumber(tweet.repost_count)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {formatNumber(tweet.like_count)}
                        </span>
                        <span className="ml-auto">
                          Saved {new Date(tweet.saved_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

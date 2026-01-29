'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw, Check, AlertCircle, Sparkles, Loader2 } from 'lucide-react'

interface VoiceProfile {
  summary?: string
  toneMarkers?: string[]
  formalityLevel?: number
  hotTakeTendency?: number
  vocabularyLevel?: string
  emojiUsage?: { frequency: string; favorites?: string[] }
  sentenceStyle?: string
  avgTweetLength?: number
  commonPhrases?: string[]
  signatureElements?: string[]
}

interface VoiceProfileCardProps {
  userId: string
}

export function VoiceProfileCard({ userId }: VoiceProfileCardProps) {
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null)
  const [voiceTrainedAt, setVoiceTrainedAt] = useState<string | null>(null)
  const [tweetCount, setTweetCount] = useState<number | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasXConnection, setHasXConnection] = useState(false)

  useEffect(() => {
    async function loadVoiceProfile() {
      const supabase = createClient()
      
      // Check if X is connected
      const { data: xTokens } = await supabase
        .from('x_tokens')
        .select('x_username')
        .eq('user_id', userId)
        .single()
      
      setHasXConnection(!!xTokens?.x_username)

      // Load voice profile
      const { data } = await supabase
        .from('content_profiles')
        .select('voice_profile, voice_trained_at, voice_tweet_count')
        .eq('user_id', userId)
        .single()

      if (data?.voice_profile) {
        setVoiceProfile(data.voice_profile as VoiceProfile)
        setVoiceTrainedAt(data.voice_trained_at)
        setTweetCount(data.voice_tweet_count)
      }
    }
    loadVoiceProfile()
  }, [userId])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/voice/auto-analyze', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setVoiceProfile(data.voiceProfile)
      setVoiceTrainedAt(data.analyzedAt)
      setTweetCount(data.tweetCount)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  if (!hasXConnection) {
    return (
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-400">X Account Required</p>
            <p className="text-sm text-[var(--muted)] mt-1">
              Connect your X account to automatically learn your writing voice from your tweets.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Action Button */}
      <div className="flex items-center justify-between">
        <div>
          {voiceProfile ? (
            <p className="text-sm text-[var(--muted)]">
              Analyzed {tweetCount || 'your'} tweets 
              {voiceTrainedAt && ` • ${new Date(voiceTrainedAt).toLocaleDateString()}`}
            </p>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              We&apos;ll analyze your recent tweets to learn your unique voice
            </p>
          )}
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-[var(--accent-text)] rounded-lg transition-colors text-sm font-medium"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : success ? (
            <>
              <Check className="w-4 h-4" />
              Updated!
            </>
          ) : voiceProfile ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Analyze My Voice
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Voice Profile Display */}
      {voiceProfile && (
        <div className="space-y-4 p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
          {/* Summary */}
          {voiceProfile.summary && (
            <div>
              <h4 className="text-sm font-medium text-[var(--muted)] mb-1">Your Voice</h4>
              <p className="text-sm">{voiceProfile.summary}</p>
            </div>
          )}

          {/* Tone Markers */}
          {voiceProfile.toneMarkers && voiceProfile.toneMarkers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[var(--muted)] mb-2">Tone</h4>
              <div className="flex flex-wrap gap-2">
                {voiceProfile.toneMarkers.map(tone => (
                  <span
                    key={tone}
                    className="px-2.5 py-1 bg-accent/10 border border-accent/30 text-accent rounded-full text-xs font-medium capitalize"
                  >
                    {tone}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {voiceProfile.formalityLevel !== undefined && (
              <div className="p-3 bg-[var(--card)] rounded-lg">
                <p className="text-xs text-[var(--muted)]">Formality</p>
                <p className="font-semibold">{voiceProfile.formalityLevel}/10</p>
              </div>
            )}
            {voiceProfile.hotTakeTendency !== undefined && (
              <div className="p-3 bg-[var(--card)] rounded-lg">
                <p className="text-xs text-[var(--muted)]">Hot Take Level</p>
                <p className="font-semibold">{voiceProfile.hotTakeTendency}/10</p>
              </div>
            )}
            {voiceProfile.vocabularyLevel && (
              <div className="p-3 bg-[var(--card)] rounded-lg">
                <p className="text-xs text-[var(--muted)]">Vocabulary</p>
                <p className="font-semibold capitalize">{voiceProfile.vocabularyLevel}</p>
              </div>
            )}
            {voiceProfile.avgTweetLength !== undefined && (
              <div className="p-3 bg-[var(--card)] rounded-lg">
                <p className="text-xs text-[var(--muted)]">Avg Length</p>
                <p className="font-semibold">{voiceProfile.avgTweetLength} chars</p>
              </div>
            )}
          </div>

          {/* Signature Elements */}
          {voiceProfile.signatureElements && voiceProfile.signatureElements.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[var(--muted)] mb-2">Signature Style</h4>
              <ul className="space-y-1">
                {voiceProfile.signatureElements.map((element, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-accent">•</span>
                    {element}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Phrases */}
          {voiceProfile.commonPhrases && voiceProfile.commonPhrases.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[var(--muted)] mb-2">Common Phrases</h4>
              <div className="flex flex-wrap gap-2">
                {voiceProfile.commonPhrases.map((phrase, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-[var(--card)] border border-[var(--border)] rounded text-xs"
                  >
                    &quot;{phrase}&quot;
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

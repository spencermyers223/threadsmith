'use client'

import { useState } from 'react'
import {
  Search, ShoppingCart, Loader2, User, MessageSquare,
  AlertCircle, Check, Sparkles
} from 'lucide-react'

interface MarketplaceProps {
  userCredits: number
  onCreditsUsed?: (amount: number) => void
}

// Cost: ~$0.005 per tweet from X API + processing = ~0.1 credits per tweet
const CREDITS_PER_10_TWEETS = 1

export function Marketplace({ userCredits, onCreditsUsed }: MarketplaceProps) {
  const [username, setUsername] = useState('')
  const [tweetCount, setTweetCount] = useState(50)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fetchedData, setFetchedData] = useState<{
    username: string
    tweets: Array<{ text: string; likes: number; created_at: string }>
    analysis?: string
  } | null>(null)

  const creditCost = Math.ceil(tweetCount / 10) * CREDITS_PER_10_TWEETS
  const canAfford = userCredits >= creditCost

  const handleFetch = async () => {
    if (!username.trim()) {
      setError('Please enter a username')
      return
    }
    if (!canAfford) {
      setError(`Not enough credits. You need ${creditCost} credits.`)
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)
    setFetchedData(null)

    try {
      const res = await fetch('/api/marketplace/fetch-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.replace('@', ''),
          tweetCount: tweetCount
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch account data')
      }

      const data = await res.json()
      setFetchedData(data)
      setSuccess(`Successfully fetched ${data.tweets.length} tweets from @${data.username}`)
      
      if (onCreditsUsed) {
        onCreditsUsed(creditCost)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const tweetCountOptions = [10, 25, 50, 100, 200]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Data Marketplace</h2>
        <p className="text-[var(--muted)]">
          Analyze any X account. Get their top tweets and patterns.
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
            <p className="text-sm text-[var(--muted)]">Use credits to fetch account data</p>
          </div>
        </div>
        <div className="text-2xl font-bold text-[var(--accent)]">{userCredits}</div>
      </div>

      {/* Fetch Form */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Fetch Account Data
        </h3>

        {/* Username Input */}
        <div>
          <label className="block text-sm font-medium mb-2">X Username</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., elonmusk"
              className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            />
          </div>
        </div>

        {/* Tweet Count Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Number of Tweets</label>
          <div className="flex flex-wrap gap-2">
            {tweetCountOptions.map(count => (
              <button
                key={count}
                onClick={() => setTweetCount(count)}
                className={`px-4 py-2 rounded-lg border font-medium transition-all ${
                  tweetCount === count
                    ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                    : 'bg-[var(--background)] border-[var(--border)] hover:border-[var(--accent)]'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Cost Display */}
        <div className="bg-[var(--background)] rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[var(--muted)]" />
            <span className="text-[var(--muted)]">{tweetCount} tweets</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--muted)]">Cost:</span>
            <span className={`font-bold ${canAfford ? 'text-emerald-400' : 'text-red-400'}`}>
              {creditCost} credits
            </span>
          </div>
        </div>

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

        {/* Fetch Button */}
        <button
          onClick={handleFetch}
          disabled={loading || !canAfford || !username.trim()}
          className="w-full py-3 bg-[var(--accent)] text-black rounded-lg font-semibold hover:bg-[var(--accent)]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Fetch {tweetCount} Tweets for {creditCost} Credits
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {fetchedData && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
          <h3 className="font-semibold">Results for @{fetchedData.username}</h3>
          
          {fetchedData.analysis && (
            <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg p-4">
              <p className="text-sm font-medium mb-2 text-[var(--accent)]">AI Analysis</p>
              <p className="text-sm">{fetchedData.analysis}</p>
            </div>
          )}

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {fetchedData.tweets.slice(0, 10).map((tweet, idx) => (
              <div key={idx} className="bg-[var(--background)] p-3 rounded-lg">
                <p className="text-sm mb-2">{tweet.text}</p>
                <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                  <span>❤️ {tweet.likes}</span>
                  <span>{new Date(tweet.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          {fetchedData.tweets.length > 10 && (
            <p className="text-sm text-[var(--muted)] text-center">
              Showing 10 of {fetchedData.tweets.length} tweets
            </p>
          )}
        </div>
      )}

      {/* Pricing Info */}
      <div className="text-center text-sm text-[var(--muted)]">
        <p>💡 1 credit = ~10 tweets fetched</p>
        <p className="mt-1">Need more credits? <a href="/settings" className="text-[var(--accent)] hover:underline">Purchase credits</a></p>
      </div>
    </div>
  )
}

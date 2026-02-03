'use client'

import { useState, useEffect } from 'react'
import { useXAccount } from '@/contexts/XAccountContext'
import { GenerationCounter } from '@/components/subscription/GenerationCounter'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import {
  Sparkles,
  Loader2,
  Check,
  Link as LinkIcon,
  AlertCircle,
  Copy,
  Calendar,
  RefreshCw,
  Edit3,
  Trash2,
  Heart,
  Repeat2,
  ExternalLink,
  Plus,
  Zap
} from 'lucide-react'
import { EditingTools } from '@/components/editing'

interface SavedInspiration {
  id: string
  tweet_url: string
  tweet_text: string
  author_username: string
  author_name: string
  likes: number
  retweets: number
  saved_at: string
  repurposed: boolean
}

interface GeneratedPost {
  content: string
  approach: string
}

export default function RepurposeMode() {
  const { activeAccount } = useXAccount()
  
  // State
  const [tweetUrl, setTweetUrl] = useState('')
  const [inspirations, setInspirations] = useState<SavedInspiration[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedInspiration, setSelectedInspiration] = useState<SavedInspiration | null>(null)
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const loadInspirations = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/repurpose${activeAccount?.id ? `?x_account_id=${activeAccount.id}` : ''}`)
      if (res.ok) {
        const data = await res.json()
        setInspirations(data.inspirations || [])
      }
    } catch (err) {
      console.error('Failed to load inspirations:', err)
    }
    setLoading(false)
  }

  // Load saved inspirations
  useEffect(() => {
    loadInspirations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount?.id])

  const extractTweetId = (url: string): string | null => {
    // Match various X/Twitter URL formats
    const patterns = [
      /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
      /(?:twitter\.com|x\.com)\/i\/web\/status\/(\d+)/,
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const handleSaveInspiration = async () => {
    if (!tweetUrl.trim()) {
      setError('Please enter a tweet URL')
      return
    }

    const tweetId = extractTweetId(tweetUrl)
    if (!tweetId) {
      setError('Invalid tweet URL. Please paste a valid X/Twitter post URL.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/repurpose/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweetUrl: tweetUrl.trim(),
          tweetId,
          xAccountId: activeAccount?.id
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save inspiration')
      }

      setSuccess('Tweet saved to your inspirations!')
      setTweetUrl('')
      loadInspirations()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteInspiration = async (id: string) => {
    try {
      const res = await fetch(`/api/repurpose/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setInspirations(prev => prev.filter(i => i.id !== id))
        if (selectedInspiration?.id === id) {
          setSelectedInspiration(null)
          setGeneratedPosts([])
        }
      }
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const handleRepurpose = async (inspiration: SavedInspiration) => {
    setSelectedInspiration(inspiration)
    setGenerating(true)
    setError(null)
    setGeneratedPosts([])

    try {
      // Check usage limits
      const usageRes = await fetch('/api/subscription/usage')
      if (usageRes.ok) {
        const usageData = await usageRes.json()
        if (!usageData.canGenerate) {
          setShowUpgradeModal(true)
          setGenerating(false)
          return
        }
      }

      const res = await fetch('/api/repurpose/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspirationId: inspiration.id,
          sourceTweet: inspiration.tweet_text,
          sourceAuthor: inspiration.author_username,
          xAccountId: activeAccount?.id
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      setGeneratedPosts(data.posts || [])

      // Refresh counter
      const refreshFn = (window as unknown as { refreshGenerationCounter?: () => void }).refreshGenerationCounter
      if (refreshFn) refreshFn()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const updatePostContent = (index: number, newContent: string) => {
    setGeneratedPosts(prev => 
      prev.map((p, i) => i === index ? { ...p, content: newContent } : p)
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Generation Counter */}
      <div className="mb-6">
        <GenerationCounter />
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)]/10 rounded-full mb-4">
          <Zap className="w-5 h-5 text-[var(--accent)]" />
          <span className="text-sm font-medium text-[var(--accent)]">Repurpose Mode</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Turn Great Content Into Your Own</h2>
        <p className="text-[var(--muted)]">
          Save tweets you love, then repurpose them in your voice. Same format, your unique spin.
        </p>
      </div>

      {/* Save New Inspiration */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5" />
          Save a Tweet to Repurpose
        </h3>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
            <input
              type="text"
              value={tweetUrl}
              onChange={(e) => setTweetUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveInspiration()}
              placeholder="Paste tweet URL (e.g., https://x.com/naval/status/...)"
              className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            />
          </div>
          <button
            onClick={handleSaveInspiration}
            disabled={saving || !tweetUrl.trim()}
            className="px-6 py-3 bg-[var(--accent)] text-black rounded-lg font-semibold hover:bg-[var(--accent)]/90 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            Save
          </button>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-emerald-400">
            <Check className="w-5 h-5 flex-shrink-0" />
            {success}
          </div>
        )}
      </div>

      {/* Saved Inspirations */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[var(--accent)]" />
          Your Saved Inspirations
          {inspirations.length > 0 && (
            <span className="text-xs text-[var(--muted)] bg-[var(--border)] px-2 py-0.5 rounded-full">
              {inspirations.length}
            </span>
          )}
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--muted)]" />
          </div>
        ) : inspirations.length === 0 ? (
          <div className="text-center py-8 text-[var(--muted)]">
            <LinkIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No inspirations saved yet.</p>
            <p className="text-sm mt-1">Paste a tweet URL above to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inspirations.map(inspiration => (
              <div
                key={inspiration.id}
                className={`p-4 rounded-lg border transition-all ${
                  selectedInspiration?.id === inspiration.id
                    ? 'bg-[var(--accent)]/10 border-[var(--accent)]/50'
                    : 'bg-[var(--background)] border-[var(--border)] hover:border-[var(--accent)]/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">@{inspiration.author_username}</span>
                      {inspiration.repurposed && (
                        <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">
                          Repurposed
                        </span>
                      )}
                    </div>
                    <p className="text-sm mb-3 line-clamp-3">{inspiration.tweet_text}</p>
                    <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-pink-400" />
                        {inspiration.likes?.toLocaleString() || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Repeat2 className="w-3 h-3 text-emerald-400" />
                        {inspiration.retweets?.toLocaleString() || 0}
                      </span>
                      <a
                        href={inspiration.tweet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[var(--accent)] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleRepurpose(inspiration)}
                      disabled={generating && selectedInspiration?.id === inspiration.id}
                      className="px-4 py-2 bg-[var(--accent)] text-black rounded-lg font-medium text-sm hover:bg-[var(--accent)]/90 disabled:opacity-50 flex items-center gap-2"
                    >
                      {generating && selectedInspiration?.id === inspiration.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Repurpose
                    </button>
                    <button
                      onClick={() => handleDeleteInspiration(inspiration.id)}
                      className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generated Posts */}
      {generatedPosts.length > 0 && selectedInspiration && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Your Repurposed Versions ({generatedPosts.length})</h2>
              <p className="text-sm text-[var(--muted)]">
                Based on @{selectedInspiration.author_username}&apos;s tweet
              </p>
            </div>
            <button
              onClick={() => handleRepurpose(selectedInspiration)}
              disabled={generating}
              className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {generatedPosts.map((post, idx) => (
              <div key={idx} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--background)]/50">
                  <span className="text-sm text-[var(--muted)]">{post.approach || `Option ${idx + 1}`}</span>
                </div>

                {/* Content */}
                <div className="p-4 flex-1">
                  <p className="whitespace-pre-wrap leading-relaxed text-sm">{post.content}</p>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-[var(--background)] border-t border-[var(--border)] space-y-3">
                  {/* Character count */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted)]">Characters</span>
                    <span className={`font-mono ${
                      post.content.length > 280 ? 'text-red-400' : 
                      post.content.length > 250 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {post.content.length}/280
                    </span>
                  </div>

                  {/* Editing Tools */}
                  <EditingTools
                    content={post.content}
                    onContentChange={(newContent) => updatePostContent(idx, newContent)}
                    isThread={false}
                  />

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(post.content, idx)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg text-sm transition-colors"
                    >
                      {copiedIndex === idx ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedIndex === idx ? 'Copied' : 'Copy'}
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg text-sm transition-colors">
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--accent)] text-black rounded-lg text-sm font-medium transition-colors">
                      <Calendar className="w-4 h-4" />
                      Schedule
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  )
}

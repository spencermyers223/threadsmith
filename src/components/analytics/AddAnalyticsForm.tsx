'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Link as LinkIcon, Save } from 'lucide-react'
import Link from 'next/link'

interface Post {
  id: string
  title: string | null
  post_type: string | null
  status: string
  created_at: string
}

interface Props {
  userId: string
  posts: Post[]
}

function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/)
  return match ? match[1] : null
}

export function AddAnalyticsForm({ userId, posts }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [tweetUrl, setTweetUrl] = useState('')
  const [tweetId, setTweetId] = useState('')
  const [postId, setPostId] = useState('')
  const [impressions, setImpressions] = useState('')
  const [likes, setLikes] = useState('')
  const [replies, setReplies] = useState('')
  const [retweets, setRetweets] = useState('')
  const [quotes, setQuotes] = useState('')
  const [bookmarks, setBookmarks] = useState('')
  const [profileClicks, setProfileClicks] = useState('')
  const [followersGained, setFollowersGained] = useState('')
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 16))

  const handleUrlChange = (url: string) => {
    setTweetUrl(url)
    const id = extractTweetId(url)
    if (id) setTweetId(id)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()

    const { error: err } = await supabase.from('post_analytics').insert({
      user_id: userId,
      post_id: postId || null,
      tweet_url: tweetUrl || null,
      tweet_id: tweetId || null,
      impressions: parseInt(impressions) || 0,
      likes: parseInt(likes) || 0,
      replies: parseInt(replies) || 0,
      retweets: parseInt(retweets) || 0,
      quotes: parseInt(quotes) || 0,
      bookmarks: parseInt(bookmarks) || 0,
      profile_clicks: parseInt(profileClicks) || 0,
      followers_gained: parseInt(followersGained) || 0,
      recorded_at: new Date(recordedAt).toISOString(),
    })

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    router.push('/analytics')
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <Link
        href="/analytics"
        className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Analytics
      </Link>

      <h1 className="text-2xl font-bold mb-2">Add Post Metrics</h1>
      <p className="text-[var(--muted)] text-sm mb-8">
        Paste your tweet URL and enter the metrics from X Analytics.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tweet URL */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            Tweet Info
          </h2>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Tweet URL</label>
            <input
              type="url"
              value={tweetUrl}
              onChange={e => handleUrlChange(e.target.value)}
              placeholder="https://x.com/username/status/123..."
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
            />
            {tweetId && (
              <p className="text-xs text-accent mt-1">Tweet ID: {tweetId}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Link to xthread Post (optional)</label>
            <select
              value={postId}
              onChange={e => setPostId(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
            >
              <option value="">— None —</option>
              {posts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title || 'Untitled'} ({p.post_type || p.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">When were these metrics recorded?</label>
            <input
              type="datetime-local"
              value={recordedAt}
              onChange={e => setRecordedAt(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Metrics */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-sm font-semibold mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-2 gap-4">
            <MetricInput label="Impressions" value={impressions} onChange={setImpressions} />
            <MetricInput label="Likes" value={likes} onChange={setLikes} />
            <MetricInput label="Replies" value={replies} onChange={setReplies} />
            <MetricInput label="Retweets" value={retweets} onChange={setRetweets} />
            <MetricInput label="Quotes" value={quotes} onChange={setQuotes} />
            <MetricInput label="Bookmarks" value={bookmarks} onChange={setBookmarks} />
            <MetricInput label="Profile Clicks" value={profileClicks} onChange={setProfileClicks} />
            <MetricInput label="Followers Gained" value={followersGained} onChange={setFollowersGained} />
          </div>
        </div>

        {/* Calculated Preview */}
        {parseInt(impressions) > 0 && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
            <h2 className="text-sm font-semibold mb-3">Preview</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-[var(--muted)]">Engagement Rate</div>
                <div className="text-lg font-bold text-accent">
                  {(((parseInt(likes) || 0) + (parseInt(replies) || 0) + (parseInt(retweets) || 0) + (parseInt(quotes) || 0)) / parseInt(impressions) * 100).toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Reply Ratio</div>
                <div className="text-lg font-bold">
                  {((parseInt(replies) || 0) / parseInt(impressions) * 100).toFixed(3)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Viral Score</div>
                <div className="text-lg font-bold">
                  {(((parseInt(retweets) || 0) * 2 + (parseInt(quotes) || 0) * 3) / parseInt(impressions) * 100).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent text-[var(--accent-text)] rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Metrics'}
        </button>
      </form>
    </div>
  )
}

function MetricInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm text-[var(--muted)] mb-1">{label}</label>
      <input
        type="number"
        min="0"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
      />
    </div>
  )
}

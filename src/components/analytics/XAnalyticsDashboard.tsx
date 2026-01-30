'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3, Eye, Heart, TrendingUp, MessageSquare, Repeat2,
  RefreshCw, AlertCircle, ExternalLink, Sparkles
} from 'lucide-react'

interface TweetMetrics {
  likes: number
  retweets: number
  replies: number
  quotes: number
  impressions: number
  engagement: number
  engagement_rate: number
}

interface Tweet {
  id: string
  text: string
  created_at: string
  is_thread_start: boolean
  metrics: TweetMetrics
}

interface Summary {
  total_tweets: number
  total_impressions: number
  total_engagement: number
  total_likes: number
  total_retweets: number
  total_replies: number
  avg_engagement_rate: number
  avg_likes: number
  avg_retweets: number
  avg_replies: number
}

interface TopPerformers {
  by_likes: Tweet[]
  by_engagement_rate: Tweet[]
}

interface AnalyticsData {
  tweets: Tweet[]
  summary: Summary
  top_performers: TopPerformers
}

export function XAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAnalytics = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/x/analytics?max_results=50')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch analytics')
      }

      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--muted)]">Loading analytics from X...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
        <h2 className="text-xl font-bold mb-2">Unable to Load Analytics</h2>
        <p className="text-[var(--muted)] mb-6">{error}</p>
        <button
          onClick={() => fetchAnalytics()}
          className="px-6 py-3 bg-accent text-[var(--accent-text)] rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!data || data.tweets.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-[var(--muted)]" />
        <h2 className="text-xl font-bold mb-2">No Tweets Found</h2>
        <p className="text-[var(--muted)]">
          Post some tweets on X to see your analytics here.
        </p>
      </div>
    )
  }

  const { summary, top_performers, tweets } = data
  
  // Defensive: ensure summary values exist
  const safeAvgEngagementRate = typeof summary?.avg_engagement_rate === 'number' 
    ? summary.avg_engagement_rate 
    : 0

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent" />
            X Analytics
          </h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Real-time performance data from your X account
          </p>
        </div>
        <button
          onClick={() => fetchAnalytics(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--card-hover)] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <SummaryCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="Tweets"
          value={summary.total_tweets.toString()}
        />
        <SummaryCard
          icon={<Eye className="w-5 h-5" />}
          label="Impressions"
          value={formatNumber(summary.total_impressions)}
        />
        <SummaryCard
          icon={<Heart className="w-5 h-5" />}
          label="Total Likes"
          value={formatNumber(summary.total_likes)}
        />
        <SummaryCard
          icon={<Repeat2 className="w-5 h-5" />}
          label="Retweets"
          value={formatNumber(summary.total_retweets)}
        />
        <SummaryCard
          icon={<MessageSquare className="w-5 h-5" />}
          label="Replies"
          value={formatNumber(summary.total_replies)}
        />
        <SummaryCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Avg Engagement"
          value={`${safeAvgEngagementRate.toFixed(2)}%`}
          highlight
        />
      </div>

      {/* Top Performers */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Top by Likes */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="font-semibold flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400" />
              Top by Likes
            </h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {top_performers.by_likes.map((tweet, i) => (
              <TweetRow key={tweet.id} tweet={tweet} rank={i + 1} />
            ))}
          </div>
        </div>

        {/* Top by Engagement Rate */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              Top by Engagement Rate
            </h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {top_performers.by_engagement_rate.map((tweet, i) => (
              <TweetRow key={tweet.id} tweet={tweet} rank={i + 1} showRate />
            ))}
          </div>
        </div>
      </div>

      {/* All Tweets Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold">Recent Tweets</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                <th className="px-5 py-3 font-medium">Tweet</th>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium text-center">
                  <Eye className="w-4 h-4 inline" />
                </th>
                <th className="px-3 py-3 font-medium text-center">
                  <Heart className="w-4 h-4 inline" />
                </th>
                <th className="px-3 py-3 font-medium text-center">
                  <Repeat2 className="w-4 h-4 inline" />
                </th>
                <th className="px-3 py-3 font-medium text-center">
                  <MessageSquare className="w-4 h-4 inline" />
                </th>
                <th className="px-3 py-3 font-medium">Eng %</th>
              </tr>
            </thead>
            <tbody>
              {tweets.map(tweet => (
                <tr key={tweet.id} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors">
                  <td className="px-5 py-3 max-w-[300px]">
                    <p className="truncate">{tweet.text}</p>
                    {tweet.is_thread_start && (
                      <span className="text-xs text-accent">Thread</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[var(--muted)] whitespace-nowrap">
                    {new Date(tweet.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </td>
                  <td className="px-3 py-3 text-center">{formatNumber(tweet.metrics.impressions)}</td>
                  <td className="px-3 py-3 text-center">{tweet.metrics.likes}</td>
                  <td className="px-3 py-3 text-center">{tweet.metrics.retweets}</td>
                  <td className="px-3 py-3 text-center">{tweet.metrics.replies}</td>
                  <td className="px-3 py-3 font-medium text-accent">
                    {(tweet.metrics?.engagement_rate ?? 0).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ 
  icon, 
  label, 
  value, 
  highlight 
}: { 
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean 
}) {
  return (
    <div className={`rounded-xl p-4 ${
      highlight 
        ? 'bg-accent/10 border border-accent/20' 
        : 'bg-[var(--card)] border border-[var(--border)]'
    }`}>
      <div className="flex items-center gap-2 text-[var(--muted)] mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`text-xl font-bold ${highlight ? 'text-accent' : ''}`}>
        {value}
      </div>
    </div>
  )
}

function TweetRow({ 
  tweet, 
  rank, 
  showRate 
}: { 
  tweet: Tweet
  rank: number
  showRate?: boolean 
}) {
  return (
    <div className="px-5 py-3 flex items-start gap-3">
      <span className="text-lg font-bold text-[var(--muted)] w-6">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm line-clamp-2 mb-1">{tweet.text}</p>
        <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" /> {tweet.metrics.likes}
          </span>
          <span className="flex items-center gap-1">
            <Repeat2 className="w-3 h-3" /> {tweet.metrics.retweets}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> {tweet.metrics.replies}
          </span>
          {showRate && (
            <span className="text-accent font-medium">
              {(tweet.metrics?.engagement_rate ?? 0).toFixed(2)}% engagement
            </span>
          )}
        </div>
      </div>
      <a
        href={`https://x.com/i/status/${tweet.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--muted)] hover:text-accent p-1"
      >
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  )
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

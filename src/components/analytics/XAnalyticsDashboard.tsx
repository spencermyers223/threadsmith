'use client'

import { useState, useEffect, useRef } from 'react'
import {
  BarChart3, Eye, Heart, TrendingUp, MessageSquare, Repeat2,
  RefreshCw, AlertCircle, ExternalLink, Sparkles, Clock
} from 'lucide-react'
import { useXAccount } from '@/contexts/XAccountContext'

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

interface CachedData {
  data: AnalyticsData
  timestamp: number
  accountId: string
}

const CACHE_KEY = 'xthread_analytics_cache'

export function XAnalyticsDashboard() {
  const { activeAccount } = useXAccount()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedTweetId, setExpandedTweetId] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const prevAccountIdRef = useRef<string | null>(null)

  // Load cached data on mount
  useEffect(() => {
    if (!activeAccount?.id) return
    
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed: CachedData = JSON.parse(cached)
        if (parsed.accountId === activeAccount.id) {
          setData(parsed.data)
          setLastUpdated(new Date(parsed.timestamp))
          setHasLoaded(true)
        }
      }
    } catch {
      // Ignore cache errors
    }
    
    prevAccountIdRef.current = activeAccount.id
  }, [activeAccount?.id])

  const fetchAnalytics = async (showRefresh = false) => {
    if (!activeAccount?.id) return
    
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/x/analytics?max_results=50&x_account_id=${activeAccount.id}`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch analytics')
      }

      setData(json)
      setHasLoaded(true)
      
      // Cache the data
      const cacheData: CachedData = {
        data: json,
        timestamp: Date.now(),
        accountId: activeAccount.id
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
      setLastUpdated(new Date())
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Clear cache when account changes
  useEffect(() => {
    if (!activeAccount?.id) return
    if (prevAccountIdRef.current && prevAccountIdRef.current !== activeAccount.id) {
      setData(null)
      setHasLoaded(false)
      setLastUpdated(null)
      localStorage.removeItem(CACHE_KEY)
    }
    prevAccountIdRef.current = activeAccount.id
  }, [activeAccount?.id])

  // Initial state - show load button
  if (!hasLoaded && !loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-accent" />
        <h2 className="text-xl font-bold mb-2">X Analytics</h2>
        <p className="text-[var(--muted)] mb-6">
          View engagement metrics for your recent posts.
        </p>
        <button
          onClick={() => fetchAnalytics()}
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-[var(--accent-text)] rounded-xl font-medium hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-accent/20"
        >
          <RefreshCw className="w-5 h-5" />
          Load Analytics
        </button>
        <p className="text-xs text-[var(--muted)] mt-4">
          Each refresh uses 1 API call
        </p>
      </div>
    )
  }

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
          className="px-6 py-3 bg-accent text-[var(--accent-text)] rounded-xl font-medium hover:bg-[var(--accent-hover)] transition-colors"
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
  
  // Defensive: ensure values exist
  const safeAvgEngagementRate = typeof summary?.avg_engagement_rate === 'number' 
    ? summary.avg_engagement_rate 
    : 0
  const safeTopByLikes = top_performers?.by_likes || []
  const safeTopByEngagementRate = top_performers?.by_engagement_rate || []
  const safeSummary = {
    total_tweets: summary?.total_tweets || 0,
    total_impressions: summary?.total_impressions || 0,
    total_likes: summary?.total_likes || 0,
    total_retweets: summary?.total_retweets || 0,
    total_replies: summary?.total_replies || 0,
  }

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
            Performance data for your most recent 50 posts
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <Clock className="w-3.5 h-3.5" />
              <span>Updated {formatTimeAgo(lastUpdated)}</span>
            </div>
          )}
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm font-medium hover:bg-[var(--card-hover)] hover:border-[var(--border-hover)] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <SummaryCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="Tweets"
          value={safeSummary.total_tweets.toString()}
        />
        <SummaryCard
          icon={<Eye className="w-5 h-5" />}
          label="Impressions"
          value={formatNumber(safeSummary.total_impressions)}
        />
        <SummaryCard
          icon={<Heart className="w-5 h-5" />}
          label="Total Likes"
          value={formatNumber(safeSummary.total_likes)}
        />
        <SummaryCard
          icon={<Repeat2 className="w-5 h-5" />}
          label="Retweets"
          value={formatNumber(safeSummary.total_retweets)}
        />
        <SummaryCard
          icon={<MessageSquare className="w-5 h-5" />}
          label="Replies"
          value={formatNumber(safeSummary.total_replies)}
        />
        <SummaryCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Avg Engagement"
          value={`${safeAvgEngagementRate.toFixed(2)}%`}
          highlight
        />
      </div>

      {/* Top Performers */}
      {(safeTopByLikes.length > 0 || safeTopByEngagementRate.length > 0) && (
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
              {safeTopByLikes.length > 0 ? (
                safeTopByLikes.map((tweet, i) => (
                  <TweetRow key={tweet.id} tweet={tweet} rank={i + 1} />
                ))
              ) : (
                <div className="px-5 py-4 text-[var(--muted)] text-sm">No data yet</div>
              )}
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
              {safeTopByEngagementRate.length > 0 ? (
                safeTopByEngagementRate.map((tweet, i) => (
                  <TweetRow key={tweet.id} tweet={tweet} rank={i + 1} showRate />
                ))
              ) : (
                <div className="px-5 py-4 text-[var(--muted)] text-sm">No data yet</div>
              )}
            </div>
          </div>
        </div>
      )}

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
              {tweets.map(tweet => {
                const isExpanded = expandedTweetId === tweet.id
                return (
                  <tr 
                    key={tweet.id} 
                    onClick={() => setExpandedTweetId(isExpanded ? null : tweet.id)}
                    className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3 max-w-[300px]">
                      <p className={isExpanded ? 'whitespace-pre-wrap' : 'truncate'}>
                        {tweet.text}
                      </p>
                      {!isExpanded && tweet.text.length > 50 && (
                        <span className="text-xs text-accent">Click to expand</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[var(--muted)] whitespace-nowrap align-top">
                      {new Date(tweet.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="px-3 py-3 text-center align-top">{formatNumber(tweet.metrics.impressions)}</td>
                    <td className="px-3 py-3 text-center align-top">{tweet.metrics.likes}</td>
                    <td className="px-3 py-3 text-center align-top">{tweet.metrics.retweets}</td>
                    <td className="px-3 py-3 text-center align-top">{tweet.metrics.replies}</td>
                    <td className="px-3 py-3 font-medium text-accent align-top">
                      {(tweet.metrics?.engagement_rate ?? 0).toFixed(2)}%
                    </td>
                  </tr>
                )
              })}
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
  const [expanded, setExpanded] = useState(false)
  
  return (
    <div 
      className="px-5 py-3 flex items-start gap-3 cursor-pointer hover:bg-[var(--card-hover)] transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <span className="text-lg font-bold text-[var(--muted)] w-6">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm mb-1 ${expanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
          {tweet.text}
        </p>
        {!expanded && tweet.text.length > 100 && (
          <span className="text-xs text-accent">Click to expand</span>
        )}
        <div className="flex items-center gap-4 text-xs text-[var(--muted)] mt-1">
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
        onClick={(e) => e.stopPropagation()}
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

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

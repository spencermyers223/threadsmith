'use client'

import { useState, useEffect } from 'react'
import { useXAccount } from '@/contexts/XAccountContext'
import {
  Loader2, TrendingUp, Calendar, Clock, Heart, Repeat2,
  MessageSquare, Lightbulb, Target, BarChart3, Sparkles,
  ChevronRight, RefreshCw, AlertCircle
} from 'lucide-react'

interface Tweet {
  id: string
  text: string
  created_at: string
  public_metrics: {
    like_count: number
    retweet_count: number
    reply_count: number
  }
}

interface OverviewInsight {
  type: 'pattern' | 'recommendation' | 'stat'
  title: string
  description: string
  metric?: string
  icon?: 'trending' | 'calendar' | 'heart' | 'lightbulb'
}

interface OverviewData {
  insights: OverviewInsight[]
  bestPerforming: {
    contentType: string
    topic: string
    postingTime: string
  }
  recommendations: string[]
  weeklyStats: {
    avgLikes: number
    avgRetweets: number
    avgReplies: number
    totalPosts: number
    topPost: Tweet | null
  }
}

export function AccountOverview() {
  const { activeAccount } = useXAccount()
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [tweets, setTweets] = useState<Tweet[]>([])

  useEffect(() => {
    if (activeAccount) {
      loadTweetsAndAnalyze()
    }
  }, [activeAccount, loadTweetsAndAnalyze])

  const loadTweetsAndAnalyze = async () => {
    if (!activeAccount) return
    
    setLoading(true)
    setError(null)

    try {
      // Fetch recent tweets from existing analytics endpoint
      const res = await fetch(`/api/x/analytics?accountId=${activeAccount.id}`)
      
      if (!res.ok) {
        throw new Error('Failed to load your analytics data')
      }

      const data = await res.json()
      const fetchedTweets = data.tweets || []
      setTweets(fetchedTweets)

      if (fetchedTweets.length < 5) {
        setError('Not enough posts to generate insights. Keep posting!')
        setLoading(false)
        return
      }

      // Analyze the tweets
      await analyzeMyAccount(fetchedTweets)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const analyzeMyAccount = async (tweetsData: Tweet[]) => {
    setAnalyzing(true)

    try {
      const res = await fetch('/api/account-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweets: tweetsData })
      })

      if (!res.ok) {
        throw new Error('Failed to analyze your account')
      }

      const data = await res.json()
      setOverview(data.overview)

    } catch (error) {
      console.error('Analysis failed:', error)
      // If AI analysis fails, generate basic stats
      generateBasicOverview(tweetsData)
    } finally {
      setAnalyzing(false)
    }
  }

  const generateBasicOverview = (tweetsData: Tweet[]) => {
    // Calculate basic stats
    const totalLikes = tweetsData.reduce((sum, t) => sum + (t.public_metrics?.like_count || 0), 0)
    const totalRetweets = tweetsData.reduce((sum, t) => sum + (t.public_metrics?.retweet_count || 0), 0)
    const totalReplies = tweetsData.reduce((sum, t) => sum + (t.public_metrics?.reply_count || 0), 0)
    
    const avgLikes = Math.round(totalLikes / tweetsData.length)
    const avgRetweets = Math.round(totalRetweets / tweetsData.length)
    const avgReplies = Math.round(totalReplies / tweetsData.length)

    // Find top post
    const topPost = [...tweetsData].sort((a, b) => 
      (b.public_metrics?.like_count || 0) - (a.public_metrics?.like_count || 0)
    )[0]

    // Analyze posting times
    const postingHours = tweetsData.map(t => new Date(t.created_at).getHours())
    const hourCounts: Record<number, number> = {}
    postingHours.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1 })
    const mostCommonHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

    setOverview({
      insights: [
        {
          type: 'stat',
          title: 'Average Engagement',
          description: `Your posts average ${avgLikes} likes and ${avgRetweets} retweets`,
          metric: `${avgLikes} likes avg`,
          icon: 'heart'
        },
        {
          type: 'pattern',
          title: 'Posting Pattern',
          description: `You most often post around ${mostCommonHour ? `${mostCommonHour}:00` : 'various times'}`,
          icon: 'calendar'
        }
      ],
      bestPerforming: {
        contentType: 'Single tweets',
        topic: 'Your content',
        postingTime: mostCommonHour ? `${mostCommonHour}:00` : 'Varies'
      },
      recommendations: [
        'Keep posting consistently to build your audience',
        'Engage with replies to boost visibility',
        'Try different content formats to see what resonates'
      ],
      weeklyStats: {
        avgLikes,
        avgRetweets,
        avgReplies,
        totalPosts: tweetsData.length,
        topPost
      }
    })
  }

  const handleRefresh = () => {
    loadTweetsAndAnalyze()
  }

  if (!activeAccount) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-[var(--muted)]" />
        <h3 className="text-lg font-semibold mb-2">Connect Your X Account</h3>
        <p className="text-[var(--muted)]">Link your X account to see personalized insights</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-4" />
        <p className="text-[var(--muted)]">Loading your analytics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
        <h3 className="text-lg font-semibold mb-2">Couldn&apos;t load insights</h3>
        <p className="text-[var(--muted)] mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-[var(--accent)] text-black rounded-lg font-medium"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Account Overview</h2>
          <p className="text-[var(--muted)]">AI-powered insights based on your {tweets.length} recent posts</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:bg-[var(--background)] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {analyzing && (
        <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-xl p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
          <span>Analyzing your account patterns...</span>
        </div>
      )}

      {overview && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-pink-400 mb-2">
                <Heart className="w-5 h-5" />
                <span className="text-2xl font-bold">{overview.weeklyStats.avgLikes}</span>
              </div>
              <p className="text-sm text-[var(--muted)]">Avg Likes</p>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-emerald-400 mb-2">
                <Repeat2 className="w-5 h-5" />
                <span className="text-2xl font-bold">{overview.weeklyStats.avgRetweets}</span>
              </div>
              <p className="text-sm text-[var(--muted)]">Avg Retweets</p>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-blue-400 mb-2">
                <MessageSquare className="w-5 h-5" />
                <span className="text-2xl font-bold">{overview.weeklyStats.avgReplies}</span>
              </div>
              <p className="text-sm text-[var(--muted)]">Avg Replies</p>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-[var(--accent)] mb-2">
                <BarChart3 className="w-5 h-5" />
                <span className="text-2xl font-bold">{overview.weeklyStats.totalPosts}</span>
              </div>
              <p className="text-sm text-[var(--muted)]">Posts Analyzed</p>
            </div>
          </div>

          {/* Insights */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[var(--accent)]" />
              Key Insights
            </h3>
            <div className="space-y-4">
              {overview.insights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 bg-[var(--background)] rounded-lg">
                  <div className={`p-2 rounded-lg ${
                    insight.icon === 'trending' ? 'bg-emerald-500/20' :
                    insight.icon === 'calendar' ? 'bg-blue-500/20' :
                    insight.icon === 'heart' ? 'bg-pink-500/20' :
                    'bg-[var(--accent)]/20'
                  }`}>
                    {insight.icon === 'trending' ? <TrendingUp className="w-5 h-5 text-emerald-400" /> :
                     insight.icon === 'calendar' ? <Calendar className="w-5 h-5 text-blue-400" /> :
                     insight.icon === 'heart' ? <Heart className="w-5 h-5 text-pink-400" /> :
                     <Lightbulb className="w-5 h-5 text-[var(--accent)]" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{insight.title}</h4>
                      {insight.metric && (
                        <span className="text-sm text-[var(--accent)] font-medium">{insight.metric}</span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted)] mt-1">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Best Performing */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-blue-400" />
              What Works Best for You
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[var(--background)] rounded-lg p-4">
                <p className="text-sm text-[var(--muted)] mb-1">Content Type</p>
                <p className="font-semibold">{overview.bestPerforming.contentType}</p>
              </div>
              <div className="bg-[var(--background)] rounded-lg p-4">
                <p className="text-sm text-[var(--muted)] mb-1">Top Topic</p>
                <p className="font-semibold">{overview.bestPerforming.topic}</p>
              </div>
              <div className="bg-[var(--background)] rounded-lg p-4">
                <p className="text-sm text-[var(--muted)] mb-1">Best Time</p>
                <p className="font-semibold flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {overview.bestPerforming.postingTime}
                </p>
              </div>
            </div>
          </div>

          {/* Top Post */}
          {overview.weeklyStats.topPost && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Your Top Performing Post
              </h3>
              <div className="bg-[var(--background)] rounded-lg p-4">
                <p className="mb-3">{overview.weeklyStats.topPost.text}</p>
                <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4 text-pink-400" />
                    {overview.weeklyStats.topPost.public_metrics?.like_count?.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Repeat2 className="w-4 h-4 text-emerald-400" />
                    {overview.weeklyStats.topPost.public_metrics?.retweet_count?.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    {overview.weeklyStats.topPost.public_metrics?.reply_count?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="bg-gradient-to-br from-[var(--accent)]/10 to-[var(--accent)]/5 border border-[var(--accent)]/30 rounded-xl p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-[var(--accent)]" />
              Recommendations
            </h3>
            <div className="space-y-3">
              {overview.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-[var(--background)] rounded-lg p-3">
                  <ChevronRight className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

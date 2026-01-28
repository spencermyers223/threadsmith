'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  BarChart3, Eye, Heart, TrendingUp, Plus, ArrowUpRight, ArrowDownRight,
  MessageSquare, Repeat2, Bookmark, Users, ExternalLink
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

interface PostData {
  title?: string
  post_type?: string
  scheduled_date?: string
  scheduled_time?: string
}

interface AnalyticsRecord {
  id: string
  tweet_url: string | null
  tweet_id: string | null
  impressions: number
  likes: number
  replies: number
  retweets: number
  quotes: number
  bookmarks: number
  profile_clicks: number
  followers_gained: number
  recorded_at: string
  created_at: string
  post_id: string | null
  posts: PostData | null
}

interface Props {
  data: AnalyticsRecord[]
}

type SortKey = 'recorded_at' | 'impressions' | 'likes' | 'replies' | 'retweets' | 'engagement'
type SortDir = 'asc' | 'desc'

function engagementRate(r: AnalyticsRecord) {
  if (!r.impressions) return 0
  return ((r.likes + r.replies + r.retweets + r.quotes) / r.impressions) * 100
}

function replyRatio(r: AnalyticsRecord) {
  if (!r.impressions) return 0
  return (r.replies / r.impressions) * 100
}

function viralScore(r: AnalyticsRecord) {
  if (!r.impressions) return 0
  return ((r.retweets * 2 + r.quotes * 3) / r.impressions) * 100
}

export function AnalyticsDashboard({ data }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('recorded_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all')

  const filtered = useMemo(() => {
    if (timeRange === 'all') return data
    const now = Date.now()
    const ms = timeRange === '7d' ? 7 * 86400000 : 30 * 86400000
    return data.filter(r => now - new Date(r.recorded_at).getTime() < ms)
  }, [data, timeRange])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: number, bv: number
      switch (sortKey) {
        case 'impressions': av = a.impressions; bv = b.impressions; break
        case 'likes': av = a.likes; bv = b.likes; break
        case 'replies': av = a.replies; bv = b.replies; break
        case 'retweets': av = a.retweets; bv = b.retweets; break
        case 'engagement': av = engagementRate(a); bv = engagementRate(b); break
        default: av = new Date(a.recorded_at).getTime(); bv = new Date(b.recorded_at).getTime()
      }
      return sortDir === 'desc' ? bv - av : av - bv
    })
  }, [filtered, sortKey, sortDir])

  // Summary stats
  const totalPosts = filtered.length
  const totalImpressions = filtered.reduce((s, r) => s + r.impressions, 0)
  const avgEngagement = totalPosts > 0
    ? filtered.reduce((s, r) => s + engagementRate(r), 0) / totalPosts
    : 0
  const bestPost = filtered.length > 0
    ? filtered.reduce((best, r) => engagementRate(r) > engagementRate(best) ? r : best, filtered[0])
    : null
  const totalFollowers = filtered.reduce((s, r) => s + r.followers_gained, 0)

  // Chart data — engagement over time (chronological)
  const chartData = useMemo(() => {
    return [...filtered]
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .map(r => ({
        date: new Date(r.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        engagement: +engagementRate(r).toFixed(2),
        impressions: r.impressions,
        replies: r.replies,
        label: r.posts?.title || r.tweet_id || 'Post',
      }))
  }, [filtered])

  // Best time heatmap data
  const heatmapData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
    const counts: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))

    filtered.forEach(r => {
      // Use scheduled_date/time from linked post, or recorded_at
      let d: Date
      if (r.posts?.scheduled_date && r.posts?.scheduled_time) {
        d = new Date(`${r.posts.scheduled_date}T${r.posts.scheduled_time}`)
      } else {
        d = new Date(r.recorded_at)
      }
      const day = d.getDay()
      const hour = d.getHours()
      grid[day][hour] += engagementRate(r)
      counts[day][hour] += 1
    })

    const cells: { day: number; hour: number; avg: number }[] = []
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        cells.push({ day: d, hour: h, avg: counts[d][h] > 0 ? grid[d][h] / counts[d][h] : 0 })
      }
    }
    return cells
  }, [filtered])

  const maxHeatVal = Math.max(...heatmapData.map(c => c.avg), 0.01)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Post type breakdown
  const typeBreakdown = useMemo(() => {
    const map: Record<string, { count: number; totalEng: number; totalImp: number }> = {}
    filtered.forEach(r => {
      const t = r.posts?.post_type || 'unknown'
      if (!map[t]) map[t] = { count: 0, totalEng: 0, totalImp: 0 }
      map[t].count++
      map[t].totalEng += r.likes + r.replies + r.retweets + r.quotes
      map[t].totalImp += r.impressions
    })
    return Object.entries(map).map(([type, v]) => ({
      type: type.replace(/_/g, ' '),
      count: v.count,
      avgEngagement: v.totalImp > 0 ? (v.totalEng / v.totalImp) * 100 : 0,
    })).sort((a, b) => b.avgEngagement - a.avgEngagement)
  }, [filtered])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null
    return sortDir === 'desc'
      ? <ArrowDownRight className="w-3 h-3 inline ml-1" />
      : <ArrowUpRight className="w-3 h-3 inline ml-1" />
  }

  if (data.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-[var(--muted)]" />
        <h1 className="text-2xl font-bold mb-2">Post Analytics</h1>
        <p className="text-[var(--muted)] mb-8">
          Track your post performance by manually entering metrics from X.
        </p>
        <Link
          href="/analytics/add"
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-[var(--accent-text)] rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Your First Post
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Post Analytics</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Track and analyze your post performance</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[var(--card)] rounded-lg border border-[var(--border)] overflow-hidden">
            {(['7d', '30d', 'all'] as const).map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  timeRange === r
                    ? 'bg-accent text-[var(--accent-text)]'
                    : 'hover:bg-[var(--card-hover)]'
                }`}
              >
                {r === 'all' ? 'All' : r === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
          <Link
            href="/analytics/add"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-[var(--accent-text)] rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Metrics
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <SummaryCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="Posts Tracked"
          value={totalPosts.toString()}
        />
        <SummaryCard
          icon={<Eye className="w-5 h-5" />}
          label="Total Impressions"
          value={totalImpressions >= 1000 ? `${(totalImpressions / 1000).toFixed(1)}K` : totalImpressions.toString()}
        />
        <SummaryCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Avg Engagement"
          value={`${avgEngagement.toFixed(2)}%`}
        />
        <SummaryCard
          icon={<Heart className="w-5 h-5" />}
          label="Best Post Rate"
          value={bestPost ? `${engagementRate(bestPost).toFixed(2)}%` : '-'}
        />
        <SummaryCard
          icon={<Users className="w-5 h-5" />}
          label="Followers Gained"
          value={`+${totalFollowers}`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Engagement Over Time */}
        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-sm font-semibold mb-4">Engagement Rate Over Time</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`${value}%`, 'Engagement']}
                />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke="#C9B896"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#C9B896' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Content Type Breakdown */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-sm font-semibold mb-4">By Content Type</h2>
          {typeBreakdown.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No data yet</p>
          ) : (
            <div className="space-y-3">
              {typeBreakdown.map(t => (
                <div key={t.type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize">{t.type}</span>
                    <span className="text-[var(--muted)]">{t.count} posts · {t.avgEngagement.toFixed(2)}%</span>
                  </div>
                  <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${Math.min((t.avgEngagement / (typeBreakdown[0]?.avgEngagement || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Best Time Heatmap */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-8">
        <h2 className="text-sm font-semibold mb-4">Best Time to Post</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="flex gap-0.5 mb-1 ml-10">
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="flex-1 text-center text-[10px] text-[var(--muted)]">
                  {i % 3 === 0 ? `${i}` : ''}
                </div>
              ))}
            </div>
            {dayNames.map((day, di) => (
              <div key={day} className="flex items-center gap-0.5 mb-0.5">
                <span className="w-10 text-xs text-[var(--muted)] text-right pr-2">{day}</span>
                {Array.from({ length: 24 }, (_, hi) => {
                  const cell = heatmapData.find(c => c.day === di && c.hour === hi)
                  const intensity = cell ? cell.avg / maxHeatVal : 0
                  return (
                    <div
                      key={hi}
                      className="flex-1 aspect-square rounded-sm transition-colors"
                      style={{
                        backgroundColor: intensity > 0
                          ? `rgba(201, 184, 150, ${0.15 + intensity * 0.85})`
                          : 'var(--background)',
                      }}
                      title={`${day} ${hi}:00 — ${cell?.avg.toFixed(1) || 0}% avg engagement`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-[var(--muted)]">
          <span>Less</span>
          {[0.1, 0.3, 0.5, 0.7, 1].map(v => (
            <div
              key={v}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: `rgba(201, 184, 150, ${0.15 + v * 0.85})` }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold">All Tracked Posts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                <th className="px-6 py-3 font-medium">Post</th>
                <th className="px-3 py-3 font-medium cursor-pointer hover:text-[var(--foreground)]" onClick={() => toggleSort('recorded_at')}>
                  Date <SortIcon k="recorded_at" />
                </th>
                <th className="px-3 py-3 font-medium cursor-pointer hover:text-[var(--foreground)]" onClick={() => toggleSort('impressions')}>
                  <Eye className="w-3.5 h-3.5 inline mr-1" />Imp <SortIcon k="impressions" />
                </th>
                <th className="px-3 py-3 font-medium cursor-pointer hover:text-[var(--foreground)]" onClick={() => toggleSort('likes')}>
                  <Heart className="w-3.5 h-3.5 inline mr-1" />Likes <SortIcon k="likes" />
                </th>
                <th className="px-3 py-3 font-medium cursor-pointer hover:text-[var(--foreground)]" onClick={() => toggleSort('replies')}>
                  <MessageSquare className="w-3.5 h-3.5 inline mr-1" />Replies <SortIcon k="replies" />
                </th>
                <th className="px-3 py-3 font-medium">
                  <Repeat2 className="w-3.5 h-3.5 inline mr-1" />RT
                </th>
                <th className="px-3 py-3 font-medium">
                  <Bookmark className="w-3.5 h-3.5 inline mr-1" />Saves
                </th>
                <th className="px-3 py-3 font-medium cursor-pointer hover:text-[var(--foreground)]" onClick={() => toggleSort('engagement')}>
                  Eng% <SortIcon k="engagement" />
                </th>
                <th className="px-3 py-3 font-medium">Reply%</th>
                <th className="px-3 py-3 font-medium">Viral</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => (
                <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors">
                  <td className="px-6 py-3 max-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {r.posts?.title || r.tweet_id || 'Untitled'}
                      </span>
                      {r.tweet_url && (
                        <a
                          href={r.tweet_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--muted)] hover:text-accent flex-shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    {r.posts?.post_type && (
                      <span className="text-xs text-accent capitalize">{r.posts.post_type.replace(/_/g, ' ')}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[var(--muted)] whitespace-nowrap">
                    {new Date(r.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-3 py-3">{r.impressions.toLocaleString()}</td>
                  <td className="px-3 py-3">{r.likes}</td>
                  <td className="px-3 py-3">{r.replies}</td>
                  <td className="px-3 py-3">{r.retweets}</td>
                  <td className="px-3 py-3">{r.bookmarks}</td>
                  <td className="px-3 py-3 font-medium text-accent">{engagementRate(r).toFixed(2)}%</td>
                  <td className="px-3 py-3">{replyRatio(r).toFixed(3)}%</td>
                  <td className="px-3 py-3">{viralScore(r).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center gap-2 text-[var(--muted)] mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}

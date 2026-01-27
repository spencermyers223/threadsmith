'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
} from 'date-fns'
import { CheckCircle } from 'lucide-react'
import PostTypeIcon, { GenerationType, typeConfig } from './PostTypeIcon'
import type { CalendarFilterState } from './CalendarFilters'
import TagBadge, { Tag } from '@/components/tags/TagBadge'

interface Post {
  id: string
  type: 'tweet' | 'thread' | 'article'
  generation_type?: GenerationType
  title: string
  content: Record<string, unknown>
  status: 'draft' | 'scheduled' | 'posted'
  scheduled_date: string | null
  scheduled_time: string | null
  created_at: string
  tags?: Tag[]
}

interface ContentCalendarProps {
  onSelectPost: (post: Post) => void
  filters?: CalendarFilterState
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getContentPreview(content: Record<string, unknown>, type: string): string {
  try {
    if (typeof content === 'string') return stripHtml(content)
    if (type === 'thread' && Array.isArray(content.tweets)) {
      const tweets = content.tweets as Array<{ id?: string; text?: string; content?: string }>
      const first = tweets[0]
      if (first) {
        const text = first.content || first.text || ''
        return stripHtml(text) + (tweets.length > 1 ? ` ... (+${tweets.length - 1} more)` : '')
      }
    }
    if (content.text) return stripHtml(content.text as string)
    if (content.content) return stripHtml(content.content as string)
    if (content.html) return stripHtml(content.html as string)
    return stripHtml(JSON.stringify(content))
  } catch {
    return 'No preview available'
  }
}

function stripHtml(html: string): string {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 200 ? text.substring(0, 200) + '...' : text
}

// ─── Post Pill with Tooltip ───────────────────────────────────────────────────

function PostPill({
  post,
  onSelect,
  onMarkAsPosted,
}: {
  post: Post
  onSelect: (post: Post) => void
  onMarkAsPosted: (id: string) => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLButtonElement>(null)
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Color by post type (matching the generate page), fall back to neutral gray
  const tc = post.generation_type ? typeConfig[post.generation_type] : null
  const pillColor = tc
    ? `${tc.bgColorSolid} ${tc.textColor} ${tc.borderColor}`
    : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  // Dim posted items slightly
  const postedDim = post.status === 'posted' ? 'opacity-60' : ''

  const showTip = () => {
    if (hideTimeout.current) { clearTimeout(hideTimeout.current); hideTimeout.current = null }
    setShowTooltip(true)
  }

  const hideTip = () => {
    hideTimeout.current = setTimeout(() => setShowTooltip(false), 150)
  }

  const handleMouseEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      const tooltipHeight = 250 // estimated tooltip height
      const spaceBelow = window.innerHeight - r.bottom
      const showAbove = spaceBelow < tooltipHeight && r.top > tooltipHeight
      setPos({
        top: showAbove ? r.top - tooltipHeight - 6 : r.bottom + 6,
        left: Math.min(r.left, window.innerWidth - 300),
      })
    }
    showTip()
  }

  return (
    <>
      <button
        ref={ref}
        onClick={() => onSelect(post)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={hideTip}
        className={`
          w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
          border transition-all duration-150 cursor-pointer
          hover:brightness-125 hover:scale-[1.02]
          ${pillColor} ${postedDim}
        `}
      >
        {post.generation_type && <PostTypeIcon type={post.generation_type} size="sm" />}
        <span className="truncate">{post.title || `Untitled ${post.type}`}</span>
      </button>

      {showTooltip &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed w-72 p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl z-[9999]"
            style={{ top: pos.top, left: pos.left }}
            onMouseEnter={showTip}
            onMouseLeave={hideTip}
          >
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {post.generation_type && <PostTypeIcon type={post.generation_type} size="sm" />}
              <span className="text-xs font-medium text-accent capitalize">{post.type}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  post.status === 'draft'
                    ? 'bg-gray-500/20 text-gray-400'
                    : post.status === 'scheduled'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-green-500/20 text-green-400'
                }`}
              >
                {post.status}
              </span>
            </div>
            <p className="text-sm font-medium text-[var(--foreground)] mb-1">
              {post.title || `Untitled ${post.type}`}
            </p>
            <p className="text-xs text-[var(--muted)] whitespace-pre-wrap">
              {getContentPreview(post.content, post.type)}
            </p>
            {post.scheduled_time && (
              <p className="text-xs text-[var(--muted)] mt-2">Scheduled: {post.scheduled_time}</p>
            )}
            {(post.tags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.tags!.map((tag) => (
                  <TagBadge key={tag.id} tag={tag} size="sm" />
                ))}
              </div>
            )}
            {post.status === 'scheduled' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkAsPosted(post.id)
                  setShowTooltip(false)
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark as Posted
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}

// ─── Month Grid ───────────────────────────────────────────────────────────────

function MonthGrid({
  month,
  postsByDate,
  onSelectPost,
  onMarkAsPosted,
}: {
  month: Date
  postsByDate: Map<string, Post[]>
  onSelectPost: (post: Post) => void
  onMarkAsPosted: (id: string) => void
}) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)

  // Build rows of 7 days
  const weeks: Date[][] = []
  let day = calStart
  while (day <= calEnd) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(day)
      day = addDays(day, 1)
    }
    weeks.push(week)
  }

  return (
    <div className="mb-8">
      {/* Month header */}
      <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3 sticky top-0 bg-[var(--background)] py-2 z-10">
        {format(month, 'MMMM yyyy')}
      </h2>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-[var(--muted)] py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
        {weeks.map((week, wi) => (
          <div
            key={wi}
            className={`grid grid-cols-7 ${wi > 0 ? 'border-t border-[var(--border)]' : ''}`}
          >
            {week.map((d) => {
              const inMonth = isSameMonth(d, month)
              const today = isToday(d)
              const key = format(d, 'yyyy-MM-dd')
              const dayPosts = postsByDate.get(key) || []

              return (
                <div
                  key={key}
                  className={`
                    min-h-[100px] p-1.5 border-r last:border-r-0 border-[var(--border)]
                    transition-colors duration-100
                    ${inMonth ? 'bg-[var(--background)]' : 'bg-[var(--card)]'}
                    ${today ? 'ring-2 ring-inset ring-accent/50' : ''}
                  `}
                >
                  <div
                    className={`
                      text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                      ${today ? 'bg-accent text-white' : inMonth ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}
                    `}
                  >
                    {format(d, 'd')}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {dayPosts.slice(0, 3).map((post) => (
                      <PostPill
                        key={post.id}
                        post={post}
                        onSelect={onSelectPost}
                        onMarkAsPosted={onMarkAsPosted}
                      />
                    ))}
                    {dayPosts.length > 3 && (
                      <span className="text-[10px] text-[var(--muted)] pl-1">
                        +{dayPosts.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Calendar ────────────────────────────────────────────────────────────

export function ContentCalendar({ onSelectPost, filters }: ContentCalendarProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [monthCount, setMonthCount] = useState(3)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const baseDate = useMemo(() => startOfMonth(new Date()), [])

  const months = useMemo(() => {
    const m: Date[] = []
    for (let i = 0; i < monthCount; i++) m.push(addMonths(baseDate, i))
    return m
  }, [baseDate, monthCount])

  const fetchPosts = useCallback(async () => {
    const start = format(subMonths(baseDate, 1), 'yyyy-MM-dd')
    const end = format(endOfMonth(addMonths(baseDate, monthCount + 1)), 'yyyy-MM-dd')
    try {
      const res = await fetch(`/api/posts?startDate=${start}&endDate=${end}`)
      if (res.ok) setPosts(await res.json())
    } catch (e) {
      console.error('Failed to fetch posts:', e)
    }
    setLoading(false)
  }, [baseDate, monthCount])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // Infinite scroll: load more months when sentinel is visible
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setMonthCount((c) => c + 2)
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [loading])

  const handleMarkAsPosted = async (id: string) => {
    const res = await fetch(`/api/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'posted' }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)))
    }
  }

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (!post.scheduled_date) return false
      if (filters?.postTypes?.length) {
        if (!post.generation_type || !filters.postTypes.includes(post.generation_type)) return false
      }
      if (filters?.tagIds?.length) {
        const ids = post.tags?.map((t) => t.id) || []
        if (!ids.length || !filters.tagIds.some((id) => ids.includes(id))) return false
      }
      return true
    })
  }, [posts, filters])

  // Index posts by date
  const postsByDate = useMemo(() => {
    const map = new Map<string, Post[]>()
    for (const p of filteredPosts) {
      const key = p.scheduled_date!
      const arr = map.get(key) || []
      arr.push(p)
      map.set(key, arr)
    }
    return map
  }, [filteredPosts])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto scroll-smooth pr-2">
      {months.map((m) => (
        <MonthGrid
          key={format(m, 'yyyy-MM')}
          month={m}
          postsByDate={postsByDate}
          onSelectPost={onSelectPost}
          onMarkAsPosted={handleMarkAsPosted}
        />
      ))}
      <div ref={sentinelRef} className="h-10" />
    </div>
  )
}

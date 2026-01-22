'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { CheckCircle } from 'lucide-react'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import PostTypeIcon, { GenerationType } from './PostTypeIcon'
import type { CalendarFilterState } from './CalendarFilters'

const locales = { 'en-US': enUS }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

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
  tag_ids?: string[]
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: Post
}

interface ContentCalendarProps {
  onSelectPost: (post: Post) => void
  filters?: CalendarFilterState
}

function getContentPreview(content: Record<string, unknown>, type: string): string {
  try {
    // Handle different content structures
    if (typeof content === 'string') {
      return stripHtml(content)
    }

    // Thread content: array of tweets (new format with id and content)
    if (type === 'thread' && Array.isArray(content.tweets)) {
      const tweets = content.tweets as Array<{ id?: string; text?: string; content?: string }>
      const firstTweet = tweets[0]
      if (firstTweet) {
        // Support both old format (text) and new format (content)
        const text = firstTweet.content || firstTweet.text || ''
        return stripHtml(text) + (tweets.length > 1 ? ` ... (+${tweets.length - 1} more)` : '')
      }
    }

    // Tweet or article: text/content/html field
    if (content.text) return stripHtml(content.text as string)
    if (content.content) return stripHtml(content.content as string)
    if (content.html) return stripHtml(content.html as string)

    // Fallback: stringify and strip
    return stripHtml(JSON.stringify(content))
  } catch {
    return 'No preview available'
  }
}

function stripHtml(html: string): string {
  // Remove HTML tags and decode entities
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

  // Truncate if too long
  return text.length > 200 ? text.substring(0, 200) + '...' : text
}

// Custom Event Component with Tooltip using Portal
function EventWithTooltip({ event, onMarkAsPosted }: { event: CalendarEvent; onMarkAsPosted?: (id: string) => void }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const eventRef = useRef<HTMLDivElement>(null)
  const post = event.resource

  const handleMouseEnter = () => {
    if (eventRef.current) {
      const rect = eventRef.current.getBoundingClientRect()
      // Position tooltip below the event, accounting for scroll
      setTooltipPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      })
    }
    setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    setShowTooltip(false)
  }

  const handleMarkAsPosted = (e: React.MouseEvent) => {
    e.stopPropagation()
    onMarkAsPosted?.(post.id)
    setShowTooltip(false)
  }

  return (
    <div
      ref={eventRef}
      className="h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center gap-1">
        {post.generation_type && (
          <PostTypeIcon type={post.generation_type} size="sm" />
        )}
        <span className="block truncate">{event.title}</span>
      </div>

      {showTooltip && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed w-72 p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            zIndex: 9999,
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {post.generation_type && (
              <PostTypeIcon type={post.generation_type} size="sm" />
            )}
            <span className="text-xs font-medium text-accent capitalize">{post.type}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              post.status === 'draft' ? 'bg-gray-500/20 text-gray-400' :
              post.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
              'bg-green-500/20 text-green-400'
            }`}>
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
            <p className="text-xs text-[var(--muted)] mt-2">
              Scheduled: {post.scheduled_time}
            </p>
          )}
          {post.status === 'scheduled' && (
            <button
              onClick={handleMarkAsPosted}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Mark as Posted
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

export function ContentCalendar({ onSelectPost, filters }: ContentCalendarProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  const fetchPosts = useCallback(async () => {
    const start = format(startOfMonth(subMonths(currentDate, 1)), 'yyyy-MM-dd')
    const end = format(endOfMonth(addMonths(currentDate, 1)), 'yyyy-MM-dd')

    const res = await fetch(`/api/posts?startDate=${start}&endDate=${end}`)
    if (res.ok) {
      const data = await res.json()
      setPosts(data)
    }
    setLoading(false)
  }, [currentDate])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // Apply filters to posts
  const filteredPosts = posts.filter(post => {
    // Must have scheduled date to show on calendar
    if (!post.scheduled_date) return false

    // Filter by generation type
    if (filters?.postTypes && filters.postTypes.length > 0) {
      if (!post.generation_type || !filters.postTypes.includes(post.generation_type)) {
        return false
      }
    }

    // Filter by tags
    if (filters?.tagIds && filters.tagIds.length > 0) {
      if (!post.tag_ids || !filters.tagIds.some(tagId => post.tag_ids?.includes(tagId))) {
        return false
      }
    }

    return true
  })

  const events: CalendarEvent[] = filteredPosts
    .map(post => {
      const dateStr = post.scheduled_date!
      const timeStr = post.scheduled_time || '09:00'
      const start = new Date(`${dateStr}T${timeStr}`)
      const end = new Date(start.getTime() + 30 * 60 * 1000) // 30 min duration

      return {
        id: post.id,
        title: post.title || `Untitled ${post.type}`,
        start,
        end,
        resource: post,
      }
    })

  const eventStyleGetter = (event: CalendarEvent) => {
    const post = event.resource
    let backgroundColor = '#3b82f6' // accent blue

    if (post.status === 'draft') {
      backgroundColor = '#6b7280' // gray
    } else if (post.status === 'posted') {
      backgroundColor = '#10b981' // green
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        fontSize: '12px',
        padding: '2px 4px',
      },
    }
  }

  const handleNavigate = (date: Date) => {
    setCurrentDate(date)
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    onSelectPost(event.resource)
  }

  const handleMarkAsPosted = async (id: string) => {
    const res = await fetch(`/api/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'posted' }),
    })
    if (res.ok) {
      const updatedPost = await res.json()
      setPosts(posts.map(p => p.id === id ? updatedPost : p))
    }
  }

  const components = {
    event: (props: { event: CalendarEvent }) => (
      <EventWithTooltip event={props.event} onMarkAsPosted={handleMarkAsPosted} />
    ),
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full calendar-dark">
      <style jsx global>{`
        .calendar-dark .rbc-calendar {
          background: var(--background);
          color: var(--foreground);
        }
        .calendar-dark .rbc-header {
          background: var(--card);
          border-color: var(--border);
          padding: 8px;
          font-weight: 600;
        }
        .calendar-dark .rbc-month-view,
        .calendar-dark .rbc-time-view {
          border-color: var(--border);
        }
        .calendar-dark .rbc-day-bg {
          border-color: var(--border);
        }
        .calendar-dark .rbc-off-range-bg {
          background: var(--card-hover);
        }
        .calendar-dark .rbc-today {
          background: rgba(26, 26, 26, 0.05);
        }
        .calendar-dark .rbc-date-cell {
          padding: 4px 8px;
        }
        .calendar-dark .rbc-date-cell > a {
          color: var(--foreground);
        }
        .calendar-dark .rbc-off-range a {
          color: var(--muted);
        }
        .calendar-dark .rbc-toolbar {
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .calendar-dark .rbc-toolbar button {
          color: var(--foreground);
          border-color: var(--border);
          background: var(--card);
        }
        .calendar-dark .rbc-toolbar button:hover {
          background: var(--border);
        }
        .calendar-dark .rbc-toolbar button.rbc-active {
          background: var(--accent);
          border-color: var(--accent);
        }
        .calendar-dark .rbc-event {
          cursor: pointer;
          overflow: visible !important;
        }
        .calendar-dark .rbc-event:hover {
          opacity: 1 !important;
        }
        .calendar-dark .rbc-row-segment {
          overflow: visible !important;
        }
        .calendar-dark .rbc-month-row {
          overflow: visible !important;
        }
      `}</style>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        views={[Views.MONTH]}
        defaultView={Views.MONTH}
        date={currentDate}
        onNavigate={handleNavigate}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={handleSelectEvent}
        components={components}
        selectable
        popup
      />
    </div>
  )
}

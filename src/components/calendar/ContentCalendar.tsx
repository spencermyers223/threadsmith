'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

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
  title: string
  content: Record<string, unknown>
  status: 'draft' | 'scheduled' | 'posted'
  scheduled_date: string | null
  scheduled_time: string | null
  created_at: string
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
}

export function ContentCalendar({ onSelectPost }: ContentCalendarProps) {
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

  const events: CalendarEvent[] = posts
    .filter(p => p.scheduled_date)
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
        }
        .calendar-dark .rbc-event:hover {
          opacity: 1 !important;
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
        selectable
        popup
      />
    </div>
  )
}

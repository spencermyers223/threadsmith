'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ContentCalendar } from '@/components/calendar/ContentCalendar'
import { ContentList } from '@/components/calendar/ContentList'
import { Calendar, List, Plus } from 'lucide-react'
import Link from 'next/link'

type ViewMode = 'calendar' | 'list'

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

export default function CalendarPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')

  const handleSelectPost = (post: Post) => {
    // Store post data for editing
    localStorage.setItem('edit-post', JSON.stringify(post))
    router.push('/workspace')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Content Calendar</h1>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-[var(--card)] rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-accent text-white'
                  : 'hover:bg-[var(--border)]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-accent text-white'
                  : 'hover:bg-[var(--border)]'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
          </div>

          <Link
            href="/workspace"
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Post
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        {viewMode === 'calendar' ? (
          <ContentCalendar onSelectPost={handleSelectPost} />
        ) : (
          <ContentList onSelectPost={handleSelectPost} />
        )}
      </div>
    </div>
  )
}

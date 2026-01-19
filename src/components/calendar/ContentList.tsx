'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { FileText, MessageSquare, Newspaper, Trash2, Edit, Calendar as CalendarIcon, Clock, CheckCircle } from 'lucide-react'

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

interface ContentListProps {
  onSelectPost: (post: Post) => void
}

type FilterStatus = 'all' | 'draft' | 'scheduled' | 'posted'

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
  return text.length > 300 ? text.substring(0, 300) + '...' : text
}

export function ContentList({ onSelectPost }: ContentListProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    const url = filter === 'all' ? '/api/posts' : `/api/posts?status=${filter}`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      // Sort posts: scheduled posts by date (earliest first), then drafts by created_at
      const sorted = data.sort((a: Post, b: Post) => {
        // If both have scheduled dates, sort by date ascending (earlier first)
        if (a.scheduled_date && b.scheduled_date) {
          const dateA = new Date(a.scheduled_date + (a.scheduled_time ? `T${a.scheduled_time}` : ''))
          const dateB = new Date(b.scheduled_date + (b.scheduled_time ? `T${b.scheduled_time}` : ''))
          return dateA.getTime() - dateB.getTime()
        }
        // Scheduled posts come before drafts
        if (a.scheduled_date && !b.scheduled_date) return -1
        if (!a.scheduled_date && b.scheduled_date) return 1
        // Both are drafts, sort by created_at descending (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      setPosts(sorted)
    }
    setLoading(false)
  }, [filter])

  useEffect(() => {
    setLoading(true)
    fetchPosts()
  }, [fetchPosts])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this post?')) return

    await fetch(`/api/posts/${id}`, { method: 'DELETE' })
    setPosts(posts.filter(p => p.id !== id))
  }

  const handleMarkAsPosted = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tweet':
        return <MessageSquare className="w-4 h-4" />
      case 'thread':
        return <FileText className="w-4 h-4" />
      case 'article':
        return <Newspaper className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-500/20 text-gray-400',
      scheduled: 'bg-blue-500/20 text-blue-400',
      posted: 'bg-green-500/20 text-green-400',
    }

    return (
      <span className={`px-2 py-0.5 text-xs rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[var(--border)]">
        <span className="text-sm text-[var(--muted)]">Filter:</span>
        {(['all', 'draft', 'scheduled', 'posted'] as FilterStatus[]).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filter === status
                ? 'bg-accent text-white'
                : 'bg-[var(--card)] hover:bg-[var(--border)]'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {posts.length === 0 ? (
          <div className="text-center py-12 text-[var(--muted)]">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No posts found</p>
            <p className="text-sm mt-1">Create content in the workspace to see it here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map(post => (
              <div
                key={post.id}
                onClick={() => onSelectPost(post)}
                onMouseEnter={() => setHoveredPostId(post.id)}
                onMouseLeave={() => setHoveredPostId(null)}
                className="relative p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-accent/50 cursor-pointer transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[var(--muted)]">{getTypeIcon(post.type)}</span>
                      <h3 className="font-medium truncate">
                        {post.title || `Untitled ${post.type}`}
                      </h3>
                      {getStatusBadge(post.status)}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                      {post.scheduled_date && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {format(new Date(post.scheduled_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {post.scheduled_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {post.scheduled_time}
                        </span>
                      )}
                      <span>
                        Created {format(new Date(post.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {post.status === 'scheduled' && (
                      <button
                        onClick={(e) => handleMarkAsPosted(post.id, e)}
                        className="p-2 rounded hover:bg-green-500/20 text-[var(--muted)] hover:text-green-400 transition-colors"
                        title="Mark as Posted"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectPost(post)
                      }}
                      className="p-2 rounded hover:bg-[var(--border)] text-[var(--muted)] hover:text-accent transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(post.id, e)}
                      className="p-2 rounded hover:bg-red-500/20 text-[var(--muted)] hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Content Preview Tooltip */}
                {hoveredPostId === post.id && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg max-w-lg">
                    <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">
                      {getContentPreview(post.content, post.type)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

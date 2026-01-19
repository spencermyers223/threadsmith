'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { TiptapEditor } from '@/components/workspace/TiptapEditor'
import { ThreadEditor } from '@/components/workspace/ThreadEditor'
import { TweetPreview } from '@/components/preview/TweetPreview'
import { ThreadPreview, parseThreadFromContent } from '@/components/preview/ThreadPreview'
import type { ThreadTweet } from '@/components/preview/ThreadPreview'
import { ArticlePreview } from '@/components/preview/ArticlePreview'
import { ScheduleModal } from '@/components/workspace/ScheduleModal'
import { DraftsSidebar } from '@/components/workspace/DraftsSidebar'
import { Save, Calendar, ArrowLeft, Check, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { markdownToHtml } from '@/lib/markdown'

type ContentType = 'tweet' | 'thread' | 'article'

interface Draft {
  id: string
  title: string
  type: ContentType
  content: { html?: string; tweets?: ThreadTweet[] }
  status: string
  updated_at: string
}

export default function WorkspacePage() {
  // Content state
  const [content, setContent] = useState('')
  const [threadTweets, setThreadTweets] = useState<ThreadTweet[]>([{ id: '1', content: '' }])
  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState<ContentType>('tweet')

  // UI state
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [postId, setPostId] = useState<string | null>(null)
  const [draftsRefreshTrigger, setDraftsRefreshTrigger] = useState(0)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const lastSavedContent = useRef<string>('')
  const lastSavedTweets = useRef<ThreadTweet[]>([])
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)

  // Load content from localStorage
  useEffect(() => {
    // Check for post to edit (from calendar/list)
    const editPost = localStorage.getItem('edit-post')
    if (editPost) {
      try {
        const post = JSON.parse(editPost)
        setPostId(post.id)
        setTitle(post.title || '')
        setContentType(post.type || 'tweet')

        if (post.type === 'thread' && post.content?.tweets) {
          setThreadTweets(post.content.tweets)
        } else if (post.type === 'thread' && post.content?.html) {
          // Legacy: parse from HTML
          setThreadTweets(parseThreadFromContent(post.content.html))
        } else {
          setContent(post.content?.html || '')
        }

        localStorage.removeItem('edit-post')
        return
      } catch {}
    }

    // Check for content from chat "Copy to Workspace"
    const stored = localStorage.getItem('workspace-content')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        // Only load if recent (within 5 minutes)
        if (Date.now() - data.timestamp < 5 * 60 * 1000) {
          const htmlContent = markdownToHtml(data.content)
          const type = data.contentType || 'tweet'
          setContentType(type)

          if (type === 'thread') {
            setThreadTweets(parseThreadFromContent(htmlContent))
          } else {
            setContent(htmlContent)
          }
        }
        localStorage.removeItem('workspace-content')
      } catch {}
    }
  }, [])

  // Get current content based on mode
  const getCurrentContent = useCallback(() => {
    if (contentType === 'thread') {
      return { tweets: threadTweets }
    }
    return { html: content }
  }, [contentType, content, threadTweets])

  // Check if content is empty
  const isContentEmpty = useCallback(() => {
    if (contentType === 'thread') {
      return threadTweets.every(t => !t.content.trim())
    }
    return !content.trim()
  }, [contentType, content, threadTweets])

  const handleSaveDraft = useCallback(async (isAutoSave = false) => {
    if (isAutoSave && isContentEmpty()) {
      return
    }

    // Check if content has changed
    if (isAutoSave) {
      if (contentType === 'thread') {
        const currentJson = JSON.stringify(threadTweets)
        const savedJson = JSON.stringify(lastSavedTweets.current)
        if (currentJson === savedJson) return
      } else {
        if (content === lastSavedContent.current) return
      }
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: postId,
          type: contentType,
          title: title || `Untitled ${contentType}`,
          content: getCurrentContent(),
          status: 'draft',
        }),
      })

      if (!res.ok) throw new Error('Failed to save')

      const data = await res.json()
      setPostId(data.id)

      if (contentType === 'thread') {
        lastSavedTweets.current = [...threadTweets]
      } else {
        lastSavedContent.current = content
      }

      setHasUnsavedChanges(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)

      // Refresh drafts sidebar
      setDraftsRefreshTrigger(prev => prev + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [content, contentType, postId, title, threadTweets, getCurrentContent, isContentEmpty])

  // Track content changes
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
    if (newContent !== lastSavedContent.current) {
      setHasUnsavedChanges(true)
    }
  }, [])

  const handleThreadChange = useCallback((newTweets: ThreadTweet[]) => {
    setThreadTweets(newTweets)
    const currentJson = JSON.stringify(newTweets)
    const savedJson = JSON.stringify(lastSavedTweets.current)
    if (currentJson !== savedJson) {
      setHasUnsavedChanges(true)
    }
  }, [])

  // Auto-save every 30 seconds if there are changes
  useEffect(() => {
    if (hasUnsavedChanges && !isContentEmpty()) {
      autoSaveTimer.current = setTimeout(() => {
        handleSaveDraft(true)
      }, 30000)
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current)
      }
    }
  }, [hasUnsavedChanges, handleSaveDraft, isContentEmpty])

  // Handle selecting a draft from sidebar
  const handleSelectDraft = useCallback((draft: Draft) => {
    setPostId(draft.id)
    setTitle(draft.title || '')
    setContentType(draft.type)

    if (draft.type === 'thread' && draft.content?.tweets) {
      setThreadTweets(draft.content.tweets)
      lastSavedTweets.current = draft.content.tweets
    } else if (draft.type === 'thread' && draft.content?.html) {
      const tweets = parseThreadFromContent(draft.content.html)
      setThreadTweets(tweets)
      lastSavedTweets.current = tweets
    } else {
      setContent(draft.content?.html || '')
      lastSavedContent.current = draft.content?.html || ''
    }

    setHasUnsavedChanges(false)
  }, [])

  // Handle creating a new draft
  const handleNewDraft = useCallback(() => {
    setPostId(null)
    setTitle('')
    setContent('')
    setThreadTweets([{ id: '1', content: '' }])
    setContentType('tweet')
    lastSavedContent.current = ''
    lastSavedTweets.current = []
    setHasUnsavedChanges(false)
  }, [])

  // Handle content type change
  const handleContentTypeChange = useCallback((type: ContentType) => {
    if (type === contentType) return

    // Convert content when switching modes
    if (type === 'thread' && contentType !== 'thread') {
      // Convert current content to thread
      if (content.trim()) {
        setThreadTweets(parseThreadFromContent(content))
      } else {
        setThreadTweets([{ id: '1', content: '' }])
      }
    } else if (type !== 'thread' && contentType === 'thread') {
      // Convert thread to single content
      const combinedContent = threadTweets
        .map((t, i) => `${i + 1}/ ${t.content}`)
        .join('\n\n')
      setContent(combinedContent)
    }

    setContentType(type)
    setHasUnsavedChanges(true)
  }, [contentType, content, threadTweets])

  const handleSchedule = async (date: string, time: string | null) => {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: postId,
          type: contentType,
          title: title || `Untitled ${contentType}`,
          content: getCurrentContent(),
          status: 'scheduled',
          scheduled_date: date,
          scheduled_time: time,
        }),
      })

      if (!res.ok) throw new Error('Failed to schedule')

      const data = await res.json()
      setPostId(data.id)
      setShowScheduleModal(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule')
    } finally {
      setSaving(false)
    }
  }

  // Thread preview handlers
  const handleAddTweet = useCallback(() => {
    const newId = String(Date.now())
    setThreadTweets(prev => [...prev, { id: newId, content: '' }])
    setHasUnsavedChanges(true)
  }, [])

  const handleDeleteTweet = useCallback((id: string) => {
    if (threadTweets.length <= 1) return
    setThreadTweets(prev => prev.filter(t => t.id !== id))
    setHasUnsavedChanges(true)
  }, [threadTweets.length])

  const renderEditor = () => {
    if (contentType === 'thread') {
      return (
        <ThreadEditor
          tweets={threadTweets}
          onTweetsChange={handleThreadChange}
        />
      )
    }

    return <TiptapEditor content={content} onChange={handleContentChange} />
  }

  const renderPreview = () => {
    switch (contentType) {
      case 'tweet':
        return <TweetPreview content={content} />
      case 'thread':
        return (
          <ThreadPreview
            tweets={threadTweets}
            onAddTweet={handleAddTweet}
            onDeleteTweet={handleDeleteTweet}
          />
        )
      case 'article':
        return <ArticlePreview content={content} headline={title} />
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-md hover:bg-[var(--card)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={contentType === 'article' ? 'Article headline...' : 'Untitled post...'}
            className="bg-transparent border-none text-lg font-medium focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Content Type Selector */}
          <div className="flex gap-1 mr-4">
            {(['tweet', 'thread', 'article'] as ContentType[]).map(type => (
              <button
                key={type}
                onClick={() => handleContentTypeChange(type)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  contentType === type
                    ? 'bg-accent text-white'
                    : 'bg-[var(--card)] hover:bg-[var(--border)]'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleSaveDraft(false)}
            disabled={saving || isContentEmpty()}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--card)] hover:bg-[var(--border)] disabled:opacity-50 rounded-lg transition-colors"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {hasUnsavedChanges && <span className="w-2 h-2 bg-sand rounded-full" />}
                Save Draft
              </>
            )}
          </button>

          <button
            onClick={() => setShowScheduleModal(true)}
            disabled={saving || isContentEmpty()}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Schedule
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mt-4 flex items-center gap-2 text-red-400 text-sm p-3 bg-red-400/10 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Drafts Sidebar */}
        <DraftsSidebar
          currentDraftId={postId}
          onSelectDraft={handleSelectDraft}
          onNewDraft={handleNewDraft}
          refreshTrigger={draftsRefreshTrigger}
        />

        {/* Editor */}
        <div className="flex-1 p-4 overflow-y-auto">
          {renderEditor()}
        </div>

        {/* Preview */}
        <div className="w-[400px] border-l border-[var(--border)] p-4 overflow-y-auto bg-[var(--background)]">
          <h3 className="font-semibold mb-4 text-sm text-[var(--muted)] uppercase tracking-wider">
            Preview
          </h3>
          {renderPreview()}
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          onClose={() => setShowScheduleModal(false)}
          onSchedule={handleSchedule}
        />
      )}
    </div>
  )
}

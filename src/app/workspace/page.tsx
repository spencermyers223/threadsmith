'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { TiptapEditor } from '@/components/workspace/TiptapEditor'
import { TweetPreview } from '@/components/preview/TweetPreview'
import { ThreadPreview } from '@/components/preview/ThreadPreview'
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
  content: { html: string }
  status: string
  updated_at: string
}

export default function WorkspacePage() {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState<ContentType>('tweet')
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [postId, setPostId] = useState<string | null>(null)
  const [draftsRefreshTrigger, setDraftsRefreshTrigger] = useState(0)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const lastSavedContent = useRef<string>('')
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
        setContent(post.content?.html || '')
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
          // Convert markdown to HTML for Tiptap editor
          const htmlContent = markdownToHtml(data.content)
          setContent(htmlContent)
          setContentType(data.contentType || 'tweet')
        }
        localStorage.removeItem('workspace-content')
      } catch {}
    }
  }, [])

  const handleSaveDraft = useCallback(async (isAutoSave = false) => {
    // Don't auto-save if no content or content hasn't changed
    if (isAutoSave && (!content.trim() || content === lastSavedContent.current)) {
      return
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
          content: { html: content },
          status: 'draft',
        }),
      })

      if (!res.ok) throw new Error('Failed to save')

      const data = await res.json()
      setPostId(data.id)
      lastSavedContent.current = content
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
  }, [content, contentType, postId, title])

  // Track content changes
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
    if (newContent !== lastSavedContent.current) {
      setHasUnsavedChanges(true)
    }
  }, [])

  // Auto-save every 30 seconds if there are changes
  useEffect(() => {
    if (hasUnsavedChanges && content.trim()) {
      autoSaveTimer.current = setTimeout(() => {
        handleSaveDraft(true)
      }, 30000)
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current)
      }
    }
  }, [hasUnsavedChanges, content, handleSaveDraft])

  // Handle selecting a draft from sidebar
  const handleSelectDraft = useCallback((draft: Draft) => {
    setPostId(draft.id)
    setTitle(draft.title || '')
    setContentType(draft.type)
    setContent(draft.content?.html || '')
    lastSavedContent.current = draft.content?.html || ''
    setHasUnsavedChanges(false)
  }, [])

  // Handle creating a new draft
  const handleNewDraft = useCallback(() => {
    setPostId(null)
    setTitle('')
    setContent('')
    setContentType('tweet')
    lastSavedContent.current = ''
    setHasUnsavedChanges(false)
  }, [])

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
          content: { html: content },
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

  const renderPreview = () => {
    switch (contentType) {
      case 'tweet':
        return <TweetPreview content={content} />
      case 'thread':
        return <ThreadPreview content={content} />
      case 'article':
        return <ArticlePreview content={content} />
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
            placeholder="Untitled post..."
            className="bg-transparent border-none text-lg font-medium focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Content Type Selector */}
          <div className="flex gap-1 mr-4">
            {(['tweet', 'thread', 'article'] as ContentType[]).map(type => (
              <button
                key={type}
                onClick={() => setContentType(type)}
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
            disabled={saving || !content.trim()}
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
                {hasUnsavedChanges && <span className="w-2 h-2 bg-yellow-400 rounded-full" />}
                Save Draft
              </>
            )}
          </button>

          <button
            onClick={() => setShowScheduleModal(true)}
            disabled={saving || !content.trim()}
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
          <TiptapEditor content={content} onChange={handleContentChange} />
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

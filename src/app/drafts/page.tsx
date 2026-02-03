'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { TiptapEditor } from '@/components/drafts/TiptapEditor'
import { ThreadEditor } from '@/components/drafts/ThreadEditor'
import { TweetPreview } from '@/components/preview/TweetPreview'
import { ThreadPreview, parseThreadFromContent } from '@/components/preview/ThreadPreview'
import type { ThreadTweet } from '@/components/preview/ThreadPreview'
import { ArticlePreview } from '@/components/preview/ArticlePreview'
import { ScheduleModal } from '@/components/drafts/ScheduleModal'
import { DraftsSidebar } from '@/components/drafts/DraftsSidebar'
import { Save, Calendar, ArrowLeft, Check, AlertCircle, Tag, Image as ImageIcon, Send } from 'lucide-react'
import PostTypeIcon from '@/components/calendar/PostTypeIcon'
import Link from 'next/link'
import { markdownToHtml } from '@/lib/markdown'
import { getPostTweetText } from '@/lib/twitter'
import { postTweet, postThread, openXIntent, openTweet } from '@/lib/x-posting'
import TagSelector from '@/components/tags/TagSelector'
import TagBadge, { Tag as TagType } from '@/components/tags/TagBadge'
import { MediaUpload, type MediaItem } from '@/components/drafts/MediaUpload'
import { EngagementPanel } from '@/components/drafts/EngagementPanel'
import EditingTools from '@/components/editing/EditingTools'
import { useXAccount } from '@/contexts/XAccountContext'

type ContentType = 'tweet' | 'thread' | 'article'
import type { GenerationType } from '@/components/calendar/PostTypeIcon'

interface Draft {
  id: string
  title: string
  type: ContentType
  content: { html?: string; tweets?: ThreadTweet[] }
  status: string
  updated_at: string
  generation_type?: GenerationType
  tags?: TagType[]
  media?: MediaItem[]
}

export default function WorkspacePage() {
  const { activeAccount } = useXAccount()
  
  // Content state
  const [content, setContent] = useState('')
  const [threadTweets, setThreadTweets] = useState<ThreadTweet[]>([{ id: '1', content: '' }])
  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState<ContentType>('tweet')
  const [generationType, setGenerationType] = useState<GenerationType | null>(null)

  // UI state
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [posted, setPosted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [postId, setPostId] = useState<string | null>(null)
  const [draftsRefreshTrigger, setDraftsRefreshTrigger] = useState(0)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Tags state
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [tags, setTags] = useState<TagType[]>([])
  const [showTagSelector, setShowTagSelector] = useState(false)

  // Media state
  const [media, setMedia] = useState<MediaItem[]>([])

  const lastSavedContent = useRef<string>('')
  const lastSavedTweets = useRef<ThreadTweet[]>([])
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)

  // Fetch tags for a post
  const fetchPostTags = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/posts/${id}/tags`)
      if (res.ok) {
        const data = await res.json()
        setTags(data.tags || [])
        setSelectedTagIds(data.tags?.map((t: TagType) => t.id) || [])
      }
    } catch {
      console.error('Failed to fetch post tags')
    }
  }, [])

  // Fetch all available tags to display selected ones
  const [allTags, setAllTags] = useState<TagType[]>([])

  useEffect(() => {
    const fetchAllTags = async () => {
      try {
        const res = await fetch('/api/tags')
        if (res.ok) {
          const data = await res.json()
          setAllTags(data.tags || [])
        }
      } catch {
        console.error('Failed to fetch all tags')
      }
    }
    fetchAllTags()
  }, [])

  // Update displayed tags when selectedTagIds changes
  useEffect(() => {
    if (allTags.length > 0) {
      const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id))
      setTags(selectedTags)
    }
  }, [selectedTagIds, allTags])

  // Load content from localStorage
  useEffect(() => {
    // Check for post to edit (from calendar/list or generate page)
    const editPost = localStorage.getItem('edit-post')
    if (editPost) {
      try {
        const post = JSON.parse(editPost)
        setPostId(post.id)
        setTitle(post.title || '')
        setContentType(post.type || 'tweet')
        setGenerationType(post.generation_type || null)

        if (post.type === 'thread' && post.content?.tweets) {
          setThreadTweets(post.content.tweets)
        } else if (post.type === 'thread' && post.content?.html) {
          // Legacy: parse from HTML
          setThreadTweets(parseThreadFromContent(post.content.html))
        } else {
          setContent(post.content?.html || '')
        }

        // Load media from post
        if (post.media && Array.isArray(post.media)) {
          setMedia(post.media)
        }

        // Fetch tags for this post
        if (post.id) {
          fetchPostTags(post.id)
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
  }, [fetchPostTags])

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
          generation_type: generationType || 'user_generated',
          tagIds: selectedTagIds,
          x_account_id: activeAccount?.id,
        }),
      })

      if (!res.ok) throw new Error('Failed to save')

      const data = await res.json()
      setPostId(data.id)

      // Update tags from response
      if (data.tags) {
        setTags(data.tags)
      }

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
  }, [content, contentType, generationType, postId, title, threadTweets, getCurrentContent, isContentEmpty, selectedTagIds, activeAccount?.id])

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
    setGenerationType(draft.generation_type || null)

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

    // Load media
    setMedia(Array.isArray(draft.media) ? draft.media : [])

    // Fetch tags for this draft
    fetchPostTags(draft.id)

    setHasUnsavedChanges(false)
  }, [fetchPostTags])

  // Handle creating a new draft
  const handleNewDraft = useCallback(() => {
    setPostId(null)
    setTitle('')
    setContent('')
    setThreadTweets([{ id: '1', content: '' }])
    setContentType('tweet')
    setGenerationType(null)
    setSelectedTagIds([])
    setTags([])
    setMedia([])
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
          generation_type: generationType || 'user_generated',
          tagIds: selectedTagIds,
          x_account_id: activeAccount?.id,
        }),
      })

      if (!res.ok) throw new Error('Failed to schedule')

      await res.json()
      setShowScheduleModal(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)

      // Clear editor — the post is now on the calendar, not a draft
      setPostId(null)
      setTitle('')
      setContent('')
      setThreadTweets([{ id: '1', content: '' }])
      setContentType('tweet')
      setGenerationType(null)
      setSelectedTagIds([])
      setTags([])
      setMedia([])
      lastSavedContent.current = ''
      lastSavedTweets.current = []
      setHasUnsavedChanges(false)

      // Refresh drafts sidebar to remove the scheduled post
      setDraftsRefreshTrigger(prev => prev + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule')
    } finally {
      setSaving(false)
    }
  }

  const handlePostNow = async () => {
    setSaving(true)
    setError(null)

    // Extract tweet text BEFORE clearing state
    const currentContent = getCurrentContent()
    let tweetText = ''
    if (contentType === 'thread' && 'tweets' in currentContent && Array.isArray(currentContent.tweets)) {
      // For threads, use the first tweet's content
      const firstTweet = currentContent.tweets[0]
      if (firstTweet) {
        tweetText = getPostTweetText(firstTweet.content || '')
      }
    } else if ('html' in currentContent) {
      tweetText = getPostTweetText(currentContent.html || '')
    }

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: postId,
          type: contentType,
          title: title || `Untitled ${contentType}`,
          content: currentContent,
          status: 'posted',
          generation_type: generationType || 'user_generated',
          tagIds: selectedTagIds,
          x_account_id: activeAccount?.id,
        }),
      })

      if (!res.ok) throw new Error('Failed to post')

      // Post to X via API or fallback to intent
      if (tweetText) {
        if (contentType === 'thread' && 'tweets' in currentContent && Array.isArray(currentContent.tweets)) {
          // Post thread
          const tweets = currentContent.tweets.map((t: { content?: string }) => getPostTweetText(t.content || ''))
          const result = await postThread(tweets)
          if (result.success && result.first_tweet_id) {
            openTweet(result.first_tweet_id)
          } else {
            openXIntent(tweetText) // Fallback
          }
        } else {
          // Post single tweet
          const result = await postTweet(tweetText)
          if (result.success && result.tweet_id) {
            openTweet(result.tweet_id)
          } else {
            openXIntent(tweetText) // Fallback
          }
        }
      }

      setPosted(true)
      setTimeout(() => setPosted(false), 2000)

      // Clear editor
      setPostId(null)
      setTitle('')
      setContent('')
      setThreadTweets([{ id: '1', content: '' }])
      setContentType('tweet')
      setGenerationType(null)
      setSelectedTagIds([])
      setTags([])
      setMedia([])
      lastSavedContent.current = ''
      lastSavedTweets.current = []
      setHasUnsavedChanges(false)

      setDraftsRefreshTrigger(prev => prev + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post')
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

  // Save draft and return postId (for media upload when no postId yet)
  const handleSaveAndGetId = useCallback(async (): Promise<string | null> => {
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
          generation_type: generationType,
          tagIds: selectedTagIds,
          x_account_id: activeAccount?.id,
        }),
      })
      if (!res.ok) return null
      const data = await res.json()
      setPostId(data.id)
      lastSavedContent.current = content
      lastSavedTweets.current = [...threadTweets]
      setHasUnsavedChanges(false)
      setDraftsRefreshTrigger(prev => prev + 1)
      return data.id
    } catch {
      return null
    } finally {
      setSaving(false)
    }
  }, [content, contentType, generationType, postId, title, threadTweets, getCurrentContent, selectedTagIds, activeAccount?.id])

  const renderEditor = () => {
    if (contentType === 'thread') {
      return (
        <ThreadEditor
          tweets={threadTweets}
          onTweetsChange={handleThreadChange}
          postId={postId}
          onSaveFirst={handleSaveAndGetId}
        />
      )
    }

    return <TiptapEditor content={content} onChange={handleContentChange} />
  }

  // Plain text for engagement scoring - properly converts HTML to plain text with line breaks
  const getPlainText = useCallback(() => {
    if (contentType === 'thread') {
      return threadTweets.map(t => t.content).join('\n\n')
    }
    // Convert HTML to plain text, preserving line breaks
    return content
      .replace(/<\/p>\s*<p>/gi, '\n\n')  // Paragraph breaks → double newline
      .replace(/<br\s*\/?>/gi, '\n')      // <br> → single newline
      .replace(/<\/p>/gi, '\n')           // Closing </p> → newline
      .replace(/<p>/gi, '')               // Opening <p> → nothing
      .replace(/<[^>]*>/g, '')            // Strip remaining HTML tags
      .trim()
  }, [contentType, content, threadTweets])

  const handleInsertText = useCallback((text: string) => {
    if (contentType === 'thread') {
      // Append to last tweet
      const updated = [...threadTweets]
      const last = updated[updated.length - 1]
      if (last) {
        updated[updated.length - 1] = { ...last, content: last.content + text }
        setThreadTweets(updated)
        setHasUnsavedChanges(true)
      }
    } else {
      setContent(prev => prev + text)
      setHasUnsavedChanges(true)
    }
  }, [contentType, threadTweets])

  const renderPreview = () => {
    switch (contentType) {
      case 'tweet':
        return <TweetPreview content={content} media={media} />
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
            href="/creator-hub"
            className="p-2 rounded-md hover:bg-[var(--card)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {generationType && (
            <PostTypeIcon type={generationType} size="md" />
          )}

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

          <button
            onClick={handlePostNow}
            disabled={saving || isContentEmpty()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {posted ? (
              <>
                <Check className="w-4 h-4" />
                Posted!
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Post Now
              </>
            )}
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

          {/* Editing Tools */}
          <div className="mt-4">
            <EditingTools
              content={getPlainText()}
              onContentChange={(newContent) => {
                if (contentType === 'thread') {
                  // For threads, parse the returned content back into individual tweets
                  // The AI returns numbered format (1/, 2/, etc.) which parseThreadFromContent handles
                  const parsedTweets = parseThreadFromContent(newContent)
                  setThreadTweets(parsedTweets)
                } else {
                  // Convert plain text line breaks to HTML paragraphs
                  // EditingTools returns plain text with \n, but workspace uses HTML
                  const htmlContent = newContent
                    .split(/\n\n+/)  // Split on double newlines (paragraphs)
                    .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)  // Single newlines become <br>
                    .join('')
                  setContent(htmlContent)
                }
                setHasUnsavedChanges(true)
              }}
              isThread={contentType === 'thread'}
              hideScore={true} // Engagement panel already visible in Workspace sidebar
            />
          </div>

          {/* Tags Section */}
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </h4>
              <button
                onClick={() => setShowTagSelector(!showTagSelector)}
                className="text-sm text-accent hover:text-accent-hover transition-colors"
              >
                {showTagSelector ? 'Done' : 'Edit Tags'}
              </button>
            </div>

            {/* Display current tags */}
            {tags.length > 0 && !showTagSelector && (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <TagBadge key={tag.id} tag={tag} size="sm" />
                ))}
              </div>
            )}

            {tags.length === 0 && !showTagSelector && (
              <p className="text-sm text-[var(--muted)]">No tags added yet</p>
            )}

            {/* Tag Selector */}
            {showTagSelector && (
              <div className="mt-2">
                <TagSelector
                  selectedTagIds={selectedTagIds}
                  onChange={(ids) => {
                    setSelectedTagIds(ids)
                    setHasUnsavedChanges(true)
                  }}
                />
              </div>
            )}
          </div>

          {/* Media Section */}
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <h4 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wider flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4" />
              Media
            </h4>
            <MediaUpload
              postId={postId}
              media={media}
              onMediaChange={setMedia}
              onSaveFirst={handleSaveAndGetId}
            />
          </div>
        </div>

        {/* Preview + Engagement */}
        <div className="w-[400px] border-l border-[var(--border)] overflow-y-auto bg-[var(--background)] flex flex-col">
          <div className="p-4 flex-1">
            <h3 className="font-semibold mb-4 text-sm text-[var(--muted)] uppercase tracking-wider">
              Preview
            </h3>
            {renderPreview()}
          </div>
          <EngagementPanel
            text={getPlainText()}
            postType={contentType}
            onInsertText={handleInsertText}
          />
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

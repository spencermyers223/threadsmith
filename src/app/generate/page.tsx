'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles,
  FileText,
  Zap,
  MessageSquare,
  Share2,
  Loader2,
  X,
  Send,
  Calendar,
  Tag,
  Check,
  AlertCircle,
  PenLine,
  Crown,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FilesSidebar, FileRecord } from '@/components/generate/FilesSidebar'
import { GenerationCounter } from '@/components/subscription/GenerationCounter'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import TagSelector from '@/components/tags/TagSelector'
import TagBadge, { Tag as TagType } from '@/components/tags/TagBadge'
import { postTweet, postThread, openXIntent, openTweet } from '@/lib/x-posting'

// Types
type Length = 'punchy' | 'standard' | 'developed' | 'thread'
type Tone = 'casual' | 'educational' | 'hot_take' | 'professional'
type PostType = 'scroll_stopper' | 'debate_starter' | 'viral_catalyst' | 'all'

interface GeneratedPost {
  content: string
  archetype: 'scroll_stopper' | 'debate_starter' | 'viral_catalyst'
  characterCount: number
  savedPostId?: string
  tags?: TagType[]
}

// Archetype styling
const archetypeStyles = {
  scroll_stopper: {
    label: 'Scroll Stopper',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: Zap,
  },
  debate_starter: {
    label: 'Debate Starter',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: MessageSquare,
  },
  viral_catalyst: {
    label: 'Viral Catalyst',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: Share2,
  },
}

// Toggle Button Group Component
function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; description?: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--foreground-muted)]">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              value === option.value
                ? 'bg-accent text-[var(--accent-text)]'
                : 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--muted)]'
            }`}
            title={option.description}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Toast Component
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed bottom-4 right-4 bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3 shadow-float flex items-center gap-3 animate-fade-in-up z-50">
      <AlertCircle className="w-5 h-5 text-[var(--accent)]" />
      <span>{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-[var(--border)] rounded">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Post Card Component
function PostCard({
  post,
  onPostNow,
  onAddToCalendar,
  onAddTags,
  onEditInWorkspace,
  isEditingInWorkspace,
}: {
  post: GeneratedPost
  onPostNow: () => void
  onAddToCalendar: () => void
  onAddTags: () => void
  onEditInWorkspace: () => void
  isEditingInWorkspace: boolean
}) {
  const style = archetypeStyles[post.archetype]
  const Icon = style.icon
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(post.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col animate-fade-in-up">
      {/* Header with archetype badge */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${style.color}`}>
            <Icon className="w-3.5 h-3.5" />
            {style.label}
          </div>
        </div>
        {/* Display tags if any */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map(tag => (
              <TagBadge key={tag.id} tag={tag} size="sm" />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1">
        <div className="relative">
          <p className="text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
            {post.content}
          </p>
          <button
            onClick={handleCopy}
            className="absolute top-0 right-0 p-2 rounded-lg hover:bg-[var(--border)] transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-[var(--success)]" />
            ) : (
              <FileText className="w-4 h-4 text-[var(--muted)]" />
            )}
          </button>
        </div>
      </div>

      {/* Footer with character count and actions */}
      <div className="p-4 border-t border-[var(--border)] space-y-3">
        {/* Character count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">Character count</span>
          <span className={`font-mono ${
            post.characterCount > 280
              ? 'text-red-400'
              : post.characterCount > 250
                ? 'text-amber-400'
                : 'text-[var(--success)]'
          }`}>
            {post.characterCount}/280
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onPostNow}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover text-[var(--accent-text)] rounded-lg font-medium transition-colors text-sm"
          >
            <Send className="w-4 h-4" />
            Post Now
          </button>
          <button
            onClick={onEditInWorkspace}
            disabled={isEditingInWorkspace}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 disabled:opacity-50 rounded-lg transition-colors text-sm"
            title="Edit in Workspace"
          >
            {isEditingInWorkspace ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PenLine className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onAddToCalendar}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg transition-colors text-sm"
            title="Add to Calendar"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <button
            onClick={onAddTags}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg transition-colors text-sm"
            title="Add Tags"
          >
            <Tag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Storage key for persisting state
const GENERATE_STATE_KEY = 'generate-page-state'

interface PersistedState {
  topic: string
  length: Length
  tone: Tone
  postType: PostType
  posts: GeneratedPost[]
  timestamp: number
}

// Main Page Component
export default function GeneratePage() {
  const router = useRouter()

  // Form state
  const [topic, setTopic] = useState('')
  const [length, setLength] = useState<Length>('standard')
  const [tone, setTone] = useState<Tone>('casual')
  const [postType, setPostType] = useState<PostType>('all')
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null)

  // Sidebar state
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<GeneratedPost[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [editingPostIndex, setEditingPostIndex] = useState<number | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [hasLoadedState, setHasLoadedState] = useState(false)

  // Tag modal state
  const [tagModalIndex, setTagModalIndex] = useState<number | null>(null)
  const [tagModalSelectedIds, setTagModalSelectedIds] = useState<string[]>([])
  const [savingTags, setSavingTags] = useState(false)

  // Load persisted state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(GENERATE_STATE_KEY)
      if (saved) {
        const state: PersistedState = JSON.parse(saved)
        // Only restore if less than 24 hours old
        if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
          setTopic(state.topic || '')
          setLength(state.length || 'standard')
          setTone(state.tone || 'casual')
          setPostType(state.postType || 'all')
          setPosts(state.posts || [])
        }
      }
    } catch {
      // Ignore parse errors
    }
    setHasLoadedState(true)
  }, [])

  // Persist state when it changes
  useEffect(() => {
    if (!hasLoadedState) return // Don't save until we've loaded

    const state: PersistedState = {
      topic,
      length,
      tone,
      postType,
      posts,
      timestamp: Date.now(),
    }
    localStorage.setItem(GENERATE_STATE_KEY, JSON.stringify(state))
  }, [topic, length, tone, postType, posts, hasLoadedState])

  // Clear persisted posts (called when generating new ones)
  const clearPersistedPosts = () => {
    setPosts([])
  }

  const handleGenerate = async () => {
    if (!topic.trim()) return

    setIsLoading(true)
    setError(null)
    setPosts([])

    try {
      // Check if user can generate before making the request
      const usageRes = await fetch('/api/subscription/usage')
      if (usageRes.ok) {
        const usageData = await usageRes.json()
        if (!usageData.canGenerate) {
          setIsLoading(false)
          setShowUpgradeModal(true)
          return
        }
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          length,
          tone,
          postType,
          sourceFileId: selectedFile?.id || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const data = await res.json()
      setPosts(data.posts)

      // Refresh the generation counter
      const refreshFn = (window as unknown as { refreshGenerationCounter?: () => void }).refreshGenerationCounter
      if (refreshFn) {
        refreshFn()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (file: FileRecord | null) => {
    setSelectedFile(file)
  }

  const handlePostNow = async (content: string, isThread: boolean = false) => {
    try {
      if (isThread) {
        const tweets = content.split('\n\n').filter(t => t.trim())
        const result = await postThread(tweets)
        
        if (result.success && result.first_tweet_id) {
          setToast('Thread posted to X! 🎉')
          openTweet(result.first_tweet_id)
        } else {
          openXIntent(tweets[0]) // Fallback
        }
      } else {
        const result = await postTweet(content)
        
        if (result.success && result.tweet_id) {
          setToast('Posted to X! 🎉')
          openTweet(result.tweet_id)
        } else {
          openXIntent(content) // Fallback
        }
      }
    } catch {
      openXIntent(content) // Fallback on any error
    }
  }

  const handleAddToCalendar = () => {
    setToast('Coming soon: Add to Calendar')
  }

  const handleAddTags = async (post: GeneratedPost, index: number) => {
    // If post not saved yet, save it first
    let savedPostId = post.savedPostId
    if (!savedPostId) {
      try {
        const contentType = length === 'thread' ? 'thread' : 'tweet'
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: contentType,
            title: topic.slice(0, 50) || 'Generated post',
            content: contentType === 'thread'
              ? { tweets: post.content.split('\n\n').filter(t => t.trim()).map((text, i) => ({ id: String(i + 1), content: text })) }
              : { html: `<p>${post.content.replace(/\n/g, '</p><p>')}</p>` },
            status: 'draft',
            generation_type: post.archetype,
          }),
        })

        if (!res.ok) throw new Error('Failed to save post')
        const savedPost = await res.json()
        savedPostId = savedPost.id

        // Update the post in state with the saved ID
        setPosts(prev => prev.map((p, i) => i === index ? { ...p, savedPostId } : p))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save post')
        return
      }
    }

    // Open tag modal with current tags
    setTagModalIndex(index)
    setTagModalSelectedIds(post.tags?.map(t => t.id) || [])
  }

  const handleSaveTags = async () => {
    if (tagModalIndex === null) return

    const post = posts[tagModalIndex]
    if (!post.savedPostId) return

    setSavingTags(true)
    try {
      // Get current tags for this post
      const currentTagIds = post.tags?.map(t => t.id) || []

      // Find tags to add and remove
      const tagsToAdd = tagModalSelectedIds.filter(id => !currentTagIds.includes(id))
      const tagsToRemove = currentTagIds.filter(id => !tagModalSelectedIds.includes(id))

      // Add new tags
      for (const tagId of tagsToAdd) {
        await fetch(`/api/posts/${post.savedPostId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagId }),
        })
      }

      // Remove tags
      for (const tagId of tagsToRemove) {
        await fetch(`/api/posts/${post.savedPostId}/tags?tagId=${tagId}`, {
          method: 'DELETE',
        })
      }

      // Fetch updated tags for display
      const tagsRes = await fetch(`/api/posts/${post.savedPostId}/tags`)
      const tagsData = await tagsRes.json()
      const updatedTags = tagsData.tags || []

      // Update post in state
      setPosts(prev => prev.map((p, i) =>
        i === tagModalIndex ? { ...p, tags: updatedTags } : p
      ))

      setTagModalIndex(null)
      setToast('Tags updated!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tags')
    } finally {
      setSavingTags(false)
    }
  }

  const handleEditInWorkspace = async (post: GeneratedPost, index: number) => {
    setEditingPostIndex(index)

    try {
      // Determine content type based on length
      const contentType = length === 'thread' ? 'thread' : 'tweet'

      // Save as draft to database
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: contentType,
          title: topic.slice(0, 50) || 'Generated post',
          content: contentType === 'thread'
            ? { tweets: post.content.split('\n\n').filter(t => t.trim()).map((text, i) => ({ id: String(i + 1), content: text })) }
            : { html: `<p>${post.content.replace(/\n/g, '</p><p>')}</p>` },
          status: 'draft',
          generation_type: post.archetype,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save draft')
      }

      const savedPost = await res.json()

      // Store in localStorage for workspace to pick up
      localStorage.setItem('edit-post', JSON.stringify({
        id: savedPost.id,
        title: savedPost.title,
        type: savedPost.type,
        content: savedPost.content,
      }))

      // Navigate to workspace
      router.push('/workspace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open in workspace')
      setEditingPostIndex(null)
    }
  }

  const clearFileSelection = () => {
    setSelectedFile(null)
  }

  return (
    <div className="min-h-full bg-[var(--background)] flex">
      {/* Collapsible Files Sidebar */}
      <FilesSidebar
        isExpanded={sidebarExpanded}
        onToggleExpanded={() => setSidebarExpanded(!sidebarExpanded)}
        selectedFileId={selectedFile?.id || null}
        onSelectFile={handleFileSelect}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <GenerationCounter />
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-[var(--accent-text)] rounded-lg font-medium text-sm transition-colors"
              >
                <Crown className="w-4 h-4" />
                Upgrade to Pro
              </button>
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Generate Posts</h1>
              <p className="text-[var(--muted)]">
                Create algorithm-optimized content in seconds
              </p>
            </div>
          </div>

          {/* Main Input Section */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6">
            {/* Topic Input */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[var(--foreground-muted)]">
                  Topic
                </label>
                <span className={`text-xs font-mono ${
                  topic.length > 280 ? 'text-red-400' : 'text-[var(--muted)]'
                }`}>
                  {topic.length}/280
                </span>
              </div>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value.slice(0, 280))}
                placeholder="What do you want to post about?"
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-accent input-glow resize-none"
                rows={3}
              />
            </div>

            {/* File Source Display */}
            <div className="mb-6">
              {selectedFile ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-lg">
                  <FileText className="w-4 h-4 text-accent" />
                  <span className="flex-1 truncate text-sm">
                    <span className="text-[var(--muted)]">Using: </span>
                    <span className="text-accent font-medium">{selectedFile.name}</span>
                  </span>
                  <button
                    onClick={() => setSidebarExpanded(true)}
                    className="px-2 py-1 text-xs bg-[var(--card)] hover:bg-[var(--border)] rounded transition-colors"
                  >
                    Change
                  </button>
                  <button
                    onClick={clearFileSelection}
                    className="p-1 hover:bg-[var(--border)] rounded text-[var(--muted)] hover:text-red-400"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSidebarExpanded(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg hover:border-[var(--muted)] transition-colors text-sm text-[var(--muted)] w-full"
                >
                  <FileText className="w-4 h-4" />
                  Or generate from your files
                  <span className="ml-auto text-xs bg-[var(--card)] px-2 py-0.5 rounded">Browse</span>
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="space-y-6">
              <ToggleGroup
                label="Length"
                value={length}
                onChange={setLength}
                options={[
                  { value: 'punchy', label: 'Punchy', description: 'Under 140 characters' },
                  { value: 'standard', label: 'Standard', description: '140-200 characters' },
                  { value: 'developed', label: 'Developed', description: '200-280 characters' },
                  { value: 'thread', label: 'Thread', description: 'Multi-tweet thread' },
                ]}
              />

              <ToggleGroup
                label="Tone"
                value={tone}
                onChange={setTone}
                options={[
                  { value: 'casual', label: 'Casual', description: 'Friendly and conversational' },
                  { value: 'educational', label: 'Educational', description: 'Informative and teaching' },
                  { value: 'hot_take', label: 'Hot Take', description: 'Bold and provocative' },
                  { value: 'professional', label: 'Professional', description: 'Polished and authoritative' },
                ]}
              />

              <ToggleGroup
                label="Post Type"
                value={postType}
                onChange={setPostType}
                options={[
                  { value: 'scroll_stopper', label: 'Scroll Stopper', description: 'Pattern-interrupt hooks' },
                  { value: 'debate_starter', label: 'Debate Starter', description: 'Reply-generating takes' },
                  { value: 'viral_catalyst', label: 'Viral Catalyst', description: 'Shareable insights' },
                  { value: 'all', label: 'Generate All', description: 'One of each type' },
                ]}
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!topic.trim() || isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-[var(--accent-text)] rounded-xl font-semibold text-lg transition-colors mb-8"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Posts
              </>
            )}
          </button>

          {/* Error Display */}
          {error && (
            <div className="mb-8 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Generated Posts */}
          {posts.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Generated Posts</h2>
                <button
                  onClick={clearPersistedPosts}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map((post, index) => (
                  <PostCard
                    key={index}
                    post={post}
                    onPostNow={() => handlePostNow(post.content)}
                    onAddToCalendar={handleAddToCalendar}
                    onAddTags={() => handleAddTags(post, index)}
                    onEditInWorkspace={() => handleEditInWorkspace(post, index)}
                    isEditingInWorkspace={editingPostIndex === index}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />

      {/* Tag Selector Modal */}
      {tagModalIndex !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Tags</h3>
              <button
                onClick={() => setTagModalIndex(null)}
                className="p-2 hover:bg-[var(--border)] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <TagSelector
              selectedTagIds={tagModalSelectedIds}
              onChange={setTagModalSelectedIds}
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setTagModalIndex(null)}
                className="flex-1 px-4 py-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTags}
                disabled={savingTags}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-[var(--accent-text)] rounded-lg transition-colors disabled:opacity-50"
              >
                {savingTags ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Tags'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

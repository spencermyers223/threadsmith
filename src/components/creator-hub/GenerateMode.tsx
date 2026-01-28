'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles, FileText, Loader2, X, Send, Calendar, PenLine, Check,
  Copy, RefreshCw, TrendingUp, Flame, Zap, BarChart2, Layers, Rocket,
  Crown, AlertCircle, ChevronLeft, ChevronRight, MessageCircle, Repeat2, Heart
} from 'lucide-react'
import { EditingTools } from '@/components/editing'
import { GenerationCounter } from '@/components/subscription/GenerationCounter'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import type { FileRecord } from '@/components/generate/FilesSidebar'

// Post types for content generation
const POST_TYPES = [
  {
    id: 'alpha_thread',
    label: 'Insight Thread',
    description: 'Share exclusive insights and research',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  {
    id: 'market_take',
    label: 'Industry Take',
    description: 'Your analysis on trends and news',
    icon: BarChart2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'hot_take',
    label: 'Hot Take',
    description: 'Contrarian or provocative opinions',
    icon: Flame,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  {
    id: 'on_chain_insight',
    label: 'Data Insight',
    description: 'Data-driven observations and analysis',
    icon: Zap,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 'protocol_breakdown',
    label: 'Technical Deep Dive',
    description: 'Educational breakdown of complex topics',
    icon: Layers,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'build_in_public',
    label: 'Build in Public',
    description: 'Share your building journey',
    icon: Rocket,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
  },
]

// Length options
const LENGTHS = [
  { id: 'punchy', label: 'Punchy', description: 'Under 140 chars' },
  { id: 'standard', label: 'Standard', description: '140-200 chars' },
  { id: 'developed', label: 'Developed', description: '200-280 chars' },
  { id: 'thread', label: 'Thread', description: '5-15 tweets' },
]

interface GeneratedPost {
  content: string
  characterCount: number
  index: number
}

interface GenerateModeProps {
  selectedFile: FileRecord | null
  onOpenSidebar: () => void
  onClearFile: () => void
}

export default function GenerateMode({ selectedFile, onOpenSidebar, onClearFile }: GenerateModeProps) {
  const router = useRouter()

  // Form state
  const [topic, setTopic] = useState('')
  const [selectedPostType, setSelectedPostType] = useState<string>('market_take')
  const [selectedLength, setSelectedLength] = useState<string>('standard')

  // UI state
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<GeneratedPost[]>([])
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [currentThreadIndex, setCurrentThreadIndex] = useState(0)
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null)

  // Check for template data from /templates page
  useEffect(() => {
    const raw = sessionStorage.getItem('xthread-template-data')
    if (raw) {
      try {
        const data = JSON.parse(raw)
        if (data.topic) setTopic(data.topic)
      } catch {}
      sessionStorage.removeItem('xthread-template-data')
    }
  }, [])

  const selectedPostTypeData = POST_TYPES.find(pt => pt.id === selectedPostType)

  // Helper function to parse thread content into individual tweets
  const parseThreadContent = (content: string): { number: string; text: string; charCount: number }[] => {
    const tweets: { number: string; text: string; charCount: number }[] = []

    // Try multiple patterns for numbered tweets:
    // Pattern 1: "1/" or "1/6" at start of line (Claude's thread format)
    // Pattern 2: "1." at start of line
    // Pattern 3: Double newline separation (fallback)

    // First, try to match "N/" or "N/M" patterns (e.g., "1/", "2/", "1/6", "2/6")
    // Split by the numbered pattern, keeping the delimiter
    const numberedPattern = /^(\d+\/\d*)\s*/gm
    const matches = Array.from(content.matchAll(numberedPattern))

    if (matches.length > 0) {
      // Extract tweets based on position of each number marker
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i]
        const startPos = match.index! + match[0].length
        const endPos = matches[i + 1]?.index ?? content.length

        const tweetText = content.slice(startPos, endPos).trim()
        // Clean up the tweet text - remove trailing metadata lines
        const cleanText = tweetText
          .replace(/\n\*[A-Z][\s\S]*$/, '') // Remove metadata at end
          .replace(/\n---[\s\S]*$/, '') // Remove separators
          .replace(/\[\d+\s*chars?\]/gi, '') // Remove [149 chars] metadata
          .replace(/^\*Character count:.*$/gm, '') // Remove character count lines
          .trim()

        if (cleanText) {
          const num = match[1].includes('/') && !match[1].endsWith('/')
            ? match[1] // Already has total like "1/6"
            : `${match[1]}${matches.length}` // Add total like "1/" -> "1/6"

          tweets.push({
            number: num,
            text: cleanText,
            charCount: cleanText.length
          })
        }
      }
    }

    // If no numbered pattern found, try splitting by double newlines
    if (tweets.length === 0) {
      const fallbackTweets = content.split('\n\n').filter(t => t.trim())
      return fallbackTweets.map((text, index) => ({
        number: `${index + 1}/${fallbackTweets.length}`,
        text: text.trim(),
        charCount: text.trim().length
      }))
    }

    return tweets
  }

  // Thread types that should use carousel display
  const isThreadType = selectedPostType === 'alpha_thread' || selectedPostType === 'protocol_breakdown'

  // Check subscription status on mount
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const res = await fetch('/api/subscription/usage')
        if (res.ok) {
          const data = await res.json()
          setIsSubscribed(data.isSubscribed)
        }
      } catch (err) {
        console.error('Failed to check subscription:', err)
      }
    }
    checkSubscription()
  }, [])

  // Reset carousel index when posts change or post type changes
  useEffect(() => {
    setCurrentThreadIndex(0)
  }, [selectedPostType])

  // Auto-select Thread length for thread-based post types
  useEffect(() => {
    if (selectedPostType === 'alpha_thread' || selectedPostType === 'protocol_breakdown') {
      setSelectedLength('thread')
    }
  }, [selectedPostType])

  const handleGenerate = async () => {
    if (!topic.trim()) return

    setIsGenerating(true)
    setError(null)
    setPosts([])

    try {
      // Check usage first
      const usageRes = await fetch('/api/subscription/usage')
      if (usageRes.ok) {
        const usageData = await usageRes.json()
        if (!usageData.canGenerate) {
          setIsGenerating(false)
          setShowUpgradeModal(true)
          return
        }
      }

      // Pass the CT-native post type directly to the API
      // The API now supports both legacy archetypes and CT-native post types
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          length: selectedLength,
          tone: 'casual',
          postType: selectedPostType, // Pass the actual post type (e.g., 'build_in_public', 'market_take', etc.)
          sourceFileId: selectedFile?.id || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const data = await res.json()
      const generatedPosts: GeneratedPost[] = data.posts.map((post: { content: string; characterCount: number }, index: number) => ({
        content: post.content,
        characterCount: post.characterCount,
        index,
      }))
      setPosts(generatedPosts)

      // Refresh generation counter
      const refreshFn = (window as unknown as { refreshGenerationCounter?: () => void }).refreshGenerationCounter
      if (refreshFn) refreshFn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handlePostNow = (content: string) => {
    const url = `https://x.com/intent/post?text=${encodeURIComponent(content)}`
    window.open(url, '_blank')
  }

  const handleEditInWorkspace = async (post: GeneratedPost) => {
    setSavingIndex(post.index)

    try {
      const contentType = selectedLength === 'thread' ? 'thread' : 'tweet'

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: contentType,
          title: topic.slice(0, 50) || 'Generated post',
          content: contentType === 'thread'
            ? { tweets: parseThreadContent(post.content).map((t) => ({ id: t.number, content: t.text })) }
            : { html: `<p>${post.content.replace(/\n/g, '</p><p>')}</p>` },
          status: 'draft',
          post_type: selectedPostType,
          generation_type: selectedPostType,
        }),
      })

      if (!res.ok) throw new Error('Failed to save draft')

      const savedPost = await res.json()
      localStorage.setItem('edit-post', JSON.stringify({
        id: savedPost.id,
        title: savedPost.title,
        type: savedPost.type,
        content: savedPost.content,
      }))

      router.push('/workspace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingIndex(null)
    }
  }

  const handleAddToCalendar = async (post: GeneratedPost) => {
    setSavingIndex(post.index)

    try {
      const contentType = selectedLength === 'thread' ? 'thread' : 'tweet'

      // Get tomorrow's date
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: contentType,
          title: topic.slice(0, 50) || 'Generated post',
          content: contentType === 'thread'
            ? { tweets: parseThreadContent(post.content).map((t) => ({ id: t.number, content: t.text })) }
            : { html: `<p>${post.content.replace(/\n/g, '</p><p>')}</p>` },
          status: 'scheduled',
          scheduled_date: tomorrow.toISOString().split('T')[0],
          post_type: selectedPostType,
          generation_type: selectedPostType,
        }),
      })

      if (!res.ok) throw new Error('Failed to schedule')

      router.push('/calendar')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule')
    } finally {
      setSavingIndex(null)
    }
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with Generation Counter */}
        <div className="flex items-center justify-between mb-6">
          <GenerationCounter />
          {isSubscribed === false && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-[var(--background)] rounded-lg font-medium text-sm transition-colors"
            >
              <Crown size={16} />
              Upgrade to Pro
            </button>
          )}
        </div>

        {/* Main Content Card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6">
          {/* Topic Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              What do you want to post about?
            </label>
            <div className="relative">
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value.slice(0, 500))}
                placeholder="Enter your topic, idea, or paste notes..."
                rows={3}
                className="
                  w-full px-4 py-3 rounded-xl resize-none
                  bg-[var(--background)] border border-[var(--border)]
                  text-[var(--foreground)] placeholder-[var(--muted)]
                  focus:outline-none focus:border-[var(--accent)]
                  transition-colors
                "
              />
              <span className="absolute bottom-3 right-3 text-xs text-[var(--muted)]">
                {topic.length}/500
              </span>
            </div>
          </div>

          {/* Source File */}
          <div className="mb-6">
            {selectedFile ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30">
                <FileText size={16} className="text-[var(--accent)]" />
                <span className="flex-1 truncate text-sm">
                  <span className="text-[var(--muted)]">Using: </span>
                  <span className="text-[var(--accent)] font-medium">{selectedFile.name}</span>
                </span>
                <button
                  onClick={onOpenSidebar}
                  className="px-2 py-1 text-xs bg-[var(--card)] hover:bg-[var(--border)] rounded transition-colors"
                >
                  Change
                </button>
                <button
                  onClick={onClearFile}
                  className="p-1 hover:bg-[var(--border)] rounded text-[var(--muted)] hover:text-red-400"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenSidebar}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[var(--border)] hover:border-[var(--muted)] transition-colors text-sm text-[var(--muted)]"
              >
                <FileText size={16} />
                Use a file as source material
              </button>
            )}
          </div>

          {/* Post Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
              Post Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {POST_TYPES.map((type) => {
                const Icon = type.icon
                const isSelected = selectedPostType === type.id
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedPostType(type.id)}
                    className={`
                      flex flex-col items-start gap-2 p-4 rounded-xl text-left transition-all
                      ${isSelected
                        ? `${type.bgColor} border-2 ${type.borderColor}`
                        : 'bg-[var(--background)] border-2 border-[var(--border)] hover:border-[var(--muted)]'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={18} className={isSelected ? type.color : 'text-[var(--muted)]'} />
                      <span className={`text-sm font-medium ${isSelected ? type.color : ''}`}>
                        {type.label}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] line-clamp-2">
                      {type.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Length Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
              Length
            </label>
            <div className="flex flex-wrap gap-2">
              {LENGTHS.map((length) => {
                const isSelected = selectedLength === length.id
                return (
                  <button
                    key={length.id}
                    onClick={() => setSelectedLength(length.id)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${isSelected
                        ? 'bg-[var(--accent)] text-[var(--background)]'
                        : 'bg-[var(--background)] border border-[var(--border)] hover:border-[var(--muted)]'
                      }
                    `}
                    title={length.description}
                  >
                    {length.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!topic.trim() || isGenerating}
          className="
            w-full flex items-center justify-center gap-3 px-6 py-4
            bg-[var(--accent)] hover:opacity-90
            disabled:opacity-50 disabled:cursor-not-allowed
            text-[var(--background)] rounded-xl font-semibold text-lg
            transition-opacity mb-8
          "
        >
          {isGenerating ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Generate 3 Options
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="mb-8 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            <AlertCircle size={20} className="flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Generated Posts */}
        {posts.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Options</h2>
              <button
                onClick={() => {
                  setPosts([])
                  setCurrentThreadIndex(0)
                  handleGenerate()
                }}
                className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <RefreshCw size={14} />
                Regenerate
              </button>
            </div>

            {/* Thread Types: Carousel View */}
            {isThreadType ? (
              <div className="space-y-4">
                {/* Carousel Navigation */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setCurrentThreadIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentThreadIndex === 0}
                    className="p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--border)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium">
                    Option {currentThreadIndex + 1} of {posts.length}
                  </span>
                  <button
                    onClick={() => setCurrentThreadIndex(prev => Math.min(posts.length - 1, prev + 1))}
                    disabled={currentThreadIndex === posts.length - 1}
                    className="p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--border)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                {/* Single Thread Display */}
                {posts[currentThreadIndex] && (() => {
                  const parsedTweets = parseThreadContent(posts[currentThreadIndex].content)
                  return (
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                      {/* Header */}
                      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                        <div className={`
                          inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                          ${selectedPostTypeData?.bgColor} ${selectedPostTypeData?.borderColor} border
                          ${selectedPostTypeData?.color}
                        `}>
                          {selectedPostTypeData?.icon && <selectedPostTypeData.icon size={14} />}
                          {selectedPostTypeData?.label}
                        </div>
                        <span className="text-sm text-[var(--muted)]">
                          Thread ({parsedTweets.length} tweets)
                        </span>
                      </div>

                      {/* Content - Thread Preview with X/Twitter-style Tweet Cards */}
                      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto bg-[var(--background)]/50">
                        {parsedTweets.map((tweet, tweetIndex) => (
                          <div
                            key={tweetIndex}
                            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                          >
                            {/* Tweet Header - X/Twitter style */}
                            <div className="flex items-start gap-3">
                              {/* Profile Picture Placeholder */}
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]/60 flex items-center justify-center flex-shrink-0">
                                <span className="text-[var(--background)] font-bold text-sm">
                                  {tweet.number.split('/')[0]}
                                </span>
                              </div>

                              {/* Tweet Body */}
                              <div className="flex-1 min-w-0">
                                {/* Author line - preview placeholder */}
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-[var(--muted)] text-sm italic">Preview</span>
                                  <span className="text-[var(--muted)]/60 text-xs">·</span>
                                  <span className="px-1.5 py-0.5 bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-medium rounded">
                                    Tweet {tweet.number}
                                  </span>
                                </div>

                                {/* Tweet Content */}
                                <div className="text-[var(--foreground)] text-[15px] leading-[1.4] whitespace-pre-wrap">
                                  {tweet.text.split('\n').map((line, lineIndex) => (
                                    <div key={lineIndex} className={lineIndex > 0 ? 'mt-1' : ''}>
                                      {line}
                                    </div>
                                  ))}
                                </div>

                                {/* Tweet Footer - engagement icons placeholder + char count */}
                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border)]/50">
                                  <div className="flex items-center gap-6 text-[var(--muted)]" aria-hidden="true">
                                    <span className="text-xs flex items-center gap-1">
                                      <MessageCircle size={14} />
                                    </span>
                                    <span className="text-xs flex items-center gap-1">
                                      <Repeat2 size={14} />
                                    </span>
                                    <span className="text-xs flex items-center gap-1">
                                      <Heart size={14} />
                                    </span>
                                  </div>
                                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                                    tweet.charCount > 280
                                      ? 'bg-red-500/10 text-red-400'
                                      : tweet.charCount > 250
                                        ? 'bg-amber-500/10 text-amber-400'
                                        : 'bg-emerald-500/10 text-emerald-400'
                                  }`}>
                                    {tweet.charCount}/280
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="p-4 border-t border-[var(--border)] space-y-3">
                        {/* Editing Tools */}
                        <EditingTools
                          content={posts[currentThreadIndex].content}
                          onContentChange={(newContent) => {
                            setPosts(prev => prev.map((p, i) =>
                              i === currentThreadIndex
                                ? { ...p, content: newContent, characterCount: newContent.length }
                                : p
                            ))
                          }}
                          isThread={true}
                        />

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopy(posts[currentThreadIndex].content, currentThreadIndex)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg font-medium text-sm transition-colors"
                          >
                            {copiedIndex === currentThreadIndex ? (
                              <Check size={14} className="text-emerald-400" />
                            ) : (
                              <Copy size={14} />
                            )}
                            Copy Thread
                          </button>
                          <button
                            onClick={() => handleEditInWorkspace(posts[currentThreadIndex])}
                            disabled={savingIndex === currentThreadIndex}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                          >
                            {savingIndex === currentThreadIndex ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <PenLine size={14} />
                            )}
                            Edit in Workspace
                          </button>
                          <button
                            onClick={() => handleAddToCalendar(posts[currentThreadIndex])}
                            disabled={savingIndex === currentThreadIndex}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--accent)] hover:opacity-90 text-[var(--background)] rounded-lg font-medium text-sm transition-opacity disabled:opacity-50"
                          >
                            <Calendar size={14} />
                            Schedule
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Thumbnail Navigation */}
                <div className="flex justify-center gap-2">
                  {posts.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentThreadIndex(index)}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        index === currentThreadIndex
                          ? 'bg-[var(--accent)]'
                          : 'bg-[var(--border)] hover:bg-[var(--muted)]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* Single Tweet Types: Grid View */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {posts.map((post) => {
                  const Icon = selectedPostTypeData?.icon || Sparkles
                  return (
                    <div
                      key={post.index}
                      className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col"
                    >
                      {/* Header */}
                      <div className="p-4 border-b border-[var(--border)]">
                        <div className={`
                          inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                          ${selectedPostTypeData?.bgColor} ${selectedPostTypeData?.borderColor} border
                          ${selectedPostTypeData?.color}
                        `}>
                          <Icon size={14} />
                          Option {post.index + 1}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 flex-1">
                        <p className="text-[var(--foreground)] whitespace-pre-wrap leading-relaxed text-sm">
                          {post.content}
                        </p>
                      </div>

                      {/* Footer */}
                      <div className="p-4 border-t border-[var(--border)] space-y-3">
                        {/* Character count */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[var(--muted)]">Characters</span>
                          <span className={`font-mono ${
                            post.characterCount > 280
                              ? 'text-red-400'
                              : post.characterCount > 250
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                          }`}>
                            {post.characterCount}/280
                          </span>
                        </div>

                        {/* Editing Tools */}
                        <EditingTools
                          content={post.content}
                          onContentChange={(newContent) => {
                            setPosts(prev => prev.map((p, i) =>
                              i === post.index
                                ? { ...p, content: newContent, characterCount: newContent.length }
                                : p
                            ))
                          }}
                          isThread={selectedLength === 'thread'}
                        />

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePostNow(post.content)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--accent)] hover:opacity-90 text-[var(--background)] rounded-lg font-medium text-sm transition-opacity"
                          >
                            <Send size={14} />
                            Post
                          </button>
                          <button
                            onClick={() => handleCopy(post.content, post.index)}
                            className="p-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg transition-colors"
                            title="Copy"
                          >
                            {copiedIndex === post.index ? (
                              <Check size={14} className="text-emerald-400" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => handleEditInWorkspace(post)}
                            disabled={savingIndex === post.index}
                            className="p-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg transition-colors disabled:opacity-50"
                            title="Edit in Workspace"
                          >
                            {savingIndex === post.index ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <PenLine size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => handleAddToCalendar(post)}
                            disabled={savingIndex === post.index}
                            className="p-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg transition-colors disabled:opacity-50"
                            title="Add to Calendar"
                          >
                            <Calendar size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  )
}

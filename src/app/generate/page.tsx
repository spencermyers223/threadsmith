'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Sparkles,
  FileText,
  MessageSquare,
  Loader2,
  X,
  Send,
  Calendar,
  Tag,
  Check,
  AlertCircle,
  PenLine,
  Crown,
  Bookmark,
  RefreshCw,
  Heart,
  Repeat2,
  ExternalLink,
  Search,
  TrendingUp,
  Flame,
  Rocket,
  Target,
  ArrowRight,
  AlignLeft,
  List,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FilesSidebar, FileRecord } from '@/components/generate/FilesSidebar'
import { GenerationCounter } from '@/components/subscription/GenerationCounter'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import TagSelector from '@/components/tags/TagSelector'
import TagBadge, { Tag as TagType } from '@/components/tags/TagBadge'
import EditingTools from '@/components/editing/EditingTools'
import { postTweet, postThread, openXIntent, openTweet } from '@/lib/x-posting'
import { useXAccount } from '@/contexts/XAccountContext'

// Types
type PostLength = 'tweet' | 'thread'

interface TemplateVariable {
  name: string
  label: string
  placeholder: string
  required: boolean
}

interface PostTemplate {
  id: string
  title: string
  category: string
  description: string | null
  prompt_template: string
  example_output: string | null
  variables: TemplateVariable[] | null
  engagement_type: string | null
  best_time: string | null
  difficulty: string | null
  is_system: boolean
  why_it_works: string | null
}

interface GeneratedPost {
  content: string
  archetype: 'scroll_stopper' | 'debate_starter' | 'viral_catalyst'
  characterCount: number
  savedPostId?: string
  tags?: TagType[]
}

interface InspirationTweet {
  id: string
  tweet_id: string
  tweet_text: string
  tweet_url: string | null
  author_username: string
  author_name: string | null
  author_profile_image_url: string | null
  reply_count: number
  like_count: number
  repost_count: number
  saved_at: string
}

// Template category config
const CATEGORIES = [
  { id: 'all', label: 'All Templates', icon: Sparkles },
  { id: 'alpha', label: 'Alpha', icon: TrendingUp },
  { id: 'build-in-public', label: 'Build in Public', icon: Rocket },
  { id: 'contrarian', label: 'Contrarian', icon: Flame },
  { id: 'engagement', label: 'Engagement', icon: MessageSquare },
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  alpha: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  'build-in-public': { bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-500/20' },
  contrarian: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/20' },
  engagement: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20' },
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'text-green-600 dark:text-green-400',
  intermediate: 'text-yellow-600 dark:text-yellow-400',
  advanced: 'text-red-600 dark:text-red-400',
}

const ENGAGEMENT_ICONS: Record<string, typeof Target> = {
  replies: MessageSquare,
  retweets: TrendingUp,
  likes: Sparkles,
  follows: Target,
}

// Archetype styling for generated posts
const archetypeStyles = {
  scroll_stopper: {
    label: 'Scroll Stopper',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: Flame,
  },
  debate_starter: {
    label: 'Debate Starter',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: MessageSquare,
  },
  viral_catalyst: {
    label: 'Viral Catalyst',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: TrendingUp,
  },
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
  onContentChange,
  isEditingInWorkspace,
}: {
  post: GeneratedPost
  onPostNow: () => void
  onAddToCalendar: () => void
  onAddTags: () => void
  onEditInWorkspace: () => void
  onContentChange: (newContent: string) => void
  isEditingInWorkspace: boolean
}) {
  const style = archetypeStyles[post.archetype]
  const Icon = style.icon
  const [copied, setCopied] = useState(false)
  const [showEditingTools, setShowEditingTools] = useState(false)
  const isThread = post.content.includes('1/') || post.content.includes('2/')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(post.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col animate-fade-in-up">
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${style.color}`}>
            <Icon className="w-3.5 h-3.5" />
            {style.label}
          </div>
          <button
            onClick={() => setShowEditingTools(!showEditingTools)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              showEditingTools 
                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' 
                : 'bg-[var(--border)] hover:bg-[var(--muted)]/30 text-[var(--muted)]'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            {showEditingTools ? 'Hide Tools' : 'Quick Edit'}
          </button>
        </div>
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map(tag => (
              <TagBadge key={tag.id} tag={tag} size="sm" />
            ))}
          </div>
        )}
      </div>

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

      {showEditingTools && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-3">
          <EditingTools
            content={post.content}
            onContentChange={onContentChange}
            isThread={isThread}
            hideScore={false}
          />
        </div>
      )}

      <div className="p-4 border-t border-[var(--border)] space-y-3">
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
  postLength: PostLength
  posts: GeneratedPost[]
  timestamp: number
}

// Main Page Component
export default function GeneratePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeAccount } = useXAccount()

  // Form state
  const [topic, setTopic] = useState('')
  const [postLength, setPostLength] = useState<PostLength>('tweet')
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null)

  // Template state
  const [templates, setTemplates] = useState<PostTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

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

  // Repurpose modal state
  const [showRepurposeModal, setShowRepurposeModal] = useState(false)
  const [inspirationTweets, setInspirationTweets] = useState<InspirationTweet[]>([])
  const [loadingInspirationTweets, setLoadingInspirationTweets] = useState(false)

  // Style Profiles - temporarily disabled, will re-enable with page redesign
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [styleProfiles] = useState<Array<{ id: string; account_username: string; profile_data: { summary?: string } }>>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars  
  const [selectedStyleProfileId] = useState<string | null>(null)

  // Fetch templates
  useEffect(() => {
    async function fetchTemplates() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('post_templates')
        .select('*')
        .order('category', { ascending: true })

      if (!error && data) {
        setTemplates(data)
      }
      setLoadingTemplates(false)
    }
    fetchTemplates()
  }, [])

  // Style profiles fetch disabled for now - will re-enable with page redesign
  // useEffect(() => { fetchStyleProfiles() }, [activeAccount?.id])

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory
      const matchesSearch = !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [templates, selectedCategory, searchQuery])

  // Handle repurpose URL parameter
  useEffect(() => {
    const repurposeText = searchParams.get('repurpose')
    const author = searchParams.get('author')
    
    if (repurposeText) {
      const prompt = author 
        ? `Repurpose this tweet:\n\n"${repurposeText}"\n\n— @${author}`
        : `Repurpose this tweet:\n\n"${repurposeText}"`;
      setTopic(prompt)
      setToast('Tweet loaded! Customize and generate.')
      
      const url = new URL(window.location.href)
      url.searchParams.delete('repurpose')
      url.searchParams.delete('author')
      router.replace(url.pathname, { scroll: false })
    }
  }, [searchParams, router])

  // Load persisted state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(GENERATE_STATE_KEY)
      if (saved) {
        const state: PersistedState = JSON.parse(saved)
        if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
          setTopic(state.topic || '')
          setPostLength(state.postLength || 'tweet')
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
    if (!hasLoadedState) return

    const state: PersistedState = {
      topic,
      postLength,
      posts,
      timestamp: Date.now(),
    }
    localStorage.setItem(GENERATE_STATE_KEY, JSON.stringify(state))
  }, [topic, postLength, posts, hasLoadedState])

  const clearPersistedPosts = () => {
    setPosts([])
  }

  // Open template - sets it as the input method
  const openTemplate = (template: PostTemplate) => {
    setSelectedTemplate(template)
    setVariableValues({})
  }

  // Check if all required variables are filled
  const canGenerateFromTemplate = useMemo(() => {
    if (!selectedTemplate?.variables) return true
    return selectedTemplate.variables
      .filter(v => v.required)
      .every(v => variableValues[v.name]?.trim())
  }, [selectedTemplate, variableValues])

  const handleGenerate = async () => {
    // Determine what to generate from
    let generateTopic = topic.trim()
    let templateData = null

    if (selectedTemplate) {
      // Generate from template
      templateData = {
        templateId: selectedTemplate.id,
        promptTemplate: selectedTemplate.prompt_template,
        variableValues: variableValues,
      }
      // If no topic but we have a template, use template title as fallback
      if (!generateTopic) {
        generateTopic = selectedTemplate.title
      }
    }

    if (!generateTopic && !templateData) return

    setIsLoading(true)
    setError(null)
    setPosts([])

    try {
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
          topic: generateTopic,
          length: postLength === 'thread' ? 'thread' : 'standard',
          tone: 'casual',
          postType: 'all',
          sourceFileId: selectedFile?.id || undefined,
          templateData: templateData,
          styleProfileId: selectedStyleProfileId || undefined, // Voice System V2
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const data = await res.json()
      setPosts(data.posts)

      // Close template if open
      setSelectedTemplate(null)

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
          openXIntent(tweets[0])
        }
      } else {
        const result = await postTweet(content)
        
        if (result.success && result.tweet_id) {
          setToast('Posted to X! 🎉')
          openTweet(result.tweet_id)
        } else {
          openXIntent(content)
        }
      }
    } catch {
      openXIntent(content)
    }
  }

  const handleAddToCalendar = () => {
    setToast('Coming soon: Add to Calendar')
  }

  const handleOpenRepurposeModal = async () => {
    setShowRepurposeModal(true)
    setLoadingInspirationTweets(true)
    try {
      const res = await fetch('/api/inspiration-tweets')
      if (res.ok) {
        const data = await res.json()
        setInspirationTweets(data.tweets || [])
      }
    } catch {
      // Ignore errors
    }
    setLoadingInspirationTweets(false)
  }

  const handleSelectInspirationTweet = (tweet: InspirationTweet) => {
    setTopic(`Repurpose this tweet:\n\n"${tweet.tweet_text}"\n\n— @${tweet.author_username}`)
    setShowRepurposeModal(false)
    setToast('Tweet loaded! Customize and generate.')
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const handleAddTags = async (post: GeneratedPost, index: number) => {
    let savedPostId = post.savedPostId
    if (!savedPostId) {
      try {
        const contentType = postLength === 'thread' ? 'thread' : 'tweet'
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
            x_account_id: activeAccount?.id,
          }),
        })

        if (!res.ok) throw new Error('Failed to save post')
        const savedPost = await res.json()
        savedPostId = savedPost.id

        setPosts(prev => prev.map((p, i) => i === index ? { ...p, savedPostId } : p))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save post')
        return
      }
    }

    setTagModalIndex(index)
    setTagModalSelectedIds(post.tags?.map(t => t.id) || [])
  }

  const handleSaveTags = async () => {
    if (tagModalIndex === null) return

    const post = posts[tagModalIndex]
    if (!post.savedPostId) return

    setSavingTags(true)
    try {
      const currentTagIds = post.tags?.map(t => t.id) || []
      const tagsToAdd = tagModalSelectedIds.filter(id => !currentTagIds.includes(id))
      const tagsToRemove = currentTagIds.filter(id => !tagModalSelectedIds.includes(id))

      for (const tagId of tagsToAdd) {
        await fetch(`/api/posts/${post.savedPostId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagId }),
        })
      }

      for (const tagId of tagsToRemove) {
        await fetch(`/api/posts/${post.savedPostId}/tags?tagId=${tagId}`, {
          method: 'DELETE',
        })
      }

      const tagsRes = await fetch(`/api/posts/${post.savedPostId}/tags`)
      const tagsData = await tagsRes.json()
      const updatedTags = tagsData.tags || []

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
      const contentType = postLength === 'thread' ? 'thread' : 'tweet'

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
          x_account_id: activeAccount?.id,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save draft')
      }

      const savedPost = await res.json()

      localStorage.setItem('edit-post', JSON.stringify({
        id: savedPost.id,
        title: savedPost.title,
        type: savedPost.type,
        content: savedPost.content,
      }))

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
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <GenerationCounter />
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-[var(--accent-text)] rounded-lg font-medium text-sm transition-colors"
              >
                <Crown className="w-4 h-4" />
                Upgrade
              </button>
            </div>
          </div>

          {/* Main Input Section */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6">
            {/* Chatbox or Template Input */}
            {selectedTemplate ? (
              // Template Input Mode
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[selectedTemplate.category]?.bg} ${CATEGORY_COLORS[selectedTemplate.category]?.text} border ${CATEGORY_COLORS[selectedTemplate.category]?.border}`}>
                      {selectedTemplate.category.replace('-', ' ')}
                    </span>
                    <span className={`text-xs font-medium capitalize ${DIFFICULTY_COLORS[selectedTemplate.difficulty || 'beginner']}`}>
                      {selectedTemplate.difficulty}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear template
                  </button>
                </div>
                <h3 className="text-lg font-semibold mb-2">{selectedTemplate.title}</h3>
                <p className="text-sm text-[var(--muted)] mb-4">{selectedTemplate.description}</p>
                
                {/* Variable Inputs */}
                {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                  <div className="space-y-3">
                    {selectedTemplate.variables.map((v) => (
                      <div key={v.name}>
                        <label className="block text-sm font-medium mb-1">
                          {v.label}
                          {v.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <input
                          type="text"
                          placeholder={v.placeholder}
                          value={variableValues[v.name] || ''}
                          onChange={e => setVariableValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                          className="w-full px-4 py-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:outline-none focus:border-accent transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Additional context */}
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
                    Additional context (optional)
                  </label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Add any extra details or context..."
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-accent resize-none text-sm"
                    rows={2}
                  />
                </div>
              </div>
            ) : (
              // Regular Chatbox Mode
              <div className="mb-6">
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter your topic, idea, or select a template below..."
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-accent input-glow resize-none"
                  rows={3}
                />
              </div>
            )}

            {/* File Source Display */}
            {selectedFile && (
              <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-lg">
                <FileText className="w-4 h-4 text-accent" />
                <span className="flex-1 truncate text-sm">
                  <span className="text-[var(--muted)]">Using: </span>
                  <span className="text-accent font-medium">{selectedFile.name}</span>
                </span>
                <button
                  onClick={clearFileSelection}
                  className="p-1 hover:bg-[var(--border)] rounded text-[var(--muted)] hover:text-red-400"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Post Length Toggle */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-[var(--muted)]">Post Length:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPostLength('tweet')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    postLength === 'tweet'
                      ? 'bg-accent text-[var(--accent-text)]'
                      : 'bg-[var(--background)] border border-[var(--border)] hover:border-[var(--muted)]'
                  }`}
                >
                  <AlignLeft className="w-4 h-4" />
                  Tweet
                </button>
                <button
                  onClick={() => setPostLength('thread')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    postLength === 'thread'
                      ? 'bg-accent text-[var(--accent-text)]'
                      : 'bg-[var(--background)] border border-[var(--border)] hover:border-[var(--muted)]'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Thread
                </button>
              </div>
              {postLength === 'thread' && (
                <span className="text-xs text-[var(--muted)] italic">
                  💡 More context recommended for threads
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={(!topic.trim() && !selectedTemplate) || isLoading || (selectedTemplate !== null && !canGenerateFromTemplate)}
                className="flex-1 flex items-center justify-center gap-3 px-6 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-[var(--accent-text)] rounded-xl font-semibold transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate
                  </>
                )}
              </button>
              <button
                onClick={handleOpenRepurposeModal}
                className="flex items-center gap-2 px-4 py-3 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-400 rounded-xl transition-colors text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Repurpose
              </button>
              <button
                onClick={() => setSidebarExpanded(true)}
                className="flex items-center gap-2 px-4 py-3 bg-[var(--background)] border border-[var(--border)] hover:border-[var(--muted)] rounded-xl transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                Files
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
              {(error.includes('limit') || error.includes('Insufficient')) && (
                <div className="mt-3 flex items-center gap-4">
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-[var(--accent-text)] rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Upgrade Plan
                  </Link>
                  <Link
                    href="/settings"
                    className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] underline"
                  >
                    View Usage
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Generated Posts */}
          {posts.length > 0 && (
            <div className="mb-8 space-y-6">
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
                    onContentChange={(newContent: string) => {
                      setPosts(prev => prev.map((p, i) => 
                        i === index 
                          ? { ...p, content: newContent, characterCount: newContent.length }
                          : p
                      ))
                    }}
                    isEditingInWorkspace={editingPostIndex === index}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Template Library Section */}
          <div className="border-t border-[var(--border)] pt-8">
            {/* Template Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold">📋 Templates</h2>
                <p className="text-sm text-[var(--muted)]">Select a template to get started quickly</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon
                const isActive = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                      ${isActive
                        ? 'bg-accent text-[var(--accent-text)] shadow-sm'
                        : 'bg-[var(--card)] border border-[var(--border)] hover:border-accent/50 text-[var(--muted)] hover:text-[var(--foreground)]'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                  </button>
                )
              })}
            </div>

            {/* Templates Grid */}
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--muted)]">No templates found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(template => {
                  const colors = CATEGORY_COLORS[template.category] || CATEGORY_COLORS.alpha
                  const diffColor = DIFFICULTY_COLORS[template.difficulty || 'beginner']
                  const EngIcon = ENGAGEMENT_ICONS[template.engagement_type || 'likes'] || Sparkles

                  return (
                    <button
                      key={template.id}
                      onClick={() => openTemplate(template)}
                      className="text-left p-5 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-accent/40 hover:shadow-md transition-all group"
                    >
                      {/* Top row: category badge + difficulty */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                          {template.category.replace('-', ' ')}
                        </span>
                        <span className={`text-xs font-medium capitalize ${diffColor}`}>
                          {template.difficulty}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-semibold mb-2 group-hover:text-accent transition-colors">
                        {template.title}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-[var(--muted)] mb-3 line-clamp-2">
                        {template.description}
                      </p>

                      {/* Why This Works */}
                      {template.why_it_works && (
                        <div className="mb-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                          <p className="text-xs font-medium text-amber-500 dark:text-amber-400 mb-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Why it works
                          </p>
                          <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2">
                            {template.why_it_works}
                          </p>
                        </div>
                      )}

                      {/* Bottom row: engagement type */}
                      <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                        {template.engagement_type && (
                          <span className="flex items-center gap-1">
                            <EngIcon className="w-3.5 h-3.5" />
                            Best for {template.engagement_type}
                          </span>
                        )}
                      </div>

                      {/* Arrow hint */}
                      <div className="mt-4 flex items-center gap-1 text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Use this template</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
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

      {/* Repurpose Modal */}
      {showRepurposeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl w-full max-w-2xl mx-4 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-violet-500" />
                <h3 className="text-lg font-semibold">Repurpose a Tweet</h3>
              </div>
              <button
                onClick={() => setShowRepurposeModal(false)}
                className="p-2 hover:bg-[var(--border)] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingInspirationTweets ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--muted)]" />
                </div>
              ) : inspirationTweets.length === 0 ? (
                <div className="text-center py-12">
                  <Bookmark className="w-10 h-10 text-[var(--muted)] mx-auto mb-3 opacity-50" />
                  <p className="text-[var(--muted)]">No saved tweets yet</p>
                  <p className="text-sm text-[var(--muted)] mt-1">
                    Save high-performing tweets with the Chrome extension.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--muted)] mb-4">
                    Select a tweet to use as inspiration:
                  </p>
                  {inspirationTweets.map((tweet) => (
                    <button
                      key={tweet.id}
                      onClick={() => handleSelectInspirationTweet(tweet)}
                      className="w-full text-left p-4 bg-[var(--background)] hover:bg-[var(--border)] border border-[var(--border)] hover:border-violet-500/50 rounded-lg transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {tweet.author_profile_image_url ? (
                          <Image
                            src={tweet.author_profile_image_url}
                            alt=""
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded-full"
                            unoptimized
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[var(--border)]" />
                        )}
                        <span className="text-sm font-medium">
                          {tweet.author_name || tweet.author_username}
                        </span>
                        <span className="text-xs text-[var(--muted)]">
                          @{tweet.author_username}
                        </span>
                        {tweet.tweet_url && (
                          <a
                            href={tweet.tweet_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto p-1 rounded hover:bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      <p className="text-sm mb-3 line-clamp-3">{tweet.tweet_text}</p>

                      <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {formatNumber(tweet.reply_count)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Repeat2 className="w-3 h-3" />
                          {formatNumber(tweet.repost_count)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {formatNumber(tweet.like_count)}
                        </span>
                        <span className="ml-auto text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to use →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]">
              <p className="text-xs text-[var(--muted)] text-center">
                💡 The AI will generate fresh content inspired by the tweet&apos;s style
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles, FileText, Loader2, X, Send, Calendar, PenLine, Check,
  Copy, RefreshCw, Crown, AlertCircle, ChevronLeft, ChevronRight, 
  MessageCircle, Repeat2, Heart, Search, TrendingUp, Flame, Rocket,
  Clock, Target, ArrowRight
} from 'lucide-react'
import { EditingTools } from '@/components/editing'
import { GenerationCounter } from '@/components/subscription/GenerationCounter'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'

import type { FileRecord } from '@/components/generate/FilesSidebar'
import { postTweet, postThread, openXIntent, openTweet } from '@/lib/x-posting'

// Types
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

// Template mode data structure
interface TemplateData {
  templateId: string
  templateTitle: string
  templateDescription: string | null
  templateCategory: string
  templateWhyItWorks: string | null
  templateDifficulty: string | null
  promptTemplate: string
  variableValues: Record<string, string>
  variables: TemplateVariable[] | null
}

// Category config
const CATEGORIES = [
  { id: 'all', label: 'All Templates', icon: Sparkles },
  { id: 'alpha', label: 'Alpha', icon: TrendingUp },
  { id: 'build-in-public', label: 'Build in Public', icon: Rocket },
  { id: 'contrarian', label: 'Contrarian', icon: Flame },
  { id: 'engagement', label: 'Engagement', icon: MessageCircle },
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
  replies: MessageCircle,
  retweets: TrendingUp,
  likes: Sparkles,
  follows: Target,
}

// Length options - just Tweet or Thread
const LENGTHS = [
  { id: 'tweet', label: 'Tweet' },
  { id: 'thread', label: 'Thread' },
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

  // Template state
  const [templates, setTemplates] = useState<PostTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

  // Template mode (when user has filled variables and is ready to generate)
  const [templateMode, setTemplateMode] = useState<TemplateData | null>(null)

  // Form state
  const [topic, setTopic] = useState('')
  const [selectedLength, setSelectedLength] = useState<string>('tweet')

  // UI state
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<GeneratedPost[]>([])
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [currentThreadIndex, setCurrentThreadIndex] = useState(0)
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null)

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
      setTemplatesLoading(false)
    }
    fetchTemplates()
  }, [])

  // Check for template data from sessionStorage (legacy support)
  useEffect(() => {
    const raw = sessionStorage.getItem('xthread-template-data')
    if (raw) {
      try {
        const data = JSON.parse(raw) as TemplateData & { topic?: string }
        if (data.templateId && data.promptTemplate) {
          setTemplateMode(data as TemplateData)
        } else if (data.topic) {
          setTopic(data.topic)
        }
      } catch {}
      sessionStorage.removeItem('xthread-template-data')
    }
  }, [])

  // Check subscription status
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

  // Reset carousel index when posts change
  useEffect(() => {
    setCurrentThreadIndex(0)
  }, [posts])

  // Clear template mode and return to normal input
  const clearTemplateMode = () => {
    setTemplateMode(null)
    setSelectedTemplate(null)
    setVariableValues({})
    setTopic('')
  }

  // Open template modal
  const openTemplate = (template: PostTemplate) => {
    setSelectedTemplate(template)
    setVariableValues({})
  }

  // Use template (after filling variables)
  const useTemplate = () => {
    if (!selectedTemplate) return

    const templateData: TemplateData = {
      templateId: selectedTemplate.id,
      templateTitle: selectedTemplate.title,
      templateDescription: selectedTemplate.description,
      templateCategory: selectedTemplate.category,
      templateWhyItWorks: selectedTemplate.why_it_works,
      templateDifficulty: selectedTemplate.difficulty,
      promptTemplate: selectedTemplate.prompt_template,
      variableValues: variableValues,
      variables: selectedTemplate.variables,
    }

    setTemplateMode(templateData)
    setSelectedTemplate(null)
  }

  // Check if all required variables are filled
  const canUseTemplate = useMemo(() => {
    if (!selectedTemplate?.variables) return true
    return selectedTemplate.variables
      .filter(v => v.required)
      .every(v => variableValues[v.name]?.trim())
  }, [selectedTemplate, variableValues])

  // Helper function to parse thread content into individual tweets
  const parseThreadContent = (content: string): { number: string; text: string; charCount: number }[] => {
    const tweets: { number: string; text: string; charCount: number }[] = []
    const numberedPattern = /^(\d+\/\d*)\s*/gm
    const matches = Array.from(content.matchAll(numberedPattern))

    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i]
        const startPos = match.index! + match[0].length
        const endPos = matches[i + 1]?.index ?? content.length
        const tweetText = content.slice(startPos, endPos).trim()
        const cleanText = tweetText
          .replace(/\n\*[A-Z][\s\S]*$/, '')
          .replace(/\n---[\s\S]*$/, '')
          .replace(/\[\d+\s*chars?\]/gi, '')
          .replace(/^\*Character count:.*$/gm, '')
          .trim()

        if (cleanText) {
          const num = match[1].includes('/') && !match[1].endsWith('/')
            ? match[1]
            : `${match[1]}${matches.length}`
          tweets.push({ number: num, text: cleanText, charCount: cleanText.length })
        }
      }
    }

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

  const handleGenerate = async () => {
    if (!templateMode && !topic.trim()) return

    setIsGenerating(true)
    setError(null)
    setPosts([])

    try {
      const usageRes = await fetch('/api/subscription/usage')
      if (usageRes.ok) {
        const usageData = await usageRes.json()
        if (!usageData.canGenerate) {
          setIsGenerating(false)
          setShowUpgradeModal(true)
          return
        }
      }

      let finalTopic = ''
      
      if (templateMode) {
        finalTopic = templateMode.promptTemplate
        const vars = templateMode.variables || []
        for (const v of vars) {
          const value = templateMode.variableValues[v.name] || ''
          finalTopic = finalTopic.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, 'g'), value)
        }
        const anyValue = Object.values(templateMode.variableValues)[0] || ''
        finalTopic = finalTopic.replace(/\{\{input\}\}/gi, anyValue)
                               .replace(/\{\{topic\}\}/gi, anyValue)
      } else {
        finalTopic = topic.trim()
      }

      // Map length to API format
      const apiLength = selectedLength === 'thread' ? 'thread' : 'standard'

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: finalTopic,
          length: apiLength,
          tone: 'casual',
          postType: templateMode?.templateCategory || 'market_take',
          sourceFileId: selectedFile?.id || undefined,
          isTemplatePrompt: !!templateMode,
          templateTitle: templateMode?.templateTitle,
          templateDescription: templateMode?.templateDescription,
          templateWhyItWorks: templateMode?.templateWhyItWorks,
          templateCategory: templateMode?.templateCategory,
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

  const handlePostNow = async (content: string) => {
    try {
      const isThread = selectedLength === 'thread'
      
      if (isThread) {
        const tweets = parseThreadContent(content).map(t => t.text)
        const result = await postThread(tweets)
        
        if (result.success && result.first_tweet_id) {
          openTweet(result.first_tweet_id)
        } else {
          openXIntent(tweets[0])
        }
      } else {
        const result = await postTweet(content)
        
        if (result.success && result.tweet_id) {
          openTweet(result.tweet_id)
        } else {
          openXIntent(content)
        }
      }
    } catch {
      openXIntent(content)
    }
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
          title: topic.slice(0, 50) || templateMode?.templateTitle || 'Generated post',
          content: contentType === 'thread'
            ? { tweets: parseThreadContent(post.content).map((t) => ({ id: t.number, content: t.text })) }
            : { html: `<p>${post.content.replace(/\n/g, '</p><p>')}</p>` },
          status: 'draft',
          generation_type: templateMode?.templateCategory || 'general',
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
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: contentType,
          title: topic.slice(0, 50) || templateMode?.templateTitle || 'Generated post',
          content: contentType === 'thread'
            ? { tweets: parseThreadContent(post.content).map((t) => ({ id: t.number, content: t.text })) }
            : { html: `<p>${post.content.replace(/\n/g, '</p><p>')}</p>` },
          status: 'scheduled',
          scheduled_date: tomorrow.toISOString().split('T')[0],
          generation_type: templateMode?.templateCategory || 'general',
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

  const isThread = selectedLength === 'thread'

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-5xl mx-auto px-4 py-8">
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

        {/* Main Input Area */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6">
          
          {/* TEMPLATE MODE: Show template card */}
          {templateMode ? (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className={`
                    inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                    ${CATEGORY_COLORS[templateMode.templateCategory]?.bg || 'bg-gray-500/10'}
                    ${CATEGORY_COLORS[templateMode.templateCategory]?.text || 'text-gray-400'}
                    border ${CATEGORY_COLORS[templateMode.templateCategory]?.border || 'border-gray-500/30'}
                  `}>
                    {templateMode.templateCategory.replace('-', ' ')}
                  </span>
                  {templateMode.templateDifficulty && (
                    <span className={`text-xs font-medium capitalize ${DIFFICULTY_COLORS[templateMode.templateDifficulty] || ''}`}>
                      {templateMode.templateDifficulty}
                    </span>
                  )}
                </div>
                <button
                  onClick={clearTemplateMode}
                  className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <X size={14} />
                  Change template
                </button>
              </div>

              <h2 className="text-xl font-bold mb-2">{templateMode.templateTitle}</h2>
              
              {templateMode.templateDescription && (
                <p className="text-[var(--muted)] text-sm mb-4">{templateMode.templateDescription}</p>
              )}

              {templateMode.variables && templateMode.variables.length > 0 && (
                <div className="space-y-2 mb-4">
                  {templateMode.variables.map((v) => (
                    <div key={v.name} className="flex items-start gap-2 p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                      <span className="text-xs font-medium text-[var(--muted)] min-w-[80px]">{v.label}:</span>
                      <span className="text-sm text-[var(--foreground)]">
                        {templateMode.variableValues[v.name] || <span className="text-[var(--muted)] italic">Not filled</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {templateMode.templateWhyItWorks && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                  <h3 className="text-sm font-semibold mb-2 text-amber-400 flex items-center gap-2">
                    <Sparkles size={14} />
                    Why This Works
                  </h3>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">
                    {templateMode.templateWhyItWorks}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* NORMAL MODE: Topic input */
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  What do you want to post about?
                </label>
                <div className="relative">
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value.slice(0, 500))}
                    placeholder="Enter your topic, idea, or select a template below..."
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
              {selectedFile ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 mb-4">
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
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[var(--border)] hover:border-[var(--muted)] transition-colors text-sm text-[var(--muted)] mb-4"
                >
                  <FileText size={16} />
                  Use a file as source material
                </button>
              )}
            </>
          )}

          {/* Post Length Toggle */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Post Length
            </label>
            <div className="flex gap-2">
              {LENGTHS.map((length) => {
                const isSelected = selectedLength === length.id
                return (
                  <button
                    key={length.id}
                    onClick={() => setSelectedLength(length.id)}
                    className={`
                      px-6 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${isSelected
                        ? 'bg-[var(--accent)] text-[var(--background)]'
                        : 'bg-[var(--background)] border border-[var(--border)] hover:border-[var(--muted)]'
                      }
                    `}
                  >
                    {length.label}
                  </button>
                )
              })}
            </div>
            {selectedLength === 'thread' && (
              <p className="text-xs text-[var(--muted)] mt-2 flex items-center gap-1">
                💡 More context recommended for threads
              </p>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={(!templateMode && !topic.trim()) || isGenerating}
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
          <div className="space-y-6 mb-12">
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

            {isThread ? (
              /* Thread: Carousel View */
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setCurrentThreadIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentThreadIndex === 0}
                    className="p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--border)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium">Option {currentThreadIndex + 1} of {posts.length}</span>
                  <button
                    onClick={() => setCurrentThreadIndex(prev => Math.min(posts.length - 1, prev + 1))}
                    disabled={currentThreadIndex === posts.length - 1}
                    className="p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--border)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                {posts[currentThreadIndex] && (() => {
                  const parsedTweets = parseThreadContent(posts[currentThreadIndex].content)
                  return (
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                        <span className="text-sm text-[var(--muted)]">Thread ({parsedTweets.length} tweets)</span>
                      </div>

                      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto bg-[var(--background)]/50">
                        {parsedTweets.map((tweet, tweetIndex) => (
                          <div key={tweetIndex} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]/60 flex items-center justify-center flex-shrink-0">
                                <span className="text-[var(--background)] font-bold text-sm">{tweet.number.split('/')[0]}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-1.5 py-0.5 bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-medium rounded">
                                    Tweet {tweet.number}
                                  </span>
                                </div>
                                <div className="text-[var(--foreground)] text-[15px] leading-[1.4] whitespace-pre-wrap">{tweet.text}</div>
                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border)]/50">
                                  <div className="flex items-center gap-6 text-[var(--muted)]">
                                    <span className="text-xs flex items-center gap-1"><MessageCircle size={14} /></span>
                                    <span className="text-xs flex items-center gap-1"><Repeat2 size={14} /></span>
                                    <span className="text-xs flex items-center gap-1"><Heart size={14} /></span>
                                  </div>
                                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                                    tweet.charCount > 280 ? 'bg-red-500/10 text-red-400' :
                                    tweet.charCount > 250 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                                  }`}>{tweet.charCount}/280</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 border-t border-[var(--border)] space-y-3">
                        <EditingTools
                          content={posts[currentThreadIndex].content}
                          onContentChange={(newContent) => {
                            setPosts(prev => prev.map((p, i) =>
                              i === currentThreadIndex ? { ...p, content: newContent, characterCount: newContent.length } : p
                            ))
                          }}
                          isThread={true}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleCopy(posts[currentThreadIndex].content, currentThreadIndex)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg font-medium text-sm transition-colors">
                            {copiedIndex === currentThreadIndex ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            Copy Thread
                          </button>
                          <button onClick={() => handleEditInWorkspace(posts[currentThreadIndex])} disabled={savingIndex === currentThreadIndex} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
                            {savingIndex === currentThreadIndex ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
                            Edit
                          </button>
                          <button onClick={() => handleAddToCalendar(posts[currentThreadIndex])} disabled={savingIndex === currentThreadIndex} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--accent)] hover:opacity-90 text-[var(--background)] rounded-lg font-medium text-sm transition-opacity disabled:opacity-50">
                            <Calendar size={14} />
                            Schedule
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                <div className="flex justify-center gap-2">
                  {posts.map((_, index) => (
                    <button key={index} onClick={() => setCurrentThreadIndex(index)} className={`w-2.5 h-2.5 rounded-full transition-colors ${index === currentThreadIndex ? 'bg-[var(--accent)]' : 'bg-[var(--border)] hover:bg-[var(--muted)]'}`} />
                  ))}
                </div>
              </div>
            ) : (
              /* Single Tweet: Grid View */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <div key={post.index} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-[var(--border)]">
                      <span className="text-sm text-[var(--muted)]">Option {post.index + 1}</span>
                    </div>
                    <div className="p-4 flex-1">
                      <p className="text-[var(--foreground)] whitespace-pre-wrap leading-relaxed text-sm">{post.content}</p>
                    </div>
                    <div className="p-4 border-t border-[var(--border)] space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--muted)]">Characters</span>
                        <span className={`font-mono ${post.characterCount > 280 ? 'text-red-400' : post.characterCount > 250 ? 'text-amber-400' : 'text-emerald-400'}`}>{post.characterCount}/280</span>
                      </div>
                      <EditingTools content={post.content} onContentChange={(newContent) => { setPosts(prev => prev.map((p, i) => i === post.index ? { ...p, content: newContent, characterCount: newContent.length } : p)) }} isThread={false} />
                      <div className="flex gap-2">
                        <button onClick={() => handlePostNow(post.content)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--accent)] hover:opacity-90 text-[var(--background)] rounded-lg font-medium text-sm transition-opacity">
                          <Send size={14} />
                          Post
                        </button>
                        <button onClick={() => handleCopy(post.content, post.index)} className="p-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg transition-colors" title="Copy">
                          {copiedIndex === post.index ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                        <button onClick={() => handleEditInWorkspace(post)} disabled={savingIndex === post.index} className="p-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg transition-colors disabled:opacity-50" title="Edit">
                          {savingIndex === post.index ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
                        </button>
                        <button onClick={() => handleAddToCalendar(post)} disabled={savingIndex === post.index} className="p-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg transition-colors disabled:opacity-50" title="Schedule">
                          <Calendar size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Template Library - only show when not in template mode */}
        {!templateMode && (
          <div className="border-t border-[var(--border)] pt-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold">Template Library</h2>
                <p className="text-[var(--muted)] text-sm mt-1">
                  Or select a proven template to get started
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
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
                        ? 'bg-[var(--accent)] text-[var(--background)]'
                        : 'bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]/50 text-[var(--muted)] hover:text-[var(--foreground)]'
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
            {templatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--muted)]">No templates found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(template => {
                  const colors = CATEGORY_COLORS[template.category] || { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' }
                  const EngagementIcon = template.engagement_type ? ENGAGEMENT_ICONS[template.engagement_type] || Target : Target
                  
                  return (
                    <button
                      key={template.id}
                      onClick={() => openTemplate(template)}
                      className="text-left bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)]/50 hover:shadow-lg transition-all group"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                          {template.category.replace('-', ' ')}
                        </span>
                        {template.difficulty && (
                          <span className={`text-xs font-medium capitalize ${DIFFICULTY_COLORS[template.difficulty] || ''}`}>
                            {template.difficulty}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-[var(--foreground)] mb-2 group-hover:text-[var(--accent)] transition-colors">
                        {template.title}
                      </h3>

                      {/* Description */}
                      {template.description && (
                        <p className="text-sm text-[var(--muted)] line-clamp-2 mb-3">
                          {template.description}
                        </p>
                      )}

                      {/* Why it Works (amber box) */}
                      {template.why_it_works && (
                        <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-3">
                          <p className="text-xs text-amber-600 dark:text-amber-400 line-clamp-2">
                            <span className="font-medium">Why it works:</span> {template.why_it_works}
                          </p>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                        <div className="flex items-center gap-1">
                          <EngagementIcon className="w-3.5 h-3.5" />
                          <span>Best for {template.engagement_type || 'engagement'}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--accent)]" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Template Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-lg w-full max-h-[85vh] overflow-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)] p-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[selectedTemplate.category]?.bg || 'bg-gray-500/10'} ${CATEGORY_COLORS[selectedTemplate.category]?.text || 'text-gray-400'} border ${CATEGORY_COLORS[selectedTemplate.category]?.border || 'border-gray-500/20'}`}>
                    {selectedTemplate.category.replace('-', ' ')}
                  </span>
                  {selectedTemplate.difficulty && (
                    <span className={`text-xs font-medium capitalize ${DIFFICULTY_COLORS[selectedTemplate.difficulty] || ''}`}>
                      {selectedTemplate.difficulty}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold">{selectedTemplate.title}</h2>
              </div>
              <button onClick={() => setSelectedTemplate(null)} className="p-2 hover:bg-[var(--border)] rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">
              {selectedTemplate.description && (
                <p className="text-[var(--muted)]">{selectedTemplate.description}</p>
              )}

              {selectedTemplate.why_it_works && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                  <h3 className="text-sm font-semibold mb-1 text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <Sparkles size={14} />
                    Why This Works
                  </h3>
                  <p className="text-sm text-[var(--muted)]">{selectedTemplate.why_it_works}</p>
                </div>
              )}

              {/* Variables */}
              {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Fill in the details</h3>
                  {selectedTemplate.variables.map((v) => (
                    <div key={v.name}>
                      <label className="block text-sm text-[var(--muted)] mb-1">
                        {v.label} {v.required && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type="text"
                        placeholder={v.placeholder}
                        value={variableValues[v.name] || ''}
                        onChange={e => setVariableValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
                {selectedTemplate.best_time && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} />
                    {selectedTemplate.best_time}
                  </div>
                )}
                {selectedTemplate.engagement_type && (
                  <div className="flex items-center gap-1.5">
                    <Target size={14} />
                    Best for {selectedTemplate.engagement_type}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-[var(--card)] border-t border-[var(--border)] p-5">
              <button
                onClick={useTemplate}
                disabled={!canUseTemplate}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-[var(--background)] rounded-xl font-semibold transition-opacity"
              >
                <Sparkles size={18} />
                Use This Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  )
}

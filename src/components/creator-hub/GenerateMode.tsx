'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
// supabase import removed - templates now loaded in TemplatesMode
import {
  Sparkles, FileText, Loader2, X, Calendar, PenLine, Check,
  Copy, RefreshCw, Crown, AlertCircle, ChevronLeft, ChevronRight, 
  MessageCircle, Repeat2, Heart, TrendingUp, Flame, Rocket,
  Clock, Target
} from 'lucide-react'
import { EditingTools } from '@/components/editing'
import { GenerationCounter } from '@/components/subscription/GenerationCounter'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import { useXAccount } from '@/contexts/XAccountContext'

import type { FileRecord } from '@/components/generate/FilesSidebar'

interface StyleProfile {
  id: string
  account_username: string
  profile_data: { summary?: string }
}

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

// Prompt categories for Brain Dump quick starts
const PROMPT_CATEGORIES = [
  {
    id: 'build-in-public',
    label: 'Build in Public',
    icon: Rocket,
    prompts: [
      'Something I shipped this week',
      'A bug that took hours to fix',
      'Behind the scenes of my workflow',
      'Lesson learned building my product',
      'Feature I almost built but didn\'t',
      'Tool that 10x\'d my productivity'
    ]
  },
  {
    id: 'hot-takes',
    label: 'Hot Takes',
    icon: Flame,
    prompts: [
      'Unpopular opinion about my industry',
      'Thing everyone does that I think is wrong',
      'Advice I disagree with',
      'Trend I think is overhyped',
      'Contrarian take on a popular tool',
      'Why the common practice is broken'
    ]
  },
  {
    id: 'knowledge',
    label: 'Knowledge Share',
    icon: TrendingUp,
    prompts: [
      'Thing I wish I knew when starting out',
      'Framework I use to make decisions',
      'Mistake I see beginners make',
      'Resource that changed how I work',
      'Concept that took me years to understand',
      'Simple trick that gets big results'
    ]
  },
  {
    id: 'engagement',
    label: 'Engagement',
    icon: MessageCircle,
    prompts: [
      'Question I want to ask my audience',
      'Poll idea for my followers',
      'Hot topic I want opinions on',
      'Debate I want to start',
      'Prediction I want to make',
      'Challenge for my community'
    ]
  },
  {
    id: 'personal',
    label: 'Personal Story',
    icon: Target,
    prompts: [
      'Moment that changed my career',
      'Failure that taught me the most',
      'Risk I took that paid off',
      'Person who influenced my path',
      'Turning point in my journey',
      'Day in my life that was pivotal'
    ]
  }
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  thread: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
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

// Length options - Tweet, Thread, or Article
const LENGTHS = [
  { id: 'tweet', label: 'Tweet' },
  { id: 'thread', label: 'Thread' },
  { id: 'article', label: 'Article', description: 'Long-form content' },
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
  const { activeAccount } = useXAccount()

  // Style Profiles
  const [styleProfiles, setStyleProfiles] = useState<StyleProfile[]>([])
  const [selectedStyleProfileId, setSelectedStyleProfileId] = useState<string | null>(null)
  const [loadingStyleProfiles, setLoadingStyleProfiles] = useState(false)

  // Template state (for template mode when coming from Templates tab)
  const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

  // Prompt category state for Brain Dump
  const [selectedPromptCategory, setSelectedPromptCategory] = useState<string | null>(null)

  // Template mode (when user has filled variables and is ready to generate)
  const [templateMode, setTemplateMode] = useState<TemplateData | null>(null)

  // Form state
  const [topic, setTopic] = useState('')
  const [selectedLength, setSelectedLength] = useState<string>('tweet')
  const [suggestMedia, setSuggestMedia] = useState<boolean>(false)

  // UI state
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<GeneratedPost[]>([])
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [currentThreadIndex, setCurrentThreadIndex] = useState(0)
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null)

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

  // Fetch style profiles when active account changes
  useEffect(() => {
    async function fetchStyleProfiles() {
      if (!activeAccount?.id) {
        setStyleProfiles([])
        return
      }
      
      setLoadingStyleProfiles(true)
      try {
        const res = await fetch(`/api/voice/style-profiles?x_account_id=${activeAccount.id}`)
        if (res.ok) {
          const data = await res.json()
          setStyleProfiles(data.profiles || [])
        } else {
          console.error('Style profiles fetch failed:', res.status)
        }
      } catch (err) {
        console.error('Failed to fetch style profiles:', err)
      }
      setLoadingStyleProfiles(false)
    }
    
    fetchStyleProfiles()
  }, [activeAccount?.id])

  // Reset carousel index when posts change
  useEffect(() => {
    setCurrentThreadIndex(0)
  }, [posts])

  // Auto-enable suggestMedia for articles, reset for others
  useEffect(() => {
    setSuggestMedia(selectedLength === 'article')
  }, [selectedLength])

  // Clear template mode and return to normal input
  const clearTemplateMode = () => {
    setTemplateMode(null)
    setSelectedTemplate(null)
    setVariableValues({})
    setTopic('')
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
    
    // First, clean the content of any formatting artifacts
    const cleanedContent = content
      .replace(/^---+\s*/gm, '') // Remove --- delimiters
      .replace(/^\*\*[^*]+\*\*\s*/gm, '') // Remove **Option X** headers
      .replace(/\*Why this works:[\s\S]*?(?=\d+\/|^\d+\s*$|$)/gim, '') // Remove analysis sections
      .replace(/\*Character count:.*$/gm, '') // Remove character count lines
      .replace(/\[\d+\s*chars?\]/gi, '') // Remove inline char counts
      .trim()
    
    // Method 1: Look for "1/" or "1/7" patterns (standard format)
    const slashPattern = /^(\d+\/\d*)\s*/gm
    const slashMatches = Array.from(cleanedContent.matchAll(slashPattern))

    if (slashMatches.length > 0) {
      for (let i = 0; i < slashMatches.length; i++) {
        const match = slashMatches[i]
        const startPos = match.index! + match[0].length
        const endPos = slashMatches[i + 1]?.index ?? cleanedContent.length
        const tweetText = cleanedContent.slice(startPos, endPos).trim()
        
        // Clean the individual tweet text
        const cleanText = tweetText
          .replace(/\n\*[A-Z][\s\S]*$/, '') // Remove analysis at end
          .replace(/\n---[\s\S]*$/, '') // Remove delimiter sections
          .split('\n')[0] // Take only the first line (the actual tweet)
          .trim()

        if (cleanText && cleanText.length > 0) {
          const totalTweets = slashMatches.length
          const num = match[1].includes('/') && !match[1].endsWith('/')
            ? match[1]
            : `${match[1].replace('/', '')}/${totalTweets}`
          tweets.push({ number: num, text: cleanText, charCount: cleanText.length })
        }
      }
    }
    
    // Method 2: Look for standalone numbers on their own line (e.g., "1\nTweet text")
    // This handles the case where AI outputs numbers without slashes
    if (tweets.length === 0) {
      // Pattern: number at start of line (possibly with newline), followed by text
      const standaloneNumberPattern = /^(\d+)\s*\n([^\n]+)/gm
      const standaloneMatches = Array.from(cleanedContent.matchAll(standaloneNumberPattern))
      
      if (standaloneMatches.length >= 2) {
        for (const match of standaloneMatches) {
          const num = match[1]
          const text = match[2].trim()
          if (text && text.length > 0 && !text.startsWith('*')) {
            tweets.push({
              number: `${num}/${standaloneMatches.length}`,
              text: text,
              charCount: text.length
            })
          }
        }
      }
    }
    
    // Method 3: Look for inline numbers like "1 Tweet text" or "1. Tweet text"
    if (tweets.length === 0) {
      const lines = cleanedContent.split('\n').filter(l => l.trim())
      const numberedLines: { num: number; text: string }[] = []
      
      for (const line of lines) {
        const inlineMatch = line.match(/^(\d+)[.\s]+(.+)$/)
        if (inlineMatch) {
          const num = parseInt(inlineMatch[1], 10)
          const text = inlineMatch[2].trim()
          if (text && text.length > 0 && !text.startsWith('*')) {
            numberedLines.push({ num, text })
          }
        }
      }
      
      // Check if we have sequential numbered lines (at least 2)
      if (numberedLines.length >= 2) {
        numberedLines.sort((a, b) => a.num - b.num)
        for (const item of numberedLines) {
          tweets.push({
            number: `${item.num}/${numberedLines.length}`,
            text: item.text,
            charCount: item.text.length
          })
        }
      }
    }

    // Fallback: if no numbered patterns found, try splitting by double newlines
    if (tweets.length === 0) {
      // Filter out empty lines and metadata
      const fallbackTweets = cleanedContent
        .split('\n\n')
        .map(t => t.trim())
        .filter(t => t.length > 0 && !t.startsWith('*') && !t.startsWith('---'))
      
      if (fallbackTweets.length > 0) {
        return fallbackTweets.map((text, index) => ({
          number: `${index + 1}/${fallbackTweets.length}`,
          text: text,
          charCount: text.length
        }))
      }
    }

    // If still nothing, return the whole content as a single tweet
    if (tweets.length === 0 && cleanedContent.length > 0) {
      return [{
        number: '1/1',
        text: cleanedContent,
        charCount: cleanedContent.length
      }]
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
      const apiLength = selectedLength === 'thread' ? 'thread' : selectedLength === 'article' ? 'developed' : 'standard'

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
          styleProfileId: selectedStyleProfileId || undefined,
          suggestMedia: suggestMedia,
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

  const handleEditInWorkspace = async (post: GeneratedPost) => {
    console.log('[Edit] Starting handleEditInWorkspace', { post, selectedLength })
    setSavingIndex(post.index)

    try {
      const contentType = selectedLength === 'thread' ? 'thread' : selectedLength === 'article' ? 'article' : 'tweet'
      console.log('[Edit] contentType:', contentType)
      
      const threadTweets = contentType === 'thread' 
        ? parseThreadContent(post.content).map((t) => ({ id: t.number, content: t.text }))
        : null
      console.log('[Edit] Parsed thread tweets:', threadTweets)

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
          generation_type: templateMode?.templateCategory || 'user_generated',
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('[Edit] API error:', res.status, errorData)
        throw new Error(errorData.error || 'Failed to save draft')
      }

      const savedPost = await res.json()
      console.log('[Edit] Saved post:', savedPost)
      
      const editPostData = {
        id: savedPost.id,
        title: savedPost.title,
        type: savedPost.type,
        content: savedPost.content,
      }
      console.log('[Edit] Storing in localStorage:', editPostData)
      localStorage.setItem('edit-post', JSON.stringify(editPostData))

      console.log('[Edit] Redirecting to /drafts')
      router.push('/drafts')
    } catch (err) {
      console.error('[Edit] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingIndex(null)
    }
  }

  const handleAddToCalendar = async (post: GeneratedPost) => {
    setSavingIndex(post.index)

    try {
      const contentType = selectedLength === 'thread' ? 'thread' : selectedLength === 'article' ? 'article' : 'tweet'
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
          generation_type: templateMode?.templateCategory || 'user_generated',
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
  const isArticle = selectedLength === 'article'

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
                <div className="p-4 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                  <h3 className="text-sm font-semibold mb-2 text-[var(--accent)] flex items-center gap-2">
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
                  {selectedLength === 'article' 
                    ? 'Brain dump everything — notes, ideas, bullet points, rough drafts...'
                    : 'What\'s on your mind? Brain dump your thoughts here...'}
                </label>
                <div className="relative">
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value.slice(0, selectedLength === 'article' ? 5000 : 500))}
                    placeholder={selectedLength === 'article' 
                      ? "Paste your notes, brain dump ideas, or write a rough outline. The more context you provide, the better the article..."
                      : "Just start typing - raw thoughts, ideas, anything..."}
                    rows={selectedLength === 'article' ? 8 : 3}
                    className={`
                      w-full px-4 py-3 rounded-xl
                      bg-[var(--background)] border border-[var(--border)]
                      text-[var(--foreground)] placeholder-[var(--muted)]
                      focus:outline-none focus:border-[var(--accent)]
                      transition-colors
                      ${selectedLength === 'article' ? 'resize-y min-h-[200px]' : 'resize-none'}
                    `}
                  />
                  <span className="absolute bottom-3 right-3 text-xs text-[var(--muted)]">
                    {topic.length}/{selectedLength === 'article' ? '5000' : '500'}
                  </span>
                </div>
              </div>

              {/* Prompt Categories */}
              <div className="mb-4">
                <p className="text-xs text-[var(--muted)] mb-2">💡 Pick a category for prompt ideas:</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PROMPT_CATEGORIES.map(cat => {
                    const Icon = cat.icon
                    const isActive = selectedPromptCategory === cat.id
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedPromptCategory(isActive ? null : cat.id)}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                          ${isActive
                            ? 'bg-[var(--accent)] text-[var(--background)]'
                            : 'bg-[var(--background)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--muted)] hover:text-[var(--foreground)]'
                          }
                        `}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
                
                {/* Show prompts for selected category */}
                {selectedPromptCategory && (
                  <div className="flex flex-wrap gap-2 animate-fade-in">
                    {PROMPT_CATEGORIES.find(c => c.id === selectedPromptCategory)?.prompts.map(prompt => (
                      <button
                        key={prompt}
                        onClick={() => setTopic(prompt)}
                        className="px-3 py-1.5 text-xs rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 hover:bg-[var(--accent)]/20 transition-colors text-[var(--foreground)]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
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

          {/* Post Length + Style Profile Row */}
          <div className="flex flex-wrap items-end gap-6">
            {/* Post Length */}
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
            </div>

            {/* Style Profile Selector */}
            {loadingStyleProfiles && (
              <div className="flex items-center gap-2 text-sm text-[var(--muted)] pb-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            )}
            {!loadingStyleProfiles && styleProfiles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Incorporate style (select one):
                </label>
                <div className="flex flex-wrap gap-2">
                  {styleProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => setSelectedStyleProfileId(
                        selectedStyleProfileId === profile.id ? null : profile.id
                      )}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        selectedStyleProfileId === profile.id
                          ? 'bg-[var(--accent)] text-[var(--background)]'
                          : 'bg-[var(--background)] border border-[var(--border)] hover:border-[var(--muted)]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        selectedStyleProfileId === profile.id ? 'bg-[var(--background)]' : 'bg-[var(--border)]'
                      }`} />
                      @{profile.account_username}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Media Suggestions Toggle */}
          <div className="mt-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={suggestMedia}
                  onChange={(e) => setSuggestMedia(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`
                  w-10 h-6 rounded-full transition-colors
                  ${suggestMedia 
                    ? 'bg-[var(--accent)]' 
                    : 'bg-[var(--border)]'
                  }
                `} />
                <div className={`
                  absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform
                  ${suggestMedia ? 'translate-x-4' : 'translate-x-0'}
                `} />
              </div>
              <div>
                <span className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                  Suggest media implementation
                </span>
                <p className="text-xs text-[var(--muted)]">
                  {selectedLength === 'article' 
                    ? 'Enabled by default for articles'
                    : 'Add [Image: ...] placeholders for visual suggestions'
                  }
                </p>
              </div>
            </label>
          </div>

          {/* Helper text row */}
          <div className="flex gap-6 text-xs text-[var(--muted)] mt-3">
            {selectedLength === 'thread' && (
              <span>💡 More context recommended for threads</span>
            )}
            {selectedLength === 'article' && (
              <span>📝 Brain dump your ideas — we&apos;ll turn them into a polished article</span>
            )}
            {!loadingStyleProfiles && styleProfiles.length > 0 && selectedStyleProfileId && (
              <span className="text-[var(--accent)]">
                {styleProfiles.find(p => p.id === selectedStyleProfileId)?.profile_data?.summary}
              </span>
            )}
            {!loadingStyleProfiles && styleProfiles.length > 0 && !selectedStyleProfileId && (
              <span>None selected = your voice only</span>
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
              {selectedLength === 'article' ? 'Writing article...' : 'Generating...'}
            </>
          ) : (
            <>
              <Sparkles size={20} />
              {selectedLength === 'article' ? 'Generate Article' : 'Generate 3 Options'}
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

            {isArticle && posts.length > 0 ? (
              /* Article: Single Full-Width View */
              <div className="space-y-4">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                    <span className="text-sm text-[var(--muted)]">📝 Your Article</span>
                    <span className="text-xs text-[var(--muted)]">{posts[0].characterCount.toLocaleString()} characters • ~{Math.ceil(posts[0].characterCount / 1500)} min read</span>
                  </div>

                  <div className="p-6 max-h-[600px] overflow-y-auto bg-[var(--background)]/50">
                    {/* Render markdown-style content */}
                    <div className="prose prose-invert max-w-none">
                      {posts[0].content.split('\n').map((line, i) => {
                        // H1 heading
                        if (line.startsWith('# ')) {
                          return <h1 key={i} className="text-2xl font-bold mb-4 text-[var(--foreground)]">{line.slice(2)}</h1>
                        }
                        // H2 heading
                        if (line.startsWith('## ')) {
                          return <h2 key={i} className="text-xl font-semibold mt-6 mb-3 text-[var(--foreground)]">{line.slice(3)}</h2>
                        }
                        // H3 heading
                        if (line.startsWith('### ')) {
                          return <h3 key={i} className="text-lg font-semibold mt-4 mb-2 text-[var(--foreground)]">{line.slice(4)}</h3>
                        }
                        // Block quote
                        if (line.startsWith('> ')) {
                          return <blockquote key={i} className="border-l-4 border-[var(--accent)] pl-4 my-4 italic text-[var(--muted)]">{line.slice(2)}</blockquote>
                        }
                        // Bullet list
                        if (line.startsWith('- ') || line.startsWith('* ')) {
                          return <li key={i} className="ml-4 text-[var(--foreground)] leading-relaxed">{line.slice(2)}</li>
                        }
                        // Image placeholder
                        if (line.startsWith('[Image:')) {
                          return <div key={i} className="my-4 p-4 border border-dashed border-[var(--border)] rounded-lg text-center text-[var(--muted)] text-sm">{line}</div>
                        }
                        // Horizontal rule
                        if (line === '---') {
                          return <hr key={i} className="my-6 border-[var(--border)]" />
                        }
                        // Empty line
                        if (!line.trim()) {
                          return <div key={i} className="h-4" />
                        }
                        // Regular paragraph - handle **bold** and *italic*
                        const formattedLine = line
                          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                        return <p key={i} className="text-[var(--foreground)] leading-relaxed mb-3" dangerouslySetInnerHTML={{ __html: formattedLine }} />
                      })}
                    </div>
                  </div>

                  <div className="p-4 border-t border-[var(--border)] space-y-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleCopy(posts[0].content, 0)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg font-medium text-sm transition-colors">
                        {copiedIndex === 0 ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        Copy Article
                      </button>
                      <button onClick={() => handleEditInWorkspace(posts[0])} disabled={savingIndex === 0} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
                        {savingIndex === 0 ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
                        Edit in Workspace
                      </button>
                      <button onClick={() => handleAddToCalendar(posts[0])} disabled={savingIndex === 0} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--accent)] hover:opacity-90 text-[var(--background)] rounded-lg font-medium text-sm transition-opacity disabled:opacity-50">
                        <Calendar size={14} />
                        Save to Drafts
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : isThread ? (
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
                        <button onClick={() => handleCopy(post.content, post.index)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg font-medium text-sm transition-colors">
                          {copiedIndex === post.index ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          Copy
                        </button>
                        <button onClick={() => handleEditInWorkspace(post)} disabled={savingIndex === post.index} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
                          {savingIndex === post.index ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
                          Edit
                        </button>
                        <button onClick={() => handleAddToCalendar(post)} disabled={savingIndex === post.index} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--accent)] hover:opacity-90 text-[var(--background)] rounded-lg font-medium text-sm transition-opacity disabled:opacity-50">
                          {savingIndex === post.index ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                          Schedule
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
                <div className="p-4 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                  <h3 className="text-sm font-semibold mb-1 text-[var(--accent)] flex items-center gap-2">
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

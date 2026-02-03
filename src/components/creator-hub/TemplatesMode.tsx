'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useXAccount } from '@/contexts/XAccountContext'
import { FileRecord } from '@/components/generate/FilesSidebar'
import { GenerationCounter } from '@/components/subscription/GenerationCounter'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import {
  Sparkles,
  Loader2,
  Check,
  X,
  PenLine,
  Layers,
  AlertCircle,
  Copy,
  Calendar,
  RefreshCw,
  Edit3
} from 'lucide-react'
import { EditingTools } from '@/components/editing'
import Link from 'next/link'

// Types
interface StyleTemplate {
  id: string
  title: string
  description: string | null
  admired_account_username: string | null
  tweets: Array<{ text: string; url?: string }>
}

interface PostTemplate {
  id: string
  title: string
  category: string
  description: string | null
  prompt_template: string
  variables: Array<{ name: string; label: string; placeholder: string; required: boolean }> | null
  difficulty: string | null
  why_it_works: string | null
  content_type?: 'post' | 'thread' // New field for template type
}

interface GeneratedPost {
  content: string
  archetype: string
  characterCount: number
}

interface TemplatesModeProps {
  selectedFile: FileRecord | null
  onOpenSidebar: () => void
  onClearFile: () => void
}

// Category colors
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  thread: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  alpha: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'build-in-public': { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
  contrarian: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  engagement: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
}

export default function TemplatesMode({ selectedFile, onOpenSidebar: _onOpenSidebar, onClearFile: _onClearFile }: TemplatesModeProps) {
  void _onOpenSidebar
  void _onClearFile
  const { activeAccount } = useXAccount()
  const supabase = createClient()

  // Data state
  const [styleTemplates, setStyleTemplates] = useState<StyleTemplate[]>([])
  const [postTemplates, setPostTemplates] = useState<PostTemplate[]>([])
  const [loading, setLoading] = useState(true)

  // Selection state
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

  // UI state - default to 'post' tab since post format is priority 1
  const [activeTab, setActiveTab] = useState<'style' | 'post'>('post')
  const [templateType, setTemplateType] = useState<'post' | 'thread'>('post') // Filter for post vs thread templates
  const [generating, setGenerating] = useState(false)
  const [posts, setPosts] = useState<GeneratedPost[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch style templates
        const stylesRes = await fetch(
          `/api/style-templates${activeAccount?.id ? `?x_account_id=${activeAccount.id}` : ''}`,
          { credentials: 'include' }
        )
        if (stylesRes.ok) {
          const data = await stylesRes.json()
          setStyleTemplates(data.templates || [])
        }

        // Fetch post templates
        const { data: templates } = await supabase
          .from('post_templates')
          .select('*')
          .order('category', { ascending: true })

        if (templates) {
          setPostTemplates(templates)
        }
      } catch (error) {
        console.error('Error fetching templates:', error)
      }
      setLoading(false)
    }

    fetchData()
  }, [activeAccount?.id, supabase])

  // Get selected templates
  const selectedStyle = useMemo(() => 
    styleTemplates.find(t => t.id === selectedStyleId), 
    [styleTemplates, selectedStyleId]
  )
  const selectedPost = useMemo(() => 
    postTemplates.find(t => t.id === selectedPostId), 
    [postTemplates, selectedPostId]
  )

  // Filter templates by type (post vs thread)
  const filteredPostTemplates = useMemo(() => 
    postTemplates.filter(t => (t.content_type || 'post') === 'post' && t.category !== 'thread'),
    [postTemplates]
  )
  const filteredThreadTemplates = useMemo(() => 
    postTemplates.filter(t => t.content_type === 'thread' || t.category === 'thread'),
    [postTemplates]
  )

  // Check if can generate - post format is required, voice style is optional
  const canGenerate = selectedPostId !== null

  // Handle generation
  const handleGenerate = async () => {
    if (!canGenerate) return

    setGenerating(true)
    setError(null)
    setPosts([])

    try {
      const usageRes = await fetch('/api/subscription/usage')
      if (usageRes.ok) {
        const usageData = await usageRes.json()
        if (!usageData.canGenerate) {
          setShowUpgradeModal(true)
          setGenerating(false)
          return
        }
      }

      // Determine post type from template category or default to market_take
      const postType = selectedPost?.category === 'build-in-public' ? 'build_in_public'
        : selectedPost?.category === 'contrarian' ? 'hot_take'
        : selectedPost?.category === 'alpha' ? 'market_take'
        : selectedPost?.category === 'engagement' ? 'hot_take'
        : 'market_take'

      // Build the topic by substituting variable values into the prompt template
      let topic = selectedPost?.prompt_template || selectedStyle?.title || 'Generate content'
      if (selectedPost?.variables && Object.keys(variableValues).length > 0) {
        for (const [key, value] of Object.entries(variableValues)) {
          // Replace {{variable_name}} with actual value
          topic = topic.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value)
        }
      }

      // Determine if this is a thread template
      const isThreadTemplate = selectedPost?.content_type === 'thread' || selectedPost?.category === 'thread'
      
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic,
          length: isThreadTemplate ? 'thread' : 'standard',
          tone: 'casual',
          postType: isThreadTemplate ? 'alpha_thread' : postType,
          sourceFileId: selectedFile?.id || undefined,
          isTemplatePrompt: !!selectedPost,
          templateTitle: selectedPost?.title,
          templateDescription: selectedPost?.description,
          templateWhyItWorks: selectedPost?.why_it_works,
          templateCategory: selectedPost?.category,
          templateData: selectedPost ? {
            templateId: selectedPost.id,
            promptTemplate: selectedPost.prompt_template,
            variableValues: variableValues
          } : undefined,
          styleProfileId: selectedStyleId || undefined
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const data = await res.json()
      setPosts(data.posts)

      const refreshFn = (window as unknown as { refreshGenerationCounter?: () => void }).refreshGenerationCounter
      if (refreshFn) refreshFn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  // Parse posts that might be combined with --- delimiters
  const parsedPosts = useMemo(() => {
    if (posts.length === 0) return []
    
    // If we have multiple posts already separated, return them
    if (posts.length > 1) return posts
    
    // Otherwise, try to parse a single combined post
    const content = posts[0]?.content || ''
    
    // Split by --- delimiter pattern (handles various formats)
    const sections = content.split(/\n---+\n/).filter(s => s.trim())
    
    if (sections.length <= 1) {
      // Try alternate format: numbered sections like "1\n" or "---\n1\n"
      const numberedPattern = /(?:^|\n)---*\n*(\d+)\n([\s\S]*?)(?=\n---*\n*\d+\n|$)/g
      const matches = Array.from(content.matchAll(numberedPattern))
      
      if (matches.length > 1) {
        return matches.map((match) => ({
          content: match[2].trim().replace(/\nSave this ↓\n?---*$/i, '').trim(),
          archetype: posts[0]?.archetype || 'scroll_stopper',
          characterCount: match[2].trim().length
        }))
      }
      
      // Return original if no parsing needed
      return posts
    }
    
    // Parse the sections
    return sections
      .map(section => {
        // Clean up the section - remove leading number and "Save this" footer
        const cleaned = section
          .replace(/^---*\s*/, '')
          .replace(/^\d+\s*\n/, '')
          .replace(/\nSave this ↓\s*$/i, '')
          .trim()
        
        return {
          content: cleaned,
          archetype: posts[0]?.archetype || 'scroll_stopper',
          characterCount: cleaned.length
        }
      })
      .filter(p => p.content.length > 20) // Filter out empty/tiny sections
  }, [posts])

  // Update content for a specific post
  const updatePostContent = (index: number, newContent: string) => {
    // This updates the parsed view - for simplicity we'll work with parsedPosts
    setPosts(prev => {
      if (prev.length > 1) {
        return prev.map((p, i) => i === index ? { ...p, content: newContent, characterCount: newContent.length } : p)
      }
      // If it was a combined post, we need to reconstruct
      const newPosts = parsedPosts.map((p, i) => 
        i === index ? { ...p, content: newContent, characterCount: newContent.length } : p
      )
      return newPosts
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Generation Counter */}
      <div className="mb-6">
        <GenerationCounter />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          STEP 1: YOUR CONFIGURATION (Always visible at top)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4">Your Configuration</h2>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Post Template Selection - PRIORITY 1 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">Post Format</span>
              <span className="text-xs text-[var(--accent)] font-medium">Required</span>
            </div>
            {selectedPost ? (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedPost.title}</p>
                  <p className="text-xs text-[var(--muted)]">{selectedPost.category}</p>
                </div>
                <button 
                  onClick={() => { setSelectedPostId(null); setVariableValues({}); setActiveTab('post'); }}
                  className="p-1 hover:bg-blue-500/20 rounded"
                >
                  <X className="w-4 h-4 text-blue-400" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('post')}
                className={`w-full p-3 border-2 border-dashed rounded-lg text-sm transition-colors ${activeTab === 'post' ? 'border-blue-500/50 text-blue-400 bg-blue-500/5' : 'border-[var(--border)] text-[var(--muted)] hover:border-blue-500/50 hover:text-blue-400'}`}
              >
                + Select a post format first
              </button>
            )}
          </div>

          {/* Style Template Selection - OPTIONAL */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PenLine className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium">Voice Style</span>
              <span className="text-xs text-[var(--muted)]">Optional</span>
            </div>
            {selectedStyle ? (
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedStyle.title}</p>
                  {selectedStyle.admired_account_username && (
                    <p className="text-xs text-[var(--muted)]">@{selectedStyle.admired_account_username}</p>
                  )}
                </div>
                <button 
                  onClick={() => { setSelectedStyleId(null); setActiveTab('style'); }}
                  className="p-1 hover:bg-purple-500/20 rounded"
                >
                  <X className="w-4 h-4 text-purple-400" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('style')}
                className={`w-full p-3 border-2 border-dashed rounded-lg text-sm text-[var(--muted)] hover:border-purple-500/50 hover:text-purple-400 transition-colors ${activeTab === 'style' ? 'border-purple-500/50 text-purple-400' : 'border-[var(--border)]'}`}
              >
                + Add a voice style
              </button>
            )}
          </div>
        </div>

        {/* Post Template Variables (if selected and has variables) */}
        {selectedPost?.variables && selectedPost.variables.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <p className="text-sm font-medium mb-3">Fill in the details for {selectedPost.title}:</p>
            <div className="grid gap-3">
              {selectedPost.variables.map(v => (
                <div key={v.name}>
                  <label className="block text-sm text-[var(--muted)] mb-1">
                    {v.label} {v.required && <span className="text-red-400">*</span>}
                  </label>
                  <textarea
                    value={variableValues[v.name] || ''}
                    onChange={(e) => setVariableValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                    placeholder={v.placeholder}
                    rows={2}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm resize-y min-h-[60px]"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Why it works hint */}
        {selectedPost?.why_it_works && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-400">
              <span className="font-medium">💡 Why this works:</span> {selectedPost.why_it_works}
            </p>
          </div>
        )}

        {/* Generate Button - inside config card for visibility */}
        <div className="mt-6 pt-4 border-t border-[var(--border)]">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="w-full py-4 bg-[var(--accent)] text-black rounded-xl font-semibold text-lg hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate 3 Options
              </>
            )}
          </button>
          {!canGenerate && (
            <p className="text-center text-sm text-[var(--muted)] mt-2">
              Select a post format to generate
            </p>
          )}
        </div>
      </div>

      {/* Error - show above template picker */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          STEP 2: TEMPLATE PICKER (Tabs for Style vs Post)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl mb-6">
        {/* Tabs - Post Formats first (priority), Voice Styles second (optional) */}
        <div className="flex border-b border-[var(--border)]">
          <button
            onClick={() => { setActiveTab('post'); setTemplateType('post'); }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'post' && templateType === 'post'
                ? 'text-blue-400 border-b-2 border-blue-400 -mb-px'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <Layers className="w-4 h-4" />
            Single Posts ({filteredPostTemplates.length})
          </button>
          <button
            onClick={() => { setActiveTab('post'); setTemplateType('thread'); }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'post' && templateType === 'thread'
                ? 'text-emerald-400 border-b-2 border-emerald-400 -mb-px'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <Layers className="w-4 h-4" />
            Threads ({filteredThreadTemplates.length})
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'style'
                ? 'text-purple-400 border-b-2 border-purple-400 -mb-px'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <PenLine className="w-4 h-4" />
            Voice Styles ({styleTemplates.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'post' && templateType === 'post' ? (
            // Single Post Templates Grid
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredPostTemplates.map(template => {
                const colors = CATEGORY_COLORS[template.category] || { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' }
                return (
                  <button
                    key={template.id}
                    onClick={() => { setSelectedPostId(template.id); setVariableValues({}); }}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      selectedPostId === template.id
                        ? 'bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/30'
                        : 'bg-[var(--background)] border-[var(--border)] hover:border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium text-sm">{template.title}</span>
                      {selectedPostId === template.id && (
                        <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded ${colors.bg} ${colors.text} ${colors.border} border`}>
                      {template.category}
                    </span>
                    {template.description && (
                      <p className="text-xs text-[var(--muted)] mt-2 line-clamp-2">{template.description}</p>
                    )}
                  </button>
                )
              })}
            </div>
          ) : activeTab === 'post' && templateType === 'thread' ? (
            // Thread Templates Grid
            filteredThreadTemplates.length === 0 ? (
              <div className="text-center py-8">
                <Layers className="w-10 h-10 text-[var(--muted)] mx-auto mb-3" />
                <p className="text-[var(--muted)] mb-2">No thread templates yet</p>
                <p className="text-xs text-[var(--muted)]">Thread templates coming soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredThreadTemplates.map(template => {
                  const colors = { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' }
                  return (
                    <button
                      key={template.id}
                      onClick={() => { setSelectedPostId(template.id); setVariableValues({}); }}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        selectedPostId === template.id
                          ? 'bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-500/30'
                          : 'bg-[var(--background)] border-[var(--border)] hover:border-emerald-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium text-sm">{template.title}</span>
                        {selectedPostId === template.id && (
                          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        )}
                      </div>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded ${colors.bg} ${colors.text} ${colors.border} border`}>
                        thread
                      </span>
                      {template.description && (
                        <p className="text-xs text-[var(--muted)] mt-2 line-clamp-2">{template.description}</p>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          ) : (
            // Style Templates Grid (Optional)
            styleTemplates.length === 0 ? (
              <div className="text-center py-8">
                <PenLine className="w-10 h-10 text-[var(--muted)] mx-auto mb-3" />
                <p className="text-[var(--muted)] mb-2">No voice styles yet</p>
                <Link href="/customization" className="text-purple-400 hover:underline text-sm">
                  Create your first style template →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {styleTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedStyleId(template.id)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      selectedStyleId === template.id
                        ? 'bg-purple-500/10 border-purple-500/50 ring-2 ring-purple-500/30'
                        : 'bg-[var(--background)] border-[var(--border)] hover:border-purple-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium text-sm">{template.title}</span>
                      {selectedStyleId === template.id && (
                        <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      )}
                    </div>
                    {template.admired_account_username && (
                      <p className="text-xs text-[var(--muted)]">@{template.admired_account_username}</p>
                    )}
                    {template.description && (
                      <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{template.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          GENERATED POSTS
          ═══════════════════════════════════════════════════════════════ */}
      {parsedPosts.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Options ({parsedPosts.length})</h2>
            <button
              onClick={() => { setPosts([]); handleGenerate(); }}
              className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {parsedPosts.map((post, idx) => (
              <div key={idx} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--background)]/50">
                  <span className="text-sm text-[var(--muted)]">Option {idx + 1}</span>
                </div>
                
                {/* Content */}
                <div className="p-4 flex-1">
                  <p className="whitespace-pre-wrap leading-relaxed text-sm">{post.content}</p>
                </div>
                
                {/* Footer with tools and buttons */}
                <div className="px-4 py-3 bg-[var(--background)] border-t border-[var(--border)] space-y-3">
                  {/* Character count */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted)]">Characters</span>
                    <span className={`font-mono ${post.characterCount > 280 ? 'text-red-400' : post.characterCount > 250 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {post.characterCount}/280
                    </span>
                  </div>
                  
                  {/* Editing Tools */}
                  <EditingTools
                    content={post.content}
                    onContentChange={(newContent) => updatePostContent(idx, newContent)}
                    isThread={false}
                  />
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(post.content, idx)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg text-sm transition-colors"
                    >
                      {copiedIndex === idx ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedIndex === idx ? 'Copied' : 'Copy'}
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg text-sm transition-colors">
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--accent)] text-black rounded-lg text-sm font-medium transition-colors">
                      <Calendar className="w-4 h-4" />
                      Schedule
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  )
}

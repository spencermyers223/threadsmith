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
  RefreshCw
} from 'lucide-react'
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

  // UI state
  const [activeTab, setActiveTab] = useState<'style' | 'post'>('style')
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

  // Check if can generate - need at least one template selected
  const canGenerate = selectedStyleId || selectedPostId

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

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedPost?.title || 'Generate using selected templates',
          length: 'standard',
          tone: 'casual',
          postType: 'all',
          sourceFileId: selectedFile?.id || undefined,
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
          {/* Style Template Selection */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PenLine className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium">Voice Style</span>
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
                + Select a voice style
              </button>
            )}
          </div>

          {/* Post Template Selection */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">Post Format</span>
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
                className={`w-full p-3 border-2 border-dashed rounded-lg text-sm text-[var(--muted)] hover:border-blue-500/50 hover:text-blue-400 transition-colors ${activeTab === 'post' ? 'border-blue-500/50 text-blue-400' : 'border-[var(--border)]'}`}
              >
                + Select a post format
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
                  <input
                    type="text"
                    value={variableValues[v.name] || ''}
                    onChange={(e) => setVariableValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                    placeholder={v.placeholder}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
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
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          STEP 2: TEMPLATE PICKER (Tabs for Style vs Post)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl mb-6">
        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
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
          <button
            onClick={() => setActiveTab('post')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'post'
                ? 'text-blue-400 border-b-2 border-blue-400 -mb-px'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <Layers className="w-4 h-4" />
            Post Formats ({postTemplates.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'style' ? (
            // Style Templates Grid
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
          ) : (
            // Post Templates Grid
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {postTemplates.map(template => {
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
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          STEP 3: GENERATE BUTTON
          ═══════════════════════════════════════════════════════════════ */}
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

      {/* Helper text */}
      {!canGenerate && (
        <p className="text-center text-sm text-[var(--muted)] mt-2">
          Select a voice style or post format to generate
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          GENERATED POSTS
          ═══════════════════════════════════════════════════════════════ */}
      {posts.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Options</h2>
            <button
              onClick={() => { setPosts([]); handleGenerate(); }}
              className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
          </div>
          
          <div className="grid gap-4">
            {posts.map((post, idx) => (
              <div key={idx} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="p-4">
                  <p className="whitespace-pre-wrap leading-relaxed">{post.content}</p>
                </div>
                <div className="px-4 py-3 bg-[var(--background)] border-t border-[var(--border)] flex items-center justify-between">
                  <span className={`text-sm font-mono ${post.characterCount > 280 ? 'text-red-400' : 'text-[var(--muted)]'}`}>
                    {post.characterCount}/280
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(post.content, idx)}
                      className="px-3 py-1.5 bg-[var(--border)] hover:bg-[var(--muted)]/30 rounded-lg text-sm flex items-center gap-1.5"
                    >
                      {copiedIndex === idx ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      {copiedIndex === idx ? 'Copied' : 'Copy'}
                    </button>
                    <button className="px-3 py-1.5 bg-[var(--accent)] text-black rounded-lg text-sm flex items-center gap-1.5 font-medium">
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

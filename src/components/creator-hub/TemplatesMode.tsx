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
  Plus,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Layers,
  FileText,
  PenLine,
  Bookmark,
  AlertCircle,
  Trash2
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

interface Preset {
  id: string
  name: string
  style_template_id: string
  post_template_id: string
  attached_file_ids: string[]
  style_template?: StyleTemplate
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
  archetype: 'scroll_stopper' | 'debate_starter' | 'viral_catalyst'
  characterCount: number
}

interface TemplatesModeProps {
  selectedFile: FileRecord | null
  onOpenSidebar: () => void
  onClearFile: () => void
}

// Category colors
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  alpha: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  'build-in-public': { bg: 'bg-pink-500/10', text: 'text-pink-400' },
  contrarian: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  engagement: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
}

export default function TemplatesMode({ selectedFile, onOpenSidebar, onClearFile }: TemplatesModeProps) {
  const { activeAccount } = useXAccount()
  const supabase = createClient()

  // State
  const [topic, setTopic] = useState('')
  const [presets, setPresets] = useState<Preset[]>([])
  const [styleTemplates, setStyleTemplates] = useState<StyleTemplate[]>([])
  const [postTemplates, setPostTemplates] = useState<PostTemplate[]>([])
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [posts, setPosts] = useState<GeneratedPost[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Preset creation state
  const [creatingPreset, setCreatingPreset] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [selectedStyleTemplateId, setSelectedStyleTemplateId] = useState<string | null>(null)
  const [selectedPostTemplateId, setSelectedPostTemplateId] = useState<string | null>(null)
  const [savingPreset, setSavingPreset] = useState(false)

  // Template variable values (for selected post template)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState({
    presets: true,
    styleTemplates: false,
    postTemplates: false
  })

  // Fetch data on mount
  useEffect(() => {
    fetchData()
  }, [activeAccount?.id])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch presets
      const presetsRes = await fetch(
        `/api/presets${activeAccount?.id ? `?x_account_id=${activeAccount.id}` : ''}`,
        { credentials: 'include' }
      )
      if (presetsRes.ok) {
        const data = await presetsRes.json()
        setPresets(data.presets || [])
      }

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
      const { data: templates, error: templatesError } = await supabase
        .from('post_templates')
        .select('*')
        .order('category', { ascending: true })

      if (!templatesError && templates) {
        setPostTemplates(templates)
      }
    } catch (error) {
      console.error('Error fetching templates data:', error)
    }
    setLoading(false)
  }

  // Get selected post template
  const selectedPostTemplate = useMemo(() => {
    const templateId = selectedPreset?.post_template_id || selectedPostTemplateId
    return postTemplates.find(t => t.id === templateId)
  }, [postTemplates, selectedPreset, selectedPostTemplateId])

  // Get selected style template
  const selectedStyleTemplate = useMemo(() => {
    const templateId = selectedPreset?.style_template_id || selectedStyleTemplateId
    return styleTemplates.find(t => t.id === templateId)
  }, [styleTemplates, selectedPreset, selectedStyleTemplateId])

  // Check if can generate
  const canGenerate = useMemo(() => {
    if (!topic.trim()) return false
    if (selectedPreset) return true
    if (selectedStyleTemplateId && selectedPostTemplateId) return true
    return false
  }, [topic, selectedPreset, selectedStyleTemplateId, selectedPostTemplateId])

  // Handle preset selection
  const selectPreset = (preset: Preset) => {
    setSelectedPreset(preset)
    setCreatingPreset(false)
    setSelectedStyleTemplateId(null)
    setSelectedPostTemplateId(null)
    setVariableValues({})
  }

  // Handle preset creation
  const savePreset = async () => {
    if (!newPresetName || !selectedStyleTemplateId || !selectedPostTemplateId) return

    setSavingPreset(true)
    try {
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newPresetName,
          style_template_id: selectedStyleTemplateId,
          post_template_id: selectedPostTemplateId,
          attached_file_ids: selectedFile ? [selectedFile.id] : [],
          x_account_id: activeAccount?.id || null
        })
      })

      if (res.ok) {
        const data = await res.json()
        setPresets(prev => [data.preset, ...prev])
        setSelectedPreset(data.preset)
        setCreatingPreset(false)
        setNewPresetName('')
        setSelectedStyleTemplateId(null)
        setSelectedPostTemplateId(null)
      }
    } catch (error) {
      console.error('Error saving preset:', error)
    }
    setSavingPreset(false)
  }

  // Handle generation
  const handleGenerate = async () => {
    if (!canGenerate) return

    setGenerating(true)
    setError(null)
    setPosts([])

    try {
      // Check usage
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
          topic: topic.trim(),
          length: 'standard',
          tone: 'casual',
          postType: 'all',
          sourceFileId: selectedFile?.id || undefined,
          templateData: selectedPostTemplate ? {
            templateId: selectedPostTemplate.id,
            promptTemplate: selectedPostTemplate.prompt_template,
            variableValues: variableValues
          } : undefined,
          styleProfileId: selectedStyleTemplate?.id || undefined
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const data = await res.json()
      setPosts(data.posts)

      // Refresh generation counter
      const refreshFn = (window as unknown as { refreshGenerationCounter?: () => void }).refreshGenerationCounter
      if (refreshFn) refreshFn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  // Delete preset
  const deletePreset = async (id: string) => {
    if (!confirm('Delete this preset?')) return

    try {
      const res = await fetch(`/api/presets/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (res.ok) {
        setPresets(prev => prev.filter(p => p.id !== id))
        if (selectedPreset?.id === id) {
          setSelectedPreset(null)
        }
      }
    } catch (error) {
      console.error('Error deleting preset:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Generation Counter */}
      <GenerationCounter />

      {/* Topic Input */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <label className="block text-sm font-medium mb-2">What do you want to write about?</label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter your topic, idea, or raw thoughts..."
          rows={3}
          className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none"
        />
        {selectedFile && (
          <div className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]">
            <FileText className="w-4 h-4" />
            Using file: {selectedFile.name}
            <button onClick={onClearFile} className="text-red-400 hover:underline">Remove</button>
          </div>
        )}
      </div>

      {/* Presets Section */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--border)]/30 transition-colors"
          onClick={() => setExpandedSections(prev => ({ ...prev, presets: !prev.presets }))}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent)]/10">
              <Bookmark className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="font-semibold">Your Presets</h2>
              <p className="text-sm text-[var(--muted)]">Quick-start with saved combinations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setCreatingPreset(true); setSelectedPreset(null); }}
              className="px-3 py-1.5 bg-[var(--accent)] text-black rounded-lg text-sm font-medium hover:bg-[var(--accent)]/90 transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              New Preset
            </button>
            {expandedSections.presets ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>

        {expandedSections.presets && (
          <div className="p-4 pt-0 space-y-3">
            {/* Active preset indicator */}
            {selectedPreset && (
              <div className="p-3 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[var(--accent)]" />
                  <span className="font-medium">Using: {selectedPreset.name}</span>
                </div>
                <button onClick={() => setSelectedPreset(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Preset creation form */}
            {creatingPreset && (
              <div className="p-4 bg-[var(--background)] border border-dashed border-[var(--border)] rounded-lg space-y-4">
                <h3 className="font-medium">Create New Preset</h3>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Preset name..."
                  className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                />
                <p className="text-sm text-[var(--muted)]">Select a style template and post template below, then save.</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Style: {selectedStyleTemplateId ? styleTemplates.find(s => s.id === selectedStyleTemplateId)?.title : 'None selected'}</span>
                  <span className="text-[var(--muted)]">|</span>
                  <span className="text-sm">Post: {selectedPostTemplateId ? postTemplates.find(p => p.id === selectedPostTemplateId)?.title : 'None selected'}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setCreatingPreset(false); setNewPresetName(''); }}
                    className="px-3 py-1.5 text-[var(--muted)] hover:bg-[var(--border)] rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={savePreset}
                    disabled={!newPresetName || !selectedStyleTemplateId || !selectedPostTemplateId || savingPreset}
                    className="px-3 py-1.5 bg-[var(--accent)] text-black rounded-lg text-sm font-medium hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingPreset ? 'Saving...' : 'Save Preset'}
                  </button>
                </div>
              </div>
            )}

            {/* Preset list */}
            {presets.length === 0 && !creatingPreset ? (
              <p className="text-sm text-[var(--muted)] text-center py-4">
                No presets yet.{' '}
                <Link href="/customization" className="text-[var(--accent)] hover:underline">
                  Create style templates
                </Link>{' '}
                first, then create presets here.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {presets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => selectPreset(preset)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedPreset?.id === preset.id
                        ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                        : 'bg-[var(--background)] border-[var(--border)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {preset.name}
                    <button
                      onClick={(e) => { e.stopPropagation(); deletePreset(preset.id); }}
                      className="p-0.5 hover:bg-black/20 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Style Templates Section */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--border)]/30 transition-colors"
          onClick={() => setExpandedSections(prev => ({ ...prev, styleTemplates: !prev.styleTemplates }))}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <PenLine className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-semibold">Style Templates</h2>
              <p className="text-sm text-[var(--muted)]">Writing styles from admired accounts</p>
            </div>
          </div>
          {expandedSections.styleTemplates ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>

        {expandedSections.styleTemplates && (
          <div className="p-4 pt-0 space-y-3">
            {styleTemplates.length === 0 ? (
              <p className="text-sm text-[var(--muted)] text-center py-4">
                No style templates yet.{' '}
                <Link href="/customization" className="text-[var(--accent)] hover:underline">
                  Create one in Customization
                </Link>
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {styleTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedStyleTemplateId(template.id)
                      if (!selectedPreset) setSelectedPreset(null)
                    }}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedStyleTemplateId === template.id || selectedPreset?.style_template_id === template.id
                        ? 'bg-purple-500/10 border-purple-500/30'
                        : 'bg-[var(--background)] border-[var(--border)] hover:border-purple-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{template.title}</span>
                      {(selectedStyleTemplateId === template.id || selectedPreset?.style_template_id === template.id) && (
                        <Check className="w-4 h-4 text-purple-400" />
                      )}
                    </div>
                    {template.admired_account_username && (
                      <p className="text-xs text-[var(--muted)] mt-1">@{template.admired_account_username}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Templates Section */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--border)]/30 transition-colors"
          onClick={() => setExpandedSections(prev => ({ ...prev, postTemplates: !prev.postTemplates }))}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold">Post Templates</h2>
              <p className="text-sm text-[var(--muted)]">Proven formats for engagement</p>
            </div>
          </div>
          {expandedSections.postTemplates ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>

        {expandedSections.postTemplates && (
          <div className="p-4 pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {postTemplates.map(template => {
                const colors = CATEGORY_COLORS[template.category] || { bg: 'bg-gray-500/10', text: 'text-gray-400' }
                return (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedPostTemplateId(template.id)
                      if (!selectedPreset) setSelectedPreset(null)
                      setVariableValues({})
                    }}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedPostTemplateId === template.id || selectedPreset?.post_template_id === template.id
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-[var(--background)] border-[var(--border)] hover:border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{template.title}</span>
                      {(selectedPostTemplateId === template.id || selectedPreset?.post_template_id === template.id) && (
                        <Check className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                        {template.category}
                      </span>
                      {template.difficulty && (
                        <span className="text-xs text-[var(--muted)]">{template.difficulty}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Template Details */}
      {selectedPostTemplate && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <h3 className="font-semibold mb-2">{selectedPostTemplate.title}</h3>
          {selectedPostTemplate.description && (
            <p className="text-sm text-[var(--muted)] mb-3">{selectedPostTemplate.description}</p>
          )}
          {selectedPostTemplate.why_it_works && (
            <div className="p-3 bg-[var(--accent)]/10 rounded-lg mb-3">
              <p className="text-sm"><span className="font-medium">💡 Why this works:</span> {selectedPostTemplate.why_it_works}</p>
            </div>
          )}
          {selectedPostTemplate.variables && selectedPostTemplate.variables.length > 0 && (
            <div className="space-y-3">
              {selectedPostTemplate.variables.map(variable => (
                <div key={variable.name}>
                  <label className="block text-sm font-medium mb-1">
                    {variable.label} {variable.required && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="text"
                    value={variableValues[variable.name] || ''}
                    onChange={(e) => setVariableValues(prev => ({ ...prev, [variable.name]: e.target.value }))}
                    placeholder={variable.placeholder}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generate Button */}
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

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Generated Posts */}
      {posts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Generated Posts</h2>
          {posts.map((post, idx) => (
            <div key={idx} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <p className="whitespace-pre-wrap">{post.content}</p>
              <div className="mt-3 flex items-center justify-between text-sm text-[var(--muted)]">
                <span>{post.characterCount} characters</span>
                <span className="capitalize">{post.archetype.replace('_', ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  )
}

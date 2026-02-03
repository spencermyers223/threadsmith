'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useXAccount } from '@/contexts/XAccountContext'
import {
  X,
  Sparkles,
  MessageSquare,
  Layers,
  PenLine,
  Check,
  Loader2,
  Zap
} from 'lucide-react'

interface StyleTemplate {
  id: string
  title: string
  description: string | null
  admired_account_username: string | null
  content_type: 'tweet' | 'thread' | 'article'
}

interface PostTemplate {
  id: string
  title: string
  category: string
  description: string | null
  content_type?: 'post' | 'thread'
}

interface PresetCreatorModalProps {
  isOpen: boolean
  onClose: () => void
  onPresetCreated: (preset: Preset) => void
}

interface Preset {
  id: string
  name: string
  content_type: 'tweet' | 'thread'
  style_template_id: string | null
  post_template_id: string
  style_template?: StyleTemplate
}

export default function PresetCreatorModal({ isOpen, onClose, onPresetCreated }: PresetCreatorModalProps) {
  const { activeAccount } = useXAccount()
  const supabase = createClient()

  // Form state
  const [name, setName] = useState('')
  const [contentType, setContentType] = useState<'tweet' | 'thread'>('tweet')
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)

  // Data state
  const [styleTemplates, setStyleTemplates] = useState<StyleTemplate[]>([])
  const [postTemplates, setPostTemplates] = useState<PostTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch templates
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

    if (isOpen) {
      fetchData()
    }
  }, [isOpen, activeAccount?.id, supabase])

  // Filter post templates by content type
  const filteredPostTemplates = useMemo(() => {
    if (contentType === 'tweet') {
      return postTemplates.filter(t => (t.content_type || 'post') === 'post' && t.category !== 'thread')
    } else {
      return postTemplates.filter(t => t.content_type === 'thread' || t.category === 'thread')
    }
  }, [postTemplates, contentType])

  // Filter style templates by content type
  // Tweet presets can use tweet style templates
  // Thread presets can use thread style templates
  // Article style templates are not used in presets (only in Brain Dump)
  const filteredStyleTemplates = useMemo(() => {
    return styleTemplates.filter(t => {
      const styleType = t.content_type || 'tweet'
      if (contentType === 'tweet') {
        return styleType === 'tweet'
      } else {
        return styleType === 'thread'
      }
    })
  }, [styleTemplates, contentType])

  // Reset selections when content type changes
  useEffect(() => {
    setSelectedPostId(null)
    setSelectedStyleId(null)
  }, [contentType])

  // Get selected items for preview
  const selectedStyle = useMemo(() => 
    styleTemplates.find(t => t.id === selectedStyleId),
    [styleTemplates, selectedStyleId]
  )
  const selectedPost = useMemo(() => 
    postTemplates.find(t => t.id === selectedPostId),
    [postTemplates, selectedPostId]
  )

  // Can save?
  const canSave = name.trim() && selectedPostId

  // Handle save
  const handleSave = async () => {
    if (!canSave) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          content_type: contentType,
          style_template_id: selectedStyleId || null,
          post_template_id: selectedPostId,
          x_account_id: activeAccount?.id || null
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create preset')
      }

      const { preset } = await res.json()
      onPresetCreated(preset)
      
      // Reset form
      setName('')
      setContentType('tweet')
      setSelectedStyleId(null)
      setSelectedPostId(null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl">
        {/* Header with gradient */}
        <div className="relative px-6 py-5 border-b border-[var(--border)] bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-emerald-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--accent)] rounded-lg">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Create a Preset</h2>
                <p className="text-sm text-[var(--muted)]">Save your favorite combination for quick access</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--border)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Preset Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Preset Name <span className="text-[var(--accent)]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Daily Crypto Alpha, Build in Public Updates..."
                  className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 text-lg"
                />
              </div>

              {/* Content Type Toggle */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  What type of content? <span className="text-[var(--accent)]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setContentType('tweet')}
                    className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                      contentType === 'tweet'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-[var(--border)] hover:border-blue-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${contentType === 'tweet' ? 'bg-blue-500' : 'bg-[var(--border)]'}`}>
                        <MessageSquare className={`w-5 h-5 ${contentType === 'tweet' ? 'text-white' : 'text-[var(--muted)]'}`} />
                      </div>
                      <span className="font-semibold">Single Tweet</span>
                      {contentType === 'tweet' && (
                        <Check className="w-5 h-5 text-blue-500 ml-auto" />
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      Perfect for quick updates, hot takes, and engaging posts
                    </p>
                  </button>

                  <button
                    onClick={() => setContentType('thread')}
                    className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                      contentType === 'thread'
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-[var(--border)] hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${contentType === 'thread' ? 'bg-emerald-500' : 'bg-[var(--border)]'}`}>
                        <Layers className={`w-5 h-5 ${contentType === 'thread' ? 'text-white' : 'text-[var(--muted)]'}`} />
                      </div>
                      <span className="font-semibold">Thread</span>
                      {contentType === 'thread' && (
                        <Check className="w-5 h-5 text-emerald-500 ml-auto" />
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      Deep dives, tutorials, and storytelling across multiple tweets
                    </p>
                  </button>
                </div>
              </div>

              {/* Post Format Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Post Format <span className="text-[var(--accent)]">*</span>
                </label>
                <p className="text-sm text-[var(--muted)] mb-3">
                  Choose a template structure for your {contentType === 'tweet' ? 'tweets' : 'threads'}
                </p>
                
                {filteredPostTemplates.length === 0 ? (
                  <div className="p-4 border border-dashed border-[var(--border)] rounded-xl text-center text-[var(--muted)]">
                    No {contentType} templates available yet
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {filteredPostTemplates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedPostId(template.id)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          selectedPostId === template.id
                            ? contentType === 'tweet'
                              ? 'bg-blue-500/10 border-blue-500/50'
                              : 'bg-emerald-500/10 border-emerald-500/50'
                            : 'bg-[var(--background)] border-[var(--border)] hover:border-[var(--accent)]/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{template.title}</span>
                          {selectedPostId === template.id && (
                            <Check className={`w-4 h-4 ${contentType === 'tweet' ? 'text-blue-500' : 'text-emerald-500'}`} />
                          )}
                        </div>
                        {template.description && (
                          <p className="text-xs text-[var(--muted)] mt-1 line-clamp-1">{template.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Voice Style (Optional) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Voice Style <span className="text-[var(--muted)] text-xs font-normal">(optional)</span>
                </label>
                <p className="text-sm text-[var(--muted)] mb-3">
                  Add a {contentType === 'tweet' ? 'tweet' : 'thread'} voice style to match a specific writing style
                </p>
                
                {filteredStyleTemplates.length === 0 ? (
                  <div className="p-4 border border-dashed border-[var(--border)] rounded-xl text-center text-[var(--muted)]">
                    <PenLine className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No {contentType} voice styles created yet</p>
                    <p className="text-xs mt-1">Create one in Customization → Style Templates</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {filteredStyleTemplates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedStyleId(selectedStyleId === template.id ? null : template.id)}
                        className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                          selectedStyleId === template.id
                            ? 'bg-purple-500/10 border-purple-500/50 text-purple-400'
                            : 'bg-[var(--background)] border-[var(--border)] hover:border-purple-500/30'
                        }`}
                      >
                        {template.title}
                        {template.admired_account_username && (
                          <span className="text-xs text-[var(--muted)] ml-1">(@{template.admired_account_username})</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview Card */}
              {(selectedPost || selectedStyle) && (
                <div className="p-4 bg-gradient-to-br from-[var(--background)] to-[var(--card)] border border-[var(--border)] rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-[var(--accent)]" />
                    <span className="text-sm font-medium">Preview</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-[var(--muted)]">Type:</span>{' '}
                      <span className={contentType === 'tweet' ? 'text-blue-400' : 'text-emerald-400'}>
                        {contentType === 'tweet' ? 'Single Tweet' : 'Thread'}
                      </span>
                    </p>
                    {selectedPost && (
                      <p>
                        <span className="text-[var(--muted)]">Format:</span>{' '}
                        <span>{selectedPost.title}</span>
                      </p>
                    )}
                    {selectedStyle && (
                      <p>
                        <span className="text-[var(--muted)]">Voice:</span>{' '}
                        <span className="text-purple-400">{selectedStyle.title}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--background)]/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-6 py-2.5 bg-[var(--accent)] text-black rounded-lg font-semibold hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Create Preset
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

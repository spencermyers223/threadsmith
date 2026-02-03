'use client'

import { useState, useEffect } from 'react'
import { useXAccount } from '@/contexts/XAccountContext'
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
  Target,
  MessageSquare,
  Check,
  AlertCircle,
  Loader2,
  X,
  Save,
  PenLine
} from 'lucide-react'
import Link from 'next/link'

// Types
interface StyleTemplate {
  id: string
  title: string
  description: string | null
  admired_account_username: string | null
  admired_account_display_name: string | null
  admired_account_avatar_url: string | null
  tweets: Array<{ text: string; url?: string; added_at: string }>
  created_at: string
  updated_at: string
}

interface UserCustomization {
  tone_preferences: {
    formality?: 'casual' | 'professional' | 'mixed'
    humor?: number
    energy?: number
  }
  content_niches: string[]
  goals_audience: string | null
  style_description: string | null
  admired_accounts: string[]
  outreach_templates: Array<{
    id: string
    name: string
    content: string
    category: string
  }>
}

// Toast Component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-float flex items-center gap-3 animate-fade-in-up z-50 ${
      type === 'success' 
        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' 
        : 'bg-red-500/20 border border-red-500/30 text-red-400'
    }`}>
      {type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span>{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-[var(--border)] rounded">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Section Header Component
function SectionHeader({ 
  title, 
  icon: Icon, 
  expanded, 
  onToggle,
  action
}: { 
  title: string
  icon: React.ElementType
  expanded: boolean
  onToggle: () => void
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--border)]/30 rounded-t-xl transition-colors"
         onClick={onToggle}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[var(--accent)]/10">
          <Icon className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
        {expanded ? <ChevronUp className="w-5 h-5 text-[var(--muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--muted)]" />}
      </div>
    </div>
  )
}

// Style Template Card Component
function StyleTemplateCard({ 
  template, 
  onEdit, 
  onDelete 
}: { 
  template: StyleTemplate
  onEdit: () => void
  onDelete: () => void 
}) {
  const [expanded, setExpanded] = useState(false)
  const tweetCount = template.tweets?.length || 0

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-[var(--border)]/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{template.title}</h3>
            {template.description && (
              <p className="text-[var(--muted)] text-sm mt-1">{template.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-[var(--muted)]">
              {template.admired_account_username && (
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  @{template.admired_account_username}
                </span>
              )}
              <span>{tweetCount}/5 tweets</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-2 hover:bg-[var(--border)] rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4 text-[var(--muted)]" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {expanded && template.tweets && template.tweets.length > 0 && (
        <div className="border-t border-[var(--border)] p-4 space-y-3 max-h-64 overflow-y-auto">
          {template.tweets.map((tweet, idx) => (
            <div key={idx} className="bg-[var(--background)] p-3 rounded-lg text-sm">
              <p className="whitespace-pre-wrap">{tweet.text}</p>
              {tweet.url && (
                <a href={tweet.url} target="_blank" rel="noopener noreferrer" 
                   className="text-[var(--accent)] text-xs mt-2 inline-block hover:underline">
                  View original →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Style Template Editor Modal
function StyleTemplateEditor({
  template,
  onSave,
  onCancel,
  saving
}: {
  template: Partial<StyleTemplate> | null
  onSave: (data: Partial<StyleTemplate>) => void
  onCancel: () => void
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    title: template?.title || '',
    description: template?.description || '',
    admired_account_username: template?.admired_account_username || '',
    tweets: template?.tweets || []
  })

  const addTweetSlot = () => {
    if (formData.tweets.length < 5) {
      setFormData({
        ...formData,
        tweets: [...formData.tweets, { text: '', url: '', added_at: new Date().toISOString() }]
      })
    }
  }

  const updateTweet = (idx: number, field: 'text' | 'url', value: string) => {
    const newTweets = [...formData.tweets]
    newTweets[idx] = { ...newTweets[idx], [field]: value }
    setFormData({ ...formData, tweets: newTweets })
  }

  const removeTweet = (idx: number) => {
    setFormData({
      ...formData,
      tweets: formData.tweets.filter((_, i) => i !== idx)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {template?.id ? 'Edit Style Template' : 'Create Style Template'}
          </h2>
          <button onClick={onCancel} className="p-2 hover:bg-[var(--border)] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Template Name *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Naval Ravikant Style"
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this style"
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            />
          </div>

          {/* Admired Account */}
          <div>
            <label className="block text-sm font-medium mb-2">Admired Account</label>
            <div className="flex items-center gap-2">
              <span className="text-[var(--muted)]">@</span>
              <input
                type="text"
                value={formData.admired_account_username}
                onChange={(e) => setFormData({ ...formData, admired_account_username: e.target.value.replace('@', '') })}
                placeholder="username"
                className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              />
            </div>
          </div>

          {/* Tweet Slots */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Example Tweets ({formData.tweets.length}/5)</label>
              {formData.tweets.length < 5 && (
                <button
                  onClick={addTweetSlot}
                  className="text-sm text-[var(--accent)] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Tweet
                </button>
              )}
            </div>
            <p className="text-xs text-[var(--muted)] mb-3">
              Add up to 5 tweets that represent this style. You can add more later.
            </p>
            
            <div className="space-y-3">
              {formData.tweets.map((tweet, idx) => (
                <div key={idx} className="bg-[var(--background)] p-3 rounded-lg border border-[var(--border)]">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-[var(--muted)]">Tweet {idx + 1}</span>
                    <button
                      onClick={() => removeTweet(idx)}
                      className="p-1 hover:bg-red-500/20 rounded"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                  <textarea
                    value={tweet.text}
                    onChange={(e) => updateTweet(idx, 'text', e.target.value)}
                    placeholder="Paste tweet text here..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 text-sm resize-none"
                  />
                  <input
                    type="text"
                    value={tweet.url || ''}
                    onChange={(e) => updateTweet(idx, 'url', e.target.value)}
                    placeholder="Tweet URL (optional)"
                    className="w-full mt-2 px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 text-sm"
                  />
                </div>
              ))}

              {formData.tweets.length === 0 && (
                <div className="text-center py-8 text-[var(--muted)]">
                  <p className="mb-2">No tweets added yet</p>
                  <button
                    onClick={addTweetSlot}
                    className="text-[var(--accent)] hover:underline"
                  >
                    Add your first tweet →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border)] flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[var(--muted)] hover:bg-[var(--border)] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            disabled={!formData.title || saving}
            className="px-4 py-2 bg-[var(--accent)] text-black rounded-lg hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Template
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CustomizationPage() {
  const { activeAccount } = useXAccount()
  
  // State
  const [styleTemplates, setStyleTemplates] = useState<StyleTemplate[]>([])
  const [customization, setCustomization] = useState<UserCustomization>({
    tone_preferences: {},
    content_niches: [],
    goals_audience: null,
    style_description: null,
    admired_accounts: [],
    outreach_templates: []
  })
  const [originalCustomization, setOriginalCustomization] = useState<UserCustomization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingCustomization, setSavingCustomization] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  
  // Check if customization has unsaved changes
  const hasUnsavedChanges = originalCustomization && (
    customization.style_description !== originalCustomization.style_description ||
    customization.goals_audience !== originalCustomization.goals_audience ||
    JSON.stringify(customization.content_niches) !== JSON.stringify(originalCustomization.content_niches)
  )

  // Section expansion state
  const [expandedSections, setExpandedSections] = useState({
    styleTemplates: true,
    tone: false,
    niches: false,
    goals: false,
    styleDescription: false
  })

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<StyleTemplate | null>(null)

  // Fetch data on mount
  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch style templates
      const templatesRes = await fetch(
        `/api/style-templates${activeAccount?.id ? `?x_account_id=${activeAccount.id}` : ''}`,
        { credentials: 'include' }
      )
      if (templatesRes.ok) {
        const data = await templatesRes.json()
        setStyleTemplates(data.templates || [])
      }

      // Fetch customization
      const customRes = await fetch(
        `/api/user-customization${activeAccount?.id ? `?x_account_id=${activeAccount.id}` : ''}`,
        { credentials: 'include' }
      )
      if (customRes.ok) {
        const data = await customRes.json()
        const customData = data.customization || {
          tone_preferences: {},
          content_niches: [],
          goals_audience: null,
          style_description: null,
          admired_accounts: [],
          outreach_templates: []
        }
        setCustomization(customData)
        setOriginalCustomization(JSON.parse(JSON.stringify(customData))) // Deep copy for comparison
      }
    } catch (error) {
      console.error('Error fetching customization data:', error)
      setToast({ message: 'Failed to load customization data', type: 'error' })
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [activeAccount?.id, fetchData])

  // Save style template
  const saveStyleTemplate = async (data: Partial<StyleTemplate>) => {
    setSaving(true)
    try {
      const url = editingTemplate?.id 
        ? `/api/style-templates/${editingTemplate.id}`
        : '/api/style-templates'
      
      const res = await fetch(url, {
        method: editingTemplate?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          x_account_id: activeAccount?.id || null
        })
      })

      if (res.ok) {
        const result = await res.json()
        if (editingTemplate?.id) {
          setStyleTemplates(templates => 
            templates.map(t => t.id === editingTemplate.id ? result.template : t)
          )
        } else {
          setStyleTemplates(templates => [result.template, ...templates])
        }
        setEditorOpen(false)
        setEditingTemplate(null)
        setToast({ message: 'Style template saved!', type: 'success' })
      } else {
        const error = await res.json()
        setToast({ message: error.error || 'Failed to save template', type: 'error' })
      }
    } catch (error) {
      console.error('Error saving style template:', error)
      setToast({ message: 'Failed to save template', type: 'error' })
    }
    setSaving(false)
  }

  // Delete style template
  const deleteStyleTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this style template?')) return

    try {
      const res = await fetch(`/api/style-templates/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (res.ok) {
        setStyleTemplates(templates => templates.filter(t => t.id !== id))
        setToast({ message: 'Style template deleted', type: 'success' })
      } else {
        setToast({ message: 'Failed to delete template', type: 'error' })
      }
    } catch (error) {
      console.error('Error deleting style template:', error)
      setToast({ message: 'Failed to delete template', type: 'error' })
    }
  }

  // Save customization (writing style, niches, goals)
  const saveCustomization = async () => {
    setSavingCustomization(true)
    try {
      const res = await fetch('/api/user-customization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          x_account_id: activeAccount?.id || null,
          style_description: customization.style_description,
          content_niches: customization.content_niches,
          goals_audience: customization.goals_audience,
          tone_preferences: customization.tone_preferences,
          admired_accounts: customization.admired_accounts
        })
      })

      if (res.ok) {
        // Update original to match current (no more unsaved changes)
        setOriginalCustomization(JSON.parse(JSON.stringify(customization)))
        setToast({ message: 'Customization saved!', type: 'success' })
      } else {
        const error = await res.json()
        setToast({ message: error.error || 'Failed to save', type: 'error' })
      }
    } catch (error) {
      console.error('Error saving customization:', error)
      setToast({ message: 'Failed to save customization', type: 'error' })
    }
    setSavingCustomization(false)
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/creator-hub" className="p-2 hover:bg-[var(--border)] rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[var(--accent)]" />
                Customization
              </h1>
              <p className="text-[var(--muted)] text-sm">Personalize your content generation experience</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`max-w-4xl mx-auto px-4 py-8 space-y-6 ${hasUnsavedChanges ? 'pb-24' : ''}`}>
        
        {/* Style Templates Section */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <SectionHeader
            title="Style Templates"
            icon={PenLine}
            expanded={expandedSections.styleTemplates}
            onToggle={() => toggleSection('styleTemplates')}
            action={
              <button
                onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}
                className="px-3 py-1.5 bg-[var(--accent)] text-black rounded-lg text-sm font-medium hover:bg-[var(--accent)]/90 transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Create
              </button>
            }
          />
          
          {expandedSections.styleTemplates && (
            <div className="p-4 pt-0 space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Create style templates based on accounts you admire. Add up to 5 example tweets per template.
              </p>
              
              {styleTemplates.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-[var(--border)] rounded-lg">
                  <PenLine className="w-8 h-8 text-[var(--muted)] mx-auto mb-2" />
                  <p className="text-[var(--muted)] mb-3">No style templates yet</p>
                  <button
                    onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}
                    className="text-[var(--accent)] hover:underline"
                  >
                    Create your first template →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {styleTemplates.map(template => (
                    <StyleTemplateCard
                      key={template.id}
                      template={template}
                      onEdit={() => { setEditingTemplate(template); setEditorOpen(true); }}
                      onDelete={() => deleteStyleTemplate(template.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Style Description Section */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <SectionHeader
            title="Your Writing Style"
            icon={MessageSquare}
            expanded={expandedSections.styleDescription}
            onToggle={() => toggleSection('styleDescription')}
          />
          
          {expandedSections.styleDescription && (
            <div className="p-4 pt-0">
              <p className="text-sm text-[var(--muted)] mb-3">
                Describe your unique writing voice and style in your own words.
              </p>
              <textarea
                value={customization.style_description || ''}
                onChange={(e) => setCustomization({ ...customization, style_description: e.target.value })}
                placeholder="e.g., I write punchy, contrarian takes with dry humor. I avoid buzzwords and prefer simple language..."
                rows={4}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none"
              />
            </div>
          )}
        </section>

        {/* Content Niches Section */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <SectionHeader
            title="Content Niches"
            icon={Target}
            expanded={expandedSections.niches}
            onToggle={() => toggleSection('niches')}
          />
          
          {expandedSections.niches && (
            <div className="p-4 pt-0">
              <p className="text-sm text-[var(--muted)] mb-3">
                What topics do you create content about? These help personalize suggestions.
              </p>
              <div className="flex flex-wrap gap-2">
                {['AI', 'Crypto', 'Tech', 'Startups', 'Design', 'Marketing', 'Productivity', 'Health', 'Finance', 'Web3'].map(niche => (
                  <button
                    key={niche}
                    onClick={() => {
                      const niches = customization.content_niches || []
                      setCustomization({
                        ...customization,
                        content_niches: niches.includes(niche)
                          ? niches.filter(n => n !== niche)
                          : [...niches, niche]
                      })
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      (customization.content_niches || []).includes(niche)
                        ? 'bg-[var(--accent)] text-black'
                        : 'bg-[var(--background)] border border-[var(--border)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {niche}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Goals & Audience Section */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <SectionHeader
            title="Goals & Audience"
            icon={User}
            expanded={expandedSections.goals}
            onToggle={() => toggleSection('goals')}
          />
          
          {expandedSections.goals && (
            <div className="p-4 pt-0">
              <p className="text-sm text-[var(--muted)] mb-3">
                Who are you writing for and what do you want to achieve?
              </p>
              <textarea
                value={customization.goals_audience || ''}
                onChange={(e) => setCustomization({ ...customization, goals_audience: e.target.value })}
                placeholder="e.g., I want to build an audience of developers interested in AI. My goal is to establish thought leadership and drive traffic to my SaaS product..."
                rows={4}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none"
              />
            </div>
          )}
        </section>

      </main>

      {/* Sticky Save Bar */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] p-4 shadow-float animate-fade-in-up z-40">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--muted)]">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <span>You have unsaved changes</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  // Reset to original
                  if (originalCustomization) {
                    setCustomization(JSON.parse(JSON.stringify(originalCustomization)))
                  }
                }}
                className="px-4 py-2 text-[var(--muted)] hover:bg-[var(--border)] rounded-lg transition-colors"
              >
                Discard
              </button>
              <button
                onClick={saveCustomization}
                disabled={savingCustomization}
                className="px-6 py-2 bg-[var(--accent)] text-black rounded-lg hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                {savingCustomization ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Style Template Editor Modal */}
      {editorOpen && (
        <StyleTemplateEditor
          template={editingTemplate}
          onSave={saveStyleTemplate}
          onCancel={() => { setEditorOpen(false); setEditingTemplate(null); }}
          saving={saving}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Search, Sparkles, TrendingUp, Flame, Rocket, MessageCircle,
  Clock, Target, ArrowRight, X, Loader2
} from 'lucide-react'

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

// Category config - matches actual DB categories
const CATEGORIES = [
  { id: 'all', label: 'All Templates', icon: Sparkles },
  { id: 'thread', label: 'Threads', icon: MessageCircle },
  { id: 'alpha', label: 'Alpha', icon: TrendingUp },
  { id: 'build-in-public', label: 'Build in Public', icon: Rocket },
  { id: 'contrarian', label: 'Contrarian', icon: Flame },
  { id: 'engagement', label: 'Engagement', icon: MessageCircle },
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

const ENGAGEMENT_ICONS: Record<string, typeof Target> = {
  replies: MessageCircle,
  retweets: TrendingUp,
  likes: Sparkles,
  follows: Target,
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<PostTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

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
      setLoading(false)
    }
    fetchTemplates()
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

  // Open template modal
  const openTemplate = (template: PostTemplate) => {
    setSelectedTemplate(template)
    setVariableValues({})
  }

  // Generate from template - just redirects, doesn't trigger AI yet
  const handleGenerate = async () => {
    if (!selectedTemplate) return

    // Store comprehensive template data for creator-hub to display
    const templateData = {
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

    sessionStorage.setItem('xthread-template-data', JSON.stringify(templateData))
    router.push('/creator-hub')
  }

  // Check if all required variables are filled
  const canGenerate = useMemo(() => {
    if (!selectedTemplate?.variables) return true
    return selectedTemplate.variables
      .filter(v => v.required)
      .every(v => variableValues[v.name]?.trim())
  }, [selectedTemplate, variableValues])

  return (
    <div className="min-h-full bg-[var(--background)]">
      {/* Header Section */}
      <div className="border-b border-[var(--border)] bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">📋 Template Library</h1>
              <p className="text-[var(--muted)] mt-1">
                Proven post formats — browse, fill in variables, and generate.
              </p>
            </div>
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 mt-6">
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
        </div>
      </div>

      {/* Templates Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[var(--muted)] text-lg">No templates found</p>
            <p className="text-[var(--muted)] text-sm mt-1">Try a different category or search term</p>
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

                  {/* Bottom row: engagement type + best time */}
                  <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                    {template.engagement_type && (
                      <span className="flex items-center gap-1">
                        <EngIcon className="w-3.5 h-3.5" />
                        Best for {template.engagement_type}
                      </span>
                    )}
                    {template.best_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {template.best_time}
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

      {/* Template Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedTemplate(null)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[var(--background)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[selectedTemplate.category]?.bg} ${CATEGORY_COLORS[selectedTemplate.category]?.text} border ${CATEGORY_COLORS[selectedTemplate.category]?.border}`}>
                    {selectedTemplate.category.replace('-', ' ')}
                  </span>
                  <span className={`text-xs font-medium capitalize ${DIFFICULTY_COLORS[selectedTemplate.difficulty || 'beginner']}`}>
                    {selectedTemplate.difficulty}
                  </span>
                </div>
                <h2 className="text-xl font-bold">{selectedTemplate.title}</h2>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Description */}
              {selectedTemplate.description && (
                <p className="text-[var(--muted)]">{selectedTemplate.description}</p>
              )}

              {/* Why This Works */}
              {selectedTemplate.why_it_works && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                  <h3 className="text-sm font-semibold mb-2 text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Why This Works
                  </h3>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">
                    {selectedTemplate.why_it_works}
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap gap-4 text-sm">
                {selectedTemplate.engagement_type && (
                  <div className="flex items-center gap-1.5 text-[var(--muted)]">
                    <Target className="w-4 h-4" />
                    <span>Best for <strong className="text-[var(--foreground)]">{selectedTemplate.engagement_type}</strong></span>
                  </div>
                )}
                {selectedTemplate.best_time && (
                  <div className="flex items-center gap-1.5 text-[var(--muted)]">
                    <Clock className="w-4 h-4" />
                    <span>{selectedTemplate.best_time}</span>
                  </div>
                )}
              </div>

              {/* Example Output */}
              {selectedTemplate.example_output && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-[var(--muted)]">Example Output</h3>
                  <div className="p-4 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm whitespace-pre-wrap">
                    {selectedTemplate.example_output}
                  </div>
                </div>
              )}

              {/* Variable Inputs */}
              {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Fill in your details</h3>
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
                          className="w-full px-3 py-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:border-accent transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-[var(--background)] border-t border-[var(--border)] px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--card)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-accent text-[var(--accent-text)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Generate from Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

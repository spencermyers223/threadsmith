'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, Sparkles, TrendingUp, Flame, Rocket, MessageCircle, X } from 'lucide-react'

interface TemplateVariable {
  name: string
  label: string
  placeholder?: string
  required: boolean
}

interface PostTemplate {
  id: string
  title: string
  category: string
  description: string | null
  prompt_template: string
  why_it_works: string | null
  difficulty: string | null
  variables: TemplateVariable[] | null
}

const CATEGORY_ICONS: Record<string, typeof Sparkles> = {
  alpha: TrendingUp,
  contrarian: Flame,
  'build-in-public': Rocket,
  engagement: MessageCircle,
}

const CATEGORY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  alpha: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  contrarian: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  'build-in-public': { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
  engagement: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'text-green-400',
  intermediate: 'text-yellow-400',
  advanced: 'text-red-400',
}

// Template mode data structure (same as used by Template Library)
export interface TemplateData {
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

interface TemplateSelectorProps {
  onSelectTemplate: (templateData: TemplateData | null) => void
  activeTemplate: string | null
}

export function TemplateSelector({ onSelectTemplate, activeTemplate }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<PostTemplate[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Modal state for filling variables
  const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchTemplates() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('post_templates')
        .select('id, title, category, description, prompt_template, why_it_works, difficulty, variables')
        .order('category', { ascending: true })
        .limit(30)

      if (error) {
        console.error('Failed to fetch templates:', error)
      }
      if (data) {
        setTemplates(data)
      }
      setLoading(false)
    }
    fetchTemplates()
  }, [])

  const handleSelectTemplate = (template: PostTemplate) => {
    setSelectedTemplate(template)
    setVariableValues({})
    setIsOpen(false)
  }

  const handleConfirmTemplate = () => {
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

    onSelectTemplate(templateData)
    setSelectedTemplate(null)
    setVariableValues({})
  }

  const clearTemplate = () => {
    onSelectTemplate(null)
    setIsOpen(false)
  }

  const closeModal = () => {
    setSelectedTemplate(null)
    setVariableValues({})
  }

  // Check if all required variables are filled
  const canConfirm = !selectedTemplate?.variables || 
    selectedTemplate.variables
      .filter(v => v.required)
      .every(v => variableValues[v.name]?.trim())

  if (loading) return null

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 text-sm transition-colors ${
            activeTemplate 
              ? 'text-[var(--accent)]' 
              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <Sparkles size={14} />
          {activeTemplate || 'Use a template'}
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 top-full right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg">
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-medium text-[var(--muted)] uppercase">
                Templates
              </p>
              
              {/* Clear template option */}
              {activeTemplate && (
                <button
                  onClick={clearTemplate}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--border)]/50 transition-colors text-left mb-1"
                >
                  <span className="text-[var(--muted)]">✕</span>
                  <span className="text-sm text-[var(--muted)]">Clear template</span>
                </button>
              )}
              
              {templates.map(template => {
                const Icon = CATEGORY_ICONS[template.category] || Sparkles
                const colors = CATEGORY_COLORS[template.category] || { text: 'text-[var(--muted)]' }
                
                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-[var(--border)]/50 transition-colors text-left"
                  >
                    <Icon size={16} className={`${colors.text} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {template.title}
                      </p>
                      {template.description && (
                        <p className="text-xs text-[var(--muted)] line-clamp-1">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Variable Input Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[var(--background)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`
                    inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                    ${CATEGORY_COLORS[selectedTemplate.category]?.bg || 'bg-gray-500/10'}
                    ${CATEGORY_COLORS[selectedTemplate.category]?.text || 'text-gray-400'}
                    border ${CATEGORY_COLORS[selectedTemplate.category]?.border || 'border-gray-500/30'}
                  `}>
                    {selectedTemplate.category.replace('-', ' ')}
                  </span>
                  {selectedTemplate.difficulty && (
                    <span className={`text-xs font-medium capitalize ${DIFFICULTY_COLORS[selectedTemplate.difficulty] || 'text-gray-400'}`}>
                      {selectedTemplate.difficulty}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold">{selectedTemplate.title}</h2>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Description */}
              {selectedTemplate.description && (
                <p className="text-[var(--muted)]">{selectedTemplate.description}</p>
              )}

              {/* Why This Works */}
              {selectedTemplate.why_it_works && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                  <h3 className="text-sm font-semibold mb-2 text-amber-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Why This Works
                  </h3>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">
                    {selectedTemplate.why_it_works}
                  </p>
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
                          placeholder={v.placeholder || `Enter ${v.label.toLowerCase()}...`}
                          value={variableValues[v.name] || ''}
                          onChange={e => setVariableValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
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
                onClick={closeModal}
                className="px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--card)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTemplate}
                disabled={!canConfirm}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-[var(--accent)] text-[var(--background)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Use Template
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

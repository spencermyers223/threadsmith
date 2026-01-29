'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, Sparkles, TrendingUp, Flame, BarChart2, Rocket, MessageCircle, X } from 'lucide-react'

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
  variables: TemplateVariable[] | null
}

const CATEGORY_ICONS: Record<string, typeof Sparkles> = {
  alpha: TrendingUp,
  contrarian: Flame,
  data: BarChart2,
  'build-in-public': Rocket,
  engagement: MessageCircle,
}

const CATEGORY_COLORS: Record<string, string> = {
  alpha: 'text-emerald-400',
  contrarian: 'text-orange-400',
  data: 'text-blue-400',
  'build-in-public': 'text-pink-400',
  engagement: 'text-purple-400',
}

interface TemplateSelectorProps {
  onSelectTemplate: (filledPrompt: string, templateTitle: string, category: string) => void
}

export function TemplateSelector({ onSelectTemplate }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<PostTemplate[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTemplates() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('post_templates')
        .select('id, title, category, description, prompt_template, variables')
        .order('category', { ascending: true })
        .limit(20)

      if (!error && data) {
        setTemplates(data)
      }
      setLoading(false)
    }
    fetchTemplates()
  }, [])

  const handleSelectTemplate = (template: PostTemplate) => {
    setSelectedTemplate(template)
    setVariableValues({})
  }

  const handleApplyTemplate = () => {
    if (!selectedTemplate) return

    let filledPrompt = selectedTemplate.prompt_template
    const vars = selectedTemplate.variables || []

    for (const v of vars) {
      const value = variableValues[v.name] || v.placeholder || ''
      filledPrompt = filledPrompt.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, 'g'), value)
    }

    onSelectTemplate(filledPrompt, selectedTemplate.title, selectedTemplate.category)
    setIsOpen(false)
    setSelectedTemplate(null)
    setVariableValues({})
  }

  const canApply = !selectedTemplate?.variables?.length || 
    selectedTemplate.variables
      .filter(v => v.required)
      .every(v => variableValues[v.name]?.trim())

  if (loading) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-[var(--accent)] hover:text-[var(--accent)]/80 transition-colors"
      >
        <Sparkles size={14} />
        Use a template
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-2 w-80 max-h-96 overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg">
          {!selectedTemplate ? (
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-medium text-[var(--muted)] uppercase">
                Quick Templates
              </p>
              {templates.map(template => {
                const Icon = CATEGORY_ICONS[template.category] || Sparkles
                const color = CATEGORY_COLORS[template.category] || 'text-[var(--muted)]'
                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-[var(--border)]/50 transition-colors text-left"
                  >
                    <Icon size={16} className={`${color} mt-0.5 flex-shrink-0`} />
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
          ) : (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">{selectedTemplate.title}</h4>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="p-1 hover:bg-[var(--border)] rounded"
                >
                  <X size={14} />
                </button>
              </div>

              {selectedTemplate.variables && selectedTemplate.variables.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {selectedTemplate.variables.map(v => (
                    <div key={v.name}>
                      <label className="block text-xs font-medium mb-1 text-[var(--muted)]">
                        {v.label}
                        {v.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <textarea
                        placeholder={v.placeholder}
                        value={variableValues[v.name] || ''}
                        onChange={e => {
                          setVariableValues(prev => ({ ...prev, [v.name]: e.target.value }))
                          // Auto-resize textarea
                          e.target.style.height = 'auto'
                          e.target.style.height = `${e.target.scrollHeight}px`
                        }}
                        rows={1}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none overflow-hidden"
                        style={{ minHeight: '38px' }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)] mb-3">
                  This template has no variables — click Apply to use it.
                </p>
              )}

              <button
                onClick={handleApplyTemplate}
                disabled={!canApply}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--background)] rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:opacity-90"
              >
                <Sparkles size={14} />
                Apply Template
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

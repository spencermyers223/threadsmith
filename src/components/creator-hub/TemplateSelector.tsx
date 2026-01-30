'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, Sparkles, TrendingUp, Flame, BarChart2, Rocket, MessageCircle, Check } from 'lucide-react'

interface PostTemplate {
  id: string
  title: string
  category: string
  description: string | null
  placeholder_hint: string | null  // New field: guidance text for the user
  prompt_template: string
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

// Default placeholder hints for each template (fallback if not in DB)
const DEFAULT_HINTS: Record<string, string> = {
  'Trend Analysis': 'Describe the trend you\'re seeing and the industry/subject...',
  'Alpha Thread': 'Share your unique insight or research finding...',
  'Hot Take': 'State your controversial opinion on a topic...',
  'Market Analysis': 'Describe the market movement or data you want to analyze...',
  'Build in Public Update': 'Share what you built, learned, or shipped today...',
  'Technical Breakdown': 'Name the concept or technology you want to explain...',
  'Engagement Bait': 'Describe the topic you want people to debate...',
  'Data Insight': 'Paste the data point or stat you want to break down...',
  'Protocol Review': 'Name the protocol, tool, or product to review...',
  'Story Thread': 'Briefly outline the story or experience you want to share...',
}

interface TemplateSelectorProps {
  onSelectTemplate: (placeholder: string, promptTemplate: string, category: string, title: string) => void
  activeTemplate: string | null
}

export function TemplateSelector({ onSelectTemplate, activeTemplate }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<PostTemplate[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTemplates() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('post_templates')
        .select('id, title, category, description, placeholder_hint, prompt_template')
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
    // Use placeholder_hint from DB, or fallback to default hints, or generate from title
    const hint = template.placeholder_hint || 
                 DEFAULT_HINTS[template.title] || 
                 `Write about ${template.title.toLowerCase()}...`
    
    onSelectTemplate(hint, template.prompt_template, template.category, template.title)
    setIsOpen(false)
  }

  const clearTemplate = () => {
    onSelectTemplate('Enter your topic, idea, or paste notes...', '', '', '')
    setIsOpen(false)
  }

  if (loading) return null

  return (
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
              const color = CATEGORY_COLORS[template.category] || 'text-[var(--muted)]'
              const isActive = activeTemplate === template.title
              
              return (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={`w-full flex items-start gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                    isActive 
                      ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30' 
                      : 'hover:bg-[var(--border)]/50'
                  }`}
                >
                  <Icon size={16} className={`${color} mt-0.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {template.title}
                      </p>
                      {isActive && <Check size={14} className="text-[var(--accent)]" />}
                    </div>
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
  )
}

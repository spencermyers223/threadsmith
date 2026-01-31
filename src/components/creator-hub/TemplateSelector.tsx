'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, Sparkles, TrendingUp, Flame, BarChart2, Rocket, MessageCircle, Check } from 'lucide-react'

interface PostTemplate {
  id: string
  title: string
  category: string
  description: string | null
  prompt_template: string
  why_it_works: string | null
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

// Placeholder guidance for each template
// These appear in the input as placeholder text that disappears when user types
// Should be genuinely helpful guidance, not lazy "[Write X here]"
const TEMPLATE_PLACEHOLDERS: Record<string, string> = {
  // BUILD IN PUBLIC
  'Weekly Progress Update': 
    'Share your week: key metric (before → after), what you shipped, what failed, what you learned, what\'s next...',
  
  'Lesson Learned Post': 
    'Describe a hard lesson: what happened, what went wrong, what you learned, what you\'d tell others to do instead...',
  
  'Feature Launch Announcement': 
    'Announce your feature: what it does, the user problem it solves, why you built it, what\'s the CTA...',
  
  'Revenue/Growth Milestone': 
    'Celebrate your milestone: the number you hit, timeline to get there, the 2-3 decisions that made the difference...',
  
  'Behind the Scenes': 
    'Show the reality: what people assume about your work vs what it\'s actually like, a specific messy example...',

  // HOT TAKES / CONTRARIAN
  'Unpopular Opinion': 
    'State your contrarian take: what you believe that most people disagree with, and the evidence or experience behind it...',
  
  "Everyone's Wrong About X": 
    'Challenge common advice: the thing everyone says to do, why it\'s actually wrong, what works instead...',
  
  'The Real Reason X Happened': 
    'Share insider perspective: what people think caused something vs what actually drove it...',
  
  'Myth-Busting': 
    'Correct a misconception: the common myth, the actual truth, evidence or data that proves it...',
  
  'Hot Take with Stakes': 
    'Make a bold prediction: your specific claim, your reasoning (2-3 points), when you\'ll be proven right or wrong...',

  // INSIGHTS / VALUE (alpha)
  'How I Did X': 
    'Share a specific result: your before/after numbers, the exact steps you took, the key insight that made it work...',
  
  'Tools I Actually Use': 
    'List your real stack: the tools you use daily for [your purpose], why each one, total monthly cost...',
  
  'Framework or Mental Model': 
    'Explain a thinking framework: name it, how it works in simple terms, a concrete example of applying it...',
  
  'Mistakes to Avoid': 
    'Warn about pitfalls: 2-4 mistakes you made with [topic], what you should have done instead for each...',
  
  'Industry Trend Analysis': 
    'Analyze a trend: what you\'re observing (2-3 data points), your prediction, what smart people should do about it...',

  // ENGAGEMENT
  'Question for the Timeline': 
    'Ask a genuine question about [topic]. Include your own answer first to start the conversation...',
  
  'This or That': 
    'Create a debate: [Option A] vs [Option B], which you pick and a one-line reason why...',
  
  'Rate This 1-10': 
    'Ask people to rate [something specific] 1-10. Share your own rating and a quick reason why...',
  
  'Fill in the Blank': 
    'Create a fill-in prompt: "The best ___ that nobody talks about is ___". Share your answer and why...',
  
  'Underrated Thing': 
    'Share a hidden gem: your pick for most underrated [category], why it\'s slept on, what it beats...',
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
        .select('id, title, category, description, prompt_template, why_it_works')
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
    // Get placeholder guidance for this template
    const placeholder = TEMPLATE_PLACEHOLDERS[template.title] || 
                        `Describe your ${template.title.toLowerCase()}...`
    
    onSelectTemplate(placeholder, template.prompt_template, template.category, template.title)
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
                    {isActive && template.why_it_works && (
                      <div className="mt-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                        <p className="text-xs font-medium text-amber-400 flex items-center gap-1 mb-1">
                          <Sparkles size={10} /> Why this works
                        </p>
                        <p className="text-xs text-[var(--muted)] leading-relaxed">
                          {template.why_it_works}
                        </p>
                      </div>
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

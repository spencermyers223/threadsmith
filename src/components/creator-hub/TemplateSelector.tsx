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

// Tweet template frameworks - actual structures users fill in
const TEMPLATE_FRAMEWORKS: Record<string, string> = {
  // Mistakes / Lessons
  'Mistakes to Avoid': `I wasted [time period] doing [common mistake].

Do [better approach] instead.

Here's why it works:`,
  
  // Contrarian / Hot Takes
  'Hot Take': `Unpopular opinion: [bold claim]

Most people think [common belief].

But here's the truth: [your reasoning]

Agree or disagree?`,
  
  'Contrarian Take': `Stop [common practice].

It's not working.

Do [alternative] instead.`,
  
  // Build in Public
  'Build in Public Update': `[Time period] ago I started [project/journey].

Today: [current milestone]

Biggest lesson: [key learning]

Next up:`,
  
  'Weekly Update': `Week [X] of building [project]:

✅ Shipped: [accomplishment]
🔨 Working on: [current task]  
💡 Learned: [insight]`,
  
  // Insights / Alpha
  'Alpha Thread': `I spent [time] researching [topic].

Here's what 99% of people miss:

[key insight]

Let me explain 🧵`,
  
  'Trend Analysis': `[Trend/topic] is changing fast.

What's really happening: [analysis]

Why this matters: [implication]

My prediction:`,
  
  // Data
  'Data Insight': `[Striking statistic or data point]

What this tells us: [interpretation]

Why it matters for you: [actionable takeaway]`,
  
  // Technical
  'Technical Breakdown': `[Complex topic] explained simply:

Most people overcomplicate this.

Here's all you need to know:

[simple explanation]

Bookmark for later.`,
  
  // Stories
  'Story Thread': `[Time] ago, [dramatic setup].

What happened next changed everything.

🧵`,
  
  // Engagement
  'Engagement Bait': `What's your take on [topic]?

I'll go first: [your answer]

Reply with yours 👇`,
  
  'Debate Starter': `[Option A] or [Option B]?

My take: [your choice + brief why]

This is going to start a war...`,
  
  // How-To
  'Tutorial': `How to [achieve outcome] (step-by-step):

1. [First step]
2. [Second step]
3. [Third step]

The key most people miss: [pro tip]

Bookmark this.`,
  
  // Market
  'Market Analysis': `[Market/asset] just [did something notable].

What's really happening: [analysis]

My take: [prediction]`,
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
        .select('id, title, category, description, prompt_template')
        .order('category', { ascending: true })
        .limit(20)

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
    // Get the framework for this template, or create a simple one
    const framework = TEMPLATE_FRAMEWORKS[template.title] || 
                      `[Your ${template.title.toLowerCase()} goes here]`
    
    // Pass the framework as the content to populate the input
    onSelectTemplate(framework, template.prompt_template, template.category, template.title)
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

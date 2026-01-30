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

// World-class tweet frameworks - actual structures that work
// Users fill in [bracketed text] with their specifics
const TEMPLATE_FRAMEWORKS: Record<string, string> = {
  // BUILD IN PUBLIC
  'Weekly Progress Update': `Week [X] of building [project]:

📈 [Key metric] → [new number]
✅ Shipped: [main accomplishment]
❌ Failed: [what didn't work]
💡 Learned: [key insight]

Next week: [what's coming]`,

  'Lesson Learned Post': `I learned this the hard way:

[The lesson in one sentence]

What happened:
[Brief context]

What I should have done:
[The better approach]

Save yourself the pain.`,

  'Feature Launch Announcement': `Just shipped: [feature name] 🚀

What it does:
→ [Benefit 1]
→ [Benefit 2]
→ [Benefit 3]

Why I built it:
[User pain point it solves]

What should I build next?`,

  'Revenue/Growth Milestone': `[Project] just hit [milestone] 🎉

Timeline:
• Month 1: [starting point]
• Month [X]: [progress point]
• Today: [milestone]

What actually moved the needle:
[2-3 key decisions]

Next goal: [what's next]`,

  'Behind the Scenes': `What building [project] actually looks like:

The glamorous version: [what people think]

The reality: [what it actually is]

[Specific example]

Anyone else? Or just me?`,

  // HOT TAKES / CONTRARIAN
  'Unpopular Opinion': `Unpopular opinion:

[Bold, specific claim]

Everyone says [conventional wisdom].

But here's what I've seen:
[Your evidence or experience]

Agree or am I crazy?`,

  "Everyone's Wrong About X": `Most people have [topic] completely backwards.

Common advice: "[what everyone says]"

Reality: [what actually works]

Stop [bad approach]. Start [good approach].`,

  'The Real Reason X Happened': `Everyone thinks [event] happened because [surface reason].

That's not it.

The real reason: [actual cause]

This matters because [implication].`,

  'Myth-Busting': `Myth: "[common belief]"

Reality: [the truth]

The data:
• [Evidence point 1]
• [Evidence point 2]

What you should actually do: [action]`,

  'Hot Take with Stakes': `Hot take: [bold prediction or claim]

I'm willing to be wrong.

But here's why I believe it:
1. [Reason 1]
2. [Reason 2]
3. [Reason 3]

Remind me in [timeframe] if I'm wrong.`,

  // INSIGHTS / VALUE (alpha)
  'How I Did X': `How I [achieved result]:

• Before: [starting point]
• After: [end result]
• Time: [how long]

The strategy:

1. [Step 1]
2. [Step 2]
3. [Step 3]

The biggest unlock: [key insight]

Questions?`,

  'Tools I Actually Use': `My actual [purpose] stack:

[Tool 1] - [what I use it for]
[Tool 2] - [what I use it for]
[Tool 3] - [what I use it for]

Total cost: [$X]/month

What I stopped using: [tool and why]

What's in your stack?`,

  'Framework or Mental Model': `The [framework name] changed how I [area]:

How it works:
[Simple explanation]

Example:
[Concrete application]

Use this when: [situation]`,

  'Mistakes to Avoid': `[X] mistakes I made with [topic]:

1. [Mistake 1]
   → Should have: [better approach]

2. [Mistake 2]
   → Should have: [better approach]

3. [Mistake 3]
   → Should have: [better approach]

Learn from my pain.`,

  'Industry Trend Analysis': `[Trend] is changing [industry] faster than people realize.

What I'm seeing:
• [Observation 1]
• [Observation 2]
• [Observation 3]

My prediction: [specific forecast]

Winners will be those who [action].`,

  // ENGAGEMENT
  'Question for the Timeline': `Genuine question:

[Your question about topic]

I'll go first:
[Your honest answer]

What's yours?`,

  'This or That': `Settle this debate:

[Option A] or [Option B]?

My take: [your choice]

Because: [one-sentence reason]

Pick one. No fence-sitting.`,

  'Rate This 1-10': `Rate your [thing to rate] right now (1-10).

I'll start: [X]/10

[One sentence explaining your rating]

Your turn. Be honest.`,

  'Fill in the Blank': `Fill in the blank:

"The best [category] that nobody talks about is ___________."

Mine: [your answer]

[One line on why]

Drop yours 👇`,

  'Underrated Thing': `Most underrated [category]:

[Your pick]

Why it's slept on:
[Brief explanation]

Everyone talks about [popular alternative].

But [your pick] is better because [reason].

What's yours?`,
}

interface TemplateSelectorProps {
  onSelectTemplate: (framework: string, promptTemplate: string, category: string, title: string) => void
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
    // Get the world-class framework for this template
    const framework = TEMPLATE_FRAMEWORKS[template.title] || 
                      `[Write your ${template.title.toLowerCase()} here]`
    
    onSelectTemplate(framework, template.prompt_template, template.category, template.title)
    setIsOpen(false)
  }

  const clearTemplate = () => {
    onSelectTemplate('', '', '', '')
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

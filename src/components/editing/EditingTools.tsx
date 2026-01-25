'use client'

import { useState } from 'react'
import {
  Wand2, Zap, Sparkles, ListTree, BarChart3, Loader2,
  ChevronDown, AlertTriangle
} from 'lucide-react'

interface EditingToolsProps {
  content: string
  onContentChange: (newContent: string) => void
  isThread?: boolean
}

type ToolId = 'add_hook' | 'humanize' | 'sharpen' | 'make_thread' | 'algorithm_check'

interface Tool {
  id: ToolId
  label: string
  description: string
  icon: typeof Wand2
  color: string
}

const TOOLS: Tool[] = [
  {
    id: 'add_hook',
    label: 'Add Hook',
    description: 'Add a scroll-stopping opening line',
    icon: Zap,
    color: 'text-amber-400',
  },
  {
    id: 'humanize',
    label: 'Humanize',
    description: 'Make it sound more natural and authentic',
    icon: Sparkles,
    color: 'text-pink-400',
  },
  {
    id: 'sharpen',
    label: 'Sharpen',
    description: 'Make it more punchy and concise',
    icon: Wand2,
    color: 'text-cyan-400',
  },
  {
    id: 'make_thread',
    label: 'Make Thread',
    description: 'Expand into a multi-tweet thread',
    icon: ListTree,
    color: 'text-purple-400',
  },
  {
    id: 'algorithm_check',
    label: 'Algorithm Check',
    description: 'Score against X algorithm factors',
    icon: BarChart3,
    color: 'text-emerald-400',
  },
]

interface AlgorithmScore {
  overall: number
  factors: {
    name: string
    score: number
    tip: string
  }[]
  warnings: string[]
}

export default function EditingTools({ content, onContentChange, isThread = false }: EditingToolsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [algorithmScore, setAlgorithmScore] = useState<AlgorithmScore | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleToolClick = async (toolId: ToolId) => {
    if (isLoading) return

    setActiveTool(toolId)
    setError(null)
    setAlgorithmScore(null)

    if (toolId === 'algorithm_check') {
      // Local algorithm check - no API needed
      performAlgorithmCheck()
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/chat/writing-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          action: toolId,
          isThread,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to process')
      }

      const data = await res.json()
      onContentChange(data.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
      setActiveTool(null)
    }
  }

  const performAlgorithmCheck = () => {
    const factors: AlgorithmScore['factors'] = []
    const warnings: string[] = []
    let totalScore = 0

    // Check hook strength
    const firstLine = content.split('\n')[0]
    const hasStrongHook = /^(The|This|Here|I|If|Why|How|What|Stop|Attention|You|Everyone)/i.test(firstLine) ||
                         /[!?]/.test(firstLine) ||
                         firstLine.length < 60
    factors.push({
      name: 'Hook Strength',
      score: hasStrongHook ? 85 : 50,
      tip: hasStrongHook ? 'Good opening line' : 'Consider a more attention-grabbing first line',
    })
    totalScore += hasStrongHook ? 85 : 50

    // Check for engagement prompt
    const hasQuestion = /\?/.test(content)
    const hasCTA = /(reply|comment|share|retweet|thoughts|agree|disagree)/i.test(content)
    const engagementScore = hasQuestion ? 90 : hasCTA ? 75 : 40
    factors.push({
      name: 'Engagement Prompt',
      score: engagementScore,
      tip: hasQuestion ? 'Questions drive replies (150x more valuable)' :
           hasCTA ? 'Good call to action' : 'Add a question to drive replies',
    })
    totalScore += engagementScore

    // Check for external links
    const hasExternalLink = /https?:\/\/[^\s]+/.test(content)
    if (hasExternalLink) {
      warnings.push('External links get 50% less reach. Consider putting links in a reply.')
    }
    factors.push({
      name: 'Link Penalty',
      score: hasExternalLink ? 30 : 100,
      tip: hasExternalLink ? 'Move link to reply for better reach' : 'No links - good for reach',
    })
    totalScore += hasExternalLink ? 30 : 100

    // Check character count
    const charCount = content.length
    let lengthScore = 70
    let lengthTip = 'Standard length'
    if (charCount < 100) {
      lengthScore = 60
      lengthTip = 'Very short - may lack substance'
    } else if (charCount >= 140 && charCount <= 200) {
      lengthScore = 95
      lengthTip = 'Optimal length for engagement'
    } else if (charCount > 280 && charCount < 500) {
      lengthScore = 50
      lengthTip = 'Awkward length - shorten or expand to long-form'
    }
    factors.push({
      name: 'Content Length',
      score: lengthScore,
      tip: lengthTip,
    })
    totalScore += lengthScore

    // Check hashtag usage
    const hashtagCount = (content.match(/#\w+/g) || []).length
    if (hashtagCount > 2) {
      warnings.push('Too many hashtags can look spammy. Use 0-2 max.')
    }
    factors.push({
      name: 'Hashtag Usage',
      score: hashtagCount > 2 ? 40 : hashtagCount === 0 ? 90 : 80,
      tip: hashtagCount > 2 ? 'Remove excess hashtags' :
           hashtagCount === 0 ? 'No hashtags - clean look' : 'Moderate hashtag usage',
    })
    totalScore += hashtagCount > 2 ? 40 : hashtagCount === 0 ? 90 : 80

    // Calculate overall score
    const overall = Math.round(totalScore / factors.length)

    setAlgorithmScore({ overall, factors, warnings })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 60) return 'text-amber-400'
    return 'text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/20'
    if (score >= 60) return 'bg-amber-500/20'
    return 'bg-red-500/20'
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-[var(--muted)] transition-colors text-sm"
      >
        <Wand2 size={16} className="text-[var(--accent)]" />
        <span>Editing Tools</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Tools List */}
          <div className="p-2">
            {TOOLS.map((tool) => {
              const Icon = tool.icon
              const isActive = activeTool === tool.id

              // Hide "Make Thread" if already a thread
              if (tool.id === 'make_thread' && isThread) return null

              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  disabled={isLoading}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors
                    ${isActive ? 'bg-[var(--accent)]/10' : 'hover:bg-[var(--background)]'}
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className={`p-2 rounded-lg bg-[var(--background)] ${tool.color}`}>
                    {isActive && isLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Icon size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{tool.label}</div>
                    <div className="text-xs text-[var(--muted)] truncate">{tool.description}</div>
                  </div>
                  {isActive && !isLoading && tool.id === 'algorithm_check' && algorithmScore && (
                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${getScoreBg(algorithmScore.overall)} ${getScoreColor(algorithmScore.overall)}`}>
                      {algorithmScore.overall}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-4 py-3 bg-red-500/10 border-t border-[var(--border)] text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Algorithm Score Display */}
          {algorithmScore && (
            <div className="border-t border-[var(--border)] p-4 space-y-4">
              {/* Overall Score */}
              <div className="flex items-center justify-between">
                <span className="font-medium">Algorithm Score</span>
                <div className={`px-3 py-1 rounded-full text-lg font-bold ${getScoreBg(algorithmScore.overall)} ${getScoreColor(algorithmScore.overall)}`}>
                  {algorithmScore.overall}/100
                </div>
              </div>

              {/* Factor Breakdown */}
              <div className="space-y-2">
                {algorithmScore.factors.map((factor) => (
                  <div key={factor.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--muted)]">{factor.name}</span>
                      <span className={getScoreColor(factor.score)}>{factor.score}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--background)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          factor.score >= 80 ? 'bg-emerald-500' :
                          factor.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${factor.score}%` }}
                      />
                    </div>
                    <p className="text-xs text-[var(--muted)]">{factor.tip}</p>
                  </div>
                ))}
              </div>

              {/* Warnings */}
              {algorithmScore.warnings.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                  {algorithmScore.warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2 text-amber-400 text-sm">
                      <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

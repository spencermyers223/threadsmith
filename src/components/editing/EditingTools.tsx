'use client'

import { useState } from 'react'
import {
  Wand2, Zap, Sparkles, ListTree, BarChart3, Loader2,
  AlertTriangle, MessageCircle, Flame, X
} from 'lucide-react'

interface EditingToolsProps {
  content: string
  onContentChange: (newContent: string) => void
  isThread?: boolean
}

type ToolId = 'add_hook' | 'humanize' | 'sharpen' | 'add_question' | 'make_spicy' | 'make_thread' | 'algorithm_check'

interface Tool {
  id: ToolId
  label: string
  shortLabel: string
  description: string
  icon: typeof Wand2
  color: string
  hoverBg: string
}

const TOOLS: Tool[] = [
  {
    id: 'add_hook',
    label: 'Add Hook',
    shortLabel: 'Hook',
    description: 'Add a scroll-stopping opening line',
    icon: Zap,
    color: 'text-amber-400',
    hoverBg: 'hover:bg-amber-500/10 hover:border-amber-500/30',
  },
  {
    id: 'humanize',
    label: 'Humanize',
    shortLabel: 'Humanize',
    description: 'Make it sound more natural and authentic',
    icon: Sparkles,
    color: 'text-pink-400',
    hoverBg: 'hover:bg-pink-500/10 hover:border-pink-500/30',
  },
  {
    id: 'sharpen',
    label: 'Shorten',
    shortLabel: 'Shorten',
    description: 'Make it more punchy and concise',
    icon: Wand2,
    color: 'text-cyan-400',
    hoverBg: 'hover:bg-cyan-500/10 hover:border-cyan-500/30',
  },
  {
    id: 'add_question',
    label: 'Add Question',
    shortLabel: 'Question',
    description: 'Add an engaging question to drive replies',
    icon: MessageCircle,
    color: 'text-blue-400',
    hoverBg: 'hover:bg-blue-500/10 hover:border-blue-500/30',
  },
  {
    id: 'make_spicy',
    label: 'Make Spicier',
    shortLabel: 'Spicier',
    description: 'Add more edge and provocative takes',
    icon: Flame,
    color: 'text-orange-400',
    hoverBg: 'hover:bg-orange-500/10 hover:border-orange-500/30',
  },
  {
    id: 'make_thread',
    label: 'Expand to Thread',
    shortLabel: 'Thread',
    description: 'Expand into a multi-tweet thread',
    icon: ListTree,
    color: 'text-purple-400',
    hoverBg: 'hover:bg-purple-500/10 hover:border-purple-500/30',
  },
  {
    id: 'algorithm_check',
    label: 'Check Score',
    shortLabel: 'Score',
    description: 'Score against X algorithm factors',
    icon: BarChart3,
    color: 'text-emerald-400',
    hoverBg: 'hover:bg-emerald-500/10 hover:border-emerald-500/30',
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
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [algorithmScore, setAlgorithmScore] = useState<AlgorithmScore | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleToolClick = async (toolId: ToolId) => {
    if (isLoading) return

    setActiveTool(toolId)
    setError(null)

    if (toolId === 'algorithm_check') {
      // Toggle algorithm check - if already showing, hide it
      if (algorithmScore) {
        setAlgorithmScore(null)
        setActiveTool(null)
        return
      }
      // Local algorithm check - no API needed
      performAlgorithmCheck()
      return
    }

    setAlgorithmScore(null)
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

  // Filter tools based on context
  const visibleTools = TOOLS.filter(tool => {
    // Hide "Make Thread" if already a thread
    if (tool.id === 'make_thread' && isThread) return false
    return true
  })

  return (
    <div className="space-y-3">
      {/* Horizontal Button Row */}
      <div className="flex flex-wrap gap-2">
        {visibleTools.map((tool) => {
          const Icon = tool.icon
          const isActive = activeTool === tool.id
          const isScoreActive = tool.id === 'algorithm_check' && algorithmScore

          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              disabled={isLoading && activeTool !== tool.id}
              title={tool.description}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                bg-[var(--background)] border border-[var(--border)]
                transition-all duration-150
                ${tool.hoverBg}
                ${isActive ? `${tool.color} border-current` : ''}
                ${isScoreActive ? 'bg-emerald-500/10 border-emerald-500/30' : ''}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isActive && isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Icon size={14} className={isActive || isScoreActive ? tool.color : 'text-[var(--muted)]'} />
              )}
              <span className={isActive || isScoreActive ? tool.color : ''}>
                {tool.shortLabel}
              </span>
              {isScoreActive && algorithmScore && (
                <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-bold ${getScoreBg(algorithmScore.overall)} ${getScoreColor(algorithmScore.overall)}`}>
                  {algorithmScore.overall}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-0.5 hover:bg-red-500/20 rounded">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Algorithm Score Display */}
      {algorithmScore && (
        <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-4 space-y-4">
          {/* Header with close button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-emerald-400" />
              <span className="font-medium text-sm">Algorithm Score</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreBg(algorithmScore.overall)} ${getScoreColor(algorithmScore.overall)}`}>
                {algorithmScore.overall}/100
              </div>
              <button
                onClick={() => {
                  setAlgorithmScore(null)
                  setActiveTool(null)
                }}
                className="p-1 hover:bg-[var(--border)] rounded transition-colors"
              >
                <X size={14} className="text-[var(--muted)]" />
              </button>
            </div>
          </div>

          {/* Factor Breakdown */}
          <div className="space-y-2">
            {algorithmScore.factors.map((factor) => (
              <div key={factor.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--muted)]">{factor.name}</span>
                  <span className={getScoreColor(factor.score)}>{factor.score}</span>
                </div>
                <div className="h-1 bg-[var(--card)] rounded-full overflow-hidden">
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
                <div key={i} className="flex items-start gap-2 text-amber-400 text-xs">
                  <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

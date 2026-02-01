'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Wand2, Zap, Sparkles, ListTree, BarChart3, Loader2,
  AlertTriangle, MessageCircle, Flame, X, WandSparkles, Undo2, BookOpen
} from 'lucide-react'
import { scoreEngagement, type EngagementScore } from '@/lib/engagement-scorer'

interface EditingToolsProps {
  content: string
  onContentChange: (newContent: string) => void
  isThread?: boolean
  hideScore?: boolean // Hide Score button when engagement panel is already visible (e.g., Workspace)
}

type ToolId = 'add_hook' | 'humanize' | 'sharpen' | 'add_question' | 'make_spicy' | 'make_thread' | 'algorithm_check' | 'auto_optimize'

interface Tool {
  id: ToolId
  label: string
  shortLabel: string
  description: string
  icon: typeof Wand2
  color: string
  hoverBg: string
  shortcut?: string // Keyboard shortcut (Cmd/Ctrl + key)
}

const TOOLS: Tool[] = [
  {
    id: 'auto_optimize',
    label: 'Auto-Optimize',
    shortLabel: '✨ Auto',
    description: 'Analyze and apply best tools automatically. (⌘A)',
    icon: WandSparkles,
    color: 'text-violet-400',
    hoverBg: 'hover:bg-violet-500/10 hover:border-violet-500/30',
    shortcut: 'a',
  },
  {
    id: 'add_hook',
    label: 'Add Hook',
    shortLabel: 'Hook',
    description: 'Add a scroll-stopping hook: number, question, or bold claim. (⌘H)',
    icon: Zap,
    color: 'text-amber-400',
    hoverBg: 'hover:bg-amber-500/10 hover:border-amber-500/30',
    shortcut: 'h',
  },
  {
    id: 'humanize',
    label: 'Humanize',
    shortLabel: 'Humanize',
    description: 'Remove AI tells, add contractions, improve readability. (⌘U)',
    icon: Sparkles,
    color: 'text-pink-400',
    hoverBg: 'hover:bg-pink-500/10 hover:border-pink-500/30',
    shortcut: 'u',
  },
  {
    id: 'sharpen',
    label: 'Shorten',
    shortLabel: 'Shorten',
    description: 'Cut to 280 chars or less. Removes filler, keeps impact. (⌘S)',
    icon: Wand2,
    color: 'text-cyan-400',
    hoverBg: 'hover:bg-cyan-500/10 hover:border-cyan-500/30',
    shortcut: 's',
  },
  {
    id: 'add_question',
    label: 'Add Question',
    shortLabel: 'Question',
    description: 'End with a question to drive replies. Replies = 75x algo weight. (⌘Q)',
    icon: MessageCircle,
    color: 'text-blue-400',
    hoverBg: 'hover:bg-blue-500/10 hover:border-blue-500/30',
    shortcut: 'q',
  },
  {
    id: 'make_spicy',
    label: 'Make Spicier',
    shortLabel: 'Spicier',
    description: 'Add debate triggers: "most people", "unpopular opinion". (⌘P)',
    icon: Flame,
    color: 'text-orange-400',
    hoverBg: 'hover:bg-orange-500/10 hover:border-orange-500/30',
    shortcut: 'p',
  },
  {
    id: 'make_thread',
    label: 'Expand to Thread',
    shortLabel: 'Thread',
    description: 'Turn into a 5-8 tweet thread with hook and CTA. (⌘T)',
    icon: ListTree,
    color: 'text-purple-400',
    hoverBg: 'hover:bg-purple-500/10 hover:border-purple-500/30',
    shortcut: 't',
  },
  {
    id: 'algorithm_check',
    label: 'Check Score',
    shortLabel: 'Score',
    description: 'Check engagement score: hook, reply potential, readability. (⌘E)',
    icon: BarChart3,
    color: 'text-emerald-400',
    hoverBg: 'hover:bg-emerald-500/10 hover:border-emerald-500/30',
    shortcut: 'e',
  },
]

export default function EditingTools({ content, onContentChange, isThread = false, hideScore = false }: EditingToolsProps) {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [engagementScore, setEngagementScore] = useState<EngagementScore | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scoreChange, setScoreChange] = useState<{ before: number; after: number; tool: string; improvements?: string[] } | null>(null)
  const [previousContent, setPreviousContent] = useState<string | null>(null)
  const [autoProgress, setAutoProgress] = useState<string | null>(null)

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey)) return
    
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

    const tool = TOOLS.find(t => t.shortcut === e.key.toLowerCase())
    if (tool) {
      e.preventDefault()
      const toolBtn = document.querySelector(`[data-tool-id="${tool.id}"]`) as HTMLButtonElement
      if (toolBtn && !toolBtn.disabled) {
        toolBtn.click()
      }
    }
    
    // Cmd+Z for undo
    if (e.key === 'z' && previousContent) {
      e.preventDefault()
      onContentChange(previousContent)
      setPreviousContent(null)
      setScoreChange(null)
    }
  }, [previousContent, onContentChange])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Helper to identify which factors improved
  const getImprovements = (before: EngagementScore, after: EngagementScore): string[] => {
    const improvements: string[] = []
    const factors = ['hookStrength', 'replyPotential', 'readability'] as const
    const labels: Record<typeof factors[number], string> = {
      hookStrength: 'Hook',
      replyPotential: 'Replies',
      readability: 'Readability',
    }
    for (const factor of factors) {
      const diff = after.breakdown[factor].score - before.breakdown[factor].score
      if (diff > 5) improvements.push(`${labels[factor]} +${diff}`)
    }
    return improvements
  }

  const handleUndo = () => {
    if (previousContent) {
      onContentChange(previousContent)
      setPreviousContent(null)
      setScoreChange(null)
    }
  }

  const handleToolClick = async (toolId: ToolId) => {
    if (isLoading) return

    setActiveTool(toolId)
    setError(null)
    setScoreChange(null)

    if (toolId === 'algorithm_check') {
      if (engagementScore) {
        setEngagementScore(null)
        setActiveTool(null)
        return
      }
      setEngagementScore(scoreEngagement(content))
      return
    }

    setEngagementScore(null)
    
    const beforeScore = scoreEngagement(content)

    // Check for very short content
    if (content.trim().length < 20 && toolId !== 'make_thread') {
      setError('Content too short to optimize. Add more text first.')
      setActiveTool(null)
      return
    }

    // Check if content is already highly optimized for this specific tool
    const bd = beforeScore.breakdown
    const toolSpecificScores: Record<ToolId, number | undefined> = {
      add_hook: bd.hookStrength.score,
      humanize: bd.readability.score,
      sharpen: undefined, // Shorten always applies if content is over 280
      add_question: bd.replyPotential.score,
      make_spicy: bd.replyPotential.score,
      make_thread: undefined,
      algorithm_check: undefined,
      auto_optimize: beforeScore.score,
    }
    
    const relevantScore = toolSpecificScores[toolId]
    if (relevantScore !== undefined && relevantScore >= 95 && toolId !== 'auto_optimize') {
      setScoreChange({ 
        before: beforeScore.score, 
        after: beforeScore.score, 
        tool: `${TOOLS.find(t => t.id === toolId)?.shortLabel} ✓ Already excellent (${relevantScore}/100)` 
      })
      setTimeout(() => setScoreChange(null), 3000)
      setActiveTool(null)
      return
    }

    setIsLoading(true)
    setPreviousContent(content)

    try {
      if (toolId === 'auto_optimize') {
        let currentContent = content
        const toolsApplied: string[] = []
        
        const bd = beforeScore.breakdown
        
        // Build optimization plan based on what matters:
        // 1. Hook first (most important for stopping scroll)
        // 2. Spicy (adds debate triggers)
        // 3. Shorten (if over 280)
        // 4. Question (adds to end)
        // 5. Humanize last (polish)
        
        const plan: { tool: ToolId; condition: boolean; priority: number }[] = [
          { tool: 'add_hook', condition: bd.hookStrength.score < 75, priority: 1 },
          { tool: 'make_spicy', condition: bd.replyPotential.score < 60 || beforeScore.score < 55, priority: 2 },
          { tool: 'sharpen', condition: content.length > 280, priority: 3 },
          { tool: 'add_question', condition: bd.replyPotential.score < 80, priority: 4 },
          { tool: 'humanize', condition: bd.readability.score < 65, priority: 5 },
        ]
        
        const toolsToApply = plan
          .filter(p => p.condition)
          .sort((a, b) => a.priority - b.priority)
          .map(p => p.tool)
        
        if (toolsToApply.length === 0) {
          toolsToApply.push('humanize')
        }
        
        const limitedTools = toolsToApply.slice(0, 4)
        
        for (let i = 0; i < limitedTools.length; i++) {
          const tool = limitedTools[i]
          try {
            const toolLabel = TOOLS.find(t => t.id === tool)?.shortLabel || tool
            setAutoProgress(`Step ${i + 1}/${limitedTools.length}: ${toolLabel}`)
            
            const currentScore = scoreEngagement(currentContent).score
            let bestResult = currentContent
            let bestScore = currentScore
            
            for (let attempt = 0; attempt < 2; attempt++) {
              const res = await fetch('/api/chat/writing-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  content: currentContent,
                  action: tool,
                  isThread,
                }),
              })
              
              if (res.ok) {
                const data = await res.json()
                const newScore = scoreEngagement(data.content).score
                
                if (newScore > bestScore) {
                  bestResult = data.content
                  bestScore = newScore
                  break
                }
              }
            }
            
            if (bestScore > currentScore) {
              currentContent = bestResult
              toolsApplied.push(toolLabel)
            }
          } catch {
            // Continue with next tool
          }
        }
        
        setAutoProgress(null)
        
        if (toolsApplied.length > 0) {
          const afterScoreObj = scoreEngagement(currentContent)
          const improvements = getImprovements(beforeScore, afterScoreObj)
          setScoreChange({ 
            before: beforeScore.score, 
            after: afterScoreObj.score, 
            tool: `Auto (${toolsApplied.join(' → ')})`,
            improvements,
          })
          setTimeout(() => setScoreChange(null), 6000)
          onContentChange(currentContent)
        } else {
          setError('Auto-optimize failed. Try individual tools instead.')
          setPreviousContent(null)
        }
      } else {
        const toolLabel = TOOLS.find(t => t.id === toolId)?.shortLabel || toolId
        let bestContent = content
        let bestScore = beforeScore.score
        const maxRetries = 2
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
          const newScore = scoreEngagement(data.content).score
          
          if (newScore > bestScore) {
            bestContent = data.content
            bestScore = newScore
            break
          }
          
          if (attempt === maxRetries) {
            if (newScore >= bestScore) {
              bestContent = data.content
              bestScore = newScore
            }
          }
        }
        
        // Special handling for Shorten
        if (toolId === 'sharpen' && content.length > 280 && bestContent.length < content.length) {
          const afterScoreObj = scoreEngagement(bestContent)
          const charsSaved = content.length - bestContent.length
          setScoreChange({ 
            before: beforeScore.score, 
            after: afterScoreObj.score, 
            tool: `${toolLabel} (-${charsSaved} chars)`,
            improvements: bestContent.length <= 280 ? ['Now under 280! ✓'] : [`${bestContent.length}/280 chars`]
          })
          setTimeout(() => setScoreChange(null), 4000)
          onContentChange(bestContent)
        } else if (bestScore > beforeScore.score) {
          const afterScoreObj = scoreEngagement(bestContent)
          const improvements = getImprovements(beforeScore, afterScoreObj)
          setScoreChange({ before: beforeScore.score, after: bestScore, tool: toolLabel, improvements })
          setTimeout(() => setScoreChange(null), 4000)
          onContentChange(bestContent)
        } else if (bestContent !== content) {
          setScoreChange({ before: beforeScore.score, after: bestScore, tool: `${toolLabel} (applied)` })
          setTimeout(() => setScoreChange(null), 4000)
          onContentChange(bestContent)
        } else {
          setScoreChange({ before: beforeScore.score, after: beforeScore.score, tool: `${toolLabel} ✓ Already optimized` })
          setTimeout(() => setScoreChange(null), 3000)
          setPreviousContent(null)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
      setActiveTool(null)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 50) return 'text-amber-400'
    return 'text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/20'
    if (score >= 50) return 'bg-amber-500/20'
    return 'bg-red-500/20'
  }

  const visibleTools = TOOLS.filter(tool => {
    if (tool.id === 'make_thread' && isThread) return false
    if (tool.id === 'algorithm_check' && hideScore) return false
    return true
  })

  return (
    <div className="space-y-3">
      {/* Horizontal Button Row */}
      <div className="flex flex-wrap gap-2">
        {visibleTools.map((tool) => {
          const Icon = tool.icon
          const isActive = activeTool === tool.id
          const isScoreActive = tool.id === 'algorithm_check' && engagementScore

          return (
            <button
              key={tool.id}
              data-tool-id={tool.id}
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
              {isScoreActive && engagementScore && (
                <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-bold ${getScoreBg(engagementScore.score)} ${getScoreColor(engagementScore.score)}`}>
                  {engagementScore.score}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Auto-Optimize Progress */}
      {autoProgress && (
        <div className="flex items-center gap-3 px-3 py-2 bg-violet-500/10 border border-violet-500/30 rounded-lg text-violet-400 text-sm">
          <Loader2 size={14} className="animate-spin flex-shrink-0" />
          <div className="flex-1">
            <span className="font-medium">{autoProgress}</span>
            <span className="text-violet-400/60 ml-2">Improving your content...</span>
          </div>
        </div>
      )}

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

      {/* Score Change Feedback with Undo */}
      {scoreChange && (
        <div className={`flex flex-col gap-1 px-3 py-2 rounded-lg text-sm animate-fade-in-up ${
          scoreChange.after > scoreChange.before 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : scoreChange.after < scoreChange.before
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
              : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
        }`}>
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="flex-shrink-0" />
            <span className="flex-1">
              <strong>{scoreChange.tool}:</strong>{' '}
              {scoreChange.after > scoreChange.before ? (
                <>Score +{scoreChange.after - scoreChange.before} ({scoreChange.before} → {scoreChange.after})</>
              ) : scoreChange.after < scoreChange.before ? (
                <>Score {scoreChange.after - scoreChange.before} ({scoreChange.before} → {scoreChange.after})</>
              ) : (
                <>Score unchanged ({scoreChange.after})</>
              )}
            </span>
            {previousContent && (
              <button 
                onClick={handleUndo}
                className="flex items-center gap-1 px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-xs"
                title="Undo this change"
              >
                <Undo2 size={12} />
                Undo
              </button>
            )}
            <button onClick={() => setScoreChange(null)} className="p-0.5 hover:bg-white/10 rounded">
              <X size={12} />
            </button>
          </div>
          {scoreChange.improvements && scoreChange.improvements.length > 0 && (
            <div className="text-xs opacity-80 ml-5">
              Improved: {scoreChange.improvements.join(' • ')}
            </div>
          )}
        </div>
      )}

      {/* Engagement Score Display - Simple 3-metric view */}
      {engagementScore && (
        <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-4 space-y-4">
          {/* Header with close button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-emerald-400" />
              <span className="font-medium text-sm">Engagement Score</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreBg(engagementScore.score)} ${getScoreColor(engagementScore.score)}`}>
                {engagementScore.score}/100
              </div>
              <button
                onClick={() => {
                  setEngagementScore(null)
                  setActiveTool(null)
                }}
                className="p-1 hover:bg-[var(--border)] rounded transition-colors"
              >
                <X size={14} className="text-[var(--muted)]" />
              </button>
            </div>
          </div>

          {/* Factor Breakdown - Only 3 factors now */}
          <div className="space-y-2">
            {[
              { key: 'hookStrength', name: 'Hook Strength', weight: '35%', icon: Zap },
              { key: 'replyPotential', name: 'Reply Potential', weight: '45%', icon: MessageCircle },
              { key: 'readability', name: 'Readability', weight: '20%', icon: BookOpen },
            ].map(({ key, name, weight, icon: Icon }) => {
              const factor = engagementScore.breakdown[key as keyof typeof engagementScore.breakdown]
              if (!factor || typeof factor !== 'object' || !('score' in factor)) return null
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Icon size={12} className={getScoreColor(factor.score)} />
                      <span className="text-[var(--muted)]">{name}</span>
                      <span className="text-[var(--muted)] opacity-60">({weight})</span>
                    </div>
                    <span className={getScoreColor(factor.score)}>{factor.score}</span>
                  </div>
                  <div className="h-1 bg-[var(--card)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        factor.score >= 80 ? 'bg-emerald-500' :
                        factor.score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>
                  {factor.suggestion && (
                    <p className="text-xs text-[var(--muted)]">💡 {factor.suggestion}</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Warnings (replaces old length/emoji/hashtag factors) */}
          {engagementScore.warnings && engagementScore.warnings.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
              {engagementScore.warnings.map((warning, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                    warning.severity === 'warning'
                      ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400'
                      : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                  }`}
                >
                  <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

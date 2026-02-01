'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Wand2, Zap, Sparkles, ListTree, BarChart3, Loader2,
  AlertTriangle, MessageCircle, Flame, X, Clock, WandSparkles, Undo2
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
    description: 'Automatically apply the best improvements (⌘A)',
    icon: WandSparkles,
    color: 'text-violet-400',
    hoverBg: 'hover:bg-violet-500/10 hover:border-violet-500/30',
    shortcut: 'a',
  },
  {
    id: 'add_hook',
    label: 'Add Hook',
    shortLabel: 'Hook',
    description: 'Add a scroll-stopping opening line (⌘H)',
    icon: Zap,
    color: 'text-amber-400',
    hoverBg: 'hover:bg-amber-500/10 hover:border-amber-500/30',
    shortcut: 'h',
  },
  {
    id: 'humanize',
    label: 'Humanize',
    shortLabel: 'Humanize',
    description: 'Make it sound natural (⌘U)',
    icon: Sparkles,
    color: 'text-pink-400',
    hoverBg: 'hover:bg-pink-500/10 hover:border-pink-500/30',
    shortcut: 'u',
  },
  {
    id: 'sharpen',
    label: 'Shorten',
    shortLabel: 'Shorten',
    description: 'Reduce to 180-280 chars (⌘S)',
    icon: Wand2,
    color: 'text-cyan-400',
    hoverBg: 'hover:bg-cyan-500/10 hover:border-cyan-500/30',
    shortcut: 's',
  },
  {
    id: 'add_question',
    label: 'Add Question',
    shortLabel: 'Question',
    description: 'End with a question (⌘Q)',
    icon: MessageCircle,
    color: 'text-blue-400',
    hoverBg: 'hover:bg-blue-500/10 hover:border-blue-500/30',
    shortcut: 'q',
  },
  {
    id: 'make_spicy',
    label: 'Make Spicier',
    shortLabel: 'Spicier',
    description: 'Add controversy (⌘P)',
    icon: Flame,
    color: 'text-orange-400',
    hoverBg: 'hover:bg-orange-500/10 hover:border-orange-500/30',
    shortcut: 'p',
  },
  {
    id: 'make_thread',
    label: 'Expand to Thread',
    shortLabel: 'Thread',
    description: 'Expand into a multi-tweet thread (⌘T)',
    icon: ListTree,
    color: 'text-purple-400',
    hoverBg: 'hover:bg-purple-500/10 hover:border-purple-500/30',
    shortcut: 't',
  },
  {
    id: 'algorithm_check',
    label: 'Check Score',
    shortLabel: 'Score',
    description: 'Score against X algorithm factors (⌘E)',
    icon: BarChart3,
    color: 'text-emerald-400',
    hoverBg: 'hover:bg-emerald-500/10 hover:border-emerald-500/30',
    shortcut: 'e',
  },
]

// Using shared EngagementScore from engagement-scorer for consistency with Workspace

export default function EditingTools({ content, onContentChange, isThread = false, hideScore = false }: EditingToolsProps) {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [engagementScore, setEngagementScore] = useState<EngagementScore | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scoreChange, setScoreChange] = useState<{ before: number; after: number; tool: string; improvements?: string[] } | null>(null)
  const [previousContent, setPreviousContent] = useState<string | null>(null)
  const [autoProgress, setAutoProgress] = useState<string | null>(null)

  // Keyboard shortcuts handler - wrapped in useCallback to prevent re-renders
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only trigger if Cmd (Mac) or Ctrl (Windows) is held
    if (!(e.metaKey || e.ctrlKey)) return
    
    // Don't trigger when typing in input/textarea
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

    const tool = TOOLS.find(t => t.shortcut === e.key.toLowerCase())
    if (tool) {
      e.preventDefault()
      // Trigger the tool - we'll call handleToolClick indirectly via a ref
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

  // Set up keyboard shortcuts
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Helper to identify which factors improved
  const getImprovements = (before: EngagementScore, after: EngagementScore): string[] => {
    const improvements: string[] = []
    const factors = ['hookStrength', 'replyPotential', 'length', 'readability'] as const
    const labels: Record<typeof factors[number], string> = {
      hookStrength: 'Hook',
      replyPotential: 'Replies',
      length: 'Length',
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
      // Toggle score check - if already showing, hide it
      if (engagementScore) {
        setEngagementScore(null)
        setActiveTool(null)
        return
      }
      // Use shared scorer for consistency with Workspace
      setEngagementScore(scoreEngagement(content))
      return
    }

    setEngagementScore(null)
    setIsLoading(true)
    
    // Save current content for undo
    setPreviousContent(content)

    // Calculate score BEFORE the edit
    const beforeScore = scoreEngagement(content)

    try {
      // Auto-optimize: analyze score and apply best tools in sequence
      if (toolId === 'auto_optimize') {
        let currentContent = content
        const toolsApplied: string[] = []
        
        // Determine which tools to apply based on current scores
        const bd = beforeScore.breakdown
        const toolsToApply: ToolId[] = []
        
        // If hook score is low (<70), add hook
        if (bd.hookStrength.score < 70) toolsToApply.push('add_hook')
        
        // If reply potential is low (<50), make spicy first, then add question
        if (bd.replyPotential.score < 50) {
          toolsToApply.push('make_spicy')
        } else if (bd.replyPotential.score < 70) {
          // Medium reply potential - just add question
          toolsToApply.push('add_question')
        }
        
        // If length is bad (too long), sharpen
        if (bd.length.score < 80 && content.length > 280) toolsToApply.push('sharpen')
        
        // If readability is low, humanize
        if (bd.readability.score < 70) toolsToApply.push('humanize')
        
        // If overall score is mediocre (<60) and we haven't added spicy yet, add it
        if (beforeScore.score < 60 && !toolsToApply.includes('make_spicy')) {
          toolsToApply.push('make_spicy')
        }
        
        // Always end with question if reply potential could be better
        if (bd.replyPotential.score < 80 && !toolsToApply.includes('add_question')) {
          toolsToApply.push('add_question')
        }
        
        // If nothing obvious, polish with humanize
        if (toolsToApply.length === 0) {
          toolsToApply.push('humanize')
        }
        
        // Apply tools in sequence, with retry to ensure score improvement
        for (const tool of toolsToApply) {
          try {
            const toolLabel = TOOLS.find(t => t.id === tool)?.shortLabel || tool
            setAutoProgress(`Applying ${toolLabel}...`)
            
            const currentScore = scoreEngagement(currentContent).score
            let bestResult = currentContent
            let bestScore = currentScore
            
            // Try up to 2 times to improve score with this tool
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
                  break // Got improvement, stop retrying
                }
              }
            }
            
            // Only apply if we got an improvement
            if (bestScore > currentScore) {
              currentContent = bestResult
              toolsApplied.push(toolLabel)
            }
          } catch {
            // Continue with next tool if one fails
          }
        }
        
        setAutoProgress(null) // Clear progress
        
        // Only update if at least one tool was applied successfully
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
          // All tools failed
          setError('Auto-optimize failed. Try individual tools instead.')
          setPreviousContent(null) // Clear undo since nothing changed
        }
      } else {
        // Single tool application with retry if score doesn't improve
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
          
          // Keep this result if it improves the score
          if (newScore > bestScore) {
            bestContent = data.content
            bestScore = newScore
            break // Success! Stop retrying
          }
          
          // On last attempt, use best result we got (even if not improved)
          if (attempt === maxRetries) {
            if (newScore >= bestScore) {
              bestContent = data.content
              bestScore = newScore
            }
            // Otherwise keep original content
          }
        }
        
        // Show score change feedback
        if (bestScore > beforeScore.score) {
          const afterScoreObj = scoreEngagement(bestContent)
          const improvements = getImprovements(beforeScore, afterScoreObj)
          setScoreChange({ before: beforeScore.score, after: bestScore, tool: toolLabel, improvements })
          setTimeout(() => setScoreChange(null), 4000)
          onContentChange(bestContent)
        } else if (bestContent !== content) {
          // Content changed but score didn't improve - still apply but note it
          setScoreChange({ before: beforeScore.score, after: bestScore, tool: `${toolLabel} (already optimized)` })
          setTimeout(() => setScoreChange(null), 4000)
          onContentChange(bestContent)
        } else {
          // No change at all - content is already optimal for this tool
          setScoreChange({ before: beforeScore.score, after: beforeScore.score, tool: `${toolLabel} ✓ Already optimized` })
          setTimeout(() => setScoreChange(null), 3000)
          setPreviousContent(null) // Clear undo since nothing changed
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
    // Hide "Score" if engagement panel is already visible (Workspace)
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
        <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/30 rounded-lg text-violet-400 text-sm">
          <Loader2 size={14} className="animate-spin flex-shrink-0" />
          <span>{autoProgress}</span>
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
          {/* Show which factors improved */}
          {scoreChange.improvements && scoreChange.improvements.length > 0 && (
            <div className="text-xs opacity-80 ml-5">
              Improved: {scoreChange.improvements.join(' • ')}
            </div>
          )}
        </div>
      )}

      {/* Engagement Score Display - matches Workspace panel */}
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

          {/* Factor Breakdown - same factors as Workspace */}
          <div className="space-y-2">
            {[
              { key: 'hookStrength', name: 'Hook Strength', icon: Zap },
              { key: 'replyPotential', name: 'Reply Potential', icon: MessageCircle },
              { key: 'length', name: 'Length', icon: BarChart3 },
              { key: 'readability', name: 'Readability', icon: Sparkles },
              { key: 'hashtagUsage', name: 'Hashtags / Links', icon: AlertTriangle },
              { key: 'emojiUsage', name: 'Emoji Usage', icon: Sparkles },
            ].map(({ key, name, icon: Icon }) => {
              const factor = engagementScore.breakdown[key as keyof typeof engagementScore.breakdown]
              if (!factor || typeof factor !== 'object' || !('score' in factor)) return null
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Icon size={12} className={getScoreColor(factor.score)} />
                      <span className="text-[var(--muted)]">{name}</span>
                    </div>
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
                  {factor.suggestion && (
                    <p className="text-xs text-[var(--muted)]">💡 {factor.suggestion}</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Best Time Recommendation */}
          <div className="flex items-start gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <Clock size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-blue-400">{engagementScore.breakdown.bestTime.recommendation}</p>
              <p className="text-xs text-blue-400/70">{engagementScore.breakdown.bestTime.reason}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { scoreEngagement, type EngagementScore, type ScoreDetail } from '@/lib/engagement-scorer'
import { Sparkles, Clock, ChevronDown, ChevronUp, Zap, MessageCircle, Ruler, BookOpen, Hash, Smile, Loader2, X } from 'lucide-react'

interface EngagementPanelProps {
  text: string
  postType?: string
  onInsertText?: (text: string) => void
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e' // green
  if (score >= 50) return '#eab308' // yellow
  return '#ef4444' // red
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-500/10 border-green-500/30 dark:bg-green-500/10 dark:border-green-500/30'
  if (score >= 50) return 'bg-yellow-500/10 border-yellow-500/30 dark:bg-yellow-500/10 dark:border-yellow-500/30'
  return 'bg-red-500/10 border-red-500/30 dark:bg-red-500/10 dark:border-red-500/30'
}

function getScoreTextColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function ScoreGauge({ score }: { score: number }) {
  const color = getScoreColor(score)
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
        {/* Background circle */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-[var(--border)]"
        />
        {/* Score arc */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-[var(--muted)] uppercase tracking-wider">Score</span>
      </div>
    </div>
  )
}

const factorIcons: Record<string, React.ReactNode> = {
  hookStrength: <Zap className="w-4 h-4" />,
  replyPotential: <MessageCircle className="w-4 h-4" />,
  length: <Ruler className="w-4 h-4" />,
  readability: <BookOpen className="w-4 h-4" />,
  hashtagUsage: <Hash className="w-4 h-4" />,
  emojiUsage: <Smile className="w-4 h-4" />,
}

const factorNames: Record<string, string> = {
  hookStrength: 'Hook Strength',
  replyPotential: 'Reply Potential',
  length: 'Length',
  readability: 'Readability',
  hashtagUsage: 'Hashtags / Cashtags',
  emojiUsage: 'Emoji Usage',
}

function FactorCard({ name, detail, onInsertTag }: { name: string; detail: ScoreDetail; onInsertTag?: (tag: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const color = getScoreColor(detail.score)
  const hasExpandableContent = detail.suggestion || (detail.explanation && detail.score > 0)

  return (
    <div className={`border rounded-lg p-3 ${getScoreBg(detail.score)} transition-all`}>
      <button
        onClick={() => hasExpandableContent && setExpanded(!expanded)}
        className={`w-full flex items-center justify-between ${hasExpandableContent ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-center gap-2">
          <span style={{ color }}>{factorIcons[name]}</span>
          <span className="text-sm font-medium text-[var(--foreground)]">{factorNames[name]}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${getScoreTextColor(detail.score)}`}>
            {Math.round(detail.score / 10)}/10
          </span>
          <div className="w-16 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${detail.score}%`, backgroundColor: color }}
            />
          </div>
          {hasExpandableContent ? (
            expanded ? <ChevronUp className="w-3 h-3 text-[var(--muted)]" /> : <ChevronDown className="w-3 h-3 text-[var(--muted)]" />
          ) : (
            <span className="w-3" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-[var(--border)]/50 space-y-2">
          {/* Explanation - what we observed */}
          {detail.explanation && (
            <p className="text-xs text-[var(--foreground)]/80">{detail.explanation}</p>
          )}
          {/* Suggestion - how to improve */}
          {detail.suggestion && (
            <p className="text-xs text-[var(--muted)] italic">💡 {detail.suggestion}</p>
          )}
          {detail.suggested && detail.suggested.length > 0 && onInsertTag && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {detail.suggested.map(tag => (
                <button
                  key={tag}
                  onClick={(e) => { e.stopPropagation(); onInsertTag(tag) }}
                  className="px-2 py-0.5 text-xs font-medium bg-[var(--background)] border border-[var(--border)] rounded-full hover:bg-accent hover:text-white hover:border-accent transition-colors cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface AIAnalysis {
  overallFeedback?: string
  hookRewrite?: string | null
  suggestedCTA?: string | null
  suggestedCashtags?: string[]
  toneAnalysis?: string
  viralPotential?: string
  specificTips?: string[]
}

export function EngagementPanel({ text, postType, onInsertText }: EngagementPanelProps) {
  const [score, setScore] = useState<EngagementScore | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced client-side scoring
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setScore(scoreEngagement(text))
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [text])

  const handleDeepAnalysis = useCallback(async () => {
    if (!text.trim()) return
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/engagement/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, postType }),
      })
      if (!res.ok) throw new Error('Failed to analyze')
      const data = await res.json()
      if (data.aiAnalysis) {
        setAiAnalysis(data.aiAnalysis)
      }
      // Also update score from server
      if (data.score !== undefined) {
        setScore(data)
      }
    } catch {
      setAiError('Deep analysis failed — try again')
    } finally {
      setAiLoading(false)
    }
  }, [text, postType])

  const handleInsertTag = useCallback((tag: string) => {
    onInsertText?.(' ' + tag)
  }, [onInsertText])

  if (!score) return null

  const bd = score.breakdown

  return (
    <div className="border-t border-[var(--border)] bg-[var(--card)]">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--border)]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-[var(--foreground)]">Engagement Score</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-lg font-bold"
            style={{ color: getScoreColor(score.score) }}
          >
            {score.score}
          </span>
          {collapsed ? <ChevronDown className="w-4 h-4 text-[var(--muted)]" /> : <ChevronUp className="w-4 h-4 text-[var(--muted)]" />}
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-4">
          {/* Gauge */}
          <ScoreGauge score={score.score} />

          {/* Factor Cards */}
          <div className="space-y-2">
            {(Object.keys(factorNames) as Array<keyof typeof factorNames>).map(key => (
              <FactorCard
                key={key}
                name={key}
                detail={bd[key as keyof Omit<typeof bd, 'bestTime'>] as ScoreDetail}
                onInsertTag={key === 'hashtagUsage' ? handleInsertTag : undefined}
              />
            ))}
          </div>

          {/* Best Time */}
          <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{bd.bestTime.recommendation}</p>
              <p className="text-xs text-blue-500/80 dark:text-blue-400/70">{bd.bestTime.reason}</p>
            </div>
          </div>

          {/* Deep Analysis Button */}
          <button
            onClick={handleDeepAnalysis}
            disabled={aiLoading || !text.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {aiLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Deep Analysis
              </>
            )}
          </button>

          {aiError && (
            <p className="text-xs text-red-500 text-center">{aiError}</p>
          )}

          {/* AI Analysis Results */}
          {aiAnalysis && (
            <div className="space-y-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg relative">
              <button
                onClick={() => setAiAnalysis(null)}
                className="absolute top-2 right-2 p-1 hover:bg-purple-500/20 rounded"
              >
                <X className="w-3 h-3 text-purple-400" />
              </button>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">AI Analysis</span>
                {aiAnalysis.viralPotential && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    aiAnalysis.viralPotential === 'high' ? 'bg-green-100 text-green-700' :
                    aiAnalysis.viralPotential === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {aiAnalysis.viralPotential} viral potential
                  </span>
                )}
              </div>

              {aiAnalysis.overallFeedback && (
                <p className="text-xs text-purple-600 dark:text-purple-300">{aiAnalysis.overallFeedback}</p>
              )}

              {aiAnalysis.hookRewrite && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400">✏️ Suggested hook:</p>
                  <button
                    onClick={() => onInsertText?.(aiAnalysis.hookRewrite || '')}
                    className="text-xs bg-[var(--background)] border border-purple-500/30 rounded p-2 w-full text-left hover:bg-purple-500/20 transition-colors text-purple-600 dark:text-purple-300"
                    title="Click to insert"
                  >
                    {aiAnalysis.hookRewrite}
                  </button>
                </div>
              )}

              {aiAnalysis.suggestedCTA && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400">💬 Suggested CTA:</p>
                  <button
                    onClick={() => onInsertText?.('\n\n' + (aiAnalysis.suggestedCTA || ''))}
                    className="text-xs bg-[var(--background)] border border-purple-500/30 rounded p-2 w-full text-left hover:bg-purple-500/20 transition-colors text-purple-600 dark:text-purple-300"
                    title="Click to append"
                  >
                    {aiAnalysis.suggestedCTA}
                  </button>
                </div>
              )}

              {aiAnalysis.suggestedCashtags && aiAnalysis.suggestedCashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {aiAnalysis.suggestedCashtags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => onInsertText?.(' ' + tag)}
                      className="px-2 py-0.5 text-xs font-medium bg-[var(--background)] border border-purple-500/30 rounded-full hover:bg-accent hover:text-white hover:border-accent transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {aiAnalysis.specificTips && aiAnalysis.specificTips.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400">💡 Tips:</p>
                  <ul className="space-y-1">
                    {aiAnalysis.specificTips.map((tip, i) => (
                      <li key={i} className="text-xs text-purple-600 dark:text-purple-300 flex items-start gap-1">
                        <span className="text-purple-400 mt-0.5">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

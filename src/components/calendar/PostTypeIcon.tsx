'use client'

import { useState } from 'react'
import { TrendingUp, Flame, BarChart3, Sparkles, BookOpen, Hammer, PenLine } from 'lucide-react'

export type GenerationType =
  | 'market_take'
  | 'hot_take'
  | 'on_chain_insight'
  | 'alpha_thread'
  | 'protocol_breakdown'
  | 'build_in_public'
  | 'user_generated'

interface PostTypeIconProps {
  type: GenerationType
  size?: 'sm' | 'md'
}

// Canonical post-type color config — used by calendar pills, icons, filters, etc.
export const typeConfig: Record<GenerationType, {
  label: string
  icon: typeof TrendingUp
  bgColor: string
  bgColorSolid: string   // slightly stronger bg for calendar pills
  textColor: string
  borderColor: string
}> = {
  alpha_thread: {
    label: 'Alpha Thread',
    icon: Sparkles,
    bgColor: 'bg-emerald-500/20',
    bgColorSolid: 'bg-emerald-500/25',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
  },
  market_take: {
    label: 'Market Take',
    icon: TrendingUp,
    bgColor: 'bg-blue-500/20',
    bgColorSolid: 'bg-blue-500/25',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/40',
  },
  hot_take: {
    label: 'Hot Take',
    icon: Flame,
    bgColor: 'bg-orange-500/20',
    bgColorSolid: 'bg-orange-500/25',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/40',
  },
  on_chain_insight: {
    label: 'On-Chain Insight',
    icon: BarChart3,
    bgColor: 'bg-purple-500/20',
    bgColorSolid: 'bg-purple-500/25',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/40',
  },
  protocol_breakdown: {
    label: 'Protocol Breakdown',
    icon: BookOpen,
    bgColor: 'bg-blue-500/20',
    bgColorSolid: 'bg-blue-500/25',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/40',
  },
  build_in_public: {
    label: 'Build in Public',
    icon: Hammer,
    bgColor: 'bg-pink-500/20',
    bgColorSolid: 'bg-pink-500/25',
    textColor: 'text-pink-400',
    borderColor: 'border-pink-500/40',
  },
  user_generated: {
    label: 'User Generated',
    icon: PenLine,
    bgColor: 'bg-slate-400/20',
    bgColorSolid: 'bg-slate-400/25',
    textColor: 'text-slate-300',
    borderColor: 'border-slate-400/40',
  },
}

export default function PostTypeIcon({ type, size = 'md' }: PostTypeIconProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const config = typeConfig[type]

  if (!config) return null

  const Icon = config.icon
  const iconSize = size === 'sm' ? 12 : 14
  const padding = size === 'sm' ? 'p-1' : 'p-1.5'

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={`
          inline-flex items-center justify-center rounded
          ${config.bgColor} ${config.textColor} ${padding}
        `}
      >
        <Icon size={iconSize} strokeWidth={2} />
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="
            absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5
            px-2 py-1 rounded text-xs font-medium whitespace-nowrap
            bg-[var(--card)] border border-[var(--border)] shadow-lg
            text-[var(--foreground)]
          "
        >
          {config.label}
          <div
            className="
              absolute top-full left-1/2 -translate-x-1/2 -mt-px
              border-4 border-transparent border-t-[var(--border)]
            "
          />
        </div>
      )}
    </div>
  )
}

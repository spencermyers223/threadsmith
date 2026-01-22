'use client'

import { useState } from 'react'
import { Eye, MessageCircle, Rocket } from 'lucide-react'

export type GenerationType = 'scroll_stopper' | 'debate_starter' | 'viral_catalyst'

interface PostTypeIconProps {
  type: GenerationType
  size?: 'sm' | 'md'
}

const typeConfig: Record<GenerationType, {
  label: string
  icon: typeof Eye
  bgColor: string
  textColor: string
}> = {
  scroll_stopper: {
    label: 'Scroll Stopper',
    icon: Eye,
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
  },
  debate_starter: {
    label: 'Debate Starter',
    icon: MessageCircle,
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
  },
  viral_catalyst: {
    label: 'Viral Catalyst',
    icon: Rocket,
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-400',
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

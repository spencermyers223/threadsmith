'use client'

import {
  MessageCircle,
  GraduationCap,
  Flame,
  Award
} from 'lucide-react'
import { LucideIcon } from 'lucide-react'

export type VoiceStyle = 'casual' | 'educational' | 'hot-take' | 'professional'

interface VoiceStyleOption {
  id: VoiceStyle
  label: string
  description: string
  icon: LucideIcon
}

const voiceStyles: VoiceStyleOption[] = [
  {
    id: 'casual',
    label: 'Casual',
    description: 'Friendly, conversational',
    icon: MessageCircle,
  },
  {
    id: 'educational',
    label: 'Educational',
    description: 'Informative, teaching',
    icon: GraduationCap,
  },
  {
    id: 'hot-take',
    label: 'Hot Take',
    description: 'Bold, contrarian',
    icon: Flame,
  },
  {
    id: 'professional',
    label: 'Professional',
    description: 'Polished, expert',
    icon: Award,
  },
]

interface VoiceStyleSelectorProps {
  selectedStyle: VoiceStyle | null
  onSelect: (style: VoiceStyle) => void
}

export default function VoiceStyleSelector({ selectedStyle, onSelect }: VoiceStyleSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[var(--foreground)]">
        What&apos;s your voice style?
      </label>
      <div className="grid grid-cols-2 gap-3">
        {voiceStyles.map((style) => {
          const Icon = style.icon
          const isSelected = selectedStyle === style.id

          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelect(style.id)}
              className={`
                flex flex-col items-start gap-2 p-4 rounded-lg
                border transition-all duration-150 text-left
                ${isSelected
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                  : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/50'
                }
              `}
            >
              <div className={`
                p-2 rounded-md
                ${isSelected
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                  : 'bg-[var(--background)] text-[var(--muted)]'
                }
              `}>
                <Icon size={20} strokeWidth={1.5} />
              </div>
              <div>
                <span className={`
                  block text-sm font-medium
                  ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'}
                `}>
                  {style.label}
                </span>
                <span className="block text-xs text-[var(--muted)] mt-0.5">
                  {style.description}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

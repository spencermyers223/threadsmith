'use client'

import {
  Monitor,
  TrendingUp,
  Megaphone,
  Dumbbell,
  Users,
  Gamepad2,
  GraduationCap,
  Heart,
  Briefcase,
  Palette,
  MoreHorizontal,
  LucideIcon
} from 'lucide-react'

export type Niche =
  | 'technology'
  | 'finance'
  | 'marketing'
  | 'sports-fitness'
  | 'entertainment'
  | 'education'
  | 'health-wellness'
  | 'business'
  | 'creative'
  | 'lifestyle'
  | 'other'
  // Legacy aliases for backwards compatibility
  | 'ai-ml'
  | 'crypto-web3'
  | 'web3-crypto'
  | 'saas-tech'
  | 'general-tech'

interface NicheOption {
  id: Niche
  label: string
  icon: LucideIcon
  description: string
}

const niches: NicheOption[] = [
  { 
    id: 'technology', 
    label: 'Technology', 
    icon: Monitor,
    description: 'AI, crypto, dev tools, startups, gadgets'
  },
  { 
    id: 'finance', 
    label: 'Finance & Investing', 
    icon: TrendingUp,
    description: 'Markets, trading, personal finance, crypto'
  },
  { 
    id: 'marketing', 
    label: 'Marketing & Sales', 
    icon: Megaphone,
    description: 'Growth, social media, copywriting, ads'
  },
  { 
    id: 'business', 
    label: 'Business & Startups', 
    icon: Briefcase,
    description: 'Entrepreneurship, leadership, productivity'
  },
  { 
    id: 'sports-fitness', 
    label: 'Sports & Fitness', 
    icon: Dumbbell,
    description: 'Athletics, training, nutrition, sports news'
  },
  { 
    id: 'entertainment', 
    label: 'Entertainment & Media', 
    icon: Gamepad2,
    description: 'Gaming, movies, music, pop culture'
  },
  { 
    id: 'education', 
    label: 'Education & Career', 
    icon: GraduationCap,
    description: 'Learning, career advice, skill building'
  },
  { 
    id: 'health-wellness', 
    label: 'Health & Wellness', 
    icon: Heart,
    description: 'Mental health, self-care, medical'
  },
  { 
    id: 'creative', 
    label: 'Creative & Design', 
    icon: Palette,
    description: 'Art, photography, writing, design'
  },
  { 
    id: 'lifestyle', 
    label: 'Lifestyle & Creator', 
    icon: Users,
    description: 'Travel, food, fashion, personal brand'
  },
  { 
    id: 'other', 
    label: 'Other', 
    icon: MoreHorizontal,
    description: 'Something else entirely'
  },
]

interface NicheSelectorProps {
  selectedNiches?: Niche[]
  selectedNiche?: Niche | null
  onSelect: (niche: Niche) => void
  multiSelect?: boolean
}

export default function NicheSelector({ 
  selectedNiches = [],
  selectedNiche,
  onSelect,
  multiSelect = true
}: NicheSelectorProps) {
  // Support both single and multi-select modes
  const isSelected = (id: Niche) => {
    if (multiSelect) {
      return selectedNiches.includes(id)
    }
    // Handle legacy aliases
    if (id === 'technology') {
      return selectedNiche === id || 
        selectedNiche === 'ai-ml' || 
        selectedNiche === 'crypto-web3' ||
        selectedNiche === 'web3-crypto' ||
        selectedNiche === 'saas-tech' ||
        selectedNiche === 'general-tech'
    }
    return selectedNiche === id
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {niches.map((niche) => {
        const Icon = niche.icon
        const selected = isSelected(niche.id)

        return (
          <button
            key={niche.id}
            type="button"
            onClick={() => onSelect(niche.id)}
            className={`
              flex items-start gap-3 p-4 rounded-lg text-left
              border transition-all duration-150
              ${selected
                ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/50'
              }
            `}
          >
            <div className={`mt-0.5 ${selected ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>
              <Icon size={20} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-medium ${selected ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'}`}>
                {niche.label}
              </div>
              <div className="text-xs text-[var(--muted)] mt-0.5 truncate">
                {niche.description}
              </div>
            </div>
            {multiSelect && (
              <div className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                ${selected 
                  ? 'border-[var(--accent)] bg-[var(--accent)]' 
                  : 'border-[var(--border)]'
                }
              `}>
                {selected && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Export for use in other components
export { niches }

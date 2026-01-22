'use client'

import {
  Bitcoin,
  TrendingUp,
  Monitor,
  Megaphone,
  Dumbbell,
  Users,
  ShoppingBag,
  Briefcase,
  Trophy,
  Newspaper,
  MoreHorizontal,
  LucideIcon
} from 'lucide-react'

export type Niche =
  | 'web3-crypto'
  | 'finance-investing'
  | 'saas-tech'
  | 'marketing-agency'
  | 'fitness-health'
  | 'creator-economy'
  | 'ecommerce-dtc'
  | 'career-job-advice'
  | 'sports'
  | 'news'
  | 'other'

interface NicheOption {
  id: Niche
  label: string
  icon: LucideIcon
}

const niches: NicheOption[] = [
  { id: 'web3-crypto', label: 'Web3/Crypto', icon: Bitcoin },
  { id: 'finance-investing', label: 'Finance/Investing', icon: TrendingUp },
  { id: 'saas-tech', label: 'SaaS/Tech', icon: Monitor },
  { id: 'marketing-agency', label: 'Marketing/Agency', icon: Megaphone },
  { id: 'fitness-health', label: 'Fitness/Health', icon: Dumbbell },
  { id: 'creator-economy', label: 'Creator Economy', icon: Users },
  { id: 'ecommerce-dtc', label: 'E-commerce/DTC', icon: ShoppingBag },
  { id: 'career-job-advice', label: 'Career/Job Advice', icon: Briefcase },
  { id: 'sports', label: 'Sports', icon: Trophy },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
]

interface NicheSelectorProps {
  selectedNiche: Niche | null
  onSelect: (niche: Niche) => void
}

export default function NicheSelector({ selectedNiche, onSelect }: NicheSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[var(--foreground)]">
        What&apos;s your content niche?
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {niches.map((niche) => {
          const Icon = niche.icon
          const isSelected = selectedNiche === niche.id

          return (
            <button
              key={niche.id}
              type="button"
              onClick={() => onSelect(niche.id)}
              className={`
                flex flex-col items-center justify-center gap-2 p-4 rounded-lg
                border transition-all duration-150
                ${isSelected
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]'
                }
              `}
            >
              <Icon size={24} strokeWidth={1.5} />
              <span className="text-sm font-medium text-center">{niche.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

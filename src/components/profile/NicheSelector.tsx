'use client'

import {
  Brain,
  Coins,
  Cpu,
  Atom,
  HeartPulse,
  Rocket,
  Leaf,
  Landmark,
  Shield,
  Code,
  Gamepad2,
  Monitor,
  TrendingUp,
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
  // Tech niches (primary focus)
  | 'ai-ml'
  | 'crypto-web3'
  | 'robotics'
  | 'quantum'
  | 'biotech'
  | 'space'
  | 'climate'
  | 'fintech'
  | 'cybersecurity'
  | 'devtools'
  | 'gaming'
  | 'general-tech'
  // Legacy/general niches
  | 'saas-tech'
  | 'finance-investing'
  | 'marketing-agency'
  | 'fitness-health'
  | 'creator-economy'
  | 'ecommerce-dtc'
  | 'career-job-advice'
  | 'sports'
  | 'news'
  | 'other'
  // Legacy alias
  | 'web3-crypto'

interface NicheOption {
  id: Niche
  label: string
  icon: LucideIcon
}

// Tech-focused niches (shown first)
const techNiches: NicheOption[] = [
  { id: 'ai-ml', label: 'AI / ML', icon: Brain },
  { id: 'crypto-web3', label: 'Crypto / Web3', icon: Coins },
  { id: 'robotics', label: 'Robotics / Hardware', icon: Cpu },
  { id: 'quantum', label: 'Quantum Computing', icon: Atom },
  { id: 'biotech', label: 'Biotech / Health Tech', icon: HeartPulse },
  { id: 'space', label: 'Space / Aerospace', icon: Rocket },
  { id: 'climate', label: 'Climate Tech', icon: Leaf },
  { id: 'fintech', label: 'Fintech', icon: Landmark },
  { id: 'cybersecurity', label: 'Cybersecurity', icon: Shield },
  { id: 'devtools', label: 'Developer Tools', icon: Code },
  { id: 'gaming', label: 'Gaming / VR / AR', icon: Gamepad2 },
  { id: 'general-tech', label: 'General Tech', icon: Monitor },
]

// General niches
const generalNiches: NicheOption[] = [
  { id: 'saas-tech', label: 'SaaS / Startups', icon: Monitor },
  { id: 'finance-investing', label: 'Finance / Investing', icon: TrendingUp },
  { id: 'marketing-agency', label: 'Marketing / Agency', icon: Megaphone },
  { id: 'fitness-health', label: 'Fitness / Health', icon: Dumbbell },
  { id: 'creator-economy', label: 'Creator Economy', icon: Users },
  { id: 'ecommerce-dtc', label: 'E-commerce / DTC', icon: ShoppingBag },
  { id: 'career-job-advice', label: 'Career / Job Advice', icon: Briefcase },
  { id: 'sports', label: 'Sports', icon: Trophy },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
]

// Combined list for backwards compatibility
const niches: NicheOption[] = [...techNiches, ...generalNiches]

interface NicheSelectorProps {
  selectedNiche: Niche | null
  onSelect: (niche: Niche) => void
  showTechOnly?: boolean
}

export default function NicheSelector({ 
  selectedNiche, 
  onSelect,
  showTechOnly = false 
}: NicheSelectorProps) {
  const displayNiches = showTechOnly ? techNiches : niches

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[var(--foreground)]">
        What&apos;s your content niche?
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {displayNiches.map((niche) => {
          const Icon = niche.icon
          // Handle legacy 'web3-crypto' alias
          const isSelected = selectedNiche === niche.id || 
            (niche.id === 'crypto-web3' && selectedNiche === 'web3-crypto')

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

// Export for use in other components
export { techNiches, generalNiches, niches }

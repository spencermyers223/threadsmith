'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { XAnalyticsDashboard } from '@/components/analytics/XAnalyticsDashboard'
import { Marketplace } from '@/components/analytics/Marketplace'
import { BarChart3, ShoppingCart, Loader2 } from 'lucide-react'

type TabType = 'analytics' | 'marketplace'

export default function AnalyticsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('analytics')
  const [userCredits, setUserCredits] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
        return
      }

      // Fetch user's credits
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserCredits(profile.credits || 0)
      }
      
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleCreditsUsed = (amount: number) => {
    setUserCredits(prev => Math.max(0, prev - amount))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Tabs - matching Creator Hub style */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-1 p-1 bg-[var(--card)] rounded-lg border border-[var(--border)]">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${activeTab === 'analytics'
                ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }
            `}
          >
            <BarChart3 className="w-4 h-4" />
            Your Analytics
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${activeTab === 'marketplace'
                ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }
            `}
          >
            <ShoppingCart className="w-4 h-4" />
            Marketplace
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'analytics' ? (
        <XAnalyticsDashboard />
      ) : (
        <Marketplace 
          userCredits={userCredits} 
          onCreditsUsed={handleCreditsUsed}
        />
      )}
    </div>
  )
}

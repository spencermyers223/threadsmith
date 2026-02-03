'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { XAnalyticsDashboard } from '@/components/analytics/XAnalyticsDashboard'
import { AccountResearcher } from '@/components/analytics/AccountResearcher'
import { AccountOverview } from '@/components/analytics/AccountOverview'
import { BarChart3, Search, Sparkles, Loader2 } from 'lucide-react'

type TabType = 'posts' | 'overview' | 'research'

export default function AnalyticsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('posts')
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

      // Fetch user's credits from subscriptions table
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('credits')
        .eq('user_id', user.id)
        .single()

      if (subscription) {
        setUserCredits(subscription.credits || 0)
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
            onClick={() => setActiveTab('posts')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${activeTab === 'posts'
                ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }
            `}
          >
            <BarChart3 className="w-4 h-4" />
            Recent Posts
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${activeTab === 'overview'
                ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }
            `}
          >
            <Sparkles className="w-4 h-4" />
            Account Overview
          </button>
          <button
            onClick={() => setActiveTab('research')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${activeTab === 'research'
                ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }
            `}
          >
            <Search className="w-4 h-4" />
            Account Research
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'posts' ? (
        <XAnalyticsDashboard />
      ) : activeTab === 'overview' ? (
        <AccountOverview />
      ) : (
        <AccountResearcher 
          userCredits={userCredits} 
          onCreditsUsed={handleCreditsUsed}
        />
      )}
    </div>
  )
}

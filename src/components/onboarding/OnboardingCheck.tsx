'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import OnboardingModal from './OnboardingModal'

interface OnboardingCheckProps {
  children: React.ReactNode
}

export default function OnboardingCheck({ children }: OnboardingCheckProps) {
  const router = useRouter()
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return
      }

      // Check if user has completed onboarding (may have multiple profiles for different X accounts)
      const { data: profiles } = await supabase
        .from('content_profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)

      // Show onboarding if no profiles exist or NONE have completed onboarding
      const hasCompletedOnboarding = profiles && profiles.some(p => p.onboarding_completed)
      if (!hasCompletedOnboarding) {
        setShowOnboarding(true)
      }
    } catch (error) {
      // If there's an error (e.g., table doesn't exist yet), don't block the user
      console.error('Error checking onboarding status:', error)
    }
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    // Refresh the page to ensure all data is loaded
    router.refresh()
  }

  // Don't block rendering while checking - show content with potential modal overlay
  return (
    <>
      {children}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </>
  )
}

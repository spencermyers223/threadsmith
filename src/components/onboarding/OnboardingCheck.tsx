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
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsChecking(false)
        return
      }

      // Check if user has completed onboarding
      const { data: profile } = await supabase
        .from('content_profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .single()

      // Show onboarding if no profile exists or onboarding not completed
      if (!profile || !profile.onboarding_completed) {
        setShowOnboarding(true)
      }
    } catch (error) {
      // If there's an error (e.g., table doesn't exist yet), don't block the user
      console.error('Error checking onboarding status:', error)
    } finally {
      setIsChecking(false)
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

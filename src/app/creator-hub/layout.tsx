import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/dashboard/Header'
import { XAccountProvider } from '@/contexts/XAccountContext'
import OnboardingCheck from '@/components/onboarding/OnboardingCheck'

export default async function CreatorHubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return (
    <XAccountProvider>
      <OnboardingCheck>
        <div className="h-screen flex flex-col">
          <Header />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </OnboardingCheck>
    </XAccountProvider>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { XAnalyticsDashboard } from '@/components/analytics/XAnalyticsDashboard'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return <XAnalyticsDashboard />
}

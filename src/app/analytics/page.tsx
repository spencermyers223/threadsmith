import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: analytics } = await supabase
    .from('post_analytics')
    .select('*, posts:post_id(title, post_type, scheduled_date, scheduled_time)')
    .eq('user_id', user.id)
    .order('recorded_at', { ascending: false })

  return <AnalyticsDashboard data={analytics || []} />
}

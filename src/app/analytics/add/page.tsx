import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AddAnalyticsForm } from '@/components/analytics/AddAnalyticsForm'

export default async function AddAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, post_type, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <AddAnalyticsForm userId={user.id} posts={posts || []} />
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Fetch user's files for context
  const { data: files } = await supabase
    .from('files')
    .select('id, name, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <DashboardClient userId={user.id} files={files || []} />
}

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkCanGenerate, getFreeLimit } from '@/lib/generation-limits'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await checkCanGenerate(supabase, user.id)

    // Get subscription details if subscribed
    let subscription = null
    if (result.isSubscribed) {
      const { data } = await supabase
        .from('subscriptions')
        .select('status, plan_type, current_period_end')
        .eq('user_id', user.id)
        .in('status', ['active'])
        .single()

      subscription = data
    }

    const response = {
      canGenerate: result.canGenerate,
      remaining: result.remaining,
      isSubscribed: result.isSubscribed,
      freeLimit: getFreeLimit(),
      subscription,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('Usage check error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to check usage' },
      { status: 500 }
    )
  }
}

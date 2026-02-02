/**
 * Get current user's usage (credits and posts)
 * 
 * GET /api/subscription/usage
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUsageSummary } from '@/lib/credits'

export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const usage = await getUsageSummary(supabase, user.id)
  
  if (!usage.success) {
    return NextResponse.json({ error: usage.error }, { status: 500 })
  }

  return NextResponse.json({
    credits: usage.credits,
    postsUsed: usage.postsUsed,
    postsLimit: usage.postsLimit,
    tier: usage.tier,
  })
}

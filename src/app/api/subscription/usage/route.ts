/**
 * Get current user's usage (credits and posts)
 * 
 * GET /api/subscription/usage
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch subscription info
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('status, tier, credits, posts_used, trial_ends_at, current_period_end')
    .eq('user_id', user.id)
    .single()

  if (error || !subscription) {
    // No subscription found - return defaults for free tier
    return NextResponse.json({
      canGenerate: false,
      remaining: 0,
      isSubscribed: false,
      isTrial: false,
      trialDaysRemaining: null,
      subscription: null,
      credits: 0,
      postsUsed: 0,
      postsLimit: 10,
      tier: 'free',
    })
  }

  // Check if trial
  const now = new Date()
  const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null
  const isTrial = trialEndsAt && trialEndsAt > now
  const trialDaysRemaining = isTrial 
    ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Check if actively subscribed (active status OR lifetime)
  const isSubscribed = subscription.status === 'active' || subscription.status === 'lifetime'

  // Post limits by tier
  const postLimits: Record<string, number> = {
    free: 10,
    premium: 300,
    pro: -1, // Unlimited
  }
  const postsLimit = postLimits[subscription.tier] ?? 10

  // Can generate if subscribed OR on valid trial
  const canGenerate = isSubscribed || isTrial

  return NextResponse.json({
    canGenerate,
    remaining: postsLimit === -1 ? -1 : Math.max(0, postsLimit - (subscription.posts_used || 0)),
    isSubscribed,
    isTrial: isTrial || false,
    trialDaysRemaining,
    subscription: {
      status: subscription.status,
      plan_type: subscription.status === 'lifetime' ? 'lifetime' : 'monthly',
      tier: subscription.tier,
    },
    // Also include raw usage data
    credits: subscription.credits || 0,
    postsUsed: subscription.posts_used || 0,
    postsLimit,
    tier: subscription.tier,
  })
}

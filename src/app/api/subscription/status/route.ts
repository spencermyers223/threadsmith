import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getSubscriptionStatus, getTrialUpgradePrompt } from '@/lib/subscription'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch subscription with trial info
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('status, tier, max_x_accounts, trial_ends_at, stripe_subscription_id, current_period_end')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine for new users
      console.error('Subscription fetch error:', error)
    }

    // Get full subscription status
    const status = getSubscriptionStatus(subscription)
    
    // Get trial-specific upgrade prompt if applicable
    const trialPrompt = status.isTrial 
      ? getTrialUpgradePrompt(status.trialDaysRemaining)
      : null

    return NextResponse.json({
      // Core status
      tier: status.tier,
      isActive: status.isActive,
      maxAccounts: status.maxAccounts,
      
      // Trial info
      isTrial: status.isTrial,
      trialDaysRemaining: status.trialDaysRemaining,
      trialEndsAt: status.trialEndsAt?.toISOString() || null,
      trialPrompt,
      
      // Features
      features: status.features,
      
      // Raw subscription data (for debugging/advanced use)
      subscription: subscription ? {
        status: subscription.status,
        tier: subscription.tier,
        hasStripeSubscription: !!subscription.stripe_subscription_id,
        currentPeriodEnd: subscription.current_period_end,
      } : null,
    })
  } catch (err) {
    console.error('Subscription status error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get subscription status' },
      { status: 500 }
    )
  }
}

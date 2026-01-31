import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, plan_type, tier, current_period_end, stripe_customer_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'lifetime'])
      .single()

    if (!subscription) {
      return NextResponse.json({
        hasSubscription: false,
        tier: null,
        billingPeriod: null,
        status: null,
      })
    }

    // Parse plan_type to get tier and billing period
    // plan_type can be: premium_monthly, premium_annual, pro_monthly, pro_annual, lifetime
    let tier = subscription.tier || 'premium'
    let billingPeriod = 'monthly'
    
    if (subscription.plan_type) {
      if (subscription.plan_type === 'lifetime') {
        tier = 'premium'
        billingPeriod = 'lifetime'
      } else if (subscription.plan_type.includes('_')) {
        const parts = subscription.plan_type.split('_')
        tier = parts[0] // premium or pro
        billingPeriod = parts[1] // monthly or annual
      }
    }

    return NextResponse.json({
      hasSubscription: true,
      tier,
      billingPeriod,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      stripeCustomerId: subscription.stripe_customer_id,
    })
  } catch (err) {
    console.error('Subscription fetch error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}

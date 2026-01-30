import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { stripe, PRICES, PlanType, TierType, BillingPeriod, getPriceId } from '@/lib/stripe'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    // Support both old format (planType) and new format (tier + billing)
    let priceId: string
    let tier: TierType = 'premium'
    let billing: BillingPeriod = 'monthly'
    
    if (body.tier && body.billing) {
      // New format: tier (premium/pro) + billing (monthly/annual)
      tier = body.tier as TierType
      billing = body.billing as BillingPeriod
      
      if (!['premium', 'pro'].includes(tier)) {
        return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
      }
      if (!['monthly', 'annual'].includes(billing)) {
        return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 })
      }
      
      priceId = getPriceId(tier, billing)
    } else if (body.planType) {
      // Legacy format: planType (monthly/annual) - defaults to premium tier
      const planType = body.planType as PlanType
      if (!['monthly', 'annual'].includes(planType)) {
        return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
      }
      priceId = PRICES[planType]
      billing = planType
    } else {
      return NextResponse.json({ error: 'Missing tier/billing or planType' }, { status: 400 })
    }

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 500 })
    }

    // Check if user already has a subscription record
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    let customerId = existingSubscription?.stripe_customer_id

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      })
      customerId = customer.id

      // Create subscription record with customer ID
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          status: 'pending',
          tier: tier,
          plan_type: billing,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })
    } else {
      // Update plan being purchased
      await supabase
        .from('subscriptions')
        .update({
          tier: tier,
          plan_type: billing,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${appUrl}/settings?subscription=success`,
      cancel_url: `${appUrl}/settings?subscription=cancelled`,
      metadata: {
        user_id: user.id,
        tier: tier,
        billing: billing,
        price_id: priceId,
      },
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Checkout failed' },
      { status: 500 }
    )
  }
}

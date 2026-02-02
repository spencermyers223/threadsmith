/**
 * Create Stripe checkout session for credit pack purchase
 * 
 * POST /api/stripe/credits
 * Body: { packSize: '25' | '100' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

// Credit pack configurations
// Note: Spencer needs to create these products in Stripe Dashboard
// and update the price IDs here
const CREDIT_PACKS = {
  '25': {
    credits: 25,
    price: 500, // $5.00 in cents
    priceId: process.env.STRIPE_CREDITS_25_PRICE_ID || '', // To be set by Spencer
    name: '25 Credits',
  },
  '100': {
    credits: 100,
    price: 1500, // $15.00 in cents
    priceId: process.env.STRIPE_CREDITS_100_PRICE_ID || '', // To be set by Spencer
    name: '100 Credits',
  },
} as const

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { packSize } = body

    if (!packSize || !CREDIT_PACKS[packSize as keyof typeof CREDIT_PACKS]) {
      return NextResponse.json(
        { error: 'Invalid pack size. Choose 25 or 100.' },
        { status: 400 }
      )
    }

    const pack = CREDIT_PACKS[packSize as keyof typeof CREDIT_PACKS]

    // Get or create Stripe customer
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    let customerId = subscription?.stripe_customer_id

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      })
      customerId = customer.id

      // Save customer ID
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id)
    }

    // Create checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: pack.priceId ? [
        {
          price: pack.priceId,
          quantity: 1,
        }
      ] : [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: pack.name,
              description: `${pack.credits} credits for xthread`,
            },
            unit_amount: pack.price,
          },
          quantity: 1,
        }
      ],
      metadata: {
        user_id: user.id,
        product_id: `credits_${pack.credits}`,
        credits: pack.credits.toString(),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://xthread.io'}/settings?credits=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://xthread.io'}/pricing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[credits checkout] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTierFromPriceId, type SubscriptionTier } from '@/lib/subscription'
import { addCredits, resetMonthlyUsage, CREDIT_GRANTS } from '@/lib/credits'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

if (!webhookSecret) {
  console.error('STRIPE_WEBHOOK_SECRET is not configured')
}

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    // webhookSecret is guaranteed to be defined here due to early return above
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret as string)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        const userId = session.metadata?.user_id
        const planType = session.metadata?.plan_type
        const priceId = session.metadata?.price_id
        const productId = session.metadata?.product_id
        const credits = session.metadata?.credits

        if (!userId) {
          console.error('No user_id in session metadata')
          break
        }

        // Check if this is a credit pack purchase (one-time payment)
        if (session.mode === 'payment' && productId && credits) {
          const creditAmount = parseInt(credits, 10);
          if (creditAmount > 0) {
            await addCredits(
              supabase,
              userId,
              creditAmount,
              'purchase',
              `Purchased ${creditAmount} credit pack`,
              session.id
            );
            console.log(`Added ${creditAmount} credits for user ${userId} (credit pack purchase)`);
          }
          break; // Exit early for credit pack purchases
        }

        // Get subscription ID (for subscription purchases)
        let stripeSubscriptionId: string | null = null
        if (session.subscription) {
          stripeSubscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id
        }

        // Determine tier from price ID
        let tier: SubscriptionTier = 'premium';
        if (priceId) {
          tier = getTierFromPriceId(priceId);
        } else if (planType === 'lifetime') {
          // Legacy: lifetime purchases default to premium
          tier = 'premium';
        }

        // Get max accounts for tier
        const maxAccounts = tier === 'pro' ? 5 : 1;

        // Update subscription status with tier info
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: planType === 'lifetime' ? 'lifetime' : 'active',
            stripe_subscription_id: stripeSubscriptionId,
            tier,
            max_x_accounts: maxAccounts,
            current_period_start: new Date().toISOString(),
            current_period_end: planType === 'lifetime' 
              ? null // Lifetime has no end
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)

        if (error) {
          console.error('Error updating subscription:', error)
        } else {
          console.log(`Subscription activated for user ${userId}: tier=${tier}, plan=${planType}`)
          
          // Grant initial credits for new subscription
          const creditGrant = CREDIT_GRANTS[tier as keyof typeof CREDIT_GRANTS] || CREDIT_GRANTS.free;
          await addCredits(
            supabase,
            userId,
            creditGrant,
            'subscription_grant',
            `Initial ${tier} subscription credit grant`,
            session.id
          );
          console.log(`Granted ${creditGrant} credits to user ${userId}`);
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

        // Find user by stripe customer ID
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id, tier, current_period_start')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!sub) {
          console.error('No subscription found for customer:', customerId)
          break
        }

        // Get period dates from subscription items (Stripe API v2025+)
        const currentItem = subscription.items?.data?.[0]
        const periodStart = currentItem?.current_period_start
        const periodEnd = currentItem?.current_period_end
        
        // Check if this is a renewal (period start changed)
        const oldPeriodStart = sub.current_period_start ? new Date(sub.current_period_start).getTime() : 0;
        const newPeriodStart = periodStart ? periodStart * 1000 : 0;
        const isRenewal = newPeriodStart > oldPeriodStart;

        // Update period dates
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status === 'active' ? 'active' : subscription.status,
            current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', sub.user_id)

        if (error) {
          console.error('Error updating subscription period:', error)
        }
        
        // If this is a renewal, reset monthly usage and grant credits
        if (isRenewal && subscription.status === 'active') {
          const tier = (sub.tier || 'free') as 'free' | 'premium' | 'pro';
          await resetMonthlyUsage(supabase, sub.user_id, tier);
          console.log(`Monthly reset for user ${sub.user_id}: tier=${tier}`);
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

        // Find user by stripe customer ID
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!sub) {
          console.error('No subscription found for customer:', customerId)
          break
        }

        // Mark subscription as cancelled
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', sub.user_id)

        if (error) {
          console.error('Error cancelling subscription:', error)
        } else {
          console.log(`Subscription cancelled for user ${sub.user_id}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id

        if (!customerId) break

        // Find user by stripe customer ID
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (sub) {
          // Mark as past_due
          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', sub.user_id)

          console.log(`Payment failed for user ${sub.user_id}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

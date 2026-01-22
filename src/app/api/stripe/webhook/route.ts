import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
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

        if (!userId) {
          console.error('No user_id in session metadata')
          break
        }

        // Determine status based on plan type
        const status = planType === 'lifetime' ? 'lifetime' : 'active'

        // Get subscription ID if it's a recurring subscription
        let stripeSubscriptionId: string | null = null
        if (session.subscription) {
          stripeSubscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id
        }

        // Update subscription status
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status,
            stripe_subscription_id: stripeSubscriptionId,
            current_period_start: new Date().toISOString(),
            current_period_end: planType === 'lifetime'
              ? null // Lifetime has no end date
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // ~30 days
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)

        if (error) {
          console.error('Error updating subscription:', error)
        } else {
          console.log(`Subscription activated for user ${userId} with plan ${planType}`)
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
          .select('user_id')
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

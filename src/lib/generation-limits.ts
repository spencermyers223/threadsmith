import { SupabaseClient } from '@supabase/supabase-js'

export interface GenerationLimitResult {
  canGenerate: boolean
  remaining: number // -1 means unlimited (subscribed/trial)
  isSubscribed: boolean
  isTrial: boolean
  trialDaysRemaining: number | null
}

/**
 * Check if a user can generate content.
 * 
 * With the 7-day trial model:
 * - New users get 7-day trial with full premium access
 * - After trial expires, must subscribe to generate
 * - No more "5 free generations" counting
 */
export async function checkCanGenerate(
  supabase: SupabaseClient,
  userId: string
): Promise<GenerationLimitResult> {
  // Check subscription status
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, tier, trial_ends_at')
    .eq('user_id', userId)
    .single()

  // No subscription record at all - user needs to sign up
  if (!subscription) {
    return {
      canGenerate: false,
      remaining: 0,
      isSubscribed: false,
      isTrial: false,
      trialDaysRemaining: null,
    }
  }

  // Check if on active trial
  if (subscription.status === 'trialing' && subscription.trial_ends_at) {
    const trialEnd = new Date(subscription.trial_ends_at)
    const now = new Date()
    
    if (trialEnd > now) {
      // Active trial - full access
      const diffMs = trialEnd.getTime() - now.getTime()
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      
      return {
        canGenerate: true,
        remaining: -1, // Unlimited during trial
        isSubscribed: false,
        isTrial: true,
        trialDaysRemaining: daysRemaining,
      }
    }
    // Trial expired - fall through to check for subscription
  }

  // Check for active/lifetime subscription
  if (subscription.status === 'active' || subscription.status === 'lifetime') {
    return {
      canGenerate: true,
      remaining: -1,
      isSubscribed: true,
      isTrial: false,
      trialDaysRemaining: null,
    }
  }

  // No active subscription or trial - cannot generate
  return {
    canGenerate: false,
    remaining: 0,
    isSubscribed: false,
    isTrial: false,
    trialDaysRemaining: null,
  }
}

export type SourceType = 'manual' | 'file_based'

/**
 * Record a generation in the usage table
 * (Still useful for analytics even without limits)
 */
export async function recordGeneration(
  supabase: SupabaseClient,
  userId: string,
  generationId: string,
  sourceType: SourceType
): Promise<void> {
  const { error } = await supabase
    .from('generation_usage')
    .insert({
      user_id: userId,
      generation_id: generationId,
      source_type: sourceType,
    })

  if (error) {
    console.error('Error recording generation:', error)
  }
}

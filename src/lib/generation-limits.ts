import { SupabaseClient } from '@supabase/supabase-js'
import { POST_LIMITS } from '@/lib/credits'

export interface GenerationLimitResult {
  canGenerate: boolean
  remaining: number // -1 means unlimited (Pro tier)
  postsUsed: number
  postsLimit: number
  isSubscribed: boolean
  isTrial: boolean
  trialDaysRemaining: number | null
  postLimitError?: string
}

/**
 * Check if a user can generate content.
 * 
 * Post limits per tier:
 * - Free: 10 posts/month
 * - Premium: 300 posts/month
 * - Pro: Unlimited
 * 
 * Also checks subscription/trial status.
 */
export async function checkCanGenerate(
  supabase: SupabaseClient,
  userId: string,
  incrementPosts: boolean = false // If true, increment post counter (call on actual generation)
): Promise<GenerationLimitResult> {
  // Check subscription status
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, tier, trial_ends_at, posts_used, posts_reset_at')
    .eq('user_id', userId)
    .single()

  // No subscription record at all - user needs to sign up
  if (!subscription) {
    return {
      canGenerate: false,
      remaining: 0,
      postsUsed: 0,
      postsLimit: 0,
      isSubscribed: false,
      isTrial: false,
      trialDaysRemaining: null,
    }
  }

  const tier = (subscription.tier || 'free') as keyof typeof POST_LIMITS;
  const limit = POST_LIMITS[tier] || POST_LIMITS.free;
  let postsUsed = subscription.posts_used || 0;
  
  // Check if we need to auto-reset (for monthly reset without webhook)
  const resetAt = subscription.posts_reset_at ? new Date(subscription.posts_reset_at) : new Date(0);
  const now = new Date();
  const needsReset = resetAt.getMonth() !== now.getMonth() || 
                     resetAt.getFullYear() !== now.getFullYear();
  
  if (needsReset) {
    postsUsed = 0;
    // Auto-reset the counter
    await supabase
      .from('subscriptions')
      .update({ posts_used: 0, posts_reset_at: now.toISOString() })
      .eq('user_id', userId);
  }

  // Check if on active trial
  if (subscription.status === 'trialing' && subscription.trial_ends_at) {
    const trialEnd = new Date(subscription.trial_ends_at)
    
    if (trialEnd > now) {
      // Active trial - treat as premium limits
      const diffMs = trialEnd.getTime() - now.getTime()
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      const trialLimit = POST_LIMITS.premium;
      
      // Check post limit for trial
      if (postsUsed >= trialLimit) {
        return {
          canGenerate: false,
          remaining: 0,
          postsUsed,
          postsLimit: trialLimit,
          isSubscribed: false,
          isTrial: true,
          trialDaysRemaining: daysRemaining,
          postLimitError: `Post limit reached. Used ${postsUsed}/${trialLimit} posts this month.`,
        }
      }
      
      // Increment if requested
      if (incrementPosts) {
        await supabase
          .from('subscriptions')
          .update({ posts_used: postsUsed + 1 })
          .eq('user_id', userId);
        postsUsed++;
      }
      
      return {
        canGenerate: true,
        remaining: trialLimit - postsUsed,
        postsUsed,
        postsLimit: trialLimit,
        isSubscribed: false,
        isTrial: true,
        trialDaysRemaining: daysRemaining,
      }
    }
    // Trial expired - fall through to check for subscription
  }

  // Check for active/lifetime subscription
  if (subscription.status === 'active' || subscription.status === 'lifetime') {
    // Check post limit (Pro is unlimited)
    if (limit !== Infinity && postsUsed >= limit) {
      return {
        canGenerate: false,
        remaining: 0,
        postsUsed,
        postsLimit: limit,
        isSubscribed: true,
        isTrial: false,
        trialDaysRemaining: null,
        postLimitError: `Post limit reached. Used ${postsUsed}/${limit} posts this month.`,
      }
    }
    
    // Increment if requested
    if (incrementPosts) {
      await supabase
        .from('subscriptions')
        .update({ posts_used: postsUsed + 1 })
        .eq('user_id', userId);
      postsUsed++;
    }
    
    return {
      canGenerate: true,
      remaining: limit === Infinity ? -1 : limit - postsUsed,
      postsUsed,
      postsLimit: limit === Infinity ? -1 : limit,
      isSubscribed: true,
      isTrial: false,
      trialDaysRemaining: null,
    }
  }

  // Free tier or no active subscription
  if (limit !== Infinity && postsUsed >= limit) {
    return {
      canGenerate: false,
      remaining: 0,
      postsUsed,
      postsLimit: limit,
      isSubscribed: false,
      isTrial: false,
      trialDaysRemaining: null,
      postLimitError: `Post limit reached. Used ${postsUsed}/${limit} posts this month. Upgrade for more!`,
    }
  }
  
  // Increment if requested (even for free tier)
  if (incrementPosts) {
    await supabase
      .from('subscriptions')
      .update({ posts_used: postsUsed + 1 })
      .eq('user_id', userId);
    postsUsed++;
  }
  
  return {
    canGenerate: true,
    remaining: limit - postsUsed,
    postsUsed,
    postsLimit: limit,
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

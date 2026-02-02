/**
 * Credit Management Utility
 * 
 * Handles credit checking, deduction, and tracking for xthread.
 * 
 * Credit costs:
 * - Account Analysis: 3 credits
 * - Reply Coaching: 1 credit
 * - Voice Add/Refresh: 1 credit
 * 
 * Tier limits:
 * - Free: 5 credits/month, 10 posts/month
 * - Premium: 50 credits/month, 300 posts/month
 * - Pro: 100 credits/month, unlimited posts
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface CreditCheckResult {
  success: boolean;
  credits: number;
  error?: string;
}

export interface DeductResult {
  success: boolean;
  creditsRemaining: number;
  error?: string;
}

export interface PostLimitResult {
  success: boolean;
  postsUsed: number;
  postsLimit: number;
  error?: string;
}

// Credit costs for different actions
export const CREDIT_COSTS = {
  ACCOUNT_ANALYSIS: 3,
  REPLY_COACHING: 1,
  VOICE_ADD: 1,
  VOICE_REFRESH: 1,
} as const;

// Post limits per tier
export const POST_LIMITS = {
  free: 10,
  premium: 300,
  pro: Infinity, // Unlimited
} as const;

// Monthly credit grants per tier
export const CREDIT_GRANTS = {
  free: 5,
  premium: 50,
  pro: 100,
} as const;

/**
 * Get user's current credit balance
 */
export async function getCredits(
  supabase: SupabaseClient,
  userId: string
): Promise<CreditCheckResult> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('credits, tier')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[credits] Error fetching credits:', error);
      return { success: false, credits: 0, error: 'Failed to fetch credits' };
    }

    if (!data) {
      return { success: false, credits: 0, error: 'No subscription found' };
    }

    return { success: true, credits: data.credits || 0 };
  } catch (err) {
    console.error('[credits] Unexpected error:', err);
    return { success: false, credits: 0, error: 'Unexpected error' };
  }
}

/**
 * Check if user has enough credits for an action
 */
export async function hasEnoughCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number
): Promise<CreditCheckResult> {
  const result = await getCredits(supabase, userId);
  
  if (!result.success) {
    return result;
  }

  if (result.credits < amount) {
    return {
      success: false,
      credits: result.credits,
      error: `Insufficient credits. Need ${amount}, have ${result.credits}`,
    };
  }

  return { success: true, credits: result.credits };
}

/**
 * Deduct credits from user's balance
 * Returns the new balance after deduction
 */
export async function deductCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  actionType: string,
  description?: string,
  referenceId?: string
): Promise<DeductResult> {
  try {
    // First check if they have enough
    const check = await hasEnoughCredits(supabase, userId, amount);
    if (!check.success) {
      return {
        success: false,
        creditsRemaining: check.credits,
        error: check.error,
      };
    }

    // Deduct credits atomically
    const newBalance = check.credits - amount;
    
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ credits: newBalance })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[credits] Error deducting credits:', updateError);
      return {
        success: false,
        creditsRemaining: check.credits,
        error: 'Failed to deduct credits',
      };
    }

    // Log the transaction
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: -amount,
      type: 'usage',
      description: description || actionType,
      reference_id: referenceId,
      balance_after: newBalance,
    });

    return { success: true, creditsRemaining: newBalance };
  } catch (err) {
    console.error('[credits] Unexpected error during deduction:', err);
    return {
      success: false,
      creditsRemaining: 0,
      error: 'Unexpected error during deduction',
    };
  }
}

/**
 * Add credits to user's balance (for purchases or grants)
 */
export async function addCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  type: 'purchase' | 'subscription_grant' | 'refund',
  description?: string,
  referenceId?: string
): Promise<DeductResult> {
  try {
    // Get current balance
    const { data, error: fetchError } = await supabase
      .from('subscriptions')
      .select('credits')
      .eq('user_id', userId)
      .single();

    if (fetchError || !data) {
      return {
        success: false,
        creditsRemaining: 0,
        error: 'Failed to fetch current balance',
      };
    }

    const newBalance = (data.credits || 0) + amount;

    // Add credits
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ credits: newBalance })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[credits] Error adding credits:', updateError);
      return {
        success: false,
        creditsRemaining: data.credits || 0,
        error: 'Failed to add credits',
      };
    }

    // Log the transaction
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: amount,
      type,
      description: description || `Added ${amount} credits`,
      reference_id: referenceId,
      balance_after: newBalance,
    });

    return { success: true, creditsRemaining: newBalance };
  } catch (err) {
    console.error('[credits] Unexpected error adding credits:', err);
    return {
      success: false,
      creditsRemaining: 0,
      error: 'Unexpected error',
    };
  }
}

/**
 * Check and increment post usage
 */
export async function checkAndIncrementPosts(
  supabase: SupabaseClient,
  userId: string
): Promise<PostLimitResult> {
  try {
    // Get current usage and tier
    const { data, error } = await supabase
      .from('subscriptions')
      .select('posts_used, tier, posts_reset_at')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return {
        success: false,
        postsUsed: 0,
        postsLimit: 0,
        error: 'Failed to fetch subscription',
      };
    }

    const tier = data.tier as keyof typeof POST_LIMITS;
    const limit = POST_LIMITS[tier] || POST_LIMITS.free;
    const postsUsed = data.posts_used || 0;

    // Check if we need to reset (monthly reset)
    const resetAt = data.posts_reset_at ? new Date(data.posts_reset_at) : new Date(0);
    const now = new Date();
    const needsReset = resetAt.getMonth() !== now.getMonth() || 
                       resetAt.getFullYear() !== now.getFullYear();

    let currentUsed = postsUsed;
    
    if (needsReset) {
      // Reset counter for new month
      currentUsed = 0;
    }

    // Check limit (Pro is unlimited)
    if (limit !== Infinity && currentUsed >= limit) {
      return {
        success: false,
        postsUsed: currentUsed,
        postsLimit: limit,
        error: `Post limit reached. Used ${currentUsed}/${limit} posts this month.`,
      };
    }

    // Increment counter
    const newCount = currentUsed + 1;
    const updateData: Record<string, unknown> = { posts_used: newCount };
    
    if (needsReset) {
      updateData.posts_reset_at = now.toISOString();
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('user_id', userId);

    if (updateError) {
      console.error('[credits] Error updating post count:', updateError);
      return {
        success: false,
        postsUsed: currentUsed,
        postsLimit: limit,
        error: 'Failed to update post count',
      };
    }

    return {
      success: true,
      postsUsed: newCount,
      postsLimit: limit === Infinity ? -1 : limit, // -1 indicates unlimited
    };
  } catch (err) {
    console.error('[credits] Unexpected error checking posts:', err);
    return {
      success: false,
      postsUsed: 0,
      postsLimit: 0,
      error: 'Unexpected error',
    };
  }
}

/**
 * Get user's usage summary (credits + posts)
 */
export async function getUsageSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  success: boolean;
  credits: number;
  postsUsed: number;
  postsLimit: number;
  tier: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('credits, posts_used, tier')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return {
        success: false,
        credits: 0,
        postsUsed: 0,
        postsLimit: 0,
        tier: 'free',
        error: 'Failed to fetch usage',
      };
    }

    const tier = data.tier as keyof typeof POST_LIMITS;
    const limit = POST_LIMITS[tier] || POST_LIMITS.free;

    return {
      success: true,
      credits: data.credits || 0,
      postsUsed: data.posts_used || 0,
      postsLimit: limit === Infinity ? -1 : limit,
      tier: data.tier || 'free',
    };
  } catch (err) {
    console.error('[credits] Error fetching usage summary:', err);
    return {
      success: false,
      credits: 0,
      postsUsed: 0,
      postsLimit: 0,
      tier: 'free',
      error: 'Unexpected error',
    };
  }
}

/**
 * Reset monthly credits and posts (called by subscription webhook)
 */
export async function resetMonthlyUsage(
  supabase: SupabaseClient,
  userId: string,
  tier: 'free' | 'premium' | 'pro'
): Promise<{ success: boolean; error?: string }> {
  try {
    const creditGrant = CREDIT_GRANTS[tier];
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('subscriptions')
      .update({
        credits: creditGrant,
        credits_reset_at: now,
        posts_used: 0,
        posts_reset_at: now,
      })
      .eq('user_id', userId);

    if (error) {
      console.error('[credits] Error resetting monthly usage:', error);
      return { success: false, error: 'Failed to reset usage' };
    }

    // Log the grant
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: creditGrant,
      type: 'subscription_grant',
      description: `Monthly ${tier} tier credit grant`,
      balance_after: creditGrant,
    });

    return { success: true };
  } catch (err) {
    console.error('[credits] Error in resetMonthlyUsage:', err);
    return { success: false, error: 'Unexpected error' };
  }
}

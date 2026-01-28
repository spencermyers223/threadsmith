import { SupabaseClient } from '@supabase/supabase-js'

const FREE_GENERATION_LIMIT = 5

export interface GenerationLimitResult {
  canGenerate: boolean
  remaining: number // -1 means unlimited (subscribed)
  isSubscribed: boolean
}

/**
 * Check if a user can generate content based on their subscription status
 * and usage limits.
 */
export async function checkCanGenerate(
  supabase: SupabaseClient,
  userId: string
): Promise<GenerationLimitResult> {
  // First, check if user has an active subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .in('status', ['active'])
    .single()

  if (subscription) {
    // User has an active subscription - unlimited generations
    return {
      canGenerate: true,
      remaining: -1,
      isSubscribed: true,
    }
  }

  // No active subscription - check free tier usage
  const { count, error } = await supabase
    .from('generation_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    console.error('Error checking generation usage:', error)
    // Default to allowing generation if there's an error
    return {
      canGenerate: true,
      remaining: FREE_GENERATION_LIMIT,
      isSubscribed: false,
    }
  }

  const usedCount = count || 0
  const remaining = FREE_GENERATION_LIMIT - usedCount

  return {
    canGenerate: remaining > 0,
    remaining: Math.max(0, remaining),
    isSubscribed: false,
  }
}

export type SourceType = 'manual' | 'file_based'

/**
 * Record a generation in the usage table
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
    // Don't throw - we don't want to fail the generation just because
    // we couldn't record it
  }
}

/**
 * Get the free generation limit
 */
export function getFreeLimit(): number {
  return FREE_GENERATION_LIMIT
}

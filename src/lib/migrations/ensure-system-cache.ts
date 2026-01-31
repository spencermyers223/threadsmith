/**
 * Ensure system_cache table exists
 * This runs on first API call to /api/engagement/baseline
 */

import { SupabaseClient } from '@supabase/supabase-js';

let migrationRun = false;

export async function ensureSystemCacheTable(supabase: SupabaseClient): Promise<boolean> {
  // Only run once per server instance
  if (migrationRun) return true;

  try {
    // Check if table exists by trying to query it
    const { error } = await supabase
      .from('system_cache')
      .select('key')
      .limit(1);

    if (error && error.code === 'PGRST205') {
      // Table doesn't exist - we can't create it via the client
      // Return false to indicate the feature should work with defaults
      console.log('[system_cache] Table does not exist yet. Using defaults.');
      migrationRun = true;
      return false;
    }

    if (error) {
      console.error('[system_cache] Error checking table:', error.message);
      migrationRun = true;
      return false;
    }

    // Table exists
    migrationRun = true;
    return true;
  } catch (err) {
    console.error('[system_cache] Migration check failed:', err);
    migrationRun = true;
    return false;
  }
}

/**
 * Get cached value from system_cache
 * Returns null if table doesn't exist or key not found
 */
export async function getCachedValue<T>(
  supabase: SupabaseClient,
  key: string
): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from('system_cache')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST205' || error.code === 'PGRST116') {
        // Table doesn't exist or no rows found
        return null;
      }
      console.error(`[system_cache] Error getting ${key}:`, error.message);
      return null;
    }

    return data?.value as T;
  } catch {
    return null;
  }
}

/**
 * Set cached value in system_cache
 * Silently fails if table doesn't exist
 */
export async function setCachedValue<T>(
  supabase: SupabaseClient,
  key: string,
  value: T
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('system_cache')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key',
      });

    if (error) {
      if (error.code === 'PGRST205') {
        // Table doesn't exist - silently fail
        return false;
      }
      console.error(`[system_cache] Error setting ${key}:`, error.message);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

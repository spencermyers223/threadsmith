/**
 * X Token Management Utilities
 * 
 * Handles fetching, validating, and refreshing X API tokens.
 * Use getValidXTokens() in API routes to get a valid access token.
 */

import { createClient } from '@supabase/supabase-js'
import { refreshAccessToken } from './x-auth'

export interface XTokens {
  access_token: string
  refresh_token: string
  x_user_id: string
  x_username: string
  expires_at: string
}

type TokenResult = {
  success: true
  tokens: XTokens
} | {
  success: false
  error: string
  needsReauth?: boolean
}

/**
 * Get valid X tokens for a user, refreshing if needed.
 * 
 * @param userId - Supabase user ID
 * @param xAccountId - Optional specific X account ID (for multi-account support)
 * @returns Valid tokens or error
 */
export async function getValidXTokens(userId: string, xAccountId?: string): Promise<TokenResult> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // Fetch current tokens
  let tokens = null
  let tokenRecordId: string | null = null
  
  if (xAccountId) {
    // Fetch tokens for specific X account
    const { data: xTokens } = await supabaseAdmin
      .from('x_tokens')
      .select('id, access_token, refresh_token, x_user_id, x_username, expires_at')
      .eq('x_account_id', xAccountId)
      .eq('user_id', userId)
      .single()
    
    if (xTokens?.access_token) {
      tokens = xTokens
      tokenRecordId = xTokens.id
    }
  } else {
    // Legacy: check x_tokens first, then x_accounts as fallback
    const { data: xTokens } = await supabaseAdmin
      .from('x_tokens')
      .select('id, access_token, refresh_token, x_user_id, x_username, expires_at')
      .eq('user_id', userId)
      .single()
    
    if (xTokens?.access_token) {
      tokens = xTokens
      tokenRecordId = xTokens.id
    } else {
      // Fallback: check x_accounts table (multi-account support)
      const { data: xAccount } = await supabaseAdmin
        .from('x_accounts')
        .select('access_token, refresh_token, x_user_id, x_username, token_expires_at')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .single()
      
      if (xAccount?.access_token) {
        tokens = {
          access_token: xAccount.access_token,
          refresh_token: xAccount.refresh_token,
          x_user_id: xAccount.x_user_id,
          x_username: xAccount.x_username,
          expires_at: xAccount.token_expires_at,
        }
      }
    }
  }
  
  if (!tokens) {
    return {
      success: false,
      error: 'X account not connected',
      needsReauth: true,
    }
  }
  
  // Check if token is expired or will expire soon (within 5 minutes)
  const expiresAt = new Date(tokens.expires_at)
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)
  
  if (expiresAt > fiveMinutesFromNow) {
    // Token is still valid
    return { success: true, tokens }
  }
  
  // Token expired or expiring soon - try to refresh
  if (!tokens.refresh_token) {
    return {
      success: false,
      error: 'No refresh token available. Please sign in again.',
      needsReauth: true,
    }
  }
  
  try {
    console.log('[x-tokens] Refreshing expired token for user:', userId)
    
    const refreshed = await refreshAccessToken({
      refreshToken: tokens.refresh_token,
      clientId: process.env.X_CLIENT_ID!,
      clientSecret: process.env.X_CLIENT_SECRET!,
    })
    
    // Calculate new expiry time
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    
    // Update tokens in database
    const updateQuery = supabaseAdmin
      .from('x_tokens')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
    
    // Use token record ID if available, otherwise fall back to user_id
    const { error: updateError } = tokenRecordId 
      ? await updateQuery.eq('id', tokenRecordId)
      : await updateQuery.eq('user_id', userId)
    
    if (updateError) {
      console.error('[x-tokens] Failed to save refreshed token:', updateError)
      // Return the refreshed token anyway - it's valid
    } else {
      console.log('[x-tokens] Token refreshed successfully')
    }
    
    return {
      success: true,
      tokens: {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        x_user_id: tokens.x_user_id,
        x_username: tokens.x_username,
        expires_at: newExpiresAt,
      },
    }
    
  } catch (error) {
    console.error('[x-tokens] Token refresh failed:', error)
    
    // Refresh token might be invalid - user needs to re-authenticate
    return {
      success: false,
      error: 'Session expired. Please sign in again.',
      needsReauth: true,
    }
  }
}

/**
 * Make an authenticated request to the X API with automatic token refresh.
 * 
 * @param userId - Supabase user ID
 * @param url - X API URL
 * @param options - Fetch options (headers will be merged)
 */
export async function xApiFetch(
  userId: string,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const tokenResult = await getValidXTokens(userId)
  
  if (!tokenResult.success) {
    // Return a fake response with the error
    return new Response(
      JSON.stringify({ error: tokenResult.error, needsReauth: tokenResult.needsReauth }),
      { status: 401 }
    )
  }
  
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${tokenResult.tokens.access_token}`)
  
  return fetch(url, {
    ...options,
    headers,
  })
}

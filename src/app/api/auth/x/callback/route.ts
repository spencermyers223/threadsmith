/**
 * X OAuth 2.0 - Callback Handler
 * 
 * GET /api/auth/x/callback
 * Handles redirect from X after user authorizes
 * 
 * Supports two modes:
 * 1. Login mode (default): Create/login user based on X account
 * 2. Link mode: Add additional X account to existing logged-in user
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, fetchXUser } from '@/lib/x-auth'
import crypto from 'crypto'

// Create admin Supabase client for token storage
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  
  // Handle authorization denied
  if (error) {
    console.error('X OAuth error:', error)
    return NextResponse.redirect(new URL('/login?error=x_auth_denied', baseUrl))
  }
  
  if (!code || !state) {
    return NextResponse.redirect(new URL('/login?error=missing_params', baseUrl))
  }
  
  // Verify state to prevent CSRF
  const cookieStore = await cookies()
  const storedState = cookieStore.get('x_oauth_state')?.value
  const codeVerifier = cookieStore.get('x_code_verifier')?.value
  const oauthAction = cookieStore.get('x_oauth_action')?.value
  const isLinkMode = oauthAction === 'link'
  
  if (!storedState || state !== storedState) {
    console.error('State mismatch:', { received: state, stored: storedState })
    return NextResponse.redirect(new URL('/login?error=invalid_state', baseUrl))
  }
  
  if (!codeVerifier) {
    console.error('Missing code verifier')
    return NextResponse.redirect(new URL('/login?error=missing_verifier', baseUrl))
  }
  
  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens({
      code,
      codeVerifier,
      clientId: process.env.X_CLIENT_ID!,
      clientSecret: process.env.X_CLIENT_SECRET!,
      redirectUri: process.env.X_CALLBACK_URL!,
    })
    
    console.log('Token exchange successful')
    
    // Fetch X user profile
    const xUser = await fetchXUser(tokens.access_token)
    console.log('Fetched X user:', xUser.username)
    
    // Handle based on mode
    if (isLinkMode) {
      return await handleLinkAccount(request, xUser, tokens, cookieStore, baseUrl)
    } else {
      return await handleLogin(xUser, tokens, cookieStore, baseUrl)
    }
    
  } catch (err) {
    console.error('X OAuth callback error:', err)
    return NextResponse.redirect(new URL('/login?error=callback_failed', baseUrl))
  }
}

/**
 * Handle linking an additional X account to existing user
 */
async function handleLinkAccount(
  request: NextRequest,
  xUser: { id: string; username: string; name: string; profile_image_url?: string },
  tokens: { access_token: string; refresh_token: string; expires_in: number },
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  baseUrl: string
) {
  // Get current user from Supabase session
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.error('Link mode: No authenticated user found')
    return NextResponse.redirect(new URL('/settings?error=not_authenticated', baseUrl))
  }
  
  console.log('Link mode: Adding X account for user', user.id)
  
  // Check if this X account is already linked to ANY user
  const { data: existingAccount } = await supabaseAdmin
    .from('x_accounts')
    .select('id, user_id')
    .eq('x_user_id', xUser.id)
    .single()
  
  if (existingAccount) {
    if (existingAccount.user_id === user.id) {
      // Already linked to this user - just update tokens
      console.log('X account already linked to this user, updating tokens')
      await updateTokens(existingAccount.id, user.id, xUser, tokens)
    } else {
      // Linked to a different user - error
      console.error('X account already linked to another user')
      const response = NextResponse.redirect(new URL('/settings?error=account_already_linked', baseUrl))
      cleanupCookies(response)
      return response
    }
  } else {
    // Check subscription limits
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('max_x_accounts')
      .eq('user_id', user.id)
      .single()
    
    const { count: currentCount } = await supabaseAdmin
      .from('x_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    
    const maxAccounts = subscription?.max_x_accounts || 1
    if ((currentCount || 0) >= maxAccounts) {
      console.error('Account limit reached')
      const response = NextResponse.redirect(new URL('/settings?error=account_limit_reached', baseUrl))
      cleanupCookies(response)
      return response
    }
    
    // Create new x_account
    const { data: newAccount, error: createError } = await supabaseAdmin
      .from('x_accounts')
      .insert({
        user_id: user.id,
        x_user_id: xUser.id,
        x_username: xUser.username,
        x_display_name: xUser.name,
        x_profile_image_url: xUser.profile_image_url,
        is_primary: false, // Additional accounts are not primary
      })
      .select()
      .single()
    
    if (createError || !newAccount) {
      console.error('Failed to create x_account:', createError)
      const response = NextResponse.redirect(new URL('/settings?error=link_failed', baseUrl))
      cleanupCookies(response)
      return response
    }
    
    console.log('Created new x_account:', newAccount.id)
    
    // Store tokens for the new account
    await updateTokens(newAccount.id, user.id, xUser, tokens)
  }
  
  // Success - redirect to settings
  const response = NextResponse.redirect(new URL('/settings?success=account_linked', baseUrl))
  cleanupCookies(response)
  return response
}

/**
 * Handle normal login/signup via X
 */
async function handleLogin(
  xUser: { id: string; username: string; name: string; profile_image_url?: string },
  tokens: { access_token: string; refresh_token: string; expires_in: number },
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  baseUrl: string
) {
  // Check if this X account exists in x_accounts
  const { data: existingXAccount } = await supabaseAdmin
    .from('x_accounts')
    .select('id, user_id')
    .eq('x_user_id', xUser.id)
    .single()
  
  let userId: string
  let xAccountId: string
  
  if (existingXAccount) {
    // Existing X account - login to associated user
    userId = existingXAccount.user_id
    xAccountId = existingXAccount.id
    console.log('Existing X account found, logging in user:', userId)
    
    // Update X account metadata (profile picture, display name might have changed)
    await supabaseAdmin
      .from('x_accounts')
      .update({
        x_username: xUser.username,
        x_display_name: xUser.name,
        x_profile_image_url: xUser.profile_image_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', xAccountId)
    
    // Update user metadata in auth
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        x_user_id: xUser.id,
        x_username: xUser.username,
        name: xUser.name,
        avatar_url: xUser.profile_image_url,
      },
    })
  } else {
    // Check if user exists in profiles (legacy - before x_accounts)
    const { data: legacyUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('x_user_id', xUser.id)
      .single()
    
    if (legacyUser) {
      // Legacy user - migrate them to x_accounts
      userId = legacyUser.id
      console.log('Legacy user found, migrating to x_accounts:', userId)
      
      // Create x_account for them
      const { data: newAccount } = await supabaseAdmin
        .from('x_accounts')
        .insert({
          user_id: userId,
          x_user_id: xUser.id,
          x_username: xUser.username,
          x_display_name: xUser.name,
          x_profile_image_url: xUser.profile_image_url,
          is_primary: true,
        })
        .select()
        .single()
      
      xAccountId = newAccount?.id || ''
      
      // Update user metadata
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          x_user_id: xUser.id,
          x_username: xUser.username,
          name: xUser.name,
          avatar_url: xUser.profile_image_url,
        },
      })
    } else {
      // Brand new user - create everything
      console.log('New user, creating account')
      
      // Generate deterministic password from X user ID + secret
      const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.slice(0, 32)
      const userPassword = crypto
        .createHmac('sha256', secretKey)
        .update(xUser.id)
        .digest('hex')
      
      const userEmail = `${xUser.id}@x.xthread.io`
      
      // Create auth user
      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        password: userPassword,
        email_confirm: true,
        user_metadata: {
          x_user_id: xUser.id,
          x_username: xUser.username,
          name: xUser.name,
          avatar_url: xUser.profile_image_url,
        },
      })
      
      if (createError || !authUser.user) {
        console.error('Failed to create user:', createError)
        return NextResponse.redirect(new URL('/login?error=user_creation_failed', baseUrl))
      }
      
      userId = authUser.user.id
      console.log('Created new user:', userId)
      
      // Update profile with X info
      await supabaseAdmin
        .from('profiles')
        .update({
          x_user_id: xUser.id,
          x_username: xUser.username,
          display_name: xUser.name,
          avatar_url: xUser.profile_image_url,
        })
        .eq('id', userId)
      
      // Create x_account for new user
      const { data: newAccount } = await supabaseAdmin
        .from('x_accounts')
        .insert({
          user_id: userId,
          x_user_id: xUser.id,
          x_username: xUser.username,
          x_display_name: xUser.name,
          x_profile_image_url: xUser.profile_image_url,
          is_primary: true,
        })
        .select()
        .single()
      
      xAccountId = newAccount?.id || ''
    }
  }
  
  // Update password for existing users (in case they need to re-auth)
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.slice(0, 32)
  const userPassword = crypto
    .createHmac('sha256', secretKey)
    .update(xUser.id)
    .digest('hex')
  
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: userPassword,
  })
  
  // Store tokens
  await updateTokens(xAccountId, userId, xUser, tokens)
  
  // Redirect to session endpoint to complete sign-in
  const response = NextResponse.redirect(new URL(`/api/auth/x/session?user=${xUser.id}`, baseUrl))
  cleanupCookies(response)
  return response
}

/**
 * Store/update X tokens for an account
 */
async function updateTokens(
  xAccountId: string,
  userId: string,
  xUser: { id: string; username: string },
  tokens: { access_token: string; refresh_token: string; expires_in: number }
) {
  // Check if token record exists for this x_account
  const { data: existing } = await supabaseAdmin
    .from('x_tokens')
    .select('id')
    .eq('x_account_id', xAccountId)
    .single()
  
  const tokenData = {
    user_id: userId,
    x_account_id: xAccountId,
    x_user_id: xUser.id,
    x_username: xUser.username,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }
  
  if (existing) {
    // Update existing record
    await supabaseAdmin
      .from('x_tokens')
      .update(tokenData)
      .eq('id', existing.id)
  } else {
    // Insert new record
    await supabaseAdmin
      .from('x_tokens')
      .insert(tokenData)
  }
  
  console.log('Stored X tokens for account:', xAccountId)
}

/**
 * Clean up OAuth cookies
 */
function cleanupCookies(response: NextResponse) {
  response.cookies.delete('x_code_verifier')
  response.cookies.delete('x_oauth_state')
  response.cookies.delete('x_oauth_action')
}

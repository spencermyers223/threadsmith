/**
 * X OAuth 2.0 - Callback Handler
 * 
 * GET /api/auth/x/callback
 * Handles redirect from X after user authorizes
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { exchangeCodeForTokens, fetchXUser } from '@/lib/x-auth'

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
  
  // Handle authorization denied
  if (error) {
    console.error('X OAuth error:', error)
    return NextResponse.redirect(new URL('/login?error=x_auth_denied', request.url))
  }
  
  if (!code || !state) {
    return NextResponse.redirect(new URL('/login?error=missing_params', request.url))
  }
  
  // Verify state to prevent CSRF
  const cookieStore = await cookies()
  const storedState = cookieStore.get('x_oauth_state')?.value
  const codeVerifier = cookieStore.get('x_code_verifier')?.value
  
  if (!storedState || state !== storedState) {
    return NextResponse.redirect(new URL('/login?error=invalid_state', request.url))
  }
  
  if (!codeVerifier) {
    return NextResponse.redirect(new URL('/login?error=missing_verifier', request.url))
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
    
    // Fetch X user profile
    const xUser = await fetchXUser(tokens.access_token)
    
    // Check if user exists in our database (by x_user_id)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('x_user_id', xUser.id)
      .single()
    
    let userId: string
    
    if (existingProfile) {
      // Existing user - update their tokens
      userId = existingProfile.id
      
      await supabaseAdmin
        .from('x_tokens')
        .upsert({
          user_id: userId,
          x_user_id: xUser.id,
          x_username: xUser.username,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
    } else {
      // New user - create profile and tokens
      // First, create a Supabase auth user (email-less, X-only)
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: `${xUser.id}@x.xthread.io`, // Placeholder email
        email_confirm: true,
        user_metadata: {
          x_user_id: xUser.id,
          x_username: xUser.username,
          name: xUser.name,
          avatar_url: xUser.profile_image_url,
        },
      })
      
      if (authError || !authUser.user) {
        console.error('Failed to create auth user:', authError)
        return NextResponse.redirect(new URL('/login?error=user_creation_failed', request.url))
      }
      
      userId = authUser.user.id
      
      // Update profile with X info
      await supabaseAdmin
        .from('profiles')
        .update({
          x_user_id: xUser.id,
          x_username: xUser.username,
        })
        .eq('id', userId)
      
      // Store tokens
      await supabaseAdmin
        .from('x_tokens')
        .insert({
          user_id: userId,
          x_user_id: xUser.id,
          x_username: xUser.username,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
    }
    
    // Create a Supabase session for the user
    // We need to sign them in - using a workaround with a magic link token
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: `${xUser.id}@x.xthread.io`,
    })
    
    if (sessionError || !sessionData.properties?.hashed_token) {
      console.error('Failed to generate session:', sessionError)
      return NextResponse.redirect(new URL('/login?error=session_failed', request.url))
    }
    
    // Clean up cookies
    cookieStore.delete('x_code_verifier')
    cookieStore.delete('x_oauth_state')
    
    // Redirect to the magic link to complete sign-in
    // The magic link will set the Supabase session cookies
    const magicLinkUrl = new URL(sessionData.properties.action_link)
    magicLinkUrl.searchParams.set('redirect_to', '/creator-hub')
    
    return NextResponse.redirect(magicLinkUrl)
    
  } catch (err) {
    console.error('X OAuth callback error:', err)
    return NextResponse.redirect(new URL('/login?error=token_exchange_failed', request.url))
  }
}

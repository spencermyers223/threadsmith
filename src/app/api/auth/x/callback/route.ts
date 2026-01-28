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
    
    // Generate a deterministic password from X user ID + secret
    const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.slice(0, 32)
    const userPassword = crypto
      .createHmac('sha256', secretKey)
      .update(xUser.id)
      .digest('hex')
    
    const userEmail = `${xUser.id}@x.xthread.io`
    
    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('x_user_id', xUser.id)
      .single()
    
    let userId: string
    
    if (existingUser) {
      // Existing user - update their password and metadata
      userId = existingUser.id
      console.log('Existing user found:', userId)
      
      // Update password and refresh metadata from X
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: userPassword,
        user_metadata: {
          x_user_id: xUser.id,
          x_username: xUser.username,
          name: xUser.name,
          avatar_url: xUser.profile_image_url,
        },
      })
    } else {
      // New user - create with deterministic password
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
    }
    
    // Store/update X tokens
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
      }, {
        onConflict: 'user_id',
      })
    
    console.log('Stored X tokens')
    
    // Clean up OAuth cookies and redirect to session endpoint to complete sign-in
    const response = NextResponse.redirect(new URL(`/api/auth/x/session?user=${xUser.id}`, baseUrl))
    response.cookies.delete('x_code_verifier')
    response.cookies.delete('x_oauth_state')
    
    return response
    
  } catch (err) {
    console.error('X OAuth callback error:', err)
    return NextResponse.redirect(new URL('/login?error=callback_failed', baseUrl))
  }
}

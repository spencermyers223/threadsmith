/**
 * X Auth Session - Sign-in endpoint
 * 
 * GET /api/auth/x/session?user=<x_user_id>
 * Signs user in and sets session cookies
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const xUserId = request.nextUrl.searchParams.get('user')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  
  if (!xUserId) {
    return NextResponse.redirect(new URL('/login?error=missing_user', baseUrl))
  }
  
  try {
    // Generate the same deterministic password
    const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.slice(0, 32)
    const userPassword = crypto
      .createHmac('sha256', secretKey)
      .update(xUserId)
      .digest('hex')
    
    const userEmail = `${xUserId}@x.xthread.io`
    
    // Create response that we'll set cookies on
    const response = NextResponse.redirect(new URL('/creator-hub', baseUrl))
    
    // Create Supabase client that writes cookies to our response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )
    
    // Sign in with password
    const { error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: userPassword,
    })
    
    if (error) {
      console.error('Sign in error:', error)
      return NextResponse.redirect(new URL('/login?error=signin_failed', baseUrl))
    }
    
    return response
    
  } catch (err) {
    console.error('Session creation error:', err)
    return NextResponse.redirect(new URL('/login?error=session_error', baseUrl))
  }
}

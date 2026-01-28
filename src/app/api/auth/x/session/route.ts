/**
 * X Auth Session - Fallback sign-in endpoint
 * 
 * GET /api/auth/x/session?user=<x_user_id>
 * Signs user in using deterministic password approach
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    
    // Sign in with the Supabase client (this sets session cookies)
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: userPassword,
    })
    
    if (error) {
      console.error('Sign in error:', error)
      return NextResponse.redirect(new URL('/login?error=signin_failed', baseUrl))
    }
    
    // Redirect to creator hub
    return NextResponse.redirect(new URL('/creator-hub', baseUrl))
    
  } catch (err) {
    console.error('Session creation error:', err)
    return NextResponse.redirect(new URL('/login?error=session_error', baseUrl))
  }
}

/**
 * X OAuth Link - Initiate OAuth for cross-device account linking
 * 
 * GET /api/auth/x/link?session=xxx
 * 
 * This is called from the link-account page (on the user's phone/other device)
 * to start the X OAuth flow. The session ID ties this back to the original user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { buildAuthUrl, generateState } from '@/lib/x-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session')
  
  if (!sessionId) {
    return NextResponse.redirect(new URL('/link-account/invalid', request.nextUrl.origin))
  }

  const clientId = process.env.X_CLIENT_ID
  const redirectUri = process.env.X_CALLBACK_URL
  
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'X API not configured' }, { status: 500 })
  }

  try {
    // Fetch the link session to get the code challenge
    const { data: session, error } = await supabaseAdmin
      .from('x_link_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'pending')
      .single()

    if (error || !session) {
      return NextResponse.redirect(new URL('/link-account/invalid', request.nextUrl.origin))
    }

    // Check if expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.redirect(new URL('/link-account/expired', request.nextUrl.origin))
    }

    // Generate state that includes the session ID
    const state = `link_${sessionId}_${generateState()}`

    // Store state and verifier in cookies (for this device)
    const cookieStore = await cookies()
    
    cookieStore.set('x_code_verifier', session.code_verifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    })
    
    cookieStore.set('x_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    })

    cookieStore.set('x_oauth_action', 'link_crossdevice', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    })

    cookieStore.set('x_link_session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    })

    // Build authorization URL
    const authUrl = buildAuthUrl({
      clientId,
      redirectUri: redirectUri!,
      state,
      codeChallenge: session.code_challenge,
    })

    return NextResponse.redirect(authUrl)
  } catch (err) {
    console.error('Link OAuth error:', err)
    return NextResponse.redirect(new URL('/link-account/error', request.nextUrl.origin))
  }
}

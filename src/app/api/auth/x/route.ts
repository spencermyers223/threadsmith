/**
 * X OAuth 2.0 - Initiate Authorization
 * 
 * GET /api/auth/x
 * Redirects user to X authorization page
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { 
  generateCodeVerifier, 
  generateCodeChallenge, 
  generateState, 
  buildAuthUrl 
} from '@/lib/x-auth'

export async function GET() {
  const clientId = process.env.X_CLIENT_ID
  const redirectUri = process.env.X_CALLBACK_URL
  
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'X API not configured' },
      { status: 500 }
    )
  }
  
  // Generate PKCE values
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = generateState()
  
  // Store verifier and state in cookies (httpOnly for security)
  const cookieStore = await cookies()
  
  cookieStore.set('x_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })
  
  cookieStore.set('x_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  })
  
  // Build authorization URL and redirect
  const authUrl = buildAuthUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge,
  })
  
  return NextResponse.redirect(authUrl)
}

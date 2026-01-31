/**
 * X OAuth Link Session API
 * 
 * POST /api/auth/x/link-session - Create a new link session for cross-device OAuth
 * GET /api/auth/x/link-session?id=xxx - Check status of a link session
 * 
 * This enables users to authorize a different X account from another device
 * (e.g., their phone) and have it linked to their current xthread account.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/x-auth'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Create a new link session
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
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
      return NextResponse.json(
        { error: 'Account limit reached. Upgrade to add more accounts.' },
        { status: 403 }
      )
    }

    // Generate unique session ID and PKCE values
    const sessionId = crypto.randomBytes(16).toString('hex')
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)

    // Store session in database (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: insertError } = await supabaseAdmin
      .from('x_link_sessions')
      .insert({
        id: sessionId,
        user_id: user.id,
        code_verifier: codeVerifier,
        code_challenge: codeChallenge,
        status: 'pending',
        expires_at: expiresAt,
      })

    if (insertError) {
      // Table might not exist, create it
      if (insertError.code === '42P01') {
        await supabaseAdmin.rpc('create_link_sessions_table')
        // Retry insert
        await supabaseAdmin
          .from('x_link_sessions')
          .insert({
            id: sessionId,
            user_id: user.id,
            code_verifier: codeVerifier,
            code_challenge: codeChallenge,
            status: 'pending',
            expires_at: expiresAt,
          })
      } else {
        throw insertError
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://xthread.io'
    const linkUrl = `${baseUrl}/link-account/${sessionId}`

    return NextResponse.json({
      sessionId,
      linkUrl,
      expiresAt,
    })
  } catch (error) {
    console.error('Link session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create link session' },
      { status: 500 }
    )
  }
}

// GET - Check status of a link session
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('id')

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }

  try {
    const { data: session, error } = await supabaseAdmin
      .from('x_link_sessions')
      .select('status, linked_x_username, expires_at')
      .eq('id', sessionId)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ 
        status: 'expired',
        error: 'Link session has expired' 
      })
    }

    return NextResponse.json({
      status: session.status,
      linkedUsername: session.linked_x_username,
    })
  } catch (error) {
    console.error('Link session check error:', error)
    return NextResponse.json(
      { error: 'Failed to check session' },
      { status: 500 }
    )
  }
}

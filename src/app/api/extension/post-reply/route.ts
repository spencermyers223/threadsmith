/**
 * Extension API - Post Reply to X
 * 
 * POST /api/extension/post-reply
 * Posts a reply to X on behalf of the authenticated user
 * 
 * Body:
 * - text: string (required) - Reply content
 * - replyToUrl: string (required) - URL of tweet being replied to
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.slice(7)
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    // Check premium status
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()
    
    const isPremium = profile?.subscription_status === 'active' || 
                      profile?.subscription_status === 'trialing' ||
                      profile?.subscription_status === 'lifetime'
    
    if (!isPremium) {
      return NextResponse.json(
        { error: 'Premium subscription required for direct posting' },
        { status: 403 }
      )
    }
    
    // Get user's X tokens
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('x_tokens')
      .select('access_token, expires_at')
      .eq('user_id', user.id)
      .single()
    
    if (tokensError || !tokens) {
      return NextResponse.json(
        { error: 'X account not connected. Please sign in again.' },
        { status: 400 }
      )
    }
    
    // Check if token is expired
    if (new Date(tokens.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'X token expired. Please sign in again.' },
        { status: 401 }
      )
    }
    
    // Parse request body
    const body = await request.json()
    const { text, replyToUrl } = body
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }
    
    if (text.length > 280) {
      return NextResponse.json({ error: 'Reply exceeds 280 characters' }, { status: 400 })
    }
    
    if (!replyToUrl || typeof replyToUrl !== 'string') {
      return NextResponse.json({ error: 'replyToUrl is required' }, { status: 400 })
    }
    
    // Extract tweet ID from URL
    // URL format: https://x.com/username/status/1234567890
    const tweetIdMatch = replyToUrl.match(/status\/(\d+)/)
    if (!tweetIdMatch) {
      return NextResponse.json({ error: 'Invalid tweet URL' }, { status: 400 })
    }
    
    const replyToTweetId = tweetIdMatch[1]
    
    // Post reply to X API
    const postResponse = await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        reply: {
          in_reply_to_tweet_id: replyToTweetId,
        },
      }),
    })
    
    if (!postResponse.ok) {
      const error = await postResponse.text()
      console.error('X API post error:', error)
      
      // Check for specific error types
      if (postResponse.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit reached. Please wait a moment.' },
          { status: 429 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to post reply to X' },
        { status: postResponse.status }
      )
    }
    
    const result = await postResponse.json()
    
    return NextResponse.json({
      success: true,
      tweet_id: result.data?.id,
      text: result.data?.text,
    })
    
  } catch (error) {
    console.error('Extension post-reply error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

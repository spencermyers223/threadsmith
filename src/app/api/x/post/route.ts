/**
 * X API - Post Tweet
 * 
 * POST /api/x/post
 * Posts a tweet to X on behalf of the authenticated user
 * 
 * Body:
 * - text: string (required) - Tweet content
 * - reply_to: string (optional) - Tweet ID to reply to (for threads)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's X tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('x_tokens')
      .select('access_token, expires_at')
      .eq('user_id', user.id)
      .single()
    
    if (tokensError || !tokens) {
      return NextResponse.json(
        { error: 'X account not connected. Please sign in with X.' },
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
    const { text, reply_to } = body
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'text is required' },
        { status: 400 }
      )
    }
    
    if (text.length > 280) {
      return NextResponse.json(
        { error: 'Tweet exceeds 280 characters' },
        { status: 400 }
      )
    }
    
    // Build tweet payload
    const tweetPayload: any = { text }
    
    if (reply_to) {
      tweetPayload.reply = {
        in_reply_to_tweet_id: reply_to,
      }
    }
    
    // Post to X API
    const postResponse = await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetPayload),
    })
    
    if (!postResponse.ok) {
      const error = await postResponse.text()
      console.error('X API post error:', error)
      return NextResponse.json(
        { error: 'Failed to post tweet' },
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
    console.error('Error posting tweet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

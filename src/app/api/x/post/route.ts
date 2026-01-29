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
import { getValidXTokens } from '@/lib/x-tokens'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get valid X tokens (with auto-refresh)
    const tokenResult = await getValidXTokens(user.id)
    
    if (!tokenResult.success) {
      return NextResponse.json(
        { error: tokenResult.error, needsReauth: tokenResult.needsReauth },
        { status: tokenResult.needsReauth ? 401 : 400 }
      )
    }
    
    const { tokens } = tokenResult
    
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
    const tweetPayload: { text: string; reply?: { in_reply_to_tweet_id: string } } = { text }
    
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

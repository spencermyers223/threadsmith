/**
 * X API - Post Thread
 * 
 * POST /api/x/thread
 * Posts a thread (multiple tweets as reply chain) to X
 * 
 * Body:
 * - tweets: string[] (required) - Array of tweet texts in order
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
    const { tweets } = body
    
    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      return NextResponse.json(
        { error: 'tweets array is required' },
        { status: 400 }
      )
    }
    
    if (tweets.length > 25) {
      return NextResponse.json(
        { error: 'Thread cannot exceed 25 tweets' },
        { status: 400 }
      )
    }
    
    // Validate all tweets before posting
    for (let i = 0; i < tweets.length; i++) {
      if (typeof tweets[i] !== 'string') {
        return NextResponse.json(
          { error: `Tweet ${i + 1} must be a string` },
          { status: 400 }
        )
      }
      if (tweets[i].length > 280) {
        return NextResponse.json(
          { error: `Tweet ${i + 1} exceeds 280 characters` },
          { status: 400 }
        )
      }
    }
    
    // Post tweets as a thread (reply chain)
    const postedTweets: { id: string; text: string }[] = []
    let previousTweetId: string | null = null
    
    for (let i = 0; i < tweets.length; i++) {
      const tweetPayload: { text: string; reply?: { in_reply_to_tweet_id: string } } = { text: tweets[i] }
      
      // Reply to previous tweet in thread
      if (previousTweetId) {
        tweetPayload.reply = {
          in_reply_to_tweet_id: previousTweetId,
        }
      }
      
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
        console.error(`X API error posting tweet ${i + 1}:`, error)
        
        // Return partial success info
        return NextResponse.json(
          {
            error: `Failed to post tweet ${i + 1}`,
            posted_tweets: postedTweets,
            failed_at_index: i,
          },
          { status: postResponse.status }
        )
      }
      
      const result = await postResponse.json()
      const tweetId = result.data?.id
      
      postedTweets.push({
        id: tweetId,
        text: result.data?.text || tweets[i],
      })
      
      previousTweetId = tweetId
      
      // Small delay between posts to avoid rate limiting
      if (i < tweets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    return NextResponse.json({
      success: true,
      thread_length: postedTweets.length,
      tweets: postedTweets,
      first_tweet_id: postedTweets[0]?.id,
    })
    
  } catch (error) {
    console.error('Error posting thread:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

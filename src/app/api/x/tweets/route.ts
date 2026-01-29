/**
 * X API - Fetch User's Tweets
 * 
 * GET /api/x/tweets
 * Fetches authenticated user's recent tweets for voice training
 * 
 * Query params:
 * - max_results: number of tweets to fetch (default: 100, max: 100)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidXTokens } from '@/lib/x-tokens'

export async function GET(request: NextRequest) {
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
    
    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const maxResults = Math.min(
      parseInt(searchParams.get('max_results') || '100'),
      100
    )
    
    // Fetch tweets from X API
    const tweetsUrl = new URL(`https://api.x.com/2/users/${tokens.x_user_id}/tweets`)
    tweetsUrl.searchParams.set('max_results', maxResults.toString())
    tweetsUrl.searchParams.set('tweet.fields', 'created_at,public_metrics,conversation_id')
    tweetsUrl.searchParams.set('exclude', 'retweets,replies')
    
    const tweetsResponse = await fetch(tweetsUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    })
    
    if (!tweetsResponse.ok) {
      const error = await tweetsResponse.text()
      console.error('X API error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tweets from X' },
        { status: tweetsResponse.status }
      )
    }
    
    const tweetsData = await tweetsResponse.json()
    
    // Transform the data
    interface XTweet {
      id: string
      text: string
      created_at: string
      public_metrics?: {
        like_count?: number
        retweet_count?: number
        reply_count?: number
      }
      conversation_id?: string
    }
    
    interface TransformedTweet {
      id: string
      text: string
      created_at: string
      metrics: {
        like_count?: number
        retweet_count?: number
        reply_count?: number
      }
      is_thread_start: boolean
    }
    
    const tweets: TransformedTweet[] = (tweetsData.data || []).map((tweet: XTweet) => ({
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      metrics: tweet.public_metrics || {},
      is_thread_start: tweet.conversation_id === tweet.id,
    }))
    
    // Calculate aggregate stats
    const stats = {
      total_tweets: tweets.length,
      avg_likes: tweets.length > 0
        ? Math.round(tweets.reduce((sum, t) => sum + (t.metrics.like_count || 0), 0) / tweets.length)
        : 0,
      avg_retweets: tweets.length > 0
        ? Math.round(tweets.reduce((sum, t) => sum + (t.metrics.retweet_count || 0), 0) / tweets.length)
        : 0,
      avg_replies: tweets.length > 0
        ? Math.round(tweets.reduce((sum, t) => sum + (t.metrics.reply_count || 0), 0) / tweets.length)
        : 0,
    }
    
    return NextResponse.json({
      tweets,
      stats,
      meta: tweetsData.meta || {},
    })
    
  } catch (error) {
    console.error('Error fetching tweets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

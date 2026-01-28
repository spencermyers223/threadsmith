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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's X tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('x_tokens')
      .select('access_token, x_user_id, expires_at')
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
      // TODO: Implement token refresh
      return NextResponse.json(
        { error: 'X token expired. Please sign in again.' },
        { status: 401 }
      )
    }
    
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
    const tweets = (tweetsData.data || []).map((tweet: any) => ({
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
        ? Math.round(tweets.reduce((sum: number, t: any) => sum + (t.metrics.like_count || 0), 0) / tweets.length)
        : 0,
      avg_retweets: tweets.length > 0
        ? Math.round(tweets.reduce((sum: number, t: any) => sum + (t.metrics.retweet_count || 0), 0) / tweets.length)
        : 0,
      avg_replies: tweets.length > 0
        ? Math.round(tweets.reduce((sum: number, t: any) => sum + (t.metrics.reply_count || 0), 0) / tweets.length)
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

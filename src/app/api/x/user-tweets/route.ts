/**
 * X API - Fetch Tweets from Any User by Username
 * 
 * GET /api/x/user-tweets?username=levelsio&max_results=20
 * Fetches public tweets from any X user for inspiration/analysis
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
    const username = searchParams.get('username')
    const maxResults = Math.min(
      parseInt(searchParams.get('max_results') || '20'),
      100
    )
    
    if (!username) {
      return NextResponse.json({ error: 'username is required' }, { status: 400 })
    }
    
    // First, look up the user ID from username
    const userLookupUrl = new URL('https://api.x.com/2/users/by/username/' + username)
    userLookupUrl.searchParams.set('user.fields', 'id,name,username,profile_image_url,public_metrics')
    
    const userResponse = await fetch(userLookupUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    })
    
    if (!userResponse.ok) {
      const error = await userResponse.text()
      console.error('X API user lookup error:', error)
      if (userResponse.status === 404) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      return NextResponse.json(
        { error: 'Failed to look up user' },
        { status: userResponse.status }
      )
    }
    
    const userData = await userResponse.json()
    const targetUser = userData.data
    
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Now fetch their tweets
    const tweetsUrl = new URL(`https://api.x.com/2/users/${targetUser.id}/tweets`)
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
      console.error('X API tweets error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tweets' },
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
        quote_count?: number
      }
      conversation_id?: string
    }
    
    const tweets = (tweetsData.data || []).map((tweet: XTweet) => ({
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      url: `https://x.com/${username}/status/${tweet.id}`,
      metrics: {
        like_count: tweet.public_metrics?.like_count || 0,
        retweet_count: tweet.public_metrics?.retweet_count || 0,
        reply_count: tweet.public_metrics?.reply_count || 0,
        quote_count: tweet.public_metrics?.quote_count || 0,
      },
      is_thread_start: tweet.conversation_id === tweet.id,
    }))
    
    // Sort by engagement (likes + retweets + replies)
    tweets.sort((a: { metrics: { like_count: number; retweet_count: number; reply_count: number } }, b: { metrics: { like_count: number; retweet_count: number; reply_count: number } }) => {
      const engagementA = a.metrics.like_count + a.metrics.retweet_count * 2 + a.metrics.reply_count * 3
      const engagementB = b.metrics.like_count + b.metrics.retweet_count * 2 + b.metrics.reply_count * 3
      return engagementB - engagementA
    })
    
    return NextResponse.json({
      user: {
        id: targetUser.id,
        name: targetUser.name,
        username: targetUser.username,
        profile_image_url: targetUser.profile_image_url,
        followers_count: targetUser.public_metrics?.followers_count || 0,
      },
      tweets,
      meta: tweetsData.meta || {},
    })
    
  } catch (error) {
    console.error('Error fetching user tweets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

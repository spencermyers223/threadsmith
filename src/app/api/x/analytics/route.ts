/**
 * X API - Fetch Tweet Analytics
 * 
 * GET /api/x/analytics
 * Fetches authenticated user's tweet metrics for analytics dashboard
 * 
 * Query params:
 * - x_account_id: specific X account to fetch analytics for
 * - max_results: number of tweets to fetch (default: 50, max: 100)
 * - days: how many days back to look (default: 7)
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
    
    // Get x_account_id from query params
    const searchParams = request.nextUrl.searchParams
    const xAccountId = searchParams.get('x_account_id') || undefined
    
    // Get valid tokens (with auto-refresh!)
    const tokenResult = await getValidXTokens(user.id, xAccountId)
    
    if (!tokenResult.success) {
      return NextResponse.json(
        { error: tokenResult.error, needsReauth: tokenResult.needsReauth },
        { status: tokenResult.needsReauth ? 401 : 400 }
      )
    }
    
    const tokens = tokenResult.tokens
    
    // Parse query params
    const maxResults = Math.min(
      parseInt(searchParams.get('max_results') || '50'),
      100
    )
    
    // Fetch tweets with metrics
    const tweetsUrl = new URL(`https://api.x.com/2/users/${tokens.x_user_id}/tweets`)
    tweetsUrl.searchParams.set('max_results', maxResults.toString())
    tweetsUrl.searchParams.set('tweet.fields', 'created_at,public_metrics,conversation_id,text')
    tweetsUrl.searchParams.set('exclude', 'retweets')
    
    const tweetsResponse = await fetch(tweetsUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    })
    
    if (!tweetsResponse.ok) {
      const error = await tweetsResponse.text()
      console.error('X API error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch analytics from X' },
        { status: tweetsResponse.status }
      )
    }
    
    const tweetsData = await tweetsResponse.json()
    
    interface XTweet {
      id: string
      text: string
      created_at: string
      public_metrics?: {
        like_count?: number
        retweet_count?: number
        reply_count?: number
        impression_count?: number
        quote_count?: number
      }
      conversation_id?: string
    }
    
    // Transform and calculate analytics
    // Filter: only include thread starters (standalone tweets or first tweet of a thread)
    // This excludes thread continuation tweets which skew engagement metrics
    const allTweets = (tweetsData.data || [])
    const threadStartTweets = allTweets.filter((tweet: XTweet) => 
      tweet.conversation_id === tweet.id
    )
    
    const tweets = threadStartTweets.map((tweet: XTweet) => {
      const metrics = tweet.public_metrics || {}
      
      // Don't count replies in engagement - they often include thread continuations
      // which inflate the metric. Focus on likes, retweets, and quotes as true engagement.
      const engagement = (metrics.like_count || 0) + 
                        (metrics.retweet_count || 0) + 
                        (metrics.quote_count || 0)
      const impressions = metrics.impression_count || 0
      const engagementRate = impressions > 0 
        ? ((engagement / impressions) * 100).toFixed(2) 
        : '0.00'
      
      return {
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        is_thread_start: true,
        metrics: {
          likes: metrics.like_count || 0,
          retweets: metrics.retweet_count || 0,
          replies: metrics.reply_count || 0, // Keep for display, but not in engagement calc
          quotes: metrics.quote_count || 0,
          impressions: impressions,
          engagement: engagement,
          engagement_rate: parseFloat(engagementRate),
        },
      }
    })
    
    // Calculate aggregate stats
    // Note: totalTweets now only counts thread starters (standalone posts + first tweet of threads)
    const totalTweets = tweets.length
    const totalImpressions = tweets.reduce((sum: number, t: typeof tweets[0]) => sum + t.metrics.impressions, 0)
    const totalEngagement = tweets.reduce((sum: number, t: typeof tweets[0]) => sum + t.metrics.engagement, 0)
    const totalLikes = tweets.reduce((sum: number, t: typeof tweets[0]) => sum + t.metrics.likes, 0)
    const totalRetweets = tweets.reduce((sum: number, t: typeof tweets[0]) => sum + t.metrics.retweets, 0)
    const totalReplies = tweets.reduce((sum: number, t: typeof tweets[0]) => sum + t.metrics.replies, 0)
    
    const avgEngagementRate = totalImpressions > 0
      ? ((totalEngagement / totalImpressions) * 100).toFixed(2)
      : '0.00'
    
    // Find top performing tweets
    const topByLikes = [...tweets].sort((a, b) => b.metrics.likes - a.metrics.likes).slice(0, 5)
    const topByEngagement = [...tweets].sort((a, b) => b.metrics.engagement_rate - a.metrics.engagement_rate).slice(0, 5)
    
    return NextResponse.json({
      tweets,
      summary: {
        total_tweets: totalTweets,
        total_impressions: totalImpressions,
        total_engagement: totalEngagement,
        total_likes: totalLikes,
        total_retweets: totalRetweets,
        total_replies: totalReplies,
        avg_engagement_rate: parseFloat(avgEngagementRate),
        avg_likes: totalTweets > 0 ? Math.round(totalLikes / totalTweets) : 0,
        avg_retweets: totalTweets > 0 ? Math.round(totalRetweets / totalTweets) : 0,
        avg_replies: totalTweets > 0 ? Math.round(totalReplies / totalTweets) : 0,
      },
      top_performers: {
        by_likes: topByLikes,
        by_engagement_rate: topByEngagement,
      },
      meta: tweetsData.meta || {},
    })
    
  } catch (error) {
    console.error('Error fetching X analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

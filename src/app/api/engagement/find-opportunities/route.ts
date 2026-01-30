/**
 * Find Engagement Opportunities API
 * 
 * GET /api/engagement/find-opportunities
 * Analyzes recent tweets from accounts the user follows to find high-value reply opportunities
 * 
 * Query params:
 * - limit: number of opportunities to return (default: 10, max: 20)
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
    
    // Get X tokens
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Check x_tokens first, then x_accounts as fallback
    let tokens = null
    
    const { data: xTokens } = await supabaseAdmin
      .from('x_tokens')
      .select('access_token, x_user_id, expires_at')
      .eq('user_id', user.id)
      .single()
    
    if (xTokens?.access_token) {
      tokens = xTokens
    } else {
      // Fallback: check x_accounts table
      const { data: xAccount } = await supabaseAdmin
        .from('x_accounts')
        .select('access_token, x_user_id, token_expires_at')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single()
      
      if (xAccount?.access_token) {
        tokens = {
          access_token: xAccount.access_token,
          x_user_id: xAccount.x_user_id,
          expires_at: xAccount.token_expires_at,
        }
      }
    }
    
    if (!tokens) {
      return NextResponse.json(
        { error: 'X account not connected' },
        { status: 400 }
      )
    }
    
    if (new Date(tokens.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'X token expired. Please sign in again.' },
        { status: 401 }
      )
    }
    
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    
    // Get user's timeline (home timeline with recent tweets from people they follow)
    // Note: X API v2 timeline endpoint requires elevated access
    // For now, we'll fetch the user's own timeline and suggest based on that
    
    // Alternative approach: Search for trending topics in user's niche
    // This would require knowing their niche, which we have in content_profiles
    
    const { data: profile } = await supabaseAdmin
      .from('content_profiles')
      .select('niche')
      .eq('user_id', user.id)
      .single()
    
    const niche = profile?.niche || 'tech'
    
    // Search for recent popular tweets in the user's niche
    const searchQuery = encodeURIComponent(`${niche} -is:retweet has:mentions`)
    const searchUrl = new URL('https://api.x.com/2/tweets/search/recent')
    searchUrl.searchParams.set('query', searchQuery)
    searchUrl.searchParams.set('max_results', String(Math.min(limit * 2, 50))) // Get more to filter
    searchUrl.searchParams.set('tweet.fields', 'public_metrics,created_at,author_id,conversation_id')
    searchUrl.searchParams.set('expansions', 'author_id')
    searchUrl.searchParams.set('user.fields', 'name,username,public_metrics,verified')
    
    const searchResponse = await fetch(searchUrl.toString(), {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` },
    })
    
    if (!searchResponse.ok) {
      const error = await searchResponse.text()
      console.error('X search error:', error)
      // Fall back to simpler approach
      return NextResponse.json({
        opportunities: [],
        message: 'Search requires elevated API access. Try the Reply Coach extension instead.',
        suggestion: 'Install the xthread Chrome extension to get AI coaching on any tweet you\'re viewing.',
      })
    }
    
    const searchData = await searchResponse.json()
    const tweets = searchData.data || []
    const users = searchData.includes?.users || []
    
    // Create user lookup
    const userMap = new Map(users.map((u: { id: string }) => [u.id, u]))
    
    // Score and filter tweets
    interface Tweet {
      id: string
      text: string
      author_id: string
      created_at: string
      public_metrics?: {
        like_count?: number
        retweet_count?: number
        reply_count?: number
        impression_count?: number
      }
    }
    
    interface User {
      id: string
      name: string
      username: string
      public_metrics?: {
        followers_count?: number
      }
      verified?: boolean
    }
    
    interface Opportunity {
      id: string
      text: string
      author: {
        id: string
        name: string
        username: string
        followers: number
        verified: boolean
      }
      metrics: {
        likes: number
        retweets: number
        replies: number
      }
      score: number
      scoreReason: string
      url: string
      posted_at: string
    }
    
    const opportunities: Opportunity[] = tweets
      .map((tweet: Tweet) => {
        const author = userMap.get(tweet.author_id) as User | undefined
        const metrics = tweet.public_metrics || {}
        
        // Calculate opportunity score
        // High engagement + large following + few replies = good opportunity
        const followers = author?.public_metrics?.followers_count || 0
        const likes = metrics.like_count || 0
        const replies = metrics.reply_count || 0
        const retweets = metrics.retweet_count || 0
        
        // Opportunity score: high engagement, not too many replies yet
        let score = 0
        const reasons: string[] = []
        
        // Boost for large accounts
        if (followers > 100000) { score += 30; reasons.push('Large account') }
        else if (followers > 10000) { score += 20; reasons.push('Growing account') }
        else if (followers > 1000) { score += 10; reasons.push('Active account') }
        
        // Boost for engagement
        if (likes > 100) { score += 20; reasons.push('High engagement') }
        else if (likes > 20) { score += 10; reasons.push('Good engagement') }
        
        // Boost for low reply count (more room to stand out)
        if (replies < 5) { score += 20; reasons.push('Low competition') }
        else if (replies < 20) { score += 10; reasons.push('Room to engage') }
        
        // Boost for verified accounts
        if (author?.verified) { score += 15; reasons.push('Verified') }
        
        // Boost for retweets (virality signal)
        if (retweets > 50) { score += 15; reasons.push('Going viral') }
        
        // Check freshness
        const ageMinutes = (Date.now() - new Date(tweet.created_at).getTime()) / 60000
        if (ageMinutes < 30) { score += 25; reasons.push('Fresh post') }
        else if (ageMinutes < 60) { score += 15; reasons.push('Recent') }
        else if (ageMinutes < 120) { score += 5 }
        
        return {
          id: tweet.id,
          text: tweet.text,
          author: {
            id: tweet.author_id,
            name: author?.name || 'Unknown',
            username: author?.username || 'unknown',
            followers: followers,
            verified: author?.verified || false,
          },
          metrics: {
            likes,
            retweets,
            replies,
          },
          score,
          scoreReason: reasons.slice(0, 3).join(' · ') || 'Good opportunity',
          url: `https://x.com/${author?.username || 'i'}/status/${tweet.id}`,
          posted_at: tweet.created_at,
        }
      })
      .filter((opp: Opportunity) => opp.score >= 30) // Only show good opportunities
      .sort((a: Opportunity, b: Opportunity) => b.score - a.score)
      .slice(0, limit)
    
    return NextResponse.json({
      opportunities,
      niche,
      tip: opportunities.length > 0 
        ? 'Reply within 30 minutes for maximum visibility. Use the Reply Coach for help crafting your response.'
        : 'No high-value opportunities found. Try adjusting your niche in Settings → Voice.',
    })
    
  } catch (error) {
    console.error('Find opportunities error:', error)
    return NextResponse.json(
      { error: 'Failed to find opportunities' },
      { status: 500 }
    )
  }
}

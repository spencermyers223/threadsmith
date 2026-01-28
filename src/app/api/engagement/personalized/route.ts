/**
 * Personalized Engagement Score API
 * 
 * POST /api/engagement/personalized
 * Scores a draft and provides personalized recommendations based on user's X performance
 * 
 * Body:
 * - text: string - Draft content to score
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scoreEngagement } from '@/lib/engagement-scorer'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { text } = body
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }
    
    // Get base score from client-side scorer
    const baseScore = scoreEngagement(text)
    
    // Try to get user's X tokens for personalized data
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data: tokens } = await supabaseAdmin
      .from('x_tokens')
      .select('access_token, x_user_id, expires_at')
      .eq('user_id', user.id)
      .single()
    
    // If no X connection or expired token, return base score
    if (!tokens || new Date(tokens.expires_at) < new Date()) {
      return NextResponse.json({
        ...baseScore,
        personalized: false,
        insights: {
          message: 'Connect X account for personalized recommendations',
        },
      })
    }
    
    // Fetch user's recent tweets for analysis
    try {
      const tweetsUrl = new URL(`https://api.x.com/2/users/${tokens.x_user_id}/tweets`)
      tweetsUrl.searchParams.set('max_results', '50')
      tweetsUrl.searchParams.set('tweet.fields', 'created_at,public_metrics,text')
      tweetsUrl.searchParams.set('exclude', 'retweets,replies')
      
      const tweetsResponse = await fetch(tweetsUrl.toString(), {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      })
      
      if (!tweetsResponse.ok) {
        // X API error - return base score
        return NextResponse.json({
          ...baseScore,
          personalized: false,
          insights: {
            message: 'Could not fetch X data - using general recommendations',
          },
        })
      }
      
      const tweetsData = await tweetsResponse.json()
      const tweets = tweetsData.data || []
      
      if (tweets.length === 0) {
        return NextResponse.json({
          ...baseScore,
          personalized: false,
          insights: {
            message: 'Post more on X to get personalized recommendations',
          },
        })
      }
      
      // Analyze user's patterns
      interface TweetData {
        text: string
        created_at: string
        public_metrics?: {
          like_count?: number
          retweet_count?: number
          reply_count?: number
          impression_count?: number
        }
      }
      
      const analysis = analyzeTweetPatterns(tweets as TweetData[])
      
      // Generate personalized insights
      const insights = generatePersonalizedInsights(text, analysis, baseScore.score)
      
      return NextResponse.json({
        ...baseScore,
        personalized: true,
        userStats: {
          avgEngagementRate: analysis.avgEngagementRate,
          avgLength: analysis.avgLength,
          topPerformingLength: analysis.topPerformingLength,
          bestDays: analysis.bestDays,
          usesEmojis: analysis.emojiUsageRate > 0.3,
          usesQuestions: analysis.questionRate > 0.2,
        },
        insights,
      })
      
    } catch (error) {
      console.error('Error fetching X data:', error)
      return NextResponse.json({
        ...baseScore,
        personalized: false,
        insights: {
          message: 'Using general recommendations',
        },
      })
    }
    
  } catch (error) {
    console.error('Personalized scoring error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

interface TweetData {
  text: string
  created_at: string
  public_metrics?: {
    like_count?: number
    retweet_count?: number
    reply_count?: number
    impression_count?: number
  }
}

interface TweetAnalysis {
  avgEngagementRate: number
  avgLength: number
  topPerformingLength: number
  bestDays: string[]
  emojiUsageRate: number
  questionRate: number
  hashtagRate: number
}

function analyzeTweetPatterns(tweets: TweetData[]): TweetAnalysis {
  const emojiRegex = /[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2600-\u26FF]|[\u2700-\u27BF]/g
  
  let totalEngagement = 0
  let totalImpressions = 0
  let totalLength = 0
  let withEmojis = 0
  let withQuestions = 0
  let withHashtags = 0
  
  const dayEngagement: Record<number, { total: number; count: number }> = {}
  const lengthEngagement: { length: number; rate: number }[] = []
  
  for (const tweet of tweets) {
    const metrics = tweet.public_metrics || {}
    const engagement = (metrics.like_count || 0) + 
                      (metrics.retweet_count || 0) + 
                      (metrics.reply_count || 0)
    const impressions = metrics.impression_count || 1
    const engRate = (engagement / impressions) * 100
    
    totalEngagement += engagement
    totalImpressions += impressions
    totalLength += tweet.text.length
    
    if (emojiRegex.test(tweet.text)) withEmojis++
    if (tweet.text.includes('?')) withQuestions++
    if (/#\w+/.test(tweet.text)) withHashtags++
    
    const day = new Date(tweet.created_at).getDay()
    if (!dayEngagement[day]) dayEngagement[day] = { total: 0, count: 0 }
    dayEngagement[day].total += engRate
    dayEngagement[day].count++
    
    lengthEngagement.push({ length: tweet.text.length, rate: engRate })
  }
  
  const count = tweets.length
  
  // Find best performing length range
  lengthEngagement.sort((a, b) => b.rate - a.rate)
  const topPerformingLength = lengthEngagement.length > 0 
    ? lengthEngagement.slice(0, 5).reduce((sum, t) => sum + t.length, 0) / Math.min(5, lengthEngagement.length)
    : 200
  
  // Find best days
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const bestDays = Object.entries(dayEngagement)
    .map(([day, data]) => ({
      day: dayNames[parseInt(day)],
      avgRate: data.count > 0 ? data.total / data.count : 0,
    }))
    .sort((a, b) => b.avgRate - a.avgRate)
    .slice(0, 3)
    .map(d => d.day)
  
  return {
    avgEngagementRate: totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0,
    avgLength: count > 0 ? totalLength / count : 0,
    topPerformingLength: Math.round(topPerformingLength),
    bestDays,
    emojiUsageRate: count > 0 ? withEmojis / count : 0,
    questionRate: count > 0 ? withQuestions / count : 0,
    hashtagRate: count > 0 ? withHashtags / count : 0,
  }
}

function generatePersonalizedInsights(
  text: string, 
  analysis: TweetAnalysis, 
  score: number
): { tips: string[]; comparison: string } {
  const tips: string[] = []
  
  // Length comparison
  const textLength = text.length
  if (textLength < analysis.topPerformingLength * 0.7) {
    tips.push(`Your top posts average ${Math.round(analysis.topPerformingLength)} chars — consider adding more detail`)
  } else if (textLength > analysis.topPerformingLength * 1.3) {
    tips.push(`Your best posts are around ${Math.round(analysis.topPerformingLength)} chars — this might be too long`)
  }
  
  // Emoji usage
  const hasEmoji = /[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2600-\u26FF]|[\u2700-\u27BF]/.test(text)
  if (analysis.emojiUsageRate > 0.5 && !hasEmoji) {
    tips.push('You typically use emojis in your top posts — consider adding one')
  }
  
  // Question usage
  const hasQuestion = text.includes('?')
  if (analysis.questionRate > 0.3 && !hasQuestion) {
    tips.push('Questions work well for you — try ending with one')
  }
  
  // Best posting days
  const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]
  if (!analysis.bestDays.includes(today)) {
    tips.push(`Your best engagement is on ${analysis.bestDays.join(', ')} — consider scheduling`)
  }
  
  // Comparison to average
  let comparison: string
  if (score > 75) {
    comparison = `This looks strong! Your avg engagement rate is ${analysis.avgEngagementRate.toFixed(2)}% — this could beat it.`
  } else if (score > 50) {
    comparison = `Good start. Your avg engagement is ${analysis.avgEngagementRate.toFixed(2)}% — a few tweaks could boost this.`
  } else {
    comparison = `Room to improve. Apply the tips above to get closer to your ${analysis.avgEngagementRate.toFixed(2)}% average.`
  }
  
  return { tips, comparison }
}

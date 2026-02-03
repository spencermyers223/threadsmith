import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { deductCredits, hasEnoughCredits, getCredits } from '@/lib/credits'

const anthropic = new Anthropic()
const ANALYSIS_COST_CREDITS = 5

interface AnalysisRequest {
  username: string
  confirmCredit?: boolean
}

interface TweetData {
  text: string
  likes: number
  retweets: number
  replies: number
  created_at: string
  id: string
}

interface AccountAnalysis {
  username: string
  analyzedAt: string
  topTweets: Array<{
    text: string
    likes: number
    retweets: number
    url: string
    whyItWorks: string
  }>
  strategy: {
    postingFrequency: string
    contentMix: string
    bestPerformingTypes: string[]
    threadFrequency: string
  }
  voice: {
    summary: string
    toneMarkers: string[]
    sentenceStyle: string
    hookTechniques: string[]
    signatureMoves: string[]
  }
  engagement: {
    bestDays: string[]
    avgLikes: number
    avgRetweets: number
    threadVsTweetRatio: number
    topTopics: string[]
  }
  tacticsToSteal: string[]
}

// GET - Fetch saved analyses for current user
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  if (username) {
    // Get specific analysis
    const { data, error } = await supabase
      .from('account_analyses')
      .select('*')
      .eq('user_id', user.id)
      .eq('analyzed_username', username.toLowerCase().replace('@', ''))
      .single()

    if (error) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    return NextResponse.json({ analysis: data })
  }

  // Get all analyses for user
  const { data, error } = await supabase
    .from('account_analyses')
    .select('*')
    .eq('user_id', user.id)
    .order('analyzed_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ analyses: data || [] })
}

// POST - Run new analysis
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: AnalysisRequest = await request.json()
    const { username, confirmCredit } = body

    if (!username || username.trim().length === 0) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const cleanUsername = username.trim().toLowerCase().replace('@', '')

    // Check if analysis already exists (within last 7 days)
    const { data: existing } = await supabase
      .from('account_analyses')
      .select('*')
      .eq('user_id', user.id)
      .eq('analyzed_username', cleanUsername)
      .single()

    if (existing) {
      const analyzedAt = new Date(existing.analyzed_at)
      const daysSince = (Date.now() - analyzedAt.getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysSince < 7) {
        // Return cached analysis
        return NextResponse.json({
          analysis: existing,
          cached: true,
          message: `Using cached analysis from ${Math.round(daysSince)} days ago. Re-analyze after 7 days.`
        })
      }
    }

    // Check credits
    const creditCheck = await getCredits(supabase, user.id)
    const currentCredits = creditCheck.credits

    if (!confirmCredit) {
      return NextResponse.json({
        requiresConfirmation: true,
        creditCost: ANALYSIS_COST_CREDITS,
        currentCredits,
        message: `This analysis will use ${ANALYSIS_COST_CREDITS} credits. You have ${currentCredits} credits.`,
      }, { status: 402 })
    }

    const hasCredits = await hasEnoughCredits(supabase, user.id, ANALYSIS_COST_CREDITS)
    if (!hasCredits.success) {
      return NextResponse.json({
        error: `Not enough credits. Need ${ANALYSIS_COST_CREDITS}, have ${currentCredits}.`,
        code: 'INSUFFICIENT_CREDITS',
        required: ANALYSIS_COST_CREDITS,
        current: currentCredits,
      }, { status: 402 })
    }

    // Fetch tweets from X API
    const tweets = await fetchTweets(cleanUsername, 100)
    
    if (!tweets || tweets.length < 5) {
      return NextResponse.json({
        error: `Could not fetch enough tweets for @${cleanUsername}. Need at least 5 tweets, found ${tweets?.length || 0}.`,
        code: 'INSUFFICIENT_TWEETS',
      }, { status: 400 })
    }

    // Run AI analysis
    const analysis = await analyzeAccount(tweets, cleanUsername)

    // Deduct credits after successful analysis
    const deductResult = await deductCredits(supabase, user.id, ANALYSIS_COST_CREDITS, 'account_analysis')
    if (!deductResult.success) {
      console.error('Failed to deduct credits:', deductResult.error)
    }

    // Save analysis to database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('account_analyses')
      .upsert({
        user_id: user.id,
        analyzed_username: cleanUsername,
        analyzed_at: new Date().toISOString(),
        top_tweets: analysis.topTweets,
        strategy_analysis: analysis.strategy,
        voice_analysis: analysis.voice,
        engagement_patterns: analysis.engagement,
        tactics_to_steal: analysis.tacticsToSteal,
        tweets_fetched: tweets.length,
        credits_used: ANALYSIS_COST_CREDITS,
      }, {
        onConflict: 'user_id,analyzed_username',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save analysis:', saveError)
    }

    return NextResponse.json({
      analysis: savedAnalysis || {
        analyzed_username: cleanUsername,
        ...analysis,
      },
      creditsUsed: ANALYSIS_COST_CREDITS,
      creditsRemaining: deductResult.creditsRemaining || 0,
      tweetsAnalyzed: tweets.length,
    })

  } catch (error) {
    console.error('Account analysis error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Analysis failed',
    }, { status: 500 })
  }
}

async function fetchTweets(username: string, count: number): Promise<TweetData[]> {
  const bearerToken = process.env.X_BEARER_TOKEN
  
  if (!bearerToken) {
    throw new Error('X API not configured')
  }

  // Get user ID
  const userResponse = await fetch(
    `https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics`,
    {
      headers: { 'Authorization': `Bearer ${bearerToken}` },
    }
  )

  if (!userResponse.ok) {
    const error = await userResponse.json()
    throw new Error(`Failed to find user @${username}: ${error.detail || error.title || 'Unknown error'}`)
  }

  const userData = await userResponse.json()
  const userId = userData.data?.id

  if (!userId) {
    throw new Error(`User @${username} not found`)
  }

  // Fetch tweets
  const tweetsResponse = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=${Math.min(count, 100)}&tweet.fields=public_metrics,created_at&exclude=retweets,replies`,
    {
      headers: { 'Authorization': `Bearer ${bearerToken}` },
    }
  )

  if (!tweetsResponse.ok) {
    const error = await tweetsResponse.json()
    throw new Error(`Failed to fetch tweets: ${error.detail || error.title || 'Unknown error'}`)
  }

  const tweetsData = await tweetsResponse.json()
  
  return (tweetsData.data || []).map((t: {
    id: string
    text: string
    created_at: string
    public_metrics?: { like_count?: number; retweet_count?: number; reply_count?: number }
  }) => ({
    id: t.id,
    text: t.text,
    created_at: t.created_at,
    likes: t.public_metrics?.like_count || 0,
    retweets: t.public_metrics?.retweet_count || 0,
    replies: t.public_metrics?.reply_count || 0,
  }))
}

async function analyzeAccount(tweets: TweetData[], username: string): Promise<AccountAnalysis> {
  // Sort by engagement for top tweets
  const sortedByEngagement = [...tweets].sort((a, b) => 
    (b.likes + b.retweets * 2) - (a.likes + a.retweets * 2)
  )
  const topTweets = sortedByEngagement.slice(0, 5)

  // Calculate averages
  const avgLikes = Math.round(tweets.reduce((sum, t) => sum + t.likes, 0) / tweets.length)
  const avgRetweets = Math.round(tweets.reduce((sum, t) => sum + t.retweets, 0) / tweets.length)

  // Format tweets for AI
  const tweetTexts = topTweets
    .map((t, i) => `${i + 1}. "${t.text}" (${t.likes.toLocaleString()} likes, ${t.retweets.toLocaleString()} RTs)`)
    .join('\n\n')

  const allTweetTexts = tweets
    .slice(0, 30)
    .map((t, i) => `${i + 1}. "${t.text}"`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    system: `You are an elite X/Twitter content strategist analyzing accounts to extract actionable insights.

Your job is to analyze an account's content strategy, writing style, and engagement patterns to help another creator learn from their success.

Focus on:
- HOW they write (not WHAT topics)
- Engagement tactics that drive likes, RTs, and replies
- Patterns in their best-performing content
- Specific techniques others can copy

Return ONLY valid JSON, no markdown, no explanation.`,
    messages: [{
      role: 'user',
      content: `Analyze @${username}'s X/Twitter presence.

TOP 5 PERFORMING TWEETS:
${tweetTexts}

RECENT TWEETS SAMPLE (for style analysis):
${allTweetTexts}

METRICS:
- Total tweets analyzed: ${tweets.length}
- Average likes: ${avgLikes}
- Average retweets: ${avgRetweets}

Return a JSON object with this EXACT structure:
{
  "topTweets": [
    {
      "text": "exact tweet text",
      "likes": <number>,
      "retweets": <number>,
      "url": "https://x.com/${username}/status/<id>",
      "whyItWorks": "2-3 sentence explanation of why this tweet performed well"
    }
    // ... for all 5 top tweets
  ],
  "strategy": {
    "postingFrequency": "description of how often they post",
    "contentMix": "breakdown like '60% insights, 30% threads, 10% engagement'",
    "bestPerformingTypes": ["list", "of", "content", "types", "that", "work"],
    "threadFrequency": "how often they post threads vs single tweets"
  },
  "voice": {
    "summary": "2-3 sentence description of their unique voice and style",
    "toneMarkers": ["list", "of", "tone", "descriptors"],
    "sentenceStyle": "description of sentence patterns",
    "hookTechniques": ["specific", "hook", "techniques", "they", "use"],
    "signatureMoves": ["unique", "things", "this", "creator", "does"]
  },
  "engagement": {
    "bestDays": ["Tuesday", "Thursday"],
    "avgLikes": ${avgLikes},
    "avgRetweets": ${avgRetweets},
    "threadVsTweetRatio": 0.2,
    "topTopics": ["topic1", "topic2", "topic3"]
  },
  "tacticsToSteal": [
    "Specific actionable tactic 1",
    "Specific actionable tactic 2",
    "Specific actionable tactic 3",
    "Specific actionable tactic 4",
    "Specific actionable tactic 5"
  ]
}

For topTweets, use these actual tweet IDs:
${topTweets.map((t, i) => `${i + 1}. ID: ${t.id}`).join('\n')}

IMPORTANT: Return ONLY the raw JSON object.`
    }],
  })

  const textContent = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('')
    .trim()

  // Extract JSON
  let jsonStr = textContent
  const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }
  
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    jsonStr = objectMatch[0]
  }

  try {
    const parsed = JSON.parse(jsonStr)
    
    return {
      username,
      analyzedAt: new Date().toISOString(),
      topTweets: parsed.topTweets || [],
      strategy: parsed.strategy || {},
      voice: parsed.voice || {},
      engagement: parsed.engagement || {},
      tacticsToSteal: parsed.tacticsToSteal || [],
    }
  } catch (parseError) {
    console.error('Failed to parse AI response:', textContent.substring(0, 500))
    throw new Error(`Analysis parsing failed: ${parseError instanceof Error ? parseError.message : 'unknown error'}`)
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { deductCredits, hasEnoughCredits, getCredits } from '@/lib/credits'

const anthropic = new Anthropic()
const ANALYSIS_COST_CREDITS = 5
const FREE_ANALYSES_LIMIT = 3

// POST /api/style-templates/analyze - Analyze an admired account's writing style
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { username, templateId, confirmCredit } = body

    if (!username || username.trim().length === 0) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const cleanUsername = username.trim().toLowerCase().replace('@', '')

    // Count total analyses done by this user
    const { count: analysisCount } = await supabase
      .from('style_templates')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('profile_data', 'is', null)

    const totalAnalysesDone = analysisCount || 0
    const isFreeAnalysis = totalAnalysesDone < FREE_ANALYSES_LIMIT
    const creditCheck = await getCredits(supabase, user.id)
    const currentCredits = creditCheck.credits

    // If not free and no confirmation, return a warning requiring confirmation
    if (!isFreeAnalysis && !confirmCredit) {
      return NextResponse.json({
        requiresConfirmation: true,
        creditCost: ANALYSIS_COST_CREDITS,
        currentCredits,
        freeUsed: totalAnalysesDone,
        freeLimit: FREE_ANALYSES_LIMIT,
        message: `This analysis will use ${ANALYSIS_COST_CREDITS} credits. You have ${currentCredits} credits.`,
      }, { status: 402 })
    }

    // Check credits if not free
    if (!isFreeAnalysis) {
      const hasCredits = await hasEnoughCredits(supabase, user.id, ANALYSIS_COST_CREDITS)
      if (!hasCredits.success) {
        return NextResponse.json({
          error: `Not enough credits. Need ${ANALYSIS_COST_CREDITS}, have ${currentCredits}.`,
          code: 'INSUFFICIENT_CREDITS',
          required: ANALYSIS_COST_CREDITS,
          current: currentCredits,
        }, { status: 402 })
      }
    }

    // Fetch top tweets for the account using X API
    const tweets = await fetchTopTweets(cleanUsername)
    
    if (!tweets || tweets.length < 3) {
      return NextResponse.json({
        error: `Could not fetch enough tweets for @${cleanUsername}. Need at least 3 tweets, found ${tweets?.length || 0}.`,
        code: 'INSUFFICIENT_TWEETS',
      }, { status: 400 })
    }

    // Run Opus analysis
    let profileData: Record<string, unknown>
    let analysisSucceeded = false
    let lastError = ''

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        profileData = await analyzeStylePatterns(tweets, cleanUsername)
        
        // Verify we got a real analysis
        if (profileData.summary && 
            typeof profileData.summary === 'string' && 
            profileData.summary.length > 20) {
          analysisSucceeded = true
          break
        } else {
          lastError = 'Analysis returned incomplete data'
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Analysis failed'
        console.error(`Style analysis attempt ${attempt} failed:`, lastError)
      }
      
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    if (!analysisSucceeded) {
      return NextResponse.json({
        error: `Failed to analyze @${cleanUsername} after 3 attempts: ${lastError}`,
        code: 'ANALYSIS_FAILED',
      }, { status: 500 })
    }

    // NOW deduct credits (only after successful analysis)
    let creditsUsed = 0
    let creditsRemaining = currentCredits
    
    if (!isFreeAnalysis) {
      const deductResult = await deductCredits(supabase, user.id, ANALYSIS_COST_CREDITS, 'style_template_analysis')
      if (!deductResult.success) {
        return NextResponse.json({
          error: 'Failed to deduct credits',
          code: 'CREDIT_DEDUCTION_FAILED',
        }, { status: 500 })
      }
      creditsUsed = ANALYSIS_COST_CREDITS
      creditsRemaining = deductResult.creditsRemaining || 0
    }

    // If templateId provided, update the template with analysis
    if (templateId) {
      const { error: updateError } = await supabase
        .from('style_templates')
        .update({
          profile_data: profileData!,
          analyzed_at: new Date().toISOString(),
          tweets_analyzed: tweets.length,
          admired_account_username: cleanUsername,
        })
        .eq('id', templateId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Failed to update template with analysis:', updateError)
      }
    }

    return NextResponse.json({
      success: true,
      profileData: profileData!,
      tweetsAnalyzed: tweets.length,
      creditsUsed,
      creditsRemaining,
      wasFree: isFreeAnalysis,
      freeRemaining: Math.max(0, FREE_ANALYSES_LIMIT - totalAnalysesDone - 1),
    })
  } catch (error) {
    console.error('Style template analysis error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Analysis failed',
    }, { status: 500 })
  }
}

// Fetch top tweets using X API Bearer token
async function fetchTopTweets(username: string): Promise<Array<{ text: string; likes: number }>> {
  const bearerToken = process.env.X_BEARER_TOKEN
  
  if (!bearerToken) {
    throw new Error('X API not configured')
  }

  // First, get user ID from username
  const userResponse = await fetch(
    `https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics`,
    {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
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

  // Fetch recent tweets (max 100)
  const tweetsResponse = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=100&tweet.fields=public_metrics,created_at&exclude=retweets,replies`,
    {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
    }
  )

  if (!tweetsResponse.ok) {
    const error = await tweetsResponse.json()
    throw new Error(`Failed to fetch tweets: ${error.detail || error.title || 'Unknown error'}`)
  }

  const tweetsData = await tweetsResponse.json()
  const tweets = tweetsData.data || []

  // Sort by engagement and take top 30
  const sortedTweets = tweets
    .map((t: { text: string; public_metrics?: { like_count?: number } }) => ({
      text: t.text,
      likes: t.public_metrics?.like_count || 0,
    }))
    .sort((a: { likes: number }, b: { likes: number }) => b.likes - a.likes)
    .slice(0, 30)

  return sortedTweets
}

// Analyze tweet patterns using Opus
async function analyzeStylePatterns(
  tweets: Array<{ text: string; likes: number }>,
  username: string
): Promise<Record<string, unknown>> {
  const tweetTexts = tweets
    .map((t, i) => `${i + 1}. "${t.text}" (${t.likes.toLocaleString()} likes)`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 2048,
    system: `You are an elite social media engagement analyst. Your job is to extract WRITING STYLE and ENGAGEMENT TACTICS from tweets.

CRITICAL: Focus on HOW they write to drive engagement, NOT what topics they cover. The user wants to apply this creator's engagement tactics to ANY topic.

Analyze their:
- Hook techniques (how they open tweets to stop the scroll)
- Tone and voice (confidence level, humor, directness)
- Sentence structure and rhythm
- How they create curiosity and drive engagement
- Their call-to-action patterns
- What makes their content shareable

Return ONLY valid JSON, no markdown, no explanation.`,
    messages: [{
      role: 'user',
      content: `Analyze these top-performing tweets from @${username} and extract their WRITING STYLE and ENGAGEMENT TACTICS:

${tweetTexts}

Return a JSON object with this EXACT structure:
{
  "summary": "2-3 sentence description of their unique writing style and engagement approach. DO NOT mention their topics/niche - focus ONLY on HOW they write.",
  "personality": "Brief description of their online persona and energy (e.g., 'Confident contrarian who challenges conventional wisdom')",
  "patterns": {
    "avgLength": <number - average character count>,
    "emojiUsage": "never" | "rare" | "occasional" | "frequent",
    "favoriteEmojis": ["list", "of", "common", "emojis"] or [],
    "hookStyles": ["list of 3-5 specific hook techniques they use, with examples"],
    "toneMarkers": ["list of 4-6 tone descriptors like 'confident', 'provocative', 'conversational'"],
    "sentenceStyle": "description of their sentence patterns (short punchy vs flowing, fragments vs complete, etc.)",
    "questionUsage": "how they use questions to drive engagement",
    "hashtagUsage": "never" | "rare" | "occasional" | "frequent",
    "ctaStyle": "how they end tweets and drive action (save, share, reply prompts, etc.)",
    "engagementTactics": ["list of 5-7 specific techniques that make their tweets go viral"]
  },
  "signatureMoves": ["3-5 unique things this creator does that others don't"],
  "topTweets": [
    {"text": "their best tweet", "likes": <number>, "whyItWorks": "brief explanation"},
    {"text": "second best", "likes": <number>, "whyItWorks": "brief explanation"},
    {"text": "third best", "likes": <number>, "whyItWorks": "brief explanation"}
  ]
}

IMPORTANT: Return ONLY the raw JSON object. No markdown code blocks. No explanation. Just the JSON.`
    }],
  })

  const textContent = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('')
    .trim()

  // Extract JSON from response
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
    
    if (!parsed.summary || !parsed.patterns) {
      throw new Error('Missing required fields in analysis')
    }
    
    return parsed
  } catch (parseError) {
    console.error('Failed to parse AI response:', textContent.substring(0, 500))
    throw new Error(`JSON parsing failed: ${parseError instanceof Error ? parseError.message : 'unknown error'}`)
  }
}

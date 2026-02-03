import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { deductCredits, hasEnoughCredits, getCredits } from '@/lib/credits'

const anthropic = new Anthropic()
const MAX_STYLE_PROFILES = 3
const PROFILE_COST_CREDITS = 5  // Covers ~$0.50 X API + ~$0.15 Opus
const FREE_PROFILES_LIMIT = 3   // First 3 are free for every user

// GET - Fetch style profiles (max 3 per X account)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get x_account_id from query params
  const { searchParams } = new URL(request.url)
  const xAccountId = searchParams.get('x_account_id')

  let query = supabase
    .from('style_profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Filter by x_account_id if provided
  if (xAccountId) {
    query = query.eq('x_account_id', xAccountId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    profiles: data,
    count: data?.length || 0,
    max: MAX_STYLE_PROFILES,
  })
}

// POST - Create a style profile (costs 5 credits after first 3 free)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { username, tweets, x_account_id, confirmCredit } = body

    if (!x_account_id) {
      return NextResponse.json({ error: 'x_account_id is required' }, { status: 400 })
    }

    // Check current count for this X account
    const { count, error: countError } = await supabase
      .from('style_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('x_account_id', x_account_id)

    if (countError) throw countError

    if ((count || 0) >= MAX_STYLE_PROFILES) {
      return NextResponse.json(
        { 
          error: `Maximum ${MAX_STYLE_PROFILES} style profiles allowed. Remove one first.`,
          code: 'STYLE_PROFILES_FULL',
          count,
          max: MAX_STYLE_PROFILES,
        },
        { status: 400 }
      )
    }

    // Count total profiles ever created to determine if free
    let totalCreated = 0
    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('style_profiles_created')
        .eq('id', user.id)
        .single()
      totalCreated = userProfile?.style_profiles_created || 0
    } catch {
      totalCreated = count || 0
    }
    
    const isFreeProfile = totalCreated < FREE_PROFILES_LIMIT
    const currentCredits = await getCredits(supabase, user.id)

    // If not free and no confirmation, return a warning requiring confirmation
    if (!isFreeProfile && !confirmCredit) {
      return NextResponse.json({
        requiresConfirmation: true,
        creditCost: PROFILE_COST_CREDITS,
        currentCredits,
        message: `This will use ${PROFILE_COST_CREDITS} credits. You have ${currentCredits} credits.`,
        freeUsed: totalCreated,
        freeLimit: FREE_PROFILES_LIMIT,
      }, { status: 402 })
    }

    // Check credits if not free
    if (!isFreeProfile) {
      const hasCredits = await hasEnoughCredits(supabase, user.id, PROFILE_COST_CREDITS)
      if (!hasCredits) {
        return NextResponse.json(
          { 
            error: `Not enough credits. Need ${PROFILE_COST_CREDITS}, have ${currentCredits}.`,
            code: 'INSUFFICIENT_CREDITS',
            required: PROFILE_COST_CREDITS,
            current: currentCredits,
          },
          { status: 402 }
        )
      }
    }

    if (!username || username.trim().length === 0) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Check if profile already exists for this X account + target username combo
    const { data: existing } = await supabase
      .from('style_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('account_username', username.trim().toLowerCase().replace('@', ''))
      .eq('x_account_id', x_account_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Style profile already exists for this account', code: 'PROFILE_EXISTS' },
        { status: 400 }
      )
    }

    // Validate tweets
    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      return NextResponse.json(
        { error: 'Tweets array is required for analysis' },
        { status: 400 }
      )
    }

    // Validate tweet structure
    const validTweets = tweets.filter(t => t && typeof t.text === 'string' && t.text.trim().length > 0)
    if (validTweets.length < 3) {
      return NextResponse.json(
        { error: `Need at least 3 valid tweets with text content. Got ${validTweets.length}.` },
        { status: 400 }
      )
    }

    // Sort by engagement and take top 10
    const sortedTweets = validTweets
      .sort((a: { likes?: number }, b: { likes?: number }) => (b.likes || 0) - (a.likes || 0))
      .slice(0, 10)

    // Analyze patterns with AI (with retry logic)
    let profileData: Record<string, unknown>
    let analysisSucceeded = false
    let lastError = ''
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        profileData = await analyzeStylePatterns(sortedTweets, username)
        
        // Verify we got a real analysis, not fallback
        if (profileData.summary && 
            typeof profileData.summary === 'string' && 
            !profileData.summary.startsWith('Style patterns from @')) {
          analysisSucceeded = true
          break
        } else {
          lastError = 'Analysis returned generic fallback'
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Analysis failed'
        console.error(`Style analysis attempt ${attempt} failed:`, lastError)
      }
      
      // Wait before retry
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    if (!analysisSucceeded) {
      return NextResponse.json(
        { 
          error: `Failed to analyze style after 3 attempts: ${lastError}`,
          code: 'ANALYSIS_FAILED',
        },
        { status: 500 }
      )
    }

    // NOW deduct credits (only after successful analysis)
    let creditsUsed = 0
    let creditsRemaining = currentCredits
    
    if (!isFreeProfile) {
      const deductResult = await deductCredits(supabase, user.id, PROFILE_COST_CREDITS, 'style_profile_creation')
      if (!deductResult.success) {
        return NextResponse.json(
          { error: 'Failed to deduct credits', code: 'CREDIT_DEDUCTION_FAILED' },
          { status: 500 }
        )
      }
      creditsUsed = PROFILE_COST_CREDITS
      creditsRemaining = deductResult.creditsRemaining || 0
    }

    // Save profile
    const { data, error } = await supabase
      .from('style_profiles')
      .insert({
        user_id: user.id,
        x_account_id: x_account_id,
        account_username: username.trim().toLowerCase().replace('@', ''),
        account_display_name: username.trim(),
        profile_data: profileData!,
        tweets_analyzed: sortedTweets.length,
      })
      .select()
      .single()

    if (error) throw error

    // Update total profiles created counter
    try {
      await supabase
        .from('profiles')
        .update({ style_profiles_created: totalCreated + 1 })
        .eq('id', user.id)
    } catch {
      // Column might not exist yet, ignore
    }

    return NextResponse.json({
      profile: data,
      count: (count || 0) + 1,
      max: MAX_STYLE_PROFILES,
      creditsUsed,
      creditsRemaining,
      wasFree: isFreeProfile,
      freeRemaining: Math.max(0, FREE_PROFILES_LIMIT - totalCreated - 1),
    })
  } catch (err) {
    console.error('Style profile creation error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create style profile' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a style profile
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('style_profiles')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get new count
  const { count } = await supabase
    .from('style_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return NextResponse.json({ 
    success: true,
    count: count || 0,
    max: MAX_STYLE_PROFILES,
  })
}

// Analyze tweet patterns using AI
async function analyzeStylePatterns(
  tweets: Array<{ text: string; likes?: number }>,
  username: string
): Promise<Record<string, unknown>> {
  // Build tweet text with validation
  const tweetTexts = tweets
    .filter(t => t.text && t.text.trim().length > 0)
    .map((t, i) => `${i + 1}. "${t.text}" (${t.likes?.toLocaleString() || '0'} likes)`)
    .join('\n')

  if (!tweetTexts) {
    throw new Error('No valid tweet content to analyze')
  }

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 1024,
    system: `You are a social media analyst. Analyze the writing patterns in these tweets and extract a style profile. Return ONLY valid JSON, no markdown, no explanation.`,
    messages: [{
      role: 'user',
      content: `Analyze these top tweets from @${username} and extract their writing style patterns:

${tweetTexts}

Return a JSON object with this exact structure:
{
  "summary": "Brief 1-sentence description of their unique style (be specific, not generic)",
  "patterns": {
    "avgLength": <number>,
    "lengthRange": [<min>, <max>],
    "emojiUsage": "never" | "rare" | "occasional" | "frequent",
    "emojiTypes": ["list", "of", "common", "emojis"] or [],
    "hookStyles": ["list", "of", "how they start tweets"],
    "toneMarkers": ["list", "of", "tone descriptors"],
    "sentenceStyle": "description of sentence patterns",
    "questionUsage": "never" | "rare" | "occasional" | "frequent",
    "hashtagUsage": "never" | "rare" | "occasional" | "frequent",
    "ctaStyle": "how they end tweets / call to action style"
  },
  "topTweets": [
    {"text": "best tweet", "likes": <number>},
    {"text": "second best", "likes": <number>},
    {"text": "third best", "likes": <number>}
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

  // Try to extract JSON if wrapped in markdown code block
  let jsonStr = textContent
  const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }
  
  // Also try to find JSON object directly
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    jsonStr = objectMatch[0]
  }

  try {
    const parsed = JSON.parse(jsonStr)
    
    // Validate required fields
    if (!parsed.summary || typeof parsed.summary !== 'string') {
      throw new Error('Missing or invalid summary field')
    }
    if (!parsed.patterns || typeof parsed.patterns !== 'object') {
      throw new Error('Missing or invalid patterns field')
    }
    
    return parsed
  } catch (parseError) {
    console.error('Failed to parse AI response:', textContent)
    throw new Error(`JSON parsing failed: ${parseError instanceof Error ? parseError.message : 'unknown error'}`)
  }
}

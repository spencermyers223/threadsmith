import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { deductCredits, hasEnoughCredits, getCredits } from '@/lib/credits'

const anthropic = new Anthropic()
const MAX_STYLE_PROFILES = 3
const PROFILE_COST_CREDITS = 5  // Covers ~$0.50 X API + ~$0.15 Opus
const FREE_PROFILES_LIMIT = 3   // First 3 are free for every user

// GET - Fetch style profiles (max 3)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('style_profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    profiles: data,
    count: data?.length || 0,
    max: MAX_STYLE_PROFILES,
  })
}

// POST - Create a style profile (costs 3 credits)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check current count
    const { count, error: countError } = await supabase
      .from('style_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

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
    // Try to get from profiles table, fallback to current count if column doesn't exist
    let totalCreated = 0
    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('style_profiles_created')
        .eq('id', user.id)
        .single()
      totalCreated = userProfile?.style_profiles_created || 0
    } catch {
      // Column might not exist yet, use current count as fallback
      totalCreated = count || 0
    }
    
    const isFreeProfile = totalCreated < FREE_PROFILES_LIMIT

    // Check credits only if not a free profile
    if (!isFreeProfile) {
      const hasCredits = await hasEnoughCredits(supabase, user.id, PROFILE_COST_CREDITS)
      if (!hasCredits) {
        const currentCredits = await getCredits(supabase, user.id)
        return NextResponse.json(
          { 
            error: `Not enough credits. Need ${PROFILE_COST_CREDITS}, have ${currentCredits}. (First ${FREE_PROFILES_LIMIT} profiles are free)`,
            code: 'INSUFFICIENT_CREDITS',
            required: PROFILE_COST_CREDITS,
            current: currentCredits,
            freeUsed: totalCreated,
            freeLimit: FREE_PROFILES_LIMIT,
          },
          { status: 402 }
        )
      }
    }

    const body = await request.json()
    const { username, tweets } = body

    if (!username || username.trim().length === 0) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Check if profile already exists for this account
    const { data: existing } = await supabase
      .from('style_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('account_username', username.trim().toLowerCase().replace('@', ''))
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Style profile already exists for this account', code: 'PROFILE_EXISTS' },
        { status: 400 }
      )
    }

    // Expect tweets to be passed from frontend (which fetches from X API)
    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      return NextResponse.json(
        { error: 'Tweets array is required for analysis' },
        { status: 400 }
      )
    }

    // Sort by engagement and take top 10
    const sortedTweets = tweets
      .sort((a: { likes?: number }, b: { likes?: number }) => (b.likes || 0) - (a.likes || 0))
      .slice(0, 10)

    // Analyze patterns with AI
    const profileData = await analyzeStylePatterns(sortedTweets, username)

    // Deduct credits only if not a free profile
    let creditsUsed = 0
    let creditsRemaining = 0
    
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
        account_username: username.trim().toLowerCase().replace('@', ''),
        account_display_name: username.trim(),
        profile_data: profileData,
        tweets_analyzed: sortedTweets.length,
      })
      .select()
      .single()

    if (error) throw error

    // Update total profiles created counter (safe - ignore if column doesn't exist)
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
  const tweetTexts = tweets.map((t, i) => `${i + 1}. "${t.text}" (${t.likes?.toLocaleString() || '?'} likes)`).join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 1024,
    system: `You are a social media analyst. Analyze the writing patterns in these tweets and extract a style profile. Return ONLY valid JSON, no other text.`,
    messages: [{
      role: 'user',
      content: `Analyze these top tweets from @${username} and extract their writing style patterns:

${tweetTexts}

Return a JSON object with this exact structure:
{
  "summary": "Brief 1-sentence description of their style",
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

Return ONLY the JSON object, nothing else.`
    }],
  })

  const textContent = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('')

  try {
    // Try to parse the JSON response
    const parsed = JSON.parse(textContent)
    return parsed
  } catch {
    // If parsing fails, return a basic structure
    console.error('Failed to parse AI response:', textContent)
    return {
      summary: `Style patterns from @${username}`,
      patterns: {
        avgLength: 150,
        lengthRange: [50, 280],
        emojiUsage: 'unknown',
        hookStyles: ['various'],
        toneMarkers: ['unknown'],
        sentenceStyle: 'varied',
        questionUsage: 'unknown',
        hashtagUsage: 'unknown',
        ctaStyle: 'unknown',
      },
      topTweets: tweets.slice(0, 3).map(t => ({ text: t.text, likes: t.likes || 0 })),
    }
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { xApiFetch } from '@/lib/x-tokens'

const anthropic = new Anthropic()

interface Tweet {
  id: string
  text: string
  created_at: string
}

/**
 * Auto-analyze voice profile from user's recent X tweets.
 * Fetches last 50 tweets and generates a voice profile.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get x_account_id from query params
  const xAccountId = request.nextUrl.searchParams.get('x_account_id')
  
  if (!xAccountId) {
    return NextResponse.json({ error: 'x_account_id is required' }, { status: 400 })
  }

  // Verify user owns this x_account and get the x_user_id
  const { data: xAccount } = await supabase
    .from('x_accounts')
    .select('id, x_user_id')
    .eq('id', xAccountId)
    .eq('user_id', user.id)
    .single()

  if (!xAccount) {
    return NextResponse.json({ error: 'X account not found' }, { status: 404 })
  }

  try {
    // Fetch user's recent tweets from X API
    const xUserId = xAccount.x_user_id
    
    if (!xUserId) {
      return NextResponse.json(
        { error: 'X user ID not found for this account' },
        { status: 400 }
      )
    }

    // Fetch last 50 tweets (excluding retweets and replies)
    const tweetsUrl = new URL(`https://api.x.com/2/users/${xUserId}/tweets`)
    tweetsUrl.searchParams.set('max_results', '50')
    tweetsUrl.searchParams.set('exclude', 'retweets,replies')
    tweetsUrl.searchParams.set('tweet.fields', 'created_at')

    const tweetsRes = await xApiFetch(user.id, tweetsUrl.toString())
    
    if (!tweetsRes.ok) {
      const error = await tweetsRes.json()
      if (error.needsReauth) {
        return NextResponse.json({ error: 'X session expired. Please sign in again.' }, { status: 401 })
      }
      throw new Error(`Failed to fetch tweets: ${JSON.stringify(error)}`)
    }

    const tweetsData = await tweetsRes.json()
    const tweets: Tweet[] = tweetsData.data || []

    if (tweets.length < 5) {
      return NextResponse.json(
        { error: 'Need at least 5 original tweets to analyze your voice. Keep posting and try again!' },
        { status: 400 }
      )
    }

    // Format tweets for analysis
    const tweetsText = tweets.map((t, i) => `${i + 1}. ${t.text}`).join('\n')

    // Analyze voice with Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are a writing style analyst. Analyze the provided tweets and extract a detailed voice profile. Return ONLY valid JSON with no other text.`,
      messages: [{
        role: 'user',
        content: `Analyze these ${tweets.length} tweets from a user's X account and return a JSON voice profile:

${tweetsText}

Return this exact JSON structure:
{
  "avgTweetLength": <number, average character count>,
  "sentenceStyle": "<short/medium/long> sentences",
  "emojiUsage": {
    "frequency": "<none|rare|moderate|heavy>",
    "favorites": ["<top emojis used, up to 5>"]
  },
  "punctuationStyle": {
    "exclamationMarks": "<none|rare|moderate|heavy>",
    "ellipses": "<none|rare|moderate|heavy>",
    "dashes": "<none|rare|moderate|heavy>",
    "questionMarks": "<none|rare|moderate|heavy>"
  },
  "vocabularyLevel": "<simple|moderate|advanced|technical>",
  "commonPhrases": ["<up to 5 recurring phrases or expressions>"],
  "toneMarkers": ["<up to 4 tone descriptors like: sarcastic, earnest, hype, analytical, confident, casual, authoritative>"],
  "formalityLevel": <1-10, where 1 is very casual and 10 is very formal>,
  "hotTakeTendency": <1-10, where 1 is safe/consensus and 10 is contrarian/spicy>,
  "threadPreference": "<single tweets|mix|mostly threads>",
  "hashtagUsage": "<none|rare|moderate|heavy>",
  "cashtagUsage": "<none|rare|moderate|heavy>",
  "openingStyle": "<how they typically start tweets>",
  "closingStyle": "<how they typically end tweets>",
  "signatureElements": ["<unique stylistic elements, up to 3>"],
  "summary": "<2-3 sentence natural language summary of their writing voice>"
}`
      }],
    })

    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    // Parse the JSON from Claude's response
    let voiceProfile
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in response')
      voiceProfile = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse voice analysis' },
        { status: 500 }
      )
    }

    // Store the voice profile
    const { error: updateError } = await supabase
      .from('content_profiles')
      .update({
        voice_profile: voiceProfile,
        voice_trained_at: new Date().toISOString(),
        voice_tweet_count: tweets.length,
        updated_at: new Date().toISOString(),
      })
      .eq('x_account_id', xAccountId)

    if (updateError) throw updateError

    return NextResponse.json({
      voiceProfile,
      tweetCount: tweets.length,
      analyzedAt: new Date().toISOString(),
      message: `Voice profile created from ${tweets.length} tweets!`,
    })
  } catch (err) {
    console.error('Auto voice analysis error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}

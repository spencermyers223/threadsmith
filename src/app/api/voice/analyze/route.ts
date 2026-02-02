import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { deductCredits, hasEnoughCredits, CREDIT_COSTS } from '@/lib/credits'

const anthropic = new Anthropic()

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get x_account_id from query params or body
  const xAccountId = request.nextUrl.searchParams.get('x_account_id')
  
  if (!xAccountId) {
    return NextResponse.json({ error: 'x_account_id is required' }, { status: 400 })
  }

  // Verify user owns this x_account
  const { data: xAccount } = await supabase
    .from('x_accounts')
    .select('id')
    .eq('id', xAccountId)
    .eq('user_id', user.id)
    .single()
  
  if (!xAccount) {
    return NextResponse.json({ error: 'X account not found' }, { status: 404 })
  }

  // Check credits (but don't deduct yet - wait for success)
  const creditCheck = await hasEnoughCredits(
    supabase,
    user.id,
    CREDIT_COSTS.VOICE_ADD
  )

  if (!creditCheck.success) {
    return NextResponse.json(
      { 
        error: 'Insufficient credits',
        creditsNeeded: CREDIT_COSTS.VOICE_ADD,
        creditsRemaining: creditCheck.credits,
      },
      { status: 402 }
    )
  }

  try {
    // Fetch all voice samples for this X account
    const { data: samples, error: samplesError } = await supabase
      .from('voice_samples')
      .select('tweet_text')
      .eq('x_account_id', xAccountId)
      .order('created_at', { ascending: false })

    if (samplesError) throw samplesError

    if (!samples || samples.length < 3) {
      return NextResponse.json(
        { error: 'Need at least 3 tweet samples to analyze your voice' },
        { status: 400 }
      )
    }

    const tweetsText = samples.map((s, i) => `${i + 1}. ${s.tweet_text}`).join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are a writing style analyst. Analyze the provided tweets and extract a detailed voice profile. Return ONLY valid JSON with no other text.`,
      messages: [{
        role: 'user',
        content: `Analyze these ${samples.length} tweets and return a JSON voice profile:

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
      // Try to extract JSON from the response (handle markdown code blocks)
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
        updated_at: new Date().toISOString(),
      })
      .eq('x_account_id', xAccountId)

    if (updateError) throw updateError

    // NOW deduct credits (after successful analysis + storage)
    await deductCredits(
      supabase,
      user.id,
      CREDIT_COSTS.VOICE_ADD,
      'voice_analysis',
      'Voice profile analysis'
    )

    return NextResponse.json({
      voiceProfile,
      sampleCount: samples.length,
      analyzedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Voice analysis error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}

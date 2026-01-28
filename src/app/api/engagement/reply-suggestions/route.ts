/**
 * AI Reply Suggestions API
 * 
 * POST /api/engagement/reply-suggestions
 * Generates multiple reply drafts for a given post
 * 
 * Body:
 * - post: { author: string, text: string, metrics?: object, url?: string }
 * - count?: number (1-5, default 3)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

interface PostData {
  author: string
  text: string
  metrics?: {
    replies?: string
    retweets?: string
    likes?: string
    views?: string
  }
  url?: string
  postAge?: string
}

interface ReplySuggestion {
  id: string
  text: string
  angle: string
  tone: 'witty' | 'insightful' | 'supportive' | 'contrarian' | 'playful'
  engagementTip: string
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonResponse({ error: 'API not configured' }, 500)
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    // Check premium status
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('tier, trial_ends_at')
      .eq('id', user.id)
      .single()

    const isPremium = profile?.tier === 'premium' || 
      (profile?.tier === 'trial' && profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date())

    if (!isPremium) {
      return jsonResponse({ 
        error: 'Reply suggestions require premium',
        upgrade: true 
      }, 403)
    }

    // Get user's voice profile
    const { data: contentProfile } = await supabaseAdmin
      .from('content_profiles')
      .select('tone, niche, content_style, vocabulary_preferences')
      .eq('user_id', user.id)
      .single()

    const body = await request.json()
    const post: PostData = body.post
    const count = Math.min(5, Math.max(1, body.count || 3))

    if (!post?.text) {
      return jsonResponse({ error: 'Post text is required' }, 400)
    }

    // Build voice context
    const voiceContext = contentProfile ? `
User's Voice Profile:
- Tone: ${contentProfile.tone || 'witty and engaging'}
- Niche: ${contentProfile.niche || 'tech'}
- Style: ${contentProfile.content_style || 'conversational'}
${contentProfile.vocabulary_preferences ? `- Key phrases: ${contentProfile.vocabulary_preferences}` : ''}
    `.trim() : 'Voice: casual tech twitter, witty but not try-hard'

    // Generate with Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const prompt = `Generate ${count} different reply options for this X/Twitter post.

${voiceContext}

Original Post:
Author: @${post.author}
"${post.text}"
${post.metrics ? `Engagement: ${post.metrics.likes || 0} likes, ${post.metrics.retweets || 0} RTs, ${post.metrics.replies || 0} replies` : ''}

REQUIREMENTS:
1. Each reply should be different in approach (angle)
2. Match the user's voice profile above
3. Keep replies under 280 characters
4. Make them engaging and likely to get replies/likes
5. Don't be sycophantic or generic
6. Add value to the conversation

For each reply, provide:
- The reply text
- The angle (e.g., "Add context", "Playful challenge", "Personal experience")
- The tone
- A brief tip on why this approach works

Respond in JSON format:
{
  "replies": [
    {
      "id": "1",
      "text": "Reply text here...",
      "angle": "Angle name",
      "tone": "witty|insightful|supportive|contrarian|playful",
      "engagementTip": "Why this reply works"
    }
  ]
}

Make sure the replies feel authentic, not AI-generated.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response format')
    }

    // Parse JSON
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse response')
    }

    const result = JSON.parse(jsonMatch[0])
    const suggestions: ReplySuggestion[] = (result.replies || []).map((r: Partial<ReplySuggestion>, i: number) => ({
      id: r.id || String(i + 1),
      text: r.text || '',
      angle: r.angle || 'General',
      tone: r.tone || 'witty',
      engagementTip: r.engagementTip || '',
    }))

    // Track usage
    await supabaseAdmin
      .from('generation_usage')
      .insert({
        user_id: user.id,
        type: 'reply_suggestions',
        tokens_used: response.usage.input_tokens + response.usage.output_tokens,
        created_at: new Date().toISOString(),
      })

    return jsonResponse({
      suggestions,
      postContext: {
        author: post.author,
        truncatedText: post.text.slice(0, 100) + (post.text.length > 100 ? '...' : ''),
      },
      usage: {
        tokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    })

  } catch (error) {
    console.error('Reply suggestions error:', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Failed to generate suggestions' },
      500
    )
  }
}

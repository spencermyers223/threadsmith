import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { scoreEngagement } from '@/lib/engagement-scorer'

export async function POST(request: NextRequest) {
  try {
    const { text, postType } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    // Get client-side score first
    const clientScore = scoreEngagement(text)

    // Deep analysis with Claude
    const anthropic = new Anthropic()
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a Tech Twitter engagement expert. Analyze this ${postType || 'tweet'} draft and provide specific, actionable improvement suggestions.

Draft:
"""
${text}
"""

Current scores (from automated analysis):
- Hook Strength: ${clientScore.breakdown.hookStrength.score}/100
- Reply Potential: ${clientScore.breakdown.replyPotential.score}/100
- Length: ${clientScore.breakdown.length.score}/100
- Readability: ${clientScore.breakdown.readability.score}/100

X Algorithm facts:
- Replies weighted 75x, retweets 1x, likes minimal
- Questions get 3-5x more replies
- First line = hook that determines scroll-stop
- 180-280 chars optimal for single tweets
- Relevant hashtags can boost discovery (use sparingly, max 1-2)

Respond in this exact JSON format (no markdown, just JSON):
{
  "overallFeedback": "1-2 sentence summary",
  "hookRewrite": "Suggested rewrite of the first line (or null if already strong)",
  "suggestedCTA": "A closing call-to-action to boost replies (or null)",
  "suggestedHashtags": ["#tag1", "#tag2"],
  "toneAnalysis": "Brief note on tone/voice",
  "viralPotential": "low|medium|high",
  "specificTips": ["tip1", "tip2", "tip3"]
}`,
        },
      ],
    })

    let aiAnalysis = null
    try {
      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
      aiAnalysis = JSON.parse(responseText)
    } catch {
      // If parsing fails, still return client score
    }

    return NextResponse.json({
      ...clientScore,
      aiAnalysis,
    })
  } catch (error) {
    console.error('Engagement score error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze engagement' },
      { status: 500 }
    )
  }
}

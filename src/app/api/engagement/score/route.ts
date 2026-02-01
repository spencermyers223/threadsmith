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
          content: `You are an X/Twitter engagement expert. Analyze this ${postType || 'tweet'} draft.

Draft:
"""
${text}
"""

Current scores (from automated analysis):
- Hook Strength: ${clientScore.breakdown.hookStrength.score}/100 (35% weight)
- Reply Potential: ${clientScore.breakdown.replyPotential.score}/100 (45% weight)
- Readability: ${clientScore.breakdown.readability.score}/100 (20% weight)
- Overall: ${clientScore.score}/100

X Algorithm facts:
- Replies are weighted 75x more than likes
- Questions get 3-5x more replies
- First line = hook that determines scroll-stop
- External links reduce reach by ~50%
- Hashtags can hurt organic reach

Focus on the 3 factors that matter: Hook, Reply Potential, Readability.

Respond in this exact JSON format (no markdown, just JSON):
{
  "overallFeedback": "1-2 sentence summary of strengths and main improvement opportunity",
  "hookRewrite": "Suggested rewrite of the first line to stop the scroll (or null if already strong)",
  "suggestedCTA": "A closing call-to-action to boost replies (or null if not needed)",
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

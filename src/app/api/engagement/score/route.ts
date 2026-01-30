import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { scoreEngagement } from '@/lib/engagement-scorer'
import { getDefaultBaseline, extractTweetPatterns, type BaselineStats } from '@/lib/baseline-accounts'
import { createClient } from '@supabase/supabase-js'

const BASELINE_CACHE_KEY = 'engagement_baseline_v1';

interface CachedBaseline {
  stats: BaselineStats;
  topTweetExamples: Array<{
    text: string;
    username: string;
    reply_count: number;
  }>;
  cachedAt: string;
}

async function getBaselineData(): Promise<{ stats: BaselineStats; examples: string[] }> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data } = await supabase
      .from('system_cache')
      .select('value')
      .eq('key', BASELINE_CACHE_KEY)
      .single();

    if (data?.value) {
      const baseline = data.value as CachedBaseline;
      return {
        stats: baseline.stats,
        examples: baseline.topTweetExamples.slice(0, 5).map(t => t.text),
      };
    }
  } catch {
    // Ignore errors - use defaults
  }

  return {
    stats: getDefaultBaseline(),
    examples: [],
  };
}

export async function POST(request: NextRequest) {
  try {
    const { text, postType, useBaseline = true } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    // Get client-side score first
    const clientScore = scoreEngagement(text)
    
    // Extract patterns from this draft
    const draftPatterns = extractTweetPatterns(text)

    // Get baseline data for comparison
    const baseline = useBaseline ? await getBaselineData() : { stats: getDefaultBaseline(), examples: [] };
    
    // Build baseline context for AI
    let baselineContext = '';
    if (baseline.examples.length > 0) {
      baselineContext = `
Reference: Here are proven high-engagement tweets to compare against:
${baseline.examples.map((ex, i) => `${i + 1}. "${ex}"`).join('\n')}

Baseline stats from top performers:
- Avg length: ${baseline.stats.avgLength} chars
- ${Math.round(baseline.stats.ctaUsageRate * 100)}% end with a call-to-action
- ${Math.round(baseline.stats.questionEndingRate * 100)}% end with a question
- Hook types: ${Math.round(baseline.stats.hookDistribution['bold-claim'] * 100)}% bold claims, ${Math.round(baseline.stats.hookDistribution['question'] * 100)}% questions, ${Math.round(baseline.stats.hookDistribution['number'] * 100)}% numbers
`;
    }

    // Deep analysis with Claude
    const anthropic = new Anthropic()
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a Tech Twitter engagement expert trained on the patterns of viral tweets. Analyze this ${postType || 'tweet'} draft and provide specific, actionable improvement suggestions.

Draft:
"""
${text}
"""

Draft analysis:
- Hook type: ${draftPatterns.hookType}
- Has question: ${draftPatterns.hasQuestion}
- Has CTA: ${draftPatterns.hasCTA}
- Length: ${draftPatterns.length} chars
- Line breaks: ${draftPatterns.lineBreaks}
- Has external link: ${draftPatterns.hasLink}

Current scores (from automated analysis):
- Hook Strength: ${clientScore.breakdown.hookStrength.score}/100
- Reply Potential: ${clientScore.breakdown.replyPotential.score}/100
- Length: ${clientScore.breakdown.length.score}/100
- Readability: ${clientScore.breakdown.readability.score}/100
${baselineContext}
X Algorithm facts:
- Replies weighted 75x, retweets 1x, likes minimal
- Questions get 3-5x more replies
- First line = hook that determines scroll-stop
- 180-280 chars optimal for single tweets
- External links get 50% less reach (move to reply)

Respond in this exact JSON format (no markdown, just JSON):
{
  "overallFeedback": "1-2 sentence summary comparing to high performers",
  "hookRewrite": "Suggested rewrite of the first line (or null if already strong)",
  "suggestedCTA": "A closing call-to-action to boost replies (or null)",
  "suggestedHashtags": ["#tag1", "#tag2"],
  "toneAnalysis": "Brief note on tone/voice",
  "viralPotential": "low|medium|high",
  "specificTips": ["tip1", "tip2", "tip3"],
  "baselineComparison": "How this draft compares to top-performing tweets"
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
      draftPatterns,
      baselineUsed: baseline.examples.length > 0,
    })
  } catch (error) {
    console.error('Engagement score error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze engagement' },
      { status: 500 }
    )
  }
}

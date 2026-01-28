import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

interface ScoreRequest {
  text: string;
  postType?: 'tweet' | 'reply' | 'quote' | 'thread';
  replyToContext?: string; // Original tweet if this is a reply
}

interface Factor {
  name: string;
  score: number; // 1-10
  feedback: string;
}

interface ScoreResponse {
  score: number; // 1-100
  scoreColor: 'green' | 'yellow' | 'red';
  factors: Factor[];
  suggestions: string[];
  predictedEngagement: {
    primary: 'replies' | 'retweets' | 'likes' | 'mixed';
    explanation: string;
  };
  strengthsAndWeaknesses: {
    strengths: string[];
    weaknesses: string[];
  };
}

export async function POST(request: NextRequest) {
  // Check required env vars early
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set');
    return NextResponse.json(
      { error: 'API not configured. Please contact support.' },
      { status: 500 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    // Verify auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check premium status
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, plan_type')
      .eq('user_id', user.id)
      .single();

    const isPremium = subscription?.status === 'active' || 
                      subscription?.status === 'trialing' ||
                      subscription?.plan_type === 'lifetime';

    if (!isPremium) {
      return NextResponse.json(
        { error: 'Premium subscription required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: ScoreRequest = await request.json();
    const { text, postType = 'tweet', replyToContext } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tweet text is required' },
        { status: 400 }
      );
    }

    // Handle very short drafts gracefully
    if (text.trim().length < 5) {
      return NextResponse.json({
        result: {
          score: 10,
          scoreColor: 'red',
          factors: [
            { name: 'Hook Strength', score: 1, feedback: 'Too short to evaluate' },
            { name: 'Reply Potential', score: 1, feedback: 'Need more content' },
            { name: 'Length Optimization', score: 1, feedback: 'Way too short' },
            { name: 'Readability', score: 1, feedback: 'Not enough to assess' },
            { name: 'Engagement Triggers', score: 1, feedback: 'No triggers detected' }
          ],
          suggestions: [
            'Write at least a full sentence to get meaningful feedback',
            'Aim for 180-280 characters for optimal engagement'
          ],
          predictedEngagement: {
            primary: 'mixed',
            explanation: 'Too short to predict engagement patterns'
          },
          strengthsAndWeaknesses: {
            strengths: [],
            weaknesses: ['Draft is too short to evaluate']
          }
        }
      });
    }

    // Get user's content profile for context
    const { data: contentProfile } = await supabase
      .from('content_profiles')
      .select('tone, niche')
      .eq('user_id', user.id)
      .single();

    const niche = contentProfile?.niche || 'general';

    // Build the scoring prompt
    const prompt = `You are an X/Twitter algorithm expert. Analyze this draft tweet and score it based on what the algorithm rewards.

DRAFT TO ANALYZE:
"${text}"

${postType === 'reply' && replyToContext ? `
THIS IS A REPLY TO:
"${replyToContext}"
` : ''}

POST TYPE: ${postType}
USER'S NICHE: ${niche}

X ALGORITHM SCORING CRITERIA (based on research):

1. **Hook Strength** (Critical - first line is everything)
   - Does the first line stop the scroll?
   - Is it curiosity-inducing, bold, or pattern-interrupting?
   - Avoid weak openers like "I think..." or "Just wanted to share..."

2. **Reply Potential** (Replies are weighted 75x!)
   - Does it invite conversation?
   - Questions, controversial takes, relatable statements
   - Open loops that beg responses

3. **Length Optimization**
   - Sweet spot: 180-280 characters for single tweets
   - Too short (<100): lacks substance
   - Too long (>280): requires "Show more" click (kills engagement)
   - Exceptions: threads, storytelling

4. **Readability**
   - Easy to scan?
   - Good whitespace/line breaks?
   - No walls of text
   - Accessible language (5th grade reading level ideal)

5. **Engagement Triggers**
   - Questions (explicit or implicit)?
   - CTAs (calls to action)?
   - Controversial/hot takes?
   - Emotional resonance (humor, outrage, inspiration)?
   - Emojis: 1-2 moderate use helps, more than 3 looks spammy
   - Hashtags: 1-2 max (more looks desperate)

SCORING SCALE:
- 1-3: Weak/harmful to engagement
- 4-6: Average/room for improvement  
- 7-8: Good/solid choice
- 9-10: Excellent/optimal

Respond in this exact JSON format:
{
  "factors": [
    {
      "name": "Hook Strength",
      "score": 7,
      "feedback": "Specific feedback about the hook"
    },
    {
      "name": "Reply Potential", 
      "score": 8,
      "feedback": "Specific feedback about reply invitation"
    },
    {
      "name": "Length Optimization",
      "score": 6,
      "feedback": "Specific feedback about length"
    },
    {
      "name": "Readability",
      "score": 7,
      "feedback": "Specific feedback about scannability"
    },
    {
      "name": "Engagement Triggers",
      "score": 5,
      "feedback": "Specific feedback about triggers"
    }
  ],
  "suggestions": [
    "Specific, actionable improvement 1",
    "Specific, actionable improvement 2",
    "Specific, actionable improvement 3"
  ],
  "predictedEngagement": {
    "primary": "replies",
    "explanation": "Why this will likely get this type of engagement"
  },
  "strengthsAndWeaknesses": {
    "strengths": ["What's working well"],
    "weaknesses": ["What needs work"]
  }
}

IMPORTANT:
- Be specific to THIS draft, not generic advice
- Factor scores should be 1-10
- Provide exactly 2-3 actionable suggestions
- Keep feedback concise but specific
- predictedEngagement.primary must be one of: "replies", "retweets", "likes", "mixed"`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    // Parse Claude's response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse response JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Calculate overall score (weighted average)
    // Hook Strength and Reply Potential are weighted higher
    const weights: Record<string, number> = {
      'Hook Strength': 2.5,
      'Reply Potential': 2.5,
      'Length Optimization': 1.5,
      'Readability': 1.5,
      'Engagement Triggers': 2.0
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const factor of parsed.factors) {
      const weight = weights[factor.name] || 1;
      weightedSum += factor.score * weight;
      totalWeight += weight;
    }

    // Convert weighted average (1-10) to overall score (1-100)
    const overallScore = Math.round((weightedSum / totalWeight) * 10);

    // Determine color
    let scoreColor: 'green' | 'yellow' | 'red';
    if (overallScore >= 70) {
      scoreColor = 'green';
    } else if (overallScore >= 40) {
      scoreColor = 'yellow';
    } else {
      scoreColor = 'red';
    }

    const result: ScoreResponse = {
      score: overallScore,
      scoreColor,
      factors: parsed.factors.map((f: Factor) => ({
        name: f.name,
        score: Math.min(10, Math.max(1, f.score)),
        feedback: f.feedback
      })),
      suggestions: (parsed.suggestions || []).slice(0, 3),
      predictedEngagement: {
        primary: parsed.predictedEngagement?.primary || 'mixed',
        explanation: parsed.predictedEngagement?.explanation || ''
      },
      strengthsAndWeaknesses: {
        strengths: parsed.strengthsAndWeaknesses?.strengths || [],
        weaknesses: parsed.strengthsAndWeaknesses?.weaknesses || []
      }
    };

    // Track usage
    await supabase
      .from('generation_usage')
      .insert({
        user_id: user.id,
        type: 'extension_score_draft',
        tokens_used: response.usage.input_tokens + response.usage.output_tokens,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      result,
      usage: {
        tokens: response.usage.input_tokens + response.usage.output_tokens
      }
    });

  } catch (error) {
    console.error('Score draft API error:', error);
    return NextResponse.json(
      { error: 'Failed to score draft' },
      { status: 500 }
    );
  }
}

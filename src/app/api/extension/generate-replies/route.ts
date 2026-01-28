import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface PostData {
  author: string;
  text: string;
  metrics?: {
    replies?: string;
    retweets?: string;
    likes?: string;
  };
  url?: string;
}

export async function POST(request: NextRequest) {
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
      .select('status, plan_id')
      .eq('user_id', user.id)
      .single();

    const isPremium = subscription?.status === 'active' || 
                      subscription?.status === 'trialing' ||
                      subscription?.plan_id === 'lifetime';

    if (!isPremium) {
      return NextResponse.json(
        { error: 'Premium subscription required' },
        { status: 403 }
      );
    }

    // Get user's content profile for voice matching
    const { data: contentProfile } = await supabase
      .from('content_profiles')
      .select('tone, niche, content_style, vocabulary_preferences')
      .eq('user_id', user.id)
      .single();

    // Parse request body
    const body = await request.json();
    const post: PostData = body.post;

    if (!post?.text) {
      return NextResponse.json(
        { error: 'Post text is required' },
        { status: 400 }
      );
    }

    // Build voice context
    const voiceContext = contentProfile ? `
Voice Profile:
- Tone: ${contentProfile.tone || 'witty and engaging'}
- Niche: ${contentProfile.niche || 'crypto/web3'}
- Style: ${contentProfile.content_style || 'conversational'}
${contentProfile.vocabulary_preferences ? `- Vocabulary: ${contentProfile.vocabulary_preferences}` : ''}
` : `
Voice Profile:
- Tone: witty and engaging
- Niche: crypto/web3
- Style: conversational
`;

    // Generate replies using Claude
    const prompt = `You are an expert at crafting engaging replies on X (Twitter) that build relationships and grow followers. 

${voiceContext}

Original Post:
Author: ${post.author}
Content: "${post.text}"
${post.metrics ? `Engagement: ${post.metrics.replies || '0'} replies, ${post.metrics.retweets || '0'} retweets, ${post.metrics.likes || '0'} likes` : ''}

Generate 3 different reply options. Each reply should:
1. Add genuine value or insight
2. Be concise (under 280 characters)
3. Encourage further conversation
4. Match the voice profile above
5. NOT be sycophantic or generic

For each reply, specify the tone (witty, insightful, contrarian, supportive, or playful).

Respond in JSON format:
{
  "replies": [
    { "text": "reply text here", "tone": "witty" },
    { "text": "reply text here", "tone": "insightful" },
    { "text": "reply text here", "tone": "playful" }
  ]
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
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

    const result = JSON.parse(jsonMatch[0]);

    // Track usage
    await supabase
      .from('generation_usage')
      .insert({
        user_id: user.id,
        type: 'extension_reply',
        tokens_used: response.usage.input_tokens + response.usage.output_tokens,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      replies: result.replies,
      usage: {
        tokens: response.usage.input_tokens + response.usage.output_tokens
      }
    });

  } catch (error) {
    console.error('Generate replies API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate replies' },
      { status: 500 }
    );
  }
}

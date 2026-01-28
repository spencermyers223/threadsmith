import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

interface TweetData {
  text: string;
  metrics?: {
    replies?: string;
    retweets?: string;
    likes?: string;
    views?: string;
  };
}

interface AccountAnalysis {
  summary: string;
  topics: Array<{
    name: string;
    frequency: 'primary' | 'secondary' | 'occasional';
  }>;
  style: {
    voice: string;
    characteristics: string[];
    engagement: string; // How they engage with others
  };
  engagementTips: Array<{
    approach: string;
    example: string;
    why: string;
  }>;
  viralContent?: {
    pattern: string;
    examples: string[];
  };
  quickStats: {
    contentMix: string; // e.g., "80% original, 20% replies"
    postingFrequency: string;
    audienceType: string;
  };
}

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
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

    // Parse request body
    const body = await request.json();
    const { handle, tweets, profileStats } = body;

    if (!handle) {
      return NextResponse.json(
        { error: 'Account handle is required' },
        { status: 400 }
      );
    }

    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      return NextResponse.json(
        { error: 'At least one tweet is required for analysis' },
        { status: 400 }
      );
    }

    // Format tweets for analysis
    const tweetsContext = tweets.slice(0, 20).map((tweet: TweetData, i: number) => {
      let metrics = '';
      if (tweet.metrics) {
        const parts = [];
        if (tweet.metrics.likes) parts.push(`${tweet.metrics.likes} likes`);
        if (tweet.metrics.retweets) parts.push(`${tweet.metrics.retweets} RTs`);
        if (tweet.metrics.replies) parts.push(`${tweet.metrics.replies} replies`);
        if (parts.length > 0) metrics = ` [${parts.join(', ')}]`;
      }
      return `${i + 1}. "${tweet.text}"${metrics}`;
    }).join('\n');

    // Profile stats context
    const statsContext = profileStats ? `
Account Stats:
- Followers: ${profileStats.followers || 'Unknown'}
- Following: ${profileStats.following || 'Unknown'}
- Account Age: ${profileStats.accountAge || 'Unknown'}
` : '';

    // Generate analysis using Claude
    const prompt = `You are an expert social media analyst specializing in X/Twitter. Your job is to analyze an account's content patterns to help someone understand how to best engage with them.

Account: @${handle}
${statsContext}

Recent Posts (most recent first):
${tweetsContext}

Analyze this account and provide insights in the following JSON format:

{
  "summary": "2-3 sentence summary of who this person is and what they're about",
  "topics": [
    {
      "name": "Topic name",
      "frequency": "primary|secondary|occasional"
    }
  ],
  "style": {
    "voice": "One word or short phrase describing their voice (e.g., 'Analytical and data-driven', 'Provocative contrarian', 'Friendly educator')",
    "characteristics": ["List of 3-4 specific characteristics of their content style"],
    "engagement": "How they typically engage with others (e.g., 'Rarely replies', 'Active debater', 'Responds to most comments')"
  },
  "engagementTips": [
    {
      "approach": "Short title for the engagement approach",
      "example": "Brief example of what to say or do",
      "why": "Why this would work well with this person"
    }
  ],
  "viralContent": {
    "pattern": "What type of content performs best for them",
    "examples": ["Brief descriptions of their top-performing content patterns"]
  },
  "quickStats": {
    "contentMix": "Breakdown like '70% original takes, 20% replies, 10% retweets'",
    "postingFrequency": "How often they post (e.g., 'Very active - multiple times daily')",
    "audienceType": "Who their content appeals to"
  }
}

GUIDELINES:
- topics: Provide 3-5 topics, ordered by importance. Mark as "primary" (posts about constantly), "secondary" (regular theme), or "occasional" (sometimes)
- voice: Be specific to THIS person, not generic. Capture their unique personality.
- characteristics: Be concrete and specific. "Uses lots of data" > "Informative"
- engagementTips: Provide exactly 3 tips. Make them actionable and specific to this person's style.
- viralContent: Look at the metrics to identify what performs best. If no clear pattern, note that.
- Be honest - if they're a shitposter, say so. If they're corporate, say so.
- Base everything on the actual content provided, not assumptions.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
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

    const result: AccountAnalysis = JSON.parse(jsonMatch[0]);

    // Validate and normalize the response
    const analysis: AccountAnalysis = {
      summary: result.summary || 'Unable to analyze this account.',
      topics: (result.topics || []).slice(0, 5).map(topic => ({
        name: topic.name || 'General',
        frequency: topic.frequency || 'occasional'
      })),
      style: {
        voice: result.style?.voice || 'Unknown',
        characteristics: (result.style?.characteristics || []).slice(0, 4),
        engagement: result.style?.engagement || 'Unknown engagement pattern'
      },
      engagementTips: (result.engagementTips || []).slice(0, 3).map(tip => ({
        approach: tip.approach || 'Engage thoughtfully',
        example: tip.example || '',
        why: tip.why || ''
      })),
      viralContent: result.viralContent ? {
        pattern: result.viralContent.pattern || '',
        examples: (result.viralContent.examples || []).slice(0, 3)
      } : undefined,
      quickStats: {
        contentMix: result.quickStats?.contentMix || 'Unknown',
        postingFrequency: result.quickStats?.postingFrequency || 'Unknown',
        audienceType: result.quickStats?.audienceType || 'General audience'
      }
    };

    // Track usage
    await supabase
      .from('generation_usage')
      .insert({
        user_id: user.id,
        type: 'extension_account_analysis',
        tokens_used: response.usage.input_tokens + response.usage.output_tokens,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      analysis,
      handle,
      analyzedAt: new Date().toISOString(),
      usage: {
        tokens: response.usage.input_tokens + response.usage.output_tokens
      }
    });

  } catch (error) {
    console.error('Analyze account API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze account' },
      { status: 500 }
    );
  }
}

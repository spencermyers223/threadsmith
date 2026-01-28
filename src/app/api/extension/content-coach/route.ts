import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

interface PostData {
  text: string;
  metrics?: {
    replies?: string;
    retweets?: string;
    likes?: string;
  };
  postedAt?: string;
}

interface VoiceProfile {
  tone?: string;
  style?: string;
  topics?: string[];
}

interface ContentCoachRequest {
  recentPosts?: PostData[];
  voiceProfile?: VoiceProfile;
}

interface ContentIdea {
  title: string;
  description: string;
  format: 'single' | 'thread' | 'question' | 'hot-take' | 'story';
  hook: string;
}

interface ContentCoachResponse {
  whatWorks: {
    topics: string[];
    formats: string[];
    hooks: string[];
  };
  ideas: ContentIdea[];
  bestTimes: {
    days: string[];
    times: string[];
    reasoning: string;
  };
  voiceReminder: {
    style: string;
    tips: string[];
  };
  contentGaps: string[];
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
    // Verify auth (optional for MVP - can work without account)
    const authHeader = request.headers.get('Authorization');
    let user = null;
    let isPremium = false;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && authUser) {
        user = authUser;
        
        // Check premium status
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status, plan_id')
          .eq('user_id', user.id)
          .single();

        isPremium = subscription?.status === 'active' || 
                    subscription?.status === 'trialing' ||
                    subscription?.plan_id === 'lifetime';
      }
    }

    // Content Coach requires premium
    if (!isPremium) {
      return NextResponse.json(
        { error: 'Content Coach is a premium feature. Upgrade at xthread.io' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: ContentCoachRequest = await request.json();
    const { recentPosts = [], voiceProfile } = body;

    // Get user's content profile for additional context
    let contentProfile = null;
    if (user) {
      const { data } = await supabase
        .from('content_profiles')
        .select('tone, niche, topics')
        .eq('user_id', user.id)
        .single();
      contentProfile = data;
    }

    // Build context from posts
    const postsContext = recentPosts.length > 0 
      ? recentPosts.map((post, i) => {
          const metricsStr = post.metrics 
            ? `[${post.metrics.likes || 0} likes, ${post.metrics.retweets || 0} RTs, ${post.metrics.replies || 0} replies]`
            : '';
          return `${i + 1}. "${post.text}" ${metricsStr}`;
        }).join('\n')
      : 'No recent posts available';

    // Build the coaching prompt
    const prompt = `You are a content coach for X/Twitter creators. Analyze the user's recent posts and provide personalized content suggestions.

${recentPosts.length > 0 ? `
USER'S RECENT POSTS (with engagement metrics):
${postsContext}
` : 'User has no recent posts tracked yet.'}

${voiceProfile ? `
USER'S VOICE PROFILE:
- Tone: ${voiceProfile.tone || 'Not specified'}
- Style: ${voiceProfile.style || 'Not specified'}
- Topics: ${voiceProfile.topics?.join(', ') || 'Not specified'}
` : ''}

${contentProfile ? `
USER'S CONTENT PROFILE:
- Niche: ${contentProfile.niche || 'general'}
- Tone: ${contentProfile.tone || 'casual'}
- Topics: ${contentProfile.topics?.join(', ') || 'various'}
` : ''}

ANALYZE AND PROVIDE:

1. **What's Working** - Based on engagement patterns:
   - Which topics got the most engagement?
   - Which formats performed best (questions, threads, hot takes, stories)?
   - What hooks/opening styles worked?

2. **Content Ideas** - 3 personalized ideas:
   - Based on their successful patterns
   - Filling gaps in their content mix
   - Format variations they haven't tried recently

3. **Best Times** - When to post:
   - Based on when their content performed best
   - General best practices if limited data

4. **Voice Reminder** - Quick style check:
   - Remind them of their authentic voice
   - Tips to stay on-brand

5. **Content Gaps** - What they're missing:
   - Topics they haven't covered recently
   - Formats they could try
   - Engagement tactics they're not using

Respond in this exact JSON format:
{
  "whatWorks": {
    "topics": ["topic1", "topic2", "topic3"],
    "formats": ["format that works", "another format"],
    "hooks": ["hook style that works", "another hook style"]
  },
  "ideas": [
    {
      "title": "Brief idea title",
      "description": "Why this would work for them",
      "format": "single",
      "hook": "Example opening line they could use"
    },
    {
      "title": "Second idea",
      "description": "Why this fits their audience",
      "format": "thread",
      "hook": "Example hook"
    },
    {
      "title": "Third idea",
      "description": "Why this is timely/relevant",
      "format": "question",
      "hook": "Example question they could ask"
    }
  ],
  "bestTimes": {
    "days": ["Monday", "Wednesday", "Friday"],
    "times": ["8-9 AM", "12-1 PM", "6-7 PM"],
    "reasoning": "Why these times work for their audience"
  },
  "voiceReminder": {
    "style": "Brief description of their voice/style",
    "tips": ["Tip 1 to stay authentic", "Tip 2"]
  },
  "contentGaps": [
    "Gap 1 they could fill",
    "Gap 2",
    "Gap 3"
  ]
}

IMPORTANT:
- Be specific to THEIR content, not generic advice
- If limited data, make reasonable assumptions but note it
- Ideas should be actionable and specific
- format must be one of: "single", "thread", "question", "hot-take", "story"
- Keep hooks punchy and scroll-stopping
- Match their voice/style in the suggested hooks`;

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

    const parsed = JSON.parse(jsonMatch[0]);

    const result: ContentCoachResponse = {
      whatWorks: {
        topics: parsed.whatWorks?.topics || [],
        formats: parsed.whatWorks?.formats || [],
        hooks: parsed.whatWorks?.hooks || []
      },
      ideas: (parsed.ideas || []).slice(0, 3).map((idea: ContentIdea) => ({
        title: idea.title || 'Untitled Idea',
        description: idea.description || '',
        format: ['single', 'thread', 'question', 'hot-take', 'story'].includes(idea.format) 
          ? idea.format 
          : 'single',
        hook: idea.hook || ''
      })),
      bestTimes: {
        days: parsed.bestTimes?.days || ['Weekdays'],
        times: parsed.bestTimes?.times || ['Morning', 'Evening'],
        reasoning: parsed.bestTimes?.reasoning || 'Based on general best practices'
      },
      voiceReminder: {
        style: parsed.voiceReminder?.style || 'Your authentic voice',
        tips: parsed.voiceReminder?.tips || ['Stay true to yourself']
      },
      contentGaps: parsed.contentGaps || []
    };

    // Track usage if user is logged in
    if (user) {
      await supabase
        .from('generation_usage')
        .insert({
          user_id: user.id,
          type: 'extension_content_coach',
          tokens_used: response.usage.input_tokens + response.usage.output_tokens,
          created_at: new Date().toISOString()
        });
    }

    return NextResponse.json({
      result,
      hasData: recentPosts.length > 0,
      usage: {
        tokens: response.usage.input_tokens + response.usage.output_tokens
      }
    });

  } catch (error) {
    console.error('Content Coach API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content suggestions' },
      { status: 500 }
    );
  }
}

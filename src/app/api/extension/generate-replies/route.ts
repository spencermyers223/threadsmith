import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

// CORS headers for extension requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper to add CORS headers to responses
function jsonResponse(data: unknown, options: { status?: number } = {}) {
  return NextResponse.json(data, { 
    status: options.status || 200,
    headers: corsHeaders 
  });
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

interface PostData {
  author: string;
  text: string;
  metrics?: {
    replies?: string;
    retweets?: string;
    likes?: string;
    views?: string;
  };
  url?: string;
  authorFollowers?: string;
  postAge?: string; // e.g., "2m", "1h", "5h"
}

interface CoachingResponse {
  postScore: {
    score: number; // 1-10
    reasoning: string;
    worthReplying: boolean;
    timeUrgency: 'high' | 'medium' | 'low';
  };
  angles: Array<{
    title: string;
    description: string;
    tone: string;
    example?: string; // Brief example of the approach
  }>;
  hookStarters: Array<{
    text: string; // First 5-10 words
    angle: string; // Which angle it matches
  }>;
  pitfalls: string[]; // What NOT to do
  toneRecommendation: {
    primary: string;
    why: string;
  };
}

export async function POST(request: NextRequest) {
  // Check required env vars early
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set');
    return jsonResponse(
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
      return jsonResponse(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Reply Coach is FREE for all users!
    // Premium check removed to drive adoption

    // Get user's content profile for voice matching
    const { data: contentProfile } = await supabase
      .from('content_profiles')
      .select('tone, niche, content_style, vocabulary_preferences')
      .eq('user_id', user.id)
      .single();

    // Parse request body
    console.log('[generate-replies] Parsing request body...');
    const body = await request.json();
    const post: PostData = body.post;
    console.log('[generate-replies] Post data received:', { author: post?.author, textLength: post?.text?.length });

    if (!post?.text) {
      return jsonResponse(
        { error: 'Post text is required' },
        { status: 400 }
      );
    }

    // Build voice context
    const voiceContext = contentProfile ? `
User's Voice Profile:
- Tone: ${contentProfile.tone || 'witty and engaging'}
- Niche: ${contentProfile.niche || 'tech/general'}
- Style: ${contentProfile.content_style || 'conversational'}
${contentProfile.vocabulary_preferences ? `- Vocabulary: ${contentProfile.vocabulary_preferences}` : ''}
` : `
User's Voice Profile:
- Tone: witty and engaging  
- Niche: tech/general
- Style: conversational
`;

    // Parse engagement metrics
    const engagementInfo = post.metrics ? `
Current Engagement:
- Replies: ${post.metrics.replies || '0'}
- Retweets: ${post.metrics.retweets || '0'}  
- Likes: ${post.metrics.likes || '0'}
${post.metrics.views ? `- Views: ${post.metrics.views}` : ''}
` : '';

    // Generate coaching using Claude
    const prompt = `You are an expert X/Twitter reply strategist. Your job is to COACH users on how to craft engaging replies — NOT write the replies for them.

CONTEXT:
${voiceContext}

Original Post to Reply To:
Author: ${post.author}
Content: "${post.text}"
${engagementInfo}
${post.postAge ? `Post Age: ${post.postAge}` : ''}
${post.authorFollowers ? `Author's Followers: ${post.authorFollowers}` : ''}

KEY ALGORITHM INSIGHTS:
- Replies are weighted 75x in X's algorithm — this is high-leverage engagement
- Early replies get more visibility (first 30min is golden)
- Quality replies that spark conversation > generic praise
- Adapt your vocabulary to match the community you're engaging with

YOUR TASK:
Analyze this post and provide strategic coaching for crafting a reply. Help the user think about HOW to reply, not WHAT to reply.

Respond in this exact JSON format:
{
  "postScore": {
    "score": 7,
    "reasoning": "Why this post is worth replying to (or not)",
    "worthReplying": true,
    "timeUrgency": "high"
  },
  "angles": [
    {
      "title": "Short angle name",
      "description": "What this angle does and why it works",
      "tone": "witty|insightful|contrarian|supportive|playful",
      "example": "Brief conceptual example of this approach"
    }
  ],
  "hookStarters": [
    {
      "text": "First 5-10 words to get started...",
      "angle": "Which angle this matches"
    }
  ],
  "pitfalls": [
    "What NOT to do - specific to this post"
  ],
  "toneRecommendation": {
    "primary": "witty",
    "why": "Why this tone fits best"
  }
}

GUIDELINES:
- Provide exactly 2 angles (not 3 - keep it focused)
- Each angle description MUST be under 15 words
- Provide exactly 2 hook starters (conversation openers, NOT full replies)
- Provide exactly 2 pitfalls (specific to this post)
- postScore reasoning MUST be under 20 words
- toneRecommendation why MUST be under 15 words
- postScore should be 1-10 based on: author influence, topic virality, engagement velocity
- timeUrgency: "high" if <30min old, "medium" if 30min-2h, "low" if >2h
- Be punchy and specific. No fluff. Users want quick guidance, not essays.`;

    console.log('[generate-replies] Calling Claude API...');
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [
        { role: 'user', content: prompt }
      ],
    });
    console.log('[generate-replies] Claude API response received, tokens:', response.usage);

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

    const result: CoachingResponse = JSON.parse(jsonMatch[0]);

    // Validate and normalize the response
    const coaching: CoachingResponse = {
      postScore: {
        score: Math.min(10, Math.max(1, result.postScore?.score || 5)),
        reasoning: result.postScore?.reasoning || 'Unable to analyze post',
        worthReplying: result.postScore?.worthReplying ?? true,
        timeUrgency: result.postScore?.timeUrgency || 'medium'
      },
      angles: (result.angles || []).slice(0, 2).map(angle => ({
        title: angle.title || 'Strategic angle',
        description: angle.description || '',
        tone: angle.tone || 'witty',
        example: angle.example
      })),
      hookStarters: (result.hookStarters || []).slice(0, 2).map(hook => ({
        text: hook.text || '',
        angle: hook.angle || ''
      })),
      pitfalls: (result.pitfalls || []).slice(0, 2),
      toneRecommendation: {
        primary: result.toneRecommendation?.primary || 'witty',
        why: result.toneRecommendation?.why || ''
      }
    };

    // Track usage
    await supabase
      .from('generation_usage')
      .insert({
        user_id: user.id,
        type: 'extension_coaching',
        tokens_used: response.usage.input_tokens + response.usage.output_tokens,
        created_at: new Date().toISOString()
      });

    return jsonResponse({
      coaching,
      usage: {
        tokens: response.usage.input_tokens + response.usage.output_tokens
      }
    });

  } catch (error) {
    // Log full error details for debugging
    console.error('Generate coaching API error:', {
      message: error instanceof Error ? error.message : 'Unknown',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      error: JSON.stringify(error, Object.getOwnPropertyNames(error as object))
    });
    
    // Provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for common issues
    if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('401')) {
      return jsonResponse(
        { error: 'API configuration error. Please contact support.' },
        { status: 500 }
      );
    }
    
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return jsonResponse(
        { error: 'Too many requests. Please try again in a moment.' },
        { status: 429 }
      );
    }

    if (errorMessage.includes('model') || errorMessage.includes('not found')) {
      return jsonResponse(
        { error: 'Model configuration error. Please contact support.' },
        { status: 500 }
      );
    }
    
    return jsonResponse(
      { error: `Failed to generate coaching: ${errorMessage}` },
      { status: 500 }
    );
  }
}

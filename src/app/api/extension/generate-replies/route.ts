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
  hooks: {
    witty: string[];
    insightful: string[];
    contrarian: string[];
    friendly: string[];
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

    // Generate coaching using Claude - simplified to just hooks
    const prompt = `You are an expert X/Twitter reply coach. Generate reply hook starters for this post.

Post to reply to:
Author: ${post.author}
Content: "${post.text}"

Generate exactly 3 hook starters for each of these 4 tones:
- witty: clever, playful, shows personality
- insightful: adds value, shares perspective or experience  
- contrarian: respectfully challenges or offers different angle
- friendly: warm, supportive, builds connection

Respond in this exact JSON format:
{
  "hooks": {
    "witty": ["hook 1...", "hook 2...", "hook 3..."],
    "insightful": ["hook 1...", "hook 2...", "hook 3..."],
    "contrarian": ["hook 1...", "hook 2...", "hook 3..."],
    "friendly": ["hook 1...", "hook 2...", "hook 3..."]
  }
}

RULES:
- Each hook is the FIRST 5-15 words of a reply (not the full reply)
- Hooks should spark ideas, not be copy-paste ready
- Be specific to the post content
- No generic starters like "Great post!" or "I agree!"
- Each hook should feel like a natural conversation opener`;

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

    const result = JSON.parse(jsonMatch[0]);

    // Validate and normalize the response
    const coaching: CoachingResponse = {
      hooks: {
        witty: (result.hooks?.witty || []).slice(0, 3),
        insightful: (result.hooks?.insightful || []).slice(0, 3),
        contrarian: (result.hooks?.contrarian || []).slice(0, 3),
        friendly: (result.hooks?.friendly || []).slice(0, 3)
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

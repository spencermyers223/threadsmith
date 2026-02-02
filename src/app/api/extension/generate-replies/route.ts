import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { deductCredits, CREDIT_COSTS } from '@/lib/credits';

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
    witty: string;
    insightful: string;
    contrarian: string;
    friendly: string;
    curious: string;
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

    // Check and deduct credits (1 credit for Reply Coaching)
    const creditResult = await deductCredits(
      supabase,
      user.id,
      CREDIT_COSTS.REPLY_COACHING,
      'reply_coaching',
      'Reply coaching hook generation'
    );

    if (!creditResult.success) {
      return jsonResponse(
        { 
          error: 'Insufficient credits',
          creditsNeeded: CREDIT_COSTS.REPLY_COACHING,
          creditsRemaining: creditResult.creditsRemaining,
        },
        { status: 402 }
      );
    }

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

    // Generate coaching using Claude - 5 hooks, one per tone
    const prompt = `You are an expert X/Twitter reply coach. Generate ONE perfect hook starter for each tone category.

POST TO REPLY TO:
Author: ${post.author}
Content: "${post.text}"

Generate exactly ONE hook for each of these 5 tones. Each hook MUST:
1. Be 5-12 words max (just the opening of a reply)
2. Directly reference something specific from the post above
3. Perfectly embody its tone category

TONES:
- witty: clever wordplay, unexpected twist, shows personality with humor
- insightful: shares valuable perspective, adds depth, "here's what I've learned..."
- contrarian: respectfully challenges an assumption, offers different angle, "what if..."
- friendly: warm and supportive, builds connection, encouraging
- curious: asks a genuine question, invites discussion, shows interest

Respond in this exact JSON format:
{
  "hooks": {
    "witty": "your witty hook here...",
    "insightful": "your insightful hook here...",
    "contrarian": "your contrarian hook here...",
    "friendly": "your friendly hook here...",
    "curious": "your curious hook here..."
  }
}

CRITICAL RULES:
- Each hook is SHORT (5-12 words) - it's the FIRST LINE of a reply, not the whole thing
- Each hook MUST tie directly to the specific post content - no generic starters
- No "Great post!" or "I agree!" or "This is so true!" - be specific
- The hook should make someone want to keep reading your reply
- DO NOT wrap hooks in quotation marks - output plain text only`;

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

    // Validate and normalize the response - now single strings per category
    const coaching: CoachingResponse = {
      hooks: {
        witty: result.hooks?.witty || '',
        insightful: result.hooks?.insightful || '',
        contrarian: result.hooks?.contrarian || '',
        friendly: result.hooks?.friendly || '',
        curious: result.hooks?.curious || ''
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

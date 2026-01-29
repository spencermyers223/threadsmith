import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// CORS headers for extension requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, options: { status?: number } = {}) {
  return NextResponse.json(data, { 
    status: options.status || 200,
    headers: corsHeaders 
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { content, title, source, sourceUrl, replyTo } = body;

    if (!content || typeof content !== 'string') {
      return jsonResponse(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Create the draft post
    const postData = {
      user_id: user.id,
      content: content.trim(),
      type: 'tweet',
      title: title || `Draft from Extension${replyTo ? ` (reply to @${replyTo})` : ''}`,
      generation_type: 'user_generated',
      status: 'draft',
      scheduled_date: null,
      scheduled_time: null,
      // Store source info in a way that can be referenced later
      metadata: JSON.stringify({
        source: source || 'extension',
        sourceUrl: sourceUrl || null,
        replyTo: replyTo || null,
        createdVia: 'xthread-extension'
      })
    };

    // Note: If metadata column doesn't exist, we'll just omit it
    const { data: post, error: insertError } = await supabase
      .from('posts')
      .insert({
        user_id: postData.user_id,
        content: postData.content,
        type: postData.type,
        title: postData.title,
        generation_type: postData.generation_type,
        status: postData.status,
        scheduled_date: postData.scheduled_date,
        scheduled_time: postData.scheduled_time,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving draft:', insertError);
      return jsonResponse(
        { error: 'Failed to save draft' },
        { status: 500 }
      );
    }

    return jsonResponse({
      success: true,
      post: {
        id: post.id,
        content: post.content,
        title: post.title,
        status: post.status,
        createdAt: post.created_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Extension save-draft API error:', error);
    return jsonResponse(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

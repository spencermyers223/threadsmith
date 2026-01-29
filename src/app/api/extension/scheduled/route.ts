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

export async function GET(request: NextRequest) {
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

    // Get query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'scheduled';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const upcoming = searchParams.get('upcoming') === 'true';

    // Build query
    let query = supabase
      .from('posts')
      .select('id, content, title, type, status, scheduled_date, scheduled_time, generation_type, created_at, updated_at')
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: true, nullsFirst: false })
      .order('scheduled_time', { ascending: true, nullsFirst: false })
      .limit(limit);

    // Filter by status
    if (status === 'all') {
      query = query.in('status', ['draft', 'scheduled', 'posted']);
    } else {
      query = query.eq('status', status);
    }

    // If upcoming, only show future scheduled posts
    if (upcoming) {
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('scheduled_date', today);
    }

    const { data: posts, error: queryError } = await query;

    if (queryError) {
      console.error('Error fetching scheduled posts:', queryError);
      return jsonResponse(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    // Transform for extension consumption
    const transformedPosts = posts?.map(post => ({
      id: post.id,
      content: post.content,
      title: post.title,
      type: post.type,
      status: post.status,
      scheduledDate: post.scheduled_date,
      scheduledTime: post.scheduled_time,
      generationType: post.generation_type,
      createdAt: post.created_at,
      // Compute display-friendly scheduled datetime
      scheduledDisplay: post.scheduled_date 
        ? `${post.scheduled_date}${post.scheduled_time ? ' at ' + post.scheduled_time : ''}`
        : null
    })) || [];

    return jsonResponse({
      posts: transformedPosts,
      count: transformedPosts.length
    });

  } catch (error) {
    console.error('Extension scheduled API error:', error);
    return jsonResponse(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

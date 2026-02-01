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

    // Format scheduled date/time for display
    const formatScheduledDisplay = (date: string | null, time: string | null): string | null => {
      if (!date) return null;
      
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      
      let dateStr = date;
      if (date === today) dateStr = 'Today';
      else if (date === tomorrow) dateStr = 'Tomorrow';
      else {
        // Format as "Feb 5"
        const d = new Date(date + 'T12:00:00');
        dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      
      if (time) {
        // Format time as "9:00 AM"
        const [h, m] = time.split(':');
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${dateStr} at ${hour12}:${m} ${ampm}`;
      }
      
      return dateStr;
    };

    // Helper to extract text from content object
    const extractContent = (content: unknown): string => {
      if (!content) return '';
      if (typeof content === 'string') return content;
      
      const c = content as Record<string, unknown>;
      
      // Handle {html: "..."} format - strip HTML tags
      if (c.html && typeof c.html === 'string') {
        return c.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
      
      // Handle {tweets: [{content: "..."}, ...]} format
      if (Array.isArray(c.tweets)) {
        return c.tweets.map((t: { content?: string }) => t.content || '').join(' ').trim();
      }
      
      // Handle {text: "..."} format
      if (c.text && typeof c.text === 'string') {
        return c.text;
      }
      
      return JSON.stringify(content);
    };

    // Transform for extension consumption
    const transformedPosts = posts?.map(post => ({
      id: post.id,
      content: extractContent(post.content),
      title: post.title,
      type: post.type,
      status: post.status,
      scheduledDate: post.scheduled_date,
      scheduledTime: post.scheduled_time,
      generationType: post.generation_type,
      createdAt: post.created_at,
      // Compute display-friendly scheduled datetime
      scheduledDisplay: formatScheduledDisplay(post.scheduled_date, post.scheduled_time)
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

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/inspiration-tweets - List user's saved inspiration tweets
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get x_account_id from query params (optional - if not provided, get all)
    const searchParams = request.nextUrl.searchParams;
    const xAccountId = searchParams.get('x_account_id');
    const authorUsername = searchParams.get('author');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('inspiration_tweets')
      .select('*')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by x_account if provided
    if (xAccountId) {
      query = query.eq('x_account_id', xAccountId);
    }

    // Filter by author if provided
    if (authorUsername) {
      query = query.eq('author_username', authorUsername);
    }

    const { data: tweets, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      tweets: tweets || [],
      count: count || tweets?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching inspiration tweets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inspiration tweets' },
      { status: 500 }
    );
  }
}

// POST /api/inspiration-tweets - Save a new inspiration tweet
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      x_account_id,
      tweet_id,
      tweet_text,
      tweet_url,
      author_id,
      author_username,
      author_name,
      author_profile_image_url,
      reply_count,
      like_count,
      repost_count,
      quote_count,
      notes,
    } = body;

    // Validate required fields
    if (!tweet_id || !tweet_text || !author_id || !author_username) {
      return NextResponse.json(
        { error: 'tweet_id, tweet_text, author_id, and author_username are required' },
        { status: 400 }
      );
    }

    // If x_account_id not provided, get user's primary account
    let accountId = x_account_id;
    if (!accountId) {
      const { data: primaryAccount } = await supabase
        .from('x_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();
      
      accountId = primaryAccount?.id;
    }

    // Create the inspiration tweet
    const { data: tweet, error } = await supabase
      .from('inspiration_tweets')
      .insert({
        user_id: user.id,
        x_account_id: accountId,
        tweet_id,
        tweet_text,
        tweet_url: tweet_url || `https://x.com/${author_username}/status/${tweet_id}`,
        author_id,
        author_username,
        author_name: author_name || null,
        author_profile_image_url: author_profile_image_url || null,
        reply_count: reply_count || 0,
        like_count: like_count || 0,
        repost_count: repost_count || 0,
        quote_count: quote_count || 0,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This tweet is already saved' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(tweet, { status: 201 });
  } catch (error) {
    console.error('Error saving inspiration tweet:', error);
    return NextResponse.json(
      { error: 'Failed to save inspiration tweet' },
      { status: 500 }
    );
  }
}

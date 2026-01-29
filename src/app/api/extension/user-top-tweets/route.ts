/**
 * Extension API - Fetch Any User's Top Tweets
 * 
 * GET /api/extension/user-top-tweets?username=handle
 * 
 * Fetches a user's last 100 tweets and sorts by reply count (most engagement).
 * Used by the Chrome extension's "Analyze" feature to show top-performing tweets.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getValidXTokens } from '@/lib/x-tokens';

interface XTweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
    impression_count?: number;
  };
}

interface XUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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

    // Get username from query params
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username')?.replace('@', '');

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Get valid X tokens for the authenticated user
    const tokenResult = await getValidXTokens(user.id);
    
    if (!tokenResult.success || !tokenResult.tokens) {
      return NextResponse.json(
        { error: 'X account not connected. Please link your X account in xthread settings.' },
        { status: 401 }
      );
    }

    const accessToken = tokenResult.tokens.access_token;

    // Step 1: Look up user ID from username
    const userLookupUrl = `https://api.x.com/2/users/by/username/${username}?user.fields=name,username,profile_image_url`;
    
    const userResponse = await fetch(userLookupUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      if (userResponse.status === 404) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      const error = await userResponse.text();
      console.error('X API user lookup error:', error);
      return NextResponse.json(
        { error: 'Failed to find user on X' },
        { status: userResponse.status }
      );
    }

    const userData = await userResponse.json();
    const targetUser: XUser = userData.data;

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Step 2: Fetch user's tweets (last 100)
    const tweetsUrl = new URL(`https://api.x.com/2/users/${targetUser.id}/tweets`);
    tweetsUrl.searchParams.set('max_results', '100');
    tweetsUrl.searchParams.set('tweet.fields', 'created_at,public_metrics');
    tweetsUrl.searchParams.set('exclude', 'retweets,replies');

    const tweetsResponse = await fetch(tweetsUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!tweetsResponse.ok) {
      const error = await tweetsResponse.text();
      console.error('X API tweets error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tweets' },
        { status: tweetsResponse.status }
      );
    }

    const tweetsData = await tweetsResponse.json();
    const rawTweets: XTweet[] = tweetsData.data || [];

    // Step 3: Sort by reply count (descending)
    const sortedTweets = rawTweets
      .filter(t => t.public_metrics) // Only tweets with metrics
      .sort((a, b) => {
        const aReplies = a.public_metrics?.reply_count || 0;
        const bReplies = b.public_metrics?.reply_count || 0;
        return bReplies - aReplies;
      })
      .slice(0, 50); // Return top 50

    // Step 4: Transform for response
    const tweets = sortedTweets.map(tweet => ({
      id: tweet.id,
      text: tweet.text,
      url: `https://x.com/${targetUser.username}/status/${tweet.id}`,
      created_at: tweet.created_at,
      reply_count: tweet.public_metrics?.reply_count || 0,
      like_count: tweet.public_metrics?.like_count || 0,
      repost_count: tweet.public_metrics?.retweet_count || 0,
      quote_count: tweet.public_metrics?.quote_count || 0,
    }));

    // Track usage (free feature but track for analytics)
    await supabase
      .from('generation_usage')
      .insert({
        user_id: user.id,
        type: 'extension_top_tweets_lookup',
        tokens_used: 0,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      user: {
        id: targetUser.id,
        name: targetUser.name,
        username: targetUser.username,
        profile_image_url: targetUser.profile_image_url,
      },
      tweets,
      total_fetched: rawTweets.length,
      fetched_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('User top tweets API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user tweets' },
      { status: 500 }
    );
  }
}

/**
 * Engagement Baseline API
 * 
 * GET /api/engagement/baseline - Get current baseline stats
 * POST /api/engagement/baseline/refresh - Rebuild baseline from top accounts
 * 
 * The baseline is trained on top-performing tweets from curated high-engagement
 * accounts. This gives us a data-driven scoring foundation instead of just heuristics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getValidXTokens } from '@/lib/x-tokens';
import {
  BASELINE_ACCOUNTS,
  calculateBaselineStats,
  getDefaultBaseline,
  extractTweetPatterns,
  type BaselineStats,
  type TweetPattern,
} from '@/lib/baseline-accounts';

const BASELINE_CACHE_KEY = 'engagement_baseline_v1';
const BASELINE_CACHE_HOURS = 24; // Refresh every 24 hours

interface CachedBaseline {
  stats: BaselineStats;
  topTweetExamples: Array<{
    text: string;
    username: string;
    reply_count: number;
    patterns: TweetPattern;
  }>;
  cachedAt: string;
}

// X API tweet response type
interface XTweetResponse {
  id: string;
  text: string;
  public_metrics?: {
    reply_count: number;
    like_count: number;
    retweet_count: number;
    quote_count: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Check for cached baseline - gracefully handle missing table
    const { data: cached, error } = await supabase
      .from('system_cache')
      .select('value, updated_at')
      .eq('key', BASELINE_CACHE_KEY)
      .single();

    // If table doesn't exist or no data, return default baseline
    if (error) {
      const defaultBaseline = getDefaultBaseline();
      return NextResponse.json({
        stats: defaultBaseline,
        topTweetExamples: [],
        source: 'default',
        message: error.code === 'PGRST116' 
          ? 'No baseline cached yet. POST to /api/engagement/baseline/refresh to build.'
          : 'Cache unavailable. Using default baseline.',
      });
    }

    if (cached?.value) {
      const baseline = cached.value as CachedBaseline;
      const cacheAge = Date.now() - new Date(cached.updated_at).getTime();
      const maxAge = BASELINE_CACHE_HOURS * 60 * 60 * 1000;
      
      if (cacheAge < maxAge) {
        return NextResponse.json({
          ...baseline,
          source: 'cache',
          cacheAgeHours: Math.round(cacheAge / (60 * 60 * 1000) * 10) / 10,
        });
      }
    }

    // Return default baseline if no cache (will be populated by POST /refresh)
    const defaultBaseline = getDefaultBaseline();
    return NextResponse.json({
      stats: defaultBaseline,
      topTweetExamples: [],
      source: 'default',
      message: 'No baseline cached yet. POST to /api/engagement/baseline/refresh to build.',
    });

  } catch (error) {
    console.error('Baseline fetch error:', error);
    return NextResponse.json({
      stats: getDefaultBaseline(),
      source: 'default-error',
    });
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Verify auth - only authenticated users can trigger refresh
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get X tokens for API access
    const tokenResult = await getValidXTokens(user.id);
    if (!tokenResult.success || !tokenResult.tokens) {
      return NextResponse.json(
        { error: 'X account not connected. Connect X in settings to enable baseline building.' },
        { status: 401 }
      );
    }

    const accessToken = tokenResult.tokens.access_token;
    const allTweets: Array<{
      text: string;
      username: string;
      reply_count: number;
      like_count: number;
    }> = [];

    // Fetch top tweets from high-priority accounts first
    const sortedAccounts = [...BASELINE_ACCOUNTS].sort((a, b) => 
      a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0
    );

    const fetchedAccounts: string[] = [];
    const errors: string[] = [];

    for (const account of sortedAccounts.slice(0, 10)) { // Limit to 10 accounts per refresh
      try {
        // Look up user ID
        const userResponse = await fetch(
          `https://api.x.com/2/users/by/username/${account.username}?user.fields=name,username`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );

        if (!userResponse.ok) {
          errors.push(`${account.username}: user lookup failed`);
          continue;
        }

        const userData = await userResponse.json();
        if (!userData.data?.id) {
          errors.push(`${account.username}: user not found`);
          continue;
        }

        // Fetch their tweets
        const tweetsUrl = new URL(`https://api.x.com/2/users/${userData.data.id}/tweets`);
        tweetsUrl.searchParams.set('max_results', '50');
        tweetsUrl.searchParams.set('tweet.fields', 'created_at,public_metrics');
        tweetsUrl.searchParams.set('exclude', 'retweets,replies');

        const tweetsResponse = await fetch(tweetsUrl.toString(), {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!tweetsResponse.ok) {
          errors.push(`${account.username}: tweets fetch failed`);
          continue;
        }

        const tweetsData = await tweetsResponse.json();
        const tweets = tweetsData.data || [];

        // Sort by reply count and take top 10
        const topTweets = (tweets as XTweetResponse[])
          .filter((t) => t.public_metrics)
          .sort((a, b) => 
            (b.public_metrics?.reply_count || 0) - (a.public_metrics?.reply_count || 0)
          )
          .slice(0, 10);

        for (const tweet of topTweets) {
          allTweets.push({
            text: tweet.text,
            username: account.username,
            reply_count: tweet.public_metrics?.reply_count || 0,
            like_count: tweet.public_metrics?.like_count || 0,
          });
        }

        fetchedAccounts.push(account.username);

        // Rate limit protection - small delay between accounts
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err) {
        errors.push(`${account.username}: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    }

    if (allTweets.length === 0) {
      return NextResponse.json({
        error: 'Could not fetch any tweets',
        errors,
      }, { status: 500 });
    }

    // Sort all tweets by reply count and calculate baseline
    const sortedTweets = allTweets.sort((a, b) => b.reply_count - a.reply_count);
    const stats = calculateBaselineStats(sortedTweets);

    // Get top 20 examples with patterns
    const topTweetExamples = sortedTweets.slice(0, 20).map(t => ({
      text: t.text,
      username: t.username,
      reply_count: t.reply_count,
      patterns: extractTweetPatterns(t.text),
    }));

    const baseline: CachedBaseline = {
      stats,
      topTweetExamples,
      cachedAt: new Date().toISOString(),
    };

    // Try to upsert to system_cache - skip if table doesn't exist
    const { error: cacheError } = await supabase
      .from('system_cache')
      .upsert({
        key: BASELINE_CACHE_KEY,
        value: baseline,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
    
    if (cacheError) {
      console.warn('Could not cache baseline:', cacheError.message);
      // Continue anyway - the baseline data is still valid
    }

    return NextResponse.json({
      success: true,
      stats,
      topTweetExamples: topTweetExamples.slice(0, 5), // Only return 5 examples in response
      fetchedAccounts,
      totalTweets: allTweets.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Baseline refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh baseline' },
      { status: 500 }
    );
  }
}

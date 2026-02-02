/**
 * Extension API - Account Analysis
 * 
 * GET /api/extension/user-top-tweets?username=handle
 * 
 * Fetches a user's last 30 tweets and sorts by engagement score.
 * Returns top 10 tweets with a comprehensive AI analysis (powered by Opus).
 * Analyzes WHY their content works, tactics they use, and actionable takeaways.
 * 
 * Cost: 3 credits (~$0.23 = $0.15 X API + $0.08 Claude Opus)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getValidXTokens } from '@/lib/x-tokens';
import Anthropic from '@anthropic-ai/sdk';

// CORS headers for extension requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Helper to add CORS headers to responses
function jsonResponse(data: unknown, options: { status?: number; headers?: Record<string, string> } = {}) {
  return NextResponse.json(data, { 
    status: options.status || 200,
    headers: corsHeaders 
  });
}

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

// Calculate engagement score: weighted sum of all metrics
function calculateEngagementScore(metrics: XTweet['public_metrics']): number {
  if (!metrics) return 0;
  // Replies are weighted highest (shows conversation), then likes, then retweets
  return (
    (metrics.reply_count || 0) * 3 +
    (metrics.like_count || 0) * 2 +
    (metrics.retweet_count || 0) * 2 +
    (metrics.quote_count || 0) * 1.5
  );
}

// Analysis response structure
interface AccountAnalysis {
  whyEngaging: string[];
  tactics: {
    formatting: string;
    hookStyle: string;
    topics: string;
    rhythm: string;
  };
  stealable: string[];
  summary: string;
}

// Generate comprehensive account analysis using Opus
async function generateAnalysis(tweets: XTweet[], username: string): Promise<AccountAnalysis> {
  const defaultAnalysis: AccountAnalysis = {
    whyEngaging: ['Analysis unavailable'],
    tactics: {
      formatting: 'Unknown',
      hookStyle: 'Unknown',
      topics: 'Unknown',
      rhythm: 'Unknown',
    },
    stealable: ['Unable to generate insights'],
    summary: 'Analysis unavailable.',
  };

  if (!process.env.ANTHROPIC_API_KEY || tweets.length === 0) {
    return defaultAnalysis;
  }

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Format tweets with their metrics for context
    const tweetData = tweets.slice(0, 10).map((t, i) => {
      const metrics = t.public_metrics;
      return `TWEET ${i + 1}:
"${t.text}"
Metrics: ${metrics?.like_count || 0} likes, ${metrics?.retweet_count || 0} RTs, ${metrics?.reply_count || 0} replies`;
    }).join('\n\n');
    
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `You are analyzing @${username}'s top-performing tweets to understand WHY their content resonates.

Here are their 10 best tweets (sorted by engagement):

${tweetData}

Analyze these tweets deeply. Think about:
- What patterns make their content engaging?
- What specific tactics do they use?
- What could someone learn and apply from studying this account?

Respond with ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "whyEngaging": [
    "First pattern you noticed (be specific, reference actual tweet content)",
    "Second pattern (specific observation)",
    "Third pattern (specific observation)"
  ],
  "tactics": {
    "formatting": "How they format tweets (line breaks, lists, emojis, etc.)",
    "hookStyle": "How they open tweets to grab attention",
    "topics": "What themes/subjects they write about",
    "rhythm": "Posting patterns, thread vs single tweets, etc."
  },
  "stealable": [
    "Specific actionable tactic #1 you could copy",
    "Specific actionable tactic #2 you could copy"
  ],
  "summary": "2-3 sentence summary of their overall voice and style"
}`
        }
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      try {
        // Parse the JSON response
        const parsed = JSON.parse(content.text.trim()) as AccountAnalysis;
        return parsed;
      } catch (parseError) {
        console.error('Failed to parse Opus response as JSON:', content.text);
        return defaultAnalysis;
      }
    }
    return defaultAnalysis;
  } catch (error) {
    console.error('Account analysis generation error:', error);
    return defaultAnalysis;
  }
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

    // Get username from query params
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username')?.replace('@', '');

    if (!username) {
      return jsonResponse(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Try user's OAuth tokens first, fall back to app Bearer token
    let accessToken: string;
    const tokenResult = await getValidXTokens(user.id);
    
    console.log('[user-top-tweets] Token result:', { success: tokenResult.success, hasTokens: tokenResult.success && !!tokenResult.tokens });
    
    if (tokenResult.success && tokenResult.tokens) {
      accessToken = tokenResult.tokens.access_token;
      console.log('[user-top-tweets] Using user OAuth token');
    } else {
      // Fallback to app Bearer token for public data
      // Hardcoded temporarily to debug env var issue
      const bearerToken = process.env.X_BEARER_TOKEN || 'AAAAAAAAAAAAAAAAAAAAAO4V7QEAAAAAT53aeQ6gxagVJmke/fJO5sVW2dI=npSCEjZtwFUwqIYvTu45ptWdmxeBlQc3ldRkbsoU9jFSPE00YV';
      console.log('[user-top-tweets] Bearer token present:', !!bearerToken, 'length:', bearerToken?.length || 0);
      if (!bearerToken) {
        console.error('[user-top-tweets] X_BEARER_TOKEN env var is missing!');
        return jsonResponse(
          { error: 'X API not configured' },
          { status: 500 }
        );
      }
      // Don't decode if it's the hardcoded token (already raw)
      accessToken = bearerToken.includes('%') ? decodeURIComponent(bearerToken) : bearerToken;
      console.log('[user-top-tweets] Using app Bearer token, length:', accessToken.length);
    }

    // Step 1: Look up user ID from username
    const userLookupUrl = `https://api.x.com/2/users/by/username/${username}?user.fields=name,username,profile_image_url`;
    
    const userResponse = await fetch(userLookupUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      if (userResponse.status === 404) {
        return jsonResponse(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      const error = await userResponse.text();
      console.error('X API user lookup error:', error);
      return jsonResponse(
        { error: 'Failed to find user on X' },
        { status: userResponse.status }
      );
    }

    const userData = await userResponse.json();
    const targetUser: XUser = userData.data;

    if (!targetUser) {
      return jsonResponse(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Step 2: Fetch user's tweets (last 30 - optimized for cost)
    const tweetsUrl = new URL(`https://api.x.com/2/users/${targetUser.id}/tweets`);
    tweetsUrl.searchParams.set('max_results', '30');
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
      return jsonResponse(
        { error: 'Failed to fetch tweets' },
        { status: tweetsResponse.status }
      );
    }

    const tweetsData = await tweetsResponse.json();
    const rawTweets: XTweet[] = tweetsData.data || [];

    // Step 3: Sort by engagement score (descending) and take top 10
    const sortedTweets = rawTweets
      .filter(t => t.public_metrics)
      .sort((a, b) => calculateEngagementScore(b.public_metrics) - calculateEngagementScore(a.public_metrics))
      .slice(0, 10);

    // Step 4: Generate comprehensive analysis using Opus
    const analysis = await generateAnalysis(sortedTweets, targetUser.username);

    // Step 5: Transform for response
    const tweets = sortedTweets.map(tweet => ({
      id: tweet.id,
      text: tweet.text,
      url: `https://x.com/${targetUser.username}/status/${tweet.id}`,
      created_at: tweet.created_at,
      replies: tweet.public_metrics?.reply_count || 0,
      likes: tweet.public_metrics?.like_count || 0,
      retweets: tweet.public_metrics?.retweet_count || 0,
      views: tweet.public_metrics?.impression_count || 0,
    }));

    // Track usage (3 credits for account analysis)
    await supabase
      .from('generation_usage')
      .insert({
        user_id: user.id,
        type: 'extension_account_analysis',
        tokens_used: 0,
        credits_used: 3,
        created_at: new Date().toISOString()
      });

    return jsonResponse({
      handle: `@${targetUser.username}`,
      avatar: targetUser.profile_image_url || '',
      analysis,
      tweets,
      scannedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('User top tweets API error:', error);
    return jsonResponse(
      { error: 'Failed to fetch user tweets' },
      { status: 500 }
    );
  }
}

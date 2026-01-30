/**
 * Learn from User's Tweet Performance
 * 
 * POST /api/engagement/learn
 * 
 * Fetches user's last 100 tweets, analyzes what patterns lead to high engagement,
 * and stores learned patterns for personalized scoring.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidXTokens } from '@/lib/x-tokens';

interface TweetMetrics {
  text: string;
  reply_count: number;
  like_count: number;
  retweet_count: number;
  engagement_rate: number;
}

interface LearnedPatterns {
  optimal_length_min: number;
  optimal_length_max: number;
  questions_effectiveness: number;
  numbers_effectiveness: number;
  bold_claims_effectiveness: number;
  lists_effectiveness: number;
  emojis_effectiveness: number;
  weight_hook: number;
  weight_reply_potential: number;
  weight_length: number;
  weight_readability: number;
  weight_hashtags: number;
  weight_emojis: number;
  top_hooks: string[];
  top_ctas: string[];
  tweets_analyzed: number;
  avg_engagement_rate: number;
}

function hasQuestion(text: string): boolean {
  return text.includes('?') || /^(what|why|how|when|who|which|do you|have you)/im.test(text);
}

function hasNumber(text: string): boolean {
  return /^\d|[\s\n]\d/.test(text);
}

function hasBoldClaim(text: string): boolean {
  const markers = ['unpopular opinion', 'hot take', 'controversial', 'nobody', 'everyone', 'most people', 'the truth'];
  return markers.some(m => text.toLowerCase().includes(m));
}

function hasList(text: string): boolean {
  return /^\d[\.\)]\s|^[-•→]\s/m.test(text);
}

function hasEmojis(text: string): boolean {
  return /[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2600-\u26FF]/.test(text);
}

function extractHook(text: string): string {
  const firstLine = text.split('\n')[0]?.trim() || '';
  return firstLine.slice(0, 100);
}

function extractCTA(text: string): string | null {
  const lastLine = text.split('\n').pop()?.trim() || '';
  if (lastLine.includes('?') || /reply|comment|thoughts|agree|disagree/i.test(lastLine)) {
    return lastLine.slice(0, 100);
  }
  return null;
}

function analyzePatterns(tweets: TweetMetrics[]): LearnedPatterns {
  if (tweets.length === 0) {
    // Return defaults if no tweets
    return {
      optimal_length_min: 180,
      optimal_length_max: 280,
      questions_effectiveness: 50,
      numbers_effectiveness: 50,
      bold_claims_effectiveness: 50,
      lists_effectiveness: 50,
      emojis_effectiveness: 50,
      weight_hook: 25,
      weight_reply_potential: 30,
      weight_length: 15,
      weight_readability: 10,
      weight_hashtags: 10,
      weight_emojis: 10,
      top_hooks: [],
      top_ctas: [],
      tweets_analyzed: 0,
      avg_engagement_rate: 0,
    };
  }

  // Sort by engagement rate
  const sorted = [...tweets].sort((a, b) => b.engagement_rate - a.engagement_rate);
  const topPerformers = sorted.slice(0, Math.max(10, Math.floor(tweets.length * 0.2)));
  const avgPerformers = sorted.slice(Math.floor(tweets.length * 0.3), Math.floor(tweets.length * 0.7));

  // Analyze length of top performers
  const topLengths = topPerformers.map(t => t.text.length);
  const optimal_length_min = Math.round(Math.min(...topLengths) * 0.9);
  const optimal_length_max = Math.round(Math.max(...topLengths) * 1.1);

  // Calculate effectiveness scores for each pattern
  // Compare rate of pattern in top vs average performers
  function calcEffectiveness(patternFn: (text: string) => boolean): number {
    const topRate = topPerformers.filter(t => patternFn(t.text)).length / topPerformers.length;
    const avgRate = avgPerformers.length > 0 
      ? avgPerformers.filter(t => patternFn(t.text)).length / avgPerformers.length
      : 0.5;
    
    // If pattern appears more in top performers, it's effective
    // Scale to 0-100 where 50 is neutral
    const ratio = avgRate > 0 ? topRate / avgRate : (topRate > 0 ? 2 : 1);
    return Math.min(100, Math.max(0, Math.round(50 * ratio)));
  }

  const questions_effectiveness = calcEffectiveness(hasQuestion);
  const numbers_effectiveness = calcEffectiveness(hasNumber);
  const bold_claims_effectiveness = calcEffectiveness(hasBoldClaim);
  const lists_effectiveness = calcEffectiveness(hasList);
  const emojis_effectiveness = calcEffectiveness(hasEmojis);

  // Adjust weights based on what correlates with engagement
  // Higher effectiveness = higher weight
  const normalize = (val: number, base: number) => 
    Math.round(base * (val / 50)); // 50 is neutral

  // Base weights, adjusted by effectiveness
  let weight_hook = normalize(Math.max(questions_effectiveness, numbers_effectiveness, bold_claims_effectiveness), 25);
  let weight_reply_potential = normalize(questions_effectiveness, 30);
  let weight_length = 15; // Keep constant
  let weight_readability = 10; // Keep constant
  let weight_hashtags = 10;
  let weight_emojis = normalize(emojis_effectiveness, 10);

  // Normalize to sum to 100
  const totalWeight = weight_hook + weight_reply_potential + weight_length + 
    weight_readability + weight_hashtags + weight_emojis;
  const scale = 100 / totalWeight;
  
  weight_hook = Math.round(weight_hook * scale);
  weight_reply_potential = Math.round(weight_reply_potential * scale);
  weight_length = Math.round(weight_length * scale);
  weight_readability = Math.round(weight_readability * scale);
  weight_hashtags = Math.round(weight_hashtags * scale);
  weight_emojis = Math.round(weight_emojis * scale);

  // Extract top hooks and CTAs
  const top_hooks = topPerformers
    .slice(0, 5)
    .map(t => extractHook(t.text))
    .filter(h => h.length > 10);
  
  const top_ctas = topPerformers
    .map(t => extractCTA(t.text))
    .filter((c): c is string => c !== null)
    .slice(0, 5);

  // Calculate average engagement rate
  const avg_engagement_rate = tweets.reduce((sum, t) => sum + t.engagement_rate, 0) / tweets.length;

  return {
    optimal_length_min: Math.max(50, optimal_length_min),
    optimal_length_max: Math.min(500, optimal_length_max),
    questions_effectiveness,
    numbers_effectiveness,
    bold_claims_effectiveness,
    lists_effectiveness,
    emojis_effectiveness,
    weight_hook,
    weight_reply_potential,
    weight_length,
    weight_readability,
    weight_hashtags,
    weight_emojis,
    top_hooks,
    top_ctas,
    tweets_analyzed: tweets.length,
    avg_engagement_rate: Math.round(avg_engagement_rate * 100) / 100,
  };
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get valid X tokens
    const tokenResult = await getValidXTokens(user.id);
    
    if (!tokenResult.success || !tokenResult.tokens) {
      return NextResponse.json(
        { error: 'X account not connected. Please link your X account first.' },
        { status: 401 }
      );
    }

    const accessToken = tokenResult.tokens.access_token;

    // Get user's X profile
    const meResponse = await fetch('https://api.x.com/2/users/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!meResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch X profile' },
        { status: meResponse.status }
      );
    }

    const meData = await meResponse.json();
    const xUserId = meData.data?.id;

    if (!xUserId) {
      return NextResponse.json(
        { error: 'Could not get X user ID' },
        { status: 400 }
      );
    }

    // Fetch last 100 tweets with metrics
    const tweetsUrl = new URL(`https://api.x.com/2/users/${xUserId}/tweets`);
    tweetsUrl.searchParams.set('max_results', '100');
    tweetsUrl.searchParams.set('tweet.fields', 'created_at,public_metrics');
    tweetsUrl.searchParams.set('exclude', 'retweets,replies');

    const tweetsResponse = await fetch(tweetsUrl.toString(), {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!tweetsResponse.ok) {
      const error = await tweetsResponse.text();
      console.error('X API error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tweets from X' },
        { status: tweetsResponse.status }
      );
    }

    const tweetsData = await tweetsResponse.json();
    const rawTweets = tweetsData.data || [];

    // Calculate engagement rate for each tweet
    // Engagement rate = (replies * 10 + retweets * 5 + likes) / impressions
    // If no impressions, use followers estimate
    const tweets: TweetMetrics[] = rawTweets
      .filter((t: { public_metrics?: { reply_count: number; like_count: number; retweet_count: number } }) => t.public_metrics)
      .map((t: { text: string; public_metrics: { reply_count: number; like_count: number; retweet_count: number; impression_count?: number } }) => {
        const metrics = t.public_metrics;
        // Weight replies heavily (algorithm weights them 75x)
        const engagementScore = 
          (metrics.reply_count * 10) + 
          (metrics.retweet_count * 5) + 
          metrics.like_count;
        const impressions = metrics.impression_count || 1000; // Estimate if not available
        return {
          text: t.text,
          reply_count: metrics.reply_count,
          like_count: metrics.like_count,
          retweet_count: metrics.retweet_count,
          engagement_rate: engagementScore / impressions * 100,
        };
      });

    if (tweets.length < 10) {
      return NextResponse.json({
        success: false,
        error: 'Need at least 10 tweets to learn patterns. Keep posting!',
        tweets_found: tweets.length,
      });
    }

    // Analyze patterns
    const patterns = analyzePatterns(tweets);

    // Upsert to database
    const { error: upsertError } = await supabase
      .from('engagement_patterns')
      .upsert({
        user_id: user.id,
        ...patterns,
        top_hooks: JSON.stringify(patterns.top_hooks),
        top_ctas: JSON.stringify(patterns.top_ctas),
        last_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('Failed to save patterns:', upsertError);
      // Continue anyway - we can still return the analysis
    }

    return NextResponse.json({
      success: true,
      patterns,
      insights: {
        summary: `Analyzed ${patterns.tweets_analyzed} tweets. Your average engagement rate is ${patterns.avg_engagement_rate.toFixed(2)}%.`,
        what_works: [
          patterns.questions_effectiveness > 60 && 'Questions perform well for you',
          patterns.numbers_effectiveness > 60 && 'Numbers/lists grab your audience\'s attention',
          patterns.bold_claims_effectiveness > 60 && 'Bold claims drive engagement',
          patterns.emojis_effectiveness > 60 && 'Emojis boost your visibility',
        ].filter(Boolean),
        optimal_length: `${patterns.optimal_length_min}-${patterns.optimal_length_max} characters`,
        top_hooks: patterns.top_hooks.slice(0, 3),
      },
    });

  } catch (error) {
    console.error('Learn patterns error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze tweets' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch current learned patterns
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: patterns, error } = await supabase
    .from('engagement_patterns')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Fetch patterns error:', error);
    return NextResponse.json({ error: 'Failed to fetch patterns' }, { status: 500 });
  }

  if (!patterns) {
    return NextResponse.json({
      hasPatterns: false,
      message: 'No learned patterns yet. Run "Learn from my tweets" to personalize your scoring.',
    });
  }

  return NextResponse.json({
    hasPatterns: true,
    patterns,
    lastAnalyzed: patterns.last_analyzed_at,
  });
}

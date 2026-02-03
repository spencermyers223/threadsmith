import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Cost: 1 credit per 10 tweets
const CREDITS_PER_10_TWEETS = 1

interface FetchRequest {
  username: string
  tweetCount: number
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: FetchRequest = await request.json()
    const { username, tweetCount } = body

    // Validate inputs
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }
    if (!tweetCount || tweetCount < 10 || tweetCount > 200) {
      return NextResponse.json({ error: 'Tweet count must be between 10 and 200' }, { status: 400 })
    }

    // Calculate credit cost
    const creditCost = Math.ceil(tweetCount / 10) * CREDITS_PER_10_TWEETS

    // Check user's credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Failed to check credits' }, { status: 500 })
    }

    if ((profile.credits || 0) < creditCost) {
      return NextResponse.json({ 
        error: `Insufficient credits. You need ${creditCost} credits but have ${profile.credits || 0}.` 
      }, { status: 400 })
    }

    // Fetch tweets from X API
    const xApiToken = process.env.X_BEARER_TOKEN
    if (!xApiToken) {
      return NextResponse.json({ error: 'X API not configured' }, { status: 500 })
    }

    // First, get user ID from username
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${username}`,
      {
        headers: {
          'Authorization': `Bearer ${xApiToken}`
        }
      }
    )

    if (!userRes.ok) {
      const errorData = await userRes.json().catch(() => ({}))
      if (userRes.status === 404) {
        return NextResponse.json({ error: `User @${username} not found` }, { status: 404 })
      }
      console.error('X API user lookup error:', errorData)
      return NextResponse.json({ error: 'Failed to find user' }, { status: 400 })
    }

    const userData = await userRes.json()
    const xUserId = userData.data?.id

    if (!xUserId) {
      return NextResponse.json({ error: `User @${username} not found` }, { status: 404 })
    }

    // Fetch user's tweets
    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${xUserId}/tweets?max_results=${Math.min(tweetCount, 100)}&tweet.fields=public_metrics,created_at`,
      {
        headers: {
          'Authorization': `Bearer ${xApiToken}`
        }
      }
    )

    if (!tweetsRes.ok) {
      const errorData = await tweetsRes.json().catch(() => ({}))
      console.error('X API tweets error:', errorData)
      return NextResponse.json({ error: 'Failed to fetch tweets' }, { status: 400 })
    }

    const tweetsData = await tweetsRes.json()
    const tweets = (tweetsData.data || []).map((tweet: {
      text: string
      created_at: string
      public_metrics?: { like_count?: number; retweet_count?: number; reply_count?: number }
    }) => ({
      text: tweet.text,
      created_at: tweet.created_at,
      likes: tweet.public_metrics?.like_count || 0,
      retweets: tweet.public_metrics?.retweet_count || 0,
      replies: tweet.public_metrics?.reply_count || 0
    }))

    // Sort by likes (most popular first)
    tweets.sort((a: { likes: number }, b: { likes: number }) => b.likes - a.likes)

    // Deduct credits AFTER successful fetch
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: (profile.credits || 0) - creditCost })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to deduct credits:', updateError)
      // Don't fail the request, but log the error
    }

    // Return the data
    return NextResponse.json({
      username: username.replace('@', ''),
      tweets: tweets,
      tweetCount: tweets.length,
      creditsUsed: creditCost
    })

  } catch (err) {
    console.error('Marketplace fetch error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch account data' },
      { status: 500 }
    )
  }
}

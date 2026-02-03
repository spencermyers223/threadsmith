import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface SaveRequest {
  tweetUrl: string
  tweetId: string
  xAccountId?: string
}

// POST - Save a tweet as inspiration
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: SaveRequest = await request.json()
    const { tweetUrl, tweetId, xAccountId } = body

    if (!tweetUrl || !tweetId) {
      return NextResponse.json({ error: 'Tweet URL and ID are required' }, { status: 400 })
    }

    // Fetch tweet data from X API
    const bearerToken = process.env.X_BEARER_TOKEN
    if (!bearerToken) {
      return NextResponse.json({ error: 'X API not configured' }, { status: 500 })
    }

    const tweetRes = await fetch(
      `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics,created_at,author_id&expansions=author_id&user.fields=name,username,profile_image_url`,
      {
        headers: { 'Authorization': `Bearer ${bearerToken}` }
      }
    )

    if (!tweetRes.ok) {
      const error = await tweetRes.json()
      return NextResponse.json({ 
        error: `Failed to fetch tweet: ${error.detail || error.title || 'Unknown error'}` 
      }, { status: 400 })
    }

    const tweetData = await tweetRes.json()
    const tweet = tweetData.data
    const author = tweetData.includes?.users?.[0]

    if (!tweet) {
      return NextResponse.json({ error: 'Tweet not found' }, { status: 404 })
    }

    // Save to database
    const { data: saved, error: saveError } = await supabase
      .from('saved_inspirations')
      .upsert({
        user_id: user.id,
        x_account_id: xAccountId || null,
        tweet_url: tweetUrl,
        tweet_id: tweetId,
        tweet_text: tweet.text,
        author_username: author?.username || 'unknown',
        author_name: author?.name || 'Unknown',
        author_avatar_url: author?.profile_image_url || null,
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
        saved_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,tweet_url',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save inspiration:', saveError)
      return NextResponse.json({ error: 'Failed to save inspiration' }, { status: 500 })
    }

    return NextResponse.json({
      inspiration: saved,
      message: 'Tweet saved successfully'
    })

  } catch (error) {
    console.error('Save inspiration error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to save',
    }, { status: 500 })
  }
}

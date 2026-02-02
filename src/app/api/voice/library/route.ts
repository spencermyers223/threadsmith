import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const MAX_VOICE_TWEETS = 5

// GET - Fetch voice library (max 5)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('voice_library')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    tweets: data,
    count: data?.length || 0,
    max: MAX_VOICE_TWEETS,
  })
}

// POST - Add to voice library (enforces max 5)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check current count
    const { count, error: countError } = await supabase
      .from('voice_library')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) throw countError

    if ((count || 0) >= MAX_VOICE_TWEETS) {
      return NextResponse.json(
        { 
          error: `Voice profile is full. Remove a tweet first.`,
          code: 'VOICE_LIBRARY_FULL',
          count,
          max: MAX_VOICE_TWEETS,
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { tweet_text, tweet_url, author_username, is_own_tweet } = body

    if (!tweet_text || tweet_text.trim().length === 0) {
      return NextResponse.json({ error: 'Tweet text is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('voice_library')
      .insert({
        user_id: user.id,
        tweet_text: tweet_text.trim(),
        tweet_url: tweet_url?.trim() || null,
        author_username: author_username?.trim() || null,
        is_own_tweet: is_own_tweet || false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      tweet: data,
      count: (count || 0) + 1,
      max: MAX_VOICE_TWEETS,
    })
  } catch (err) {
    console.error('Voice library add error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add to voice library' },
      { status: 500 }
    )
  }
}

// DELETE - Remove from voice library
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Tweet ID is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('voice_library')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get new count
  const { count } = await supabase
    .from('voice_library')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return NextResponse.json({ 
    success: true,
    count: count || 0,
    max: MAX_VOICE_TWEETS,
  })
}

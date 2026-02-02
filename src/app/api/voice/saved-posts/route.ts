import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all saved posts (unlimited)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('saved_posts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST - Add a saved post (unlimited)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { tweet_text, tweet_url, author_username, is_own_tweet } = body

    if (!tweet_text || tweet_text.trim().length === 0) {
      return NextResponse.json({ error: 'Tweet text is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('saved_posts')
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

    return NextResponse.json(data)
  } catch (err) {
    console.error('Save post error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save post' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a saved post
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('saved_posts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

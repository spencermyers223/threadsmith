import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('voice_samples')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { tweets } = await request.json()

    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      return NextResponse.json({ error: 'No tweets provided' }, { status: 400 })
    }

    // Parse tweets - each entry can be { text, url } or just a string
    const samples = tweets
      .map((t: string | { text: string; url?: string }) => {
        const text = typeof t === 'string' ? t.trim() : t.text?.trim()
        const url = typeof t === 'string' ? null : t.url?.trim() || null
        return text ? { user_id: user.id, tweet_text: text, tweet_url: url } : null
      })
      .filter(Boolean)

    if (samples.length === 0) {
      return NextResponse.json({ error: 'No valid tweets found' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('voice_samples')
      .insert(samples)
      .select()

    if (error) throw error

    return NextResponse.json({ inserted: data?.length || 0, samples: data })
  } catch (err) {
    console.error('Voice samples insert error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save samples' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (id) {
    // Delete single sample
    const { error } = await supabase
      .from('voice_samples')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // Delete all samples
    const { error } = await supabase
      .from('voice_samples')
      .delete()
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

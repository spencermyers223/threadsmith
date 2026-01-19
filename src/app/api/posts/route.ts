import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  let query = supabase
    .from('posts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (startDate) {
    query = query.gte('scheduled_date', startDate)
  }

  if (endDate) {
    query = query.lte('scheduled_date', endDate)
  }

  const { data: posts, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(posts)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, type, title, content, status, scheduled_date, scheduled_time } = body

    // Validate type
    if (!['tweet', 'thread', 'article'].includes(type)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }

    // Validate status
    if (!['draft', 'scheduled', 'posted'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const postData = {
      user_id: user.id,
      type,
      title,
      content,
      status,
      scheduled_date: scheduled_date || null,
      scheduled_time: scheduled_time || null,
      updated_at: new Date().toISOString(),
    }

    let result

    if (id) {
      // Update existing post
      const { data, error } = await supabase
        .from('posts')
        .update(postData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new post
      const { data, error } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Posts API error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Operation failed' }, { status: 500 })
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Helper to transform post with tags
function transformPostWithTags(post: {
  post_tags?: Array<{ tags: { id: string; name: string; color: string } }>
  [key: string]: unknown
}) {
  return {
    ...post,
    tags: post.post_tags?.map(pt => pt.tags).filter(Boolean) || [],
    post_tags: undefined,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      *,
      post_tags (
        tag_id,
        tags (
          id,
          name,
          color
        )
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  return NextResponse.json(transformPostWithTags(post))
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const {
      content,
      type,
      title,
      archetype,
      status,
      scheduled_date,
      scheduled_time,
      scheduledDate,
      scheduledTime,
      tagIds,
    } = body

    // Support both snake_case and camelCase for dates
    const finalScheduledDate = scheduled_date ?? scheduledDate
    const finalScheduledTime = scheduled_time ?? scheduledTime

    // Validate type if provided
    if (type && !['tweet', 'thread', 'article'].includes(type)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }

    // Validate status if provided
    if (status && !['draft', 'scheduled', 'posted'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Validate archetype if provided
    const validArchetypes = ['scroll_stopper', 'debate_starter', 'viral_catalyst']
    if (archetype && !validArchetypes.includes(archetype)) {
      return NextResponse.json({ error: 'Invalid archetype' }, { status: 400 })
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (content !== undefined) updateData.content = content
    if (type !== undefined) updateData.type = type
    if (title !== undefined) updateData.title = title
    if (archetype !== undefined) updateData.archetype = archetype
    if (status !== undefined) updateData.status = status
    if (finalScheduledDate !== undefined) updateData.scheduled_date = finalScheduledDate || null
    if (finalScheduledTime !== undefined) updateData.scheduled_time = finalScheduledTime || null

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    // Handle tags if provided
    if (tagIds !== undefined && Array.isArray(tagIds)) {
      // Remove existing tags
      await supabase
        .from('post_tags')
        .delete()
        .eq('post_id', id)

      // Add new tags if any
      if (tagIds.length > 0) {
        const tagInserts = tagIds.map((tagId: string) => ({
          post_id: id,
          tag_id: tagId,
        }))

        await supabase
          .from('post_tags')
          .insert(tagInserts)
      }
    }

    // Fetch updated post with tags
    const { data: postWithTags, error: fetchError } = await supabase
      .from('posts')
      .select(`
        *,
        post_tags (
          tag_id,
          tags (
            id,
            name,
            color
          )
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json({ ...data, tags: [] })
    }

    return NextResponse.json(transformPostWithTags(postWithTags))
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { status } = body

    if (!status || !['draft', 'scheduled', 'posted'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { error } = await supabase
      .from('posts')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    // Fetch updated post with tags
    const { data: postWithTags, error: fetchError } = await supabase
      .from('posts')
      .select(`
        *,
        post_tags (
          tag_id,
          tags (
            id,
            name,
            color
          )
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json(transformPostWithTags(postWithTags))
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // post_tags will be deleted via cascade
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

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
  const generationType = searchParams.get('generation_type') || searchParams.get('archetype')
  const tagId = searchParams.get('tagId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  // If filtering by tag, we need to join through post_tags
  if (tagId) {
    // First get post IDs that have this tag
    const { data: postTags, error: tagError } = await supabase
      .from('post_tags')
      .select('post_id')
      .eq('tag_id', tagId)

    if (tagError) {
      return NextResponse.json({ error: tagError.message }, { status: 500 })
    }

    const postIds = postTags?.map(pt => pt.post_id) || []

    if (postIds.length === 0) {
      return NextResponse.json([])
    }

    let query = supabase
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
      .eq('user_id', user.id)
      .in('id', postIds)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (generationType) query = query.eq('generation_type', generationType)
    if (startDate) query = query.gte('scheduled_date', startDate)
    if (endDate) query = query.lte('scheduled_date', endDate)

    const { data: posts, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform the response to flatten tags
    const transformedPosts = posts?.map(post => ({
      ...post,
      tags: post.post_tags?.map((pt: { tags: { id: string; name: string; color: string } }) => pt.tags).filter(Boolean) || [],
      post_tags: undefined,
    }))

    return NextResponse.json(transformedPosts)
  }

  // Regular query without tag filter
  let query = supabase
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
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (generationType) query = query.eq('generation_type', generationType)
  if (startDate) query = query.gte('scheduled_date', startDate)
  if (endDate) query = query.lte('scheduled_date', endDate)

  const { data: posts, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transform the response to flatten tags
  const transformedPosts = posts?.map(post => ({
    ...post,
    tags: post.post_tags?.map((pt: { tags: { id: string; name: string; color: string } }) => pt.tags).filter(Boolean) || [],
    post_tags: undefined,
  }))

  return NextResponse.json(transformedPosts)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      id,
      content,
      type,
      title,
      archetype,
      generation_type,
      status = 'draft',
      scheduled_date,
      scheduled_time,
      scheduledDate,
      scheduledTime,
      tagIds,
    } = body

    // Support both snake_case and camelCase for dates
    const finalScheduledDate = scheduled_date || scheduledDate || null
    const finalScheduledTime = scheduled_time || scheduledTime || null

    // Support both archetype and generation_type field names
    const finalGenerationType = archetype || generation_type || null

    // Validate type
    if (type && !['tweet', 'thread', 'article'].includes(type)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }

    // Validate status
    if (status && !['draft', 'scheduled', 'posted'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Validate generation_type/archetype
    const validArchetypes = ['scroll_stopper', 'debate_starter', 'viral_catalyst', 'market_take', 'hot_take', 'on_chain_insight', 'alpha_thread', 'protocol_breakdown', 'build_in_public', 'user_generated']
    if (finalGenerationType && !validArchetypes.includes(finalGenerationType)) {
      return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 })
    }

    const postData = {
      user_id: user.id,
      content,
      type: type || 'tweet',
      title: title || null,
      generation_type: finalGenerationType,
      status,
      scheduled_date: finalScheduledDate,
      scheduled_time: finalScheduledTime,
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

    // Handle tags if provided
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      // First, remove existing tags for this post
      await supabase
        .from('post_tags')
        .delete()
        .eq('post_id', result.id)

      // Then add new tags
      const tagInserts = tagIds.map((tagId: string) => ({
        post_id: result.id,
        tag_id: tagId,
      }))

      await supabase
        .from('post_tags')
        .insert(tagInserts)
    }

    // Fetch the post with tags
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
      .eq('id', result.id)
      .single()

    if (fetchError) {
      // Return the post without tags if fetch fails
      return NextResponse.json({ ...result, tags: [] })
    }

    // Transform response
    const transformedPost = {
      ...postWithTags,
      tags: postWithTags.post_tags?.map((pt: { tags: { id: string; name: string; color: string } }) => pt.tags).filter(Boolean) || [],
      post_tags: undefined,
    }

    return NextResponse.json(transformedPost, { status: id ? 200 : 201 })
  } catch (err) {
    console.error('Posts API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Operation failed' },
      { status: 500 }
    )
  }
}

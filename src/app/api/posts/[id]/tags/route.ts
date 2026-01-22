import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: postId } = await params

  try {
    const body = await request.json()
    const { tagId } = body

    if (!tagId) {
      return NextResponse.json({ error: 'tagId is required' }, { status: 400 })
    }

    // Verify user owns the post
    const { data: post } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .eq('user_id', user.id)
      .single()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Verify user owns the tag
    const { data: tag } = await supabase
      .from('tags')
      .select('id')
      .eq('id', tagId)
      .eq('user_id', user.id)
      .single()

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Check if relationship already exists
    const { data: existing } = await supabase
      .from('post_tags')
      .select('post_id')
      .eq('post_id', postId)
      .eq('tag_id', tagId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Tag already added to this post' }, { status: 400 })
    }

    // Create the relationship
    const { error } = await supabase
      .from('post_tags')
      .insert({
        post_id: postId,
        tag_id: tagId,
      })

    if (error) {
      throw error
    }

    // Fetch and return the tag details
    const { data: addedTag } = await supabase
      .from('tags')
      .select('id, name, color')
      .eq('id', tagId)
      .single()

    return NextResponse.json(addedTag, { status: 201 })
  } catch (err) {
    console.error('Post tags API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add tag' },
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

  const { id: postId } = await params

  try {
    const body = await request.json()
    const { tagId } = body

    if (!tagId) {
      return NextResponse.json({ error: 'tagId is required' }, { status: 400 })
    }

    // Verify user owns the post
    const { data: post } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .eq('user_id', user.id)
      .single()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Remove the relationship
    const { error } = await supabase
      .from('post_tags')
      .delete()
      .eq('post_id', postId)
      .eq('tag_id', tagId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Post tags API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to remove tag' },
      { status: 500 }
    )
  }
}

// GET all tags for a specific post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: postId } = await params

  // Verify user owns the post
  const { data: post } = await supabase
    .from('posts')
    .select('id')
    .eq('id', postId)
    .eq('user_id', user.id)
    .single()

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  // Get all tags for this post
  const { data: postTags, error } = await supabase
    .from('post_tags')
    .select(`
      tag_id,
      tags (
        id,
        name,
        color
      )
    `)
    .eq('post_id', postId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const tags = postTags?.map(pt => pt.tags).filter(Boolean) || []

  return NextResponse.json(tags)
}

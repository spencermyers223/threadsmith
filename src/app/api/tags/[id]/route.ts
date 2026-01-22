import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

  const { data: tag, error } = await supabase
    .from('tags')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !tag) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
  }

  return NextResponse.json(tag)
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
    const { name, color } = body

    // Verify ownership
    const { data: existingTag } = await supabase
      .from('tags')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Check for duplicate name if name is being changed
    if (name) {
      const { data: duplicate } = await supabase
        .from('tags')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', name.trim())
        .neq('id', id)
        .single()

      if (duplicate) {
        return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 400 })
      }
    }

    const updateData: { name?: string; color?: string; updated_at: string } = {
      updated_at: new Date().toISOString(),
    }

    if (name) updateData.name = name.trim()
    if (color) updateData.color = color

    const { data: tag, error } = await supabase
      .from('tags')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(tag)
  } catch (err) {
    console.error('Tags API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update tag' },
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

  // Verify ownership before deleting
  const { data: existingTag } = await supabase
    .from('tags')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existingTag) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
  }

  // Delete tag (cascade will handle post_tags)
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

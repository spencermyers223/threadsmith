import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
    const { name, color } = await request.json()

    // At least one field must be provided
    if (!name && !color) {
      return NextResponse.json({ error: 'Name or color is required' }, { status: 400 })
    }

    // Check folder exists and belongs to user
    const { data: folder, error: fetchError } = await supabase
      .from('folders')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Build update object
    const updateData: { name?: string; color?: string } = {}

    if (name) {
      const trimmedName = name.trim()
      if (trimmedName.length === 0) {
        return NextResponse.json({ error: 'Folder name cannot be empty' }, { status: 400 })
      }

      // Check for duplicate folder names (excluding current folder)
      const { data: existing } = await supabase
        .from('folders')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', trimmedName)
        .neq('id', id)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'A folder with this name already exists' }, { status: 400 })
      }

      updateData.name = trimmedName
    }

    if (color) {
      updateData.color = color
    }

    const { data, error } = await supabase
      .from('folders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Update folder error:', err)
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 })
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

  // Check folder exists and belongs to user
  const { data: folder, error: fetchError } = await supabase
    .from('folders')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !folder) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
  }

  // Move all files in this folder back to root (set folder_id to null)
  const { error: moveError } = await supabase
    .from('files')
    .update({ folder_id: null })
    .eq('folder_id', id)

  if (moveError) {
    console.error('Error moving files to root:', moveError)
    return NextResponse.json({ error: 'Failed to move files out of folder' }, { status: 500 })
  }

  // Delete the folder
  const { error: deleteError } = await supabase
    .from('folders')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

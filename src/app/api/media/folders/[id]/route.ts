import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/media/folders/[id] - Rename folder
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
  const body = await request.json()
  const { name } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
  }

  const trimmedName = name.trim()

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('media_folders')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
  }

  // Check for duplicate name (excluding current folder)
  const { data: duplicate } = await supabase
    .from('media_folders')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', trimmedName)
    .neq('id', id)
    .single()

  if (duplicate) {
    return NextResponse.json({ error: 'A folder with this name already exists' }, { status: 409 })
  }

  const { data: folder, error } = await supabase
    .from('media_folders')
    .update({
      name: trimmedName,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Update folder error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get media count
  const { count } = await supabase
    .from('user_media')
    .select('*', { count: 'exact', head: true })
    .eq('folder_id', id)

  return NextResponse.json({ ...folder, media_count: count || 0 })
}

// DELETE /api/media/folders/[id] - Delete folder (media becomes unfiled)
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

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('media_folders')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
  }

  // Media in this folder will automatically have folder_id set to NULL
  // due to ON DELETE SET NULL in the foreign key constraint

  const { error } = await supabase
    .from('media_folders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Delete folder error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

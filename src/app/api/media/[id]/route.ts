import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/media/[id] - Get single media item
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

  const { data: media, error } = await supabase
    .from('user_media')
    .select(`
      *,
      folder:media_folders(id, name)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  }

  return NextResponse.json(media)
}

// PATCH /api/media/[id] - Update media item (move to folder, rename)
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
  const { folder_id, original_filename } = body

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('user_media')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  }

  // Build update object
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  // Handle folder_id (can be null to unfiled, or a valid folder id)
  if (folder_id !== undefined) {
    if (folder_id === null) {
      updates.folder_id = null
    } else {
      // Validate folder belongs to user
      const { data: folder } = await supabase
        .from('media_folders')
        .select('id')
        .eq('id', folder_id)
        .eq('user_id', user.id)
        .single()
      
      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
      }
      updates.folder_id = folder_id
    }
  }

  if (original_filename) {
    updates.original_filename = original_filename
  }

  const { data: media, error: updateError } = await supabase
    .from('user_media')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(`
      *,
      folder:media_folders(id, name)
    `)
    .single()

  if (updateError) {
    console.error('Update error:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(media)
}

// DELETE /api/media/[id] - Delete media item
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

  // Get media item to find storage path
  const { data: media, error: fetchError } = await supabase
    .from('user_media')
    .select('id, storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  }

  const admin = createAdminClient()

  // Delete from storage
  const { error: storageError } = await admin.storage
    .from('user-media')
    .remove([media.storage_path])

  if (storageError) {
    console.error('Storage delete error:', storageError)
    // Continue anyway - database record should still be deleted
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('user_media')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('Delete error:', deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

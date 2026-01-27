import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

interface MediaItem {
  url: string
  type: string
  filename: string
  size: number
  created_at: string
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, filename } = await params
  const decodedFilename = decodeURIComponent(filename)

  // Verify the post belongs to the user
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, media')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (postError || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const admin = createAdminClient()
  const storagePath = `${id}/${decodedFilename}`

  // Remove from storage
  const { error: deleteError } = await admin.storage
    .from('post-media')
    .remove([storagePath])

  if (deleteError) {
    console.error('Storage delete error:', deleteError)
    // Continue anyway to clean up the DB reference
  }

  // Remove from post's media array
  const existingMedia: MediaItem[] = Array.isArray(post.media) ? post.media : []
  const updatedMedia = existingMedia.filter((m: MediaItem) => m.filename !== decodedFilename)

  const { error: updateError } = await supabase
    .from('posts')
    .update({ media: updatedMedia })
    .eq('id', id)
    .eq('user_id', user.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

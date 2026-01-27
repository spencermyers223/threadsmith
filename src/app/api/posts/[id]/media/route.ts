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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

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

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  const admin = createAdminClient()
  const storagePath = `${id}/${file.name}`

  // Upload to storage
  const { error: uploadError } = await admin.storage
    .from('post-media')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get public URL
  const { data: urlData } = admin.storage
    .from('post-media')
    .getPublicUrl(storagePath)

  const mediaItem: MediaItem = {
    url: urlData.publicUrl,
    type: file.type,
    filename: file.name,
    size: file.size,
    created_at: new Date().toISOString(),
  }

  // Update post's media array
  const existingMedia: MediaItem[] = Array.isArray(post.media) ? post.media : []
  // Replace if same filename, otherwise append
  const filtered = existingMedia.filter((m: MediaItem) => m.filename !== file.name)
  const updatedMedia = [...filtered, mediaItem]

  const { error: updateError } = await supabase
    .from('posts')
    .update({ media: updatedMedia })
    .eq('id', id)
    .eq('user_id', user.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(mediaItem)
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
    .select('media')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  return NextResponse.json({ media: post.media || [] })
}

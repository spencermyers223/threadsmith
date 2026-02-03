import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export interface UserMediaItem {
  id: string
  user_id: string
  folder_id: string | null
  url: string
  filename: string
  original_filename: string
  type: string
  size: number
  width: number | null
  height: number | null
  storage_path: string
  created_at: string
  updated_at: string
  folder?: {
    id: string
    name: string
  } | null
}

// GET /api/media - List user's media library
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const folderId = searchParams.get('folder_id')
  const typeFilter = searchParams.get('type') // 'image' | 'video' | null (all)
  const sortBy = searchParams.get('sort') || 'created_at' // 'created_at' | 'filename' | 'size'
  const sortOrder = searchParams.get('order') || 'desc' // 'asc' | 'desc'
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('user_media')
    .select(`
      *,
      folder:media_folders(id, name)
    `, { count: 'exact' })
    .eq('user_id', user.id)

  // Filter by folder
  if (folderId === 'null' || folderId === 'unfiled') {
    query = query.is('folder_id', null)
  } else if (folderId) {
    query = query.eq('folder_id', folderId)
  }

  // Filter by type
  if (typeFilter === 'image') {
    query = query.like('type', 'image/%')
  } else if (typeFilter === 'video') {
    query = query.like('type', 'video/%')
  }

  // Sorting
  const ascending = sortOrder === 'asc'
  if (sortBy === 'filename') {
    query = query.order('original_filename', { ascending })
  } else if (sortBy === 'size') {
    query = query.order('size', { ascending })
  } else {
    query = query.order('created_at', { ascending })
  }

  // Pagination
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Media list error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    media: data || [],
    total: count || 0,
    limit,
    offset
  })
}

// POST /api/media - Upload to media library
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const folderId = formData.get('folder_id') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate file size (50MB for videos, 10MB for images)
  const isVideo = file.type.startsWith('video/')
  const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({ 
      error: `File too large (max ${isVideo ? '50MB' : '10MB'})` 
    }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  // Generate unique filename
  const ext = file.name.split('.').pop() || 'bin'
  const timestamp = Date.now()
  const uniqueFilename = `${timestamp}-${Math.random().toString(36).substring(2, 8)}.${ext}`
  const storagePath = `${user.id}/${uniqueFilename}`

  const admin = createAdminClient()

  // Upload to storage
  const { error: uploadError } = await admin.storage
    .from('user-media')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get public URL
  const { data: urlData } = admin.storage
    .from('user-media')
    .getPublicUrl(storagePath)

  // Validate folder_id if provided
  if (folderId) {
    const { data: folder } = await supabase
      .from('media_folders')
      .select('id')
      .eq('id', folderId)
      .eq('user_id', user.id)
      .single()
    
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }
  }

  // Insert into database
  const { data: mediaItem, error: insertError } = await supabase
    .from('user_media')
    .insert({
      user_id: user.id,
      folder_id: folderId || null,
      url: urlData.publicUrl,
      filename: uniqueFilename,
      original_filename: file.name,
      type: file.type,
      size: file.size,
      storage_path: storagePath,
    })
    .select(`
      *,
      folder:media_folders(id, name)
    `)
    .single()

  if (insertError) {
    console.error('Insert error:', insertError)
    // Try to clean up uploaded file
    await admin.storage.from('user-media').remove([storagePath])
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(mediaItem, { status: 201 })
}

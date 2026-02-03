import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export interface MediaFolder {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
  media_count?: number
}

// GET /api/media/folders - List user's media folders
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get folders with media count
  const { data: folders, error } = await supabase
    .from('media_folders')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) {
    console.error('Folders list error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get media counts for each folder
  const { data: mediaCounts } = await supabase
    .from('user_media')
    .select('folder_id')
    .eq('user_id', user.id)
    .not('folder_id', 'is', null)

  // Count media per folder
  const countMap: Record<string, number> = {}
  mediaCounts?.forEach(m => {
    if (m.folder_id) {
      countMap[m.folder_id] = (countMap[m.folder_id] || 0) + 1
    }
  })

  // Get unfiled count
  const { count: unfiledCount } = await supabase
    .from('user_media')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('folder_id', null)

  const foldersWithCount = folders?.map(f => ({
    ...f,
    media_count: countMap[f.id] || 0
  })) || []

  return NextResponse.json({
    folders: foldersWithCount,
    unfiled_count: unfiledCount || 0
  })
}

// POST /api/media/folders - Create a new folder
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
  }

  const trimmedName = name.trim()

  // Check for duplicate name
  const { data: existing } = await supabase
    .from('media_folders')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', trimmedName)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'A folder with this name already exists' }, { status: 409 })
  }

  const { data: folder, error } = await supabase
    .from('media_folders')
    .insert({
      user_id: user.id,
      name: trimmedName
    })
    .select()
    .single()

  if (error) {
    console.error('Create folder error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ...folder, media_count: 0 }, { status: 201 })
}

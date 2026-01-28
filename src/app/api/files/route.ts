import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: files, error } = await supabase
    .from('files')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(files)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name
    const ext = fileName.split('.').pop()?.toLowerCase()

    if (!['docx', 'md', 'txt'].includes(ext || '')) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: .docx, .md, .txt' },
        { status: 400 }
      )
    }

    // Extract text content based on file type
    let content: string = ''
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (ext === 'docx') {
      // Convert to HTML and keep it — TipTap can render it directly
      const result = await mammoth.convertToHtml({ buffer })
      content = result.value
    } else {
      // .md and .txt - read as plain text
      content = buffer.toString('utf-8')
    }

    // Upload file to Supabase Storage
    const storagePath = `${user.id}/${Date.now()}-${fileName}`
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(storagePath, file)

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      // Continue without storage if it fails - we still have the content
    }

    // Save metadata to database
    const { data, error: dbError } = await supabase
      .from('files')
      .insert({
        user_id: user.id,
        name: fileName,
        file_type: ext,
        content,
        storage_path: storagePath,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('File upload error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'File upload failed' }, { status: 500 })
  }
}

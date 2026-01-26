import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import mammoth from 'mammoth'

function cleanHtmlToText(html: string): string {
  return html
    // Replace block elements with double newlines for paragraph separation
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/ul>|<\/ol>/gi, '\n')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Normalize whitespace: collapse multiple spaces to single
    .replace(/[ \t]+/g, ' ')
    // Normalize newlines: collapse 3+ newlines to double newlines
    .replace(/\n{3,}/g, '\n\n')
    // Trim whitespace from start/end of each line
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    .trim()
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch all docx files for the user
    const { data: files, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id)
      .eq('file_type', 'docx')

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ message: 'No docx files to reprocess', processed: 0 })
    }

    const results: { id: string; name: string; status: 'success' | 'error'; error?: string }[] = []

    for (const file of files) {
      try {
        if (!file.storage_path) {
          results.push({ id: file.id, name: file.name, status: 'error', error: 'No storage path' })
          continue
        }

        // Download the original file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('files')
          .download(file.storage_path)

        if (downloadError || !fileData) {
          results.push({ id: file.id, name: file.name, status: 'error', error: downloadError?.message || 'Download failed' })
          continue
        }

        // Convert to buffer and reprocess with mammoth
        const arrayBuffer = await fileData.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const result = await mammoth.convertToHtml({ buffer })
        const cleanContent = cleanHtmlToText(result.value)

        // Update the file content in the database
        const { error: updateError } = await supabase
          .from('files')
          .update({ content: cleanContent, updated_at: new Date().toISOString() })
          .eq('id', file.id)

        if (updateError) {
          results.push({ id: file.id, name: file.name, status: 'error', error: updateError.message })
        } else {
          results.push({ id: file.id, name: file.name, status: 'success' })
        }
      } catch (err) {
        results.push({
          id: file.id,
          name: file.name,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length

    return NextResponse.json({
      message: `Reprocessed ${successCount} files successfully, ${errorCount} errors`,
      processed: successCount,
      errors: errorCount,
      details: results
    })
  } catch (err) {
    console.error('Reprocess error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Reprocess failed'
    }, { status: 500 })
  }
}

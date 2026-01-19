import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

const SYSTEM_PROMPT = `You are an X/Twitter content editor. Your job is to polish the user's ideas into ready-to-post content.

## CRITICAL OUTPUT RULE
Output ONLY the post content itself. No preamble, no attribution to the user's research, no meta-commentary. The user knows it's their content - just give them the polished version ready to post.

NEVER include phrases like:
- "Your research indicates..."
- "According to your research..."
- "As you've identified..."
- "Based on your notes..."
- "Using your research..."
- "From your notes..."
- "You mentioned that..."
- "Here's a post based on..."
- "This captures your point about..."

Just output the actual tweet/thread/article text. Nothing else.

## EDITING PRINCIPLES (apply silently)
- Use the user's actual words and phrases as much as possible
- Only fix grammar, structure, and flow - don't rewrite in AI language
- Structure as Hook → Value → CTA
- Keep their authentic voice - don't make it sound generic

## X ALGORITHM OPTIMIZATION (apply silently)
- Replies are worth 150x more than likes
- External links get penalized - suggest putting in reply if needed
- Questions prompt engagement
- 1-2 hashtags max
- For threads: 5-15 tweets, each stands alone

## OUTPUT FORMAT

**Option 1:**
[The actual post content ready to copy/paste]

**Option 2:**
[Different angle, also ready to copy/paste]

**Option 3:**
[Another variation, ready to copy/paste]

*Why these work:* [Brief 1-2 sentence note on algorithm optimization - this is the ONLY commentary allowed]

## CONTENT TYPES
- Tweet: 280 chars (or 4000 for long-form), punchy, one insight
- Thread: Numbered tweets (1/, 2/, etc.), each tweet complete
- Article: Long-form with subheadings

Remember: The user will copy your output directly to X. Give them ONLY what they would actually post.`

// Patterns to detect folder references in user messages
const FOLDER_PATTERNS = [
  /(?:use|using|from|reference|with|in)\s+(?:my\s+)?["']?([^"'\n]+?)["']?\s+folder/i,
  /(?:my\s+)?["']?([^"'\n]+?)["']?\s+folder\s+(?:content|files|notes|research)/i,
  /folder\s+(?:called|named)\s+["']?([^"'\n]+?)["']?/i,
  /["']([^"'\n]+?)["']\s+folder/i,
]

// Extract folder name from message if referenced
function extractFolderReference(message: string): string | null {
  for (const pattern of FOLDER_PATTERNS) {
    const match = message.match(pattern)
    if (match && match[1]) {
      // Clean up the folder name
      return match[1].trim().replace(/\s+/g, ' ')
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { message, contentType, useAllFiles, selectedFileIds } = await request.json()

    // Check for folder reference in the message
    const folderReference = extractFolderReference(message)
    let fileContext = ''
    let folderError = ''

    if (folderReference) {
      // User mentioned a specific folder - find it by name (case-insensitive)
      const { data: folders } = await supabase
        .from('folders')
        .select('id, name')
        .eq('user_id', user.id)
        .ilike('name', folderReference)

      if (folders && folders.length > 0) {
        const folder = folders[0]

        // Get all files in this folder
        const { data: files } = await supabase
          .from('files')
          .select('name, content')
          .eq('user_id', user.id)
          .eq('folder_id', folder.id)

        if (files && files.length > 0) {
          fileContext = `\n\n<user_research_notes folder="${folder.name}">\n` +
            files.map(f => `### ${f.name}\n${f.content}`).join('\n\n') +
            '\n</user_research_notes>\n'
        } else {
          folderError = `I found your "${folder.name}" folder, but it doesn't contain any files yet. Please add some files to this folder first.`
        }
      } else {
        // Folder not found - get list of available folders to help user
        const { data: availableFolders } = await supabase
          .from('folders')
          .select('name')
          .eq('user_id', user.id)

        const folderList = availableFolders && availableFolders.length > 0
          ? `\n\nYour available folders are: ${availableFolders.map(f => `"${f.name}"`).join(', ')}`
          : '\n\nYou don\'t have any folders created yet. Create a folder in the sidebar and add files to it.'

        folderError = `I couldn't find a folder called "${folderReference}".${folderList}`
      }
    } else if (useAllFiles || (selectedFileIds && selectedFileIds.length > 0)) {
      // Original logic for useAllFiles or selected files
      const query = supabase
        .from('files')
        .select('name, content')
        .eq('user_id', user.id)

      if (!useAllFiles && selectedFileIds.length > 0) {
        query.in('id', selectedFileIds)
      }

      const { data: files } = await query

      if (files && files.length > 0) {
        fileContext = '\n\n<user_research_notes>\n' +
          files.map(f => `### ${f.name}\n${f.content}`).join('\n\n') +
          '\n</user_research_notes>\n'
      }
    }

    // If there's a folder error, return it as an assistant message
    if (folderError) {
      const encoder = new TextEncoder()
      const errorStream = new ReadableStream({
        start(controller) {
          const data = JSON.stringify({ content: folderError })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      return new Response(errorStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    const userPrompt = `Content type: ${contentType.toUpperCase()}

${message}
${fileContext}
Generate 2-3 options ready to post.`

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta as { type: string; text?: string }
              if (delta.type === 'text_delta' && delta.text) {
                const data = JSON.stringify({ content: delta.text })
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Stream error:', error)
          controller.error(error)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('Chat API error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Chat failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

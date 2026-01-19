import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all conversations for the user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('conversations')
    .select('id, messages, writing_assistant_mode, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Add a title based on the first user message
  const conversationsWithTitle = data?.map(conv => {
    const messages = conv.messages as Array<{ role: string; content: string }>
    const isWritingAssistant = conv.writing_assistant_mode === true
    const firstUserMessage = messages?.find(m => m.role === 'user')

    // For writing assistant convos, use a different default title
    const defaultTitle = isWritingAssistant ? 'Writing Session' : 'New conversation'
    const title = firstUserMessage?.content?.slice(0, 50) || defaultTitle

    return {
      ...conv,
      title: title + (firstUserMessage?.content && firstUserMessage.content.length > 50 ? '...' : ''),
      writing_assistant_mode: isWritingAssistant
    }
  })

  return NextResponse.json(conversationsWithTitle || [])
}

// POST - Create a new conversation or update existing
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { conversationId, messages, writing_assistant_mode } = await request.json()

    if (conversationId) {
      // Update existing conversation
      const updateData: Record<string, unknown> = {
        messages,
        updated_at: new Date().toISOString()
      }

      // Only include writing_assistant_mode if explicitly set
      if (typeof writing_assistant_mode === 'boolean') {
        updateData.writing_assistant_mode = writing_assistant_mode
      }

      const { data, error } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      // Create new conversation
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        messages
      }

      // Only include writing_assistant_mode if explicitly set
      if (typeof writing_assistant_mode === 'boolean') {
        insertData.writing_assistant_mode = writing_assistant_mode
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

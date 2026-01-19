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
    .select('id, messages, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Add a title based on the first user message
  const conversationsWithTitle = data?.map(conv => {
    const messages = conv.messages as Array<{ role: string; content: string }>
    const firstUserMessage = messages?.find(m => m.role === 'user')
    const title = firstUserMessage?.content?.slice(0, 50) || 'New conversation'
    return {
      ...conv,
      title: title + (firstUserMessage?.content && firstUserMessage.content.length > 50 ? '...' : '')
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
    const { conversationId, messages } = await request.json()

    if (conversationId) {
      // Update existing conversation
      const { data, error } = await supabase
        .from('conversations')
        .update({
          messages,
          updated_at: new Date().toISOString()
        })
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
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          messages
        })
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

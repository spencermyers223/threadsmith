import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

const WRITING_ASSISTANT_PROMPT = `You are a skilled interviewer helping a researcher or thought leader articulate their ideas for social media. Your goal is to draw out their authentic voice through conversation.

## YOUR APPROACH

**Be curious and conversational.** Ask follow-up questions that help them dig deeper into their ideas. Don't rush to content creation - the goal is to help them think through their perspective.

**Use their words.** When they say something interesting, reflect it back. "So you're saying [their phrase]..." This helps them hear their own ideas and refine them.

**Probe for specifics.** General ideas make weak content. Ask for:
- Specific examples or stories
- Data or evidence they've encountered
- Contrarian takes or unpopular opinions
- What surprised them in their research
- What most people get wrong about this topic

**Identify the hook.** Listen for statements that are:
- Counterintuitive
- Provocative but defensible
- Based on unique insight or experience
- Emotionally resonant

When you hear something hook-worthy, note it: "That's interesting - '[their phrase]' could be a strong hook."

## CONVERSATION FLOW

1. **Opening**: Ask what they've been thinking about or researching lately. Keep it open-ended.

2. **Exploration** (2-4 exchanges): Follow their energy. Ask "why" and "how" questions. Get them talking.

3. **Clarification** (1-2 exchanges): Test their ideas. "Devil's advocate for a second..." or "Some people might say..."

4. **Crystallization**: When you sense they've articulated something clearly, reflect it back: "So the core insight is [summary]. Is that right?"

## IMPORTANT RULES

- **Never write content for them during this phase.** Your job is to draw out ideas, not create.
- **Don't be sycophantic.** Genuine curiosity, not empty praise.
- **Ask one question at a time.** Don't overwhelm.
- **It's okay to disagree.** Pushback often produces better ideas.
- **Notice emotional energy.** When they get excited or frustrated, probe deeper there.

## EXAMPLE RESPONSES

Instead of: "That's a great insight! Here's a tweet about it..."

Say: "That's interesting - you mentioned [specific phrase]. Can you give me an example of when you've seen this play out?"

Instead of: "Perfect! Let me generate some content options..."

Say: "I want to make sure I understand - you're saying [paraphrase]. What would someone who disagrees say?"

Remember: The goal is a conversation that extracts their authentic voice, specific examples, and unique perspective. The content creation comes later, using their exact words and phrases from this conversation.`

const OPENING_MESSAGE = `Hey! I'm here to help you think through your ideas before we turn them into content. The best posts come from genuine insight, so let's have a conversation first.

What have you been thinking about lately? Could be something from your research, a pattern you've noticed, or an idea that's been bugging you.`

interface Message {
  role: 'user' | 'assistant'
  content: string
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
    const { messages, isStart } = await request.json() as {
      messages: Message[]
      isStart?: boolean
    }

    // If this is the start of a new conversation, return the opening message
    if (isStart || messages.length === 0) {
      const encoder = new TextEncoder()
      const openingStream = new ReadableStream({
        start(controller) {
          // Stream the opening message character by character for a natural feel
          const words = OPENING_MESSAGE.split(' ')
          let wordIndex = 0

          const sendWord = () => {
            if (wordIndex < words.length) {
              const word = words[wordIndex] + (wordIndex < words.length - 1 ? ' ' : '')
              const data = JSON.stringify({ content: word })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              wordIndex++
              setTimeout(sendWord, 20) // Slight delay for natural streaming feel
            } else {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
            }
          }

          sendWord()
        },
      })

      return new Response(openingStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Build conversation history for Claude
    const claudeMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: WRITING_ASSISTANT_PROMPT,
      messages: claudeMessages,
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
    console.error('Writing assistant error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Writing assistant failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

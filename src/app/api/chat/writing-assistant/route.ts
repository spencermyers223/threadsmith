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

// Editing tool prompts
const EDITING_PROMPTS: Record<string, string> = {
  add_hook: `You are an expert at writing scroll-stopping hooks for X/Twitter. Your task is to add a powerful opening line to the given content.

RULES:
- Add ONE hook line at the very beginning of the content
- The hook should make people STOP scrolling
- Use patterns like: counterintuitive statements, bold claims, "Most people think X, but Y", numbers/data, direct challenges
- Keep the rest of the content EXACTLY intact — do not modify, reorder, or remove anything
- Do NOT add quotes around the hook
- Return ONLY the modified content, nothing else

FOR THREADS (content with numbered tweets like "1/ ...", "2/ ..."):
- Replace or enhance the FIRST LINE of tweet 1/ with a stronger hook
- Keep the "1/" prefix and all other tweets exactly as they are
- Do NOT change the numbering or structure
- Example: if tweet 1/ starts with a weak line, rewrite just that opening while keeping the rest of 1/ and all subsequent tweets

HOOK PATTERNS THAT WORK:
- "Most people have this completely backwards..."
- "[Number]% of people get this wrong about [topic]"
- "Hot take: [bold statement]"
- "The [industry/topic] doesn't want you to know this..."
- "I spent [time] studying [topic]. Here's what I found:"
- "Stop doing [common thing]. Here's why:"`,

  humanize: `You are an expert at making social media content sound natural and authentic. Your task is to rewrite the content to sound more human and less AI-generated.

RULES:
- Remove corporate/formal language
- Add natural speech patterns (contractions, casual tone)
- Keep the same core message and length
- Sound like a real person talking to friends
- Avoid buzzwords and jargon
- Return ONLY the modified content, nothing else

THINGS TO FIX:
- "Utilize" → "use"
- "In order to" → "to"
- Overly perfect grammar → natural speech
- Generic statements → specific observations
- Passive voice → active voice`,

  sharpen: `You are an expert at making social media content punchy and concise. Your task is to tighten up the given content.

RULES:
- Cut unnecessary words ruthlessly
- Each word must earn its place
- Keep the core message intact
- Make every sentence punchy
- Aim for 20-30% shorter if possible
- Return ONLY the modified content, nothing else

THINGS TO CUT:
- "I think that" → just state it
- "It's important to note" → just say it
- "In my opinion" → implied
- Filler phrases and hedging
- Redundant adjectives`,

  make_thread: `You are an expert at turning content into engaging X/Twitter threads. Your task is to expand the given content into a numbered thread.

RULES:
- Create 5-10 numbered tweets (1/, 2/, etc.)
- First tweet is the HOOK - must stop scrolls
- Each tweet should be under 280 characters
- Each tweet should stand alone (people see them in isolation)
- Build a narrative arc: hook → context → main points → takeaway
- End with a call to action or question
- Suggest [IMAGE] placement every 3-4 tweets
- Return ONLY the thread content, nothing else

THREAD STRUCTURE:
1/ Scroll-stopping hook
2-3/ Context and why this matters
4-7/ Main points with examples
8-9/ Implications or takeaways
10/ Summary + question for replies`,

  add_question: `You are an expert at adding engagement-driving questions to X/Twitter content. Your task is to add a compelling question that encourages replies.

RULES:
- Add ONE question to the end of the content
- The question should invite discussion and replies
- Make it specific, not generic
- It should relate directly to the content
- Keep the rest of the content intact
- Return ONLY the modified content, nothing else

QUESTION PATTERNS THAT DRIVE REPLIES:
- "What's your experience with [topic]?"
- "Do you agree, or am I off base here?"
- "What am I missing?"
- "Has anyone else noticed this?"
- "Curious - what would you do differently?"
- "Hot take or obvious truth?"
- "Which camp are you in?"`,

  make_spicy: `You are an expert at adding edge and personality to social media content. Your task is to make the content more provocative and attention-grabbing.

RULES:
- Keep the core message but add more edge
- Be bold and opinionated, not rude or offensive
- Challenge conventional wisdom
- Add contrarian angles where appropriate
- Use stronger language and bolder claims
- Make it memorable and quotable
- Return ONLY the modified content, nothing else

WAYS TO ADD SPICE:
- Turn soft opinions into bold claims
- Challenge "everybody knows" assumptions
- Add "uncomfortable truth" framing
- Use more direct, punchy language
- Name what others are afraid to say
- Add stakes ("This is costing you...")
- Create us vs them dynamics ("Most people do X. Winners do Y.")`,
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
    const body = await request.json()

    // Handle editing tool requests
    if (body.action && body.content) {
      const { content, action, isThread } = body as { content: string; action: string; isThread?: boolean }

      const editingPrompt = EDITING_PROMPTS[action]
      if (!editingPrompt) {
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const threadContext = isThread ? '\n\nNOTE: This is a multi-tweet THREAD. Preserve the numbered tweet structure (1/, 2/, etc.) exactly. Only modify the relevant parts.' : ''

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: editingPrompt,
        messages: [{ role: 'user', content: `Here is the content to modify:\n\n${content}${threadContext}` }],
      })

      const textContent = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('\n')

      return new Response(JSON.stringify({ content: textContent.trim() }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Handle conversation mode
    const { messages, isStart } = body as {
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

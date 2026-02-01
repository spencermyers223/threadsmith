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

// Common formatting instruction for all prompts
const FORMATTING_RULE = `

⚠️ CRITICAL FORMATTING RULES:

1. PRESERVE ALL LINE BREAKS exactly as they appear in the input.
   
   WRONG (collapsed):
   "Line one Line two Line three"
   
   RIGHT (preserved):
   "Line one
   
   Line two
   
   Line three"

2. DO NOT add markdown formatting (no **, no ## headers)

3. Return ONLY the modified text - no explanations, no "Here's the improved version:", no quotes around the output

4. Count line breaks in input and ensure same number in output
`

// Editing tool prompts
const EDITING_PROMPTS: Record<string, string> = {
  add_hook: `Add ONE scroll-stopping hook to boost the engagement score.

SCORE TRIGGERS (these are measured by the scorer):
- Starts with NUMBER → +15 points (e.g., "73% of founders...")
- Starts with QUESTION → +15 points (What/Why/How/Do you/Have you)
- Bold claim opener → +20 points (unpopular opinion/hot take/stop/don't/never)

HIGH-SCORING HOOKS:
- "Unpopular opinion: [bold claim]"
- "[Number]% of [group] fail at this"
- "Why do [people] keep [mistake]?"
- "STOP [doing thing]. Here's why:"

EXAMPLE:
INPUT:
Building in public is great for accountability.

It keeps you motivated.

OUTPUT:
Unpopular opinion: Building in public is great for accountability.

It keeps you motivated.

RULES:
1. Add hook at the VERY START (first line)
2. Use at least ONE score trigger
3. Keep REST of content EXACTLY the same (same words, same line breaks)
4. Return ONLY the modified content

⚠️ DO NOT change anything except adding a hook to the first line. Same words. Same line breaks.`,

  humanize: `Make this sound human to boost Readability score (+10-20 points for natural language).

ENGAGEMENT SCORE TARGETS (these are measured):
- Average word length ≤5 chars → +10 points (simple vocabulary)
- Short sentences (not run-on) → +10 points
- Line breaks in longer text → +10 points (scannability)
- Avoiding complex vocabulary → better score

⚠️ PRESERVE THESE SCORE BOOSTERS (don't remove!):
- "Unpopular opinion:", "Hot take:", bold openers → these boost hook score
- Questions at the end (ending with ?) → these boost reply potential
- Numbers at the start → these boost hook score
- "Most people", "Nobody" → these boost reply potential

AI TELLS TO FIX (these sound robotic):
- "Utilize" → "use"
- "In order to" → "to"
- "It's important to" → delete (filler)
- "Leverage" → "use"
- "Dive into" / "delve into" → cut
- "Navigate" → "deal with"
- "Robust" → "strong"
- "Seamless" → "smooth"
- "Unlock" / "Unleash" → "get"
- "Here's the thing:" → delete (BUT keep "Unpopular opinion:", "Hot take:")

HUMAN ELEMENTS (improve readability score):
- Contractions: it's, don't, can't, won't, you're
- Short sentences (break up long ones)
- Simple words (avg <5 chars scores better)
- Natural rhythm, not perfect structure

HARD REQUIREMENTS:
1. Same or shorter length
2. Under 280 characters for single tweets
3. ⚠️ PRESERVE LINE BREAKS
4. ⚠️ PRESERVE hooks, questions, and controversial markers

THE TEST: Read it out loud. If you wouldn't SAY it that way, rewrite it.

CRITICAL: Return ONLY the rewritten content. PRESERVE line breaks and score boosters.`,

  sharpen: `Shorten content to hit the optimal engagement score length: 180-280 characters.

ENGAGEMENT SCORE TARGETS (these are measured):
- 180-280 chars → 100 points (PERFECT)
- 50-179 chars → 65 points (needs more meat)
- 281-320 chars → 70 points (slightly over)
- >320 chars → 40 points (too long)

YOUR GOAL:
- If content is >280 chars: Reduce to 180-280 chars (max score)
- If content is <180 chars: Keep it
- Target: 200-260 chars is ideal

⚠️ NEVER DELETE THESE (they boost other scores):
- "Unpopular opinion:", "Hot take:" openers
- Questions at the end (ending with ?)
- Numbers at the start of sentences
- "Most people", "Nobody" controversial markers
- The first line (the hook) - shorten the MIDDLE, not the hook

WORDS TO DELETE (instant cuts):
- "I think that", "I believe", "In my opinion" → just state it
- "It's important to note that", "It's worth mentioning" → DELETE
- "In order to" → "to"
- "The fact that" → DELETE
- "Actually", "basically", "literally", "really", "very" → DELETE
- "At the end of the day", "when it comes to" → DELETE
- "Sort of", "kind of", "a bit" → DELETE

TECHNIQUES:
- Cut from the MIDDLE, preserve hook (first line) and CTA (last line)
- Active voice (shorter than passive)
- Replace phrases with single words
- Delete filler, keep substance

⚠️ PRESERVE: Line breaks, hooks, questions, controversial markers.

FOR THREADS: Each tweet must be under 280 chars. Maintain numbering.

CRITICAL: Return ONLY the shortened content. Aim for 180-280 chars. PRESERVE score boosters.`,

  make_thread: `Turn content into an engaging thread optimized for engagement scores.

ENGAGEMENT SCORE TARGETS PER TWEET:
- Length: 180-280 chars per tweet → 100 points
- Hook (tweet 1): Start with number/question/bold claim → +15-20 points
- Last tweet: End with question → +30 points for reply potential
- Readability: Short sentences, simple words → +10 points

THREAD STRUCTURE (5-8 tweets):
1/ HOOK (10-80 char opener) - Use: number, question, "Unpopular opinion:", "Hot take:"
2/ Context - why should they care?
3-5/ Main points (one idea per tweet)
6-7/ Key insight
8/ CTA + QUESTION (must end with "?" for +30 reply points)

HIGH-SCORING PATTERNS:
- Tweet 1: "Unpopular opinion: [bold claim]" or "[Number]% of people [fail at X]"
- Middle tweets: 200-260 chars each, simple vocabulary
- Last tweet: "Agree or disagree?" / "What would you add?" / "Which one are you?"

CHARACTER REQUIREMENTS:
- EVERY tweet MUST be under 280 characters
- Aim for 180-260 chars (sweet spot)
- Count carefully - this is critical

EXAMPLE:
1/ 🚨 73% of founders fail in year one.

Here's what the survivors do differently: (thread)

2/ [180-260 chars - context]

...

8/ What would you add to this list?

Agree or disagree? 👇

CRITICAL: Return ONLY the numbered thread. Every tweet under 280 chars. Last tweet must end with question mark.`,

  add_question: `Add ONE question to boost the Reply Potential score (+30 points for ending with ?).

ENGAGEMENT SCORE TARGETS (these are measured):
- Ends with "?" → +30 points (MOST IMPORTANT)
- Contains engagement phrase → +20 points:
  "what do you think" | "agree?" | "disagree?" | "thoughts?" | "am i wrong" | 
  "change my mind" | "prove me wrong" | "who else" | "reply with" | "drop your"

HIGH-SCORING QUESTION PATTERNS (ranked):
1. "Agree or disagree?" ← engagement phrase + question
2. "Prove me wrong" ← engagement phrase
3. "What's yours?" ← short, question
4. "Who else?" ← engagement phrase + question

⚠️ PRESERVE ALL EXISTING CONTENT:
- Do NOT modify the hook (first line)
- Do NOT remove controversial markers (Unpopular opinion, Hot take, Most people)
- Do NOT remove numbers at the start
- ONLY ADD a question at the very end

RULES:
1. Add question on its own line at the VERY END
2. Question MUST end with "?"
3. Keep total under 280 characters - shorten MIDDLE if needed, not hook
4. PRESERVE all existing line breaks

FOR THREADS: Add question to the LAST tweet only.

CRITICAL: Return content + question. PRESERVE everything else exactly.`,

  make_spicy: `Make this content more provocative to boost Reply Potential score (+15 points for controversial markers).

ENGAGEMENT SCORE TARGETS (these are measured):
- Controversial markers → +15 points:
  "unpopular opinion" | "hot take" | "controversial" | "most people" | 
  "nobody" | "everyone is wrong" | "i don't care"
- Also boosts Hook Strength if used at start (+20 points for bold claim opener)

⚠️ PRESERVE EXISTING SCORE BOOSTERS:
- Keep any existing questions at the end (ending with ?)
- Keep numbers at the start of lines
- Keep existing line breaks
- Only ADD spicy elements, don't remove what's working

HARD REQUIREMENTS:
1. Output must be SAME LENGTH OR SHORTER (stronger words, not more words)
2. For single tweets: Stay under 280 characters
3. Add at least ONE controversial marker if not already present
4. ⚠️ PRESERVE ALL LINE BREAKS

SPICY TRANSFORMATIONS (that maintain or reduce length):
BEFORE → AFTER
- "This is helpful" → "Unpopular opinion: this is the only thing that works"
- "Many people struggle" → "Most people get this completely wrong"
- "It's important to" → "Stop ignoring this."
- "You might want to" → "You need to"
- Hedging words (I think, perhaps, sort of) → DELETE

HIGH-SCORING SPICY PATTERNS:
- "Unpopular opinion:" at start (bold claim + controversial)
- "Hot take:" at start (bold claim + controversial)  
- "Most people [do X wrong]" in content (controversial)
- "Nobody talks about this" (controversial)
- Include "Stop [doing X]" (triggers bold claim)

THE RULE: Make it polarizing enough that people MUST reply to agree or disagree.

FOR THREADS: Add spice to at least the first and last tweets.

CRITICAL: Return ONLY the content. Same length or shorter. Must include controversial markers.`,
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

      // Count line breaks in original content
      const originalLineBreaks = (content.match(/\n/g) || []).length

      // Helper to call the API
      const callApi = async (extraPrompt = ''): Promise<string> => {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: editingPrompt + FORMATTING_RULE,
          messages: [{ role: 'user', content: `Here is the content to modify:\n\n${content}${threadContext}\n\n⚠️ IMPORTANT: Preserve all line breaks exactly as shown above.${extraPrompt}` }],
        })

        return response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map(block => block.text)
          .join('\n')
          .trim()
      }

      // First attempt
      let result = await callApi()

      // Check if formatting was collapsed (significant loss of line breaks)
      const resultLineBreaks = (result.match(/\n/g) || []).length
      if (originalLineBreaks > 2 && resultLineBreaks < originalLineBreaks / 2) {
        // Retry with stronger formatting emphasis
        result = await callApi('\n\n⚠️ YOUR OUTPUT MUST HAVE THE SAME LINE BREAKS AS THE INPUT. Count them. The input has ' + originalLineBreaks + ' line breaks. Do NOT collapse into a paragraph.')
      }

      // Strip common AI prefixes
      result = result
        .replace(/^(Here's?( the| your)?( improved| modified| updated)?( version| content)?:?\s*)/i, '')
        .replace(/^["']|["']$/g, '')
        .trim()

      return new Response(JSON.stringify({ content: result }), {
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

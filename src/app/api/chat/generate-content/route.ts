import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

const TWEET_GENERATION_PROMPT = `You are turning a researcher's conversation into a powerful tweet. You have access to everything they said during an interview - use their EXACT words and phrases as much as possible.

## YOUR TASK

Create 2-3 tweet options (280 characters each, or up to 4000 for long-form).

## RULES

1. **Use their words.** Copy their exact phrases. The best hooks come directly from what they said.

2. **Structure**: Hook → Insight → CTA (optional question to spark replies)

3. **No AI language.** If it sounds like ChatGPT, rewrite it. Use their voice.

4. **Be specific.** Vague insights don't get engagement. Use their examples, numbers, stories.

5. **X Algorithm Optimization:**
   - Questions prompt engagement (replies are worth 150x likes)
   - External links get penalized - don't include them
   - 1-2 hashtags max, or none

## OUTPUT FORMAT

**Option 1:**
[Tweet text ready to post - use their exact words]

**Option 2:**
[Different angle, also from their words]

**Option 3:**
[Another take if applicable]

*Why these work:* [1-2 sentences on engagement potential]

CRITICAL: The user will copy this directly to X. Give them ONLY what they would actually post. No preamble, no "Based on your conversation..." - just the tweet text.`

const THREAD_GENERATION_PROMPT = `You are turning a researcher's conversation into a compelling X thread. You have access to everything they said during an interview - use their EXACT words and phrases as much as possible.

## YOUR TASK

Create a thread of 5-12 tweets (numbered 1/, 2/, etc.)

## RULES

1. **Use their words.** Each tweet should contain their actual phrases, examples, and insights.

2. **First tweet = Hook.** Must stop the scroll. Often their most counterintuitive or provocative statement.

3. **Each tweet stands alone.** Someone might see tweet 7 first - it should still make sense.

4. **Structure:**
   - Tweet 1: Hook (attention-grabber)
   - Tweets 2-3: Context/setup
   - Tweets 4-8: Main insights with examples
   - Tweet 9-10: Implications/takeaways
   - Last tweet: CTA (question or action)

5. **Include specifics.** Their examples, data, stories. Generic threads fail.

6. **Suggest image points.** Every 3-4 tweets, note where an image would boost engagement.

7. **X Algorithm Optimization:**
   - End with a discussion prompt (replies matter most)
   - No external links in main thread (suggest for reply if needed)

## OUTPUT FORMAT

**Option 1:**

1/ [Hook tweet - their most compelling insight]

2/ [Context]

3/ [First main point]
[📷 Image suggestion: ...]

4/ [Supporting evidence from their words]

...continue...

*Why this works:* [1-2 sentences]

---

**Option 2:**
[Different angle/structure if applicable]

CRITICAL: The user will copy this directly to X. No preamble. Just the numbered thread tweets.`

const ARTICLE_GENERATION_PROMPT = `You are turning a researcher's conversation into a long-form X article. You have access to everything they said during an interview - use their EXACT words and phrases as much as possible.

## YOUR TASK

Create a 1000-2000 word article with subheadings.

## RULES

1. **Use their voice.** Quote their exact phrases. This should sound like them, not AI.

2. **Structure:**
   - Headline: Their most provocative or insightful statement
   - Opening hook: 2-3 sentences that create urgency
   - Body: 3-5 main sections with subheadings
   - Examples: Include their specific stories and evidence
   - Conclusion: Actionable takeaway + discussion prompt

3. **Subheadings** should be benefit-driven or curiosity-inducing.

4. **Include their examples.** Generic advice fails. Their specific experiences make it real.

5. **Data/Evidence:** If they mentioned numbers or research, include it.

6. **X Algorithm Optimization:**
   - Strong headline for preview
   - Discussion prompt at the end (drives replies)
   - No external links in main article

## OUTPUT FORMAT

# [Headline - their key insight]

[Opening hook paragraph - grabs attention]

## [Subheading 1]
[Content using their words and examples]

## [Subheading 2]
[Continue with their insights]

## [Subheading 3]
[More development]

## [Conclusion subheading]
[Wrap up + call to action/question]

---

*Why this works:* [1-2 sentences on structure and engagement potential]

CRITICAL: The user will copy this directly to X. No preamble. Just the article content.`

function getSystemPrompt(contentType: string): string {
  switch (contentType) {
    case 'tweet':
      return TWEET_GENERATION_PROMPT
    case 'thread':
      return THREAD_GENERATION_PROMPT
    case 'article':
      return ARTICLE_GENERATION_PROMPT
    default:
      return TWEET_GENERATION_PROMPT
  }
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
    const { userMessages, contentType } = await request.json() as {
      userMessages: string[]
      contentType: 'tweet' | 'thread' | 'article'
      conversationId?: string
    }

    if (!userMessages || userMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'No conversation messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Combine all user messages into context
    const conversationContext = userMessages
      .map((msg, i) => `Response ${i + 1}: ${msg}`)
      .join('\n\n')

    const userPrompt = `Here is what the user shared during our conversation:

<conversation>
${conversationContext}
</conversation>

Generate ${contentType} content using their exact words and insights. Create 2-3 options.`

    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-20250514',
      max_tokens: 4096,
      system: getSystemPrompt(contentType),
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
    console.error('Generate content error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Content generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

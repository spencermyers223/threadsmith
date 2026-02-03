import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface GenerateRequest {
  inspirationId: string
  sourceTweet: string
  sourceAuthor: string
  xAccountId?: string
}

// POST - Generate repurposed content from saved inspiration
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: GenerateRequest = await request.json()
    const { inspirationId, sourceTweet, sourceAuthor, xAccountId } = body

    if (!sourceTweet) {
      return NextResponse.json({ error: 'Source tweet is required' }, { status: 400 })
    }

    // Get user's voice/style profile if available
    let styleContext = ''
    if (xAccountId) {
      const { data: styleTemplates } = await supabase
        .from('style_templates')
        .select('profile_data, title')
        .eq('x_account_id', xAccountId)
        .limit(1)

      if (styleTemplates && styleTemplates.length > 0 && styleTemplates[0].profile_data) {
        const profile = styleTemplates[0].profile_data as Record<string, unknown>
        styleContext = `

The user has a defined writing style:
- Voice: ${profile.summary || 'Authentic and engaging'}
- Tone: ${(profile.toneMarkers as string[])?.join(', ') || 'Professional yet conversational'}
- Style: ${profile.sentenceStyle || 'Clear and concise'}`
      }
    }

    // Generate 3 different repurposed versions
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are an expert content repurposer who transforms viral tweets into new original content.

Your job is to take a successful tweet and create NEW versions that:
1. Keep the same FORMAT and STRUCTURE that made it successful
2. Use completely DIFFERENT content/topic/examples
3. Sound natural and authentic, not like a copy
4. Stay under 280 characters each

You will generate 3 different approaches:
1. **Same Format, Different Topic** - Keep the exact structure but change the subject matter
2. **Same Hook, New Angle** - Keep the attention-grabbing opening but take it a different direction  
3. **Inspired Remix** - Take the core insight and express it in a fresh way${styleContext}

Return ONLY valid JSON, no markdown.`,
      messages: [{
        role: 'user',
        content: `Repurpose this viral tweet from @${sourceAuthor}:

"${sourceTweet}"

Generate 3 completely new tweets that I can post as my own original content. Each should feel authentic and not like a copy.

Return JSON:
{
  "posts": [
    {
      "content": "the new tweet text (max 280 chars)",
      "approach": "Same Format, Different Topic"
    },
    {
      "content": "the new tweet text (max 280 chars)",
      "approach": "Same Hook, New Angle"
    },
    {
      "content": "the new tweet text (max 280 chars)",
      "approach": "Inspired Remix"
    }
  ]
}`
      }]
    })

    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')
      .trim()

    // Extract JSON
    let jsonStr = textContent
    const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      jsonStr = objectMatch[0]
    }

    let posts
    try {
      const parsed = JSON.parse(jsonStr)
      posts = parsed.posts || []
    } catch {
      // Fallback if parsing fails
      posts = [{
        content: `Inspired by great content I saw today. Here's my take...`,
        approach: 'Fallback'
      }]
    }

    // Mark inspiration as repurposed
    if (inspirationId) {
      await supabase
        .from('saved_inspirations')
        .update({ 
          repurposed: true, 
          repurposed_at: new Date().toISOString() 
        })
        .eq('id', inspirationId)
        .eq('user_id', user.id)
    }

    // Track generation usage
    await supabase.rpc('increment_generation_count', { user_uuid: user.id })

    return NextResponse.json({ posts })

  } catch (error) {
    console.error('Repurpose generation error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Generation failed',
    }, { status: 500 })
  }
}

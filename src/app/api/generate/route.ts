import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  buildGenerationPrompt,
  type Archetype,
  type ContentLength,
  type ContentType,
  type Tone,
  type UserProfile,
} from '@/lib/prompts/build-generation-prompt'
import { checkCanGenerate, recordGeneration, type SourceType } from '@/lib/generation-limits'

const anthropic = new Anthropic()

// Input types from API
type InputLength = 'punchy' | 'standard' | 'developed' | 'thread'
type InputTone = 'casual' | 'educational' | 'hot_take' | 'professional'
type InputPostType = 'scroll_stopper' | 'debate_starter' | 'viral_catalyst' | 'all'

interface GenerateRequest {
  topic: string
  length: InputLength
  tone: InputTone
  postType: InputPostType
  sourceFileId?: string
}

interface GeneratedPost {
  content: string
  archetype: 'scroll_stopper' | 'debate_starter' | 'viral_catalyst'
  characterCount: number
}

interface GenerateResponse {
  posts: GeneratedPost[]
  generationId: string
  remaining: number // -1 means unlimited
}

// Map input length to our ContentLength type
function mapLength(length: InputLength): { contentLength: ContentLength; contentType: ContentType } {
  switch (length) {
    case 'punchy':
      return { contentLength: 'short', contentType: 'tweet' }
    case 'standard':
      return { contentLength: 'medium', contentType: 'tweet' }
    case 'developed':
      return { contentLength: 'long', contentType: 'tweet' }
    case 'thread':
      return { contentLength: 'medium', contentType: 'thread' }
    default:
      return { contentLength: 'medium', contentType: 'tweet' }
  }
}

// Map input tone to our Tone type
function mapTone(tone: InputTone): Tone {
  switch (tone) {
    case 'casual':
      return 'casual'
    case 'educational':
      return 'educational'
    case 'hot_take':
      return 'bold'
    case 'professional':
      return 'professional'
    default:
      return 'casual'
  }
}

// Map input post type to our Archetype type
function mapArchetype(postType: InputPostType): Archetype {
  switch (postType) {
    case 'scroll_stopper':
      return 'scroll-stopper'
    case 'debate_starter':
      return 'debate-starter'
    case 'viral_catalyst':
      return 'viral-catalyst'
    case 'all':
      return 'balanced' // Will be handled specially
    default:
      return 'balanced'
  }
}

// Convert archetype back to output format
function archetypeToOutput(archetype: Archetype): 'scroll_stopper' | 'debate_starter' | 'viral_catalyst' {
  switch (archetype) {
    case 'scroll-stopper':
      return 'scroll_stopper'
    case 'debate-starter':
      return 'debate_starter'
    case 'viral-catalyst':
      return 'viral_catalyst'
    default:
      return 'scroll_stopper'
  }
}

// Parse Claude's response to extract individual posts
function parseGeneratedPosts(
  response: string,
  archetype: Archetype
): GeneratedPost[] {
  const posts: GeneratedPost[] = []

  // Match patterns like "**Option 1:**" or "**Option 1: Title**"
  const optionRegex = /\*\*Option\s+(\d+)(?::\s*[^*]*)?\*\*\s*([\s\S]*?)(?=\*\*Option\s+\d+|$|\*Why|\*Recommendation)/gi

  let match
  while ((match = optionRegex.exec(response)) !== null) {
    const content = match[2].trim()
    if (content) {
      // Clean up the content - remove trailing asterisks and whitespace
      const cleanContent = content
        .replace(/\n\n\*\*?$/g, '')
        .replace(/\n\*Character count.*$/gi, '')
        .replace(/\n\*Why this works.*$/gi, '')
        .trim()

      if (cleanContent.length > 0) {
        posts.push({
          content: cleanContent,
          archetype: archetypeToOutput(archetype),
          characterCount: cleanContent.length,
        })
      }
    }
  }

  // Fallback: if no options found, treat entire response as single post
  if (posts.length === 0 && response.trim().length > 0) {
    const cleanResponse = response.trim()
    posts.push({
      content: cleanResponse,
      archetype: archetypeToOutput(archetype),
      characterCount: cleanResponse.length,
    })
  }

  return posts
}

// Generate content for a specific archetype
async function generateForArchetype(
  topic: string,
  archetype: Archetype,
  contentLength: ContentLength,
  contentType: ContentType,
  tone: Tone,
  userProfile: UserProfile | undefined,
  additionalContext: string | undefined
): Promise<GeneratedPost[]> {
  const { systemPrompt, userPrompt } = buildGenerationPrompt({
    topic,
    contentType,
    archetype,
    tone,
    length: contentLength,
    userProfile,
    additionalContext,
    includeHookSuggestions: true,
  })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  // Extract text content from response
  const textContent = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('\n')

  return parseGeneratedPosts(textContent, archetype)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check generation limits first
    const limitCheck = await checkCanGenerate(supabase, user.id)
    if (!limitCheck.canGenerate) {
      return NextResponse.json(
        {
          error: 'Generation limit reached',
          code: 'LIMIT_REACHED',
          remaining: 0,
          isSubscribed: limitCheck.isSubscribed,
        },
        { status: 403 }
      )
    }

    const body: GenerateRequest = await request.json()
    const { topic, length, tone, postType, sourceFileId } = body

    // Validate topic
    if (!topic || topic.trim().length === 0) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }
    if (topic.length > 280) {
      return NextResponse.json({ error: 'Topic must be 280 characters or less' }, { status: 400 })
    }

    // Map input values to our types
    const { contentLength, contentType } = mapLength(length)
    const mappedTone = mapTone(tone)

    // Fetch user's content profile
    let userProfile: UserProfile | undefined
    const { data: profileData } = await supabase
      .from('content_profiles')
      .select('niche, content_goal, admired_accounts, target_audience')
      .eq('user_id', user.id)
      .single()

    if (profileData) {
      userProfile = {
        niche: profileData.niche || undefined,
        contentGoal: profileData.content_goal || undefined,
        admiredAccounts: profileData.admired_accounts || undefined,
        targetAudience: profileData.target_audience || undefined,
      }
    }

    // Fetch source file content if provided
    let additionalContext: string | undefined
    if (sourceFileId) {
      const { data: fileData } = await supabase
        .from('files')
        .select('name, content')
        .eq('id', sourceFileId)
        .eq('user_id', user.id)
        .single()

      if (fileData?.content) {
        additionalContext = `<source_material file="${fileData.name}">\n${fileData.content}\n</source_material>`
      }
    }

    // Generate UUID for this batch
    const generationId = crypto.randomUUID()

    let allPosts: GeneratedPost[] = []

    if (postType === 'all') {
      // Generate one post of each archetype in parallel
      const archetypes: Archetype[] = ['scroll-stopper', 'debate-starter', 'viral-catalyst']

      const results = await Promise.all(
        archetypes.map(archetype =>
          generateForArchetype(
            topic,
            archetype,
            contentLength,
            contentType,
            mappedTone,
            userProfile,
            additionalContext
          ).then(posts => {
            // Take only the first post from each archetype when doing 'all'
            if (posts.length > 0) {
              return [posts[0]]
            }
            return []
          })
        )
      )

      allPosts = results.flat()
    } else {
      // Generate 3 variations of the specific archetype
      const archetype = mapArchetype(postType)
      allPosts = await generateForArchetype(
        topic,
        archetype,
        contentLength,
        contentType,
        mappedTone,
        userProfile,
        additionalContext
      )

      // Limit to 3 posts
      allPosts = allPosts.slice(0, 3)
    }

    // Record the generation (only counts against limit for free users)
    const sourceType: SourceType = sourceFileId ? 'file_based' : 'manual'
    await recordGeneration(supabase, user.id, generationId, sourceType)

    // Re-check remaining after recording
    const updatedLimits = await checkCanGenerate(supabase, user.id)

    const response: GenerateResponse = {
      posts: allPosts,
      generationId,
      remaining: updatedLimits.remaining,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('Generate API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

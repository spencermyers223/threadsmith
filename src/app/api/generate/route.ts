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
// Import CT-native post type prompts
import {
  marketTakePrompt,
  hotTakePrompt,
  onChainInsightPrompt,
  alphaThreadPrompt,
  protocolBreakdownPrompt,
  buildInPublicPrompt,
  type UserVoiceProfile,
} from '@/lib/prompts'

const anthropic = new Anthropic()

// Input types from API - extended to support CT-native post types
type InputLength = 'punchy' | 'standard' | 'developed' | 'thread'
type InputTone = 'casual' | 'educational' | 'hot_take' | 'professional'
// Legacy archetypes + CT-native post types
type InputPostType =
  | 'scroll_stopper' | 'debate_starter' | 'viral_catalyst' | 'all'  // Legacy
  | 'market_take' | 'hot_take' | 'on_chain_insight' | 'alpha_thread' | 'protocol_breakdown' | 'build_in_public'  // CT-native

// CT-native post types list for detection
const CT_NATIVE_POST_TYPES = [
  'market_take',
  'hot_take',
  'on_chain_insight',
  'alpha_thread',
  'protocol_breakdown',
  'build_in_public',
] as const

type CTNativePostType = typeof CT_NATIVE_POST_TYPES[number]

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
  postType?: CTNativePostType
  characterCount: number
}

interface GenerateResponse {
  posts: GeneratedPost[]
  generationId: string
  remaining: number // -1 means unlimited
}

// Check if post type is CT-native
function isCTNativePostType(postType: InputPostType): postType is CTNativePostType {
  return CT_NATIVE_POST_TYPES.includes(postType as CTNativePostType)
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

// Map input post type to our Archetype type (legacy)
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
  archetype: Archetype,
  postType?: CTNativePostType
): GeneratedPost[] {
  const posts: GeneratedPost[] = []

  // Check if this is a thread type that uses "Variation" format
  const isThreadFormat = postType === 'alpha_thread' || postType === 'protocol_breakdown'

  if (isThreadFormat) {
    // Parse thread format: **Variation 1: [Title]** followed by numbered tweets
    // The content continues until the next **Variation** or **Recommendation** section
    // Use a simpler regex that captures content until the next variation header or end markers
    const variationRegex = /\*\*Variation\s+(\d+)(?:\/\d+)?:\s*([^*]*)\*\*\s*([\s\S]*?)(?=\*\*Variation\s+\d+|\*\*Recommendation|\*\*Angle Breakdown|$)/gi

    let match
    while ((match = variationRegex.exec(response)) !== null) {
      const rawContent = match[3].trim()
      if (rawContent) {
        // Extract just the tweet content (numbered lines like "1/ content")
        // Remove analysis metadata that appears after each variation
        const cleanContent = rawContent
          // Remove analysis/metadata lines (lines starting with *)
          .replace(/^\*Hook Analysis:.*$/gm, '')
          .replace(/^\*Educational Flow:.*$/gm, '')
          .replace(/^\*Trust Factor:.*$/gm, '')
          .replace(/^\*Reply Potential:.*$/gm, '')
          .replace(/^\*Algorithm Score:.*$/gm, '')
          .replace(/^\*Conversation hook:.*$/gm, '')
          .replace(/^\*Character count:.*$/gm, '')
          .replace(/^\*Why this works:.*$/gm, '')
          .replace(/^\*Why they'll reply:.*$/gm, '')
          .replace(/^\[Suggest:.*\]$/gm, '') // Remove image placement suggestions
          // Remove separator lines
          .replace(/^---+\s*$/gm, '')
          // Remove trailing metadata block (lines starting with * at the end)
          .replace(/(\n\*[A-Z][^\n]*)+\s*$/gi, '')
          // Clean up extra whitespace
          .replace(/\n{3,}/g, '\n\n')
          .trim()

        if (cleanContent.length > 0) {
          posts.push({
            content: cleanContent,
            archetype: archetypeToOutput(archetype),
            postType,
            characterCount: cleanContent.length,
          })
        }
      }
    }
  }

  // If no thread variations found, try standard Option format
  if (posts.length === 0) {
    // Match patterns like "**Option 1:**" or "**Option 1: Title**" or "**Option 1**"
    const optionRegex = /\*\*Option\s+(\d+)(?::\s*[^*]*)?\*\*\s*([\s\S]*?)(?=\*\*Option\s+\d+|$|\*Why|\*Recommendation|---)/gi

    let match
    while ((match = optionRegex.exec(response)) !== null) {
      const content = match[2].trim()
      if (content) {
        // Clean up the content - remove trailing asterisks, whitespace, and metadata
        const cleanContent = content
          .replace(/\n\n\*\*?$/g, '')
          .replace(/\n\*Character count.*$/gi, '')
          .replace(/\n\*Why this works.*$/gi, '')
          .replace(/\n\*Hook Analysis.*$/gi, '')
          .replace(/\n\*Algorithm Score.*$/gi, '')
          .replace(/\n\*Reply Potential.*$/gi, '')
          .replace(/\n\*Conversation hook.*$/gi, '')
          .replace(/---\s*$/g, '')
          .trim()

        if (cleanContent.length > 0) {
          posts.push({
            content: cleanContent,
            archetype: archetypeToOutput(archetype),
            postType,
            characterCount: cleanContent.length,
          })
        }
      }
    }
  }

  // Fallback: if no options found, treat entire response as single post
  if (posts.length === 0 && response.trim().length > 0) {
    const cleanResponse = response.trim()
    posts.push({
      content: cleanResponse,
      archetype: archetypeToOutput(archetype),
      postType,
      characterCount: cleanResponse.length,
    })
  }

  return posts
}

// Convert UserProfile to UserVoiceProfile for CT-native prompts
function toUserVoiceProfile(userProfile: UserProfile | undefined): UserVoiceProfile | undefined {
  if (!userProfile) return undefined
  return {
    niche: userProfile.niche,
    contentGoal: userProfile.contentGoal,
    voiceStyle: userProfile.voiceStyle,
    admiredAccounts: userProfile.admiredAccounts,
    targetAudience: userProfile.targetAudience,
    personalBrand: userProfile.personalBrand,
  }
}

// Generate content using CT-native post type prompts
async function generateForCTNativePostType(
  topic: string,
  postType: CTNativePostType,
  userProfile: UserProfile | undefined,
  additionalContext: string | undefined
): Promise<GeneratedPost[]> {
  const voiceProfile = toUserVoiceProfile(userProfile)
  let systemPrompt: string
  let userPrompt: string

  // Select the appropriate prompt builder based on post type
  switch (postType) {
    case 'market_take': {
      const context = voiceProfile?.niche ? { niche: voiceProfile.niche } : undefined
      systemPrompt = marketTakePrompt(context)
      userPrompt = `Create a market take about: ${topic}${additionalContext ? `\n\nContext:\n${additionalContext}` : ''}`
      break
    }
    case 'hot_take': {
      const context = voiceProfile?.niche ? { niche: voiceProfile.niche } : undefined
      systemPrompt = hotTakePrompt(context)
      userPrompt = `Create a hot take about: ${topic}${additionalContext ? `\n\nContext:\n${additionalContext}` : ''}`
      break
    }
    case 'on_chain_insight': {
      const context = voiceProfile?.niche ? { niche: voiceProfile.niche } : undefined
      systemPrompt = onChainInsightPrompt(context)
      userPrompt = `Create an on-chain insight about: ${topic}${additionalContext ? `\n\nContext:\n${additionalContext}` : ''}`
      break
    }
    case 'alpha_thread': {
      const result = alphaThreadPrompt({
        topic,
        userContext: voiceProfile ? {
          niche: voiceProfile.niche,
          targetAudience: voiceProfile.targetAudience,
        } : undefined,
        additionalNotes: additionalContext,
      })
      systemPrompt = result.systemPrompt
      userPrompt = result.userPrompt
      break
    }
    case 'protocol_breakdown': {
      const result = protocolBreakdownPrompt({
        topic,
        userContext: voiceProfile ? {
          niche: voiceProfile.niche,
          targetAudience: voiceProfile.targetAudience,
        } : undefined,
        additionalNotes: additionalContext,
      })
      systemPrompt = result.systemPrompt
      userPrompt = result.userPrompt
      break
    }
    case 'build_in_public': {
      const result = buildInPublicPrompt({
        topic,
        userProfile: voiceProfile,
        additionalContext,
        length: 'single', // Default to single tweet for build-in-public
      })
      systemPrompt = result.systemPrompt
      userPrompt = result.userPrompt
      break
    }
    default: {
      throw new Error(`Unknown CT-native post type: ${postType}`)
    }
  }

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

  // Map CT-native post type to legacy archetype for compatibility
  const archetypeMapping: Record<CTNativePostType, Archetype> = {
    market_take: 'scroll-stopper',
    hot_take: 'debate-starter',
    on_chain_insight: 'viral-catalyst',
    alpha_thread: 'viral-catalyst',
    protocol_breakdown: 'viral-catalyst',
    build_in_public: 'scroll-stopper',
  }

  return parseGeneratedPosts(textContent, archetypeMapping[postType], postType)
}

// Generate content for a specific archetype (legacy)
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
    if (topic.length > 500) {
      return NextResponse.json({ error: 'Topic must be 500 characters or less' }, { status: 400 })
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

    // Check if using CT-native post types or legacy archetypes
    if (isCTNativePostType(postType)) {
      // Use CT-native post type prompts
      allPosts = await generateForCTNativePostType(
        topic,
        postType,
        userProfile,
        additionalContext
      )
      // Limit to 3 posts
      allPosts = allPosts.slice(0, 3)
    } else if (postType === 'all') {
      // Generate one post of each archetype in parallel (legacy)
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
      // Generate 3 variations of the specific archetype (legacy)
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

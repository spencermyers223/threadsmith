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
import { cleanContent, getContentWarnings, calculateHumannessScore } from '@/lib/content-cleaner'
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
  isTemplatePrompt?: boolean // When true, topic is a template instruction - use as-is
}

interface GeneratedPost {
  content: string
  archetype: 'scroll_stopper' | 'debate_starter' | 'viral_catalyst'
  postType?: CTNativePostType
  characterCount: number
  qualityScore?: number // 0-100, higher is better (humanness + engagement potential)
  warnings?: string[] // Any content issues detected
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

  // Try the new --- delimited format first
  const delimiterRegex = /---\s*\n?(VARIATION\s*\d+|THREAD\s*\d+|\d+)?\s*\n([\s\S]*?)(?=\n---|\n*$)/gi
  let match
  
  while ((match = delimiterRegex.exec(response)) !== null) {
    const rawContent = match[2].trim()
    if (rawContent && rawContent.length > 10) {
      // Run through content cleaner to remove AI patterns
      const { cleaned } = cleanContent(rawContent)
      if (cleaned.length > 0) {
        posts.push({
          content: cleaned,
          archetype: archetypeToOutput(archetype),
          postType,
          characterCount: cleaned.length,
        })
      }
    }
  }

  // If --- format didn't work, try **Variation** format
  if (posts.length === 0) {
    const variationRegex = /\*\*(?:Variation|Option)\s+(\d+)(?:\/\d+)?[^*]*\*\*\s*([\s\S]*?)(?=\*\*(?:Variation|Option)\s+\d+|\*\*Recommendation|\*\*Angle|$)/gi

    while ((match = variationRegex.exec(response)) !== null) {
      const rawContent = match[2].trim()
      if (rawContent && rawContent.length > 10) {
        // Run through content cleaner to remove AI patterns
        const { cleaned } = cleanContent(rawContent)
        if (cleaned.length > 0) {
          posts.push({
            content: cleaned,
            archetype: archetypeToOutput(archetype),
            postType,
            characterCount: cleaned.length,
          })
        }
      }
    }
  }

  // If still no posts, try plain **Option N:** format (legacy)
  if (posts.length === 0) {
    const optionRegex = /\*\*Option\s+(\d+)(?::\s*[^*]*)?\*\*\s*([\s\S]*?)(?=\*\*Option\s+\d+|$|\*Why|\*Recommendation|---)/gi

    while ((match = optionRegex.exec(response)) !== null) {
      const rawContent = match[2].trim()
      if (rawContent && rawContent.length > 10) {
        const { cleaned } = cleanContent(rawContent)
        if (cleaned.length > 0) {
          posts.push({
            content: cleaned,
            archetype: archetypeToOutput(archetype),
            postType,
            characterCount: cleaned.length,
          })
        }
      }
    }
  }

  // Fallback: if no options found, treat entire response as single post
  if (posts.length === 0 && response.trim().length > 0) {
    const { cleaned } = cleanContent(response.trim())
    posts.push({
      content: cleaned,
      archetype: archetypeToOutput(archetype),
      postType,
      characterCount: cleaned.length,
    })
  }

  // Add quality scores and warnings to each post
  return posts.map(post => {
    const { score } = calculateHumannessScore(post.content)
    const warnings = getContentWarnings(post.content)
    return {
      ...post,
      qualityScore: score,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  })
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
  additionalContext: string | undefined,
  isTemplatePrompt?: boolean
): Promise<GeneratedPost[]> {
  const voiceProfile = toUserVoiceProfile(userProfile)
  let systemPrompt: string
  let userPrompt: string

  // Select the appropriate prompt builder based on post type
  // When isTemplatePrompt is true, the topic is a template instruction - use it directly
  switch (postType) {
    case 'market_take': {
      const context = voiceProfile?.niche ? { niche: voiceProfile.niche } : undefined
      systemPrompt = marketTakePrompt(context)
      userPrompt = isTemplatePrompt
        ? `${topic}${additionalContext ? `\n\nAdditional context:\n${additionalContext}` : ''}`
        : `Create a market take about: ${topic}${additionalContext ? `\n\nContext:\n${additionalContext}` : ''}`
      break
    }
    case 'hot_take': {
      const context = voiceProfile?.niche ? { niche: voiceProfile.niche } : undefined
      systemPrompt = hotTakePrompt(context)
      userPrompt = isTemplatePrompt
        ? `${topic}${additionalContext ? `\n\nAdditional context:\n${additionalContext}` : ''}`
        : `Create a hot take about: ${topic}${additionalContext ? `\n\nContext:\n${additionalContext}` : ''}`
      break
    }
    case 'on_chain_insight': {
      const context = voiceProfile?.niche ? { niche: voiceProfile.niche } : undefined
      systemPrompt = onChainInsightPrompt(context)
      userPrompt = isTemplatePrompt
        ? `${topic}${additionalContext ? `\n\nAdditional context:\n${additionalContext}` : ''}`
        : `Create an on-chain insight about: ${topic}${additionalContext ? `\n\nContext:\n${additionalContext}` : ''}`
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
    const { topic, length, tone, postType, sourceFileId, isTemplatePrompt } = body

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

    // Fetch user's content profile (including voice_profile)
    let userProfile: UserProfile | undefined
    let voiceProfileData: Record<string, unknown> | null = null
    const { data: profileData } = await supabase
      .from('content_profiles')
      .select('niche, content_goal, admired_accounts, target_audience, voice_profile')
      .eq('user_id', user.id)
      .single()

    if (profileData) {
      userProfile = {
        niche: profileData.niche || undefined,
        contentGoal: profileData.content_goal || undefined,
        admiredAccounts: profileData.admired_accounts || undefined,
        targetAudience: profileData.target_audience || undefined,
      }
      voiceProfileData = profileData.voice_profile as Record<string, unknown> | null
    }

    // Fetch user's actual voice samples (their real tweets)
    const { data: voiceSamples } = await supabase
      .from('voice_samples')
      .select('tweet_text')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10) // Get up to 10 most recent samples

    // Fetch inspiration tweets from admired accounts (top 5 for shorter prompts)
    const { data: inspirationTweets } = await supabase
      .from('inspiration_tweets')
      .select('tweet_text, author_username, like_count')
      .eq('user_id', user.id)
      .order('like_count', { ascending: false }) // Prioritize high-engagement tweets
      .limit(5) // Top 5 for faster generation

    // Build voice profile context
    let additionalContext: string | undefined
    if (voiceProfileData) {
      const vp = voiceProfileData as Record<string, unknown>
      const emojiUsage = vp.emojiUsage as { frequency?: string; favorites?: string[] } | undefined
      additionalContext = `<voice_profile>
IMPORTANT: Match this user's writing voice exactly. This was analyzed from their real tweets.

Summary: ${vp.summary || 'N/A'}
Tone: ${Array.isArray(vp.toneMarkers) ? (vp.toneMarkers as string[]).join(', ') : 'N/A'}
Formality Level: ${vp.formalityLevel || 'N/A'}/10
Hot Take Tendency: ${vp.hotTakeTendency || 'N/A'}/10
Vocabulary: ${vp.vocabularyLevel || 'N/A'}
Emoji Usage: ${emojiUsage?.frequency || 'N/A'}${emojiUsage?.favorites?.length ? ` (favorites: ${(emojiUsage.favorites as string[]).join(' ')})` : ''}
Sentence Style: ${vp.sentenceStyle || 'N/A'}
Avg Tweet Length: ${vp.avgTweetLength || 'N/A'} chars
Opening Style: ${vp.openingStyle || 'N/A'}
Closing Style: ${vp.closingStyle || 'N/A'}
Common Phrases: ${Array.isArray(vp.commonPhrases) ? (vp.commonPhrases as string[]).join(', ') : 'N/A'}
Signature Elements: ${Array.isArray(vp.signatureElements) ? (vp.signatureElements as string[]).join(', ') : 'N/A'}
Hashtag Usage: ${vp.hashtagUsage || 'N/A'}
Thread Preference: ${vp.threadPreference || 'N/A'}

Write as if YOU are this person. Mirror their exact tone, vocabulary level, emoji patterns, and sentence structure.
</voice_profile>`
    }

    // Add actual tweet examples if available
    if (voiceSamples && voiceSamples.length > 0) {
      const exampleTweets = voiceSamples
        .map((s, i) => `${i + 1}. "${s.tweet_text}"`)
        .join('\n')
      
      const tweetExamplesContext = `<real_tweet_examples>
CRITICAL: These are ACTUAL tweets written by this user. Study them carefully and match their EXACT style.

${exampleTweets}

Your generated content MUST sound like it was written by the same person who wrote these tweets.
Match their:
- Sentence structure and length
- Word choices and vocabulary
- Punctuation patterns
- Use of capitalization
- Emoji usage (or lack thereof)
- Overall energy and tone
</real_tweet_examples>`

      additionalContext = additionalContext 
        ? `${additionalContext}\n\n${tweetExamplesContext}` 
        : tweetExamplesContext
    }

    // Add inspiration tweets from admired accounts if available
    if (inspirationTweets && inspirationTweets.length > 0) {
      const inspirationExamples = inspirationTweets
        .map((t, i) => `${i + 1}. @${t.author_username} (${t.like_count?.toLocaleString() || '?'} likes): "${t.tweet_text}"`)
        .join('\n')
      
      const inspirationContext = `<admired_account_examples>
STYLE INSPIRATION: These are high-performing tweets from accounts this user admires. Study their patterns.

${inspirationExamples}

Learn from these examples:
- How they open their tweets (hooks)
- Their sentence rhythm and length
- How they create engagement
- Their use of questions, statements, or calls-to-action
- The energy and confidence level

Blend these stylistic elements with the user's own voice. Don't copy - adapt.
</admired_account_examples>`

      additionalContext = additionalContext 
        ? `${additionalContext}\n\n${inspirationContext}` 
        : inspirationContext
    }

    // Fetch source file content if provided
    if (sourceFileId) {
      const { data: fileData } = await supabase
        .from('files')
        .select('name, content')
        .eq('id', sourceFileId)
        .eq('user_id', user.id)
        .single()

      if (fileData?.content) {
        const fileContext = `<source_material file="${fileData.name}">\n${fileData.content}\n</source_material>`
        additionalContext = additionalContext ? `${additionalContext}\n\n${fileContext}` : fileContext
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
        additionalContext,
        isTemplatePrompt
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

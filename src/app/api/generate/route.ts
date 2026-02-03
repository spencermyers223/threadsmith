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
  buildVoiceSamplesSection,
  type UserVoiceProfile,
} from '@/lib/prompts'
// Import dedicated thread prompt
import { THREAD_SYSTEM_PROMPT, buildThreadUserPrompt } from '@/lib/prompts/thread-prompt'
// Import dedicated article prompt
import { buildArticlePrompt } from '@/lib/prompts/article-prompt'

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
  // Template metadata for better context
  templateTitle?: string
  templateDescription?: string
  templateWhyItWorks?: string
  templateCategory?: string
  // Voice System V2
  styleProfileId?: string // Optional style profile to incorporate
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
  postsUsed?: number
  postsLimit?: number // -1 means unlimited (Pro tier)
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
      return { contentLength: 'long', contentType: 'article' }
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
  let match

  // Helper to process raw content into a post
  const processContent = (rawContent: string): GeneratedPost | null => {
    // Remove metadata and analysis
    let content = rawContent
      .replace(/\*Why this works:\*[\s\S]*$/i, '')
      .replace(/\n\*Character count:.*$/gm, '')
      .replace(/\[\d+\s*chars?\]/gi, '')
      .replace(/^\*[A-Z][\s\S]*$/gm, '')
      .trim()

    if (!content || content.length < 10) return null

    // Check if thread content
    const isThreadContent = /^\d+\//.test(content) || 
      /^\d+\s*\n[^\n]+/m.test(content) ||
      /^\d+\.\s+\S/.test(content)

    if (!isThreadContent) {
      const { cleaned } = cleanContent(content)
      content = cleaned
    }

    if (!content || content.length === 0) return null

    return {
      content,
      archetype: archetypeToOutput(archetype),
      postType,
      characterCount: content.length,
    }
  }

  // Method 1: --- delimited format (used by newer prompts)
  // Matches: ---\n1\n[content]\n--- or ---\nVARIATION 1\n[content]\n---
  const dashDelimitedRegex = /---\s*\n(?:(?:VARIATION\s+)?(\d+)|THREAD\s+(\d+))\s*\n([\s\S]*?)(?=\n---(?:\s*\n|$)|$)/gi
  let dashMatch
  while ((dashMatch = dashDelimitedRegex.exec(response)) !== null) {
    const post = processContent(dashMatch[3])
    if (post) posts.push(post)
  }
  
  if (posts.length > 0) {
    console.log('[Parse Debug] Found', posts.length, 'dash-delimited sections')
  }

  // Method 2: **Option N:** format
  if (posts.length === 0) {
    const optionRegex = /\*\*Option\s+(\d+)[^*]*\*\*\s*([\s\S]*?)(?=\*\*Option\s+\d+|\*\*Recommendation|$)/gi
    const optionMatches = response.match(/\*\*Option\s+\d+/gi)
    console.log('[Parse Debug] Found', optionMatches?.length || 0, 'option matches')

    while ((match = optionRegex.exec(response)) !== null) {
      const post = processContent(match[2])
      if (post) posts.push(post)
    }
  }

  // Method 3: **Variation N:** format
  if (posts.length === 0) {
    const variationRegex = /\*\*Variation\s+(\d+)[^*]*\*\*\s*([\s\S]*?)(?=\*\*Variation\s+\d+|\*\*Recommendation|$)/gi
    while ((match = variationRegex.exec(response)) !== null) {
      const post = processContent(match[2])
      if (post) posts.push(post)
    }
  }

  // Method 4: Simple numbered format (1. or 1:)
  if (posts.length === 0) {
    // Look for patterns like "1.\n[content]" or "1:\n[content]" at start of lines
    const numberedRegex = /(?:^|\n)(\d+)[.:]\s*\n([\s\S]*?)(?=(?:\n\d+[.:]\s*\n)|$)/g
    while ((match = numberedRegex.exec(response)) !== null) {
      const post = processContent(match[2])
      if (post) posts.push(post)
    }
  }

  // Last fallback: treat entire response as single post
  if (posts.length === 0 && response.trim().length > 0) {
    console.log('[Parse Debug] Falling back to single post')
    const post = processContent(response.trim())
    if (post) posts.push(post)
  }

  console.log('[Parse Debug] Final parsed posts:', posts.length)

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
  isTemplatePrompt?: boolean,
  contentLength?: ContentLength,
  contentType?: ContentType,
  voiceSamplesSection?: string // NEW: Few-shot voice examples for system prompt
): Promise<GeneratedPost[]> {
  const voiceProfile = toUserVoiceProfile(userProfile)
  let systemPrompt: string
  let userPrompt: string
  
  // Check content type for specialized handling
  const isThread = contentType === 'thread'
  const isArticle = contentType === 'article'
  
  // ARTICLE GENERATION - Use dedicated article prompt
  if (isArticle) {
    const articlePrompt = buildArticlePrompt({
      topic,
      userProfile: voiceProfile,
      additionalContext,
      targetLength: contentLength === 'short' ? 'short' : contentLength === 'long' ? 'long' : 'medium'
    })
    
    systemPrompt = voiceSamplesSection 
      ? `${articlePrompt.systemPrompt}\n\n${voiceSamplesSection}`
      : articlePrompt.systemPrompt
    userPrompt = articlePrompt.userPrompt
    
    console.log('[Article Gen] Using dedicated article prompt')
    console.log('[Article Gen] Topic:', topic)
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384, // Higher limit for articles
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
    
    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n')
    
    console.log('[Article Gen] Response length:', textContent.length)
    
    // For articles, return as a single post (not parsed into multiple options)
    return [{
      content: textContent.trim(),
      archetype: 'scroll_stopper',
      postType: undefined,
      characterCount: textContent.trim().length,
    }]
  }
  
  // THREAD GENERATION - Use dedicated thread prompt
  if (isThread) {
    // Use dedicated thread prompt - completely separate from single-tweet prompts
    // Append voice samples section for few-shot learning if available
    systemPrompt = voiceSamplesSection 
      ? `${THREAD_SYSTEM_PROMPT}\n\n${voiceSamplesSection}`
      : THREAD_SYSTEM_PROMPT
    userPrompt = buildThreadUserPrompt(topic, additionalContext)
    
    console.log('[Thread Gen] Using dedicated thread prompt')
    console.log('[Thread Gen] Topic:', topic)
    console.log('[Thread Gen] User prompt:', userPrompt.substring(0, 300))
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
    
    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n')
    
    console.log('[Thread Gen] Response length:', textContent.length)
    console.log('[Thread Gen] Contains **Option 1:', textContent.includes('**Option 1'))
    console.log('[Thread Gen] Contains **Option 2:', textContent.includes('**Option 2'))
    console.log('[Thread Gen] Contains **Option 3:', textContent.includes('**Option 3'))
    
    return parseGeneratedPosts(textContent, 'viral-catalyst', undefined)
  }

  // For non-thread content, use the post-type specific prompts
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
      // Map ContentLength to build-in-public length format
      const bipLength = contentLength === 'short' ? 'single' 
        : contentLength === 'long' ? 'single'  // Still single tweet but longer
        : 'single'
      
      // Add explicit character limit based on length selection
      const charLimit = contentLength === 'short' ? 140 
        : contentLength === 'medium' ? 200 
        : 280
      
      const lengthContext = `\n\n⚠️ STRICT LENGTH REQUIREMENT: Output MUST be under ${charLimit} characters. This is ${contentLength === 'short' ? 'Punchy' : contentLength === 'medium' ? 'Standard' : 'Developed'} mode.`
      
      const result = buildInPublicPrompt({
        topic,
        userProfile: voiceProfile,
        additionalContext: (additionalContext || '') + lengthContext,
        length: bipLength,
      })
      systemPrompt = result.systemPrompt
      userPrompt = result.userPrompt
      break
    }
    default: {
      throw new Error(`Unknown CT-native post type: ${postType}`)
    }
  }

  // Append voice samples section to system prompt for few-shot learning
  if (voiceSamplesSection) {
    systemPrompt = `${systemPrompt}\n\n${voiceSamplesSection}`
  }

  // Generate single-tweet content (threads handled above)
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
    model: 'claude-opus-4-20250514',
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
    // Check generation limits first (don't increment yet)
    const limitCheck = await checkCanGenerate(supabase, user.id, false)
    if (!limitCheck.canGenerate) {
      return NextResponse.json(
        {
          error: limitCheck.postLimitError || 'Generation limit reached',
          code: 'LIMIT_REACHED',
          remaining: 0,
          postsUsed: limitCheck.postsUsed,
          postsLimit: limitCheck.postsLimit,
          isSubscribed: limitCheck.isSubscribed,
        },
        { status: 403 }
      )
    }

    const body: GenerateRequest = await request.json()
    const { topic, length, tone, postType, sourceFileId, isTemplatePrompt, templateTitle, templateDescription, templateWhyItWorks, templateCategory } = body

    // Validate topic
    if (!topic || topic.trim().length === 0) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }
    // Template prompts can be longer since they include system instructions
    // Regular topic input stays at 500 chars
    const maxLength = isTemplatePrompt ? 2000 : 500
    if (topic.length > maxLength) {
      return NextResponse.json({ error: `Topic must be ${maxLength} characters or less` }, { status: 400 })
    }

    // Map input values to our types
    const { contentLength, contentType } = mapLength(length)
    const mappedTone = mapTone(tone)

    // Fetch user's content profile (including voice_profile and all customization)
    let userProfile: UserProfile | undefined
    let voiceProfileData: Record<string, unknown> | null = null
    let voiceDescription: string | null = null
    let tonePreferences: { formal_casual: number; hedged_direct: number; serious_playful: number } | null = null
    let specificProtocols: string | null = null
    
    const { data: profileData } = await supabase
      .from('content_profiles')
      .select('niche, content_goal, admired_accounts, target_audience, voice_profile, voice_description, tone_formal_casual, tone_hedged_direct, tone_serious_playful, specific_protocols, primary_niche, secondary_interests')
      .eq('user_id', user.id)
      .single()

    if (profileData) {
      userProfile = {
        niche: profileData.primary_niche || profileData.niche || undefined,
        contentGoal: profileData.content_goal || undefined,
        admiredAccounts: profileData.admired_accounts || undefined,
        targetAudience: profileData.target_audience || undefined,
      }
      voiceProfileData = profileData.voice_profile as Record<string, unknown> | null
      voiceDescription = profileData.voice_description || null
      specificProtocols = profileData.specific_protocols || null
      
      // Capture tone preferences (1-5 scale)
      if (profileData.tone_formal_casual || profileData.tone_hedged_direct || profileData.tone_serious_playful) {
        tonePreferences = {
          formal_casual: profileData.tone_formal_casual || 3,
          hedged_direct: profileData.tone_hedged_direct || 3,
          serious_playful: profileData.tone_serious_playful || 3,
        }
      }
    }

    // Voice System V2: Fetch from voice_library (max 5 hand-picked tweets)
    const { data: voiceLibrary } = await supabase
      .from('voice_library')
      .select('tweet_text')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    
    // Fallback to old voice_samples if voice_library is empty (migration path)
    let voiceTweets = voiceLibrary?.map(s => s.tweet_text) || []
    if (voiceTweets.length === 0) {
      const { data: legacyVoiceSamples } = await supabase
        .from('voice_samples')
        .select('tweet_text')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      voiceTweets = legacyVoiceSamples?.map(s => s.tweet_text) || []
    }
    
    // Build the system prompt voice section (high-impact few-shot learning)
    const voiceSamplesSystemSection = buildVoiceSamplesSection(voiceTweets)
    
    // Voice System V2: Fetch style profile if selected
    let styleProfileSection = ''
    if (body.styleProfileId) {
      const { data: styleProfile } = await supabase
        .from('style_profiles')
        .select('account_username, profile_data')
        .eq('id', body.styleProfileId)
        .eq('user_id', user.id)
        .single()
      
      if (styleProfile?.profile_data) {
        const pd = styleProfile.profile_data as {
          summary?: string
          patterns?: {
            avgLength?: number
            lengthRange?: number[]
            emojiUsage?: string
            hookStyles?: string[]
            toneMarkers?: string[]
            sentenceStyle?: string
            questionUsage?: string
            hashtagUsage?: string
            ctaStyle?: string
            engagementTactics?: string[]
          }
        }
        const patterns = pd.patterns || {}
        styleProfileSection = `
WRITING STYLE & ENGAGEMENT TACTICS (inspired by @${styleProfile.account_username}):
${pd.summary ? `- Style: ${pd.summary}` : ''}
${patterns.hookStyles?.length ? `- Hook techniques: ${patterns.hookStyles.join(', ')}` : ''}
${patterns.toneMarkers?.length ? `- Tone: ${patterns.toneMarkers.join(', ')}` : ''}
${patterns.sentenceStyle ? `- Sentence rhythm: ${patterns.sentenceStyle}` : ''}
${patterns.engagementTactics?.length ? `- Engagement tactics: ${patterns.engagementTactics.join(', ')}` : ''}
${patterns.ctaStyle ? `- How they drive action: ${patterns.ctaStyle}` : ''}
${patterns.avgLength ? `- Typical length: ${patterns.avgLength} chars` : ''}
${patterns.emojiUsage ? `- Emoji: ${patterns.emojiUsage}` : ''}

Apply these writing techniques and engagement tactics to the user's topic.
`
      }
    }

    // Fetch inspiration tweets from admired accounts (top 5 for shorter prompts)
    const { data: inspirationTweets } = await supabase
      .from('inspiration_tweets')
      .select('tweet_text, author_username, like_count')
      .eq('user_id', user.id)
      .order('like_count', { ascending: false }) // Prioritize high-engagement tweets
      .limit(5) // Top 5 for faster generation

    // Build voice profile context
    let additionalContext: string | undefined
    
    // Start with user's self-described style if available
    if (voiceDescription) {
      additionalContext = `<user_style_description>
The user describes their writing style as:
"${voiceDescription}"

Honor this self-description in your writing.
</user_style_description>`
    }
    
    // Add tone preferences if set
    if (tonePreferences) {
      const toneContext = `<tone_preferences>
User's tone settings (1=left, 5=right):
- Formal ←→ Casual: ${tonePreferences.formal_casual}/5 ${tonePreferences.formal_casual <= 2 ? '(lean formal)' : tonePreferences.formal_casual >= 4 ? '(lean casual)' : '(balanced)'}
- Hedged ←→ Direct: ${tonePreferences.hedged_direct}/5 ${tonePreferences.hedged_direct <= 2 ? '(use qualifiers, "might", "could")' : tonePreferences.hedged_direct >= 4 ? '(be assertive, state things directly)' : '(balanced)'}
- Serious ←→ Playful: ${tonePreferences.serious_playful}/5 ${tonePreferences.serious_playful <= 2 ? '(keep it serious)' : tonePreferences.serious_playful >= 4 ? '(add humor, be playful)' : '(balanced)'}

Apply these tone preferences throughout your writing.
</tone_preferences>`
      additionalContext = additionalContext ? `${additionalContext}\n\n${toneContext}` : toneContext
    }
    
    // Add specific expertise/protocols if set
    if (specificProtocols) {
      const expertiseContext = `<user_expertise>
User's specific areas of expertise: ${specificProtocols}

Reference these areas naturally when relevant. Show expertise without being preachy.
</user_expertise>`
      additionalContext = additionalContext ? `${additionalContext}\n\n${expertiseContext}` : expertiseContext
    }
    
    // Add analyzed voice profile if available
    if (voiceProfileData) {
      const vp = voiceProfileData as Record<string, unknown>
      const emojiUsage = vp.emojiUsage as { frequency?: string; favorites?: string[] } | undefined
      const voiceContext = `<voice_profile>
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
      additionalContext = additionalContext ? `${additionalContext}\n\n${voiceContext}` : voiceContext
    }

    // Add template context if using a template
    if (isTemplatePrompt && templateTitle) {
      const templateContext = `<template_context>
TEMPLATE BEING USED: "${templateTitle}"
${templateCategory ? `Category: ${templateCategory}` : ''}
${templateDescription ? `Purpose: ${templateDescription}` : ''}
${templateWhyItWorks ? `\nWhy this format works:\n${templateWhyItWorks}` : ''}

IMPORTANT: Follow the template's format and structure. The "why it works" explains the psychology - use these principles to maximize engagement.
</template_context>`
      additionalContext = additionalContext ? `${additionalContext}\n\n${templateContext}` : templateContext
    }

    // NOTE: User's own voice samples are now injected directly into the SYSTEM prompt
    // via buildVoiceSamplesSection() for higher priority few-shot learning.
    // The additionalContext below only includes inspiration from ADMIRED accounts.

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
        isTemplatePrompt,
        contentLength,  // Pass the length selection
        contentType,    // Pass content type (tweet vs thread)
        // Combine style profile patterns (if selected) with voice examples
        styleProfileSection 
          ? `${styleProfileSection}\n\n${voiceSamplesSystemSection}`
          : voiceSamplesSystemSection
      )
      // Limit to 3 posts (for single tweets) - threads will have 3 options naturally
      if (contentType !== 'thread') {
        allPosts = allPosts.slice(0, 3)
      }
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

    // Record the generation and increment post count
    const sourceType: SourceType = sourceFileId ? 'file_based' : 'manual'
    await recordGeneration(supabase, user.id, generationId, sourceType)

    // Increment post count and re-check remaining
    const updatedLimits = await checkCanGenerate(supabase, user.id, true)

    const response: GenerateResponse = {
      posts: allPosts,
      generationId,
      remaining: updatedLimits.remaining,
      postsUsed: updatedLimits.postsUsed,
      postsLimit: updatedLimits.postsLimit,
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

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
  // Template metadata for better context
  templateTitle?: string
  templateDescription?: string
  templateWhyItWorks?: string
  templateCategory?: string
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
  let match

  // Primary method: **Option N:** format (most reliable)
  const optionRegex = /\*\*Option\s+(\d+)[^*]*\*\*\s*([\s\S]*?)(?=\*\*Option\s+\d+|\*\*Recommendation|$)/gi

  // Debug: count option matches
  const optionMatches = response.match(/\*\*Option\s+\d+/gi)
  console.log('[Parse Debug] Found', optionMatches?.length || 0, 'option matches in response')

  while ((match = optionRegex.exec(response)) !== null) {
    console.log('[Parse Debug] Processing Option', match[1], 'content length:', match[2]?.length)
    let rawContent = match[2].trim()
    
    // Remove the "*Why this works:*" and everything after it from the content
    const whyWorksIndex = rawContent.search(/\*Why this works:\*/i)
    if (whyWorksIndex > 0) {
      rawContent = rawContent.substring(0, whyWorksIndex).trim()
    }
    
    // Also remove any trailing "*Character count:*" lines
    rawContent = rawContent.replace(/\n\*Character count:.*$/gm, '').trim()
    
    if (rawContent && rawContent.length > 10) {
      // For thread content (has numbered tweets), preserve the structure
      // Check for: "1/" pattern OR standalone numbers on their own lines "1\n" OR "1. text"
      const isThreadContent = /^\d+\//.test(rawContent) || 
        /^\d+\s*\n[^\n]+/m.test(rawContent) ||
        /^\d+\.\s+\S/.test(rawContent)
      
      if (isThreadContent) {
        // Don't run through cleanContent for threads - preserve the numbering
        // Just do minimal cleanup
        const cleanedThread = rawContent
          .replace(/\[\d+\s*chars?\]/gi, '') // Remove char count markers
          .replace(/^\*[A-Z][\s\S]*$/gm, '') // Remove any analysis lines starting with *
          .trim()
        
        posts.push({
          content: cleanedThread,
          archetype: archetypeToOutput(archetype),
          postType,
          characterCount: cleanedThread.length,
        })
      } else {
        // For single tweets, run through content cleaner
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

  // Fallback: try **Variation** format
  if (posts.length === 0) {
    const variationRegex = /\*\*Variation\s+(\d+)[^*]*\*\*\s*([\s\S]*?)(?=\*\*Variation\s+\d+|\*\*Recommendation|$)/gi

    while ((match = variationRegex.exec(response)) !== null) {
      let rawContent = match[2].trim()
      const whyWorksIndex = rawContent.search(/\*Why this works:\*/i)
      if (whyWorksIndex > 0) {
        rawContent = rawContent.substring(0, whyWorksIndex).trim()
      }
      
      if (rawContent && rawContent.length > 10) {
        // Check for: "1/" pattern OR standalone numbers on their own lines "1\n" OR "1. text"
        const isThreadContent = /^\d+\//.test(rawContent) || 
          /^\d+\s*\n[^\n]+/m.test(rawContent) ||
          /^\d+\.\s+\S/.test(rawContent)
        
        if (isThreadContent) {
          const cleanedThread = rawContent
            .replace(/\[\d+\s*chars?\]/gi, '')
            .replace(/^\*[A-Z][\s\S]*$/gm, '')
            .trim()
          posts.push({
            content: cleanedThread,
            archetype: archetypeToOutput(archetype),
            postType,
            characterCount: cleanedThread.length,
          })
        } else {
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
  }

  // Last fallback: if nothing found, treat entire response as single post
  if (posts.length === 0 && response.trim().length > 0) {
    // Check if the whole response is thread content
    // Check for: "1/" pattern OR standalone numbers on their own lines "1\n" OR "1. text"
    const isThreadContent = /^\d+\//.test(response.trim()) || 
      /^\d+\s*\n[^\n]+/m.test(response.trim()) ||
      /^\d+\.\s+\S/.test(response.trim())
    if (isThreadContent) {
      posts.push({
        content: response.trim(),
        archetype: archetypeToOutput(archetype),
        postType,
        characterCount: response.trim().length,
      })
    } else {
      const { cleaned } = cleanContent(response.trim())
      posts.push({
        content: cleaned,
        archetype: archetypeToOutput(archetype),
        postType,
        characterCount: cleaned.length,
      })
    }
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
  isTemplatePrompt?: boolean,
  contentLength?: ContentLength,
  contentType?: ContentType
): Promise<GeneratedPost[]> {
  const voiceProfile = toUserVoiceProfile(userProfile)
  let systemPrompt: string
  let userPrompt: string
  
  // If generating a thread, add thread-specific instructions
  const isThread = contentType === 'thread'
  const threadInstructions = isThread ? `

## ⚠️ OVERRIDE: IGNORE ALL PREVIOUS FORMAT INSTRUCTIONS ⚠️

You are generating a TWITTER THREAD, NOT a single tweet. 

IGNORE any instructions above about "single tweet", "under 100 characters", or "---" delimiter format.

## THREAD FORMAT (MANDATORY)

1. Generate **3 DISTINCT thread options** for the user to choose from
2. Each thread MUST contain **7-10 individual tweets**
3. Number each tweet: "1/ [text]" "2/ [text]" - THE SLASH AFTER THE NUMBER IS REQUIRED
4. Each tweet MUST be under 280 characters
5. The 1/ tweet is the HOOK - make it irresistible

## EXACT OUTPUT FORMAT REQUIRED:

**Option 1: [Brief 3-5 word description]**

1/ [First tweet - THE HOOK that stops the scroll]

2/ [Second tweet - expand on hook]

3/ [Third tweet - build momentum]

4/ [Fourth tweet - key insight]

5/ [Fifth tweet - more value]

6/ [Sixth tweet - supporting point]

7/ [Seventh tweet - call to action or summary]

*Why this works:* [One sentence]

**Option 2: [Different angle]**

1/ [Hook...]

2/ [Continue...]

3/ [...]

4/ [...]

5/ [...]

6/ [...]

7/ [...]

*Why this works:* [One sentence]

**Option 3: [Third approach]**

1/ [Hook...]

2/ [...]

3/ [...]

4/ [...]

5/ [...]

6/ [...]

7/ [...]

*Why this works:* [One sentence]

## CRITICAL RULES:
- You MUST output exactly 3 options using "**Option 1:**" "**Option 2:**" "**Option 3:**" headers
- Each option MUST have 7-10 tweets numbered with slash: "1/" "2/" "3/" etc.
- DO NOT use "---" delimiters
- DO NOT output single tweets
` : ''

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
  
  // Append thread instructions to system prompt if generating a thread
  if (threadInstructions) {
    systemPrompt = systemPrompt + threadInstructions
    // Also add reminder to user prompt for emphasis
    userPrompt = userPrompt + `

REMINDER: Generate exactly 3 thread options. Each thread must have 7-10 tweets numbered "1/" "2/" "3/" etc. Use the **Option 1:** **Option 2:** **Option 3:** format.`
  }

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: isThread ? 8192 : 4096, // More tokens for threads
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  // Extract text content from response
  const textContent = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('\n')

  // Debug logging for thread generation
  if (isThread) {
    console.log('[Thread Debug] contentType:', contentType)
    console.log('[Thread Debug] Response length:', textContent.length)
    console.log('[Thread Debug] First 500 chars:', textContent.substring(0, 500))
    console.log('[Thread Debug] Contains **Option 1:', textContent.includes('**Option 1'))
    console.log('[Thread Debug] Contains **Option 2:', textContent.includes('**Option 2'))
    console.log('[Thread Debug] Contains **Option 3:', textContent.includes('**Option 3'))
  }

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
        isTemplatePrompt,
        contentLength,  // Pass the length selection
        contentType     // Pass content type (tweet vs thread)
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

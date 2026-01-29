/**
 * Client-side engagement scoring — instant, no API calls.
 * "Yoast SEO for tweets" — scores drafts on X algorithm factors.
 */

export interface ScoreDetail {
  score: number
  label: string
  explanation: string // What we observed in the content
  suggestion: string | null // How to improve
  suggested?: string[]
}

export interface EngagementScore {
  score: number
  breakdown: {
    hookStrength: ScoreDetail
    replyPotential: ScoreDetail
    length: ScoreDetail
    readability: ScoreDetail
    hashtagUsage: ScoreDetail
    emojiUsage: ScoreDetail
    bestTime: {
      recommendation: string
      reason: string
    }
  }
}

function getLabel(score: number): string {
  if (score >= 80) return 'Strong'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Medium'
  if (score >= 20) return 'Weak'
  return 'Poor'
}

function scoreHookStrength(text: string): ScoreDetail {
  const firstLine = text.split('\n')[0]?.trim() || ''
  let score = 50
  const observations: string[] = []

  // Length: 10-80 chars ideal
  const len = firstLine.length
  if (len >= 10 && len <= 80) {
    score += 20
    observations.push('Good hook length')
  } else if (len < 10) {
    score -= 20
    observations.push('Hook too short')
  } else if (len > 120) {
    score -= 15
    observations.push('Hook could be tighter')
  }

  // Starts with number
  if (/^\d/.test(firstLine)) {
    score += 15
    observations.push('Opens with a number (strong pattern)')
  }
  // Starts with question
  if (/^(what|why|how|when|who|which|do you|have you|is |are |did |will |can )/i.test(firstLine)) {
    score += 15
    observations.push('Opens with a question (drives engagement)')
  }
  // Bold claim markers
  if (/^(unpopular opinion|hot take|controversial|nobody talks about|the truth about|stop |don't |never )/i.test(firstLine)) {
    score += 20
    observations.push('Opens with bold claim (great for replies)')
  }
  // ALL CAPS opener (1-3 words)
  if (/^[A-Z]{2,}(\s[A-Z]{2,}){0,2}[:\s]/.test(firstLine)) {
    score += 10
    observations.push('Uses caps for emphasis')
  }
  // Has emoji in first line
  if (/[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2600-\u26FF]|[\u2700-\u27BF]/.test(firstLine)) {
    score += 5
    observations.push('Emoji adds visual interest')
  }

  score = Math.min(100, Math.max(0, score))

  const explanation = observations.length > 0 
    ? observations.join('. ') + '.'
    : 'Standard opening — could be more attention-grabbing.'

  let suggestion: string | null = null
  if (score < 60) {
    suggestion = 'Start with a number, question, or bold claim to stop the scroll'
  } else if (score < 80) {
    suggestion = 'Good hook — try making it more provocative or specific'
  }

  return { score, label: getLabel(score), explanation, suggestion }
}

function scoreReplyPotential(text: string): ScoreDetail {
  let score = 30
  const lower = text.toLowerCase()
  const observations: string[] = []

  // Ends with question mark
  if (text.trim().endsWith('?')) {
    score += 30
    observations.push('Ends with a question (invites responses)')
  }
  // Contains engagement phrases
  const engagementPhrases = ['what do you think', 'agree?', 'disagree?', 'thoughts?', 'am i wrong', 'change my mind', 'prove me wrong', 'who else', 'reply with', 'drop your']
  for (const phrase of engagementPhrases) {
    if (lower.includes(phrase)) {
      score += 20
      observations.push('Contains direct call for engagement')
      break
    }
  }
  // Controversial markers
  const controversial = ['unpopular opinion', 'hot take', 'controversial', 'most people', 'nobody', 'everyone is wrong', "i don't care"]
  for (const marker of controversial) {
    if (lower.includes(marker)) {
      score += 15
      observations.push('Takes a stance that invites debate')
      break
    }
  }
  // Has a list (people love to add their own)
  if (/\d[\.\)]\s/m.test(text)) {
    score += 10
    observations.push('List format encourages "you forgot X" replies')
  }

  score = Math.min(100, Math.max(0, score))

  const explanation = observations.length > 0
    ? observations.join('. ') + '.'
    : 'No obvious reply triggers — readers may scroll past.'

  let suggestion: string | null = null
  if (score < 50) {
    suggestion = 'End with a question to boost replies (replies weighted 75x by the algo)'
  } else if (score < 75) {
    suggestion = 'Try adding "What do you think?" or a controversial angle'
  }

  return { score, label: getLabel(score), explanation, suggestion }
}

function scoreLength(text: string): ScoreDetail {
  const len = text.length
  let score: number
  let suggestion: string | null = null
  let explanation: string

  if (len < 20) {
    score = 10
    explanation = `Only ${len} characters — too brief to convey value.`
    suggestion = 'Way too short — add more substance'
  } else if (len < 50) {
    score = 30
    explanation = `${len} characters — needs more meat.`
    suggestion = 'Too short — aim for 180-280 characters for optimal engagement'
  } else if (len >= 50 && len < 180) {
    score = 65
    explanation = `${len} characters — good start but could say more.`
    suggestion = 'A bit short — 180-280 chars is the sweet spot'
  } else if (len >= 180 && len <= 280) {
    score = 100
    explanation = `${len} characters — perfect length for engagement.`
  } else if (len > 280 && len <= 320) {
    score = 70
    explanation = `${len} characters — slightly over the tweet limit.`
    suggestion = 'Slightly over 280 chars — trim to fit a single tweet'
  } else {
    score = 40
    explanation = `${len} characters — too long for a single tweet.`
    suggestion = 'Too long for a single tweet — consider making it a thread'
  }

  return { score, label: getLabel(score), explanation, suggestion }
}

function scoreReadability(text: string): ScoreDetail {
  let score = 70
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const observations: string[] = []

  // Avg word length
  const avgWordLen = words.length > 0 ? words.reduce((sum, w) => sum + w.length, 0) / words.length : 0
  if (avgWordLen > 7) {
    score -= 15
    observations.push('Uses complex vocabulary')
  } else if (avgWordLen <= 5) {
    score += 10
    observations.push('Simple, accessible language')
  }

  // Too many sentences = wall of text
  if (sentences.length > 6) {
    score -= 15
    observations.push('Dense with many sentences')
  }
  // Line breaks help readability
  const lineBreaks = (text.match(/\n/g) || []).length
  if (lineBreaks > 0 && text.length > 100) {
    score += 10
    observations.push('Good use of line breaks for scannability')
  }

  // Single run-on sentence
  if (sentences.length === 1 && words.length > 30) {
    score -= 20
    observations.push('Single long sentence — hard to scan')
  }

  score = Math.min(100, Math.max(0, score))

  const explanation = observations.length > 0
    ? observations.join('. ') + '.'
    : 'Standard readability — no major issues.'

  let suggestion: string | null = null
  if (score < 60) suggestion = 'Shorter sentences perform better — break it up'
  else if (avgWordLen > 7) suggestion = 'Use simpler words for better readability'

  return { score, label: getLabel(score), explanation, suggestion }
}

function scoreHashtagUsage(text: string): ScoreDetail {
  const cashtags = text.match(/\$[A-Z]{2,10}/g) || []
  const hashtags = text.match(/#\w+/g) || []
  const total = cashtags.length + hashtags.length

  let score: number
  let suggestion: string | null = null
  let explanation: string
  const suggested: string[] = []

  if (total === 0) {
    score = 70 // Not having tags is fine, actually
    explanation = 'No hashtags or cashtags — clean text only.'
    suggestion = 'Consider 1-2 relevant tags for discovery (optional)'
  } else if (total >= 1 && total <= 3) {
    score = 90
    const found = [...cashtags, ...hashtags].join(', ')
    explanation = `Good tag usage: ${found}`
  } else if (total <= 5) {
    score = 65
    explanation = `${total} tags found — slightly heavy.`
    suggestion = 'Slightly too many tags — 1-3 is optimal'
  } else {
    score = 30
    explanation = `${total} tags detected — looks spammy.`
    suggestion = 'Too many tags looks spammy — keep to 1-3'
  }

  // Check for links (algorithm penalizes)
  if (/https?:\/\/\S+/.test(text)) {
    score -= 30
    explanation += ' Contains external link (50% reach penalty — move to reply).'
    suggestion = 'Move external links to first reply to avoid algorithm suppression'
  }

  return { score: Math.max(0, score), label: getLabel(Math.max(0, score)), explanation, suggestion, ...(suggested.length > 0 ? { suggested } : {}) }
}

function scoreEmojiUsage(text: string): ScoreDetail {
  const emojiRegex = /[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2600-\u26FF]|[\u2700-\u27BF]|[\uFE00-\uFE0F]|[\u200D]|[\u20E3]/g
  const emojis = text.match(emojiRegex) || []
  const count = emojis.length

  let score: number
  let suggestion: string | null = null
  let explanation: string

  if (count === 0) {
    score = 70 // Not having emojis is fine for professional tone
    explanation = 'No emojis — clean, professional tone.'
    suggestion = 'Consider 1-2 emojis as visual hooks (optional for your niche)'
  } else if (count >= 1 && count <= 3) {
    score = 90
    explanation = `${count} emoji${count > 1 ? 's' : ''} — good visual interest without overdoing it.`
  } else if (count <= 5) {
    score = 70
    explanation = `${count} emojis — slightly heavy for most niches.`
    suggestion = 'Slightly emoji-heavy — 1-3 is ideal'
  } else {
    score = 35
    explanation = `${count} emojis — oversaturated, may reduce credibility.`
    suggestion = 'Too many emojis — reduces credibility'
  }

  return { score, label: getLabel(score), explanation, suggestion }
}

/**
 * Score a post instantly on the client side.
 */
export function scoreEngagement(text: string): EngagementScore {
  if (!text.trim()) {
    const empty: ScoreDetail = { score: 0, label: 'Poor', explanation: 'No content yet.', suggestion: null }
    return {
      score: 0,
      breakdown: {
        hookStrength: { ...empty, explanation: 'Start writing to see analysis.', suggestion: 'Start writing to see your score' },
        replyPotential: { ...empty, explanation: 'No content to analyze.' },
        length: { ...empty, explanation: '0 characters.' },
        readability: { ...empty, explanation: 'No content to analyze.' },
        hashtagUsage: { ...empty, explanation: 'No tags detected.' },
        emojiUsage: { ...empty, explanation: 'No emojis detected.' },
        bestTime: {
          recommendation: 'Weekday 9-11am EST',
          reason: 'Tech Twitter most active during US market hours',
        },
      },
    }
  }

  const hookStrength = scoreHookStrength(text)
  const replyPotential = scoreReplyPotential(text)
  const length = scoreLength(text)
  const readability = scoreReadability(text)
  const hashtagUsage = scoreHashtagUsage(text)
  const emojiUsage = scoreEmojiUsage(text)

  // Weighted average — reply potential weighted highest (algo weights replies 75x)
  const weights = { hook: 25, reply: 30, length: 15, readability: 10, hashtag: 10, emoji: 10 }
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
  const overallScore = Math.round(
    (hookStrength.score * weights.hook +
      replyPotential.score * weights.reply +
      length.score * weights.length +
      readability.score * weights.readability +
      hashtagUsage.score * weights.hashtag +
      emojiUsage.score * weights.emoji) / totalWeight
  )

  // Determine best time recommendation
  const now = new Date()
  const estHour = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })).getHours()
  const day = now.getDay()
  const isWeekday = day >= 1 && day <= 5

  let bestTime = {
    recommendation: 'Weekday 9-11am EST',
    reason: 'Tech Twitter most active during US market hours',
  }

  if (isWeekday && estHour >= 9 && estHour <= 11) {
    bestTime = { recommendation: 'Now is great! 🔥', reason: 'Peak engagement hours — US market open' }
  } else if (isWeekday && estHour >= 14 && estHour <= 16) {
    bestTime = { recommendation: 'Good time to post', reason: 'Afternoon engagement wave' }
  } else if (!isWeekday) {
    bestTime = { recommendation: 'Wait for Monday 9-11am EST', reason: 'Weekday posts typically get more engagement' }
  }

  return {
    score: overallScore,
    breakdown: { hookStrength, replyPotential, length, readability, hashtagUsage, emojiUsage, bestTime },
  }
}

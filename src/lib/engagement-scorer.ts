/**
 * Engagement Scorer v2 — Simplified to what actually matters
 * 
 * Only 3 factors that truly drive engagement:
 * 1. Hook Strength (35%) - Does the first line stop the scroll?
 * 2. Reply Potential (45%) - Will people WANT to respond?
 * 3. Readability (20%) - Can they consume it fast?
 */

export interface ScoreDetail {
  score: number
  label: string
  explanation: string
  suggestion: string | null
}

export interface Warning {
  type: 'length' | 'hashtags' | 'link'
  message: string
  severity: 'info' | 'warning'
}

export interface EngagementScore {
  score: number
  breakdown: {
    hookStrength: ScoreDetail
    replyPotential: ScoreDetail
    readability: ScoreDetail
  }
  warnings: Warning[]
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
  let score = 40
  const observations: string[] = []

  // Length: 10-80 chars ideal for a hook
  const len = firstLine.length
  if (len >= 10 && len <= 80) {
    score += 15
    observations.push('Good hook length')
  } else if (len < 10) {
    score -= 20
    observations.push('Hook too short')
  } else if (len > 120) {
    score -= 10
    observations.push('Hook could be tighter')
  }

  // Starts with number (listicles, data)
  if (/^\d/.test(firstLine)) {
    score += 20
    observations.push('Opens with a number')
  }
  
  // Starts with question
  if (/^(what|why|how|when|who|which|do you|have you|is |are |did |will |can )/i.test(firstLine)) {
    score += 20
    observations.push('Opens with a question')
  }
  
  // Bold claim markers
  if (/^(unpopular opinion|hot take|controversial|nobody talks about|the truth about|stop |don't |never |most people|everyone is wrong)/i.test(firstLine)) {
    score += 25
    observations.push('Opens with bold claim')
  }
  
  // ALL CAPS opener (1-3 words) for emphasis
  if (/^[A-Z]{2,}(\s[A-Z]{2,}){0,2}[:\s]/.test(firstLine)) {
    score += 10
    observations.push('Uses caps for emphasis')
  }
  
  // Curiosity gap / incomplete thought
  if (/\.\.\.$|…$/.test(firstLine) || /^(Here's|This is|I found|The secret|The reason)/i.test(firstLine)) {
    score += 15
    observations.push('Creates curiosity gap')
  }

  score = Math.min(100, Math.max(0, score))

  const explanation = observations.length > 0 
    ? observations.join('. ') + '.'
    : 'Standard opening — could be more attention-grabbing.'

  let suggestion: string | null = null
  if (score < 50) {
    suggestion = 'Start with a number, question, or bold claim to stop the scroll'
  } else if (score < 70) {
    suggestion = 'Try making your hook more provocative or specific'
  }

  return { score, label: getLabel(score), explanation, suggestion }
}

function scoreReplyPotential(text: string): ScoreDetail {
  let score = 25
  const lower = text.toLowerCase()
  const observations: string[] = []

  // Ends with question mark — strongest signal
  if (text.trim().endsWith('?')) {
    score += 35
    observations.push('Ends with a question')
  }
  
  // Contains direct engagement phrases
  const engagementPhrases = [
    'what do you think', 'agree?', 'disagree?', 'thoughts?', 
    'am i wrong', 'change my mind', 'prove me wrong', 'who else', 
    'reply with', 'drop your', 'tell me', 'what would you',
    'what\'s your', 'how do you', 'have you ever', 'anyone else'
  ]
  for (const phrase of engagementPhrases) {
    if (lower.includes(phrase)) {
      score += 25
      observations.push('Direct call for engagement')
      break
    }
  }
  
  // Controversial / debate-starter markers
  const controversial = [
    'unpopular opinion', 'hot take', 'controversial', 'most people', 
    'nobody', 'everyone is wrong', "i don't care", 'overrated', 
    'underrated', 'the truth is', 'stop saying', 'myth:'
  ]
  for (const marker of controversial) {
    if (lower.includes(marker)) {
      score += 20
      observations.push('Takes a stance that invites debate')
      break
    }
  }
  
  // Incomplete list (people love to add their own)
  if (/\d[\.\)]\s/m.test(text) && !/^(1|2|3)0[\.\)]/m.test(text)) {
    score += 15
    observations.push('List format encourages "you forgot X" replies')
  }
  
  // Personal opinion markers
  if (/^(i think|i believe|in my opinion|honestly|imo)/im.test(text)) {
    score += 10
    observations.push('Personal opinion invites agreement/disagreement')
  }

  score = Math.min(100, Math.max(0, score))

  const explanation = observations.length > 0
    ? observations.join('. ') + '.'
    : 'No obvious reply triggers — readers may scroll past.'

  let suggestion: string | null = null
  if (score < 40) {
    suggestion = 'End with a question — replies are weighted 75x by the algorithm'
  } else if (score < 65) {
    suggestion = 'Add a call to action: "What do you think?" or take a controversial stance'
  }

  return { score, label: getLabel(score), explanation, suggestion }
}

function scoreReadability(text: string): ScoreDetail {
  let score = 70
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const observations: string[] = []

  // Average word length (simpler = better for fast consumption)
  const avgWordLen = words.length > 0 ? words.reduce((sum, w) => sum + w.length, 0) / words.length : 0
  if (avgWordLen > 7) {
    score -= 20
    observations.push('Complex vocabulary')
  } else if (avgWordLen <= 5) {
    score += 15
    observations.push('Simple, accessible language')
  }

  // Line breaks help scannability
  const lineBreaks = (text.match(/\n/g) || []).length
  if (lineBreaks > 0 && text.length > 100) {
    score += 15
    observations.push('Good use of line breaks')
  } else if (text.length > 200 && lineBreaks === 0) {
    score -= 15
    observations.push('Wall of text — add line breaks')
  }

  // Run-on sentence check
  if (sentences.length === 1 && words.length > 35) {
    score -= 25
    observations.push('Single long sentence — hard to scan')
  }
  
  // Too many sentences packed in
  if (sentences.length > 6 && text.length < 280) {
    score -= 10
    observations.push('Very dense — consider simplifying')
  }
  
  // Short punchy sentences are good
  const avgSentenceLen = sentences.length > 0 ? words.length / sentences.length : 0
  if (avgSentenceLen <= 10 && sentences.length >= 2) {
    score += 10
    observations.push('Punchy sentence structure')
  }

  score = Math.min(100, Math.max(0, score))

  const explanation = observations.length > 0
    ? observations.join('. ') + '.'
    : 'Standard readability.'

  let suggestion: string | null = null
  if (score < 50) {
    suggestion = 'Break up long sentences and use simpler words'
  } else if (score < 70) {
    suggestion = 'Add line breaks for easier scanning'
  }

  return { score, label: getLabel(score), explanation, suggestion }
}

function getWarnings(text: string): Warning[] {
  const warnings: Warning[] = []
  
  // Length warning (not a scored factor, just helpful)
  const len = text.length
  if (len > 280 && len <= 320) {
    warnings.push({
      type: 'length',
      message: `${len} chars — slightly over tweet limit`,
      severity: 'warning'
    })
  } else if (len > 320) {
    warnings.push({
      type: 'length',
      message: `${len} chars — consider a thread or trim`,
      severity: 'warning'
    })
  }
  
  // Hashtag warning
  const hashtags = text.match(/#\w+/g) || []
  if (hashtags.length > 2) {
    warnings.push({
      type: 'hashtags',
      message: `${hashtags.length} hashtags — consider removing (hurts reach)`,
      severity: 'warning'
    })
  } else if (hashtags.length > 0) {
    warnings.push({
      type: 'hashtags',
      message: 'Hashtags can reduce reach on X',
      severity: 'info'
    })
  }
  
  // External link warning
  if (/https?:\/\/\S+/.test(text)) {
    warnings.push({
      type: 'link',
      message: 'External links get ~50% less reach — move to first reply',
      severity: 'warning'
    })
  }
  
  return warnings
}

/**
 * Score a post on the 3 factors that actually matter for engagement.
 */
export function scoreEngagement(text: string): EngagementScore {
  if (!text.trim()) {
    const empty: ScoreDetail = { score: 0, label: 'Poor', explanation: 'No content yet.', suggestion: null }
    return {
      score: 0,
      breakdown: {
        hookStrength: { ...empty, explanation: 'Start writing to see analysis.', suggestion: 'Start writing to see your score' },
        replyPotential: { ...empty, explanation: 'No content to analyze.' },
        readability: { ...empty, explanation: 'No content to analyze.' },
      },
      warnings: [],
    }
  }

  const hookStrength = scoreHookStrength(text)
  const replyPotential = scoreReplyPotential(text)
  const readability = scoreReadability(text)
  const warnings = getWarnings(text)

  // Weighted average — reply potential weighted highest (algo weights replies 75x)
  const weights = { hook: 35, reply: 45, readability: 20 }
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
  const overallScore = Math.round(
    (hookStrength.score * weights.hook +
      replyPotential.score * weights.reply +
      readability.score * weights.readability) / totalWeight
  )

  return {
    score: overallScore,
    breakdown: { hookStrength, replyPotential, readability },
    warnings,
  }
}
